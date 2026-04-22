-- Removal migration: retire the feed / posts / stories / reels model.
-- BJJ-native artifacts (systems, user_techniques, training_sessions),
-- moderation, social graph (follows/blocks/mutes), and notifications are retained.
-- The additive migration 20260422130000_community_living_artifacts.sql must land first.

-- -----------------------------------------------------------------------------
-- Drop RPCs that reference feed-era tables/types. Use a catalog-driven sweep
-- so overloaded signatures are handled regardless of prior migration drift.
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  target_names text[] := array[
    'feed_home','feed_for_you','feed_following','feed_reels','feed_explore',
    'feed_saved_posts','feed_user_profile','feed_user_profile_filtered',
    'moments_list','stories_active','social_trending_topics',
    'submit_negative_feedback','record_feed_event','record_playback_milestone',
    'refresh_social_post_feature_rollups','sync_post_engagement_counts',
    'sync_social_post_topics','comments_for_post','extract_social_hashtags',
    'can_view_post','handle_social_engagement_count_change',
    'notify_social_comment','notify_social_like',
    'guard_social_insert_limits','enqueue_social_report'
  ];
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(target_names)
  loop
    execute format('drop function if exists %I.%I(%s) cascade',
      r.nspname, r.proname, r.args);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Drop dependent tables. Order matters: children first.
-- -----------------------------------------------------------------------------
drop table if exists public.social_playback_events cascade;
drop table if exists public.social_feed_events cascade;
drop table if exists public.social_negative_feedback cascade;
drop table if exists public.social_post_topics cascade;
drop table if exists public.social_topics cascade;
drop table if exists public.social_post_feature_rollups cascade;
drop table if exists public.social_rate_limits cascade;
drop table if exists public.social_music_tracks cascade;
drop table if exists public.creator_drafts cascade;
drop table if exists public.social_video_uploads cascade;

drop table if exists public.moment_stories cascade;
drop table if exists public.moments cascade;

drop table if exists public.saves cascade;
drop table if exists public.likes cascade;
drop table if exists public.comment_likes cascade;
drop table if exists public.comments cascade;
drop table if exists public.story_views cascade;
drop table if exists public.stories cascade;
drop table if exists public.post_media cascade;
drop table if exists public.posts cascade;

-- -----------------------------------------------------------------------------
-- Drop feed-era enums / types that are no longer referenced.
-- -----------------------------------------------------------------------------
drop type if exists public.post_visibility cascade;
drop type if exists public.post_media_type cascade;
drop type if exists public.social_feed_surface cascade;
drop type if exists public.social_playback_milestone cascade;

-- -----------------------------------------------------------------------------
-- Narrow the surviving rate-limit guards so they reference only kept tables.
-- guard_social_surface_limits now covers follow_requests only;
-- guard_social_abuse_limits now covers social_reports only.
-- -----------------------------------------------------------------------------
create or replace function public.guard_social_surface_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if tg_table_name = 'follow_requests' then
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

create or replace function public.guard_social_abuse_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if tg_table_name = 'social_reports' then
    select count(*)
      into recent_count
    from public.social_reports sr
    where sr.reporter_user_id = new.reporter_user_id
      and sr.created_at > now() - interval '1 hour';
    if recent_count >= 12 then
      raise exception 'Rate limited: too many reports';
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Remove obsolete notification rows referencing dropped objects. The
-- notifications table survives; only rows pointing at gone objects are cleared.
-- -----------------------------------------------------------------------------
delete from public.notifications
where kind in ('post_like', 'post_comment', 'story_view', 'post_mention', 'post_reply', 'post_follow_like');

