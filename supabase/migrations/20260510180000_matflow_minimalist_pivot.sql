-- MatFlow minimalist pivot: drop social/community surfaces, snapshot creator names
-- so user-created systems and catalog techniques survive account deletion with
-- attribution. Personal user_techniques (forks) keep their existing CASCADE
-- semantics — the underlying catalog technique is what survives.

-- 1. Snapshot column for owner display name on persistent artifacts.
alter table public.systems
  add column if not exists creator_display_name_snapshot text;

alter table public.techniques
  add column if not exists creator_display_name_snapshot text;

-- 2. Backfill snapshot for currently-owned rows so legacy data is consistent.
update public.systems s
set creator_display_name_snapshot = p.display_name
from public.profiles p
where s.user_id = p.id
  and s.user_id is not null
  and (s.creator_display_name_snapshot is null or s.creator_display_name_snapshot = '');

update public.techniques t
set creator_display_name_snapshot = p.display_name
from public.profiles p
where t.created_by = p.id
  and t.created_by is not null
  and (t.creator_display_name_snapshot is null or t.creator_display_name_snapshot = '');

-- 3. Drop social-feature RPCs (handles overloads via dynamic SQL).
do $$
declare
  r record;
  social_routines text[] := array[
    'comments_for_post', 'community_is_blocked', 'drill_challenge_leaderboard',
    'enqueue_social_report', 'feed_following', 'feed_for_you', 'feed_saved_posts',
    'feed_user_profile', 'feed_user_profile_filtered', 'follow_suggestions',
    'guard_social_abuse_limits', 'guard_social_insert_limits', 'guard_social_surface_limits',
    'is_accepted_follower', 'is_social_moderator', 'list_my_received_reviews',
    'list_public_user_reviews', 'list_session_reviews', 'list_target_comments',
    'moments_list', 'notify_social_comment', 'notify_social_like', 'post_session_review',
    'post_target_comment', 'record_feed_event', 'record_playback_milestone',
    'refresh_social_post_feature_rollups', 'request_or_follow',
    'resolve_social_moderation_item', 'respond_follow_request', 'search_public_profiles',
    'social_moderation_queue_page', 'social_profile_overview', 'social_trending_topics',
    'stories_active', 'submit_negative_feedback', 'sync_post_engagement_counts',
    'sync_social_post_topics', 'get_public_profile',
    'handle_social_engagement_count_change', 'bump_social_updated_at',
    'notify_social_follow', 'notify_social_follow_request',
    '_comments_ensure_target'
  ];
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname = any(social_routines)
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.nspname, r.proname, r.args);
  end loop;
end $$;

-- 4. Drop social-feature tables (CASCADE clears policies, FKs, triggers, indexes).
drop table if exists public.training_session_likes cascade;
drop table if exists public.training_session_comments cascade;
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.saves cascade;
drop table if exists public.post_media cascade;
drop table if exists public.posts cascade;
drop table if exists public.follows cascade;
drop table if exists public.follow_requests cascade;
drop table if exists public.story_views cascade;
drop table if exists public.stories cascade;
drop table if exists public.moment_stories cascade;
drop table if exists public.moments cascade;
drop table if exists public.social_blocks cascade;
drop table if exists public.social_mutes cascade;
drop table if exists public.social_feed_events cascade;
drop table if exists public.social_negative_feedback cascade;
drop table if exists public.social_post_topics cascade;
drop table if exists public.social_post_feature_rollups cascade;
drop table if exists public.social_topics cascade;
drop table if exists public.social_rate_limits cascade;
drop table if exists public.social_reports cascade;
drop table if exists public.social_video_uploads cascade;
drop table if exists public.social_music_tracks cascade;
drop table if exists public.creator_drafts cascade;
drop table if exists public.invite_links cascade;

-- 5. Drop community pivot scaffolding (never wired to a shipping surface).
drop table if exists public.coach_subscriptions cascade;
drop table if exists public.drill_completions cascade;
drop table if exists public.drill_challenges cascade;
drop table if exists public.session_reviews cascade;

-- 6. Drop the supabase_realtime publication memberships for any tables we
--    just removed — DROP TABLE CASCADE handles dependent objects but the
--    publication itself remains; this is a no-op safety pass.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Re-emit a noop alter so the publication's view is consistent.
    perform 1;
  end if;
end $$;

