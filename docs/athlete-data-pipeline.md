# Athlete Data Expansion Pipeline

This v1 pipeline grows the athlete/exercise library from real video content with explicit attribution and confidence.

## Pipeline Stages

1. Collect
- Reads active rows from `content_sources`
- Fetches source documents:
  - YouTube (`youtube_search`) discovery
  - Web search (seeded as `social_feed` with `metadata.kind=web_search`) discovery (Brave Search API recommended; Google Custom Search may be unavailable for new projects)
  - Reddit (`reddit_search`) discovery
  - RSS feeds (`rss_feed`)
  - Fixed URLs (`web_url`)
- In video-only mode, defaults to sources with `allow_video_ingest=true`
- Writes into `source_documents`

2. Extract
- Downloads video/audio with `yt-dlp`
- Extracts frames with `ffmpeg`
- Transcribes audio with OpenAI ASR
- Runs multimodal OCR/vision + transcript fusion to detect exercises/events
- For web documents (when `PIPELINE_VIDEO_ONLY=false`):
  - extracts page text during collection (`web_url`) and stores a snippet in `raw_payload.snippet`
  - uses OpenAI text extraction to produce structured signals
- Writes evidence tables:
  - `video_ingests`
  - `transcript_segments`
  - `frame_detections`
  - `exercise_events`
- Writes normalized signals into `extracted_signals`

3. Queue (Normalization + Moderation)
- Builds proposals for `athlete`, `exercise`, `athlete_exercise`, and `routine`
- Writes proposals into `moderation_queue`
- Keeps `source_attribution` and confidence on each proposal

4. Review
- Auto-approves high-confidence proposals
- Auto-rejects low-confidence proposals
- Leaves middle-confidence items pending for manual review

5. Publish
- Publishes approved proposals into core tables:
  - `athletes`
  - `exercises`
  - `athlete_exercises`
  - `ingested_workout_routines`
- Always ensures an `athlete_exercises` link exists for published exercises:
  - real detected athlete when available
  - fallback `Source Coach (Sport)` athlete when not available
- Converts approved `exercise_events` into `drills` for Training Hub growth (`category=exercise`)
- Optionally creates routines from event bundles when enabled
- Creates audit rows in `published_records`

## Setup

1. Apply Supabase migration:
- `supabase db push`

2. Fill environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY` (YouTube discovery)
- `BRAVE_SEARCH_API_KEY` (Web search discovery)
- Optional: `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` (legacy Web search discovery)
- `OPENAI_API_KEY` (ASR + multimodal extraction)

3. Install local video tools:
- `yt-dlp`
- `ffmpeg`

4. Optional tuning envs:
- `PIPELINE_MAX_ITEMS_PER_SOURCE`
- `PIPELINE_VIDEO_ONLY`
- `PIPELINE_VIDEO_RELEVANCE_THRESHOLD`
- `PIPELINE_WEB_RELEVANCE_THRESHOLD`
- `PIPELINE_WEB_MAX_TEXT_CHARS`
- `PIPELINE_ALLOW_BING_RSS_WEB_SEARCH` (dev-only fallback; not recommended)
- `PIPELINE_BRAVE_MIN_INTERVAL_MS` (rate-limit throttle for Brave Search)
- `PIPELINE_FRAME_INTERVAL_SECONDS`
- `PIPELINE_MAX_FRAMES`
- `PIPELINE_MAX_VIDEO_SECONDS`
- `PIPELINE_AUTO_APPROVE_THRESHOLD`
- `PIPELINE_AUTO_REJECT_THRESHOLD`
- `PIPELINE_PUBLISH_DRILLS_FROM_EVENTS`
- `PIPELINE_PUBLISH_ROUTINES_FROM_EVENTS`

## Commands

Seed default sources:
- `npm run pipeline:sources`

Run stages individually:
- `npm run pipeline:collect`
- `npm run pipeline:extract`
- `npm run pipeline:queue`
- `npm run pipeline:review`
- `npm run pipeline:publish`

Run end-to-end:
- `npm run pipeline:run`

## Manual Review Workflow

Inspect pending queue:
- Supabase table: `moderation_queue`
- Filter `status = 'pending'`

Approve/reject manually by updating:
- `status`
- `reviewer_notes`
- `reviewed_at`

Then publish:
- `npm run pipeline:publish`

## Notes

- In `PIPELINE_VIDEO_ONLY=true` mode, non-video sources are ignored/discarded during extraction.
- If `yt-dlp`, `ffmpeg`, or `OPENAI_API_KEY` are missing, extract stage will fail for video ingestion.
