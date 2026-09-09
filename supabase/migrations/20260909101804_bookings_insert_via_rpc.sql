drop policy if exists "guests insert their bookings" on bookings;

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

revoke all on function create_pending_booking(uuid, date, date, integer, text) from public, anon;
grant execute on function create_pending_booking(uuid, date, date, integer, text) to authenticated, service_role;
