-- Database test suite: business rules, transaction integrity and row-level security.
-- Runs after migrations + seed (see run-local.sh). Every check raises on failure.
\set QUIET on
\set ON_ERROR_STOP 1
-- Result rows are noise; checks report through NOTICE (stderr) and fail by raising.
\o /dev/null

-- --------------------------------------------------------------- helpers
create function pg_temp.ok(p_pass boolean, p_name text) returns void language plpgsql as $$
begin
  if p_pass is not true then raise exception 'FAIL: %', p_name; end if;
  raise notice 'ok - %', p_name;
end;
$$;

-- Impersonate a signed-in user exactly as PostgREST does: claims setting + authenticated role.
create function pg_temp.login(p_sub text, p_phone text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'phone', p_phone)::text, false);
end;
$$;

-- Asserts that a statement fails with a message containing p_expected.
create function pg_temp.fails(p_sql text, p_expected text, p_name text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_expected) in lower(sqlerrm)) > 0 then
      raise notice 'ok - %', p_name;
      return;
    end if;
    raise exception 'FAIL: % (unexpected error: %)', p_name, sqlerrm;
  end;
  raise exception 'FAIL: % (statement succeeded)', p_name;
end;
$$;

create function pg_temp.balance(p_user text) returns int language sql as $$
  select coalesce(sum(credit) - sum(debit), 0)::int from public.points_ledger where user_id = p_user
$$;

\set admin    '''a0000000-0000-4000-8000-000000000001'''
\set plumber  '''b0000000-0000-4000-8000-000000001001'''
\set retailer '''c0000000-0000-4000-8000-000000002001'''

-- ============================================================ seed integrity
select pg_temp.ok(not exists (select 1 from public.points_balances where available < 0), 'seed balances are never negative');
select pg_temp.ok(pg_temp.balance('PLM-1001') = 4080, 'seed balance for Ramesh is 4,080');
select pg_temp.ok((select count(*) from public.scans) = 23 and (select count(*) from public.products) = 21, 'seed row counts');

-- ======================================================== admin: scans (A)
select pg_temp.login(:admin);
set role authenticated;

select pg_temp.ok(public.is_admin(), 'demo admin is recognised');
select pg_temp.ok((select count(*) from public.scan_checks('SCN-5007') where blocking and not passed) = 0, 'SCN-5007 passes all blocking checks');

select pg_temp.ok(r ->> 'points' = '350' and r -> 'scheme_awards' -> 0 ->> 'id' = 'SCH-402', 'approve_scan credits 350 pts and awards Festive Fitter Challenge')
from (select public.approve_scan('SCN-5007') as r) x;
select pg_temp.ok(pg_temp.balance('PLM-1001') = 5430, 'Ramesh balance 4,080 → 5,430');
select pg_temp.fails($$select public.approve_scan('SCN-5007')$$, 'already approved', 'scan cannot be approved twice');
select pg_temp.ok((select count(*) from public.points_ledger where related_id = 'SCN-5007') = 1, 'exactly one ledger credit for SCN-5007');
select pg_temp.ok((select count(*) from public.scheme_awards where scheme_id = 'SCH-402' and user_id = 'PLM-1001') = 1, 'scheme award recorded once');

select pg_temp.fails($$select public.approve_scan('SCN-5015')$$, 'Serial code not previously credited', 'duplicate serial blocks approval');
select pg_temp.fails($$select public.reject_scan('SCN-5015', '')$$, 'rejection reason', 'rejection requires a reason');
select public.reject_scan('SCN-5015', 'Serial already credited on SCN-5003');
select pg_temp.ok(pg_temp.balance('PLM-1003') = 3200 and (select status from public.scans where id = 'SCN-5015') = 'Rejected', 'rejected scan credits nothing');
select pg_temp.fails($$select public.approve_scan('SCN-5019')$$, 'Plumber KYC verified', 'pending KYC blocks approval');
select public.flag_scan('SCN-5019', 'KYC pending; invoice lists a different model');

-- ===================================================== admin: invoices (B)
select pg_temp.ok((select sum(points) from public.invoice_incentive('INV-3009')) = 711, 'INV-3009 incentive preview is 711 pts');
select pg_temp.ok(r ->> 'points' = '711' and r -> 'scheme_awards' -> 0 ->> 'id' = 'SCH-401', 'approve_invoice credits 711 pts and awards Festive Retail Booster')
from (select public.approve_invoice('INV-3009') as r) x;
select pg_temp.ok(pg_temp.balance('RTL-2001') = 5224 + 711 + 5000, 'Sharma balance includes incentive and scheme bonus');
select pg_temp.fails($$select public.approve_invoice('INV-3009')$$, 'already approved', 'invoice cannot be credited twice');
select pg_temp.fails($$select public.approve_invoice('INV-3010')$$, 'Invoice number is unique', 'duplicate invoice number blocks approval');
select public.reject_invoice('INV-3010', 'Duplicate of approved invoice INV-3003');
select public.start_invoice_review('INV-3007');
select public.request_invoice_info('INV-3007', 'Please upload the full page with GSTIN visible');

-- ================================================== admin: redemptions (C)
select pg_temp.ok((select count(*) from public.redemption_checks('RDM-7004') where blocking and not passed) = 0, 'RDM-7004 is eligible');
select public.approve_redemption('RDM-7004');
select public.update_redemption_status('RDM-7004', 'Processing');
select public.update_redemption_status('RDM-7004', 'Dispatched');
select public.update_redemption_status('RDM-7004', 'Delivered');
select pg_temp.ok(pg_temp.balance('PLM-1004') = 5420 - 2500, 'redemption deducts exactly once across fulfilment');
select pg_temp.ok((select stock from public.rewards where id = 'RWD-6004') = 11, 'reward stock 12 → 11');
select pg_temp.ok((select count(*) from public.points_ledger where related_id = 'RDM-7004') = 1, 'one ledger debit for RDM-7004');
select pg_temp.fails($$select public.approve_redemption('RDM-7004')$$, 'Only requested', 'delivered redemption cannot be re-approved');
select pg_temp.fails($$select public.approve_redemption('RDM-7006')$$, 'Sufficient points balance', 'insufficient balance blocks approval');

select public.update_redemption_status('RDM-7007', 'Cancelled', 'Retailer changed reward');
select pg_temp.ok(pg_temp.balance('RTL-2005') = 5187 + 2000 and (select stock from public.rewards where id = 'RWD-6003') = 60, 'cancel after approval refunds once and restores stock');
select pg_temp.fails($$select public.update_redemption_status('RDM-7007', 'Cancelled', 'again please')$$, 'Cannot move', 'cannot cancel twice');

-- ============================================== admin: stock & adjustments
select pg_temp.fails($$select public.adjust_reward_stock('RWD-6008', -99, 'Write-off test')$$, 'below zero', 'reward stock cannot go negative');
select pg_temp.ok(public.adjust_reward_stock('RWD-6008', -3, 'Damaged in transit') = 0, 'stock can reach exactly zero');
select pg_temp.fails($$select public.adjust_points('PLM-1006', 100, '')$$, 'reason', 'adjustment needs a reason');
select pg_temp.fails($$select public.adjust_points('PLM-1006', -999999, 'Clawback test')$$, 'negative', 'adjustment cannot overdraw');
select public.adjust_points('PLM-1006', 250, 'Goodwill credit');
select pg_temp.ok(pg_temp.balance('PLM-1006') = 1575 + 250, 'manual credit posted');

-- ======================================== admin: direct edits & schemes (D)
insert into public.products (name, model_code, category, description, sku, barcode, mrp, plumber_points)
values ('Wall-Hung WC 206 Pro', '206-P', 'Wall-Hung WC', 'Test product added by admin', 'LVK-206-P', '8900012206999', 12900, 260);
select pg_temp.ok(exists (select 1 from public.audit_logs where action = 'Product created' and summary like 'Wall-Hung WC 206 Pro%'), 'direct product insert is audited');
update public.products set mrp = 13200 where sku = 'LVK-206-P';
select pg_temp.ok(exists (select 1 from public.audit_logs where action = 'Product edited' and summary like '%changed: mrp%'), 'direct product edit is audited with changed columns');

insert into public.schemes (name, description, role, start_date, end_date, eligible_categories, target_value, incentive_points)
values ('Pilot Wall-Hung Drive', 'Integration test scheme', 'retailer', now() - interval '1 day', now() + interval '30 days',
        array['Wall-Hung WC']::public.product_category[], 50000, 500);
select pg_temp.ok((select status = 'Draft' and target_type = 'Sales Amount' from public.schemes where name = 'Pilot Wall-Hung Drive'), 'new scheme starts as Draft with derived target type');
select pg_temp.ok(public.activate_scheme(id) = 'Active', 'draft scheme activates') from public.schemes where name = 'Pilot Wall-Hung Drive';
update public.schemes set target_value = 1 where name = 'Pilot Wall-Hung Drive';
select pg_temp.ok((select target_value from public.schemes where name = 'Pilot Wall-Hung Drive') = 50000, 'active scheme cannot be edited directly');
select pg_temp.fails($$update public.schemes set status = 'Completed' where id = 'SCH-401'$$, 'permission denied', 'scheme status changes only via functions');
select pg_temp.fails($$update public.scans set status = 'Approved' where id = 'SCN-5013'$$, 'permission denied', 'scan status cannot be set directly');
select pg_temp.fails($$update public.rewards set stock = 999 where id = 'RWD-6001'$$, 'permission denied', 'reward stock cannot be set directly');

select public.set_plumber_verification('PLM-1007', 'Verified', 'Documents checked');
select pg_temp.ok((select count(*) from public.audit_logs where entity_id = 'PLM-1007' and action = 'Plumber edited') = 0
  and (select count(*) from public.audit_logs where entity_id = 'PLM-1007' and action = 'Plumber verification verified') = 1,
  'status RPCs are audited once (no duplicate trigger entry)');
select public.update_ticket('TKT-8001', 'In Progress', 'Scan approved; points credited.');

select pg_temp.ok((select count(*) from public.scheme_participants('SCH-401')) = 5, 'scheme participants lists eligible retailers');

reset role;
select pg_temp.fails($$update public.points_ledger set credit = 1 where id = 'TXN-90001'$$, 'append-only', 'ledger is append-only even for the owner');
select pg_temp.fails($$delete from public.audit_logs$$, 'append-only', 'audit log is append-only');

-- =========================================================== plumber (RLS)
select pg_temp.login(:plumber, '919829011234');
set role authenticated;

select pg_temp.ok(not public.is_admin(), 'plumber is not an admin');
select pg_temp.ok((select count(*) from public.plumbers) = 1, 'plumber sees only their own profile');
select pg_temp.ok((select bool_and(plumber_id = 'PLM-1001') from public.scans), 'plumber sees only their own scans');
select pg_temp.ok((select bool_and(user_id = 'PLM-1001') from public.points_ledger), 'plumber sees only their own ledger');
select pg_temp.ok((select available from public.points_balances) = 5430, 'plumber balance view');
select pg_temp.ok((select count(*) from public.audit_logs) = 0, 'plumber cannot read the audit log');
select pg_temp.ok((select count(*) from public.store_directory) = 5, 'plumber sees approved, active stores');
select pg_temp.fails($$select public.approve_scan('SCN-5013')$$, 'Only programme administrators', 'plumber cannot approve scans');
update public.products set mrp = 1 where id = 'PRD-103';
select pg_temp.ok((select mrp from public.products where id = 'PRD-103') = 18500, 'plumber cannot edit products');

select pg_temp.ok(public.submit_scan('PRD-106', 'LVK-206-PILOT01', 'RTL-2001', null, 'Jhotwara, Jaipur') like 'SCN-%', 'plumber submits a scan');
select pg_temp.fails($$select public.submit_scan('PRD-106', 'lvk-206-pilot01')$$, 'already been submitted', 'same serial cannot be submitted twice');
-- Seeded RDM-7006 (25,000-pt refrigerator) already reserves more than Ramesh's balance.
select pg_temp.fails($$select public.request_redemption('RWD-6001', 'SMS: +91 98290 11234')$$, 'Not enough points', 'open requests reserve points');
select public.cancel_my_redemption('RDM-7006');
select pg_temp.ok((select status from public.redemptions where id = 'RDM-7006') = 'Cancelled', 'plumber cancels an unapproved request');
select pg_temp.ok(public.request_redemption('RWD-6001', 'SMS: +91 98290 11234') like 'RDM-%', 'plumber requests a voucher');
select pg_temp.ok(public.request_redemption('RWD-6005', '88, Gopalpura Bypass, Jaipur') like 'RDM-%', 'second request fits remaining balance');
select pg_temp.fails($$select public.request_redemption('RWD-6004', '88, Gopalpura Bypass, Jaipur')$$, 'Not enough points', 'third request exceeds unreserved balance');
select pg_temp.ok(pg_temp.balance('PLM-1001') = 5430, 'requests do not deduct points before approval');
select pg_temp.ok((select count(*) from public.my_scheme_progress()) >= 1, 'plumber sees own scheme progress');
select pg_temp.ok(public.raise_ticket('Voucher not received', 'Redemption', 'Requested yesterday') like 'TKT-%', 'plumber raises a ticket');

-- ========================================================== retailer (RLS)
select pg_temp.login(:retailer, '919829041127');
select pg_temp.ok((select count(*) from public.retailers) = 1, 'retailer sees only their own shop');
select pg_temp.ok((select bool_and(retailer_id = 'RTL-2001') from public.invoices), 'retailer sees only their own invoices');
select pg_temp.ok(public.submit_invoice('SSS/25-26/0450', current_date - 1, 'Pilot buyer',
  '[{"product_id": "PRD-103", "quantity": 2}, {"product_id": "PRD-117", "quantity": 1, "unit_price": 3400}]'::jsonb) like 'INV-%',
  'retailer submits an invoice');
select pg_temp.ok((select sum(points) from public.invoice_incentive((select max(id) from public.invoices))) = 404, 'retailer previews own incentive');
select public.report_inventory('PRD-103', 9);
select pg_temp.ok((select quantity from public.inventory where retailer_id = 'RTL-2001' and product_id = 'PRD-103') = 9, 'retailer reports stock');
select pg_temp.fails($$select public.approve_invoice('INV-3008')$$, 'Only programme administrators', 'retailer cannot approve invoices');

-- ====================================================== new user onboarding
reset role;
insert into auth.users (id, phone) values ('d0000000-0000-4000-8000-000000000099', '919900011122');
select pg_temp.login('d0000000-0000-4000-8000-000000000099', '919900011122');
set role authenticated;
select pg_temp.fails($$select public.submit_scan('PRD-106', 'LVK-206-NEW00001')$$, 'Complete plumber registration', 'unregistered user cannot scan');
select pg_temp.ok(public.register_plumber('Pilot Plumber', 'Jaipur', 'Rajasthan', '302012', 3, 'Bathroom fitting') = 'PLM-1013', 'new plumber registers as PLM-1013');
select pg_temp.ok((select verification_status = 'Pending' and mobile = '+91 99000 11122' from public.plumbers), 'new plumber starts Pending with formatted mobile');
select public.submit_plumber_kyc('4321');
select pg_temp.ok((select aadhaar_masked from public.plumbers) = 'XXXX XXXX 4321', 'only the masked Aadhaar reference is stored');
select pg_temp.fails($$select public.register_plumber('Again', 'Jaipur', 'Rajasthan', '302012')$$, 'already registered', 'cannot register twice');

-- =================================================================== anon
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select pg_temp.fails($$select count(*) from public.plumbers$$, 'permission denied', 'anonymous users cannot read data');
select pg_temp.fails($$select public.approve_scan('SCN-5013')$$, 'permission denied', 'anonymous users cannot call functions');
reset role;

-- ================================================================= totals
select pg_temp.ok(not exists (select 1 from public.points_balances where available < 0), 'no balance went negative');
select pg_temp.ok(not exists (select 1 from public.rewards where stock < 0), 'no reward stock went negative');
\o
\echo 'rules.test.sql: all checks passed'
