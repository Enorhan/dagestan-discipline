begin;

alter table public.profiles
  add column if not exists search_tutorial_seen boolean not null default false;

create unique index if not exists user_stats_user_id_uidx
  on public.user_stats (user_id);

-- ---------------------------------------------------------------------------
-- Username helpers + DB uniqueness
-- ---------------------------------------------------------------------------

create or replace function public.slugify_username(raw text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '_' from lower(regexp_replace(coalesce(raw, ''), '[^a-z0-9]+', '_', 'g'))),
    ''
  );
$$;

-- Case-insensitive uniqueness (matches client normalization).
do $$
begin
  if exists (
    select 1
    from public.profiles p
    where p.username is not null
    group by lower(p.username)
    having count(*) > 1
  ) then
    raise exception 'profiles_username_duplicate_preflight_failed';
  end if;
end;
$$;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username ~ '^[a-z0-9][a-z0-9_]{2,29}$') not valid;

-- ---------------------------------------------------------------------------
-- Auth: server-side profile + user_stats bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_attempt int;
  v_username text;
  v_display text;
  v_sport text;
  meta jsonb;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  v_base := public.slugify_username(
    coalesce(
      nullif(trim(meta->>'username'), ''),
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'grappler_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  );
  if v_base is null or v_base = '' then
    v_base := 'grappler_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  v_username := v_base;
  for v_attempt in 1..40 loop
    exit when not exists (
      select 1 from public.profiles p where lower(p.username) = lower(v_username)
    );
    v_username := v_base || '_' || v_attempt::text;
  end loop;

  v_display := coalesce(
    nullif(trim(meta->>'display_name'), ''),
    nullif(trim(meta->>'full_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(trim(meta->>'given_name'), ''),
    v_username
  );

  v_sport := coalesce(nullif(trim(lower(meta->>'sport')), ''), 'bjj');
  if v_sport not in ('bjj', 'wrestling', 'judo') then
    v_sport := 'bjj';
  end if;

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
    null,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Idempotent repair if trigger was skipped (e.g. historical users).
create or replace function public.ensure_profile_from_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_base text;
  v_candidate text;
  v_attempt int;
  v_username text;
  v_display text;
  v_sport text;
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

  v_base := public.slugify_username(
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'username'), ''),
      nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
      'grappler_' || substr(replace(uid::text, '-', ''), 1, 8)
    )
  );
  if v_base is null or v_base = '' then
    v_base := 'grappler_' || substr(replace(uid::text, '-', ''), 1, 8);
  end if;

  v_username := v_base;
  for v_attempt in 1..40 loop
    exit when not exists (
      select 1 from public.profiles p where lower(p.username) = lower(v_username)
    );
    v_username := v_base || '_' || v_attempt::text;
  end loop;

  v_display := coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    v_username
  );

  v_sport := coalesce(nullif(trim(lower(u.raw_user_meta_data->>'sport')), ''), 'bjj');
  if v_sport not in ('bjj', 'wrestling', 'judo') then
    v_sport := 'bjj';
  end if;

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
    null,
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
-- Username availability (SECURITY DEFINER; authoritative vs RLS)
-- ---------------------------------------------------------------------------

create or replace function public.username_is_available(
  p_username text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with norm as (
    select public.slugify_username(trim(coalesce(p_username, ''))) as u
  )
  select
    case
      when (select u from norm) is null or (select u from norm) = '' then false
      when exists (
        select 1
        from public.profiles p
        where lower(p.username) = lower((select u from norm))
          and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
      ) then false
      else true
    end;
$$;

-- ---------------------------------------------------------------------------
-- Public profile cards for viewers (respects profile privacy + follow graph)
-- ---------------------------------------------------------------------------

create or replace function public.public_profile_cards_batch(
  p_viewer_id uuid,
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.username, 'grappler'),
    coalesce(p.display_name, 'Grappler'),
    p.avatar_url
  from public.profiles p
  where p.id = any(p_user_ids)
    and (
      (
        p_viewer_id is not null
        and (
          p_viewer_id is not distinct from p.id
          or public.can_view_author_profile(p_viewer_id, p.id)
        )
      )
      or (
        p_viewer_id is null
        and coalesce(p.privacy, 'public') = 'public'
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- User discovery (public accounts only)
-- ---------------------------------------------------------------------------

create or replace function public.discover_public_profiles(
  p_prefix text,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select
      least(greatest(coalesce(p_limit, 20), 1), 40) as lim,
      left(
        trim(lower(regexp_replace(coalesce(p_prefix, ''), '[^a-z0-9_]+', '', 'g'))),
        32
      ) as px
  )
  select
    p.id,
    coalesce(p.username, 'grappler'),
    coalesce(p.display_name, 'Grappler'),
    p.avatar_url
  from public.profiles p
  cross join cleaned c
  where coalesce(p.privacy, 'public') = 'public'
    and c.px <> ''
    and lower(p.username) like c.px || '%'
  order by p.username asc
  limit (select lim from cleaned);
$$;

-- ---------------------------------------------------------------------------
-- Mention handle resolution (viewer must be allowed to see target)
-- ---------------------------------------------------------------------------

create or replace function public.mention_resolve_handles(
  p_viewer_id uuid,
  p_handles text[]
)
returns table (
  user_id uuid,
  username text
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select distinct public.slugify_username(trim(h)) as hx
    from unnest(coalesce(p_handles, array[]::text[])) as h
    where public.slugify_username(trim(h)) is not null
      and public.slugify_username(trim(h)) <> ''
  )
  select p.id, p.username
  from public.profiles p
  join normalized n on lower(p.username) = lower(n.hx)
  where public.can_view_author_profile(p_viewer_id, p.id);
$$;

-- ---------------------------------------------------------------------------
-- Enforce library technique ownership on system graph links
-- ---------------------------------------------------------------------------

delete from public.system_node_techniques snt
where not exists (
  select 1 from public.user_techniques ut where ut.id = snt.technique_id
);

alter table public.system_node_techniques
  drop constraint if exists system_node_techniques_technique_fk;

alter table public.system_node_techniques
  add constraint system_node_techniques_technique_fk
  foreign key (technique_id)
  references public.user_techniques (id)
  on delete cascade;

create or replace function public.enforce_system_node_technique_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sys_owner uuid;
  tut_owner uuid;
begin
  select s.user_id into sys_owner
  from public.systems s
  where s.id = new.system_id;

  if sys_owner is null then
    raise exception 'system_not_user_owned';
  end if;

  select ut.user_id into tut_owner
  from public.user_techniques ut
  where ut.id = new.technique_id;

  if tut_owner is null or tut_owner is distinct from sys_owner then
    raise exception 'technique_not_owned_for_system';
  end if;

  return new;
end;
$$;

drop trigger if exists system_node_techniques_owner_guard on public.system_node_techniques;
create trigger system_node_techniques_owner_guard
  before insert or update on public.system_node_techniques
  for each row execute function public.enforce_system_node_technique_owner();

-- ---------------------------------------------------------------------------
-- Transactional user system save (authoritative ownership + concurrency)
-- ---------------------------------------------------------------------------

create or replace function public.save_user_system(
  p_system_id text,
  p_title text,
  p_summary text,
  p_visibility text,
  p_branch text,
  p_sort_order integer,
  p_expected_updated_at timestamptz,
  p_nodes jsonb,
  p_edges jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_id text;
  v_sort int;
  v_now timestamptz := now();
  v_owner uuid;
  v_updated timestamptz;
  v_sys_found boolean;
  node_count int;
  edge_count int;
  tech_per_node int;
  rec record;
  v_title text := trim(coalesce(p_title, ''));
  v_summary text := trim(coalesce(p_summary, ''));
  v_vis text := trim(lower(coalesce(p_visibility, 'private')));
  v_branch text := coalesce(nullif(trim(p_branch), ''), 'bjj');
  seen_edge text[];
  edge_key text;
  from_id text;
  to_id text;
  nid text;
  tech_id text;
  snap text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if v_title = '' then
    raise exception 'system_title_required';
  end if;

  if v_vis not in ('public', 'private') then
    raise exception 'invalid_visibility';
  end if;

  if v_branch not in (
    'bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo'
  ) then
    raise exception 'invalid_branch';
  end if;

  v_sort := coalesce(p_sort_order, 5000);

  if p_system_id is null or trim(p_system_id) = '' then
    v_id := 'user-system-' || gen_random_uuid()::text;
  else
    v_id := trim(p_system_id);
  end if;

  select s.user_id, s.updated_at into v_owner, v_updated
  from public.systems s
  where s.id = v_id
  for update;

  v_sys_found := found;

  if v_sys_found then
    if v_owner is distinct from uid then
      raise exception 'forbidden_system';
    end if;
    if p_expected_updated_at is not null
      and v_updated is not null
      and date_trunc('milliseconds', v_updated) is distinct from date_trunc('milliseconds', p_expected_updated_at)
    then
      raise exception 'concurrent_save' using errcode = 'P0001';
    end if;
  end if;

  node_count := coalesce(jsonb_array_length(p_nodes), 0);
  if node_count = 0 then
    raise exception 'system_requires_nodes';
  end if;
  if node_count > 24 then
    raise exception 'system_too_many_nodes';
  end if;

  select count(*) into edge_count
  from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e;

  if edge_count > 48 then
    raise exception 'system_too_many_edges';
  end if;

  -- Validate nodes, per-node technique caps, technique ownership + branch.
  for rec in select * from jsonb_array_elements(p_nodes) with ordinality as t(elem, ord) loop
    nid := trim(coalesce(rec.elem->>'id', ''));
    if nid = '' then
      raise exception 'node_id_required';
    end if;

    tech_per_node := 0;
    for tech_id in
      select trim(t.x)
      from jsonb_array_elements_text(coalesce(rec.elem->'linkedTechniqueIds', '[]'::jsonb)) as t(x)
    loop
      tech_per_node := tech_per_node + 1;
      if tech_per_node > 16 then
        raise exception 'too_many_techniques_per_node';
      end if;
      if tech_id = '' then
        continue;
      end if;
      if not exists (
        select 1
        from public.user_techniques ut
        where ut.id = tech_id
          and ut.user_id = uid
          and ut.branch = v_branch
      ) then
        raise exception 'technique_not_in_library_for_branch';
      end if;
    end loop;
  end loop;

  -- Validate edges reference nodes, no dupes, no self loops.
  seen_edge := array[]::text[];
  for rec in select * from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e(elem) loop
    from_id := trim(coalesce(rec.elem->>'from', ''));
    to_id := trim(coalesce(rec.elem->>'to', ''));
    if from_id = '' or to_id = '' then
      raise exception 'edge_endpoints_required';
    end if;
    if from_id = to_id then
      raise exception 'edge_self_loop';
    end if;
    edge_key := from_id || '->' || to_id;
    if edge_key = any(seen_edge) then
      continue;
    end if;
    seen_edge := array_append(seen_edge, edge_key);
    if not exists (
      select 1
      from jsonb_array_elements(p_nodes) as n(elem)
      where trim(coalesce(n.elem->>'id', '')) = from_id
    ) or not exists (
      select 1
      from jsonb_array_elements(p_nodes) as n(elem)
      where trim(coalesce(n.elem->>'id', '')) = to_id
    ) then
      raise exception 'edge_unknown_node';
    end if;
  end loop;

  if v_sys_found then
    update public.systems
    set
      title = v_title,
      summary = v_summary,
      sort_order = v_sort,
      visibility = v_vis,
      branch = v_branch,
      locked = false,
      updated_at = v_now
    where id = v_id
      and user_id = uid;
  else
    insert into public.systems (
      id,
      title,
      summary,
      locked,
      sort_order,
      user_id,
      visibility,
      branch,
      created_at,
      updated_at
    )
    values (
      v_id,
      v_title,
      v_summary,
      false,
      v_sort,
      uid,
      v_vis,
      v_branch,
      v_now,
      v_now
    );
  end if;

  delete from public.system_edges where system_id = v_id;
  delete from public.system_node_techniques where system_id = v_id;
  delete from public.system_nodes where system_id = v_id;

  insert into public.system_nodes (
    id,
    system_id,
    label,
    color,
    sort_order,
    layout_x,
    layout_y,
    created_at
  )
  select
    trim(coalesce(n.elem->>'id', '')),
    v_id,
    left(trim(coalesce(n.elem->>'label', 'Step')), 500),
    left(trim(coalesce(n.elem->>'color', '#888')), 64),
    coalesce((n.elem->>'sortOrder')::int, (n.ord - 1)::int),
    case
      when n.elem ? 'layout'
        and (n.elem->'layout'->>'x') is not null
        and (n.elem->'layout'->>'y') is not null
        and (n.elem->'layout'->>'x')::double precision between 0 and 1
        and (n.elem->'layout'->>'y')::double precision between 0 and 1
      then (n.elem->'layout'->>'x')::double precision
      else null
    end,
    case
      when n.elem ? 'layout'
        and (n.elem->'layout'->>'x') is not null
        and (n.elem->'layout'->>'y') is not null
        and (n.elem->'layout'->>'x')::double precision between 0 and 1
        and (n.elem->'layout'->>'y')::double precision between 0 and 1
      then (n.elem->'layout'->>'y')::double precision
      else null
    end,
    v_now
  from jsonb_array_elements(p_nodes) with ordinality as n(elem, ord);

  insert into public.system_edges (
    id,
    system_id,
    from_node_id,
    to_node_id,
    label,
    created_at
  )
  select
    gen_random_uuid()::text,
    v_id,
    fe.from_id,
    fe.to_id,
    fe.lbl,
    v_now
  from (
    select distinct on (bx.from_id, bx.to_id)
      bx.from_id,
      bx.to_id,
      bx.lbl
    from (
      select
        trim(coalesce(e.elem->>'from', '')) as from_id,
        trim(coalesce(e.elem->>'to', '')) as to_id,
        left(nullif(trim(coalesce(e.elem->>'label', '')), ''), 96) as lbl
      from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e(elem)
    ) bx
    where bx.from_id <> ''
      and bx.to_id <> ''
      and bx.from_id is distinct from bx.to_id
    order by bx.from_id, bx.to_id, bx.lbl nulls last
  ) fe;

  -- Node ↔ technique links + title snapshots
  for rec in select * from jsonb_array_elements(p_nodes) as n(elem) loop
    nid := trim(coalesce(rec.elem->>'id', ''));
    for tech_id in
      select distinct trim(t.x)
      from jsonb_array_elements_text(coalesce(rec.elem->'linkedTechniqueIds', '[]'::jsonb)) as t(x)
      where trim(t.x) <> ''
    loop
      select left(coalesce(ut.title, 'Technique'), 200) into snap
      from public.user_techniques ut
      where ut.id = tech_id
        and ut.user_id = uid;

      insert into public.system_node_techniques (
        id,
        system_id,
        node_id,
        technique_id,
        technique_title_snapshot,
        created_at
      )
      values (
        gen_random_uuid()::text,
        v_id,
        nid,
        tech_id,
        snap,
        v_now
      );
    end loop;
  end loop;

  return v_now;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments: include author fields (avoid client-side profile hydration)
-- ---------------------------------------------------------------------------

drop function if exists public.comments_for_post(uuid, timestamptz, uuid, integer);

create function public.comments_for_post(
  target_post_id uuid,
  cursor_created_at timestamptz default null,
  parent_id uuid default null,
  page_size integer default 80
)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  body text,
  parent_comment_id uuid,
  mentioned_user_ids uuid[],
  hashtags text[],
  created_at timestamptz,
  author_display_name text,
  author_username text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.user_id,
    c.body,
    c.parent_comment_id,
    c.mentioned_user_ids,
    c.hashtags,
    c.created_at,
    case
      when public.can_view_author_profile(auth.uid(), c.user_id) then coalesce(pr.display_name, 'Grappler')
      else 'Grappler'
    end as author_display_name,
    case
      when public.can_view_author_profile(auth.uid(), c.user_id) then coalesce(pr.username, 'grappler')
      else 'grappler'
    end as author_username,
    case
      when public.can_view_author_profile(auth.uid(), c.user_id) then pr.avatar_url
      else null
    end as author_avatar_url
  from public.comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles pr on pr.id = c.user_id
  where c.post_id = target_post_id
    and (
      cursor_created_at is null
      or c.created_at < cursor_created_at
    )
    and (
      (parent_id is null and c.parent_comment_id is null)
      or c.parent_comment_id = parent_id
    )
    and public.can_view_post(auth.uid(), p.user_id, p.visibility)
  order by c.created_at asc
  limit greatest(1, least(page_size, 250));
$$;

grant execute on function public.comments_for_post(uuid, timestamptz, uuid, integer) to authenticated;

revoke all on function public.slugify_username(text) from public;
revoke all on function public.username_is_available(text, uuid) from public;
revoke all on function public.public_profile_cards_batch(uuid, uuid[]) from public;
revoke all on function public.discover_public_profiles(text, integer) from public;
revoke all on function public.mention_resolve_handles(uuid, text[]) from public;
revoke all on function public.ensure_profile_from_auth() from public;
revoke all on function public.save_user_system(text, text, text, text, text, integer, timestamptz, jsonb, jsonb) from public;

grant execute on function public.username_is_available(text, uuid) to authenticated;
grant execute on function public.public_profile_cards_batch(uuid, uuid[]) to authenticated;
grant execute on function public.discover_public_profiles(text, integer) to authenticated;
grant execute on function public.mention_resolve_handles(uuid, text[]) to authenticated;
grant execute on function public.ensure_profile_from_auth() to authenticated;
grant execute on function public.save_user_system(text, text, text, text, text, integer, timestamptz, jsonb, jsonb) to authenticated;

commit;
