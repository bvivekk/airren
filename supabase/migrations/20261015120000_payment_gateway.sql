-- Guest payments: clerk user, provider, currency, and timestamps.
-- Existing Razorpay order/payment columns stay so checkout, payouts, and refunds keep working.
-- A before-insert trigger fills the new columns when confirm_booking writes a Razorpay row.

alter table payments
  add column guest_id text,
  add column provider text not null default 'razorpay',
  add column provider_order_id text,
  add column provider_payment_id text,
  add column currency text not null default 'INR',
  add column updated_at timestamptz not null default now();

alter table payments
  add constraint payments_provider_known check (provider in ('razorpay', 'stripe')),
  add constraint payments_currency_code check (char_length(currency) = 3);

create or replace function payments_sync_gateway_row()
returns trigger
language plpgsql
as $$
begin
  if new.provider is null or new.provider = '' then
    new.provider := 'razorpay';
  end if;
  if new.currency is null or new.currency = '' then
    new.currency := 'INR';
  end if;
  if new.provider_order_id is null then
    new.provider_order_id := new.razorpay_order_id;
  end if;
  if new.provider_payment_id is null then
    new.provider_payment_id := new.razorpay_payment_id;
  end if;
  if new.guest_id is null then
    select guest_id into new.guest_id from bookings where id = new.booking_id;
  end if;
  if new.guest_id is null or new.provider_order_id is null then
    raise exception 'payment guest and order are required';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger payments_sync_gateway_row
  before insert or update on payments
  for each row execute function payments_sync_gateway_row();

update payments p
set
  guest_id = b.guest_id,
  provider_order_id = coalesce(p.provider_order_id, p.razorpay_order_id),
  provider_payment_id = coalesce(p.provider_payment_id, p.razorpay_payment_id)
from bookings b
where p.booking_id = b.id
  and (p.guest_id is null or p.provider_order_id is null);

alter table payments
  alter column guest_id set not null,
  alter column provider_order_id set not null;

create index payments_booking_id_idx on payments (booking_id);
create index payments_guest_id_idx on payments (guest_id);

create or replace function payment_visible_to_host(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from bookings
    where id = p_booking_id
      and host_id = (select auth.jwt() ->> 'sub')
  );
$$;

create policy "guests read payments by clerk id"
  on payments for select
  to authenticated
  using (guest_id = (select auth.jwt() ->> 'sub'));

create policy "hosts read payments for their bookings"
  on payments for select
  to authenticated
  using (payment_visible_to_host(booking_id));

revoke all on function payment_visible_to_host(uuid) from public, anon;
grant execute on function payment_visible_to_host(uuid) to authenticated, service_role;

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
        elsif sqlerrm = 'booking is not pending' then
          return 'not_pending';
        elsif sqlerrm = 'booking not found' then
          return 'booking_not_found';
        end if;
        raise;
    end;
  elsif p_event_type = 'payment.failed' then
    perform fail_booking(p_order_id);
    insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
    select
      b.id,
      b.razorpay_order_id,
      nullif(p_payment_id, ''),
      coalesce(p_amount_paise, b.total_paise),
      'failed'
    from bookings b
    where b.razorpay_order_id = p_order_id
      and b.status = 'failed'
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

revoke all on function process_razorpay_event(text, text, jsonb, text, text, integer)
  from public, anon, authenticated;
grant execute on function process_razorpay_event(text, text, jsonb, text, text, integer) to service_role;

create or replace function claim_guest_refund(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  refund_row refunds;
begin
  select *
  into refund_row
  from refunds
  where booking_id = p_booking_id
    and status = 'requested'
  limit 1
  for update;

  if not found then
    return null;
  end if;

  update refunds
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    updated_at = now()
  where id = refund_row.id;

  return jsonb_build_object(
    'id', refund_row.id,
    'booking_id', refund_row.booking_id,
    'razorpay_payment_id', refund_row.razorpay_payment_id,
    'amount_paise', refund_row.amount_paise,
    'receipt', refund_row.id::text
  );
end;
$$;

revoke all on function claim_guest_refund(uuid) from public, anon, authenticated;
grant execute on function claim_guest_refund(uuid) to service_role;
