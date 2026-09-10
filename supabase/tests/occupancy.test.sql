begin;
select plan(31);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, host_id
) values (
  '22222222-2222-4222-8222-222222222222',
  'ledger-test-home',
  'Ledger Test Home',
  'Home',
  'Stowe',
  'VT',
  'USA',
  3,
  3,
  6,
  5030000,
  5,
  1,
  0,
  '{}',
  'An occupancy ledger fixture home with a description long enough for a published row.',
  'host_h'
);

insert into home_photos (home_id, src, alt)
values ('22222222-2222-4222-8222-222222222222', 'https://example.com/ledger.jpg', 'Ledger home');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"guest_a","role":"authenticated"}', true);

select throws_ok(
  'select count(*) from occupancy',
  '42501',
  null,
  'occupancy is unreachable except through the RPCs'
);

select lives_ok(
  $$
    select create_pending_booking(
      '22222222-2222-4222-8222-222222222222', '2026-12-01', '2026-12-04', 2, 'order_ledger_a'
    );
  $$,
  'guest checkout takes the nights'
);

reset role;

select is(
  (
    select count(*)::integer
    from bookings b
    join occupancy o on o.id = b.occupancy_id
    where b.razorpay_order_id = 'order_ledger_a'
      and o.source = 'airren'
      and o.nights = daterange('2026-12-01', '2026-12-04', '[)')
  ),
  1,
  'a pending booking points at an airren ledger row with the same nights'
);

select throws_ok(
  $$
    insert into bookings (
      home_id, guest_id, check_in, check_out, guests, nights,
      subtotal_paise, service_fee_paise, cleaning_fee_paise, total_paise, status
    ) values (
      '22222222-2222-4222-8222-222222222222', 'guest_x', '2027-01-01', '2027-01-04',
      2, 3, 1, 0, 0, 1, 'pending_payment'
    );
  $$,
  '23514',
  null,
  'a live booking without a ledger row is unrepresentable'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select throws_ok(
  $$
    select record_host_occupancy(
      '22222222-2222-4222-8222-222222222222', '2026-12-02', '2026-12-05'
    );
  $$,
  '23P01',
  null,
  'host racing a guest hold on the same nights loses'
);

select lives_ok(
  $$
    select record_host_occupancy(
      '22222222-2222-4222-8222-222222222222', '2026-12-10', '2026-12-13', 'Booked on Airbnb'
    );
  $$,
  'host records an external stay without a razorpay order'
);

select lives_ok(
  $$
    select record_host_occupancy(
      '22222222-2222-4222-8222-222222222222', '2026-12-04', '2026-12-07'
    );
  $$,
  'same-day turnover: a block may start on a checkout day'
);

select set_config('request.jwt.claims', '{"sub":"guest_b","role":"authenticated"}', true);

select throws_ok(
  $$
    select create_pending_booking(
      '22222222-2222-4222-8222-222222222222', '2026-12-12', '2026-12-15', 2, 'order_ledger_race'
    );
  $$,
  '23P01',
  null,
  'guest racing a host block on the same nights loses'
);

reset role;

select is(
  (
    select count(*)::integer
    from bookings b
    join occupancy o on o.id = b.occupancy_id
    where o.source = 'host'
  ),
  0,
  'host blocks never carry a booking or an order'
);

select is(
  (
    select count(*)::integer
    from busy_stays('2026-12-01', '2027-01-01', '22222222-2222-4222-8222-222222222222')
  ),
  3,
  'busy_stays returns the hold and both host blocks for the home'
);

select lives_ok(
  $$select count(*) from busy_stays(p_from => '2026-12-01', p_to => '2027-01-01')$$,
  'the two-named-argument busy_stays call still resolves'
);

update occupancy set hold_expires_at = now() - interval '1 minute'
where nights = daterange('2026-12-01', '2026-12-04', '[)')
  and home_id = '22222222-2222-4222-8222-222222222222';
update bookings set expires_at = now() - interval '1 minute'
where razorpay_order_id = 'order_ledger_a';

select is(
  (
    select count(*)::integer
    from busy_stays('2026-12-01', '2027-01-01', '22222222-2222-4222-8222-222222222222')
    where check_in = '2026-12-01'
  ),
  0,
  'a dead 15-minute hold does not hide the home'
);

select throws_ok(
  $$select confirm_booking('order_ledger_a', 'pay_late', 17044500)$$,
  'P0001',
  'booking hold expired',
  'confirm refuses a hold whose expiry has passed'
);

select is(
  release_expired_holds(),
  1,
  'release_expired_holds frees the dead hold'
);

select is(
  (select status from bookings where razorpay_order_id = 'order_ledger_a'),
  'expired',
  'the expired booking left the live statuses'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select lives_ok(
  $$
    select record_host_occupancy(
      '22222222-2222-4222-8222-222222222222', '2026-12-01', '2026-12-04'
    );
  $$,
  'expiry frees the nights for the next writer'
);

select set_config('request.jwt.claims', '{"sub":"guest_a","role":"authenticated"}', true);

select lives_ok(
  $$
    select create_pending_booking(
      '22222222-2222-4222-8222-222222222222', '2026-12-20', '2026-12-23', 2, 'order_ledger_c'
    );
  $$,
  'guest holds fresh nights for confirmation'
);

reset role;

select is(
  (select status from confirm_booking('order_ledger_c', 'pay_ledger_c', 17044500)),
  'confirmed',
  'webhook confirm still lands on the rewritten RPC'
);

select ok(
  (
    select o.hold_expires_at is null
    from occupancy o
    join bookings b on b.occupancy_id = o.id
    where b.razorpay_order_id = 'order_ledger_c'
  ),
  'a confirmed stay never expires'
);

select set_config(
  'test.airren_occ',
  (select occupancy_id::text from bookings where razorpay_order_id = 'order_ledger_c'),
  true
);
select set_config(
  'test.host_occ',
  (
    select id::text from occupancy
    where home_id = '22222222-2222-4222-8222-222222222222'
      and nights = daterange('2026-12-10', '2026-12-13', '[)')
  ),
  true
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select throws_ok(
  format('select release_host_occupancy(%L::uuid)', current_setting('test.airren_occ')),
  '42501',
  null,
  'host cannot delete an airren stay'
);

select throws_ok(
  format(
    'select reschedule_host_occupancy(%L::uuid, ''2026-12-19'', ''2026-12-24'')',
    current_setting('test.airren_occ')
  ),
  '42501',
  null,
  'host cannot resize an airren stay'
);

select lives_ok(
  format(
    'select reschedule_host_occupancy(%L::uuid, ''2026-12-10'', ''2026-12-12'')',
    current_setting('test.host_occ')
  ),
  'host shrinks a block'
);

select throws_ok(
  format(
    'select reschedule_host_occupancy(%L::uuid, ''2026-12-10'', ''2026-12-21'')',
    current_setting('test.host_occ')
  ),
  '23P01',
  null,
  'growing a block into sold nights loses'
);

select set_config('request.jwt.claims', '{"sub":"host_z","role":"authenticated"}', true);

select throws_ok(
  format('select release_host_occupancy(%L::uuid)', current_setting('test.host_occ')),
  'P0001',
  'listing not found',
  'another host cannot release the block'
);

select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select lives_ok(
  $$select unlist_listing('22222222-2222-4222-8222-222222222222')$$,
  'host unlists the home'
);

select lives_ok(
  $$select publish_listing('22222222-2222-4222-8222-222222222222')$$,
  'host republishes the home'
);

reset role;

select is(
  (
    select count(*)::integer
    from occupancy
    where home_id = '22222222-2222-4222-8222-222222222222' and source = 'host'
  ),
  3,
  'unlist and republish keep host blocks occupied'
);

select throws_ok(
  format(
    $sql$
      insert into bookings (
        home_id, guest_id, check_in, check_out, guests, nights,
        subtotal_paise, service_fee_paise, cleaning_fee_paise, total_paise, status, occupancy_id
      ) values (
        '22222222-2222-4222-8222-222222222222', 'guest_x', '2026-12-10', '2026-12-11',
        2, 1, 1, 0, 0, 1, 'pending_payment', %L::uuid
      );
    $sql$,
    current_setting('test.host_occ')
  ),
  'P0001',
  'booking dates must match the occupancy ledger',
  'a booking cannot point at a ledger row with different nights'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"guest_b","role":"authenticated"}', true);

select lives_ok(
  $$
    select create_pending_booking(
      '22222222-2222-4222-8222-222222222222', '2026-12-27', '2026-12-30', 2, 'order_ledger_f'
    );
  $$,
  'guest holds nights that a failed payment will free'
);

reset role;

select is(
  (select status from fail_booking('order_ledger_f')),
  'failed',
  'fail_booking marks the pending booking failed'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where home_id = '22222222-2222-4222-8222-222222222222'
      and nights = daterange('2026-12-27', '2026-12-30', '[)')
  ),
  0,
  'fail_booking frees the ledger row'
);

select * from finish();
rollback;
