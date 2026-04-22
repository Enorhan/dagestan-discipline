-- Phase 2 · Branch 3: community engagement surfaces.
-- 3A: list_system_forkers — who has forked a public parent system (profile cards).
-- 3B: list_public_user_reviews — peer reviews visible on a user's public profile.
-- Additive only; reuses _profile_display_label + community_is_blocked helpers.

-- -----------------------------------------------------------------------------
-- 3A · list_system_forkers: public forkers of a parent system with lightweight
-- profile cards so the client can render avatars + handles directly without a
-- second batch lookup. Filters by child visibility, profile privacy, blocks.
-- -----------------------------------------------------------------------------
create or replace function public.list_system_forkers(
  p_parent_system_id text,
  p_limit integer default 24,
  p_cursor timestamptz default null
)
returns table (
  fork_id uuid,
  forker_id uuid,
  forker_display_name text,
  forker_handle text,
  forker_avatar_url text,
  child_system_id text,
  forked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.forked_by,
    public._profile_display_label(f.forked_by),
    p.username,
    p.avatar_url,
    f.child_system_id,
    f.created_at
  from public.system_forks f
  join public.systems s on s.id = f.child_system_id
  left join public.profiles p on p.id = f.forked_by
  where f.parent_system_id = p_parent_system_id
    and s.visibility = 'public'
    and coalesce(
      (select pp.privacy from public.profiles pp where pp.id = f.forked_by),
      'public'
    ) = 'public'
    and (p_cursor is null or f.created_at < p_cursor)
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), f.forked_by))
  order by f.created_at desc
  limit least(coalesce(p_limit, 24), 60);
$$;

revoke all on function public.list_system_forkers(text, integer, timestamptz) from public;
grant execute on function public.list_system_forkers(text, integer, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- 3B · list_public_user_reviews: reviews others have written on p_user_id's
-- publicly shared training sessions. Only surfaces when the target profile
-- itself is public; respects viewer block-list on both directions and filters
-- out reviews written by users whose profile has been made private.
-- -----------------------------------------------------------------------------
create or replace function public.list_public_user_reviews(
  p_user_id uuid,
  p_limit integer default 20,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  session_id uuid,
  session_title text,
  reviewer_id uuid,
  reviewer_display_name text,
  reviewer_handle text,
  reviewer_avatar_url text,
  body text,
  rating smallint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select id, privacy from public.profiles where id = p_user_id
  )
  select
    r.id,
    r.session_id,
    coalesce(nullif(trim(s.title), ''), 'Session') as session_title,
    r.reviewer_id,
    public._profile_display_label(r.reviewer_id) as reviewer_display_name,
    (select p.username from public.profiles p where p.id = r.reviewer_id) as reviewer_handle,
    (select p.avatar_url from public.profiles p where p.id = r.reviewer_id) as reviewer_avatar_url,
    r.body,
    r.rating,
    r.created_at
  from public.session_reviews r
  join public.training_sessions s on s.id = r.session_id
  join target t on t.id = s.user_id
  where t.privacy = 'public'
    and s.visibility = 'everyone'
    and coalesce(
      (select p.privacy from public.profiles p where p.id = r.reviewer_id),
      'public'
    ) = 'public'
    and (p_cursor is null or r.created_at < p_cursor)
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), r.reviewer_id))
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), p_user_id))
  order by r.created_at desc
  limit least(coalesce(p_limit, 20), 50);
$$;

revoke all on function public.list_public_user_reviews(uuid, integer, timestamptz) from public;
grant execute on function public.list_public_user_reviews(uuid, integer, timestamptz) to authenticated;

