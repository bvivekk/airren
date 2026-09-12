-- claim_due_payouts marks a payout processing before RazorpayX returns an id.
-- That window is already in flight. Cancel must not resize it.
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

  if payout_row.status in ('paid', 'processing') then
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
      and status in ('scheduled', 'on_hold', 'failed');
    payout_json := jsonb_build_object('action', 'canceled');
  elsif payout_row.amount_paise = host_net_after then
    payout_json := jsonb_build_object('action', 'unchanged', 'amountPaise', payout_row.amount_paise);
  else
    update payouts
    set amount_paise = host_net_after, updated_at = now()
    where id = payout_row.id
      and status in ('scheduled', 'on_hold', 'failed');
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

