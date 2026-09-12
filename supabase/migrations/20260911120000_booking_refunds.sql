alter table bookings drop constraint bookings_status_check;

alter table bookings
  add constraint bookings_status_check
    check (status in ('pending_payment', 'confirmed', 'failed', 'expired', 'canceled')),
  add column canceled_at timestamptz,
  add column canceled_by text
    check (canceled_by in ('guest', 'host'));

alter table bookings
  add constraint bookings_canceled_fields_check
  check (
    (status = 'canceled') = (canceled_at is not null and canceled_by is not null)
  );

alter table homes
  add column cancellation_policy text
    check (cancellation_policy in ('flexible', 'strict'));

create table refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id),
  payment_id uuid not null references payments (id),
  razorpay_payment_id text not null,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'processed', 'failed')),
  actor text not null check (actor in ('guest', 'host')),
  policy_applied text not null
    check (policy_applied in ('flexible', 'strict', 'host_full')),
  razorpay_refund_id text unique,
  failure_reason text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index refunds_requested_idx on refunds (created_at) where status = 'requested';
create index refunds_stale_processing_idx
  on refunds (updated_at)
  where status = 'processing' and razorpay_refund_id is null;

alter table refunds enable row level security;

create policy "guests read their refunds"
  on refunds for select
  to authenticated
  using (
    exists (
      select 1
      from bookings
      where bookings.id = refunds.booking_id
        and bookings.guest_id = (select auth.jwt() ->> 'sub')
    )
  );

revoke all on table refunds from anon, authenticated;
grant select on table refunds to authenticated;

create or replace function check_in_instant(p_check_in date)
returns timestamptz
language sql
immutable
as $$
  select (p_check_in::timestamp + interval '15 hours') at time zone 'Asia/Kolkata';
$$;

create or replace function resolve_cancellation_policy(p_policy text)
returns text
language sql
immutable
as $$
  select coalesce(p_policy, 'flexible');
$$;

create or replace function quote_refund(
  p_policy text,
  p_now timestamptz,
  p_check_in date,
  p_total_paise integer
)
returns jsonb
language plpgsql
stable
as $$
declare
  policy text := resolve_cancellation_policy(p_policy);
  check_in_at timestamptz := check_in_instant(p_check_in);
  hours_until numeric;
  band text;
  refund_bps integer;
  refund_paise integer;
  kept_paise integer;
  commission_after integer;
begin
  if policy not in ('flexible', 'strict') then
    raise exception 'unknown policy';
  end if;
  hours_until := extract(epoch from (check_in_at - p_now)) / 3600.0;
  if policy = 'flexible' then
    if hours_until >= 24 then
      band := 'full';
    else
      band := 'none';
    end if;
  elsif policy = 'strict' then
    if hours_until >= 14 * 24 then
      band := 'half';
    else
      band := 'none';
    end if;
  end if;
  refund_bps := case band
    when 'full' then 10000
    when 'half' then 5000
    else 0
  end;
  refund_paise := round((p_total_paise::numeric * refund_bps) / 10000)::integer;
  kept_paise := p_total_paise - refund_paise;
  commission_after := round((kept_paise::numeric * 1000) / 10000)::integer;
  return jsonb_build_object(
    'policy', policy,
    'band', band,
    'refundPaise', refund_paise,
    'keptPaise', kept_paise,
    'commissionAfterPaise', commission_after,
    'hostNetAfterPaise', kept_paise - commission_after
  );
end;
$$;

create or replace function cancel_booking_result(
  p_booking bookings,
  p_quote jsonb,
  p_refund refunds,
  p_payout jsonb,
  p_already boolean
)
returns jsonb
language plpgsql
stable
as $$
begin
  return jsonb_build_object(
    'bookingId', p_booking.id,
    'status', 'canceled',
    'alreadyCanceled', p_already,
    'quote', p_quote,
    'refund', case
      when p_refund.id is null then null
      else jsonb_build_object(
        'id', p_refund.id,
        'bookingId', p_refund.booking_id,
        'amountPaise', p_refund.amount_paise,
        'status', p_refund.status,
        'actor', p_refund.actor,
        'policyApplied', p_refund.policy_applied,
        'razorpayRefundId', p_refund.razorpay_refund_id
      )
    end,
    'payout', p_payout
  );
end;
$$;

create or replace function cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id text := (select auth.jwt() ->> 'sub');
  actor text;
  booking_row bookings;
  home_row homes;
  payout_row payouts;
  payment_row payments;
  refund_row refunds;
  policy text;
  quote jsonb;
  refund_paise integer;
  host_net_after integer;
  payout_json jsonb;
begin
  if actor_id is null or actor_id = '' then
    raise exception 'forbidden';
  end if;

  select * into booking_row from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  if actor_id = booking_row.guest_id then
    actor := 'guest';
  elsif actor_id = booking_row.host_id then
    actor := 'host';
  else
    raise exception 'forbidden';
  end if;

  select * into home_row from homes where id = booking_row.home_id;
  policy := resolve_cancellation_policy(home_row.cancellation_policy);

  select * into payout_row from payouts where booking_id = booking_row.id for update;

  if booking_row.status = 'canceled' then
    select * into refund_row from refunds where booking_id = booking_row.id;
    if actor = 'host' then
      quote := quote_refund(policy, booking_row.canceled_at, booking_row.check_in, booking_row.total_paise);
      quote := jsonb_set(quote, '{band}', '"full"');
      quote := jsonb_set(quote, '{refundPaise}', to_jsonb(booking_row.total_paise));
      quote := jsonb_set(quote, '{keptPaise}', '0');
      quote := jsonb_set(quote, '{commissionAfterPaise}', '0');
      quote := jsonb_set(quote, '{hostNetAfterPaise}', '0');
    else
      quote := quote_refund(policy, booking_row.canceled_at, booking_row.check_in, booking_row.total_paise);
    end if;
    if payout_row.id is null then
      payout_json := jsonb_build_object('action', 'none');
    elsif payout_row.status = 'canceled' then
      payout_json := jsonb_build_object('action', 'canceled');
    elsif payout_row.amount_paise = (quote->>'hostNetAfterPaise')::integer then
      payout_json := jsonb_build_object('action', 'unchanged', 'amountPaise', payout_row.amount_paise);
    else
      payout_json := jsonb_build_object('action', 'amount_updated', 'amountPaise', payout_row.amount_paise);
    end if;
    return cancel_booking_result(booking_row, quote, refund_row, payout_json, true);
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'not_confirmed';
  end if;

  if actor = 'guest' and now() >= check_in_instant(booking_row.check_in) then
    raise exception 'window_closed';
  end if;

  if payout_row.status = 'paid'
    or (payout_row.status = 'processing' and payout_row.razorpayx_payout_id is not null)
  then
    raise exception 'payout_in_flight';
  end if;

  if actor = 'host' then
    quote := quote_refund(policy, now(), booking_row.check_in, booking_row.total_paise);
    quote := jsonb_set(quote, '{band}', '"full"');
    quote := jsonb_set(quote, '{refundPaise}', to_jsonb(booking_row.total_paise));
    quote := jsonb_set(quote, '{keptPaise}', '0');
    quote := jsonb_set(quote, '{commissionAfterPaise}', '0');
    quote := jsonb_set(quote, '{hostNetAfterPaise}', '0');
  else
    quote := quote_refund(policy, now(), booking_row.check_in, booking_row.total_paise);
  end if;

  refund_paise := (quote->>'refundPaise')::integer;
  host_net_after := (quote->>'hostNetAfterPaise')::integer;

  if refund_paise > 0 then
    select * into payment_row
    from payments
    where booking_id = booking_row.id and status = 'captured'
    order by created_at desc
    limit 1;
    if not found then
      raise exception 'no_payment';
    end if;
  end if;

  update bookings
  set
    status = 'canceled',
    canceled_at = now(),
    canceled_by = actor
  where id = booking_row.id
  returning * into booking_row;

  if payout_row.id is null then
    payout_json := jsonb_build_object('action', 'none');
  elsif host_net_after = 0 then
    update payouts
    set status = 'canceled', hold_reason = null, updated_at = now()
    where id = payout_row.id
      and status in ('scheduled', 'on_hold', 'failed', 'processing')
      and razorpayx_payout_id is null;
    payout_json := jsonb_build_object('action', 'canceled');
  elsif payout_row.amount_paise = host_net_after then
    payout_json := jsonb_build_object('action', 'unchanged', 'amountPaise', payout_row.amount_paise);
  else
    update payouts
    set amount_paise = host_net_after, updated_at = now()
    where id = payout_row.id
      and status in ('scheduled', 'on_hold', 'failed', 'processing')
      and razorpayx_payout_id is null;
    payout_json := jsonb_build_object('action', 'amount_updated', 'amountPaise', host_net_after);
  end if;

  if refund_paise > 0 then
    insert into refunds (
      booking_id,
      payment_id,
      razorpay_payment_id,
      amount_paise,
      status,
      actor,
      policy_applied
    )
    values (
      booking_row.id,
      payment_row.id,
      payment_row.razorpay_payment_id,
      refund_paise,
      'requested',
      actor,
      case when actor = 'host' then 'host_full' else policy end
    )
    returning * into refund_row;
  end if;

  return cancel_booking_result(booking_row, quote, refund_row, payout_json, false);
end;
$$;

create or replace function claim_pending_refunds(p_limit integer default 25)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  take integer := greatest(coalesce(p_limit, 25), 1);
  stale_ids uuid[] := '{}';
  claimed_ids uuid[] := '{}';
begin
  select coalesce(array_agg(stale.id), '{}')
  into stale_ids
  from (
    select r.id
    from refunds r
    where r.status = 'processing'
      and r.razorpay_refund_id is null
      and r.updated_at <= now() - interval '10 minutes'
    order by r.created_at
    limit take
    for update of r skip locked
  ) stale;

  select coalesce(array_agg(due.id), '{}')
  into claimed_ids
  from (
    select r.id
    from refunds r
    where r.status = 'requested'
    order by r.created_at
    limit greatest(take - cardinality(stale_ids), 0)
    for update of r skip locked
  ) due;

  update refunds
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    updated_at = now()
  where id = any (stale_ids || claimed_ids);

  return query
  select jsonb_build_object(
    'id', r.id,
    'booking_id', r.booking_id,
    'razorpay_payment_id', r.razorpay_payment_id,
    'amount_paise', r.amount_paise,
    'receipt', r.id::text
  )
  from refunds r
  where r.id = any (stale_ids || claimed_ids)
  order by r.created_at;
end;
$$;

create or replace function record_refund_submitted(p_refund_id uuid, p_razorpay_refund_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update refunds
  set
    razorpay_refund_id = p_razorpay_refund_id,
    updated_at = now()
  where id = p_refund_id
    and status = 'processing'
    and (razorpay_refund_id is null or razorpay_refund_id = p_razorpay_refund_id);
  if not found then
    raise exception 'refund not submitted';
  end if;
end;
$$;

create or replace function process_razorpay_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_order_id text default null,
  p_payment_id text default null,
  p_amount_paise integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  refund_ext_id text;
  refund_payment_id text;
  refund_amount integer;
  payload_reason text;
begin
  begin
    insert into razorpay_events (id, event_type, payload)
    values (p_event_id, p_event_type, p_payload);
  exception
    when unique_violation then
      return 'duplicate';
  end;

  if p_event_type = 'payment.captured' then
    begin
      perform confirm_booking(
        p_order_id,
        p_payment_id,
        p_amount_paise
      );
    exception
      when raise_exception then
        if sqlerrm = 'amount mismatch' then
          return 'amount_mismatch';
        end if;
        raise;
    end;
  elsif p_event_type = 'payment.failed' then
    perform fail_booking(p_order_id);
  elsif p_event_type in ('refund.processed', 'refund.failed') then
    refund_ext_id := coalesce(
      p_payload #>> '{payload,refund,entity,id}',
      p_payload #>> '{refund,entity,id}'
    );
    refund_payment_id := coalesce(
      p_payload #>> '{payload,refund,entity,payment_id}',
      p_payload #>> '{refund,entity,payment_id}',
      p_payment_id
    );
    refund_amount := coalesce(
      (p_payload #>> '{payload,refund,entity,amount}')::integer,
      (p_payload #>> '{refund,entity,amount}')::integer,
      p_amount_paise
    );
    payload_reason := nullif(
      coalesce(
        p_payload #>> '{payload,refund,entity,status}',
        p_payload #>> '{refund,entity,status}',
        p_event_type
      ),
      ''
    );

    if p_event_type = 'refund.processed' then
      update refunds
      set
        status = 'processed',
        failure_reason = null,
        razorpay_refund_id = coalesce(razorpay_refund_id, refund_ext_id),
        updated_at = now()
      where (
        (refund_ext_id is not null and razorpay_refund_id = refund_ext_id and status = 'processing')
        or (
          razorpay_refund_id is null
          and refund_payment_id is not null
          and refund_amount is not null
          and razorpay_payment_id = refund_payment_id
          and amount_paise = refund_amount
          and status in ('requested', 'processing')
        )
      );
    else
      update refunds
      set
        status = 'failed',
        failure_reason = payload_reason,
        razorpay_refund_id = coalesce(razorpay_refund_id, refund_ext_id),
        updated_at = now()
      where (
        (refund_ext_id is not null and razorpay_refund_id = refund_ext_id and status in ('requested', 'processing'))
        or (
          razorpay_refund_id is null
          and refund_payment_id is not null
          and refund_amount is not null
          and razorpay_payment_id = refund_payment_id
          and amount_paise = refund_amount
          and status in ('requested', 'processing')
        )
      );
    end if;
  end if;

  return 'processed';
end;
$$;

create or replace function claim_due_payouts(p_limit integer default 25)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  take integer := greatest(coalesce(p_limit, 25), 1);
  stale_ids uuid[] := '{}';
  claimed_ids uuid[] := '{}';
begin
  select coalesce(array_agg(stale.id), '{}')
  into stale_ids
  from (
    select p.id
    from payouts p
    join bookings b on b.id = p.booking_id
    where b.status in ('confirmed', 'canceled')
      and p.status = 'processing'
      and p.razorpayx_payout_id is null
      and p.updated_at <= now() - interval '10 minutes'
      and exists (
        select 1 from host_payout_accounts a where a.host_id = p.host_id
      )
    order by p.eligible_at
    limit take
    for update of p skip locked
  ) stale;

  update payouts p
  set
    status = 'on_hold',
    hold_reason = case when p.host_id is null then 'no_host' else 'no_destination' end,
    updated_at = now()
  where p.id in (
    select p2.id
    from payouts p2
    join bookings b on b.id = p2.booking_id
    where b.status in ('confirmed', 'canceled')
      and p2.status = 'scheduled'
      and p2.eligible_at <= now()
      and (
        p2.host_id is null
        or not exists (
          select 1 from host_payout_accounts a where a.host_id = p2.host_id
        )
      )
    for update of p2 skip locked
  );

  select coalesce(array_agg(due.id), '{}')
  into claimed_ids
  from (
    select p.id
    from payouts p
    join bookings b on b.id = p.booking_id
    where b.status in ('confirmed', 'canceled')
      and p.status = 'scheduled'
      and p.eligible_at <= now()
      and p.host_id is not null
      and exists (
        select 1 from host_payout_accounts a where a.host_id = p.host_id
      )
    order by p.eligible_at
    limit greatest(take - cardinality(stale_ids), 0)
    for update of p skip locked
  ) due;

  update payouts
  set
    status = 'processing',
    hold_reason = null,
    attempt_count = attempt_count + 1,
    updated_at = now()
  where id = any (stale_ids || claimed_ids);

  return query
  select jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'amount_paise', p.amount_paise,
    'fund_account_id', a.razorpayx_fund_account_id,
    'method', a.method
  )
  from payouts p
  join host_payout_accounts a on a.host_id = p.host_id
  where p.id = any (stale_ids || claimed_ids)
  order by p.eligible_at;
end;
$$;

create or replace function list_host_earnings()
returns table (
  booking_id uuid,
  home_name text,
  check_in date,
  check_out date,
  nights integer,
  subtotal_paise integer,
  commission_paise integer,
  host_net_paise integer,
  payout_status text,
  eligible_at timestamptz,
  paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    h.name,
    b.check_in,
    b.check_out,
    b.nights,
    b.subtotal_paise,
    b.commission_paise,
    p.amount_paise,
    p.status,
    p.eligible_at,
    case when p.status = 'paid' then p.updated_at end
  from bookings b
  join payouts p on p.booking_id = b.id
  join homes h on h.id = b.home_id
  where b.host_id = (select auth.jwt() ->> 'sub')
  order by b.check_in desc, b.created_at desc;
$$;

revoke all on function check_in_instant(date) from public;
revoke all on function resolve_cancellation_policy(text) from public;
revoke all on function quote_refund(text, timestamptz, date, integer) from public;
revoke all on function cancel_booking_result(bookings, jsonb, refunds, jsonb, boolean) from public, anon, authenticated;
revoke all on function cancel_booking(uuid) from public, anon;
revoke all on function claim_pending_refunds(integer) from public, anon, authenticated;
revoke all on function record_refund_submitted(uuid, text) from public, anon, authenticated;
revoke all on function process_razorpay_event(text, text, jsonb, text, text, integer)
  from public, anon, authenticated;

grant execute on function check_in_instant(date) to anon, authenticated, service_role;
grant execute on function resolve_cancellation_policy(text) to anon, authenticated, service_role;
grant execute on function quote_refund(text, timestamptz, date, integer) to authenticated, service_role;
grant execute on function cancel_booking(uuid) to authenticated, service_role;
grant execute on function claim_pending_refunds(integer) to service_role;
grant execute on function record_refund_submitted(uuid, text) to service_role;
grant execute on function process_razorpay_event(text, text, jsonb, text, text, integer) to service_role;
