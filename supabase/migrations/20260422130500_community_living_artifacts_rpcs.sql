-- Security-definer RPCs for Living Training Artifacts. All functions authorize
-- visibility and blocks at the function boundary; tables themselves remain
-- owner-only (see 20260422130000_community_living_artifacts.sql).

-- -----------------------------------------------------------------------------
-- Block-list helper (local, to avoid depending on any feed-era function)
-- -----------------------------------------------------------------------------
create or replace function public.community_is_blocked(viewer_id uuid, author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_blocks b
    where (b.blocker_user_id = viewer_id and b.blocked_user_id = author_id)
       or (b.blocker_user_id = author_id and b.blocked_user_id = viewer_id)
  );
$$;

revoke all on function public.community_is_blocked(uuid, uuid) from public;
grant execute on function public.community_is_blocked(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- fork_system: clones a public system into the caller's namespace, links the
-- fork, and returns the new system id. Delegates graph copy to a pure SQL path.
-- -----------------------------------------------------------------------------
create or replace function public.fork_system(p_parent_system_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_parent public.systems%rowtype;
  v_new_id text := gen_random_uuid()::text;
  v_revision integer := 0;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_parent from public.systems where id = p_parent_system_id;
  if not found then
    raise exception 'parent system not found' using errcode = 'P0002';
  end if;

  if v_parent.user_id is not null
     and v_parent.user_id <> v_owner
     and coalesce(v_parent.visibility, 'private') <> 'public' then
    raise exception 'parent system is not public' using errcode = '42501';
  end if;

  if v_parent.user_id is not null and public.community_is_blocked(v_owner, v_parent.user_id) then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  insert into public.systems (id, title, summary, locked, sort_order, user_id, visibility, branch)
  values (
    v_new_id,
    v_parent.title || ' (fork)',
    v_parent.summary,
    false,
    0,
    v_owner,
    'private',
    coalesce(v_parent.branch, 'bjj')
  );

  insert into public.system_nodes (id, system_id, label, color, sort_order)
  select gen_random_uuid()::text, v_new_id, n.label, n.color, n.sort_order
  from public.system_nodes n where n.system_id = v_parent.id;

  insert into public.system_edges (system_id, from_node_id, to_node_id)
  select v_new_id, nf.id, nt.id
  from public.system_edges e
  join public.system_nodes pnf on pnf.id = e.from_node_id
  join public.system_nodes pnt on pnt.id = e.to_node_id
  join public.system_nodes nf
    on nf.system_id = v_new_id and nf.label = pnf.label and nf.sort_order = pnf.sort_order
  join public.system_nodes nt
    on nt.system_id = v_new_id and nt.label = pnt.label and nt.sort_order = pnt.sort_order
  where e.system_id = v_parent.id;

  insert into public.system_forks (parent_system_id, child_system_id, forked_by, forked_from_revision)
  values (v_parent.id, v_new_id, v_owner, v_revision);

  return v_new_id;
end;
$$;

revoke all on function public.fork_system(text) from public;
grant execute on function public.fork_system(text) to authenticated;

-- -----------------------------------------------------------------------------
-- list_system_forks: public-visible forks of a parent system.
-- -----------------------------------------------------------------------------
create or replace function public.list_system_forks(
  p_parent_system_id text,
  p_limit integer default 20,
  p_cursor timestamptz default null
)
returns table (
  fork_id uuid,
  child_system_id text,
  forked_by uuid,
  forked_at timestamptz,
  fork_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.child_system_id,
    f.forked_by,
    f.created_at,
    s.title
  from public.system_forks f
  join public.systems s on s.id = f.child_system_id
  where f.parent_system_id = p_parent_system_id
    and s.visibility = 'public'
    and (p_cursor is null or f.created_at < p_cursor)
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), f.forked_by))
  order by f.created_at desc
  limit least(coalesce(p_limit, 20), 50);
$$;

revoke all on function public.list_system_forks(text, integer, timestamptz) from public;
grant execute on function public.list_system_forks(text, integer, timestamptz) to authenticated;


-- -----------------------------------------------------------------------------
-- list_coach_library: exposes a coach's public systems + techniques to
-- subscribers or the public. Branch-scoped when requested.
-- -----------------------------------------------------------------------------
create or replace function public.list_coach_library(
  p_coach_id uuid,
  p_branch text default null,
  p_limit integer default 50
)
returns table (
  item_kind text,
  item_id text,
  title text,
  branch text,
  updated_at timestamptz,
  thumbnail text,
  summary text
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select auth.uid() as uid
  ),
  permitted as (
    select
      coalesce(v.uid is not null, false) as is_auth,
      (v.uid is not null and public.community_is_blocked(v.uid, p_coach_id)) as blocked
    from viewer v
  ),
  systems_part as (
    select 'system'::text as item_kind,
           s.id::text as item_id,
           s.title,
           coalesce(s.branch, 'bjj') as branch,
           s.updated_at,
           null::text as thumbnail,
           s.summary
    from public.systems s, permitted p
    where s.user_id = p_coach_id
      and s.visibility = 'public'
      and not p.blocked
      and (p_branch is null or coalesce(s.branch, 'bjj') = public.normalize_martial_arts_branch(p_branch))
  ),
  techniques_part as (
    select 'technique'::text as item_kind,
           t.id::text as item_id,
           t.title,
           coalesce(t.branch, 'bjj') as branch,
           t.updated_at,
           t.tutorial_thumbnail as thumbnail,
           t.description as summary
    from public.user_techniques t, permitted p
    where t.user_id = p_coach_id
      and not p.blocked
      and (p_branch is null or coalesce(t.branch, 'bjj') = public.normalize_martial_arts_branch(p_branch))
  )
  select * from systems_part
  union all
  select * from techniques_part
  order by updated_at desc
  limit least(coalesce(p_limit, 50), 100);
$$;

revoke all on function public.list_coach_library(uuid, text, integer) from public;
grant execute on function public.list_coach_library(uuid, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- drill_challenge_leaderboard: aggregate reps per user for a challenge.
-- Uses public profile-card disclosure pattern from bjj_leaderboard_sessions_for_month.
-- -----------------------------------------------------------------------------
create or replace function public.drill_challenge_leaderboard(p_challenge_id uuid)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  total_reps bigint,
  completions bigint,
  last_completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with challenge as (
    select c.*
    from public.drill_challenges c
    where c.id = p_challenge_id
      and (
        c.visibility = 'public'
        or c.coach_id = auth.uid()
        or exists (
          select 1 from public.coach_subscriptions s
          where s.coach_id = c.coach_id and s.subscriber_id = auth.uid()
        )
      )
  ),
  tallies as (
    select d.user_id,
           sum(d.reps)::bigint as total_reps,
           count(*)::bigint as completions,
           max(d.completed_at) as last_completed_at
    from public.drill_completions d
    join challenge c on c.id = d.challenge_id
    group by d.user_id
  )
  select t.user_id,
         public._profile_display_label(t.user_id) as display_name,
         p.username as handle,
         t.total_reps,
         t.completions,
         t.last_completed_at
  from tallies t
  left join public.profiles p on p.id = t.user_id
  where auth.uid() is null or not public.community_is_blocked(auth.uid(), t.user_id)
  order by t.total_reps desc, t.last_completed_at asc
  limit 200;
$$;

revoke all on function public.drill_challenge_leaderboard(uuid) from public;
grant execute on function public.drill_challenge_leaderboard(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- post_session_review: gated review insert; reviewer must be authenticated and
-- authorized to view the target session per visibility + follower graph.
-- -----------------------------------------------------------------------------
create or replace function public.post_session_review(
  p_session_id uuid,
  p_body text,
  p_rating smallint default null,
  p_focus_technique_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := auth.uid();
  v_owner uuid;
  v_visibility text;
  v_id uuid;
begin
  if v_reviewer is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select s.user_id, coalesce(s.visibility, 'everyone')
    into v_owner, v_visibility
  from public.training_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;

  if v_owner = v_reviewer then
    raise exception 'cannot review own session' using errcode = '22023';
  end if;

  if public.community_is_blocked(v_reviewer, v_owner) then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  if v_visibility = 'owner' then
    raise exception 'session is private' using errcode = '42501';
  end if;

  if v_visibility = 'followers' and not public.is_accepted_follower(v_reviewer, v_owner) then
    raise exception 'followers only' using errcode = '42501';
  end if;

  if p_focus_technique_id is not null
     and not exists (
       select 1 from public.user_techniques t
       where t.id = p_focus_technique_id
         and (t.user_id = v_owner or t.user_id = v_reviewer)
     ) then
    raise exception 'technique not linked to session' using errcode = '23503';
  end if;

  insert into public.session_reviews (session_id, reviewer_id, focus_technique_id, body, rating)
  values (p_session_id, v_reviewer, p_focus_technique_id, p_body, p_rating)
  on conflict (session_id, reviewer_id) do update
    set body = excluded.body,
        rating = excluded.rating,
        focus_technique_id = excluded.focus_technique_id,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.post_session_review(uuid, text, smallint, text) from public;
grant execute on function public.post_session_review(uuid, text, smallint, text) to authenticated;

-- -----------------------------------------------------------------------------
-- list_session_reviews: returns reviews for a session the caller owns OR is
-- authorized to view.
-- -----------------------------------------------------------------------------
create or replace function public.list_session_reviews(p_session_id uuid)
returns table (
  id uuid,
  reviewer_id uuid,
  reviewer_display_name text,
  reviewer_handle text,
  body text,
  rating smallint,
  focus_technique_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with sess as (
    select s.user_id as owner_id, coalesce(s.visibility, 'everyone') as visibility
    from public.training_sessions s
    where s.id = p_session_id
  )
  select r.id,
         r.reviewer_id,
         public._profile_display_label(r.reviewer_id),
         p.username as handle,
         r.body,
         r.rating,
         r.focus_technique_id,
         r.created_at,
         r.updated_at
  from public.session_reviews r
  join sess on true
  left join public.profiles p on p.id = r.reviewer_id
  where r.session_id = p_session_id
    and (
      sess.owner_id = auth.uid()
      or r.reviewer_id = auth.uid()
      or sess.visibility = 'everyone'
      or (sess.visibility = 'followers' and public.is_accepted_follower(auth.uid(), sess.owner_id))
    )
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), r.reviewer_id))
  order by r.created_at desc;
$$;

revoke all on function public.list_session_reviews(uuid) from public;
grant execute on function public.list_session_reviews(uuid) to authenticated;
