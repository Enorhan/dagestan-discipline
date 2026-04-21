begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_publish_target') then
    create type public.social_publish_target as enum ('post', 'reel', 'story');
  end if;
end $$;

alter table public.creator_drafts
  add column if not exists publish_target public.social_publish_target not null default 'reel',
  add column if not exists source_media_url text,
  add column if not exists source_thumbnail_url text,
  add column if not exists source_media_type public.post_media_type,
  add column if not exists render_job_id text;

update public.creator_drafts
set
  publish_target = case
    when post_kind = 'reel' then 'reel'::public.social_publish_target
    else 'post'::public.social_publish_target
  end,
  source_media_url = coalesce(source_media_url, upload_url),
  source_thumbnail_url = coalesce(source_thumbnail_url, thumbnail_url),
  source_media_type = coalesce(source_media_type, media_type)
where source_media_url is null
   or source_thumbnail_url is null
   or source_media_type is null
   or publish_target is null;

create index if not exists idx_creator_drafts_user_target_updated
  on public.creator_drafts (user_id, publish_target, updated_at desc);

create or replace function public.social_profile_overview(
  viewer_id uuid,
  profile_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  bio text,
  primary_discipline text,
  follower_count bigint,
  following_count bigint,
  post_count bigint,
  reel_count bigint,
  saved_count bigint,
  is_self boolean,
  viewer_follows boolean,
  viewer_requested boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.display_name, 'Grappler') as display_name,
    coalesce(p.username, 'grappler') as username,
    p.avatar_url,
    coalesce(p.bio, '') as bio,
    p.primary_discipline,
    (
      select count(*)::bigint
      from public.follows f
      where f.following_user_id = p.id
    ) as follower_count,
    (
      select count(*)::bigint
      from public.follows f
      where f.follower_user_id = p.id
    ) as following_count,
    (
      select count(*)::bigint
      from public.posts post
      where post.user_id = p.id
        and post.is_published
        and not post.is_archived
        and post.post_kind <> 'reel'
        and public.can_view_post(viewer_id, post.user_id, post.visibility)
    ) as post_count,
    (
      select count(*)::bigint
      from public.posts post
      where post.user_id = p.id
        and post.is_published
        and not post.is_archived
        and post.post_kind = 'reel'
        and public.can_view_post(viewer_id, post.user_id, post.visibility)
    ) as reel_count,
    (
      select count(*)::bigint
      from public.saves s
      where s.user_id = p.id
    ) as saved_count,
    (p.id = viewer_id) as is_self,
    public.is_accepted_follower(viewer_id, p.id) as viewer_follows,
    exists(
      select 1
      from public.follow_requests fr
      where fr.requester_user_id = viewer_id
        and fr.target_user_id = p.id
        and fr.status = 'pending'
    ) as viewer_requested
  from public.profiles p
  where p.id = profile_id
    and (
      profile_id = viewer_id
      or public.can_view_author_profile(viewer_id, profile_id)
    );
$$;

create or replace function public.feed_user_profile_filtered(
  viewer_id uuid,
  profile_id uuid,
  tab_filter text default 'posts',
  cursor_created_at timestamptz default now(),
  page_size integer default 24
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
  select
    post.id as post_id,
    post.user_id,
    coalesce(profile.display_name, 'Grappler') as author_name,
    ('@' || coalesce(profile.username, 'grappler')) as author_handle,
    profile.avatar_url as author_avatar_url,
    post.post_kind,
    post.caption,
    post.visibility,
    post.media_type,
    coalesce(media.image_url, media.poster_url, media.video_url, media.playback_url, media.hls_url) as media_url,
    coalesce(media.poster_url, media.image_url) as thumbnail_url,
    coalesce(media.playback_url, media.hls_url, media.video_url) as playback_url,
    media.playback_id,
    coalesce(
      media.media_processing_status,
      case when post.media_type = 'video'
        then 'pending'::public.social_media_processing_status
        else 'ready'::public.social_media_processing_status
      end
    ) as media_processing_status,
    media.duration_ms,
    media.aspect_ratio,
    post.created_at,
    coalesce(post.like_count, 0) as like_count,
    coalesce(post.comment_count, 0) as comment_count,
    coalesce(post.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = post.id and l.user_id = viewer_id) as viewer_liked,
    exists(select 1 from public.saves s where s.post_id = post.id and s.user_id = viewer_id) as viewer_saved,
    0::numeric as rank_score
  from public.posts post
  left join public.profiles profile on profile.id = post.user_id
  left join public.post_media media on media.post_id = post.id
  where post.user_id = profile_id
    and post.created_at < cursor_created_at
    and post.is_published
    and not post.is_archived
    and public.can_view_post(viewer_id, post.user_id, post.visibility)
    and case
      when tab_filter = 'reels' then post.post_kind = 'reel'
      when tab_filter = 'posts' then post.post_kind <> 'reel'
      else true
    end
  order by post.created_at desc
  limit greatest(1, least(page_size, 60));
$$;

create or replace function public.feed_saved_posts(
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 24
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
  select
    post.id as post_id,
    post.user_id,
    coalesce(profile.display_name, 'Grappler') as author_name,
    ('@' || coalesce(profile.username, 'grappler')) as author_handle,
    profile.avatar_url as author_avatar_url,
    post.post_kind,
    post.caption,
    post.visibility,
    post.media_type,
    coalesce(media.image_url, media.poster_url, media.video_url, media.playback_url, media.hls_url) as media_url,
    coalesce(media.poster_url, media.image_url) as thumbnail_url,
    coalesce(media.playback_url, media.hls_url, media.video_url) as playback_url,
    media.playback_id,
    coalesce(
      media.media_processing_status,
      case when post.media_type = 'video'
        then 'pending'::public.social_media_processing_status
        else 'ready'::public.social_media_processing_status
      end
    ) as media_processing_status,
    media.duration_ms,
    media.aspect_ratio,
    post.created_at,
    coalesce(post.like_count, 0) as like_count,
    coalesce(post.comment_count, 0) as comment_count,
    coalesce(post.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = post.id and l.user_id = viewer_id) as viewer_liked,
    true as viewer_saved,
    0::numeric as rank_score
  from public.saves saved
  join public.posts post on post.id = saved.post_id
  left join public.profiles profile on profile.id = post.user_id
  left join public.post_media media on media.post_id = post.id
  where saved.user_id = viewer_id
    and saved.created_at < cursor_created_at
    and post.is_published
    and not post.is_archived
    and public.can_view_post(viewer_id, post.user_id, post.visibility)
  order by saved.created_at desc
  limit greatest(1, least(page_size, 60));
$$;

grant execute on function public.social_profile_overview(uuid, uuid) to authenticated;
grant execute on function public.feed_user_profile_filtered(uuid, uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.feed_saved_posts(uuid, timestamptz, integer) to authenticated;

commit;
