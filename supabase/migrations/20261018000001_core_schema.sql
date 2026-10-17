-- Levik Rewards Programme — core schema.
-- Mirrors the TypeScript domain model in /types. Enum labels match the TS string unions exactly,
-- so rows map onto the existing admin UI without translation.

create schema if not exists private;

-- --------------------------------------------------------------------------- enums
create type public.user_role as enum ('plumber', 'retailer');
create type public.plumber_verification_status as enum ('Verified', 'Pending', 'Rejected');
create type public.account_status as enum ('Active', 'Suspended', 'Inactive');
create type public.retailer_verification_status as enum ('Approved', 'Pending', 'Rejected');
create type public.product_category as enum (
  'One-Piece Western WC', 'Wall-Hung WC', 'Floor-Mounted EWC', 'Indian Pan', 'Half-Pedestal Basin',
  'Pedestal Basin', 'Wall-Hung Basin', 'Countertop Basin', 'Urinal', 'Cistern', 'Kitchen Sink'
);
create type public.scan_status as enum ('Pending', 'Approved', 'Rejected', 'Flagged');
create type public.points_source as enum (
  'Product Scan', 'Invoice Incentive', 'Scheme Bonus', 'Redemption', 'Redemption Reversal',
  'Manual Adjustment', 'Opening Balance'
);
create type public.related_entity as enum ('scan', 'invoice', 'redemption', 'scheme');
create type public.invoice_status as enum (
  'Submitted', 'Under Review', 'Approved', 'Rejected', 'More Information Required'
);
create type public.reward_category as enum (
  'Shopping Voucher', 'Gift Card', 'Air Conditioner', 'Refrigerator', 'Television', 'Home Appliance',
  'Tools & Equipment', 'Other'
);
create type public.reward_type as enum ('Digital', 'Physical');
create type public.redemption_status as enum (
  'Requested', 'Approved', 'Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Failed'
);
create type public.scheme_status as enum ('Draft', 'Scheduled', 'Active', 'Completed', 'Paused');
create type public.scheme_target_type as enum ('Sales Amount', 'Approved Scans');
create type public.ticket_status as enum ('Open', 'In Progress', 'Resolved', 'Closed');
create type public.ticket_priority as enum ('Low', 'Medium', 'High');
create type public.ticket_category as enum ('Points', 'Scan', 'Invoice', 'Redemption', 'Account', 'Product');
create type public.audit_entity as enum (
  'Product', 'Plumber', 'Retailer', 'Scan', 'Invoice', 'Points', 'Reward', 'Redemption', 'Scheme',
  'Inventory', 'Support', 'Settings', 'Session'
);

-- ------------------------------------------------------------- readable identifiers
-- Human-readable IDs (PLM-1001, SCN-5001, …) are kept from the demo; sequences continue after the seed.
create sequence public.plumber_seq start 1001;
create sequence public.retailer_seq start 2001;
create sequence public.product_seq start 101;
create sequence public.scan_seq start 5001;
create sequence public.invoice_seq start 3001;
create sequence public.reward_seq start 6001;
create sequence public.redemption_seq start 7001;
create sequence public.scheme_seq start 401;
create sequence public.inventory_seq start 1;
create sequence public.ticket_seq start 8001;
create sequence public.txn_seq start 90001;
create sequence public.audit_seq start 100001;

-- ------------------------------------------------------------------------- people
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) >= 2),
  email text not null,
  created_at timestamptz not null default now()
);

create table public.retailers (
  id text primary key default 'RTL-' || nextval('public.retailer_seq'),
  user_id uuid unique references auth.users (id) on delete set null,
  shop_name text not null check (length(trim(shop_name)) >= 3),
  owner_name text not null,
  mobile text not null unique,
  email text,
  address text not null,
  city text not null,
  state text not null,
  gstin text check (gstin is null or gstin ~ '^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  distributor text not null default '',
  registered_at timestamptz not null default now(),
  verification_status public.retailer_verification_status not null default 'Pending',
  account_status public.account_status not null default 'Active'
    check (account_status in ('Active', 'Suspended')),
  monthly_target bigint not null default 200000 check (monthly_target >= 0),
  rejection_reason text
);

create table public.plumbers (
  id text primary key default 'PLM-' || nextval('public.plumber_seq'),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (length(trim(name)) >= 2),
  mobile text not null unique,
  email text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^\d{6}$'),
  registered_at timestamptz not null default now(),
  verification_status public.plumber_verification_status not null default 'Pending',
  account_status public.account_status not null default 'Active',
  -- Masked reference only. Full Aadhaar numbers must never be stored.
  aadhaar_masked text check (aadhaar_masked is null or aadhaar_masked ~ '^XXXX XXXX \d{4}$'),
  experience_years int not null default 0 check (experience_years between 0 and 60),
  specialization text not null default '',
  preferred_retailer_id text references public.retailers (id) on delete set null,
  verification_note text
);

-- ----------------------------------------------------------------------- catalogue
create table public.products (
  id text primary key default 'PRD-' || nextval('public.product_seq'),
  name text not null,
  model_code text not null,
  category public.product_category not null,
  description text not null default '',
  dimensions text,
  features text[] not null default '{}',
  image_url text,
  sku text not null unique,
  barcode text not null check (barcode ~ '^\d{8,14}$'),
  mrp bigint not null check (mrp > 0),
  plumber_points int not null default 0 check (plumber_points >= 0),
  is_active boolean not null default true,
  reward_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- points ledger
-- Append-only. Every balance in the system is derived from this table.
create table public.points_ledger (
  id text primary key default 'TXN-' || nextval('public.txn_seq'),
  user_id text not null,
  user_role public.user_role not null,
  source public.points_source not null,
  related_type public.related_entity,
  related_id text,
  credit int not null default 0 check (credit >= 0),
  debit int not null default 0 check (debit >= 0),
  created_at timestamptz not null default now(),
  status text not null default 'Posted' check (status = 'Posted'),
  note text not null default '',
  created_by text not null,
  check ((credit > 0) <> (debit > 0)),
  check ((related_type is null) = (related_id is null))
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);
create index points_ledger_created_idx on public.points_ledger (created_at desc);
-- Database-level guarantees against double crediting / double deduction.
create unique index points_ledger_one_scan_credit on public.points_ledger (related_id) where source = 'Product Scan';
create unique index points_ledger_one_invoice_credit on public.points_ledger (related_id) where source = 'Invoice Incentive';
create unique index points_ledger_one_redemption_debit on public.points_ledger (related_id) where source = 'Redemption';
create unique index points_ledger_one_redemption_refund on public.points_ledger (related_id) where source = 'Redemption Reversal';
create unique index points_ledger_one_scheme_bonus on public.points_ledger (related_id, user_id) where source = 'Scheme Bonus';

-- --------------------------------------------------------------------- scans
create table public.scans (
  id text primary key default 'SCN-' || nextval('public.scan_seq'),
  plumber_id text not null references public.plumbers (id),
  product_id text not null references public.products (id),
  submitted_code text not null check (length(submitted_code) between 4 and 64),
  scanned_at timestamptz not null default now(),
  retailer_id text references public.retailers (id),
  invoice_number text,
  site_location text not null default '',
  photo_path text,
  status public.scan_status not null default 'Pending',
  awarded_points int,
  ledger_txn_id text references public.points_ledger (id),
  rejection_reason text,
  flag_reason text,
  reviewed_by text,
  reviewed_at timestamptz
);
create index scans_status_idx on public.scans (status, scanned_at desc);
create index scans_plumber_idx on public.scans (plumber_id, scanned_at desc);
create index scans_code_idx on public.scans (submitted_code);
-- A serial code can be credited only once across all plumbers.
create unique index scans_one_approved_serial on public.scans (submitted_code) where status = 'Approved';

-- ------------------------------------------------------------------- invoices
create table public.invoices (
  id text primary key default 'INV-' || nextval('public.invoice_seq'),
  invoice_number text not null,
  retailer_id text not null references public.retailers (id),
  buyer_name text not null default '',
  invoice_date timestamptz not null,
  submitted_at timestamptz not null default now(),
  document_path text,
  status public.invoice_status not null default 'Submitted',
  reviewer text,
  reviewed_at timestamptz,
  incentive_points int,
  ledger_txn_id text references public.points_ledger (id),
  rejection_reason text,
  info_request text
);
create index invoices_status_idx on public.invoices (status, submitted_at desc);
create index invoices_retailer_idx on public.invoices (retailer_id, invoice_date desc);

create table public.invoice_lines (
  id text primary key default gen_random_uuid()::text,
  invoice_id text not null references public.invoices (id) on delete cascade,
  product_id text not null references public.products (id),
  quantity int not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0)
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- -------------------------------------------------------------------- rewards
create table public.rewards (
  id text primary key default 'RWD-' || nextval('public.reward_seq'),
  name text not null,
  category public.reward_category not null,
  type public.reward_type not null,
  description text not null default '',
  points_required int not null check (points_required > 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  eligible_roles public.user_role[] not null default '{plumber,retailer}' check (cardinality(eligible_roles) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redemptions (
  id text primary key default 'RDM-' || nextval('public.redemption_seq'),
  user_id text not null,
  user_role public.user_role not null,
  reward_id text not null references public.rewards (id),
  points_cost int not null check (points_cost > 0),
  requested_at timestamptz not null default now(),
  status public.redemption_status not null default 'Requested',
  delivery_address text not null default '',
  debit_txn_id text references public.points_ledger (id),
  reversal_txn_id text references public.points_ledger (id),
  fulfilment_ref text,
  voucher_code text,
  courier_name text,
  tracking_number text,
  cancel_reason text
);
create index redemptions_status_idx on public.redemptions (status, requested_at desc);
create index redemptions_user_idx on public.redemptions (user_id);

-- -------------------------------------------------------------------- schemes
create table public.schemes (
  id text primary key default 'SCH-' || nextval('public.scheme_seq'),
  name text not null check (length(trim(name)) >= 3),
  description text not null default '',
  role public.user_role not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  eligible_categories public.product_category[] not null check (cardinality(eligible_categories) > 0),
  target_type public.scheme_target_type not null,
  target_value bigint not null check (target_value > 0),
  incentive_points int not null check (incentive_points > 0),
  status public.scheme_status not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check ((role = 'retailer' and target_type = 'Sales Amount') or (role = 'plumber' and target_type = 'Approved Scans'))
);

create table public.scheme_awards (
  scheme_id text not null references public.schemes (id),
  user_id text not null,
  awarded_at timestamptz not null default now(),
  ledger_txn_id text references public.points_ledger (id),
  primary key (scheme_id, user_id)
);

-- ------------------------------------------------------------------ inventory
-- Retailer-reported stock, not warehouse stock.
create table public.inventory (
  id text primary key default 'STK-' || nextval('public.inventory_seq'),
  retailer_id text not null references public.retailers (id),
  product_id text not null references public.products (id),
  quantity int not null check (quantity >= 0),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'Retailer app',
  unique (retailer_id, product_id)
);

-- -------------------------------------------------------------------- support
create table public.support_tickets (
  id text primary key default 'TKT-' || nextval('public.ticket_seq'),
  user_id text not null,
  user_role public.user_role not null,
  subject text not null check (length(trim(subject)) >= 3),
  category public.ticket_category not null,
  description text not null default '',
  priority public.ticket_priority not null default 'Medium',
  status public.ticket_status not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ticket_notes (
  id bigint generated always as identity primary key,
  ticket_id text not null references public.support_tickets (id) on delete cascade,
  at timestamptz not null default now(),
  by_name text not null,
  body text not null check (length(trim(body)) > 0)
);

-- ------------------------------------------------------ history / audit / settings
create table public.status_events (
  id bigint generated always as identity primary key,
  entity_type public.related_entity not null,
  entity_id text not null,
  at timestamptz not null default now(),
  by_name text not null,
  action text not null,
  note text
);
create index status_events_entity_idx on public.status_events (entity_type, entity_id, at);

create table public.audit_logs (
  id text primary key default 'AUD-' || nextval('public.audit_seq'),
  at timestamptz not null default now(),
  admin_name text not null,
  admin_user_id uuid,
  action text not null,
  entity_type public.audit_entity not null,
  entity_id text not null,
  summary text not null default ''
);
create index audit_logs_at_idx on public.audit_logs (at desc);

create table public.settings (
  id boolean primary key default true check (id),
  programme_name text not null default 'Levik Rewards Programme',
  retailer_points_per_100 numeric(5, 2) not null default 1 check (retailer_points_per_100 between 0.1 and 20),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  notifications jsonb not null default '{"pendingScans": true, "pendingInvoices": true, "redemptions": true, "lowStock": true}',
  max_daily_scans_per_plumber int not null default 30 check (max_daily_scans_per_plumber > 0),
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- ------------------------------------------------------- append-only enforcement
create function private.forbid_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only; % is not allowed', tg_table_name, tg_op;
end;
$$;

create trigger points_ledger_append_only before update or delete on public.points_ledger
  for each row execute function private.forbid_mutation();
create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function private.forbid_mutation();
create trigger status_events_append_only before update or delete on public.status_events
  for each row execute function private.forbid_mutation();

-- --------------------------------------------- polymorphic participant integrity
create function private.assert_participant() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_role = 'plumber' and not exists (select 1 from public.plumbers where id = new.user_id) then
    raise exception 'Unknown plumber %', new.user_id;
  elsif new.user_role = 'retailer' and not exists (select 1 from public.retailers where id = new.user_id) then
    raise exception 'Unknown retailer %', new.user_id;
  end if;
  return new;
end;
$$;

create trigger points_ledger_participant before insert on public.points_ledger
  for each row execute function private.assert_participant();
create trigger redemptions_participant before insert or update of user_id, user_role on public.redemptions
  for each row execute function private.assert_participant();
create trigger support_tickets_participant before insert or update of user_id, user_role on public.support_tickets
  for each row execute function private.assert_participant();

-- ---------------------------------------------------------------- updated_at
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();
create trigger rewards_touch before update on public.rewards for each row execute function private.touch_updated_at();
create trigger schemes_touch before update on public.schemes for each row execute function private.touch_updated_at();
create trigger tickets_touch before update on public.support_tickets for each row execute function private.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function private.touch_updated_at();

-- ------------------------------------------------------------ derived balances
create view public.points_balances with (security_invoker = true) as
select
  l.user_id,
  l.user_role,
  coalesce(sum(l.credit) filter (where l.source <> 'Redemption Reversal'), 0)::int as lifetime,
  (coalesce(sum(l.debit) filter (where l.source = 'Redemption'), 0)
    - coalesce(sum(l.credit) filter (where l.source = 'Redemption Reversal'), 0))::int as redeemed,
  (sum(l.credit) - sum(l.debit))::int as available
from public.points_ledger l
group by l.user_id, l.user_role;
