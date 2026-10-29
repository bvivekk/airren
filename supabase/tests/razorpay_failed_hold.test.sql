begin;
select plan(7);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description
) values (
  '33333333-3333-4333-8333-333333333333',
  'rpc-fail-hold-home',
  'RPC Fail Hold Home',
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
  'A booking RPC fixture home with a description long enough for a published row.'
);

insert into bookings (
  home_id, guest_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, expires_at, status
) values (
  '33333333-3333-4333-8333-333333333333',
  'user_fail_hold',
  '2026-11-01',
  '2026-11-04',
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_fail_hold',
  now() + interval '15 minutes',
  'pending_payment'
);

select is(
  process_razorpay_event(
    'evt_fail_hold',
    'payment.failed',
    '{"event":"payment.failed"}'::jsonb,
    'order_fail_hold',
    'pay_fail_hold',
    15090000
  ),
  'processed',
  'payment.failed is recorded'
);

select is(
  (select status from bookings where razorpay_order_id = 'order_fail_hold'),
  'pending_payment',
  'a failed attempt keeps the hold so a later capture can confirm'
);

select is(
  process_razorpay_event(
    'evt_capture_after_fail',
    'payment.captured',
    '{"event":"payment.captured"}'::jsonb,
    'order_fail_hold',
    'pay_capture_after_fail',
    15090000
  ),
  'processed',
  'capture after a failed attempt confirms the stay'
);

select is(
  (select status from bookings where razorpay_order_id = 'order_fail_hold'),
  'confirmed',
  'the booking is confirmed after the later capture'
);

insert into bookings (
  home_id, guest_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, expires_at, status
) values (
  '33333333-3333-4333-8333-333333333333',
  'user_revive',
  '2026-12-01',
  '2026-12-04',
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_revive',
  now() + interval '15 minutes',
  'failed'
);

select is(
  (select status from confirm_booking('order_revive', 'pay_revive', 15090000)),
  'confirmed',
  'confirm_booking recovers a stay that an older failure webhook already marked failed'
);

insert into bookings (
  home_id, guest_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, expires_at, status
) values (
  '33333333-3333-4333-8333-333333333333',
  'user_expired',
  '2027-01-01',
  '2027-01-04',
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_expired',
  now() - interval '1 minute',
  'expired'
);

select is(
  (select status from confirm_booking('order_expired', 'pay_expired', 15090000)),
  'confirmed',
  'a capture after the hold expired still confirms when the dates are free'
);

insert into bookings (
  home_id, guest_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, expires_at, status, canceled_at, canceled_by
) values (
  '33333333-3333-4333-8333-333333333333',
  'user_canceled',
  '2027-02-01',
  '2027-02-04',
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_canceled',
  now() + interval '15 minutes',
  'canceled',
  now(),
  'guest'
);

select throws_ok(
  $$ select confirm_booking('order_canceled', 'pay_canceled', 15090000) $$,
  'P0001',
  'booking is not pending',
  'a canceled stay is not confirmed by a later capture'
);

select * from finish();
rollback;
