begin;
select plan(31);

select is(
  quote_refund(
    'flexible',
    timestamptz '2026-10-14 15:00:00+05:30',
    '2026-10-15',
    15090000
  ),
  '{"policy":"flexible","band":"full","refundPaise":15090000,"keptPaise":0,"commissionAfterPaise":0,"hostNetAfterPaise":0}'::jsonb,
  'quote_refund flexible is 100 percent at T-24h'
);

select is(
  quote_refund(
    'flexible',
    timestamptz '2026-10-14 15:00:00.001+05:30',
    '2026-10-15',
    15090000
  ),
  '{"policy":"flexible","band":"none","refundPaise":0,"keptPaise":15090000,"commissionAfterPaise":1509000,"hostNetAfterPaise":13581000}'::jsonb,
  'quote_refund flexible is 0 percent just after T-24h'
);

select is(
  quote_refund(
    'strict',
    timestamptz '2026-10-01 15:00:00+05:30',
    '2026-10-15',
    15090000
  ),
  '{"policy":"strict","band":"half","refundPaise":7545000,"keptPaise":7545000,"commissionAfterPaise":754500,"hostNetAfterPaise":6790500}'::jsonb,
  'quote_refund strict is 50 percent at T-14d'
);

select is(
  quote_refund(
    'strict',
    timestamptz '2026-10-01 15:00:00.001+05:30',
    '2026-10-15',
    15090000
  ),
  '{"policy":"strict","band":"none","refundPaise":0,"keptPaise":15090000,"commissionAfterPaise":1509000,"hostNetAfterPaise":13581000}'::jsonb,
  'quote_refund strict is 0 percent just after T-14d'
);

select is(
  (quote_refund('strict', timestamptz '2026-10-01 15:00:00+05:30', '2026-10-15', 5)->>'refundPaise')::integer
    + (quote_refund('strict', timestamptz '2026-10-01 15:00:00+05:30', '2026-10-15', 5)->>'commissionAfterPaise')::integer
    + (quote_refund('strict', timestamptz '2026-10-01 15:00:00+05:30', '2026-10-15', 5)->>'hostNetAfterPaise')::integer,
  5,
  'quote_refund balances odd paise'
);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, host_id
) values (
  '33333333-3333-4333-8333-333333333333',
  'refund-test-home',
  'Refund Test Home',
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
  'A refund RPC fixture home with a description long enough for a published row.',
  'host_refund'
);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, host_id,
  cancellation_policy
) values (
  '44444444-4444-4444-8444-444444444444',
  'refund-strict-home',
  'Refund Strict Home',
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
  'A strict-policy refund fixture home with a description long enough for a published row.',
  'host_refund',
  'strict'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'guest_refund',
  'host_refund',
  current_date + 30,
  current_date + 33,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_full',
  'confirmed'
);

insert into payments (id, booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
values (
  '66666666-6666-4666-8666-666666666666',
  '55555555-5555-4555-8555-555555555555',
  'order_refund_full',
  'pay_refund_full',
  15090000,
  'captured'
);

insert into payouts (booking_id, host_id, amount_paise, status, eligible_at)
values (
  '55555555-5555-4555-8555-555555555555',
  'host_refund',
  13581000,
  'scheduled',
  now() + interval '40 days'
);

select set_config('request.jwt.claims', '{"sub":"guest_refund","role":"authenticated"}', true);

select is(
  (cancel_booking('55555555-5555-4555-8555-555555555555')->>'alreadyCanceled')::boolean,
  false,
  'guest cancel of a confirmed stay succeeds'
);

select is(
  (select status from bookings where id = '55555555-5555-4555-8555-555555555555'),
  'canceled',
  'cancel_booking writes canceled'
);

select is(
  (select status from payouts where booking_id = '55555555-5555-4555-8555-555555555555'),
  'canceled',
  'full refund cancels the unpaid payout'
);

select is(
  (select amount_paise from refunds where booking_id = '55555555-5555-4555-8555-555555555555'),
  15090000,
  'full flexible cancel inserts a requested refund for the guest total'
);

select is(
  (cancel_booking('55555555-5555-4555-8555-555555555555')->>'alreadyCanceled')::boolean,
  true,
  'second cancel is idempotent'
);

select is(
  (select count(*)::integer from refunds where booking_id = '55555555-5555-4555-8555-555555555555'),
  1,
  'idempotent cancel does not insert a second refund'
);

select lives_ok(
  $$
    insert into bookings (
      home_id, guest_id, host_id, check_in, check_out, guests, nights,
      subtotal_paise, commission_paise, host_net_paise, total_paise,
      razorpay_order_id, expires_at, status
    ) values (
      '33333333-3333-4333-8333-333333333333',
      'guest_other',
      'host_refund',
      current_date + 30,
      current_date + 33,
      2,
      3,
      15090000,
      1509000,
      13581000,
      15090000,
      'order_refund_rebook',
      now() + interval '15 minutes',
      'pending_payment'
    );
  $$,
  'canceled nights can be booked again'
);

select is(
  (
    select count(*)::integer
    from bookings
    where id = '55555555-5555-4555-8555-555555555555'
      and status in ('pending_payment', 'confirmed')
  ),
  0,
  'canceled stays are excluded from the busy predicate'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  '77777777-7777-4777-8777-777777777777',
  '33333333-3333-4333-8333-333333333333',
  'guest_refund',
  'host_refund',
  current_date - 2,
  current_date + 1,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_late',
  'confirmed'
);

insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
values (
  '77777777-7777-4777-8777-777777777777',
  'order_refund_late',
  'pay_refund_late',
  15090000,
  'captured'
);

insert into payouts (booking_id, host_id, amount_paise, status, eligible_at)
values (
  '77777777-7777-4777-8777-777777777777',
  'host_refund',
  13581000,
  'scheduled',
  now() - interval '1 hour'
);

select throws_ok(
  $$ select cancel_booking('77777777-7777-4777-8777-777777777777') $$,
  'P0001',
  'window_closed',
  'guest cancel after check-in raises window_closed'
);

select set_config('request.jwt.claims', '{"sub":"host_refund","role":"authenticated"}', true);

select is(
  (cancel_booking('77777777-7777-4777-8777-777777777777')->>'quote')::jsonb->>'refundPaise',
  '15090000',
  'host cancel always refunds the guest total'
);

select is(
  (select policy_applied from refunds where booking_id = '77777777-7777-4777-8777-777777777777'),
  'host_full',
  'host cancel stores policy_applied host_full'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  '88888888-8888-4888-8888-888888888888',
  '44444444-4444-4444-8444-444444444444',
  'guest_refund',
  'host_refund',
  current_date + 20,
  current_date + 23,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_half',
  'confirmed'
);

insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
values (
  '88888888-8888-4888-8888-888888888888',
  'order_refund_half',
  'pay_refund_half',
  15090000,
  'captured'
);

insert into payouts (booking_id, host_id, amount_paise, status, eligible_at)
values (
  '88888888-8888-4888-8888-888888888888',
  'host_refund',
  13581000,
  'scheduled',
  now() + interval '21 days'
);

select set_config('request.jwt.claims', '{"sub":"guest_refund","role":"authenticated"}', true);

select is(
  (cancel_booking('88888888-8888-4888-8888-888888888888')->>'payout')::jsonb,
  '{"action":"amount_updated","amountPaise":6790500}'::jsonb,
  'half refund shrinks the unpaid payout to host net after'
);

select is(
  (select amount_paise from payouts where booking_id = '88888888-8888-4888-8888-888888888888'),
  6790500,
  'shrunk payout amount is hostNetAfter'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  '99999999-9999-4999-8999-999999999999',
  '33333333-3333-4333-8333-333333333333',
  'guest_refund',
  'host_refund',
  case
    when now() < check_in_instant(current_date) then current_date
    else current_date + 1
  end,
  case
    when now() < check_in_instant(current_date) then current_date + 3
    else current_date + 4
  end,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_none',
  'confirmed'
);

insert into payments (booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status)
values (
  '99999999-9999-4999-8999-999999999999',
  'order_refund_none',
  'pay_refund_none',
  15090000,
  'captured'
);

insert into payouts (booking_id, host_id, amount_paise, status, eligible_at)
values (
  '99999999-9999-4999-8999-999999999999',
  'host_refund',
  13581000,
  'scheduled',
  now() - interval '1 hour'
);

select is(
  (cancel_booking('99999999-9999-4999-8999-999999999999')->>'payout')::jsonb->>'action',
  'unchanged',
  '0 percent flexible cancel leaves the unpaid payout'
);

select is(
  (select count(*)::integer from refunds where booking_id = '99999999-9999-4999-8999-999999999999'),
  0,
  '0 percent cancel inserts no refund row'
);

insert into host_payout_accounts (
  host_id, method, label, razorpayx_contact_id, razorpayx_fund_account_id
) values (
  'host_refund', 'vpa', 'refund@ok···', 'cont_refund', 'fa_refund'
);

select is(
  (select (c->>'amount_paise')::integer from claim_due_payouts(25) c
    where c->>'booking_id' = '99999999-9999-4999-8999-999999999999'),
  13581000,
  'claim_due_payouts still remits a canceled stay with remaining host net'
);

select is(
  (
    select count(*)::integer
    from claim_due_payouts(25) c
    where c->>'booking_id' = '55555555-5555-4555-8555-555555555555'
  ),
  0,
  'claim_due_payouts skips a canceled payout'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '33333333-3333-4333-8333-333333333333',
  'guest_refund',
  'host_refund',
  current_date + 40,
  current_date + 43,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_paid',
  'confirmed'
);

insert into payouts (
  booking_id, host_id, amount_paise, status, razorpayx_payout_id, eligible_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'host_refund',
  13581000,
  'paid',
  'pout_refund_paid',
  now() - interval '1 day'
);

select throws_ok(
  $$ select cancel_booking('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01') $$,
  'P0001',
  'payout_in_flight',
  'paid payout blocks cancel'
);

insert into bookings (
  id, home_id, guest_id, host_id, check_in, check_out, guests, nights,
  subtotal_paise, commission_paise, host_net_paise, total_paise,
  razorpay_order_id, status
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  '33333333-3333-4333-8333-333333333333',
  'guest_refund',
  'host_refund',
  current_date + 50,
  current_date + 53,
  2,
  3,
  15090000,
  1509000,
  13581000,
  15090000,
  'order_refund_proc',
  'confirmed'
);

insert into payouts (
  booking_id, host_id, amount_paise, status, razorpayx_payout_id, eligible_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'host_refund',
  13581000,
  'processing',
  'pout_refund_proc',
  now() - interval '1 day'
);

select throws_ok(
  $$ select cancel_booking('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02') $$,
  'P0001',
  'payout_in_flight',
  'processing payout with a provider id blocks cancel'
);

select set_config('request.jwt.claims', '{"sub":"stranger","role":"authenticated"}', true);

select throws_ok(
  $$ select cancel_booking('88888888-8888-4888-8888-888888888888') $$,
  'P0001',
  'forbidden',
  'a stranger cannot cancel someone else stay'
);

select set_config('request.jwt.claims', '{"sub":"guest_refund","role":"authenticated"}', true);

create temp table claimed_refunds (payload jsonb);
insert into claimed_refunds
select claim_pending_refunds(25)
where true;

select is(
  (select count(*)::integer from claimed_refunds),
  (select count(*)::integer from refunds where status = 'processing'),
  'claim_pending_refunds moves requested refunds to processing'
);

select lives_ok(
  $$
    select record_refund_submitted(
      (select id from refunds where booking_id = '55555555-5555-4555-8555-555555555555'),
      'rfnd_full'
    );
  $$,
  'record_refund_submitted stores the Razorpay refund id'
);

select is(
  process_razorpay_event(
    'evt_refund_full',
    'refund.processed',
    '{"payload":{"refund":{"entity":{"id":"rfnd_full","payment_id":"pay_refund_full","amount":15090000}}}}'::jsonb
  ),
  'processed',
  'refund.processed marks the refund processed'
);

select is(
  (select status from refunds where booking_id = '55555555-5555-4555-8555-555555555555'),
  'processed',
  'webhook is the writer of processed'
);

select is(
  (select status from bookings where id = '55555555-5555-4555-8555-555555555555'),
  'canceled',
  'refund webhook does not change booking status'
);

select is(
  process_razorpay_event(
    'evt_refund_full',
    'refund.processed',
    '{"payload":{"refund":{"entity":{"id":"rfnd_full","payment_id":"pay_refund_full","amount":15090000}}}}'::jsonb
  ),
  'duplicate',
  'duplicate refund webhook is a no-op'
);

select * from finish();
rollback;
