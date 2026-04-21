begin;

-- ---------------------------------------------------------------------------
-- Feed model upgrades
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_kind') then
    create type public.post_kind as enum ('moment', 'reel');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_media_type') then
    create type public.post_media_type as enum ('image', 'video');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'follow_request_status') then
    create type public.follow_request_status as enum ('pending', 'accepted', 'rejected');
  end if;
end $$;

do $$
declare
  visibility_type_oid oid;
begin
  if not exists (select 1 from pg_type where typname = 'post_visibility') then
    create type public.post_visibility as enum ('public', 'followers', 'private');
    return;
  end if;

  select t.oid
  into visibility_type_oid
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where t.typname = 'post_visibility'
    and n.nspname = 'public'
  limit 1;

  if visibility_type_oid is not null
     and not exists (
       select 1
       from pg_enum
       where enumtypid = visibility_type_oid
         and enumlabel = 'private'
     ) then
    alter type public.post_visibility add value 'private';
  end if;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text,
  media_type public.post_media_type not null default 'image',
  visibility public.post_visibility not null default 'public',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  image_url text,
  poster_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists post_kind public.post_kind not null default 'moment',
  add column if not exists session_id uuid references public.training_sessions(id) on delete set null,
  add column if not exists media_aspect_ratio numeric(6, 3),
  add column if not exists allow_comments boolean not null default true,
  add column if not exists is_archived boolean not null default false;

create index if not exists idx_posts_post_kind_created_at on public.posts (post_kind, created_at desc);
create index if not exists idx_posts_user_created_at on public.posts (user_id, created_at desc);

create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  status public.follow_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (requester_user_id, target_user_id),
  check (requester_user_id <> target_user_id)
);

create index if not exists idx_follow_requests_target_pending
  on public.follow_requests (target_user_id, created_at desc)
  where status = 'pending';

create index if not exists idx_follow_requests_requester
  on public.follow_requests (requester_user_id, created_at desc);

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type public.post_media_type not null,
  media_url text not null,
  thumbnail_url text,
  caption text,
  visibility public.post_visibility not null default 'public',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_stories_expires_visibility
  on public.stories (expires_at, visibility, created_at desc);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_user_id)
);

-- ---------------------------------------------------------------------------
-- Access helper functions (security definer)
-- ---------------------------------------------------------------------------

create or replace function public.is_accepted_follower(viewer_id uuid, creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.follows f
    where f.follower_user_id = viewer_id
      and f.following_user_id = creator_id
  );
$$;

create or replace function public.can_view_author_profile(viewer_id uuid, creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    creator_id = viewer_id
    or coalesce((select p.privacy from public.profiles p where p.id = creator_id), 'public') = 'public'
    or public.is_accepted_follower(viewer_id, creator_id);
$$;

create or replace function public.can_view_post(viewer_id uuid, creator_id uuid, visibility public.post_visibility)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    creator_id = viewer_id
    or (
      coalesce((select p.privacy from public.profiles p where p.id = creator_id), 'public') = 'public'
      and visibility = 'public'
    )
    or (
      public.is_accepted_follower(viewer_id, creator_id)
      and visibility in ('public', 'followers')
    );
$$;

-- ---------------------------------------------------------------------------
-- Feed RPCs
-- ---------------------------------------------------------------------------

create or replace function public.feed_home(
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 20
)
returns table (
  post_id uuid,
  user_id uuid,
  author_name text,
  author_handle text,
  author_avatar_url text,
  post_kind public.post_kind,
  caption text,
  visibility public.post_visibility,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  like_count integer,
  comment_count integer,
  save_count integer,
  viewer_liked boolean,
  viewer_saved boolean,
  rank_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_posts as (
    select p.*
    from public.posts p
    where p.created_at < cursor_created_at
      and not p.is_archived
      and public.can_view_post(viewer_id, p.user_id, p.visibility)
  ),
  ranked as (
    select
      cp.*,
      (
        ln(greatest(extract(epoch from (now() - cp.created_at)) / 3600.0, 1)) * -0.7
        + least(coalesce(cp.like_count, 0), 200) * 0.08
        + least(coalesce(cp.comment_count, 0), 200) * 0.12
        + least(coalesce(cp.save_count, 0), 200) * 0.14
        + case when public.is_accepted_follower(viewer_id, cp.user_id) then 4 else 0 end
      ) as score
    from candidate_posts cp
  )
  select
    r.id as post_id,
    r.user_id,
    coalesce(pr.display_name, 'Grappler') as author_name,
    ('@' || coalesce(pr.username, 'grappler')) as author_handle,
    pr.avatar_url as author_avatar_url,
    r.post_kind,
    r.caption,
    r.visibility,
    r.media_type,
    coalesce(pm.image_url, pm.poster_url) as media_url,
    pm.poster_url as thumbnail_url,
    r.created_at,
    coalesce(r.like_count, 0) as like_count,
    coalesce(r.comment_count, 0) as comment_count,
    coalesce(r.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = r.id and l.user_id = viewer_id) as viewer_liked,
    exists(select 1 from public.saves s where s.post_id = r.id and s.user_id = viewer_id) as viewer_saved,
    r.score as rank_score
  from ranked r
  left join public.profiles pr on pr.id = r.user_id
  left join public.post_media pm on pm.post_id = r.id
  order by r.score desc, r.created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.feed_explore(
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 20
)
returns table (
  post_id uuid,
  user_id uuid,
  author_name text,
  author_handle text,
  author_avatar_url text,
  post_kind public.post_kind,
  caption text,
  visibility public.post_visibility,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  like_count integer,
  comment_count integer,
  save_count integer,
  viewer_liked boolean,
  viewer_saved boolean,
  rank_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.feed_home(viewer_id, cursor_created_at, page_size)
  where user_id <> viewer_id
    and visibility = 'public'
  order by rank_score desc, created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.feed_user_profile(
  profile_id uuid,
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 20
)
returns table (
  post_id uuid,
  user_id uuid,
  post_kind public.post_kind,
  caption text,
  visibility public.post_visibility,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  like_count integer,
  comment_count integer,
  save_count integer,
  viewer_liked boolean,
  viewer_saved boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as post_id,
    p.user_id,
    p.post_kind,
    p.caption,
    p.visibility,
    p.media_type,
    coalesce(pm.image_url, pm.poster_url) as media_url,
    pm.poster_url as thumbnail_url,
    p.created_at,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    coalesce(p.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = viewer_id) as viewer_liked,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = viewer_id) as viewer_saved
  from public.posts p
  left join public.post_media pm on pm.post_id = p.id
  where p.user_id = profile_id
    and p.created_at < cursor_created_at
    and not p.is_archived
    and public.can_view_post(viewer_id, p.user_id, p.visibility)
  order by p.created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.stories_active(viewer_id uuid, page_size integer default 40)
returns table (
  story_id uuid,
  user_id uuid,
  author_name text,
  author_handle text,
  author_avatar_url text,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  caption text,
  visibility public.post_visibility,
  created_at timestamptz,
  expires_at timestamptz,
  viewer_seen boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as story_id,
    s.user_id,
    coalesce(p.display_name, 'Grappler') as author_name,
    ('@' || coalesce(p.username, 'grappler')) as author_handle,
    p.avatar_url as author_avatar_url,
    s.media_type,
    s.media_url,
    coalesce(s.thumbnail_url, s.media_url) as thumbnail_url,
    s.caption,
    s.visibility,
    s.created_at,
    s.expires_at,
    exists(select 1 from public.story_views sv where sv.story_id = s.id and sv.viewer_user_id = viewer_id) as viewer_seen
  from public.stories s
  left join public.profiles p on p.id = s.user_id
  where s.expires_at > now()
    and public.can_view_post(viewer_id, s.user_id, s.visibility)
  order by viewer_seen asc, s.created_at desc
  limit greatest(1, least(page_size, 80));
$$;

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
  target_privacy text;
begin
  if requester_id is null or target_id is null or requester_id = target_id then
    return 'noop';
  end if;

  select coalesce(p.privacy, 'public')
  into target_privacy
  from public.profiles p
  where p.id = target_id;

  if coalesce(target_privacy, 'public') = 'private' then
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

create or replace function public.respond_follow_request(
  request_id uuid,
  accept_request boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  actor_id uuid;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into req
  from public.follow_requests
  where id = request_id
    and target_user_id = actor_id
  for update;

  if req.id is null then
    raise exception 'Follow request not found';
  end if;

  if accept_request then
    update public.follow_requests
    set status = 'accepted', responded_at = now()
    where id = req.id;

    insert into public.follows (follower_user_id, following_user_id)
    values (req.requester_user_id, req.target_user_id)
    on conflict (follower_user_id, following_user_id) do nothing;
    return 'accepted';
  end if;

  update public.follow_requests
  set status = 'rejected', responded_at = now()
  where id = req.id;
  return 'rejected';
end;
$$;

-- ---------------------------------------------------------------------------
-- Anti-abuse guards
-- ---------------------------------------------------------------------------

create or replace function public.guard_social_insert_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if tg_table_name = 'comments' then
    select count(*)
    into recent_count
    from public.comments c
    where c.user_id = new.user_id
      and c.created_at > now() - interval '5 minutes';

    if recent_count >= 40 then
      raise exception 'Rate limited: too many comments';
    end if;
  elsif tg_table_name = 'likes' then
    select count(*)
    into recent_count
    from public.likes l
    where l.user_id = new.user_id
      and l.created_at > now() - interval '1 minute';

    if recent_count >= 120 then
      raise exception 'Rate limited: too many likes';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_rate_limit_guard on public.comments;
create trigger comments_rate_limit_guard
  before insert on public.comments
  for each row execute function public.guard_social_insert_limits();

drop trigger if exists likes_rate_limit_guard on public.likes;
create trigger likes_rate_limit_guard
  before insert on public.likes
  for each row execute function public.guard_social_insert_limits();

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------

alter table public.follow_requests enable row level security;
alter table public.comment_likes enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists follow_requests_select on public.follow_requests;
create policy follow_requests_select on public.follow_requests
  for select to authenticated
  using (requester_user_id = auth.uid() or target_user_id = auth.uid());

drop policy if exists follow_requests_insert on public.follow_requests;
create policy follow_requests_insert on public.follow_requests
  for insert to authenticated
  with check (requester_user_id = auth.uid());

drop policy if exists follow_requests_update on public.follow_requests;
create policy follow_requests_update on public.follow_requests
  for update to authenticated
  using (target_user_id = auth.uid())
  with check (target_user_id = auth.uid());

drop policy if exists follow_requests_delete on public.follow_requests;
create policy follow_requests_delete on public.follow_requests
  for delete to authenticated
  using (requester_user_id = auth.uid() or target_user_id = auth.uid());

drop policy if exists comment_likes_select on public.comment_likes;
create policy comment_likes_select on public.comment_likes
  for select to authenticated
  using (true);

drop policy if exists comment_likes_insert on public.comment_likes;
create policy comment_likes_insert on public.comment_likes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists comment_likes_delete on public.comment_likes;
create policy comment_likes_delete on public.comment_likes
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists stories_select_policy on public.stories;
create policy stories_select_policy on public.stories
  for select to authenticated
  using (public.can_view_post(auth.uid(), user_id, visibility));

drop policy if exists stories_insert_policy on public.stories;
create policy stories_insert_policy on public.stories
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists stories_update_policy on public.stories;
create policy stories_update_policy on public.stories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists stories_delete_policy on public.stories;
create policy stories_delete_policy on public.stories
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists story_views_select on public.story_views;
create policy story_views_select on public.story_views
  for select to authenticated
  using (viewer_user_id = auth.uid());

drop policy if exists story_views_insert on public.story_views;
create policy story_views_insert on public.story_views
  for insert to authenticated
  with check (viewer_user_id = auth.uid());

-- Keep function execution available to app clients.
grant execute on function public.feed_home(uuid, timestamptz, integer) to authenticated;
grant execute on function public.feed_explore(uuid, timestamptz, integer) to authenticated;
grant execute on function public.feed_user_profile(uuid, uuid, timestamptz, integer) to authenticated;
grant execute on function public.stories_active(uuid, integer) to authenticated;
grant execute on function public.request_or_follow(uuid, uuid) to authenticated;
grant execute on function public.respond_follow_request(uuid, boolean) to authenticated;

commit;
