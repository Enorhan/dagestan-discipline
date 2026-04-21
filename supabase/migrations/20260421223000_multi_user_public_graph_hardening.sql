begin;

-- ---------------------------------------------------------------------------
-- Username resolution + server-side auth bootstrap hardening
-- ---------------------------------------------------------------------------

create or replace function public.resolve_available_username(
  p_raw text,
  p_exclude_user_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix text;
  v_attempt int;
begin
  v_base := public.slugify_username(p_raw);
  if v_base is null or v_base = '' then
    v_base := 'grappler';
  end if;
  if length(v_base) < 3 then
    v_base := rpad(v_base, 3, '_');
  end if;
  v_base := left(v_base, 30);

  for v_attempt in 0..200 loop
    if v_attempt = 0 then
      v_candidate := v_base;
    else
      v_suffix := '_' || v_attempt::text;
      v_candidate := left(v_base, greatest(3, 30 - length(v_suffix))) || v_suffix;
    end if;

    if not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(v_candidate)
        and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
    ) then
      return v_candidate;
    end if;
  end loop;

  for v_attempt in 0..20 loop
    v_candidate := left('grappler_' || replace(gen_random_uuid()::text, '-', ''), 30);
    if not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(v_candidate)
        and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
    ) then
      return v_candidate;
    end if;
  end loop;

  raise exception 'username_resolution_failed';
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display text;
  v_sport text;
  v_branch text;
  v_branch_raw text;
  meta jsonb;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username := public.resolve_available_username(
    coalesce(
      nullif(trim(meta->>'username'), ''),
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'grappler_' || substr(replace(new.id::text, '-', ''), 1, 8)
    ),
    new.id
  );

  v_display := left(coalesce(
    nullif(trim(meta->>'display_name'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(trim(meta->>'given_name'), ''),
    v_username
  ), 120);

  v_sport := coalesce(nullif(trim(lower(meta->>'sport')), ''), 'bjj');
  if v_sport not in ('bjj', 'wrestling', 'judo') then
    v_sport := 'bjj';
  end if;

  v_branch_raw := nullif(trim(lower(coalesce(
    meta->>'primary_discipline',
    meta->>'branch',
    meta->>'martial_art',
    v_sport
  ))), '');
  v_branch := case
    when v_branch_raw in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo') then v_branch_raw
    when v_branch_raw in ('muay thai', 'thai boxing') then 'muay-thai'
    when v_branch_raw in ('jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu') then 'bjj'
    when v_branch_raw = 'mixed martial arts' then 'mma'
    when v_branch_raw in ('tae kwon do', 'tkd') then 'taekwondo'
    when v_sport in ('wrestling', 'judo') then v_sport
    else 'bjj'
  end;

  insert into public.profiles (
    id,
    username,
    display_name,
    sport,
    avatar_url,
    bio,
    training_days,
    weight_unit,
    equipment,
    experience_level,
    bodyweight_kg,
    primary_goal,
    combat_sessions_per_week,
    session_minutes,
    injury_notes,
    onboarding_completed,
    is_premium,
    first_active_at,
    stripe_customer_id,
    subscription_status,
    subscription_period_end,
    belt,
    stripes,
    gym_name,
    privacy,
    primary_discipline,
    xp,
    level,
    favorite_content_types,
    heard_from,
    biggest_challenges,
    bjj_paywall_completed,
    bjj_coach_marks_seen,
    search_tutorial_seen
  )
  values (
    new.id,
    v_username,
    v_display,
    v_sport,
    null,
    '',
    3,
    'kg',
    null,
    'beginner',
    null,
    'balanced',
    3,
    90,
    null,
    false,
    false,
    null,
    null,
    null,
    null,
    'white',
    0,
    '',
    'public',
    v_branch,
    50,
    1,
    '{}'::text[],
    null,
    '{}'::text[],
    false,
    false,
    false
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.ensure_profile_from_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_username text;
  v_display text;
  v_sport text;
  v_branch text;
  v_branch_raw text;
  u record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles p where p.id = uid) then
    insert into public.user_stats (user_id)
    values (uid)
    on conflict (user_id) do nothing;
    return;
  end if;

  select * into u from auth.users where id = uid;
  if not found then
    raise exception 'auth user missing';
  end if;

  v_username := public.resolve_available_username(
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'username'), ''),
      nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
      'grappler_' || substr(replace(uid::text, '-', ''), 1, 8)
    ),
    uid
  );

  v_display := left(coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    v_username
  ), 120);

  v_sport := coalesce(nullif(trim(lower(u.raw_user_meta_data->>'sport')), ''), 'bjj');
  if v_sport not in ('bjj', 'wrestling', 'judo') then
    v_sport := 'bjj';
  end if;

  v_branch_raw := nullif(trim(lower(coalesce(
    u.raw_user_meta_data->>'primary_discipline',
    u.raw_user_meta_data->>'branch',
    u.raw_user_meta_data->>'martial_art',
    v_sport
  ))), '');
  v_branch := case
    when v_branch_raw in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo') then v_branch_raw
    when v_branch_raw in ('muay thai', 'thai boxing') then 'muay-thai'
    when v_branch_raw in ('jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu') then 'bjj'
    when v_branch_raw = 'mixed martial arts' then 'mma'
    when v_branch_raw in ('tae kwon do', 'tkd') then 'taekwondo'
    when v_sport in ('wrestling', 'judo') then v_sport
    else 'bjj'
  end;

  insert into public.profiles (
    id,
    username,
    display_name,
    sport,
    avatar_url,
    bio,
    training_days,
    weight_unit,
    equipment,
    experience_level,
    bodyweight_kg,
    primary_goal,
    combat_sessions_per_week,
    session_minutes,
    injury_notes,
    onboarding_completed,
    is_premium,
    first_active_at,
    stripe_customer_id,
    subscription_status,
    subscription_period_end,
    belt,
    stripes,
    gym_name,
    privacy,
    primary_discipline,
    xp,
    level,
    favorite_content_types,
    heard_from,
    biggest_challenges,
    bjj_paywall_completed,
    bjj_coach_marks_seen,
    search_tutorial_seen
  )
  values (
    uid,
    v_username,
    v_display,
    v_sport,
    null,
    '',
    3,
    'kg',
    null,
    'beginner',
    null,
    'balanced',
    3,
    90,
    null,
    false,
    false,
    null,
    null,
    null,
    null,
    'white',
    0,
    '',
    'public',
    v_branch,
    50,
    1,
    '{}'::text[],
    null,
    '{}'::text[],
    false,
    false,
    false
  );

  insert into public.user_stats (user_id)
  values (uid)
  on conflict (user_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public profile discovery/content contracts
-- ---------------------------------------------------------------------------

create or replace function public.normalize_martial_arts_branch(p_raw text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select nullif(trim(lower(coalesce(p_raw, ''))), '') as raw
  )
  select case
    when raw in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo') then raw
    when raw in ('muay thai', 'thai boxing') then 'muay-thai'
    when raw in ('jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu') then 'bjj'
    when raw in ('mixed martial arts') then 'mma'
    when raw in ('tae kwon do', 'tkd') then 'taekwondo'
    else null
  end
  from cleaned;
$$;

create index if not exists profiles_public_discipline_username_idx
  on public.profiles (coalesce(nullif(primary_discipline, ''), 'bjj'), lower(username))
  where coalesce(privacy, 'public') = 'public';

create index if not exists techniques_created_by_branch_updated_idx
  on public.techniques (created_by, branch, updated_at desc)
  where created_by is not null;

create index if not exists systems_user_visibility_branch_updated_idx
  on public.systems (user_id, visibility, branch, updated_at desc)
  where user_id is not null;

create or replace function public.search_public_profiles(
  p_branch text,
  p_query text default '',
  p_limit integer default 40,
  p_cursor text default null
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  primary_discipline text,
  branch text,
  privacy text,
  follower_count bigint,
  following_count bigint,
  viewer_follows boolean,
  viewer_requested boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select
      coalesce(public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')), 'bjj') as branch_id,
      left(trim(lower(coalesce(p_query, ''))), 64) as q,
      least(greatest(coalesce(p_limit, 40), 1), 80) as lim,
      nullif(trim(lower(p_cursor)), '') as cursor_value,
      auth.uid() as viewer_id
  )
  select
    p.id,
    coalesce(p.username, 'grappler'),
    coalesce(p.display_name, 'Grappler'),
    p.avatar_url,
    p.primary_discipline,
    coalesce(public.normalize_martial_arts_branch(nullif(p.primary_discipline, '')), 'bjj') as branch,
    coalesce(p.privacy, 'public'),
    (select count(*) from public.follows f where f.following_user_id = p.id) as follower_count,
    (select count(*) from public.follows f where f.follower_user_id = p.id) as following_count,
    exists (
      select 1 from public.follows f
      where f.follower_user_id = (select viewer_id from cleaned)
        and f.following_user_id = p.id
    ) as viewer_follows,
    exists (
      select 1 from public.follow_requests fr
      where fr.requester_user_id = (select viewer_id from cleaned)
        and fr.target_user_id = p.id
        and fr.status = 'pending'
    ) as viewer_requested
  from public.profiles p
  cross join cleaned c
  where p.id <> c.viewer_id
    and coalesce(p.privacy, 'public') = 'public'
    and coalesce(public.normalize_martial_arts_branch(nullif(p.primary_discipline, '')), 'bjj') = c.branch_id
    and (
      c.q = ''
      or lower(coalesce(p.username, '')) like '%' || c.q || '%'
      or lower(coalesce(p.display_name, '')) like '%' || c.q || '%'
    )
    and (c.cursor_value is null or lower(coalesce(p.username, '')) > c.cursor_value)
  order by lower(coalesce(p.username, '')) asc
  limit (select lim from cleaned);
$$;

create or replace function public.get_public_profile(p_profile_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  primary_discipline text,
  branch text,
  privacy text,
  follower_count bigint,
  following_count bigint,
  viewer_follows boolean,
  viewer_requested boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select auth.uid() as viewer_id
  )
  select
    p.id,
    coalesce(p.username, 'grappler'),
    coalesce(p.display_name, 'Grappler'),
    p.avatar_url,
    case when public.can_view_author_profile((select viewer_id from viewer), p.id) then coalesce(p.bio, '') else '' end,
    p.primary_discipline,
    coalesce(public.normalize_martial_arts_branch(nullif(p.primary_discipline, '')), 'bjj') as branch,
    coalesce(p.privacy, 'public'),
    (select count(*) from public.follows f where f.following_user_id = p.id) as follower_count,
    (select count(*) from public.follows f where f.follower_user_id = p.id) as following_count,
    exists (
      select 1 from public.follows f
      where f.follower_user_id = (select viewer_id from viewer)
        and f.following_user_id = p.id
    ) as viewer_follows,
    exists (
      select 1 from public.follow_requests fr
      where fr.requester_user_id = (select viewer_id from viewer)
        and fr.target_user_id = p.id
        and fr.status = 'pending'
    ) as viewer_requested
  from public.profiles p
  where p.id = p_profile_id
    and public.can_view_author_profile((select viewer_id from viewer), p.id);
$$;

create or replace function public.list_public_user_techniques(
  p_profile_id uuid,
  p_branch text default null
)
returns table (
  id text,
  branch text,
  title text,
  category text,
  description text,
  tutorial_title text,
  tutorial_thumbnail text,
  tags text[],
  links text[],
  media text[],
  linked_technique_ids text[],
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  )
  select
    t.id,
    t.branch,
    t.title,
    t.category,
    t.description,
    t.tutorial_title,
    t.tutorial_thumbnail,
    t.tags,
    t.links,
    t.media,
    t.linked_technique_ids,
    t.created_by,
    t.created_at,
    t.updated_at
  from public.techniques t
  cross join cleaned c
  where t.created_by = p_profile_id
    and coalesce((select p.privacy from public.profiles p where p.id = p_profile_id), 'public') = 'public'
    and (c.branch_id is null or t.branch = c.branch_id)
  order by t.updated_at desc, t.title asc
  limit 120;
$$;

create or replace function public.list_public_user_systems(
  p_profile_id uuid,
  p_branch text default null
)
returns table (
  system_id text,
  branch text,
  title text,
  summary text,
  visibility text,
  sort_order integer,
  updated_at timestamptz,
  nodes jsonb,
  edges jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  ),
  visible_systems as (
    select s.*
    from public.systems s
    cross join cleaned c
    where s.user_id = p_profile_id
      and s.visibility = 'public'
      and coalesce((select p.privacy from public.profiles p where p.id = p_profile_id), 'public') = 'public'
      and (c.branch_id is null or s.branch = c.branch_id)
  )
  select
    s.id,
    s.branch,
    s.title,
    s.summary,
    s.visibility,
    s.sort_order,
    s.updated_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'label', n.label,
          'color', n.color,
          'sortOrder', n.sort_order,
          'layout', case
            when n.layout_x is not null and n.layout_y is not null then jsonb_build_object('x', n.layout_x, 'y', n.layout_y)
            else null
          end,
          'linkedTechniqueTitles', coalesce((
            select jsonb_agg(snt.technique_title_snapshot order by snt.created_at)
            from public.system_node_techniques snt
            where snt.node_id = n.id
              and nullif(trim(coalesce(snt.technique_title_snapshot, '')), '') is not null
          ), '[]'::jsonb)
        )
        order by n.sort_order asc, n.created_at asc
      )
      from public.system_nodes n
      where n.system_id = s.id
    ), '[]'::jsonb) as nodes,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'from', e.from_node_id,
          'to', e.to_node_id,
          'label', e.label
        )
        order by e.created_at asc
      )
      from public.system_edges e
      where e.system_id = s.id
    ), '[]'::jsonb) as edges
  from visible_systems s
  order by s.updated_at desc, s.title asc
  limit 120;
$$;

-- JSON input wrapper for graph saves. The old multi-argument RPC remains for
-- backwards-compatible tests and older clients; this is the app-facing contract.
create or replace function public.save_user_system_graph(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_id := nullif(trim(coalesce(p_input->>'id', '')), '');
  if v_id is null then
    v_id := 'user-system-' || gen_random_uuid()::text;
  end if;

  v_updated_at := public.save_user_system(
    v_id,
    p_input->>'title',
    coalesce(p_input->>'summary', ''),
    coalesce(p_input->>'visibility', 'private'),
    coalesce(p_input->>'branch', 'bjj'),
    coalesce(nullif(p_input->>'sortOrder', '')::integer, 5000),
    nullif(p_input->>'expectedUpdatedAt', '')::timestamptz,
    coalesce(p_input->'nodes', '[]'::jsonb),
    coalesce(p_input->'edges', '[]'::jsonb)
  );

  return jsonb_build_object('id', v_id, 'updatedAt', v_updated_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ownership guards for linked techniques
-- ---------------------------------------------------------------------------

create or replace function public.enforce_system_node_technique_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sys_owner uuid;
  sys_branch text;
  node_system_id text;
  technique_owner uuid;
  technique_branch text;
begin
  select s.user_id, s.branch into sys_owner, sys_branch
  from public.systems s
  where s.id = new.system_id;

  if sys_owner is null then
    raise exception 'system_not_user_owned';
  end if;

  if auth.uid() is not null and auth.uid() is distinct from sys_owner then
    raise exception 'forbidden_system';
  end if;

  select n.system_id into node_system_id
  from public.system_nodes n
  where n.id = new.node_id;

  if node_system_id is null or node_system_id is distinct from new.system_id then
    raise exception 'node_not_in_system';
  end if;

  select ut.user_id, ut.branch into technique_owner, technique_branch
  from public.user_techniques ut
  where ut.id = new.technique_id;

  if technique_owner is null
    or technique_owner is distinct from sys_owner
    or technique_branch is distinct from sys_branch
  then
    raise exception 'technique_not_owned_for_system';
  end if;

  return new;
end;
$$;

drop trigger if exists system_node_techniques_owner_guard on public.system_node_techniques;
create trigger system_node_techniques_owner_guard
  before insert or update on public.system_node_techniques
  for each row execute function public.enforce_system_node_technique_owner();

delete from public.training_session_techniques tst
where not exists (
  select 1
  from public.training_sessions s
  join public.user_techniques ut on ut.id = tst.technique_id
  where s.id = tst.training_session_id
    and s.user_id = ut.user_id
    and s.branch = ut.branch
);

create or replace function public.enforce_training_session_technique_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_owner uuid;
  session_branch text;
  technique_owner uuid;
  technique_branch text;
begin
  select s.user_id, s.branch into session_owner, session_branch
  from public.training_sessions s
  where s.id = new.training_session_id;

  if session_owner is null then
    raise exception 'session_not_found';
  end if;

  select ut.user_id, ut.branch into technique_owner, technique_branch
  from public.user_techniques ut
  where ut.id = new.technique_id;

  if technique_owner is null
    or technique_owner is distinct from session_owner
    or technique_branch is distinct from session_branch
  then
    raise exception 'technique_not_owned_for_session';
  end if;

  return new;
end;
$$;

drop trigger if exists training_session_techniques_owner_guard on public.training_session_techniques;
create trigger training_session_techniques_owner_guard
  before insert or update on public.training_session_techniques
  for each row execute function public.enforce_training_session_technique_owner();

create or replace function public.request_or_follow(
  requester_id uuid,
  target_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_privacy text;
begin
  if actor_id is null then
    raise exception 'not authenticated';
  end if;

  if requester_id is distinct from actor_id then
    raise exception 'forbidden_requester';
  end if;

  if target_id is null or requester_id = target_id then
    return 'noop';
  end if;

  select coalesce(p.privacy, 'public')
  into target_privacy
  from public.profiles p
  where p.id = target_id;

  if target_privacy is null then
    return 'noop';
  end if;

  if target_privacy = 'private' then
    insert into public.follow_requests (requester_user_id, target_user_id, status, responded_at)
    values (requester_id, target_id, 'pending', null)
    on conflict (requester_user_id, target_user_id)
    do update set
      status = 'pending',
      responded_at = null,
      created_at = now();
    return 'requested';
  end if;

  insert into public.follows (follower_user_id, following_user_id)
  values (requester_id, target_id)
  on conflict (follower_user_id, following_user_id) do nothing;
  return 'followed';
end;
$$;

-- Do not expose raw private library technique ids on public graph rows. Public
-- viewers should use list_public_user_systems(), which returns title snapshots.
drop policy if exists bjj_system_node_techniques_select on public.system_node_techniques;
create policy bjj_system_node_techniques_select on public.system_node_techniques
  for select to authenticated
  using (
    exists (
      select 1
      from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Field bounds and community technique rate limiting
-- ---------------------------------------------------------------------------

alter table public.user_techniques
  drop constraint if exists user_techniques_title_length_check,
  drop constraint if exists user_techniques_text_length_check,
  drop constraint if exists user_techniques_array_length_check;

alter table public.user_techniques
  add constraint user_techniques_title_length_check
    check (char_length(trim(title)) between 1 and 160) not valid,
  add constraint user_techniques_text_length_check
    check (char_length(notes) <= 5000 and char_length(description) <= 5000 and char_length(tutorial_title) <= 200) not valid,
  add constraint user_techniques_array_length_check
    check (coalesce(cardinality(media), 0) <= 12 and coalesce(cardinality(links), 0) <= 20) not valid;

alter table public.techniques
  drop constraint if exists techniques_title_length_check,
  drop constraint if exists techniques_text_length_check,
  drop constraint if exists techniques_array_length_check;

alter table public.techniques
  add constraint techniques_title_length_check
    check (char_length(trim(title)) between 1 and 160) not valid,
  add constraint techniques_text_length_check
    check (char_length(description) <= 5000 and char_length(tutorial_title) <= 200) not valid,
  add constraint techniques_array_length_check
    check (
      coalesce(cardinality(tags), 0) <= 24
      and coalesce(cardinality(media), 0) <= 12
      and coalesce(cardinality(links), 0) <= 20
      and coalesce(cardinality(linked_technique_ids), 0) <= 40
    ) not valid;

alter table public.systems
  drop constraint if exists systems_title_length_check,
  drop constraint if exists systems_summary_length_check;

alter table public.systems
  add constraint systems_title_length_check
    check (char_length(trim(title)) between 1 and 160) not valid,
  add constraint systems_summary_length_check
    check (char_length(summary) <= 2000) not valid;

alter table public.system_nodes
  drop constraint if exists system_nodes_label_length_check;

alter table public.system_nodes
  add constraint system_nodes_label_length_check
    check (char_length(trim(label)) between 1 and 500) not valid;

create or replace function public.guard_community_technique_insert_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if new.created_by is null then
    return new;
  end if;

  select count(*)
  into recent_count
  from public.techniques t
  where t.created_by = new.created_by
    and t.created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'community_technique_rate_limited';
  end if;

  return new;
end;
$$;

drop trigger if exists community_technique_rate_limit_guard on public.techniques;
create trigger community_technique_rate_limit_guard
  before insert on public.techniques
  for each row execute function public.guard_community_technique_insert_limits();

revoke all on function public.resolve_available_username(text, uuid) from public;
revoke all on function public.normalize_martial_arts_branch(text) from public;
revoke all on function public.search_public_profiles(text, text, integer, text) from public;
revoke all on function public.get_public_profile(uuid) from public;
revoke all on function public.list_public_user_techniques(uuid, text) from public;
revoke all on function public.list_public_user_systems(uuid, text) from public;
revoke all on function public.save_user_system_graph(jsonb) from public;

grant execute on function public.username_is_available(text, uuid) to authenticated;
grant execute on function public.search_public_profiles(text, text, integer, text) to authenticated;
grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.list_public_user_techniques(uuid, text) to authenticated;
grant execute on function public.list_public_user_systems(uuid, text) to authenticated;
grant execute on function public.save_user_system_graph(jsonb) to authenticated;

commit;
