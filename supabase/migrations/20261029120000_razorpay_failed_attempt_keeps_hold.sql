-- A failed Razorpay attempt is not the end of the order. UPI and cards can fail once
-- and then capture on the same order. Failing the booking here drops that capture.
-- A capture after the hold expired still confirms when the dates are free.
-- A canceled stay stays canceled.

create or replace function confirm_booking(
  p_order_id text,
  p_payment_id text,
  p_amount_paise integer
)
returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row bookings;
begin
  select * into booking_row
  from bookings
  where razorpay_order_id = p_order_id
  for update;
  if not found then
    raise exception 'booking not found';
  end if;
  if booking_row.status = 'confirmed' then
    return booking_row;
  end if;
  if booking_row.status not in ('pending_payment', 'failed', 'expired') then
    raise exception 'booking is not pending';
  end if;
  if booking_row.total_paise <> p_amount_paise then
    raise exception 'amount mismatch';
  end if;
  update bookings
  set status = 'confirmed'
  where id = booking_row.id
  returning * into booking_row;
  insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
  values (booking_row.id, p_order_id, p_payment_id, p_amount_paise, 'captured');
  if booking_row.host_net_paise > 0 then
    insert into payouts (
      booking_id,
      host_id,
      amount_paise,
      status,
      hold_reason,
      eligible_at
    )
    values (
      booking_row.id,
      booking_row.host_id,
      booking_row.host_net_paise,
      case when booking_row.host_id is null then 'on_hold' else 'scheduled' end,
      case when booking_row.host_id is null then 'no_host' end,
      ((booking_row.check_in + 1)::timestamp at time zone 'Asia/Kolkata' + interval '14 hours')
    )
    on conflict (booking_id) do nothing;
  end if;
  return booking_row;
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
      when exclusion_violation then
        return 'conflict';
      when raise_exception then
        if sqlerrm = 'amount mismatch' then
          return 'amount_mismatch';
        elsif sqlerrm = 'booking is not pending' then
          return 'not_pending';
        elsif sqlerrm = 'booking not found' then
          return 'booking_not_found';
        end if;
        raise;
    end;
  elsif p_event_type = 'payment.failed' then
    insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
    select
      b.id,
      b.razorpay_order_id,
      nullif(p_payment_id, ''),
      coalesce(p_amount_paise, b.total_paise),
      'failed'
    from bookings b
    where b.razorpay_order_id = p_order_id
      and b.status = 'pending_payment'
      and not exists (
        select 1
        from payments existing
        where existing.booking_id = b.id
          and existing.status = 'failed'
          and existing.razorpay_payment_id is not distinct from nullif(p_payment_id, '')
      );
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

      if refund_payment_id is not null and refund_amount is not null then
        update payments
        set status = 'refunded'
        where razorpay_payment_id = refund_payment_id
          and amount_paise = refund_amount
          and status = 'captured';
      end if;
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
