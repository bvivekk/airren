create or replace function busy_stays(p_from date, p_to date)
returns table (home_id uuid, check_in date, check_out date)
language sql
security definer
set search_path = public
stable
as $$
  select home_id, check_in, check_out
  from bookings
  where status in ('pending_payment', 'confirmed')
    and check_in < p_to
    and check_out > p_from;
$$;

revoke all on function busy_stays(date, date) from public;
grant execute on function busy_stays(date, date) to anon, authenticated;
