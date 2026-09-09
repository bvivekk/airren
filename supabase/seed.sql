truncate table home_photos, home_amenities, home_categories, homes cascade;
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'sterling-canopy',
  'Sterling Canopy',
  'Home',
  'Stowe',
  'VT',
  'USA',
  3,
  3,
  6,
  5030000,
  5,
  48,
  1290000,
  ARRAY['luxury']::text[],
  'A three-level glass house tucked into maple forest above Stowe. Wake to ridgelines, cook in a chef kitchen, and let concierge handle ski delivery.',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80',
  'Glass treehouse in a Vermont forest at sunset',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=80',
  'Warm living room looking into the trees',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1800&q=80',
  'Kitchen with mountain light',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80',
  'Bedroom with floor-to-ceiling windows',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1800&q=80',
  'Outdoor deck among the canopy',
  4
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '8b6ae032-4501-5d26-bdc9-dd10b11efae4',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  'Trail views from the ridge',
  5
);
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'Fast Wi-Fi');
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'Hot tub');
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'EV charger');
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'Workspace');
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'Fire pit');
insert into home_amenities (home_id, amenity) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', '24/7 concierge');
insert into home_categories (home_id, category_id) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'mountain');
insert into home_categories (home_id, category_id) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'forest');
insert into home_categories (home_id, category_id) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'ski');
insert into home_categories (home_id, category_id) values ('8b6ae032-4501-5d26-bdc9-dd10b11efae4', 'fall');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'lake-hollow',
  'Lake Hollow',
  'Home',
  'Castleton',
  'VT',
  'USA',
  5,
  4,
  10,
  4370000,
  4.6,
  31,
  1120000,
  ARRAY['luxury']::text[],
  'A timber lodge on Lake Bomoseen with a private dock, bunk room for kids, and a long table for rainy-day meals.',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80',
  'Lakeside cabin at dawn',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  'Dock on still water',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80',
  'Great room with a stone hearth',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1800&q=80',
  'Screened porch over the water',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7546370e-b195-51a0-a5ca-3c6f7ca82b7f',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80',
  'Primary suite with lake view',
  4
);
insert into home_amenities (home_id, amenity) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'Private dock');
insert into home_amenities (home_id, amenity) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'Kayaks');
insert into home_amenities (home_id, amenity) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'Game room');
insert into home_amenities (home_id, amenity) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'Pet friendly');
insert into home_amenities (home_id, amenity) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'Outdoor shower');
insert into home_categories (home_id, category_id) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'lake');
insert into home_categories (home_id, category_id) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'families');
insert into home_categories (home_id, category_id) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'fall');
insert into home_categories (home_id, category_id) values ('7546370e-b195-51a0-a5ca-3c6f7ca82b7f', 'pet-friendly');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'high-desert-mesa',
  'High Desert Mesa',
  'Home',
  'Joshua Tree',
  'CA',
  'USA',
  4,
  3,
  8,
  4300000,
  5,
  72,
  1120000,
  ARRAY['iconic']::text[],
  'A courtyard house on a granite ridge. Swim at noon, watch the sky go copper, then soak under the Milky Way.',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1800&q=80',
  'Desert villa with pool and palms',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80',
  'Modern house against mountains',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80',
  'Pool terrace at dusk',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1800&q=80',
  'Indoor courtyard with fireplace',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '581f6512-f61c-512a-aa1d-454f8e87c122',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1800&q=80',
  'White stucco volumes in sand',
  4
);
insert into home_amenities (home_id, amenity) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'Heated pool');
insert into home_amenities (home_id, amenity) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'Outdoor kitchen');
insert into home_amenities (home_id, amenity) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'Star deck');
insert into home_amenities (home_id, amenity) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'Record player');
insert into home_amenities (home_id, amenity) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'Outdoor shower');
insert into home_categories (home_id, category_id) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'desert');
insert into home_categories (home_id, category_id) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'pools');
insert into home_categories (home_id, category_id) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'national-parks');
insert into home_categories (home_id, category_id) values ('581f6512-f61c-512a-aa1d-454f8e87c122', 'groups');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'pacific-glass',
  'Pacific Glass',
  'Home',
  'La Jolla',
  'CA',
  'USA',
  7,
  6,
  14,
  13130000,
  5,
  19,
  3440000,
  ARRAY['luxury']::text[],
  'A cliffside house in La Jolla with glass walls, a chef kitchen, and a pool that disappears into the Pacific.',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80',
  'Oceanfront house with a long pool',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1800&q=80',
  'Living room opening to the Pacific',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1800&q=80',
  'Terrace dining over the water',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1800&q=80',
  'Spa bathroom with ocean light',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '795c370f-8c37-5767-9f5b-65a29a8f73dd',
  'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1800&q=80',
  'Night view of the pool',
  4
);
insert into home_amenities (home_id, amenity) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'Infinity pool');
insert into home_amenities (home_id, amenity) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'Chef kitchen');
insert into home_amenities (home_id, amenity) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'Home theater');
insert into home_amenities (home_id, amenity) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'Beach path');
insert into home_amenities (home_id, amenity) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'Gym');
insert into home_categories (home_id, category_id) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'beach');
insert into home_categories (home_id, category_id) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'pools');
insert into home_categories (home_id, category_id) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'groups');
insert into home_categories (home_id, category_id) values ('795c370f-8c37-5767-9f5b-65a29a8f73dd', 'summer');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'big-sky-basin',
  'Big Sky Basin',
  'Home',
  'Big Sky',
  'MT',
  'USA',
  5,
  5,
  12,
  6020000,
  4.8,
  26,
  1580000,
  ARRAY['luxury']::text[],
  'Ski-in timber house above Big Sky. Dry rooms for gear, a copper tub, and a great room that holds the whole crew.',
  4
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  'Mountain lodge under a cold sky',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1800&q=80',
  'Snowy cabin at dusk',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1800&q=80',
  'Timber interior with a fire',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1800&q=80',
  'Hot tub looking at peaks',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '37398079-dc70-5ad0-b7d1-a8d34f65193f',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  'Alpine meadow in summer',
  4
);
insert into home_amenities (home_id, amenity) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'Ski locker');
insert into home_amenities (home_id, amenity) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'Hot tub');
insert into home_amenities (home_id, amenity) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'Boot warmers');
insert into home_amenities (home_id, amenity) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'Game loft');
insert into home_amenities (home_id, amenity) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'Garage');
insert into home_categories (home_id, category_id) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'mountain');
insert into home_categories (home_id, category_id) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'ski');
insert into home_categories (home_id, category_id) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'groups');
insert into home_categories (home_id, category_id) values ('37398079-dc70-5ad0-b7d1-a8d34f65193f', 'national-parks');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'coeur-shore',
  'Coeur Shore',
  'Home',
  'Coeur d''Alene',
  'ID',
  'USA',
  5,
  4,
  10,
  6300000,
  4.8,
  22,
  4440000,
  ARRAY['luxury']::text[],
  'A long, low house on Lake Coeur d''Alene with a slip, a lawn for kids, and evenings that end on the dock.',
  5
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  'Lake house on a blue morning',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1800&q=80',
  'Boathouse and lawn',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1800&q=80',
  'Kitchen opening to the water',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1800&q=80',
  'Dock at golden hour',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edc97f80-6a35-5ae5-95cb-ebeaa5a60f67',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1800&q=80',
  'Mist over the lake',
  4
);
insert into home_amenities (home_id, amenity) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'Boat slip');
insert into home_amenities (home_id, amenity) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'Pool');
insert into home_amenities (home_id, amenity) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'Fire pit');
insert into home_amenities (home_id, amenity) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'Paddleboards');
insert into home_amenities (home_id, amenity) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'Outdoor kitchen');
insert into home_categories (home_id, category_id) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'lake');
insert into home_categories (home_id, category_id) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'pools');
insert into home_categories (home_id, category_id) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'summer');
insert into home_categories (home_id, category_id) values ('edc97f80-6a35-5ae5-95cb-ebeaa5a60f67', 'families');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'fern-hollow',
  'Fern Hollow',
  'Home',
  'McHenry',
  'MD',
  'USA',
  4,
  3,
  8,
  3180000,
  4.7,
  41,
  830000,
  ARRAY['luxury']::text[],
  'A quiet house in the Deep Creek woods. Ferns to the water, a wood stove, and trails that start at the driveway.',
  6
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1800&q=80',
  'House among ferns and water',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80',
  'Morning fog on the lake',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80',
  'Reading nook in timber',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=80',
  'Soft interior light',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '7105c701-8346-5ef1-be90-f0377bf10dc3',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  'Forest trail nearby',
  4
);
insert into home_amenities (home_id, amenity) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'Kayaks');
insert into home_amenities (home_id, amenity) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'Wood stove');
insert into home_amenities (home_id, amenity) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'Pet friendly');
insert into home_amenities (home_id, amenity) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'Screened porch');
insert into home_amenities (home_id, amenity) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'Grill');
insert into home_categories (home_id, category_id) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'lake');
insert into home_categories (home_id, category_id) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'forest');
insert into home_categories (home_id, category_id) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'families');
insert into home_categories (home_id, category_id) values ('7105c701-8346-5ef1-be90-f0377bf10dc3', 'pet-friendly');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'okemo-chalet',
  'Okemo Chalet',
  'Home',
  'Ludlow',
  'VT',
  'USA',
  5,
  4,
  10,
  4740000,
  5,
  18,
  1250000,
  ARRAY['new']::text[],
  'A new chalet above Ludlow. Maple season is loud. Ski season is quieter. The sauna works either way.',
  7
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1800&q=80',
  'Chalet in fall color',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1800&q=80',
  'A-frame living room',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1800&q=80',
  'Dining under beams',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80',
  'Loft bedroom',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b60a33e0-5f0a-5912-9e79-e675262ef8cb',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  'Peak above the village',
  4
);
insert into home_amenities (home_id, amenity) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'Ski storage');
insert into home_amenities (home_id, amenity) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'Sauna');
insert into home_amenities (home_id, amenity) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'Mudroom');
insert into home_amenities (home_id, amenity) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'Fireplace');
insert into home_amenities (home_id, amenity) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'Fast Wi-Fi');
insert into home_categories (home_id, category_id) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'ski');
insert into home_categories (home_id, category_id) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'mountain');
insert into home_categories (home_id, category_id) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'fall');
insert into home_categories (home_id, category_id) values ('b60a33e0-5f0a-5912-9e79-e675262ef8cb', 'families');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'cape-light',
  'Cape Light',
  'Home',
  'Centerville',
  'MA',
  'USA',
  6,
  5,
  12,
  8940000,
  4.6,
  15,
  2370000,
  '{}'::text[],
  'A shingle house a short walk from Craigville Beach. Sandy floors are expected. The outdoor shower is the point.',
  8
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  'Cape house near the water',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80',
  'Pool and lawn',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80',
  'Shingle house exterior',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1800&q=80',
  'Screen porch',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'e53b7f32-929a-57ef-baa6-1fa23495670b',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80',
  'Bright bedroom',
  4
);
insert into home_amenities (home_id, amenity) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'Beach chairs');
insert into home_amenities (home_id, amenity) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'Outdoor shower');
insert into home_amenities (home_id, amenity) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'Bikes');
insert into home_amenities (home_id, amenity) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'Grill');
insert into home_amenities (home_id, amenity) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'Game room');
insert into home_categories (home_id, category_id) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'beach');
insert into home_categories (home_id, category_id) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'families');
insert into home_categories (home_id, category_id) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'summer');
insert into home_categories (home_id, category_id) values ('e53b7f32-929a-57ef-baa6-1fa23495670b', 'groups');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'scottsdale-palo',
  'Scottsdale Palo',
  'Home',
  'Scottsdale',
  'AZ',
  'USA',
  4,
  4,
  8,
  5260000,
  4.8,
  37,
  1370000,
  ARRAY['luxury']::text[],
  'A Palo Verde house with a dark pool, a putting green, and a kitchen that opens to the patio all winter.',
  9
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1800&q=80',
  'Desert modern with a black pool',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80',
  'Lounge by the water',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80',
  'House at dusk',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1800&q=80',
  'Interior with fireplace',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '094ef89e-c7bd-5895-913b-d532a429b4dd',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1800&q=80',
  'White volumes in the desert',
  4
);
insert into home_amenities (home_id, amenity) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'Heated pool');
insert into home_amenities (home_id, amenity) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'Putting green');
insert into home_amenities (home_id, amenity) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'Outdoor kitchen');
insert into home_amenities (home_id, amenity) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'Workspace');
insert into home_amenities (home_id, amenity) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'EV charger');
insert into home_categories (home_id, category_id) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'desert');
insert into home_categories (home_id, category_id) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'pools');
insert into home_categories (home_id, category_id) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'city');
insert into home_categories (home_id, category_id) values ('094ef89e-c7bd-5895-913b-d532a429b4dd', 'groups');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'dry-creek-farm',
  'Dry Creek Farm',
  'Home',
  'Healdsburg',
  'CA',
  'USA',
  4,
  4,
  8,
  13250000,
  4.9,
  12,
  3490000,
  ARRAY['luxury']::text[],
  'A farmhouse on Dry Creek with a pool, a long oak table, and bikes for the tasting rooms in town.',
  10
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80',
  'Farmhouse among vines',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1800&q=80',
  'Porch looking at oaks',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80',
  'White bedroom',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1800&q=80',
  'Kitchen with garden herbs',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'edf3c8cf-86ce-5883-95a9-a2058e9d7379',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80',
  'Morning over the valley',
  4
);
insert into home_amenities (home_id, amenity) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'Pool');
insert into home_amenities (home_id, amenity) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'Vineyard views');
insert into home_amenities (home_id, amenity) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'Chef kitchen');
insert into home_amenities (home_id, amenity) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'Pet friendly');
insert into home_amenities (home_id, amenity) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'Fire pit');
insert into home_categories (home_id, category_id) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'families');
insert into home_categories (home_id, category_id) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'summer');
insert into home_categories (home_id, category_id) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'pools');
insert into home_categories (home_id, category_id) values ('edf3c8cf-86ce-5883-95a9-a2058e9d7379', 'pet-friendly');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'phoenix-vista',
  'Phoenix Vista',
  'Home',
  'Phoenix',
  'AZ',
  'USA',
  4,
  3,
  8,
  3260000,
  4.9,
  54,
  870000,
  '{}'::text[],
  'A mid-century house in the Phoenix foothills. Camelback in the window, a pool for the afternoon, downtown twenty minutes away.',
  11
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80',
  'Desert house with city light',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=80',
  'Pool after sunset',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1800&q=80',
  'Palm courtyard',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80',
  'Quiet bedroom',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '0673aec1-c0f2-52b0-a796-f40fd2b05dbd',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=80',
  'Living room',
  4
);
insert into home_amenities (home_id, amenity) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'Pool');
insert into home_amenities (home_id, amenity) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'Mountain views');
insert into home_amenities (home_id, amenity) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'Workspace');
insert into home_amenities (home_id, amenity) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'Grill');
insert into home_amenities (home_id, amenity) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'Fast Wi-Fi');
insert into home_categories (home_id, category_id) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'desert');
insert into home_categories (home_id, category_id) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'city');
insert into home_categories (home_id, category_id) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'pools');
insert into home_categories (home_id, category_id) values ('0673aec1-c0f2-52b0-a796-f40fd2b05dbd', 'families');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'falmouth-bay',
  'Falmouth Bay',
  'Home',
  'East Falmouth',
  'MA',
  'USA',
  5,
  4,
  10,
  11330000,
  4.9,
  9,
  2990000,
  ARRAY['luxury']::text[],
  'A bay-front house in East Falmouth with a salt marsh, a pool, and a path that ends in sand.',
  12
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  'Bay house at low tide',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80',
  'Pool facing the marsh',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1800&q=80',
  'Lawn to the water',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80',
  'Light-filled suite',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  '1a19cd80-b9dc-5466-a8e6-396d2a1c4b91',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1800&q=80',
  'Covered porch',
  4
);
insert into home_amenities (home_id, amenity) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'Private beach');
insert into home_amenities (home_id, amenity) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'Pool');
insert into home_amenities (home_id, amenity) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'Kayaks');
insert into home_amenities (home_id, amenity) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'Outdoor shower');
insert into home_amenities (home_id, amenity) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'Chef kitchen');
insert into home_categories (home_id, category_id) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'beach');
insert into home_categories (home_id, category_id) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'lake');
insert into home_categories (home_id, category_id) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'summer');
insert into home_categories (home_id, category_id) values ('1a19cd80-b9dc-5466-a8e6-396d2a1c4b91', 'groups');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'park-city-slopes',
  'Park City Slopes',
  'Home',
  'Park City',
  'UT',
  'USA',
  5,
  5,
  12,
  7480000,
  4.8,
  28,
  1990000,
  ARRAY['luxury']::text[],
  'A slope-side house in Park City. Click in at the door, soak after the last run, and walk Main Street for dinner.',
  13
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  'Slope-side house in snow',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1800&q=80',
  'Evening lights on the mountain',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1800&q=80',
  'Great room with a fire',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1800&q=80',
  'Deck over the run',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c6b516dd-b386-5a91-9a16-ad8ac21f9e4a',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=80',
  'Soft interior',
  4
);
insert into home_amenities (home_id, amenity) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'Ski-in ski-out');
insert into home_amenities (home_id, amenity) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'Hot tub');
insert into home_amenities (home_id, amenity) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'Boot room');
insert into home_amenities (home_id, amenity) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'Media room');
insert into home_amenities (home_id, amenity) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'Garage');
insert into home_categories (home_id, category_id) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'ski');
insert into home_categories (home_id, category_id) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'mountain');
insert into home_categories (home_id, category_id) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'groups');
insert into home_categories (home_id, category_id) values ('c6b516dd-b386-5a91-9a16-ad8ac21f9e4a', 'national-parks');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'kailua-tradewind',
  'Kailua Tradewind',
  'Home',
  'Kailua',
  'HI',
  'USA',
  3,
  3,
  6,
  6990000,
  4.9,
  33,
  1830000,
  ARRAY['iconic']::text[],
  'A Kailua house a few minutes from the beach. Trade winds through the lanai, a small pool, and bikes for the path.',
  14
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  'Lanai toward the trade winds',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80',
  'Pool in tropical light',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1800&q=80',
  'Indoor outdoor living',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80',
  'Bedroom with palm shade',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'c441384b-8e71-524f-86c3-719a52db7674',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80',
  'Morning over the water',
  4
);
insert into home_amenities (home_id, amenity) values ('c441384b-8e71-524f-86c3-719a52db7674', 'Lanai');
insert into home_amenities (home_id, amenity) values ('c441384b-8e71-524f-86c3-719a52db7674', 'Pool');
insert into home_amenities (home_id, amenity) values ('c441384b-8e71-524f-86c3-719a52db7674', 'Beach gear');
insert into home_amenities (home_id, amenity) values ('c441384b-8e71-524f-86c3-719a52db7674', 'Outdoor shower');
insert into home_amenities (home_id, amenity) values ('c441384b-8e71-524f-86c3-719a52db7674', 'Bikes');
insert into home_categories (home_id, category_id) values ('c441384b-8e71-524f-86c3-719a52db7674', 'hawaii');
insert into home_categories (home_id, category_id) values ('c441384b-8e71-524f-86c3-719a52db7674', 'beach');
insert into home_categories (home_id, category_id) values ('c441384b-8e71-524f-86c3-719a52db7674', 'pools');
insert into home_categories (home_id, category_id) values ('c441384b-8e71-524f-86c3-719a52db7674', 'summer');
insert into homes (
  id, slug, name, type, city, region, country, beds, baths, guests,
  nightly_rate_paise, rating, review_count, savings_paise, badges, description, sort_order
) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'smoky-vista',
  'Smoky Vista',
  'Home',
  'Sevierville',
  'TN',
  'USA',
  5,
  4,
  10,
  3180000,
  3.9,
  61,
  830000,
  '{}'::text[],
  'A ridge house outside Sevierville with a long view of the Smokies and a hot tub for after the park.',
  15
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=80',
  'Ridge house in the Smokies',
  0
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80',
  'Forest deck',
  1
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1800&q=80',
  'Cabin living room',
  2
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1800&q=80',
  'Kitchen',
  3
);
insert into home_photos (home_id, src, alt, sort_order) values (
  'b2d9465f-0262-5a8a-a4b5-1a88b29405b6',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80',
  'Blue ridges at dusk',
  4
);
insert into home_amenities (home_id, amenity) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'Hot tub');
insert into home_amenities (home_id, amenity) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'Game loft');
insert into home_amenities (home_id, amenity) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'Grill');
insert into home_amenities (home_id, amenity) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'Mountain views');
insert into home_amenities (home_id, amenity) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'Fast Wi-Fi');
insert into home_categories (home_id, category_id) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'mountain');
insert into home_categories (home_id, category_id) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'forest');
insert into home_categories (home_id, category_id) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'families');
insert into home_categories (home_id, category_id) values ('b2d9465f-0262-5a8a-a4b5-1a88b29405b6', 'national-parks');
