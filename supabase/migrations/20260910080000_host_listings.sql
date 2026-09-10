alter table homes
  add column host_id text,
  add column status text not null default 'published'
    check (status in ('draft', 'published', 'unlisted')),
  add column published_at timestamptz default now(),
  add column updated_at timestamptz not null default now();

create index homes_host_id_idx on homes (host_id) where host_id is not null;
create index homes_status_idx on homes (status);

alter table homes add constraint homes_public_rows_are_complete check (
  status = 'draft' or (
        length(btrim(name)) between 3 and 80
    and length(btrim(description)) >= 40
    and length(btrim(type)) > 0
    and length(btrim(city)) > 0
    and length(btrim(region)) > 0
    and length(btrim(country)) > 0
    and beds between 0 and 50
    and baths between 0 and 50
    and guests between 1 and 50
    and nightly_rate_paise between 50000 and 500000000
  )
);

alter table homes add constraint homes_published_at_set check (
  (status = 'draft') = (published_at is null)
);

alter table home_photos add constraint home_photos_src_scheme check (
  src like 'https://%' or src like 'storage:%'
);

create table listing_options (
  kind text not null check (kind in ('type', 'amenity')),
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  primary key (kind, value)
);

insert into listing_options (kind, value, label, sort_order) values
  ('type', 'Home', 'Home', 0),
  ('type', 'Cabin', 'Cabin', 1),
  ('type', 'Villa', 'Villa', 2),
  ('type', 'Cottage', 'Cottage', 3),
  ('type', 'Apartment', 'Apartment', 4),
  ('type', 'Chalet', 'Chalet', 5),
  ('type', 'Farmhouse', 'Farmhouse', 6);

insert into listing_options (kind, value, label, sort_order)
select distinct 'amenity', amenity, amenity, 0
from home_amenities
on conflict do nothing;

alter table listing_options enable row level security;
create policy "listing options are public" on listing_options
  for select to anon, authenticated using (true);

grant select on listing_options to anon, authenticated;

create or replace function can_view_home(p_home_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from homes h
    where h.id = p_home_id
      and (
        h.status = 'published'
        or exists (
          select 1 from bookings b
          where b.home_id = h.id
            and b.guest_id = (select auth.jwt() ->> 'sub')
        )
      )
  );
$$;

create or replace function listing_readiness(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h homes%rowtype;
  issues jsonb := '[]'::jsonb;
  photo_count integer;
begin
  select * into h from homes where id = p_listing_id;
  if not found then
    raise exception 'listing not found';
  end if;
  select count(*) into photo_count from home_photos where home_id = p_listing_id;

  if length(btrim(h.name)) not between 3 and 80 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'name',
      'message', 'Give your home a name (3-80 characters).'
    ));
  end if;
  if not exists (
    select 1 from listing_options o
    where o.kind = 'type' and o.value = btrim(h.type)
  ) then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'type',
      'message', 'Pick a home type.'
    ));
  end if;
  if length(btrim(h.city)) = 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'city',
      'message', 'Add a city.'
    ));
  end if;
  if length(btrim(h.region)) = 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'region',
      'message', 'Add a region.'
    ));
  end if;
  if length(btrim(h.country)) = 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'country',
      'message', 'Add a country.'
    ));
  end if;
  if h.guests < 1 or h.guests > 50 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'guests',
      'message', 'Say how many guests fit.'
    ));
  end if;
  if h.beds < 0 or h.beds > 50 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'beds',
      'message', 'Say how many beds there are.'
    ));
  end if;
  if h.baths < 0 or h.baths > 50 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'baths',
      'message', 'Say how many baths there are.'
    ));
  end if;
  if h.nightly_rate_paise < 50000 or h.nightly_rate_paise > 500000000 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'nightlyRatePaise',
      'message', 'Set a nightly rate between ₹500 and ₹50,00,000.'
    ));
  end if;
  if length(btrim(h.description)) < 40 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'description',
      'message', 'Write at least a couple of sentences (40+ characters).'
    ));
  end if;
  if photo_count < 1 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'field', 'photos',
      'message', 'Add at least one photo.'
    ));
  end if;
  return issues;
end;
$$;

create or replace function listing_content_json(p_listing_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', nullif(btrim(h.name), ''),
    'type', nullif(btrim(h.type), ''),
    'location', jsonb_build_object(
      'city', nullif(btrim(h.city), ''),
      'region', nullif(btrim(h.region), ''),
      'country', nullif(btrim(h.country), '')
    ),
    'beds', h.beds,
    'baths', h.baths,
    'guests', nullif(h.guests, 0),
    'nightlyRatePaise', nullif(h.nightly_rate_paise, 0),
    'description', nullif(btrim(h.description), ''),
    'amenities', coalesce(
      (select jsonb_agg(a.amenity order by a.amenity) from home_amenities a where a.home_id = h.id),
      '[]'::jsonb
    ),
    'photos', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', p.id, 'src', p.src, 'alt', p.alt)
          order by p.sort_order
        )
        from home_photos p
        where p.home_id = h.id
      ),
      '[]'::jsonb
    )
  )
  from homes h
  where h.id = p_listing_id;
$$;

create or replace function listing_snapshot(p_listing_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'listing', jsonb_build_object(
      'id', h.id,
      'slug', h.slug,
      'status', h.status,
      'publishedAt', h.published_at,
      'updatedAt', h.updated_at,
      'content', c.content
    ),
    'readiness', case
      when jsonb_array_length(r.issues) = 0 then
        jsonb_build_object('ready', true, 'content', c.content)
      else
        jsonb_build_object('ready', false, 'issues', r.issues)
    end
  )
  from homes h
  cross join lateral (select listing_readiness(h.id) as issues) r
  cross join lateral (select listing_content_json(h.id) as content) c
  where h.id = p_listing_id;
$$;

create or replace function listing_require_host()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  host text := (select auth.jwt() ->> 'sub');
begin
  if host is null or host = '' then
    raise exception 'signed in host required';
  end if;
  return host;
end;
$$;

create or replace function listing_owned_for_update(p_listing_id uuid)
returns homes
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  listing homes;
begin
  select * into listing
  from homes
  where id = p_listing_id
    and host_id = host
  for update;
  if not found then
    raise exception 'listing not found';
  end if;
  return listing;
end;
$$;

create or replace function my_listings(p_listing_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(listing_snapshot(h.id) order by h.updated_at desc), '[]'::jsonb)
  from homes h
  where h.host_id = (select auth.jwt() ->> 'sub')
    and (p_listing_id is null or h.id = p_listing_id);
$$;

create or replace function create_listing_draft()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  new_id uuid := gen_random_uuid();
  draft_count integer;
  next_sort integer;
begin
  select count(*) into draft_count
  from homes
  where host_id = host
    and status = 'draft';
  if draft_count >= 10 then
    raise exception 'too many drafts';
  end if;
  select coalesce(max(sort_order), 0) + 1 into next_sort from homes;
  insert into homes (
    id,
    host_id,
    status,
    slug,
    name,
    type,
    city,
    region,
    country,
    description,
    beds,
    baths,
    guests,
    nightly_rate_paise,
    rating,
    review_count,
    savings_paise,
    badges,
    sort_order,
    published_at
  ) values (
    new_id,
    host,
    'draft',
    'draft-' || left(replace(new_id::text, '-', ''), 12),
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    '{}',
    next_sort,
    null
  );
  return listing_snapshot(new_id);
end;
$$;

create or replace function save_listing_draft(p_listing_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  listing homes;
  allowed constant text[] := array[
    'name', 'type', 'city', 'region', 'country',
    'beds', 'baths', 'guests', 'nightlyRatePaise',
    'description', 'amenities', 'photos'
  ];
  v_key text;
  v_text text;
  v_int integer;
begin
  listing := listing_owned_for_update(p_listing_id);
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be an object';
  end if;
  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not v_key = any (allowed) then
      raise exception 'field % cannot be set by the host', v_key using errcode = '42501';
    end if;
  end loop;

  if p_patch ? 'name' then
    update homes set name = btrim(coalesce(p_patch->>'name', '')) where id = p_listing_id;
  end if;
  if p_patch ? 'type' then
    v_text := btrim(coalesce(p_patch->>'type', ''));
    if v_text <> '' and not exists (
      select 1 from listing_options o where o.kind = 'type' and o.value = v_text
    ) then
      raise exception 'unknown type';
    end if;
    update homes set type = v_text where id = p_listing_id;
  end if;
  if p_patch ? 'city' then
    update homes set city = btrim(coalesce(p_patch->>'city', '')) where id = p_listing_id;
  end if;
  if p_patch ? 'region' then
    update homes set region = btrim(coalesce(p_patch->>'region', '')) where id = p_listing_id;
  end if;
  if p_patch ? 'country' then
    update homes set country = btrim(coalesce(p_patch->>'country', '')) where id = p_listing_id;
  end if;
  if p_patch ? 'description' then
    update homes set description = btrim(coalesce(p_patch->>'description', '')) where id = p_listing_id;
  end if;
  if p_patch ? 'beds' then
    v_int := (p_patch->>'beds')::integer;
    if v_int < 0 or v_int > 50 then
      raise exception 'beds must be between 0 and 50';
    end if;
    update homes set beds = v_int where id = p_listing_id;
  end if;
  if p_patch ? 'baths' then
    v_int := (p_patch->>'baths')::integer;
    if v_int < 0 or v_int > 50 then
      raise exception 'baths must be between 0 and 50';
    end if;
    update homes set baths = v_int where id = p_listing_id;
  end if;
  if p_patch ? 'guests' then
    v_int := (p_patch->>'guests')::integer;
    if v_int < 0 or v_int > 50 then
      raise exception 'guests must be between 0 and 50';
    end if;
    update homes set guests = v_int where id = p_listing_id;
  end if;
  if p_patch ? 'nightlyRatePaise' then
    v_int := (p_patch->>'nightlyRatePaise')::integer;
    if v_int < 0 or (v_int > 0 and v_int < 50000) or v_int > 500000000 then
      raise exception 'nightly rate must be between ₹500 and ₹50,00,000';
    end if;
    update homes set nightly_rate_paise = v_int where id = p_listing_id;
  end if;

  if p_patch ? 'amenities' then
    if jsonb_typeof(p_patch->'amenities') <> 'array' then
      raise exception 'amenities must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements_text(p_patch->'amenities') amenity
      where not exists (
        select 1 from listing_options o where o.kind = 'amenity' and o.value = amenity
      )
    ) then
      raise exception 'unknown amenity';
    end if;
    delete from home_amenities where home_id = p_listing_id;
    insert into home_amenities (home_id, amenity)
    select distinct p_listing_id, amenity
    from jsonb_array_elements_text(p_patch->'amenities') amenity;
  end if;

  if p_patch ? 'photos' then
    if jsonb_typeof(p_patch->'photos') <> 'array' then
      raise exception 'photos must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(p_patch->'photos') elem
      where (elem->>'id') is null
         or not exists (
           select 1 from home_photos hp
           where hp.id = (elem->>'id')::uuid
             and hp.home_id = p_listing_id
         )
    ) then
      raise exception 'listing not found';
    end if;
    delete from home_photos
    where home_id = p_listing_id
      and id not in (
        select (elem->>'id')::uuid
        from jsonb_array_elements(p_patch->'photos') elem
      );
    update home_photos hp
    set
      alt = left(coalesce(nullif(btrim(photo.elem->>'alt'), ''), hp.alt), 160),
      sort_order = (photo.ord - 1)::integer
    from jsonb_array_elements(p_patch->'photos') with ordinality as photo(elem, ord)
    where hp.id = (photo.elem->>'id')::uuid
      and hp.home_id = p_listing_id;
  end if;

  update homes set updated_at = now() where id = p_listing_id;
  return listing_snapshot(p_listing_id);
end;
$$;

create or replace function listing_slug(p_name text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 1;
  suffix text;
begin
  base := lower(coalesce(p_name, ''));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  base := left(base, 60);
  if base = '' then
    base := 'home';
  end if;
  candidate := base;
  while exists (select 1 from homes where slug = candidate) loop
    n := n + 1;
    suffix := '-' || n::text;
    candidate := left(base, greatest(1, 60 - length(suffix))) || suffix;
  end loop;
  return candidate;
end;
$$;

create or replace function publish_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  listing homes;
  issues jsonb;
  new_slug text;
begin
  listing := listing_owned_for_update(p_listing_id);
  issues := listing_readiness(p_listing_id);
  if jsonb_array_length(issues) > 0 then
    raise exception 'listing incomplete'
      using errcode = 'P0001', detail = issues::text;
  end if;
  if listing.status = 'draft' then
    new_slug := listing_slug(listing.name);
    update homes
    set
      slug = new_slug,
      status = 'published',
      published_at = now(),
      updated_at = now()
    where id = p_listing_id;
  else
    update homes
    set
      status = 'published',
      updated_at = now()
    where id = p_listing_id;
  end if;
  return listing_snapshot(p_listing_id);
end;
$$;

create or replace function unlist_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  listing homes;
begin
  listing := listing_owned_for_update(p_listing_id);
  if listing.status = 'draft' then
    raise exception 'a draft is not listed';
  end if;
  update homes
  set
    status = 'unlisted',
    updated_at = now()
  where id = p_listing_id;
  return listing_snapshot(p_listing_id);
end;
$$;

create or replace function attach_listing_photo(
  p_listing_id uuid,
  p_storage_path text,
  p_alt text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  listing homes;
  photo_count integer;
begin
  listing := listing_owned_for_update(p_listing_id);
  if split_part(p_storage_path, '/', 1) <> host then
    raise exception 'listing not found';
  end if;
  if split_part(p_storage_path, '/', 2) <> p_listing_id::text then
    raise exception 'listing not found';
  end if;
  select count(*) into photo_count from home_photos where home_id = p_listing_id;
  if photo_count >= 20 then
    raise exception 'too many photos';
  end if;
  insert into home_photos (home_id, src, alt, sort_order)
  values (
    p_listing_id,
    'storage:listing-photos/' || p_storage_path,
    left(coalesce(nullif(btrim(p_alt), ''), nullif(btrim(listing.name), ''), 'Photo'), 160),
    coalesce((select max(sort_order) + 1 from home_photos where home_id = p_listing_id), 0)
  );
  update homes set updated_at = now() where id = p_listing_id;
  return listing_snapshot(p_listing_id);
end;
$$;

create or replace function listing_jwt_sub()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function create_pending_booking(
  p_home_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_razorpay_order_id text
)
returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  guest text := (select auth.jwt() ->> 'sub');
  home_row homes%rowtype;
  quote record;
  inserted bookings;
  night_count integer;
begin
  if guest is null or guest = '' then
    raise exception 'signed in guest required';
  end if;
  perform expire_pending_bookings();
  select * into home_row from homes where id = p_home_id and status = 'published';
  if not found then
    raise exception 'home not found';
  end if;
  if p_guests < 1 or p_guests > home_row.guests then
    raise exception 'guest count not allowed';
  end if;
  night_count := p_check_out - p_check_in;
  if night_count <= 0 then
    raise exception 'check-out must be after check-in';
  end if;
  select * into quote from quote_stay(home_row.nightly_rate_paise, night_count);
  insert into bookings (
    home_id,
    guest_id,
    check_in,
    check_out,
    guests,
    nights,
    subtotal_paise,
    service_fee_paise,
    cleaning_fee_paise,
    total_paise,
    razorpay_order_id,
    expires_at,
    status
  )
  values (
    p_home_id,
    guest,
    p_check_in,
    p_check_out,
    p_guests,
    quote.nights,
    quote.subtotal_paise,
    quote.service_fee_paise,
    quote.cleaning_fee_paise,
    quote.total_paise,
    p_razorpay_order_id,
    now() + interval '15 minutes',
    'pending_payment'
  )
  returning * into inserted;
  return inserted;
end;
$$;

drop policy if exists "homes are public" on homes;
create policy "homes are visible when published or booked"
  on homes for select to anon, authenticated
  using (can_view_home(id));

drop policy if exists "home photos are public" on home_photos;
create policy "home photos follow the home" on home_photos
  for select to anon, authenticated using (can_view_home(home_id));

drop policy if exists "home amenities are public" on home_amenities;
create policy "home amenities follow the home" on home_amenities
  for select to anon, authenticated using (can_view_home(home_id));

drop policy if exists "home categories are public" on home_categories;
create policy "home categories follow the home" on home_categories
  for select to anon, authenticated using (can_view_home(home_id));

drop policy if exists "anyone can apply to list" on listing_applications;

revoke insert, update, delete on homes, home_photos, home_amenities, home_categories
  from anon, authenticated;

revoke all on table homes from anon, authenticated;
grant select (
  id,
  slug,
  name,
  type,
  city,
  region,
  country,
  beds,
  baths,
  guests,
  nightly_rate_paise,
  rating,
  review_count,
  savings_paise,
  badges,
  description,
  sort_order,
  status,
  published_at,
  updated_at
) on table homes to anon, authenticated;

revoke all on function
  my_listings(uuid),
  create_listing_draft(),
  save_listing_draft(uuid, jsonb),
  publish_listing(uuid),
  unlist_listing(uuid),
  attach_listing_photo(uuid, text, text),
  listing_readiness(uuid),
  listing_snapshot(uuid),
  listing_content_json(uuid),
  listing_require_host(),
  listing_owned_for_update(uuid),
  listing_slug(text),
  listing_jwt_sub(),
  can_view_home(uuid)
  from public, anon;

grant execute on function
  my_listings(uuid),
  create_listing_draft(),
  save_listing_draft(uuid, jsonb),
  publish_listing(uuid),
  unlist_listing(uuid),
  attach_listing_photo(uuid, text, text),
  listing_jwt_sub()
  to authenticated;

grant execute on function can_view_home(uuid) to anon, authenticated;

revoke all on function create_pending_booking(uuid, date, date, integer, text) from public, anon;
grant execute on function create_pending_booking(uuid, date, date, integer, text) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hosts upload listing photos under their prefix" on storage.objects;
create policy "hosts upload listing photos under their prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists "hosts delete their listing photos" on storage.objects;
create policy "hosts delete their listing photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists "listing photos are readable" on storage.objects;
create policy "listing photos are readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');
