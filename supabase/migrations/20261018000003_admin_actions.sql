-- Admin transaction functions. Each call is one database transaction: it locks the affected rows,
-- validates, updates every related record (status, ledger, stock, scheme awards, history, audit)
-- and either commits everything or nothing. Mirrors lib/mock-api/services.ts.

-- ===================================================================== scans
create function public.approve_scan(p_scan_id text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.scans;
  p public.products;
  v_points int;
  v_txn text;
  v_failed text;
  v_awards jsonb;
begin
  perform private.require_admin();
  select * into s from public.scans where id = p_scan_id for update;
  if not found then raise exception 'Scan not found.'; end if;
  if s.status = 'Approved' or s.ledger_txn_id is not null then raise exception 'This scan is already approved and credited.'; end if;
  if s.status = 'Rejected' then raise exception 'Rejected scans cannot be approved.'; end if;

  select string_agg(c.label, ', ') into v_failed from public.scan_checks(p_scan_id) c where c.blocking and not c.passed;
  if v_failed is not null then raise exception 'Cannot approve: %.', v_failed; end if;

  select * into p from public.products where id = s.product_id;
  v_points := case when p.reward_eligible then p.plumber_points else 0 end;
  if v_points > 0 then
    v_txn := private.post_points(s.plumber_id, 'plumber', 'Product Scan', v_points,
                                 'Approved scan of model ' || p.model_code, 'scan', s.id);
  end if;
  update public.scans
    set status = 'Approved', awarded_points = v_points, ledger_txn_id = v_txn, flag_reason = null,
        reviewed_by = private.actor_name(), reviewed_at = now()
    where id = s.id;
  perform private.log_event('scan', s.id, 'Approved',
                            concat_ws(' · ', v_points || ' points credited', nullif(trim(p_note), '')));
  perform private.log_audit('Scan approved', 'Scan', s.id, format('%s points credited to %s', v_points, s.plumber_id));
  v_awards := private.evaluate_scheme_awards(s.plumber_id, 'plumber');
  return jsonb_build_object('points', v_points, 'ledger_txn_id', v_txn, 'scheme_awards', v_awards);
end;
$$;

create function public.reject_scan(p_scan_id text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.scans;
  v_reason text := private.require_reason(p_reason, 'A rejection reason');
begin
  perform private.require_admin();
  select * into s from public.scans where id = p_scan_id for update;
  if not found then raise exception 'Scan not found.'; end if;
  if s.status = 'Approved' then raise exception 'Approved scans cannot be rejected; use a points adjustment instead.'; end if;
  if s.status = 'Rejected' then raise exception 'This scan is already rejected.'; end if;
  update public.scans
    set status = 'Rejected', rejection_reason = v_reason, reviewed_by = private.actor_name(), reviewed_at = now()
    where id = s.id;
  perform private.log_event('scan', s.id, 'Rejected', v_reason);
  perform private.log_audit('Scan rejected', 'Scan', s.id, v_reason);
end;
$$;

create function public.flag_scan(p_scan_id text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.scans;
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  select * into s from public.scans where id = p_scan_id for update;
  if not found then raise exception 'Scan not found.'; end if;
  if s.status <> 'Pending' then raise exception 'Only pending scans can be flagged.'; end if;
  update public.scans
    set status = 'Flagged', flag_reason = v_reason, reviewed_by = private.actor_name(), reviewed_at = now()
    where id = s.id;
  perform private.log_event('scan', s.id, 'Flagged for investigation', v_reason);
  perform private.log_audit('Scan flagged', 'Scan', s.id, v_reason);
end;
$$;

-- ================================================================== invoices
create function public.start_invoice_review(p_invoice_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.invoices;
begin
  perform private.require_admin();
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if i.status not in ('Submitted', 'More Information Required') then
    raise exception 'Only submitted invoices can be moved to review.';
  end if;
  update public.invoices set status = 'Under Review', reviewer = private.actor_name() where id = i.id;
  perform private.log_event('invoice', i.id, 'Moved to review');
  perform private.log_audit('Invoice review started', 'Invoice', i.id, format('%s assigned to %s', i.invoice_number, private.actor_name()));
end;
$$;

create function public.approve_invoice(p_invoice_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  i public.invoices;
  v_points int;
  v_txn text;
  v_failed text;
  v_awards jsonb;
begin
  perform private.require_admin();
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if i.status = 'Approved' or i.ledger_txn_id is not null then raise exception 'This invoice is already approved and credited.'; end if;
  if i.status = 'Rejected' then raise exception 'Rejected invoices cannot be approved.'; end if;

  select string_agg(c.label, ', ') into v_failed from public.invoice_checks(p_invoice_id) c where c.blocking and not c.passed;
  if v_failed is not null then raise exception 'Cannot approve: %.', v_failed; end if;

  v_points := private.invoice_incentive_points(p_invoice_id);
  if v_points > 0 then
    v_txn := private.post_points(i.retailer_id, 'retailer', 'Invoice Incentive', v_points,
                                 'Incentive for invoice ' || i.invoice_number, 'invoice', i.id);
  end if;
  update public.invoices
    set status = 'Approved', reviewer = private.actor_name(), reviewed_at = now(), incentive_points = v_points,
        ledger_txn_id = v_txn, info_request = null
    where id = i.id;
  perform private.log_event('invoice', i.id, 'Approved', v_points || ' incentive points credited');
  perform private.log_audit('Invoice approved', 'Invoice', i.id, format('%s points credited to %s', v_points, i.retailer_id));
  v_awards := private.evaluate_scheme_awards(i.retailer_id, 'retailer');
  return jsonb_build_object('points', v_points, 'ledger_txn_id', v_txn, 'scheme_awards', v_awards);
end;
$$;

create function public.reject_invoice(p_invoice_id text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.invoices;
  v_reason text := private.require_reason(p_reason, 'A rejection reason');
begin
  perform private.require_admin();
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if i.status = 'Approved' then raise exception 'Approved invoices cannot be rejected.'; end if;
  if i.status = 'Rejected' then raise exception 'This invoice is already rejected.'; end if;
  update public.invoices
    set status = 'Rejected', rejection_reason = v_reason, reviewer = private.actor_name(), reviewed_at = now()
    where id = i.id;
  perform private.log_event('invoice', i.id, 'Rejected', v_reason);
  perform private.log_audit('Invoice rejected', 'Invoice', i.id, v_reason);
end;
$$;

create function public.request_invoice_info(p_invoice_id text, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.invoices;
  v_message text := private.require_reason(p_message, 'A message to the retailer');
begin
  perform private.require_admin();
  select * into i from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if i.status in ('Approved', 'Rejected') then raise exception 'This invoice is already closed.'; end if;
  update public.invoices
    set status = 'More Information Required', info_request = v_message, reviewer = private.actor_name(), reviewed_at = now()
    where id = i.id;
  perform private.log_event('invoice', i.id, 'More information requested', v_message);
  perform private.log_audit('Invoice info requested', 'Invoice', i.id, v_message);
end;
$$;

-- =============================================================== redemptions
create function public.approve_redemption(p_redemption_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.redemptions;
  w public.rewards;
  v_failed text;
  v_txn text;
begin
  perform private.require_admin();
  select * into d from public.redemptions where id = p_redemption_id for update;
  if not found then raise exception 'Redemption not found.'; end if;
  if d.status <> 'Requested' then raise exception 'Only requested redemptions can be approved.'; end if;
  if d.debit_txn_id is not null then raise exception 'Points have already been deducted for this redemption.'; end if;

  -- Serialise all balance-changing work for this user so concurrent approvals cannot overdraw.
  perform pg_advisory_xact_lock(hashtextextended('points:' || d.user_id, 0));
  select * into w from public.rewards where id = d.reward_id for update;

  select string_agg(c.label, ', ') into v_failed from public.redemption_checks(p_redemption_id) c where c.blocking and not c.passed;
  if v_failed is not null then raise exception 'Cannot approve: %.', v_failed; end if;

  update public.rewards set stock = stock - 1 where id = w.id;
  v_txn := private.post_points(d.user_id, d.user_role, 'Redemption', -d.points_cost, 'Redeemed: ' || w.name, 'redemption', d.id);
  update public.redemptions set status = 'Approved', debit_txn_id = v_txn where id = d.id;
  perform private.log_event('redemption', d.id, 'Approved',
                            format('%s points deducted · stock now %s', d.points_cost, w.stock - 1));
  perform private.log_audit('Redemption approved', 'Redemption', d.id,
                            format('%s pts deducted from %s; %s stock now %s', d.points_cost, d.user_id, w.name, w.stock - 1));
end;
$$;

/** Moves a redemption along fulfilment. Never deducts points; refunds once on cancel/fail after approval. */
create function public.update_redemption_status(
  p_redemption_id text, p_next public.redemption_status, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.redemptions;
  w public.rewards;
  v_allowed public.redemption_status[];
  v_note text;
  v_reason text;
  v_txn text;
begin
  perform private.require_admin();
  if p_next = 'Approved' then
    perform public.approve_redemption(p_redemption_id);
    return;
  end if;
  select * into d from public.redemptions where id = p_redemption_id for update;
  if not found then raise exception 'Redemption not found.'; end if;
  select * into w from public.rewards where id = d.reward_id for update;

  v_allowed := case d.status
    when 'Requested' then array['Cancelled']::public.redemption_status[]
    when 'Approved' then array['Processing', 'Cancelled']::public.redemption_status[]
    when 'Processing' then case when w.type = 'Physical'
      then array['Dispatched', 'Failed', 'Cancelled']::public.redemption_status[]
      else array['Delivered', 'Failed', 'Cancelled']::public.redemption_status[] end
    when 'Dispatched' then array['Delivered']::public.redemption_status[]
    else array[]::public.redemption_status[] end;
  if not (p_next = any (v_allowed)) then
    raise exception 'Cannot move a % redemption to %.', d.status, p_next;
  end if;

  if p_next = 'Processing' then
    update public.redemptions set fulfilment_ref = 'FUL-' || substr(d.id, 5) || '-' || to_char(now(), 'MMDD') where id = d.id
      returning 'Fulfilment reference ' || fulfilment_ref into v_note;
  elsif p_next = 'Dispatched' then
    -- Mock courier reference until a logistics integration exists.
    update public.redemptions
      set courier_name = 'Levik Demo Logistics', tracking_number = 'LDL' || substr(d.id, 5) || to_char(now(), 'HH24MI')
      where id = d.id
      returning 'Mock tracking ' || tracking_number into v_note;
  elsif p_next = 'Delivered' and w.type = 'Digital' and d.voucher_code is null then
    update public.redemptions set voucher_code = 'DEMO-' || substr(d.id, 5) || '-' || to_char(now(), 'MISS') where id = d.id
      returning 'Mock voucher code ' || voucher_code || ' sent' into v_note;
  elsif p_next in ('Cancelled', 'Failed') then
    v_reason := private.require_reason(p_reason);
    v_note := v_reason;
    if d.debit_txn_id is not null and d.reversal_txn_id is null then
      v_txn := private.post_points(d.user_id, d.user_role, 'Redemption Reversal', d.points_cost,
                                   format('Refund for %s redemption %s', lower(p_next::text), d.id), 'redemption', d.id);
      update public.rewards set stock = stock + 1 where id = w.id;
      update public.redemptions set reversal_txn_id = v_txn where id = d.id;
      v_note := format('%s · %s points refunded, stock restored', v_reason, d.points_cost);
    end if;
    update public.redemptions set cancel_reason = v_reason where id = d.id;
  end if;

  update public.redemptions set status = p_next where id = d.id;
  perform private.log_event('redemption', d.id, p_next::text, v_note);
  perform private.log_audit('Redemption ' || lower(p_next::text), 'Redemption', d.id, coalesce(v_note, d.id || ' moved to ' || p_next));
end;
$$;

-- =========================================================== points & stock
create function public.adjust_points(p_user_id text, p_amount int, p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  v_role := case
    when exists (select 1 from public.plumbers where id = p_user_id) then 'plumber'
    when exists (select 1 from public.retailers where id = p_user_id) then 'retailer' end;
  if v_role is null then raise exception 'User not found.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('points:' || p_user_id, 0));
  if p_amount < 0 and private.points_available(p_user_id) + p_amount < 0 then
    raise exception 'A debit adjustment cannot make the balance negative.';
  end if;
  return private.post_points(p_user_id, v_role, 'Manual Adjustment', p_amount, v_reason);
end;
$$;

create function public.adjust_reward_stock(p_reward_id text, p_delta int, p_reason text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  w public.rewards;
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  if p_delta is null or p_delta = 0 then raise exception 'Enter a non-zero whole number.'; end if;
  select * into w from public.rewards where id = p_reward_id for update;
  if not found then raise exception 'Reward not found.'; end if;
  if w.stock + p_delta < 0 then raise exception 'Stock cannot go below zero (current stock %).', w.stock; end if;
  update public.rewards set stock = stock + p_delta where id = w.id;
  perform private.log_audit('Reward stock adjusted', 'Reward', w.id,
                            format('%s%s units (now %s) · %s', case when p_delta > 0 then '+' else '' end, p_delta, w.stock + p_delta, v_reason));
  return w.stock + p_delta;
end;
$$;

-- ======================================================== network statuses
create function public.set_plumber_verification(
  p_plumber_id text, p_status public.plumber_verification_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.require_admin();
  if p_status = 'Rejected' then v_note := private.require_reason(p_note); end if;
  update public.plumbers set verification_status = p_status, verification_note = v_note where id = p_plumber_id;
  if not found then raise exception 'Plumber not found.'; end if;
  perform private.log_audit('Plumber verification ' || lower(p_status::text), 'Plumber', p_plumber_id,
                            coalesce(v_note, 'Marked ' || p_status));
end;
$$;

create function public.set_plumber_account_status(p_plumber_id text, p_status public.account_status, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  update public.plumbers set account_status = p_status where id = p_plumber_id;
  if not found then raise exception 'Plumber not found.'; end if;
  perform private.log_audit('Plumber account ' || lower(p_status::text), 'Plumber', p_plumber_id, v_reason);
end;
$$;

create function public.review_retailer_application(
  p_retailer_id text, p_decision public.retailer_verification_status, p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.retailers;
  v_reason text;
begin
  perform private.require_admin();
  if p_decision not in ('Approved', 'Rejected') then raise exception 'Decision must be Approved or Rejected.'; end if;
  select * into r from public.retailers where id = p_retailer_id for update;
  if not found then raise exception 'Retailer not found.'; end if;
  if r.verification_status <> 'Pending' then raise exception 'Only pending applications can be reviewed.'; end if;
  if p_decision = 'Rejected' then v_reason := private.require_reason(p_reason); end if;
  update public.retailers set verification_status = p_decision, rejection_reason = v_reason where id = r.id;
  perform private.log_audit('Retailer ' || lower(p_decision::text), 'Retailer', r.id, coalesce(v_reason, r.shop_name || ' approved'));
end;
$$;

create function public.set_retailer_account_status(p_retailer_id text, p_status public.account_status, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  if p_status not in ('Active', 'Suspended') then raise exception 'Retailer accounts can only be Active or Suspended.'; end if;
  update public.retailers set account_status = p_status where id = p_retailer_id;
  if not found then raise exception 'Retailer not found.'; end if;
  perform private.log_audit('Retailer account ' || lower(p_status::text), 'Retailer', p_retailer_id, v_reason);
end;
$$;

-- =================================================================== schemes
create function public.activate_scheme(p_scheme_id text) returns public.scheme_status
language plpgsql security definer set search_path = '' as $$
declare
  s public.schemes;
  v_status public.scheme_status;
begin
  perform private.require_admin();
  select * into s from public.schemes where id = p_scheme_id for update;
  if not found then raise exception 'Scheme not found.'; end if;
  if s.status not in ('Draft', 'Scheduled', 'Paused') then raise exception 'A % scheme cannot be activated.', s.status; end if;
  if s.end_date < now() then raise exception 'The scheme end date has passed. Edit the dates before activating.'; end if;
  v_status := case when s.start_date > now() then 'Scheduled' else 'Active' end;
  update public.schemes set status = v_status where id = s.id;
  perform private.log_audit(case when v_status = 'Active' then 'Scheme activated' else 'Scheme scheduled' end,
                            'Scheme', s.id, format('%s is now %s', s.name, v_status));
  return v_status;
end;
$$;

create function public.pause_scheme(p_scheme_id text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.schemes;
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  select * into s from public.schemes where id = p_scheme_id for update;
  if not found then raise exception 'Scheme not found.'; end if;
  if s.status not in ('Active', 'Scheduled') then raise exception 'Only active or scheduled schemes can be paused.'; end if;
  update public.schemes set status = 'Paused' where id = s.id;
  perform private.log_audit('Scheme paused', 'Scheme', s.id, v_reason);
end;
$$;

create function public.complete_scheme(p_scheme_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.schemes;
begin
  perform private.require_admin();
  select * into s from public.schemes where id = p_scheme_id for update;
  if not found then raise exception 'Scheme not found.'; end if;
  if s.status not in ('Active', 'Paused') then raise exception 'Only active or paused schemes can be completed.'; end if;
  update public.schemes set status = 'Completed' where id = s.id;
  perform private.log_audit('Scheme completed', 'Scheme', s.id,
    format('%s closed with %s achievers', s.name, (select count(*) from public.scheme_awards where scheme_id = s.id)));
end;
$$;

-- =========================================================== support tickets
create function public.update_ticket(p_ticket_id text, p_status public.ticket_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.support_tickets;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.require_admin();
  select * into t from public.support_tickets where id = p_ticket_id for update;
  if not found then raise exception 'Ticket not found.'; end if;
  if t.status = p_status and v_note is null then raise exception 'Change the status or add a note.'; end if;
  if v_note is not null then
    insert into public.ticket_notes (ticket_id, by_name, body) values (t.id, private.actor_name(), v_note);
  end if;
  update public.support_tickets set status = p_status where id = t.id;
  perform private.log_audit(case when t.status <> p_status then 'Ticket ' || lower(p_status::text) else 'Ticket note added' end,
                            'Support', t.id, coalesce(v_note, t.subject || ' → ' || p_status));
end;
$$;
