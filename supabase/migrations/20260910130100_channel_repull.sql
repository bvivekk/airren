create type repull_connection_state as enum ('connecting', 'active', 'revoked');
create type repull_projection_state as enum (
  'needs_mapping',
  'applied',
  'conflict',
  'cancelled'
);
create type repull_event_outcome as enum (
  'applied',
  'cancelled',
  'needs_mapping',
  'conflict'
);

create table public.repull_connect_attempts (
  id uuid primary key default gen_random_uuid(),
  state_digest text not null unique,
  airren_host_id text not null,
  return_to text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.repull_connections (
  id uuid primary key default gen_random_uuid(),
  airren_host_id text not null,
  repull_account_id text not null unique,
  repull_host_id text not null,
  access_type text not null check (access_type = 'read_only'),
  state repull_connection_state not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.repull_listing_links (
  connection_id uuid not null references repull_connections (id),
  platform text not null check (platform = 'airbnb'),
  repull_listing_id text not null,
  home_id uuid not null references homes (id),
  mapped_at timestamptz not null default now(),
  disabled_at timestamptz,
  primary key (platform, repull_listing_id)
);

create unique index repull_listing_links_one_home
  on repull_listing_links (connection_id, home_id)
  where disabled_at is null;

create table public.repull_remote_listings (
  connection_id uuid not null references repull_connections (id) on delete cascade,
  platform text not null check (platform = 'airbnb'),
  repull_listing_id text not null,
  display_name text not null,
  fetched_at timestamptz not null default now(),
  primary key (connection_id, platform, repull_listing_id)
);

create table public.repull_reservations (
  reservation_id text primary key,
  platform text not null check (platform = 'airbnb'),
  repull_listing_id text not null,
  connection_id uuid references repull_connections (id),
  home_id uuid references homes (id),
  external_ref text not null unique,
  desired_nights daterange,
  state repull_projection_state not null,
  occupancy_id uuid references occupancy (id) on delete set null,
  last_event_id text not null,
  conflict_code text,
  observed_at timestamptz not null,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (external_ref = 'repull:reservation:' || reservation_id),
  check (
    (state = 'needs_mapping' and home_id is null and desired_nights is not null and occupancy_id is null)
    or (state = 'applied' and home_id is not null and desired_nights is not null and occupancy_id is not null)
    or (state = 'conflict' and home_id is not null and desired_nights is not null)
    or (state = 'cancelled' and occupancy_id is null)
  )
);

create table public.repull_event_inbox (
  event_id text primary key,
  event_type text not null,
  reservation_id text not null,
  payload_digest text not null,
  observed_at timestamptz not null,
  outcome repull_event_outcome,
  processed_at timestamptz,
  check ((outcome is null) = (processed_at is null))
);

alter table repull_connect_attempts enable row level security;
alter table repull_connections enable row level security;
alter table repull_listing_links enable row level security;
alter table repull_remote_listings enable row level security;
alter table repull_reservations enable row level security;
alter table repull_event_inbox enable row level security;

revoke all on table
  repull_connect_attempts,
  repull_connections,
  repull_listing_links,
  repull_remote_listings,
  repull_reservations,
  repull_event_inbox
  from public, anon, authenticated;

create or replace function release_host_occupancy(p_occupancy_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  occ occupancy;
begin
  select o.* into occ
  from occupancy o
  join homes h on h.id = o.home_id
  where o.id = p_occupancy_id and h.host_id = host
  for update of o;
  if not found then
    raise exception 'listing not found';
  end if;
  if occ.source is distinct from 'host' then
    raise exception 'that stay was booked on Airren' using errcode = '42501';
  end if;
  delete from occupancy where id = occ.id;
  return listing_calendar(occ.home_id, current_date, current_date + 400);
end;
$$;

create or replace function reschedule_host_occupancy(
  p_occupancy_id uuid,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  occ occupancy;
begin
  select o.* into occ
  from occupancy o
  join homes h on h.id = o.home_id
  where o.id = p_occupancy_id and h.host_id = host
  for update of o;
  if not found then
    raise exception 'listing not found';
  end if;
  if occ.source is distinct from 'host' then
    raise exception 'that stay was booked on Airren' using errcode = '42501';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'check-out must be after check-in';
  end if;
  update occupancy
  set nights = daterange(p_check_in, p_check_out, '[)')
  where id = occ.id;
  return listing_calendar(occ.home_id, current_date, current_date + 400);
end;
$$;

create or replace function repull_projection_result(
  p_outcome repull_event_outcome,
  p_reservation_id text
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select case p_outcome
    when 'applied' then jsonb_build_object(
      'kind', 'applied',
      'occupancyId', (
        select occupancy_id
        from repull_reservations
        where reservation_id = p_reservation_id
      )
    )
    when 'cancelled' then jsonb_build_object('kind', 'cancelled')
    when 'needs_mapping' then jsonb_build_object('kind', 'needs_mapping')
    when 'conflict' then jsonb_build_object('kind', 'conflict')
  end;
$$;

create or replace function process_repull_occupancy_event(
  p_event_id text,
  p_event_type text,
  p_kind text,
  p_platform text,
  p_listing_id text,
  p_reservation_id text,
  p_check_in date,
  p_check_out date,
  p_label text,
  p_observed_at timestamptz,
  p_payload_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
  inbox_row repull_event_inbox;
  pinned repull_reservations;
  mapped_home uuid;
  mapped_connection uuid;
  target_home uuid;
  target_connection uuid;
  host_sub text;
  occ_id uuid;
  nights daterange;
  external_key text;
  result jsonb;
begin
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'event required';
  end if;
  if p_reservation_id is null or btrim(p_reservation_id) = '' then
    raise exception 'reservation required';
  end if;
  if p_platform is distinct from 'airbnb' then
    raise exception 'unsupported platform';
  end if;
  if p_kind not in ('upsert', 'release') then
    raise exception 'invalid kind';
  end if;
  if p_event_type not in (
    'reservation.created',
    'reservation.updated',
    'reservation.cancelled',
    'reconciliation'
  ) then
    raise exception 'invalid event type';
  end if;

  insert into repull_event_inbox (
    event_id, event_type, reservation_id, payload_digest, observed_at
  ) values (
    p_event_id, p_event_type, p_reservation_id, p_payload_digest, p_observed_at
  )
  on conflict (event_id) do nothing;
  get diagnostics claimed = row_count;

  if claimed = 0 then
    select * into inbox_row from repull_event_inbox where event_id = p_event_id;
    if inbox_row.payload_digest is distinct from p_payload_digest then
      raise exception 'event payload mismatch';
    end if;
    return jsonb_build_object(
      'kind', 'duplicate',
      'original', repull_projection_result(inbox_row.outcome, inbox_row.reservation_id)
    );
  end if;

  external_key := 'repull:reservation:' || p_reservation_id;

  select * into pinned
  from repull_reservations
  where reservation_id = p_reservation_id
  for update;

  select ll.home_id, ll.connection_id
  into mapped_home, mapped_connection
  from repull_listing_links ll
  join repull_connections c on c.id = ll.connection_id
  where ll.platform = p_platform
    and ll.repull_listing_id = p_listing_id
    and ll.disabled_at is null
    and c.state = 'active';

  if p_kind = 'release' then
    target_home := coalesce(pinned.home_id, mapped_home);
    target_connection := coalesce(pinned.connection_id, mapped_connection);
    if target_home is not null then
      delete from occupancy
      where home_id = target_home
        and external_ref = external_key
        and source = 'external';
    end if;
    insert into repull_reservations (
      reservation_id,
      platform,
      repull_listing_id,
      connection_id,
      home_id,
      external_ref,
      desired_nights,
      state,
      occupancy_id,
      last_event_id,
      conflict_code,
      observed_at,
      resolved_at,
      updated_at
    ) values (
      p_reservation_id,
      p_platform,
      p_listing_id,
      target_connection,
      target_home,
      external_key,
      pinned.desired_nights,
      'cancelled',
      null,
      p_event_id,
      null,
      p_observed_at,
      null,
      now()
    )
    on conflict (reservation_id) do update set
      platform = excluded.platform,
      repull_listing_id = excluded.repull_listing_id,
      connection_id = coalesce(repull_reservations.connection_id, excluded.connection_id),
      home_id = coalesce(repull_reservations.home_id, excluded.home_id),
      state = 'cancelled',
      occupancy_id = null,
      last_event_id = excluded.last_event_id,
      conflict_code = null,
      observed_at = excluded.observed_at,
      updated_at = now();
    update repull_event_inbox
    set outcome = 'cancelled', processed_at = now()
    where event_id = p_event_id;
    return jsonb_build_object('kind', 'cancelled');
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'check-out must be after check-in';
  end if;
  nights := daterange(p_check_in, p_check_out, '[)');
  target_home := coalesce(pinned.home_id, mapped_home);
  target_connection := coalesce(pinned.connection_id, mapped_connection);

  if target_home is null then
    insert into repull_reservations (
      reservation_id,
      platform,
      repull_listing_id,
      connection_id,
      home_id,
      external_ref,
      desired_nights,
      state,
      occupancy_id,
      last_event_id,
      conflict_code,
      observed_at,
      resolved_at,
      updated_at
    ) values (
      p_reservation_id,
      p_platform,
      p_listing_id,
      mapped_connection,
      null,
      external_key,
      nights,
      'needs_mapping',
      null,
      p_event_id,
      null,
      p_observed_at,
      null,
      now()
    )
    on conflict (reservation_id) do update set
      platform = excluded.platform,
      repull_listing_id = excluded.repull_listing_id,
      desired_nights = excluded.desired_nights,
      state = 'needs_mapping',
      occupancy_id = null,
      last_event_id = excluded.last_event_id,
      conflict_code = null,
      observed_at = excluded.observed_at,
      updated_at = now();
    update repull_event_inbox
    set outcome = 'needs_mapping', processed_at = now()
    where event_id = p_event_id;
    return jsonb_build_object('kind', 'needs_mapping');
  end if;

  select host_id into host_sub from homes where id = target_home;
  perform release_expired_holds();

  begin
    insert into occupancy (home_id, nights, source, label, external_ref, created_by)
    values (
      target_home,
      nights,
      'external',
      nullif(btrim(p_label), ''),
      external_key,
      coalesce(host_sub, 'external')
    )
    on conflict (home_id, external_ref) where external_ref is not null
      do update set nights = excluded.nights, label = excluded.label
    returning id into occ_id;

    insert into repull_reservations (
      reservation_id,
      platform,
      repull_listing_id,
      connection_id,
      home_id,
      external_ref,
      desired_nights,
      state,
      occupancy_id,
      last_event_id,
      conflict_code,
      observed_at,
      resolved_at,
      updated_at
    ) values (
      p_reservation_id,
      p_platform,
      p_listing_id,
      target_connection,
      target_home,
      external_key,
      nights,
      'applied',
      occ_id,
      p_event_id,
      null,
      p_observed_at,
      null,
      now()
    )
    on conflict (reservation_id) do update set
      platform = excluded.platform,
      repull_listing_id = excluded.repull_listing_id,
      connection_id = coalesce(repull_reservations.connection_id, excluded.connection_id),
      home_id = coalesce(repull_reservations.home_id, excluded.home_id),
      desired_nights = excluded.desired_nights,
      state = 'applied',
      occupancy_id = excluded.occupancy_id,
      last_event_id = excluded.last_event_id,
      conflict_code = null,
      observed_at = excluded.observed_at,
      resolved_at = null,
      updated_at = now();

    update repull_event_inbox
    set outcome = 'applied', processed_at = now()
    where event_id = p_event_id;
    result := jsonb_build_object('kind', 'applied', 'occupancyId', occ_id);
  exception
    when exclusion_violation then
      insert into repull_reservations (
        reservation_id,
        platform,
        repull_listing_id,
        connection_id,
        home_id,
        external_ref,
        desired_nights,
        state,
        occupancy_id,
        last_event_id,
        conflict_code,
        observed_at,
        resolved_at,
        updated_at
      ) values (
        p_reservation_id,
        p_platform,
        p_listing_id,
        target_connection,
        target_home,
        external_key,
        nights,
        'conflict',
        pinned.occupancy_id,
        p_event_id,
        '23P01',
        p_observed_at,
        null,
        now()
      )
      on conflict (reservation_id) do update set
        platform = excluded.platform,
        repull_listing_id = excluded.repull_listing_id,
        connection_id = coalesce(repull_reservations.connection_id, excluded.connection_id),
        home_id = coalesce(repull_reservations.home_id, excluded.home_id),
        desired_nights = excluded.desired_nights,
        state = 'conflict',
        occupancy_id = repull_reservations.occupancy_id,
        last_event_id = excluded.last_event_id,
        conflict_code = '23P01',
        observed_at = excluded.observed_at,
        updated_at = now();
      update repull_event_inbox
      set outcome = 'conflict', processed_at = now()
      where event_id = p_event_id;
      result := jsonb_build_object('kind', 'conflict');
  end;

  return result;
end;
$$;

revoke all on function process_repull_occupancy_event(
  text, text, text, text, text, text, date, date, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function process_repull_occupancy_event(
  text, text, text, text, text, text, date, date, text, timestamptz, text
) to service_role;

revoke all on function repull_projection_result(repull_event_outcome, text)
  from public, anon, authenticated;
grant execute on function repull_projection_result(repull_event_outcome, text)
  to service_role;

create or replace function start_repull_connect_attempt(p_return_to text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  digest text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  safe_return text;
begin
  safe_return := case
    when p_return_to ~ '^/host/' and p_return_to !~ '//' then p_return_to
    else '/host/listings'
  end;
  insert into repull_connect_attempts (state_digest, airren_host_id, return_to, expires_at)
  values (digest, host, safe_return, now() + interval '30 minutes');
  return jsonb_build_object('stateDigest', digest, 'returnTo', safe_return);
end;
$$;

create or replace function complete_repull_connect_attempt(
  p_state_digest text,
  p_account_id text,
  p_host_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  attempt repull_connect_attempts;
  connection_row repull_connections;
begin
  if p_account_id is null or btrim(p_account_id) = '' or p_host_id is null or btrim(p_host_id) = '' then
    raise exception 'connection ids required';
  end if;
  if exists (
    select 1
    from repull_connections c
    where c.repull_account_id = btrim(p_account_id)
      and c.airren_host_id is distinct from host
  ) then
    raise exception 'account already connected';
  end if;
  select * into attempt
  from repull_connect_attempts
  where state_digest = p_state_digest
  for update;
  if not found or attempt.airren_host_id is distinct from host then
    raise exception 'connect attempt not found';
  end if;
  if attempt.consumed_at is not null then
    raise exception 'connect attempt already used';
  end if;
  if attempt.expires_at < now() then
    raise exception 'connect attempt expired';
  end if;
  update repull_connect_attempts
  set consumed_at = now()
  where id = attempt.id;
  insert into repull_connections (
    airren_host_id, repull_account_id, repull_host_id, access_type, state
  ) values (
    host, btrim(p_account_id), btrim(p_host_id), 'read_only', 'active'
  )
  on conflict (repull_account_id) do update set
    airren_host_id = excluded.airren_host_id,
    repull_host_id = excluded.repull_host_id,
    access_type = 'read_only',
    state = 'active',
    revoked_at = null
  returning * into connection_row;
  return jsonb_build_object(
    'connectionId', connection_row.id,
    'returnTo', attempt.return_to
  );
end;
$$;

create or replace function replace_repull_remote_listings(
  p_connection_id uuid,
  p_listings jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer := 0;
  item jsonb;
begin
  if not exists (select 1 from repull_connections where id = p_connection_id) then
    raise exception 'connection not found';
  end if;
  if p_listings is null or jsonb_typeof(p_listings) is distinct from 'array' then
    raise exception 'listings required';
  end if;
  delete from repull_remote_listings where connection_id = p_connection_id;
  for item in select value from jsonb_array_elements(p_listings)
  loop
    insert into repull_remote_listings (
      connection_id, platform, repull_listing_id, display_name, fetched_at
    ) values (
      p_connection_id,
      coalesce(nullif(item->>'platform', ''), 'airbnb'),
      item->>'listingId',
      coalesce(nullif(item->>'displayName', ''), item->>'listingId'),
      now()
    );
    written := written + 1;
  end loop;
  return written;
end;
$$;

create or replace function repull_listing_status(
  p_connection_id uuid,
  p_platform text,
  p_listing_id text,
  p_home_id uuid
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select case
    when p_home_id is null then jsonb_build_object('kind', 'needs_mapping')
    when exists (
      select 1
      from repull_reservations r
      where r.connection_id = p_connection_id
        and r.platform = p_platform
        and r.repull_listing_id = p_listing_id
        and r.state = 'conflict'
    ) then (
      select jsonb_build_object(
        'kind', 'conflict',
        'reservationId', r.reservation_id,
        'stay', jsonb_build_object('from', lower(r.desired_nights), 'to', upper(r.desired_nights)),
        'resolvedAt', r.resolved_at
      )
      from repull_reservations r
      where r.connection_id = p_connection_id
        and r.platform = p_platform
        and r.repull_listing_id = p_listing_id
        and r.state = 'conflict'
      order by r.updated_at desc
      limit 1
    )
    else jsonb_build_object('kind', 'ready')
  end;
$$;

create or replace function map_repull_listing(
  p_connection_id uuid,
  p_platform text,
  p_listing_id text,
  p_home_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  host text := listing_require_host();
  fetched timestamptz;
begin
  perform listing_owned_for_update(p_home_id);
  if not exists (
    select 1
    from repull_connections c
    where c.id = p_connection_id
      and c.airren_host_id = host
      and c.state = 'active'
  ) then
    raise exception 'connection not found';
  end if;
  if p_platform is distinct from 'airbnb' then
    raise exception 'unsupported platform';
  end if;
  select rl.fetched_at into fetched
  from repull_remote_listings rl
  where rl.connection_id = p_connection_id
    and rl.platform = p_platform
    and rl.repull_listing_id = p_listing_id;
  if not found then
    raise exception 'listing not in fetched set';
  end if;
  if fetched < now() - interval '30 minutes' then
    raise exception 'remote listings are stale';
  end if;
  update repull_listing_links
  set disabled_at = now()
  where connection_id = p_connection_id
    and home_id = p_home_id
    and disabled_at is null
    and repull_listing_id is distinct from p_listing_id;
  insert into repull_listing_links (
    connection_id, platform, repull_listing_id, home_id, mapped_at, disabled_at
  ) values (
    p_connection_id, p_platform, p_listing_id, p_home_id, now(), null
  )
  on conflict (platform, repull_listing_id) do update set
    connection_id = excluded.connection_id,
    home_id = excluded.home_id,
    mapped_at = now(),
    disabled_at = null;
  return repull_listing_status(p_connection_id, p_platform, p_listing_id, p_home_id);
end;
$$;

create or replace function repull_mapping_model(p_connection_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  host text := listing_require_host();
  connection_row repull_connections;
  listings jsonb;
  issues jsonb;
begin
  select * into connection_row
  from repull_connections
  where id = p_connection_id
    and airren_host_id = host;
  if not found then
    raise exception 'connection not found';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'platform', rl.platform,
      'listingId', rl.repull_listing_id,
      'displayName', rl.display_name,
      'mappedHomeId', ll.home_id,
      'status', repull_listing_status(p_connection_id, rl.platform, rl.repull_listing_id, ll.home_id)
    )
    order by rl.display_name
  ), '[]'::jsonb)
  into listings
  from repull_remote_listings rl
  left join repull_listing_links ll
    on ll.connection_id = rl.connection_id
   and ll.platform = rl.platform
   and ll.repull_listing_id = rl.repull_listing_id
   and ll.disabled_at is null
  where rl.connection_id = p_connection_id;
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into issues
  from (
    select value as item
    from jsonb_array_elements(listings) listing
    where listing->'status'->>'kind' in ('needs_mapping', 'conflict')
  ) pending;
  return jsonb_build_object(
    'connectionId', connection_row.id,
    'access', connection_row.access_type,
    'listings', listings,
    'issues', issues
  );
end;
$$;

create or replace function list_repull_connections()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'connectionId', c.id,
      'access', c.access_type,
      'state', c.state
    )
    order by c.created_at
  ), '[]'::jsonb)
  from repull_connections c
  where c.airren_host_id = (select auth.jwt() ->> 'sub')
    and c.state = 'active';
$$;

create or replace function channel_issues_for_home(p_home_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  host text := listing_require_host();
begin
  if not exists (select 1 from homes h where h.id = p_home_id and h.host_id = host) then
    raise exception 'listing not found';
  end if;
  return coalesce(
    (
      select jsonb_agg(issue)
      from (
        select jsonb_build_object('kind', 'needs_mapping') as issue
        where exists (
          select 1
          from repull_connections c
          join repull_remote_listings rl on rl.connection_id = c.id
          left join repull_listing_links ll
            on ll.connection_id = rl.connection_id
           and ll.platform = rl.platform
           and ll.repull_listing_id = rl.repull_listing_id
           and ll.disabled_at is null
          where c.airren_host_id = host
            and c.state = 'active'
            and ll.home_id is null
        )
        union all
        select jsonb_build_object(
          'kind', 'conflict',
          'reservationId', r.reservation_id,
          'stay', jsonb_build_object('from', lower(r.desired_nights), 'to', upper(r.desired_nights)),
          'resolvedAt', r.resolved_at
        )
        from repull_reservations r
        where r.home_id = p_home_id
          and r.state = 'conflict'
      ) issues
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function
  start_repull_connect_attempt(text),
  complete_repull_connect_attempt(text, text, text),
  map_repull_listing(uuid, text, text, uuid),
  repull_mapping_model(uuid),
  list_repull_connections(),
  channel_issues_for_home(uuid),
  repull_listing_status(uuid, text, text, uuid)
  from public, anon;
grant execute on function
  start_repull_connect_attempt(text),
  complete_repull_connect_attempt(text, text, text),
  map_repull_listing(uuid, text, text, uuid),
  repull_mapping_model(uuid),
  list_repull_connections(),
  channel_issues_for_home(uuid)
  to authenticated;

revoke all on function replace_repull_remote_listings(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function replace_repull_remote_listings(uuid, jsonb)
  to service_role;
