create extension if not exists btree_gist;

create table homes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null,
  city text not null,
  region text not null,
  country text not null,
  beds integer not null,
  baths integer not null,
  guests integer not null,
  nightly_rate_paise integer not null,
  rating numeric(2, 1) not null,
  review_count integer not null,
  savings_paise integer not null,
  badges text[] not null default '{}',
  description text not null,
  sort_order integer not null default 0
);

create table home_photos (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id) on delete cascade,
  src text not null,
  alt text not null,
  sort_order integer not null default 0
);

create table home_amenities (
  home_id uuid not null references homes (id) on delete cascade,
  amenity text not null,
  primary key (home_id, amenity)
);

create table home_categories (
  home_id uuid not null references homes (id) on delete cascade,
  category_id text not null,
  primary key (home_id, category_id)
);

create table listing_applications (
  id uuid primary key default gen_random_uuid(),
  listing_url text not null,
  guest_id text,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references homes (id),
  guest_id text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null,
  nights integer not null,
  subtotal_paise integer not null,
  service_fee_paise integer not null,
  cleaning_fee_paise integer not null,
  total_paise integer not null,
  razorpay_order_id text unique,
  expires_at timestamptz,
  status text not null check (status in ('pending_payment', 'confirmed', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  constraint bookings_dates_ordered check (check_out > check_in)
);

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    home_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id),
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount_paise integer not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table razorpay_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index bookings_guest_id_idx on bookings (guest_id);
create index home_photos_home_id_idx on home_photos (home_id);
create index home_categories_category_id_idx on home_categories (category_id);

alter table homes enable row level security;
alter table home_photos enable row level security;
alter table home_amenities enable row level security;
alter table home_categories enable row level security;
alter table listing_applications enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table razorpay_events enable row level security;

create policy "homes are public"
  on homes for select
  to anon, authenticated
  using (true);

create policy "home photos are public"
  on home_photos for select
  to anon, authenticated
  using (true);

create policy "home amenities are public"
  on home_amenities for select
  to anon, authenticated
  using (true);

create policy "home categories are public"
  on home_categories for select
  to anon, authenticated
  using (true);

create policy "anyone can apply to list"
  on listing_applications for insert
  to anon, authenticated
  with check (true);

create policy "guests read their applications"
  on listing_applications for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = guest_id);

create policy "guests read their bookings"
  on bookings for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = guest_id);

create policy "guests insert their bookings"
  on bookings for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = guest_id);

create policy "guests read their payments"
  on payments for select
  to authenticated
  using (
    exists (
      select 1
      from bookings
      where bookings.id = payments.booking_id
        and bookings.guest_id = (select auth.jwt() ->> 'sub')
    )
  );

create or replace function quote_stay(nightly_paise integer, p_nights integer)
returns table (
  nights integer,
  subtotal_paise integer,
  service_fee_paise integer,
  cleaning_fee_paise integer,
  total_paise integer
)
language plpgsql
stable
as $$
declare
  cleaning constant integer := 1200000;
  service integer;
  subtotal integer;
begin
  if p_nights <= 0 then
    return query select 0, 0, 0, 0, 0;
    return;
  end if;
  subtotal := nightly_paise * p_nights;
  service := round((subtotal::numeric * 500) / 10000);
  return query select p_nights, subtotal, service, cleaning, subtotal + service + cleaning;
end;
$$;

create or replace function expire_pending_bookings()
returns void
language sql
security definer
set search_path = public
as $$
  update bookings
  set status = 'expired'
  where status = 'pending_payment'
    and expires_at is not null
    and expires_at < now();
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
security invoker
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
  select * into home_row from homes where id = p_home_id;
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
    status
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
begin
  update bookings
  set status = 'failed'
  where razorpay_order_id = p_order_id
    and status = 'pending_payment'
  returning * into booking_row;
  if not found then
    select * into booking_row from bookings where razorpay_order_id = p_order_id;
  end if;
  return booking_row;
end;
$$;

revoke all on function confirm_booking(text, text, integer) from public, anon, authenticated;
revoke all on function fail_booking(text) from public, anon, authenticated;
revoke all on function expire_pending_bookings() from public;
grant execute on function confirm_booking(text, text, integer) to service_role;
grant execute on function fail_booking(text) to service_role;
grant execute on function expire_pending_bookings() to service_role, authenticated;
grant execute on function create_pending_booking(uuid, date, date, integer, text) to authenticated;
grant execute on function quote_stay(integer, integer) to anon, authenticated;
