# Social Feed Rollout Plan

## Feature Flags

- `NEXT_PUBLIC_SOCIAL_FEED_ENABLED`
- `NEXT_PUBLIC_SOCIAL_STORIES_ENABLED`
- `NEXT_PUBLIC_SOCIAL_REELS_ENABLED`
- `NEXT_PUBLIC_SOCIAL_EXPLORE_ENABLED`
- `NEXT_PUBLIC_SOCIAL_CREATOR_DRAFTS_ENABLED`
- `NEXT_PUBLIC_SOCIAL_SCHEDULING_ENABLED`
- `NEXT_PUBLIC_SOCIAL_MODERATION_ENABLED`
- `NEXT_PUBLIC_SOCIAL_VIDEO_UPLOADS_ENABLED`
- `NEXT_PUBLIC_SOCIAL_FEED_RANKING_V2_ENABLED`
- `NEXT_PUBLIC_SOCIAL_TRUST_SAFETY_STRICT_MODE_ENABLED`
- `NEXT_PUBLIC_SOCIAL_EXPANDED_NOTIFICATIONS_ENABLED`

Use staged rollout:

1. Internal dogfood: all flags `true` only in internal config.
2. Beta users: enable `socialFeed` + `socialStories`.
3. Public phased release: gradually enable `socialExplore`, then `socialReels`.
4. Enable drafts + scheduling for 10% of creators.
5. Enable moderation/report actions once queue staffing and alerts are ready.
6. 100% rollout after privacy and abuse checks are stable.

Recommended kill-switch matrix for risky increments:

- **Upload pipeline**: set `socialVideoUploadsEnabled=false` if webhook lag or provider failures spike.
- **Ranking rollout**: set `socialFeedRankingV2Enabled=false` to fall back to legacy rank behavior.
- **Strict trust/safety mode**: set `socialTrustSafetyStrictModeEnabled=true` to tighten abuse limits during attacks.
- **Expanded notifications**: keep `socialExpandedNotificationsEnabled=false` until mention/reply quality and mute/block filtering are stable.

## Anti-abuse Controls

- DB trigger guard for insert spikes on `comments`, `likes`, `posts`, and `follow_requests`.
- Enforced follow-request mediation for private account follows.
- Feed reads resolved through RPC + privacy rules to prevent RLS bypass in client queries.
- Negative feedback loop (`hide`, `not_interested`, `report`) persisted in `social_negative_feedback`.
- Explicit block/mute relationships (`social_blocks`, `social_mutes`) respected by ranking functions.

## QA Scenario Matrix

- Public account + public post visible to all authenticated users.
- Private account + public/followers post visible only to accepted followers.
- Private post (`visibility=private`) visible only to owner.
- Follow request lifecycle: send, accept, reject, unfollow.
- Pagination cursor correctness across Home / Explore / Reels.
- Following feed should stay mostly recency-ordered while For You uses rank score.
- Story expiry behavior and view-state updates.
- Offline retry for like/comment/write failures.
- Scheduled post publish job should mark `is_published=true` and emit owner notification.
- Video upload webhook should transition media status (`pending` -> `processing` -> `ready|failed`).
- Report insert should auto-create moderation queue entries with non-zero priority.
- Threaded comment fetch (`comments_for_post`) should return root and reply pages consistently.

## Analytics Events

- `social_feed_impression`
- `social_post_created`
- `social_post_liked`
- `social_post_saved`
- `social_comment_created`
- `social_story_created`
- `social_follow_request_sent`
- `social_followed`
- `social_follow_request_responded`
- `social_video_upload_intent_created`
- `social_reel_watch_started`
- `social_reel_watch_progress`
- `social_reel_watch_completed`
- `social_negative_feedback`
- `social_reel_impression`
- `social_reel_view_2s`
- `social_reel_quartile`
- `social_reel_skipped`
- `social_reel_replayed`

## Operational Dashboards

- Feed quality: For You CTR, 2s view rate, completion rate, skip rate, not-interested rate.
- Creator health: upload intent success, transcode-ready latency p50/p95, scheduled publish success.
- Safety: reports/hour, queue backlog by priority, false-positive report dismiss rate.
- Reliability: RPC p95 latency (`feed_for_you`, `feed_following`, `feed_reels`), webhook failure rate.
- Ranking freshness: `refresh_social_post_feature_rollups` row_count and runtime per execution window.
- Moderation throughput: report->queue enqueue success rate and open queue age p95.

## Rollback Levers

- Disable reels entirely: `NEXT_PUBLIC_SOCIAL_REELS_ENABLED=false`.
- Disable draft/scheduling features while retaining baseline posting:
  - `NEXT_PUBLIC_SOCIAL_CREATOR_DRAFTS_ENABLED=false`
  - `NEXT_PUBLIC_SOCIAL_SCHEDULING_ENABLED=false`
- Disable reporting/moderation surfaces if moderation queue tooling is unavailable:
  - `NEXT_PUBLIC_SOCIAL_MODERATION_ENABLED=false`
- Disable upload pipeline while keeping feed online:
  - `NEXT_PUBLIC_SOCIAL_VIDEO_UPLOADS_ENABLED=false`
- Disable ranking v2 experiments:
  - `NEXT_PUBLIC_SOCIAL_FEED_RANKING_V2_ENABLED=false`
