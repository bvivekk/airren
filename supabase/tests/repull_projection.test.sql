begin;
select plan(31);

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, host_id
) values (
  '33333333-3333-4333-8333-333333333333',
  'channel-test-home',
  'Channel Test Home',
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
  'A channel occupancy fixture home with a description long enough for a published row.',
  'host_h'
);

insert into home_photos (home_id, src, alt)
values ('33333333-3333-4333-8333-333333333333', 'https://example.com/channel.jpg', 'Channel home');

insert into repull_connections (
  id, airren_host_id, repull_account_id, repull_host_id, access_type, state
) values (
  '44444444-4444-4444-8444-444444444444',
  'host_h',
  'acc_test',
  'airbnb_host_1',
  'read_only',
  'active'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select throws_ok(
  'select count(*) from repull_reservations',
  '42501',
  null,
  'channel projection tables are unreachable except through the RPCs'
);

select throws_ok(
  $$
    select process_repull_occupancy_event(
      'evt_forbidden', 'reservation.created', 'upsert', 'airbnb', 'lst_1', 'res_x',
      '2026-11-01', '2026-11-04', 'Airbnb', now(), 'digest_x'
    );
  $$,
  '42501',
  null,
  'authenticated cannot call the service-role projector'
);

reset role;

select is(
  process_repull_occupancy_event(
    'evt_unmap', 'reservation.created', 'upsert', 'airbnb', 'lst_1', 'res_1',
    '2026-11-01', '2026-11-04', 'Airbnb · AAA111', now(), 'digest_unmap'
  )->>'kind',
  'needs_mapping',
  'upsert without a listing map waits for an explicit home'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  0,
  'needs_mapping does not occupy nights'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select throws_ok(
  $$
    select map_repull_listing(
      '44444444-4444-4444-8444-444444444444',
      'airbnb',
      'lst_1',
      '33333333-3333-4333-8333-333333333333'
    );
  $$,
  'P0001',
  'listing not in fetched set',
  'mapListing rejects ids that were not freshly fetched'
);

reset role;

select is(
  replace_repull_remote_listings(
    '44444444-4444-4444-8444-444444444444',
    '[{"platform":"airbnb","listingId":"lst_1","displayName":"Cabin"}]'::jsonb
  ),
  1,
  'the remote listing cache accepts a freshly fetched set'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select throws_ok(
  $$
    select map_repull_listing(
      '44444444-4444-4444-8444-444444444444',
      'airbnb',
      'lst_typed',
      '33333333-3333-4333-8333-333333333333'
    );
  $$,
  'P0001',
  'listing not in fetched set',
  'typed-in remote listing ids are rejected'
);

select is(
  map_repull_listing(
    '44444444-4444-4444-8444-444444444444',
    'airbnb',
    'lst_1',
    '33333333-3333-4333-8333-333333333333'
  )->>'kind',
  'ready',
  'a fetched remote listing can be mapped to a host-owned home'
);

reset role;

select is(
  process_repull_occupancy_event(
    'evt_apply', 'reservation.created', 'upsert', 'airbnb', 'lst_1', 'res_1',
    '2026-11-01', '2026-11-04', 'Airbnb · AAA111', now(), 'digest_apply'
  )->>'kind',
  'applied',
  'service-role upsert occupies by external_ref without a host JWT'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where home_id = '33333333-3333-4333-8333-333333333333'
      and source = 'external'
      and external_ref = 'repull:reservation:res_1'
      and nights = daterange('2026-11-01', '2026-11-04', '[)')
      and label = 'Airbnb · AAA111'
  ),
  1,
  'applied nights use source=external and the stable reservation ref'
);

select is(
  process_repull_occupancy_event(
    'evt_apply', 'reservation.created', 'upsert', 'airbnb', 'lst_1', 'res_1',
    '2026-11-01', '2026-11-04', 'Airbnb · AAA111', now(), 'digest_apply'
  )->>'kind',
  'duplicate',
  'a repeated eventId does not mutate occupancy a second time'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  1,
  'duplicate eventId leaves a single occupancy row'
);

select is(
  process_repull_occupancy_event(
    'evt_reshape', 'reservation.updated', 'upsert', 'airbnb', 'lst_1', 'res_1',
    '2026-11-01', '2026-11-06', 'Airbnb · AAA111', now(), 'digest_reshape'
  )->>'kind',
  'applied',
  'an update reshapes the same external_ref row'
);

select is(
  (
    select nights
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  daterange('2026-11-01', '2026-11-06', '[)'),
  'the upserted occupancy now covers the new nights'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"guest_c","role":"authenticated"}', true);

select throws_ok(
  $$
    select create_pending_booking(
      '33333333-3333-4333-8333-333333333333', '2026-11-03', '2026-11-07', 2, 'order_channel_race'
    );
  $$,
  '23P01',
  null,
  'guest checkout racing an external stay loses on the same GiST lock'
);

select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select lives_ok(
  $$
    select record_host_occupancy(
      '33333333-3333-4333-8333-333333333333', '2026-11-20', '2026-11-23', 'Owner block'
    );
  $$,
  'a host block can sit beside an external stay'
);

reset role;

select is(
  process_repull_occupancy_event(
    'evt_conflict', 'reservation.updated', 'upsert', 'airbnb', 'lst_1', 'res_1',
    '2026-11-20', '2026-11-23', 'Airbnb · AAA111', now(), 'digest_conflict'
  )->>'kind',
  'conflict',
  'a reschedule that loses the GiST race records conflict'
);

select is(
  (
    select nights
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  daterange('2026-11-01', '2026-11-06', '[)'),
  'a conflict preserves the previously applied range'
);

select set_config(
  'test.external_occ',
  (
    select id::text
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  true
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select is(
  (
    select listing_calendar(
      '33333333-3333-4333-8333-333333333333',
      '2026-11-01',
      '2026-12-01'
    )->'entries'
  ) @> '[{"source":"external","removable":false}]'::jsonb,
  true,
  'listing_calendar exposes external stays as not removable'
);

select throws_ok(
  format('select release_host_occupancy(%L::uuid)', current_setting('test.external_occ')),
  '42501',
  null,
  'the host release RPC cannot delete an imported stay'
);

select set_config('request.jwt.claims', '{"sub":"guest_c","role":"authenticated"}', true);

select lives_ok(
  $$
    select create_pending_booking(
      '33333333-3333-4333-8333-333333333333', '2026-12-01', '2026-12-04', 2, 'order_channel_airren'
    );
  $$,
  'an Airren hold can take a free window'
);

reset role;

select is(
  process_repull_occupancy_event(
    'evt_vs_airren', 'reservation.created', 'upsert', 'airbnb', 'lst_1', 'res_2',
    '2026-12-01', '2026-12-04', 'Airbnb · BBB222', now(), 'digest_vs_airren'
  )->>'kind',
  'conflict',
  'an external upsert racing an Airren hold records conflict'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where source = 'airren'
      and home_id = '33333333-3333-4333-8333-333333333333'
      and nights = daterange('2026-12-01', '2026-12-04', '[)')
  ),
  1,
  'the Airren hold remains the occupant'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where external_ref = 'repull:reservation:res_2'
  ),
  0,
  'a first-seen conflict does not insert an external row'
);

update repull_listing_links
set disabled_at = now()
where platform = 'airbnb' and repull_listing_id = 'lst_1';

select is(
  process_repull_occupancy_event(
    'evt_cancel', 'reservation.cancelled', 'release', 'airbnb', 'lst_1', 'res_1',
    null, null, null, now(), 'digest_cancel'
  )->>'kind',
  'cancelled',
  'cancel after unmap still releases the pinned home'
);

select is(
  (
    select count(*)::integer
    from occupancy
    where external_ref = 'repull:reservation:res_1'
  ),
  0,
  'release-by-ref deletes only the pinned external row'
);

select is(
  (
    select state::text
    from repull_reservations
    where reservation_id = 'res_1'
  ),
  'cancelled',
  'the projection stays cancelled after the nights are freed'
);

select is(
  process_repull_occupancy_event(
    'evt_release_unknown', 'reservation.cancelled', 'release', 'airbnb', 'lst_1', 'res_never',
    null, null, null, now(), 'digest_unknown'
  )->>'kind',
  'cancelled',
  'cancel of an unseen reservation completes without occupying'
);

select is(
  (
    select count(*)::integer
    from busy_stays('2026-11-01', '2026-12-31', '33333333-3333-4333-8333-333333333333')
  ),
  2,
  'busy_stays still hides the host block and the live Airren hold'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_h","role":"authenticated"}', true);

select is(
  (
    select jsonb_array_length(channel_issues_for_home('33333333-3333-4333-8333-333333333333'))
  ),
  2,
  'the calendar issue strip includes needs_mapping and the unresolved conflict'
);

reset role;

select is(
  process_repull_occupancy_event(
    'reconcile:res_3:abc', 'reconciliation', 'upsert', 'airbnb', 'lst_1', 'res_3',
    '2026-12-10', '2026-12-12', 'Airbnb · CCC333', now(), 'digest_reconcile'
  )->>'kind',
  'needs_mapping',
  'reconciliation uses the same projector after a listing is unmapped'
);

select * from finish();
rollback;
