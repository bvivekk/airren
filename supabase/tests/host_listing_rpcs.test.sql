begin;
select plan(24);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_a","role":"authenticated"}', true);

select throws_ok(
  $$
    insert into homes (
      slug, name, type, city, region, country, beds, baths, guests,
      nightly_rate_paise, rating, review_count, savings_paise, badges, description
    ) values (
      'forged-home',
      'Forged Home',
      'Home',
      'Stowe',
      'VT',
      'USA',
      2,
      2,
      4,
      100000,
      0,
      0,
      0,
      '{}',
      'A forged insert that authenticated hosts must not be able to write.'
    );
  $$,
  '42501',
  null,
  'authenticated cannot insert homes'
);

select throws_ok(
  $$
    update homes set name = 'Forged' where slug = 'sterling-canopy';
  $$,
  '42501',
  null,
  'authenticated cannot update homes'
);

select throws_ok(
  $$
    select host_id from homes limit 1;
  $$,
  '42501',
  null,
  'authenticated cannot select host_id'
);

select set_config('test.draft_id', create_listing_draft()->'listing'->>'id', true);
select set_config('test.live_id', create_listing_draft()->'listing'->>'id', true);

select throws_ok(
  format(
    'select save_listing_draft(%L::uuid, jsonb_build_object(''rating'', 5))',
    current_setting('test.draft_id')
  ),
  '42501',
  'field rating cannot be set by the host',
  'save_listing_draft rejects rating'
);

select set_config('request.jwt.claims', '{"sub":"host_b","role":"authenticated"}', true);

select throws_ok(
  format(
    'select save_listing_draft(%L::uuid, jsonb_build_object(''name'', ''Stolen''))',
    current_setting('test.draft_id')
  ),
  'P0001',
  'listing not found',
  'save_listing_draft against another host raises listing not found'
);

select set_config('request.jwt.claims', '{"sub":"host_a","role":"authenticated"}', true);

select throws_ok(
  format(
    'select publish_listing(%L::uuid)',
    current_setting('test.draft_id')
  ),
  'P0001',
  'listing incomplete',
  'publish_listing on an incomplete draft raises P0001'
);

reset role;

select ok(
  jsonb_array_length(listing_readiness(current_setting('test.draft_id')::uuid)) > 0,
  'incomplete publish has a non-empty issues array'
);

set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::integer from homes where id = current_setting('test.draft_id')::uuid),
  0,
  'draft is invisible to anon'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"host_a","role":"authenticated"}', true);

select is(
  (select count(*)::integer from homes where id = current_setting('test.draft_id')::uuid),
  0,
  'host cannot select a draft through PostgREST'
);

select isnt(
  my_listings(current_setting('test.draft_id')::uuid),
  '[]'::jsonb,
  'host sees the draft only via my_listings'
);

select throws_ok(
  format(
    'select create_pending_booking(%L::uuid, ''2026-11-01'', ''2026-11-04'', 2, ''order_draft_home'')',
    current_setting('test.draft_id')
  ),
  'P0001',
  'home not found',
  'create_pending_booking on a draft raises home not found'
);

select lives_ok(
  format(
    $sql$
      select save_listing_draft(
        %L::uuid,
        '{
          "name":"Cedar Ridge Cabin",
          "type":"Cabin",
          "city":"Stowe",
          "region":"VT",
          "country":"USA",
          "beds":3,
          "baths":2,
          "guests":6,
          "nightlyRatePaise":4500000,
          "description":"A ridge cabin with a wood stove, a long porch, and room for a weekend with friends.",
          "amenities":["Hot tub"]
        }'::jsonb
      );
    $sql$,
    current_setting('test.live_id')
  ),
  'save_listing_draft accepts a complete content patch'
);

select lives_ok(
  format(
    'select attach_listing_photo(%L::uuid, %L, ''Deck at dusk'')',
    current_setting('test.live_id'),
    'host_a/' || current_setting('test.live_id') || '/11111111-2222-4333-8444-555555555555.jpg'
  ),
  'attach_listing_photo writes a storage src under the caller prefix'
);

select lives_ok(
  format(
    'select publish_listing(%L::uuid)',
    current_setting('test.live_id')
  ),
  'publish_listing accepts a complete listing'
);

reset role;

select is(
  (select status from homes where id = current_setting('test.live_id')::uuid),
  'published',
  'publish_listing sets status to published'
);

select ok(
  (select published_at is not null from homes where id = current_setting('test.live_id')::uuid),
  'publish_listing sets published_at'
);

select ok(
  (select slug not like 'draft-%' from homes where id = current_setting('test.live_id')::uuid),
  'publish_listing replaces the draft slug'
);

select ok(
  (
    select
      length(btrim(name)) >= 3
      and length(btrim(type)) > 0
      and length(btrim(city)) > 0
      and length(btrim(region)) > 0
      and length(btrim(country)) > 0
      and length(btrim(description)) >= 40
      and beds is not null
      and baths is not null
      and guests between 1 and 50
      and nightly_rate_paise between 50000 and 500000000
      and rating is not null
      and review_count is not null
      and savings_paise is not null
      and badges is not null
      and slug is not null
      and id is not null
    from homes
    where id = current_setting('test.live_id')::uuid
  ),
  'published host row has the columns parseHome requires'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"guest_g","role":"authenticated"}', true);

select lives_ok(
  format(
    'select create_pending_booking(%L::uuid, ''2026-11-01'', ''2026-11-04'', 2, ''order_host_listing'')',
    current_setting('test.live_id')
  ),
  'create_pending_booking on a published host home succeeds'
);

select set_config('request.jwt.claims', '{"sub":"host_a","role":"authenticated"}', true);

select lives_ok(
  format(
    'select unlist_listing(%L::uuid)',
    current_setting('test.live_id')
  ),
  'unlist_listing hides a published home'
);

select throws_ok(
  format(
    'select attach_listing_photo(%L::uuid, %L, ''Stolen'')',
    current_setting('test.draft_id'),
    'host_b/' || current_setting('test.draft_id') || '/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg'
  ),
  'P0001',
  'listing not found',
  'attach_listing_photo under another host prefix raises'
);

set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::integer from homes where id = current_setting('test.live_id')::uuid),
  0,
  'unlist hides the home from anon'
);

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"guest_g","role":"authenticated"}', true);

select is(
  (select name from homes where id = current_setting('test.live_id')::uuid),
  'Cedar Ridge Cabin',
  'booking guest can still select an unlisted home'
);

reset role;

select throws_ok(
  $$
    insert into homes (
      slug, name, type, city, region, country, beds, baths, guests,
      nightly_rate_paise, rating, review_count, savings_paise, badges, description,
      status, published_at
    ) values (
      'incomplete-published',
      'Too Short',
      'Home',
      'Stowe',
      'VT',
      'USA',
      1,
      1,
      2,
      100000,
      0,
      0,
      0,
      '{}',
      '',
      'published',
      now()
    );
  $$,
  '23514',
  null,
  'published empty description violates completeness'
);

select * from finish();
rollback;
