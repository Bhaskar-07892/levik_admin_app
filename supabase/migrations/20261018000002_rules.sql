-- Business rules shared by every transaction. Mirrors lib/mock-api/rules.ts so the checks a reviewer
-- sees in the admin UI are exactly the checks the approval functions enforce.
--
-- Convention: private.* = internal helpers (not exposed through the API);
--             public.*  = callable via supabase.rpc(); all are SECURITY DEFINER with search_path = ''.

-- ------------------------------------------------------------------ identity
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin();
$$;

create function private.require_admin() returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Only programme administrators can perform this action' using errcode = '42501';
  end if;
  -- Marks this transaction as an audited RPC so row-level "direct edit" audit triggers stay quiet.
  perform set_config('levik.rpc', 'on', true);
end;
$$;

create function private.actor_name() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select name from public.admins where user_id = auth.uid()), 'System');
$$;

create function private.current_plumber_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.plumbers where user_id = auth.uid();
$$;

create function private.current_retailer_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.retailers where user_id = auth.uid();
$$;

-- --------------------------------------------------------------- write helpers
create function private.log_audit(p_action text, p_entity public.audit_entity, p_entity_id text, p_summary text)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (admin_name, admin_user_id, action, entity_type, entity_id, summary)
  values (private.actor_name(), auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_summary, ''));
$$;

create function private.log_event(p_type public.related_entity, p_id text, p_action text, p_note text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.status_events (entity_type, entity_id, by_name, action, note)
  values (p_type, p_id, private.actor_name(), p_action, p_note);
$$;

create function private.require_reason(p_reason text, p_what text default 'A reason') returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception '% of at least 5 characters is required.', p_what;
  end if;
  return trim(p_reason);
end;
$$;

create function private.points_available(p_user_id text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(credit) - sum(debit), 0)::int from public.points_ledger where user_id = p_user_id;
$$;

/** Posts one ledger entry and its audit record. Positive amount = credit, negative = debit. */
create function private.post_points(
  p_user_id text, p_role public.user_role, p_source public.points_source, p_amount int, p_note text,
  p_related_type public.related_entity default null, p_related_id text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
begin
  if p_amount is null or p_amount = 0 then
    raise exception 'Points amount must be a non-zero whole number.';
  end if;
  insert into public.points_ledger (user_id, user_role, source, related_type, related_id, credit, debit, note, created_by)
  values (p_user_id, p_role, p_source, p_related_type, p_related_id, greatest(p_amount, 0), greatest(-p_amount, 0),
          coalesce(p_note, ''), private.actor_name())
  returning id into v_id;
  perform private.log_audit(
    case when p_amount > 0 then 'Points credited' else 'Points debited' end, 'Points', v_id,
    format('%s pts %s %s · %s', abs(p_amount), case when p_amount > 0 then 'credited to' else 'debited from' end, p_user_id, p_source));
  return v_id;
end;
$$;

-- ------------------------------------------------------------------- checks
create function public.scan_checks(p_scan_id text)
returns table (label text, passed boolean, blocking boolean, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.scans;
  p public.products;
  pl public.plumbers;
  r public.retailers;
  v_dup text;
  v_inv_id text;
  v_inv_has boolean;
begin
  perform private.require_admin();
  select * into s from public.scans where id = p_scan_id;
  if not found then raise exception 'Scan % not found', p_scan_id; end if;
  select * into p from public.products where id = s.product_id;
  select * into pl from public.plumbers where id = s.plumber_id;
  select * into r from public.retailers where id = s.retailer_id;
  select id into v_dup from public.scans
    where submitted_code = s.submitted_code and status = 'Approved' and id <> s.id limit 1;
  if s.invoice_number is not null then
    select id into v_inv_id from public.invoices
      where invoice_number = s.invoice_number and retailer_id = s.retailer_id
      order by submitted_at desc limit 1;
    v_inv_has := exists (select 1 from public.invoice_lines where invoice_id = v_inv_id and product_id = s.product_id);
  end if;

  return query values
    ('Product code recognised', coalesce(p.is_active, false), true,
      case when p.id is null then 'Code does not match the catalogue'
           else p.name || case when p.is_active then ' (active)' else ' (inactive)' end end),
    ('Product is reward-eligible', coalesce(p.reward_eligible, false), true,
      case when p.reward_eligible then p.plumber_points || ' points per approved scan' else 'Product does not earn scan points' end),
    ('Plumber KYC verified', pl.verification_status is not distinct from 'Verified', true,
      coalesce('KYC status: ' || pl.verification_status, 'Plumber not found')),
    ('Plumber account active', pl.account_status is not distinct from 'Active', true,
      coalesce('Account status: ' || pl.account_status, 'Plumber not found')),
    ('Proof of sale from an approved retailer', r.verification_status is not distinct from 'Approved', true,
      coalesce(r.shop_name || coalesce(' · invoice ' || s.invoice_number, ''), 'No retailer or invoice reference supplied')),
    ('Serial code not previously credited', v_dup is null, true,
      coalesce('Already credited on ' || v_dup, 'No approved scan uses this serial')),
    ('Linked invoice lists this product', s.invoice_number is null or coalesce(v_inv_has, false), false,
      case
        when s.invoice_number is null then 'No invoice number supplied (retailer reference only)'
        when v_inv_id is null then 'Invoice number not found in submitted invoices'
        when v_inv_has then v_inv_id || ' includes this model'
        else v_inv_id || ' does not include this model'
      end);
end;
$$;

create function public.invoice_incentive(p_invoice_id text)
returns table (
  line_id text, product_id text, product_name text, category public.product_category,
  quantity int, unit_price bigint, line_value bigint, eligible boolean, reason text, points int
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_rate numeric := (select retailer_points_per_100 from public.settings);
begin
  if not private.is_admin()
     and not exists (select 1 from public.invoices i where i.id = p_invoice_id and i.retailer_id = private.current_retailer_id()) then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;
  return query
  select l.id, l.product_id, p.name, p.category, l.quantity, l.unit_price, l.quantity * l.unit_price,
         coalesce(p.reward_eligible and p.is_active, false),
         case when p.id is null then 'Unknown product'
              when not p.reward_eligible then 'Not reward-eligible'
              when not p.is_active then 'Product inactive' end,
         case when p.reward_eligible and p.is_active then floor(l.quantity * l.unit_price / 100.0 * v_rate)::int else 0 end
  from public.invoice_lines l
  left join public.products p on p.id = l.product_id
  where l.invoice_id = p_invoice_id
  order by l.id;
end;
$$;

/** Total incentive: N points per ₹100 of pre-GST value on active, reward-eligible lines. */
create function private.invoice_incentive_points(p_invoice_id text) returns int
language sql stable security definer set search_path = '' as $$
  select floor(coalesce(sum(l.quantity * l.unit_price), 0) / 100.0 * (select retailer_points_per_100 from public.settings))::int
  from public.invoice_lines l
  join public.products p on p.id = l.product_id and p.reward_eligible and p.is_active
  where l.invoice_id = p_invoice_id;
$$;

create function public.invoice_checks(p_invoice_id text)
returns table (label text, passed boolean, blocking boolean, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare
  i public.invoices;
  r public.retailers;
  v_dup public.invoices;
  v_lines int;
  v_eligible int;
begin
  perform private.require_admin();
  select * into i from public.invoices where id = p_invoice_id;
  if not found then raise exception 'Invoice % not found', p_invoice_id; end if;
  select * into r from public.retailers where id = i.retailer_id;
  select * into v_dup from public.invoices
    where id <> i.id and retailer_id = i.retailer_id and invoice_number = i.invoice_number and status <> 'Rejected'
    limit 1;
  select count(*), count(*) filter (where ii.eligible) into v_lines, v_eligible from public.invoice_incentive(p_invoice_id) ii;

  return query values
    ('Retailer approved', r.verification_status is not distinct from 'Approved', true,
      coalesce('Application status: ' || r.verification_status, 'Retailer not found')),
    ('Retailer account active', r.account_status is not distinct from 'Active', true,
      coalesce('Account status: ' || r.account_status, 'Retailer not found')),
    ('Invoice number is unique', v_dup.id is null, true,
      coalesce(format('Same number already used on %s (%s)', v_dup.id, v_dup.status), 'No other active invoice uses this number')),
    ('Contains eligible products', v_eligible > 0, false, format('%s of %s lines earn incentive', v_eligible, v_lines));
end;
$$;

create function public.redemption_checks(p_redemption_id text)
returns table (label text, passed boolean, blocking boolean, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare
  d public.redemptions;
  w public.rewards;
  v_balance int;
  v_active boolean;
begin
  perform private.require_admin();
  select * into d from public.redemptions where id = p_redemption_id;
  if not found then raise exception 'Redemption % not found', p_redemption_id; end if;
  select * into w from public.rewards where id = d.reward_id;
  v_balance := private.points_available(d.user_id);
  v_active := case d.user_role
    when 'plumber' then exists (select 1 from public.plumbers where id = d.user_id and account_status = 'Active')
    else exists (select 1 from public.retailers where id = d.user_id and account_status = 'Active') end;

  return query values
    ('Sufficient points balance', v_balance >= d.points_cost, true,
      format('Available %s pts · required %s pts', to_char(v_balance, 'FM99,99,99,999'), to_char(d.points_cost, 'FM99,99,99,999'))),
    ('Reward in stock', coalesce(w.stock > 0, false), true, coalesce(w.stock || ' units available', 'Reward not found')),
    ('Reward active', coalesce(w.is_active, false), true,
      case when w.is_active then 'Reward is active in the catalogue' else 'Reward is deactivated' end),
    ('Account in good standing', v_active, true, case when v_active then 'Account is active' else 'Account is not active' end);
end;
$$;

-- ------------------------------------------------------------------ schemes
create function private.is_scheme_live(s public.schemes) returns boolean
language sql stable set search_path = '' as $$
  select s.status = 'Active' and now() between s.start_date and s.end_date;
$$;

/** INR value of approved eligible invoice lines (retailers) or count of approved eligible scans (plumbers). */
create function private.scheme_progress(p_scheme_id text, p_user_id text) returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.schemes;
begin
  select * into s from public.schemes where id = p_scheme_id;
  if s.target_type = 'Sales Amount' then
    return (
      select coalesce(sum(l.quantity * l.unit_price), 0)
      from public.invoices i
      join public.invoice_lines l on l.invoice_id = i.id
      join public.products p on p.id = l.product_id
      where i.retailer_id = p_user_id and i.status = 'Approved'
        and i.invoice_date between s.start_date and s.end_date
        and p.category = any (s.eligible_categories));
  end if;
  return (
    select count(*)
    from public.scans sc
    join public.products p on p.id = sc.product_id
    where sc.plumber_id = p_user_id and sc.status = 'Approved'
      and sc.scanned_at between s.start_date and s.end_date
      and p.category = any (s.eligible_categories));
end;
$$;

create function public.scheme_participants(p_scheme_id text)
returns table (user_id text, name text, location text, progress bigint, percent int, awarded boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.schemes;
begin
  perform private.require_admin();
  select * into s from public.schemes where id = p_scheme_id;
  if not found then raise exception 'Scheme % not found', p_scheme_id; end if;
  return query
  with people as (
    select pl.id, pl.name, pl.city || ', ' || pl.state as location from public.plumbers pl
      where s.role = 'plumber' and pl.verification_status = 'Verified' and pl.account_status = 'Active'
    union all
    select r.id, r.shop_name, r.city || ', ' || r.state from public.retailers r
      where s.role = 'retailer' and r.verification_status = 'Approved' and r.account_status = 'Active'
  )
  select x.id, x.name, x.location, x.progress, least(100, round(x.progress * 100.0 / s.target_value))::int,
         exists (select 1 from public.scheme_awards a where a.scheme_id = s.id and a.user_id = x.id)
  from (select pe.*, private.scheme_progress(s.id, pe.id) as progress from people pe) x
  order by x.progress desc, x.name;
end;
$$;

/** Credits a one-time bonus for every live scheme the user has just crossed. Returns the awarded schemes. */
create function private.evaluate_scheme_awards(p_user_id text, p_role public.user_role) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.schemes;
  v_txn text;
  v_awarded jsonb := '[]'::jsonb;
begin
  for s in
    select * from public.schemes
    where role = p_role and status = 'Active' and now() between start_date and end_date
      and not exists (select 1 from public.scheme_awards a where a.scheme_id = schemes.id and a.user_id = p_user_id)
    for update
  loop
    if private.scheme_progress(s.id, p_user_id) >= s.target_value then
      v_txn := private.post_points(p_user_id, p_role, 'Scheme Bonus', s.incentive_points,
                                   'Target achieved: ' || s.name, 'scheme', s.id);
      insert into public.scheme_awards (scheme_id, user_id, ledger_txn_id) values (s.id, p_user_id, v_txn);
      perform private.log_audit('Scheme target achieved', 'Scheme', s.id,
                                format('%s earned %s bonus points', p_user_id, s.incentive_points));
      v_awarded := v_awarded || jsonb_build_object('id', s.id, 'name', s.name, 'incentive_points', s.incentive_points);
    end if;
  end loop;
  return v_awarded;
end;
$$;
