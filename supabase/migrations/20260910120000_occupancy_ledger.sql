create type occupancy_source as enum ('airren', 'host');

create table public.occupancy (
  id              uuid primary key default gen_random_uuid(),
  home_id         uuid not null references homes (id) on delete cascade,
  nights          daterange not null,
  source          occupancy_source not null,
  label           text,
  external_ref    text,
  hold_expires_at timestamptz,
  created_by      text not null,
  created_at      timestamptz not null default now(),

  -- daterange is a discrete range: Postgres canonicalises every value to '[)', so
  -- half-open nights and legal same-day turnover are properties of the column type.
  constraint occupancy_nights_real check (
    not isempty(nights) and not lower_inf(nights) and not upper_inf(nights)
  ),
  constraint occupancy_holds_are_airren check (hold_expires_at is null or source = 'airren'),
  constraint occupancy_no_overlap exclude using gist (home_id with =, nights with &&)
);

create unique index occupancy_external_ref_key
  on occupancy (home_id, external_ref) where external_ref is not null;

alter table occupancy enable row level security;
revoke all on table occupancy from anon, authenticated;

-- on delete restrict so freeing nights must go through a function that also
-- transitions the booking; a bare DELETE on a live Airren stay fails.
alter table bookings
  add column occupancy_id uuid unique references occupancy (id) on delete restrict;

with ins as (
  insert into occupancy (home_id, nights, source, hold_expires_at, created_by, created_at)
  select b.home_id,
         daterange(b.check_in, b.check_out, '[)'),
         'airren',
         case when b.status = 'pending_payment' then b.expires_at end,
         b.guest_id,
         b.created_at
  from bookings b
  where b.status in ('pending_payment', 'confirmed')
  returning id, home_id, nights
)
update bookings b
set occupancy_id = ins.id
from ins
where b.home_id = ins.home_id
  and daterange(b.check_in, b.check_out, '[)') = ins.nights
  and b.status in ('pending_payment', 'confirmed');

do $$
declare
  missing integer;
begin
  select count(*) into missing
  from bookings
  where status in ('pending_payment', 'confirmed') and occupancy_id is null;
  if missing > 0 then
    raise exception 'occupancy backfill left % live bookings without a ledger row', missing;
  end if;
end;
$$;

alter table bookings
  add constraint bookings_occupy_iff_live check (
    (status in ('pending_payment', 'confirmed')) = (occupancy_id is not null)
  );

create or replace function assert_booking_dates_match_ledger()
returns trigger
language plpgsql
as $$
declare
  ledger_nights daterange;
begin
  if new.occupancy_id is null then
    return new;
  end if;
  select nights into ledger_nights from occupancy where id = new.occupancy_id;
  if ledger_nights is distinct from daterange(new.check_in, new.check_out, '[)') then
    raise exception 'booking dates must match the occupancy ledger';
  end if;
  return new;
end;
$$;

create trigger bookings_dates_match_ledger
  before insert or update of occupancy_id, check_in, check_out on bookings
  for each row execute function assert_booking_dates_match_ledger();

alter table bookings drop constraint bookings_no_overlap;

create or replace function release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed uuid[];
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into claimed
  from (
    select id
    from occupancy
    where source = 'airren'
      and hold_expires_at is not null
      and hold_expires_at < now()
    for update skip locked
  ) dead;

  update bookings
  set status = 'expired', occupancy_id = null
  where occupancy_id = any (claimed);

  delete from occupancy where id = any (claimed);

  return coalesce(array_length(claimed, 1), 0);
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
  occ_id uuid;
  hold_until timestamptz := now() + interval '15 minutes';
begin
  if guest is null or guest = '' then
    raise exception 'signed in guest required';
  end if;
  perform release_expired_holds();
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
  insert into occupancy (home_id, nights, source, hold_expires_at, created_by)
  values (p_home_id, daterange(p_check_in, p_check_out, '[)'), 'airren', hold_until, guest)
  returning id into occ_id;
  select * into quote from quote_stay(home_row.nightly_rate_paise, night_count);
  insert into bookings (
    home_id,
    guest_id,
    check_in,
    check_out,
    guests,
    nights,
    subtotal_paise,
    service_fee_paise,
    cleaning_fee_paise,
    total_paise,
    razorpay_order_id,
    expires_at,
    status,
    occupancy_id
  )
  values (
    p_home_id,
    guest,
    p_check_in,
    p_check_out,
    p_guests,
    quote.nights,
    quote.subtotal_paise,
    quote.service_fee_paise,
    quote.cleaning_fee_paise,
    quote.total_paise,
    p_razorpay_order_id,
    hold_until,
    'pending_payment',
    occ_id
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
  hold timestamptz;
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
  select hold_expires_at into hold
  from occupancy
  where id = booking_row.occupancy_id
  for update;
  if hold is not null and hold < now() then
    raise exception 'booking hold expired';
  end if;
  update occupancy set hold_expires_at = null where id = booking_row.occupancy_id;
  update bookings
  set status = 'confirmed'
  where id = booking_row.id
  returning * into booking_row;
  insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
  values (booking_row.id, p_order_id, p_payment_id, p_amount_paise, 'captured');
  return booking_row;
end;
$$;

create or replace function fail_booking(p_order_id text)
returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row bookings;
  freed uuid;
begin
  select occupancy_id into freed
  from bookings
  where razorpay_order_id = p_order_id and status = 'pending_payment'
  for update;
  if found then
    update bookings
    set status = 'failed', occupancy_id = null
    where razorpay_order_id = p_order_id and status = 'pending_payment'
    returning * into booking_row;
    delete from occupancy where id = freed;
  else
    select * into booking_row from bookings where razorpay_order_id = p_order_id;
  end if;
  return booking_row;
end;
$$;

create or replace function record_host_occupancy(
  p_listing_id uuid,
  p_check_in date,
  p_check_out date,
  p_label text default null,
  p_external_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  listing homes;
begin
  listing := listing_owned_for_update(p_listing_id);
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'check-out must be after check-in';
  end if;
  perform release_expired_holds();
  insert into occupancy (home_id, nights, source, label, external_ref, created_by)
  values (
    listing.id,
    daterange(p_check_in, p_check_out, '[)'),
    'host',
    nullif(btrim(p_label), ''),
    nullif(btrim(p_external_ref), ''),
    listing.host_id
  )
  on conflict (home_id, external_ref) where external_ref is not null
    do update set nights = excluded.nights, label = excluded.label;
  return listing_calendar(p_listing_id, current_date, current_date + 400);
end;
$$;

create or replace function release_host_occupancy(p_occupancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  occ occupancy;
begin
  select o.* into occ
  from occupancy o
  join homes h on h.id = o.home_id
  where o.id = p_occupancy_id and h.host_id = host
  for update of o;
  if not found then
    raise exception 'listing not found';
  end if;
  if occ.source = 'airren' then
    raise exception 'that stay was booked on Airren' using errcode = '42501';
  end if;
  delete from occupancy where id = occ.id;
  return listing_calendar(occ.home_id, current_date, current_date + 400);
end;
$$;

create or replace function reschedule_host_occupancy(
  p_occupancy_id uuid,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  occ occupancy;
begin
  select o.* into occ
  from occupancy o
  join homes h on h.id = o.home_id
  where o.id = p_occupancy_id and h.host_id = host
  for update of o;
  if not found then
    raise exception 'listing not found';
  end if;
  if occ.source = 'airren' then
    raise exception 'that stay was booked on Airren' using errcode = '42501';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'check-out must be after check-in';
  end if;
  update occupancy
  set nights = daterange(p_check_in, p_check_out, '[)')
  where id = occ.id;
  return listing_calendar(occ.home_id, current_date, current_date + 400);
end;
$$;

drop function busy_stays(date, date);

-- No status filter: every row in the ledger occupies. daterange never crosses the API.
create or replace function busy_stays(p_from date, p_to date, p_home_id uuid default null)
returns table (home_id uuid, check_in date, check_out date)
language sql
security definer
stable
set search_path = public
as $$
  select o.home_id, lower(o.nights), upper(o.nights)
  from occupancy o
  where o.nights && daterange(p_from, p_to, '[)')
    and (p_home_id is null or o.home_id = p_home_id)
    and (o.hold_expires_at is null or o.hold_expires_at >= now());
$$;

create or replace function listing_calendar(p_listing_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
begin
  if not exists (select 1 from homes h where h.id = p_listing_id and h.host_id = host) then
    raise exception 'listing not found';
  end if;
  return jsonb_build_object(
    'listingId', p_listing_id,
    'from', p_from,
    'to', p_to,
    'entries', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'checkIn', lower(o.nights),
            'checkOut', upper(o.nights),
            'source', o.source,
            'label', o.label,
            'removable', o.source = 'host'
          )
          order by lower(o.nights)
        )
        from occupancy o
        where o.home_id = p_listing_id
          and o.nights && daterange(p_from, p_to, '[)')
          and (o.hold_expires_at is null or o.hold_expires_at >= now())
      ),
      '[]'::jsonb
    )
  );
end;
$$;

drop function expire_pending_bookings();

revoke all on function release_expired_holds() from public, anon, authenticated;
grant execute on function release_expired_holds() to service_role;

revoke all on function
  record_host_occupancy(uuid, date, date, text, text),
  release_host_occupancy(uuid),
  reschedule_host_occupancy(uuid, date, date),
  listing_calendar(uuid, date, date)
  from public, anon;
grant execute on function
  record_host_occupancy(uuid, date, date, text, text),
  release_host_occupancy(uuid),
  reschedule_host_occupancy(uuid, date, date),
  listing_calendar(uuid, date, date)
  to authenticated;

revoke all on function busy_stays(date, date, uuid) from public;
grant execute on function busy_stays(date, date, uuid) to anon, authenticated;
