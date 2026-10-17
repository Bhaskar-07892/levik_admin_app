-- Functions called by the plumber / retailer mobile app, plus audit triggers for direct admin edits.
-- Participants authenticate with phone OTP; their auth user is linked to a plumber or retailer row.

-- --------------------------------------------------------------- helpers
/** Formats the E.164 phone from the auth token ("919829011234") as "+91 98290 11234". */
create function private.current_mobile() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_digits text := regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g');
begin
  if v_digits !~ '^91[6-9]\d{9}$' then
    raise exception 'Sign in with an Indian mobile number to continue.';
  end if;
  return format('+91 %s %s', substr(v_digits, 3, 5), substr(v_digits, 8, 5));
end;
$$;

create function private.require_plumber() returns public.plumbers
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.plumbers;
begin
  select * into p from public.plumbers where user_id = auth.uid();
  if not found then raise exception 'Complete plumber registration first.' using errcode = '42501'; end if;
  if p.account_status <> 'Active' then raise exception 'Your account is %. Contact Levik support.', lower(p.account_status::text); end if;
  return p;
end;
$$;

create function private.require_retailer() returns public.retailers
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.retailers;
begin
  select * into r from public.retailers where user_id = auth.uid();
  if not found then raise exception 'Complete retailer registration first.' using errcode = '42501'; end if;
  if r.account_status <> 'Active' then raise exception 'Your account is %. Contact Levik support.', lower(r.account_status::text); end if;
  return r;
end;
$$;

-- ---------------------------------------------------------- registration
/** Creates (or links a pre-registered) plumber profile for the signed-in phone number. */
create function public.register_plumber(
  p_name text, p_city text, p_state text, p_pincode text,
  p_experience_years int default 0, p_specialization text default '', p_preferred_retailer_id text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_mobile text := private.current_mobile();
  v_id text;
begin
  if exists (select 1 from public.plumbers where user_id = auth.uid()) then
    raise exception 'This number is already registered.';
  end if;
  update public.plumbers set user_id = auth.uid() where mobile = v_mobile and user_id is null returning id into v_id;
  if v_id is null then
    insert into public.plumbers (user_id, name, mobile, city, state, pincode, experience_years, specialization, preferred_retailer_id)
    values (auth.uid(), trim(p_name), v_mobile, trim(p_city), trim(p_state), trim(p_pincode),
            coalesce(p_experience_years, 0), coalesce(trim(p_specialization), ''), p_preferred_retailer_id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

/** Stores only the masked Aadhaar reference returned by the KYC provider. Verification stays Pending for review. */
create function public.submit_plumber_kyc(p_aadhaar_last4 text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.plumbers := private.require_plumber();
begin
  if p_aadhaar_last4 !~ '^\d{4}$' then raise exception 'Provide only the last 4 digits of the Aadhaar number.'; end if;
  if p.verification_status = 'Verified' then raise exception 'KYC is already verified.'; end if;
  update public.plumbers
    set aadhaar_masked = 'XXXX XXXX ' || p_aadhaar_last4, verification_status = 'Pending', verification_note = 'KYC submitted from app'
    where id = p.id;
end;
$$;

create function public.register_retailer(
  p_shop_name text, p_owner_name text, p_address text, p_city text, p_state text,
  p_gstin text default null, p_distributor text default ''
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_mobile text := private.current_mobile();
  v_id text;
begin
  if exists (select 1 from public.retailers where user_id = auth.uid()) then
    raise exception 'This number is already registered.';
  end if;
  update public.retailers set user_id = auth.uid() where mobile = v_mobile and user_id is null returning id into v_id;
  if v_id is null then
    insert into public.retailers (user_id, shop_name, owner_name, mobile, address, city, state, gstin, distributor)
    values (auth.uid(), trim(p_shop_name), trim(p_owner_name), v_mobile, trim(p_address), trim(p_city), trim(p_state),
            nullif(upper(trim(coalesce(p_gstin, ''))), ''), coalesce(trim(p_distributor), ''))
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------- scans
create function public.submit_scan(
  p_product_id text, p_serial text, p_retailer_id text default null, p_invoice_number text default null,
  p_site_location text default '', p_photo_path text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  p public.plumbers := private.require_plumber();
  v_serial text := upper(trim(coalesce(p_serial, '')));
  v_limit int := (select max_daily_scans_per_plumber from public.settings);
  v_id text;
begin
  if not exists (select 1 from public.products where id = p_product_id and is_active) then
    raise exception 'This product code is not recognised.';
  end if;
  if length(v_serial) < 4 then raise exception 'Scan or enter the full serial code.'; end if;
  if exists (select 1 from public.scans where submitted_code = v_serial and status in ('Pending', 'Approved', 'Flagged')) then
    raise exception 'This serial code has already been submitted.';
  end if;
  if (select count(*) from public.scans where plumber_id = p.id and scanned_at > now() - interval '24 hours') >= v_limit then
    raise exception 'Daily scan limit reached (% per day). Try again tomorrow.', v_limit;
  end if;
  insert into public.scans (plumber_id, product_id, submitted_code, retailer_id, invoice_number, site_location, photo_path)
  values (p.id, p_product_id, v_serial, p_retailer_id, nullif(trim(coalesce(p_invoice_number, '')), ''),
          coalesce(trim(p_site_location), ''), p_photo_path)
  returning id into v_id;
  insert into public.status_events (entity_type, entity_id, by_name, action) values ('scan', v_id, 'System', 'Scan submitted from plumber app');
  return v_id;
end;
$$;

-- -------------------------------------------------------------- invoices
/** p_lines: [{"product_id": "PRD-103", "quantity": 2, "unit_price": 18500}] — unit_price defaults to MRP. */
create function public.submit_invoice(
  p_invoice_number text, p_invoice_date date, p_buyer_name text, p_lines jsonb, p_document_path text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  r public.retailers := private.require_retailer();
  v_id text;
  v_line jsonb;
begin
  if r.verification_status <> 'Approved' then raise exception 'Your shop must be approved before submitting invoices.'; end if;
  if length(trim(coalesce(p_invoice_number, ''))) < 2 then raise exception 'Invoice number is required.'; end if;
  if p_invoice_date > current_date or p_invoice_date < current_date - 90 then
    raise exception 'Invoice date must be within the last 90 days.';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one line item.'; end if;

  insert into public.invoices (invoice_number, retailer_id, buyer_name, invoice_date, document_path)
  values (trim(p_invoice_number), r.id, coalesce(trim(p_buyer_name), ''), p_invoice_date::timestamptz, p_document_path)
  returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if not exists (select 1 from public.products where id = v_line ->> 'product_id') then
      raise exception 'Unknown product %', v_line ->> 'product_id';
    end if;
    insert into public.invoice_lines (invoice_id, product_id, quantity, unit_price)
    values (v_id, v_line ->> 'product_id', (v_line ->> 'quantity')::int,
            coalesce((v_line ->> 'unit_price')::bigint, (select mrp from public.products where id = v_line ->> 'product_id')));
  end loop;
  insert into public.status_events (entity_type, entity_id, by_name, action) values ('invoice', v_id, 'System', 'Invoice submitted from retailer app');
  return v_id;
end;
$$;

-- ----------------------------------------------------------- redemptions
create function public.request_redemption(p_reward_id text, p_delivery_address text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id text;
  v_role public.user_role;
  w public.rewards;
  v_reserved int;
  v_id text;
begin
  v_user_id := private.current_plumber_id();
  v_role := 'plumber';
  if v_user_id is null then
    v_user_id := (private.require_retailer()).id;
    v_role := 'retailer';
  else
    perform private.require_plumber();
  end if;

  perform pg_advisory_xact_lock(hashtextextended('points:' || v_user_id, 0));
  select * into w from public.rewards where id = p_reward_id;
  if not found or not w.is_active then raise exception 'This reward is not available.'; end if;
  if not (v_role = any (w.eligible_roles)) then raise exception 'This reward is not available for your account type.'; end if;
  if w.stock <= 0 then raise exception 'This reward is out of stock.'; end if;
  if length(trim(coalesce(p_delivery_address, ''))) < 5 then raise exception 'Enter a delivery address or phone number.'; end if;

  -- Points are deducted at approval; count open requests so users cannot over-request.
  select coalesce(sum(points_cost), 0) into v_reserved from public.redemptions where user_id = v_user_id and status = 'Requested';
  if private.points_available(v_user_id) - v_reserved < w.points_required then
    raise exception 'Not enough points for this reward.';
  end if;

  insert into public.redemptions (user_id, user_role, reward_id, points_cost, delivery_address)
  values (v_user_id, v_role, w.id, w.points_required, trim(p_delivery_address))
  returning id into v_id;
  insert into public.status_events (entity_type, entity_id, by_name, action) values ('redemption', v_id, 'System', 'Redemption requested from app');
  return v_id;
end;
$$;

create function public.cancel_my_redemption(p_redemption_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.redemptions;
begin
  select * into d from public.redemptions
    where id = p_redemption_id and user_id in (private.current_plumber_id(), private.current_retailer_id())
    for update;
  if not found then raise exception 'Redemption not found.'; end if;
  if d.status <> 'Requested' then raise exception 'Only requests that are not yet approved can be cancelled.'; end if;
  update public.redemptions set status = 'Cancelled', cancel_reason = 'Cancelled by user' where id = d.id;
  insert into public.status_events (entity_type, entity_id, by_name, action) values ('redemption', d.id, 'User', 'Cancelled');
end;
$$;

-- ------------------------------------------------------- inventory & support
create function public.report_inventory(p_product_id text, p_quantity int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.retailers := private.require_retailer();
begin
  if p_quantity is null or p_quantity < 0 then raise exception 'Quantity must be zero or more.'; end if;
  insert into public.inventory (retailer_id, product_id, quantity, updated_by)
  values (r.id, p_product_id, p_quantity, 'Retailer app')
  on conflict (retailer_id, product_id) do update set quantity = excluded.quantity, updated_at = now(), updated_by = 'Retailer app';
end;
$$;

create function public.raise_ticket(
  p_subject text, p_category public.ticket_category, p_description text, p_priority public.ticket_priority default 'Medium'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id text := coalesce(private.current_plumber_id(), private.current_retailer_id());
  v_id text;
begin
  if v_user_id is null then raise exception 'Complete registration first.'; end if;
  insert into public.support_tickets (user_id, user_role, subject, category, description, priority)
  values (v_user_id, case when v_user_id like 'PLM-%' then 'plumber' else 'retailer' end::public.user_role,
          trim(p_subject), p_category, coalesce(trim(p_description), ''), p_priority)
  returning id into v_id;
  return v_id;
end;
$$;

-- --------------------------------------------------------- read helpers
create function public.my_scheme_progress()
returns table (
  scheme_id text, name text, description text, status public.scheme_status, start_date timestamptz, end_date timestamptz,
  target_type public.scheme_target_type, target_value bigint, incentive_points int, progress bigint, awarded boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id text := coalesce(private.current_plumber_id(), private.current_retailer_id());
  v_role public.user_role := case when private.current_plumber_id() is not null then 'plumber' else 'retailer' end;
begin
  if v_user_id is null then raise exception 'Complete registration first.'; end if;
  return query
  select s.id, s.name, s.description, s.status, s.start_date, s.end_date, s.target_type, s.target_value, s.incentive_points,
         private.scheme_progress(s.id, v_user_id),
         exists (select 1 from public.scheme_awards a where a.scheme_id = s.id and a.user_id = v_user_id)
  from public.schemes s
  where s.role = v_role and s.status in ('Active', 'Scheduled')
  order by s.start_date;
end;
$$;

/** Approved, active stores — the "nearby stores" list in the plumber app. Exposes no GST or contact email. */
create view public.store_directory as
select r.id, r.shop_name, r.address, r.city, r.state, r.mobile
from public.retailers r
where r.verification_status = 'Approved' and r.account_status = 'Active';

-- ============================================ audit trail for direct admin edits
-- Admins edit catalogue/profile fields directly through the API (column grants limit what they can
-- change); this trigger records every such edit in the audit log.
create function private.audit_admin_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_entity public.audit_entity;
  v_changed text;
  v_label text;
begin
  if not private.is_admin() or current_setting('levik.rpc', true) = 'on' then
    return null;
  end if;
  v_entity := case tg_table_name
    when 'products' then 'Product' when 'rewards' then 'Reward' when 'schemes' then 'Scheme'
    when 'plumbers' then 'Plumber' when 'retailers' then 'Retailer' when 'inventory' then 'Inventory'
    when 'settings' then 'Settings' end;
  v_label := coalesce(to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'shop_name', to_jsonb(new) ->> 'id', 'settings');
  if tg_op = 'INSERT' then
    perform private.log_audit(v_entity || ' created', v_entity, coalesce(to_jsonb(new) ->> 'id', 'SETTINGS'), v_label || ' added');
  else
    select string_agg(n.key, ', ') into v_changed
    from jsonb_each(to_jsonb(new)) n
    where n.key not in ('updated_at') and n.value is distinct from to_jsonb(old) -> n.key;
    if v_changed is not null then
      perform private.log_audit(v_entity || ' edited', v_entity, coalesce(to_jsonb(new) ->> 'id', 'SETTINGS'),
                                format('%s · changed: %s', v_label, v_changed));
    end if;
  end if;
  return null;
end;
$$;

create trigger products_audit after insert or update on public.products for each row execute function private.audit_admin_edit();
create trigger rewards_audit after insert or update on public.rewards for each row execute function private.audit_admin_edit();
create trigger schemes_audit after insert or update on public.schemes for each row execute function private.audit_admin_edit();
create trigger plumbers_audit after update on public.plumbers for each row execute function private.audit_admin_edit();
create trigger retailers_audit after update on public.retailers for each row execute function private.audit_admin_edit();
create trigger inventory_audit after update on public.inventory for each row execute function private.audit_admin_edit();
create trigger settings_audit after update on public.settings for each row execute function private.audit_admin_edit();

/** Schemes created through the API always start as Draft; target type follows the role. */
create function private.prepare_scheme() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.target_type := case when new.role = 'retailer' then 'Sales Amount' else 'Approved Scans' end::public.scheme_target_type;
  return new;
end;
$$;

create trigger schemes_prepare before insert or update of role on public.schemes
  for each row execute function private.prepare_scheme();
