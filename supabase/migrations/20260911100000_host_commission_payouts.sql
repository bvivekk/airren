alter table bookings
  add column commission_paise integer not null default 0 check (commission_paise >= 0),
  add column host_net_paise integer not null default 0 check (host_net_paise >= 0),
  add column host_id text;

update bookings
set
  commission_paise = round((subtotal_paise::numeric * 1000) / 10000),
  host_net_paise = subtotal_paise - round((subtotal_paise::numeric * 1000) / 10000);

update bookings b
set host_id = h.host_id
from homes h
where h.id = b.home_id;

alter table bookings
  drop column service_fee_paise,
  drop column cleaning_fee_paise,
  add constraint bookings_money_balances check (commission_paise + host_net_paise = subtotal_paise);

create index bookings_host_id_idx on bookings (host_id) where host_id is not null;

create table host_payout_accounts (
  host_id text primary key,
  method text not null check (method in ('bank_account', 'vpa')),
  label text not null,
  razorpayx_contact_id text not null,
  razorpayx_fund_account_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id),
  host_id text,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'on_hold', 'processing', 'paid', 'failed', 'canceled')),
  hold_reason text check ((status = 'on_hold') = (hold_reason is not null)),
  eligible_at timestamptz not null,
  razorpayx_payout_id text unique,
  failure_reason text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payouts_due_idx on payouts (eligible_at) where status = 'scheduled';
create index payouts_stale_processing_idx
  on payouts (updated_at)
  where status = 'processing' and razorpayx_payout_id is null;

create table razorpayx_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  received_at timestamptz not null default now()
);

alter table host_payout_accounts enable row level security;
alter table payouts enable row level security;
alter table razorpayx_events enable row level security;

create policy "hosts read own payout account"
  on host_payout_accounts for select
  to authenticated
  using (host_id = (select auth.jwt() ->> 'sub'));

revoke all on table host_payout_accounts from anon, authenticated;
revoke all on table payouts from anon, authenticated;
revoke all on table razorpayx_events from anon, authenticated;

grant select (host_id, method, label, created_at, updated_at)
  on table host_payout_accounts to authenticated;

drop function if exists quote_stay(integer, integer);

create or replace function quote_stay(nightly_paise integer, p_nights integer)
returns table (
  nights integer,
  subtotal_paise integer,
  commission_paise integer,
  host_net_paise integer,
  total_paise integer
)
language plpgsql
stable
as $$
declare
  subtotal integer;
  commission integer;
begin
  if p_nights <= 0 then
    return query select 0, 0, 0, 0, 0;
    return;
  end if;
  subtotal := nightly_paise * p_nights;
  commission := round((subtotal::numeric * 1000) / 10000);
  return query select p_nights, subtotal, commission, subtotal - commission, subtotal;
end;
$$;

create or replace function create_pending_booking(
  p_home_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_razorpay_order_id text
)
returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  guest text := (select auth.jwt() ->> 'sub');
  home_row homes%rowtype;
  quote record;
  inserted bookings;
  night_count integer;
begin
  if guest is null or guest = '' then
    raise exception 'signed in guest required';
  end if;
  perform expire_pending_bookings();
  select * into home_row from homes where id = p_home_id and status = 'published';
  if not found then
    raise exception 'home not found';
  end if;
  if p_guests < 1 or p_guests > home_row.guests then
    raise exception 'guest count not allowed';
  end if;
  night_count := p_check_out - p_check_in;
  if night_count <= 0 then
    raise exception 'check-out must be after check-in';
  end if;
  select * into quote from quote_stay(home_row.nightly_rate_paise, night_count);
  insert into bookings (
    home_id,
    guest_id,
    host_id,
    check_in,
    check_out,
    guests,
    nights,
    subtotal_paise,
    commission_paise,
    host_net_paise,
    total_paise,
    razorpay_order_id,
    expires_at,
    status
  )
  values (
    p_home_id,
    guest,
    home_row.host_id,
    p_check_in,
    p_check_out,
    p_guests,
    quote.nights,
    quote.subtotal_paise,
    quote.commission_paise,
    quote.host_net_paise,
    quote.total_paise,
    p_razorpay_order_id,
    now() + interval '15 minutes',
    'pending_payment'
  )
  returning * into inserted;
  return inserted;
end;
$$;

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
  if booking_row.status <> 'pending_payment' then
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
      -- check-in date as midnight IST, then +38h = 14:00 IST the next day
      (booking_row.check_in::timestamp at time zone 'Asia/Kolkata' + interval '38 hours')
    )
    on conflict (booking_id) do nothing;
  end if;
  return booking_row;
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
    where p.status = 'processing'
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
    where p2.status = 'scheduled'
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
    where p.status = 'scheduled'
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

create or replace function record_payout_initiated(p_payout_id uuid, p_razorpayx_payout_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payouts
  set
    razorpayx_payout_id = p_razorpayx_payout_id,
    updated_at = now()
  where id = p_payout_id
    and status = 'processing'
    and (razorpayx_payout_id is null or razorpayx_payout_id = p_razorpayx_payout_id);
  if not found then
    raise exception 'payout not initiated';
  end if;
end;
$$;

create or replace function process_razorpayx_event(p_event_id text, p_event_type text, p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  event_status text;
  payout_ext_id text;
  payload_reason text;
begin
  begin
    insert into razorpayx_events (id, event_type, payload, status)
    values (p_event_id, p_event_type, p_payload, 'received');
  exception
    when unique_violation then
      select status into event_status from razorpayx_events where id = p_event_id;
      if event_status = 'processed' then
        return 'duplicate';
      end if;
  end;

  payout_ext_id := coalesce(
    p_payload #>> '{payload,payout,entity,id}',
    p_payload #>> '{payout,entity,id}',
    p_payload ->> 'payout_id'
  );
  payload_reason := nullif(
    coalesce(
      p_payload #>> '{payload,payout,entity,failure_reason}',
      p_payload #>> '{payout,entity,failure_reason}'
    ),
    ''
  );

  begin
    if p_event_type = 'payout.processed' then
      update payouts
      set
        status = 'paid',
        failure_reason = null,
        updated_at = now()
      where razorpayx_payout_id = payout_ext_id
        and status = 'processing';
    elsif p_event_type in ('payout.failed', 'payout.rejected', 'payout.reversed') then
      update payouts
      set
        status = 'failed',
        failure_reason = case
          when p_event_type = 'payout.reversed' then 'reversed'
          else coalesce(payload_reason, p_event_type)
        end,
        updated_at = now()
      where razorpayx_payout_id = payout_ext_id
        and status in ('processing', 'paid');
    end if;

    update razorpayx_events
    set status = 'processed'
    where id = p_event_id;

    if p_event_type in ('payout.processed', 'payout.failed', 'payout.rejected', 'payout.reversed') then
      return 'ok';
    end if;
    return 'ignored';
  exception
    when others then
      update razorpayx_events
      set status = 'failed'
      where id = p_event_id;
      return 'failed';
  end;
end;
$$;

create or replace function release_no_destination_holds(p_host_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released integer;
begin
  update payouts
  set
    status = 'scheduled',
    hold_reason = null,
    updated_at = now()
  where host_id = p_host_id
    and status = 'on_hold'
    and hold_reason = 'no_destination';
  get diagnostics released = row_count;
  return released;
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
    b.host_net_paise,
    p.status,
    p.eligible_at,
    case when p.status = 'paid' then p.updated_at end
  from bookings b
  join payouts p on p.booking_id = b.id
  join homes h on h.id = b.home_id
  where b.host_id = (select auth.jwt() ->> 'sub')
    and b.status = 'confirmed'
  order by b.check_in desc, b.created_at desc;
$$;

revoke all on function quote_stay(integer, integer) from public;
revoke all on function create_pending_booking(uuid, date, date, integer, text) from public, anon;
revoke all on function confirm_booking(text, text, integer) from public, anon, authenticated;
revoke all on function claim_due_payouts(integer) from public, anon, authenticated;
revoke all on function record_payout_initiated(uuid, text) from public, anon, authenticated;
revoke all on function process_razorpayx_event(text, text, jsonb) from public, anon, authenticated;
revoke all on function release_no_destination_holds(text) from public, anon, authenticated;
revoke all on function list_host_earnings() from public, anon;

grant execute on function quote_stay(integer, integer) to anon, authenticated, service_role;
grant execute on function create_pending_booking(uuid, date, date, integer, text) to authenticated, service_role;
grant execute on function confirm_booking(text, text, integer) to service_role;
grant execute on function claim_due_payouts(integer) to service_role;
grant execute on function record_payout_initiated(uuid, text) to service_role;
grant execute on function process_razorpayx_event(text, text, jsonb) to service_role;
grant execute on function release_no_destination_holds(text) to service_role;
grant execute on function list_host_earnings() to authenticated, service_role;
