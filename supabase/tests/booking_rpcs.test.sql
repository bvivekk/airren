begin;
select plan(10);

select is(
  (select total_paise from quote_stay(5030000, 3)),
  17044500,
  'quote_stay matches the display quote for three nights'
);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description
) values (
  '11111111-1111-4111-8111-111111111111',
  'rpc-test-home',
  'RPC Test Home',
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
  'Test home'
);

select lives_ok(
  $$
    insert into bookings (
      home_id, guest_id, check_in, check_out, guests, nights,
      subtotal_paise, service_fee_paise, cleaning_fee_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user_a',
      '2026-10-01',
      '2026-10-04',
      2,
      3,
      15090000,
      754500,
      1200000,
      17044500,
      'order_overlap_a',
      now() + interval '15 minutes',
      'pending_payment'
    );
  $$,
  'first pending lock inserts'
);

select throws_ok(
  $$
    insert into bookings (
      home_id, guest_id, check_in, check_out, guests, nights,
      subtotal_paise, service_fee_paise, cleaning_fee_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user_b',
      '2026-10-02',
      '2026-10-05',
      2,
      3,
      15090000,
      754500,
      1200000,
      17044500,
      'order_overlap_b',
      now() + interval '15 minutes',
      'pending_payment'
    );
  $$,
  '23P01',
  null,
  'overlapping pending bookings are rejected'
);

select throws_ok(
  $$
    select confirm_booking('order_overlap_a', 'pay_tamper', 1);
  $$,
  'P0001',
  'amount mismatch',
  'confirm_booking rejects a mismatched capture'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_forge","role":"authenticated"}', true);

select throws_ok(
  $$
    insert into bookings (
      home_id, guest_id, check_in, check_out, guests, nights,
      subtotal_paise, service_fee_paise, cleaning_fee_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user_forge',
      '2026-12-01',
      '2026-12-04',
      2,
      3,
      1,
      0,
      0,
      1,
      'order_forge',
      now() + interval '15 minutes',
      'confirmed'
    );
  $$,
  '42501',
  null,
  'authenticated guests cannot insert confirmed bookings'
);

reset role;

select throws_ok(
  $$
    select process_razorpay_event(
      'event_retry',
      'payment.captured',
      '{"event":"payment.captured"}'::jsonb,
      'order_missing',
      'pay_retry',
      17044500
    );
  $$,
  'P0001',
  'booking not found',
  'failed processing returns an error'
);

select is(
  (select count(*)::integer from razorpay_events where id = 'event_retry'),
  0,
  'failed processing rolls back the event claim for a retry'
);

select is(
  process_razorpay_event(
    'event_retry',
    'payment.captured',
    '{"event":"payment.captured"}'::jsonb,
    'order_overlap_a',
    'pay_retry',
    17044500
  ),
  'processed',
  'a retry can claim and process the rolled-back event'
);

select is(
  process_razorpay_event(
    'event_retry',
    'payment.captured',
    '{"event":"payment.captured"}'::jsonb,
    'order_overlap_a',
    'pay_retry',
    17044500
  ),
  'duplicate',
  'a committed event is deduplicated'
);

select is(
  (select count(*)::integer from payments where razorpay_payment_id = 'pay_retry'),
  1,
  'duplicate delivery does not create another payment'
);

select * from finish();
rollback;
