begin;

-- ---------------------------------------------------------------------------
-- Video media lifecycle + creator workflows
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_media_processing_status') then
    create type public.social_media_processing_status as enum ('pending', 'processing', 'ready', 'failed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_video_provider') then
    create type public.social_video_provider as enum ('mux', 'cloudflare_stream');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_feedback_type') then
    create type public.social_feedback_type as enum ('hide', 'not_interested', 'report');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_feed_surface') then
    create type public.social_feed_surface as enum ('for_you', 'following', 'explore', 'reels', 'profile');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'moderation_status') then
    create type public.moderation_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
  end if;
end $$;

alter table public.posts
  add column if not exists scheduled_for timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists is_published boolean not null default true;

update public.posts
set
  published_at = coalesce(published_at, created_at),
  is_published = true
where is_published is distinct from true
   or published_at is null;

alter table public.post_media
  add column if not exists video_url text,
  add column if not exists playback_url text,
  add column if not exists hls_url text,
  add column if not exists playback_id text,
  add column if not exists video_asset_id text,
  add column if not exists provider public.social_video_provider,
  add column if not exists media_processing_status public.social_media_processing_status not null default 'pending',
  add column if not exists duration_ms integer,
  add column if not exists aspect_ratio numeric(6, 3),
  add column if not exists ready_at timestamptz,
  add column if not exists failed_reason text,
  add column if not exists cover_timestamp_ms integer;

create table if not exists public.social_video_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  provider public.social_video_provider not null,
  asset_id text not null,
  upload_url text not null,
  status public.social_media_processing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, asset_id)
);

create table if not exists public.creator_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text,
  media_type public.post_media_type not null default 'video',
  post_kind public.post_kind not null default 'reel',
  visibility public.post_visibility not null default 'public',
  upload_url text,
  thumbnail_url text,
  cover_timestamp_ms integer,
  scheduled_for timestamptz,
  published_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_drafts_user_updated_at
  on public.creator_drafts (user_id, updated_at desc);

create table if not exists public.social_feed_events (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  surface public.social_feed_surface not null,
  watch_ms integer not null default 0,
  completed_view boolean not null default false,
  skipped_view boolean not null default false,
  replayed_view boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_feed_events_viewer_post
  on public.social_feed_events (viewer_user_id, post_id, created_at desc);

create table if not exists public.social_negative_feedback (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  feedback_type public.social_feedback_type not null,
  created_at timestamptz not null default now(),
  unique (viewer_user_id, post_id, feedback_type)
);

create index if not exists idx_social_negative_feedback_viewer_post
  on public.social_negative_feedback (viewer_user_id, post_id, created_at desc);

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists mentioned_user_ids uuid[] not null default '{}'::uuid[],
  add column if not exists hashtags text[] not null default '{}'::text[];

create index if not exists idx_comments_post_parent_created
  on public.comments (post_id, parent_comment_id, created_at asc);

create table if not exists public.social_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_post_topics (
  post_id uuid not null references public.posts(id) on delete cascade,
  topic_id uuid not null references public.social_topics(id) on delete cascade,
  weight numeric(8, 4) not null default 1,
  created_at timestamptz not null default now(),
  primary key (post_id, topic_id)
);

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null,
  details text,
  evidence_urls text[] not null default '{}'::text[],
  status public.moderation_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_social_reports_status_created
  on public.social_reports (status, created_at desc);

create table if not exists public.social_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.social_reports(id) on delete cascade,
  priority integer not null default 50,
  status public.moderation_status not null default 'open',
  assignee_user_id uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id)
);

create table if not exists public.social_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.social_mutes (
  muter_user_id uuid not null references auth.users(id) on delete cascade,
  muted_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_user_id, muted_user_id),
  check (muter_user_id <> muted_user_id)
);

create table if not exists public.social_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null,
  bucket_key text not null,
  count integer not null default 0,
  window_started_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, surface, bucket_key)
);

create or replace function public.bump_social_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bump_social_video_uploads_updated_at on public.social_video_uploads;
create trigger bump_social_video_uploads_updated_at
  before update on public.social_video_uploads
  for each row execute function public.bump_social_updated_at();

drop trigger if exists bump_creator_drafts_updated_at on public.creator_drafts;
create trigger bump_creator_drafts_updated_at
  before update on public.creator_drafts
  for each row execute function public.bump_social_updated_at();

drop trigger if exists bump_social_reports_updated_at on public.social_reports;
create trigger bump_social_reports_updated_at
  before update on public.social_reports
  for each row execute function public.bump_social_updated_at();

drop trigger if exists bump_social_moderation_queue_updated_at on public.social_moderation_queue;
create trigger bump_social_moderation_queue_updated_at
  before update on public.social_moderation_queue
  for each row execute function public.bump_social_updated_at();

drop trigger if exists bump_social_rate_limits_updated_at on public.social_rate_limits;
create trigger bump_social_rate_limits_updated_at
  before update on public.social_rate_limits
  for each row execute function public.bump_social_updated_at();

-- ---------------------------------------------------------------------------
-- Ranking + discovery RPCs
-- ---------------------------------------------------------------------------

create or replace function public.record_feed_event(
  viewer_id uuid,
  post_id uuid,
  surface_name public.social_feed_surface,
  watch_ms integer default 0,
  completed_view boolean default false,
  skipped_view boolean default false,
  replayed_view boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if viewer_id is null or post_id is null then
    return;
  end if;

  insert into public.social_feed_events (
    viewer_user_id,
    post_id,
    surface,
    watch_ms,
    completed_view,
    skipped_view,
    replayed_view
  )
  values (
    viewer_id,
    post_id,
    surface_name,
    greatest(0, watch_ms),
    completed_view,
    skipped_view,
    replayed_view
  );
end;
$$;

create or replace function public.submit_negative_feedback(
  viewer_id uuid,
  target_post_id uuid,
  feedback public.social_feedback_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if viewer_id is null or target_post_id is null then
    return;
  end if;

  insert into public.social_negative_feedback (viewer_user_id, post_id, feedback_type)
  values (viewer_id, target_post_id, feedback)
  on conflict (viewer_user_id, post_id, feedback_type) do nothing;
end;
$$;

create or replace function public.feed_for_you(
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
  playback_url text,
  playback_id text,
  media_processing_status public.social_media_processing_status,
  duration_ms integer,
  aspect_ratio numeric,
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
      and p.is_published
      and public.can_view_post(viewer_id, p.user_id, p.visibility)
      and not exists (
        select 1
        from public.social_blocks b
        where (b.blocker_user_id = viewer_id and b.blocked_user_id = p.user_id)
           or (b.blocker_user_id = p.user_id and b.blocked_user_id = viewer_id)
      )
  ),
  viewer_signals as (
    select
      sfe.post_id,
      sum(greatest(sfe.watch_ms, 0))::numeric as watch_ms,
      sum(case when sfe.completed_view then 1 else 0 end)::numeric as completed_views,
      sum(case when sfe.skipped_view then 1 else 0 end)::numeric as skipped_views,
      sum(case when sfe.replayed_view then 1 else 0 end)::numeric as replayed_views
    from public.social_feed_events sfe
    where sfe.viewer_user_id = viewer_id
    group by sfe.post_id
  ),
  negative as (
    select snf.post_id, count(*)::numeric as negative_count
    from public.social_negative_feedback snf
    where snf.viewer_user_id = viewer_id
    group by snf.post_id
  ),
  ranked as (
    select
      cp.*,
      coalesce(vs.watch_ms, 0) as watch_ms,
      coalesce(vs.completed_views, 0) as completed_views,
      coalesce(vs.skipped_views, 0) as skipped_views,
      coalesce(vs.replayed_views, 0) as replayed_views,
      coalesce(ng.negative_count, 0) as negative_count,
      row_number() over (
        partition by cp.user_id
        order by cp.created_at desc
      ) as creator_rank,
      (
        ln(greatest(extract(epoch from (now() - cp.created_at)) / 3600.0, 1)) * -0.75
        + least(coalesce(cp.like_count, 0), 400) * 0.08
        + least(coalesce(cp.comment_count, 0), 400) * 0.12
        + least(coalesce(cp.save_count, 0), 400) * 0.16
        + least(coalesce(vs.watch_ms, 0) / 1000.0, 180) * 0.10
        + least(coalesce(vs.completed_views, 0), 40) * 0.70
        + least(coalesce(vs.replayed_views, 0), 30) * 0.45
        - least(coalesce(vs.skipped_views, 0), 40) * 0.8
        - least(coalesce(ng.negative_count, 0), 8) * 3.0
        + case when public.is_accepted_follower(viewer_id, cp.user_id) then 3 else 0 end
      ) as score
    from candidate_posts cp
    left join viewer_signals vs on vs.post_id = cp.id
    left join negative ng on ng.post_id = cp.id
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
    coalesce(pm.video_url, pm.playback_url, pm.hls_url, pm.image_url, pm.poster_url) as media_url,
    pm.poster_url as thumbnail_url,
    coalesce(pm.playback_url, pm.hls_url, pm.video_url) as playback_url,
    pm.playback_id,
    coalesce(pm.media_processing_status, 'pending') as media_processing_status,
    pm.duration_ms,
    pm.aspect_ratio,
    r.created_at,
    coalesce(r.like_count, 0) as like_count,
    coalesce(r.comment_count, 0) as comment_count,
    coalesce(r.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = r.id and l.user_id = viewer_id) as viewer_liked,
    exists(select 1 from public.saves s where s.post_id = r.id and s.user_id = viewer_id) as viewer_saved,
    r.score - (greatest(r.creator_rank - 2, 0) * 1.6) as rank_score
  from ranked r
  left join public.profiles pr on pr.id = r.user_id
  left join public.post_media pm on pm.post_id = r.id
  where r.negative_count < 2
  order by rank_score desc, r.created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.feed_following(
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
  playback_url text,
  playback_id text,
  media_processing_status public.social_media_processing_status,
  duration_ms integer,
  aspect_ratio numeric,
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
  from public.feed_for_you(viewer_id, cursor_created_at, page_size * 2)
  where user_id in (
    select following_user_id
    from public.follows
    where follower_user_id = viewer_id
  )
     or user_id = viewer_id
  order by created_at desc, rank_score desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.feed_reels(
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
  playback_url text,
  playback_id text,
  media_processing_status public.social_media_processing_status,
  duration_ms integer,
  aspect_ratio numeric,
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
  from public.feed_for_you(viewer_id, cursor_created_at, page_size * 3)
  where post_kind = 'reel' or media_type = 'video'
  order by rank_score desc, created_at desc
  limit greatest(1, least(page_size, 50));
$$;

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
  select
    post_id,
    user_id,
    author_name,
    author_handle,
    author_avatar_url,
    post_kind,
    caption,
    visibility,
    media_type,
    media_url,
    thumbnail_url,
    created_at,
    like_count,
    comment_count,
    save_count,
    viewer_liked,
    viewer_saved,
    rank_score
  from public.feed_for_you(viewer_id, cursor_created_at, page_size);
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
  select
    post_id,
    user_id,
    author_name,
    author_handle,
    author_avatar_url,
    post_kind,
    caption,
    visibility,
    media_type,
    media_url,
    thumbnail_url,
    created_at,
    like_count,
    comment_count,
    save_count,
    viewer_liked,
    viewer_saved,
    rank_score
  from public.feed_for_you(viewer_id, cursor_created_at, page_size * 2)
  where user_id <> viewer_id
    and visibility = 'public'
  order by rank_score desc, created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.follow_suggestions(
  viewer_id uuid,
  page_size integer default 12
)
returns table (
  user_id uuid,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with my_following as (
    select following_user_id
    from public.follows
    where follower_user_id = viewer_id
  ),
  mutual_graph as (
    select
      f.following_user_id as candidate_user_id,
      count(*)::numeric as mutual_count
    from public.follows f
    where f.follower_user_id in (select following_user_id from my_following)
      and f.following_user_id <> viewer_id
      and f.following_user_id not in (select following_user_id from my_following)
    group by f.following_user_id
  ),
  affinity as (
    select
      p.user_id as candidate_user_id,
      count(*)::numeric as affinity_count
    from public.posts p
    where p.user_id <> viewer_id
      and p.id in (
        select l.post_id from public.likes l where l.user_id = viewer_id
        union
        select c.post_id from public.comments c where c.user_id = viewer_id
        union
        select s.post_id from public.saves s where s.user_id = viewer_id
      )
    group by p.user_id
  )
  select
    coalesce(m.candidate_user_id, a.candidate_user_id) as user_id,
    coalesce(m.mutual_count, 0) * 2 + coalesce(a.affinity_count, 0) as score
  from mutual_graph m
  full join affinity a on a.candidate_user_id = m.candidate_user_id
  where coalesce(m.candidate_user_id, a.candidate_user_id) is not null
  order by score desc
  limit greatest(1, least(page_size, 60));
$$;

-- ---------------------------------------------------------------------------
-- Safety helpers
-- ---------------------------------------------------------------------------

create or replace function public.guard_social_surface_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if tg_table_name = 'posts' then
    select count(*)
    into recent_count
    from public.posts p
    where p.user_id = new.user_id
      and p.created_at > now() - interval '30 minutes';
    if recent_count >= 20 then
      raise exception 'Rate limited: too many posts';
    end if;
  elsif tg_table_name = 'follow_requests' then
    select count(*)
    into recent_count
    from public.follow_requests r
    where r.requester_user_id = new.requester_user_id
      and r.created_at > now() - interval '10 minutes';
    if recent_count >= 40 then
      raise exception 'Rate limited: too many follow requests';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_rate_limit_guard on public.posts;
create trigger posts_rate_limit_guard
  before insert on public.posts
  for each row execute function public.guard_social_surface_limits();

drop trigger if exists follow_requests_rate_limit_guard on public.follow_requests;
create trigger follow_requests_rate_limit_guard
  before insert on public.follow_requests
  for each row execute function public.guard_social_surface_limits();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

alter table public.social_video_uploads enable row level security;
alter table public.creator_drafts enable row level security;
alter table public.social_feed_events enable row level security;
alter table public.social_negative_feedback enable row level security;
alter table public.social_topics enable row level security;
alter table public.social_post_topics enable row level security;
alter table public.social_reports enable row level security;
alter table public.social_moderation_queue enable row level security;
alter table public.social_blocks enable row level security;
alter table public.social_mutes enable row level security;
alter table public.social_rate_limits enable row level security;

revoke all on table public.social_video_uploads from anon;
revoke all on table public.creator_drafts from anon;
revoke all on table public.social_feed_events from anon;
revoke all on table public.social_negative_feedback from anon;
revoke all on table public.social_topics from anon;
revoke all on table public.social_post_topics from anon;
revoke all on table public.social_reports from anon;
revoke all on table public.social_moderation_queue from anon;
revoke all on table public.social_blocks from anon;
revoke all on table public.social_mutes from anon;
revoke all on table public.social_rate_limits from anon;

grant select, insert, update on table public.social_video_uploads to authenticated;
grant select, insert, update, delete on table public.creator_drafts to authenticated;
grant select, insert on table public.social_feed_events to authenticated;
grant select, insert on table public.social_negative_feedback to authenticated;
grant select on table public.social_topics to authenticated;
grant select on table public.social_post_topics to authenticated;
grant select, insert on table public.social_reports to authenticated;
grant select on table public.social_moderation_queue to authenticated;
grant select, insert, delete on table public.social_blocks to authenticated;
grant select, insert, delete on table public.social_mutes to authenticated;
grant select on table public.social_rate_limits to authenticated;

drop policy if exists social_video_uploads_rw on public.social_video_uploads;
create policy social_video_uploads_rw on public.social_video_uploads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists creator_drafts_rw on public.creator_drafts;
create policy creator_drafts_rw on public.creator_drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists social_feed_events_insert on public.social_feed_events;
create policy social_feed_events_insert on public.social_feed_events
  for insert to authenticated
  with check (viewer_user_id = auth.uid());

drop policy if exists social_feed_events_select on public.social_feed_events;
create policy social_feed_events_select on public.social_feed_events
  for select to authenticated
  using (viewer_user_id = auth.uid());

drop policy if exists social_negative_feedback_rw on public.social_negative_feedback;
create policy social_negative_feedback_rw on public.social_negative_feedback
  for all to authenticated
  using (viewer_user_id = auth.uid())
  with check (viewer_user_id = auth.uid());

drop policy if exists social_topics_select on public.social_topics;
create policy social_topics_select on public.social_topics
  for select to authenticated
  using (true);

drop policy if exists social_post_topics_select on public.social_post_topics;
create policy social_post_topics_select on public.social_post_topics
  for select to authenticated
  using (true);

drop policy if exists social_reports_insert on public.social_reports;
create policy social_reports_insert on public.social_reports
  for insert to authenticated
  with check (reporter_user_id = auth.uid());

drop policy if exists social_reports_select on public.social_reports;
create policy social_reports_select on public.social_reports
  for select to authenticated
  using (reporter_user_id = auth.uid());

drop policy if exists social_moderation_queue_select on public.social_moderation_queue;
create policy social_moderation_queue_select on public.social_moderation_queue
  for select to authenticated
  using (false);

drop policy if exists social_blocks_rw on public.social_blocks;
create policy social_blocks_rw on public.social_blocks
  for all to authenticated
  using (blocker_user_id = auth.uid())
  with check (blocker_user_id = auth.uid());

drop policy if exists social_mutes_rw on public.social_mutes;
create policy social_mutes_rw on public.social_mutes
  for all to authenticated
  using (muter_user_id = auth.uid())
  with check (muter_user_id = auth.uid());

drop policy if exists social_rate_limits_select on public.social_rate_limits;
create policy social_rate_limits_select on public.social_rate_limits
  for select to authenticated
  using (user_id = auth.uid());

grant execute on function public.record_feed_event(uuid, uuid, public.social_feed_surface, integer, boolean, boolean, boolean) to authenticated;
grant execute on function public.submit_negative_feedback(uuid, uuid, public.social_feedback_type) to authenticated;
grant execute on function public.feed_for_you(uuid, timestamptz, integer) to authenticated;
grant execute on function public.feed_following(uuid, timestamptz, integer) to authenticated;
grant execute on function public.feed_reels(uuid, timestamptz, integer) to authenticated;
grant execute on function public.follow_suggestions(uuid, integer) to authenticated;

commit;
