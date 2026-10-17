-- Row-level security and privileges.
-- Model: everything is denied by default. Admins read everything and edit catalogue/profile columns
-- directly; every status change, points movement and stock change goes through SECURITY DEFINER
-- functions. Plumbers and retailers read only their own records.

-- ------------------------------------------------------------ start from zero
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant usage on schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- RLS policies call these three helpers as the requesting user.
grant usage on schema private to authenticated;
grant execute on function private.is_admin(), private.current_plumber_id(), private.current_retailer_id() to authenticated;

-- Direct inserts by admins use these sequences for their default IDs.
grant usage on sequence public.product_seq, public.reward_seq, public.scheme_seq to authenticated;

-- ---------------------------------------------------------------- enable RLS
alter table public.admins enable row level security;
alter table public.retailers enable row level security;
alter table public.plumbers enable row level security;
alter table public.products enable row level security;
alter table public.points_ledger enable row level security;
alter table public.scans enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.schemes enable row level security;
alter table public.scheme_awards enable row level security;
alter table public.inventory enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_notes enable row level security;
alter table public.status_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

-- ------------------------------------------------------------------- admins
grant select, update (name) on public.admins to authenticated;
create policy admins_read on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy admins_update_self on public.admins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------- plumbers/retailers
grant select on public.plumbers, public.retailers to authenticated;
grant update (name, mobile, email, city, state, pincode, experience_years, specialization, preferred_retailer_id)
  on public.plumbers to authenticated;
grant update (shop_name, owner_name, mobile, email, address, city, state, gstin, distributor, monthly_target)
  on public.retailers to authenticated;

create policy plumbers_read on public.plumbers for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy plumbers_admin_update on public.plumbers for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy retailers_read on public.retailers for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy retailers_admin_update on public.retailers for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Store directory for the plumber app (approved shops only, no GSTIN/email).
grant select on public.store_directory to authenticated;

-- ------------------------------------------------------------------ catalogue
grant select on public.products to authenticated;
grant insert (name, model_code, category, description, dimensions, features, image_url, sku, barcode, mrp, plumber_points, is_active, reward_eligible),
      update (name, model_code, category, description, dimensions, features, image_url, sku, barcode, mrp, plumber_points, is_active, reward_eligible)
  on public.products to authenticated;
create policy products_read on public.products for select to authenticated
  using (is_active or (select private.is_admin()));
create policy products_admin_insert on public.products for insert to authenticated
  with check ((select private.is_admin()));
create policy products_admin_update on public.products for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ------------------------------------------------------------- transactions
grant select on public.scans, public.invoices, public.invoice_lines, public.redemptions,
                public.points_ledger, public.points_balances, public.scheme_awards to authenticated;

create policy scans_read on public.scans for select to authenticated
  using ((select private.is_admin()) or plumber_id = (select private.current_plumber_id()));

create policy invoices_read on public.invoices for select to authenticated
  using ((select private.is_admin()) or retailer_id = (select private.current_retailer_id()));
create policy invoice_lines_read on public.invoice_lines for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));

create policy redemptions_read on public.redemptions for select to authenticated
  using ((select private.is_admin())
         or user_id = (select private.current_plumber_id())
         or user_id = (select private.current_retailer_id()));

create policy ledger_read on public.points_ledger for select to authenticated
  using ((select private.is_admin())
         or user_id = (select private.current_plumber_id())
         or user_id = (select private.current_retailer_id()));

create policy scheme_awards_read on public.scheme_awards for select to authenticated
  using ((select private.is_admin())
         or user_id = (select private.current_plumber_id())
         or user_id = (select private.current_retailer_id()));

-- -------------------------------------------------------------------- rewards
grant select on public.rewards to authenticated;
grant insert (name, category, type, description, points_required, stock, is_active, eligible_roles),
      update (name, category, type, description, points_required, is_active, eligible_roles)
  on public.rewards to authenticated;
create policy rewards_read on public.rewards for select to authenticated
  using (is_active or (select private.is_admin()));
create policy rewards_admin_insert on public.rewards for insert to authenticated
  with check ((select private.is_admin()));
create policy rewards_admin_update on public.rewards for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- -------------------------------------------------------------------- schemes
grant select on public.schemes to authenticated;
grant insert (name, description, role, start_date, end_date, eligible_categories, target_value, incentive_points),
      update (name, description, role, start_date, end_date, eligible_categories, target_value, incentive_points)
  on public.schemes to authenticated;
create policy schemes_read on public.schemes for select to authenticated
  using ((select private.is_admin())
         or (status in ('Active', 'Scheduled', 'Completed')
             and ((role = 'plumber' and (select private.current_plumber_id()) is not null)
                  or (role = 'retailer' and (select private.current_retailer_id()) is not null))));
create policy schemes_admin_insert on public.schemes for insert to authenticated
  with check ((select private.is_admin()));
-- Only Draft and Scheduled schemes can be edited; status changes go through activate/pause/complete.
create policy schemes_admin_update on public.schemes for update to authenticated
  using ((select private.is_admin()) and status in ('Draft', 'Scheduled'))
  with check ((select private.is_admin()));

-- ------------------------------------------------------------------ inventory
grant select on public.inventory to authenticated;
grant update (quantity, updated_by, updated_at) on public.inventory to authenticated;
create policy inventory_read on public.inventory for select to authenticated
  using ((select private.is_admin()) or retailer_id = (select private.current_retailer_id()));
create policy inventory_admin_update on public.inventory for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- -------------------------------------------------------------------- support
grant select on public.support_tickets, public.ticket_notes to authenticated;
create policy tickets_read on public.support_tickets for select to authenticated
  using ((select private.is_admin())
         or user_id = (select private.current_plumber_id())
         or user_id = (select private.current_retailer_id()));
create policy ticket_notes_admin_read on public.ticket_notes for select to authenticated
  using ((select private.is_admin()));

-- ----------------------------------------------------- history, audit, settings
grant select on public.status_events, public.audit_logs, public.settings to authenticated;
grant update (programme_name, retailer_points_per_100, low_stock_threshold, notifications, max_daily_scans_per_plumber)
  on public.settings to authenticated;
create policy status_events_admin_read on public.status_events for select to authenticated
  using ((select private.is_admin()));
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using ((select private.is_admin()));
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Future objects: do not rely on Supabase's default grants; new tables must opt in explicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
