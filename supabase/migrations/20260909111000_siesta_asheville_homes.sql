insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910',
  'siesta-key-house',
  'Siesta Key House',
  'Home',
  'Siesta Key',
  'FL',
  'USA',
  4,
  3,
  8,
  4820000,
  4.8,
  41,
  990000,
  ARRAY['luxury']::text[],
  'A gulf-front house on Siesta Key with a pool, a long beach walk, and room for a dog who likes sand.',
  16
) on conflict (id) do nothing;

insert into home_photos (home_id, src, alt, sort_order)
select home_id, src, alt, sort_order
from (
  values
    ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910'::uuid, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80', 'Gulf beach at Siesta Key', 0),
    ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910'::uuid, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80', 'Pool facing the gulf', 1),
    ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910'::uuid, 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1800&q=80', 'Open living room', 2),
    ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910'::uuid, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80', 'Reading nook', 3),
    ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910'::uuid, 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1800&q=80', 'Spa bath', 4)
) as photo (home_id, src, alt, sort_order)
where not exists (
  select 1
  from home_photos existing
  where existing.home_id = photo.home_id
    and existing.sort_order = photo.sort_order
);

insert into home_amenities (home_id, amenity) values
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'Beach access'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'Pool'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'Pets allowed'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'Fast Wi-Fi'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'Grill')
on conflict do nothing;

insert into home_categories (home_id, category_id) values
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'beach'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'pools'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'pet-friendly'),
  ('2c1f0a10-9b3e-4a71-8f2d-6e5c4b3a2910', 'summer')
on conflict do nothing;

insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21',
  'asheville-ridge',
  'Asheville Ridge',
  'Home',
  'Asheville',
  'NC',
  'USA',
  3,
  2,
  6,
  2740000,
  4.9,
  28,
  620000,
  ARRAY['new']::text[],
  'A timber house in the Blue Ridge above Asheville. Trailheads close, downtown twenty minutes, dogs welcome on the porch.',
  17
) on conflict (id) do nothing;

insert into home_photos (home_id, src, alt, sort_order)
select home_id, src, alt, sort_order
from (
  values
    ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21'::uuid, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80', 'Blue Ridge house', 0),
    ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21'::uuid, 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1800&q=80', 'Cabin living room', 1),
    ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21'::uuid, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1800&q=80', 'Kitchen', 2),
    ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21'::uuid, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80', 'Reading nook', 3),
    ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21'::uuid, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80', 'Forest path', 4)
) as photo (home_id, src, alt, sort_order)
where not exists (
  select 1
  from home_photos existing
  where existing.home_id = photo.home_id
    and existing.sort_order = photo.sort_order
);

insert into home_amenities (home_id, amenity) values
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'Mountain views'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'Pets allowed'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'Hot tub'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'Fast Wi-Fi'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'Grill')
on conflict do nothing;

insert into home_categories (home_id, category_id) values
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'mountain'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'forest'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'pet-friendly'),
  ('3d2e1b21-0c4f-4b82-9e3e-7f6d5c4b3a21', 'fall')
on conflict do nothing;
