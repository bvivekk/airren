begin;
select plan(40);

select is(
  (select total_paise from quote_stay(5030000, 3)),
  15090000,
  'quote_stay matches the nights-only display quote'
);

select is(
  (select (commission_paise, host_net_paise) from quote_stay(5030000, 3)),
  (1509000, 13581000),
  'quote_stay splits 10 percent commission from host net'
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
  'A booking RPC fixture home with a description long enough for a published row.'
);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, host_id
) values (
  '22222222-2222-4222-8222-222222222222',
  'rpc-hosted-home',
  'RPC Hosted Home',
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
  'A hosted booking RPC fixture home with a description long enough for a published row.',
  'host_payout'
);

select lives_ok(
  $$
    insert into bookings (
      home_id, guest_id, check_in, check_out, guests, nights,
      subtotal_paise, commission_paise, host_net_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user_a',
      '2026-10-01',
      '2026-10-04',
      2,
      3,
      15090000,
      1509000,
      13581000,
      15090000,
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
      subtotal_paise, commission_paise, host_net_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user_b',
      '2026-10-02',
      '2026-10-05',
      2,
      3,
      15090000,
      1509000,
      13581000,
      15090000,
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
      subtotal_paise, commission_paise, host_net_paise, total_paise,
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
      1,
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
      15090000
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
    15090000
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
    15090000
  ),
  'duplicate',
  'a committed event is deduplicated'
);

select is(
  (select count(*)::integer from payments where razorpay_payment_id = 'pay_retry'),
  1,
  'duplicate delivery does not create another payment'
);

select is(
  (select p.status from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_overlap_a'),
  'on_hold',
  'confirm inserts an on_hold payout for a catalog home'
);

select is(
  (select p.hold_reason from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_overlap_a'),
  'no_host',
  'catalog-home payout hold reason is no_host'
);

select is(
  (select p.amount_paise from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_overlap_a'),
  13581000,
  'catalog-home payout amount is the snapshotted host net'
);

select is(
  (select count(*)::integer from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_overlap_a'),
  1,
  'idempotent confirm does not insert a second payout'
);

select lives_ok(
  $$
    insert into bookings (
      home_id, guest_id, host_id, check_in, check_out, guests, nights,
      subtotal_paise, commission_paise, host_net_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'user_hosted',
      'host_payout',
      '2026-01-01',
      '2026-01-04',
      2,
      3,
      15090000,
      1509000,
      13581000,
      15090000,
      'order_hosted_a',
      now() + interval '15 minutes',
      'pending_payment'
    );
  $$,
  'hosted pending booking inserts'
);

select is(
  (select host_id from confirm_booking('order_hosted_a', 'pay_hosted_a', 15090000)),
  'host_payout',
  'confirm_booking snapshots the hosted booking'
);

select is(
  (select p.status from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'scheduled',
  'confirm inserts a scheduled payout when a host is snapshotted'
);

select is(
  (select p.amount_paise from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  13581000,
  'scheduled payout amount is the snapshotted host net'
);

update payouts
set eligible_at = now() - interval '1 hour'
where booking_id = (select id from bookings where razorpay_order_id = 'order_hosted_a');

select is(
  (select count(*)::integer from claim_due_payouts(25)),
  0,
  'claim_due_payouts returns nothing without a destination'
);

select is(
  (select p.status from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'on_hold',
  'claim_due_payouts holds a due payout with no destination'
);

select is(
  (select p.hold_reason from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'no_destination',
  'missing destination hold reason is no_destination'
);

insert into host_payout_accounts (
  host_id, method, label, razorpayx_contact_id, razorpayx_fund_account_id
) values (
  'host_payout', 'vpa', 'priya@ok···', 'cont_1', 'fa_1'
);

select is(
  release_no_destination_holds('host_payout'),
  1,
  'release_no_destination_holds returns the hosted row to scheduled'
);

create temp table claimed_due (payload jsonb);
insert into claimed_due select claim_due_payouts(25);

select is(
  (select payload->>'fund_account_id' from claimed_due),
  'fa_1',
  'claim_due_payouts returns the fund account after a destination exists'
);

select is(
  (select (payload->>'amount_paise')::integer from claimed_due),
  13581000,
  'claim_due_payouts returns the snapshotted host net'
);

select is(
  (select count(*)::integer from claim_due_payouts(25)),
  0,
  'a just-claimed processing payout is not reclaimed immediately'
);

update payouts
set updated_at = now() - interval '11 minutes'
where booking_id = (select id from bookings where razorpay_order_id = 'order_hosted_a');

select is(
  (
    select c->>'id' = (
      select p.id::text from payouts p
      join bookings b on b.id = p.booking_id
      where b.razorpay_order_id = 'order_hosted_a'
    )
    from claim_due_payouts(25) c
  ),
  true,
  'stale processing rows are reclaimed with the same payout id'
);

select is(
  (select attempt_count from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  2,
  'stale reclaim records another attempt on the same payout'
);

select lives_ok(
  $$
    select record_payout_initiated(
      (select p.id from payouts p
        join bookings b on b.id = p.booking_id
        where b.razorpay_order_id = 'order_hosted_a'),
      'pout_hosted_a'
    );
  $$,
  'record_payout_initiated stores the provider id'
);

select lives_ok(
  $$
    select record_payout_initiated(
      (select p.id from payouts p
        join bookings b on b.id = p.booking_id
        where b.razorpay_order_id = 'order_hosted_a'),
      'pout_hosted_a'
    );
  $$,
  'record_payout_initiated is idempotent for the same provider id'
);

select is(
  process_razorpayx_event(
    'x_event_paid',
    'payout.processed',
    '{"payload":{"payout":{"entity":{"id":"pout_hosted_a"}}}}'::jsonb
  ),
  'ok',
  'payout.processed marks the row paid'
);

select is(
  (select p.status from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'paid',
  'webhook is the only writer of paid'
);

select is(
  process_razorpayx_event(
    'x_event_paid',
    'payout.processed',
    '{"payload":{"payout":{"entity":{"id":"pout_hosted_a"}}}}'::jsonb
  ),
  'duplicate',
  'a processed RazorpayX event is deduplicated'
);

select is(
  process_razorpayx_event(
    'x_event_reversed',
    'payout.reversed',
    '{"payload":{"payout":{"entity":{"id":"pout_hosted_a"}}}}'::jsonb
  ),
  'ok',
  'payout.reversed is accepted after paid'
);

select is(
  (select p.status from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'failed',
  'reversed-after-paid stays failed'
);

select is(
  (select p.failure_reason from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_hosted_a'),
  'reversed',
  'reversed-after-paid stores failure_reason reversed'
);

insert into bookings (
  home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  '22222222-2222-4222-8222-222222222222',
  'user_historical',
  'host_payout',
  '2025-12-01',
  '2025-12-04',
  2,
  3,
  15090000,
  1509000,
  13581000,
  17044500,
  'order_historical',
  'confirmed'
);

select is(
  (select count(*)::integer from payouts p
    join bookings b on b.id = p.booking_id
    where b.razorpay_order_id = 'order_historical'),
  0,
  'historical confirmed rows do not get a payout'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_payout","role":"authenticated"}', true);

select is(
  (select count(*)::integer from list_host_earnings()),
  1,
  'list_host_earnings returns the host confirmed stay with a payout'
);

select is(
  (select payout_status from list_host_earnings()),
  'failed',
  'list_host_earnings exposes payout status without guest ids'
);

select throws_ok(
  $$
    select razorpayx_payout_id from payouts limit 1;
  $$,
  '42501',
  null,
  'authenticated hosts cannot select payouts directly'
);

reset role;

select * from finish();
rollback;
