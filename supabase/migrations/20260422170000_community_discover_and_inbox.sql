-- Phase 2: branch-wide public systems discovery + reviews inbox.
-- Additive only. Mirrors the security-definer + block-list pattern from
-- 20260422130500_community_living_artifacts_rpcs.sql.

-- Covering index for branch-scoped discovery queries.
create index if not exists systems_branch_public_updated_idx
  on public.systems (branch, updated_at desc)
  where visibility = 'public';

-- -----------------------------------------------------------------------------
-- list_public_systems_by_branch: lightweight cards of recent public systems
-- within a branch, excluding the viewer's own systems and any blocked authors.
-- Returns only metadata (no graph), keeping payloads small. Clients should use
-- list_public_user_systems to load a single system's full graph on demand.
-- -----------------------------------------------------------------------------
create or replace function public.list_public_systems_by_branch(
  p_branch text default null,
  p_limit integer default 24,
  p_cursor timestamptz default null
)
returns table (
  system_id text,
  owner_id uuid,
  owner_display_name text,
  owner_handle text,
  title text,
  summary text,
  branch text,
  updated_at timestamptz,
  fork_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  ),
  base as (
    select s.*
    from public.systems s, cleaned c
    where s.visibility = 'public'
      and s.user_id is not null
      and (auth.uid() is null or s.user_id <> auth.uid())
      and (c.branch_id is null or coalesce(s.branch, 'bjj') = c.branch_id)
      and (p_cursor is null or s.updated_at < p_cursor)
      and coalesce(
        (select p.privacy from public.profiles p where p.id = s.user_id),
        'public'
      ) = 'public'
      and (auth.uid() is null or not public.community_is_blocked(auth.uid(), s.user_id))
  )
  select
    b.id,
    b.user_id,
    public._profile_display_label(b.user_id),
    (select p.username from public.profiles p where p.id = b.user_id),
    b.title,
    b.summary,
    coalesce(b.branch, 'bjj'),
    b.updated_at,
    coalesce((
      select count(*)::bigint from public.system_forks f where f.parent_system_id = b.id
    ), 0)
  from base b
  order by b.updated_at desc
  limit least(coalesce(p_limit, 24), 60);
$$;

revoke all on function public.list_public_systems_by_branch(text, integer, timestamptz) from public;
grant execute on function public.list_public_systems_by_branch(text, integer, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- list_my_received_reviews: reviews written by peers on sessions the caller
-- owns. Used by the Community Reviews tab as a notification-style inbox.
-- -----------------------------------------------------------------------------
create or replace function public.list_my_received_reviews(
  p_limit integer default 30,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  session_id uuid,
  session_title text,
  reviewer_id uuid,
  reviewer_display_name text,
  reviewer_handle text,
  body text,
  rating smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.session_id,
    coalesce(nullif(trim(s.title), ''), 'Session') as session_title,
    r.reviewer_id,
    public._profile_display_label(r.reviewer_id) as reviewer_display_name,
    (select p.username from public.profiles p where p.id = r.reviewer_id) as reviewer_handle,
    r.body,
    r.rating,
    r.created_at,
    r.updated_at
  from public.session_reviews r
  join public.training_sessions s on s.id = r.session_id
  where s.user_id = auth.uid()
    and (p_cursor is null or r.created_at < p_cursor)
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), r.reviewer_id))
  order by r.created_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

revoke all on function public.list_my_received_reviews(integer, timestamptz) from public;
grant execute on function public.list_my_received_reviews(integer, timestamptz) to authenticated;

