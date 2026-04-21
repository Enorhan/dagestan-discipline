# Social creative render worker (ffmpeg)

Runs `ffmpeg` in a container to render music-backed creatives for posts/stories, while Supabase remains the backend (Auth/DB/Storage).

## What it does
- Polls Supabase Postgres for `posts`/`stories` rows with `render_status = 'processing'` and a `creative_edit.music.trackId`.
- Downloads the flattened image (from `post_media.poster_url`/`image_url` for posts, `thumbnail_url`/`media_url` for stories).
- Downloads the selected track preview audio from `social_music_tracks.preview_url` (or from `creative_edit.music.previewUrl`).
- Uses `ffmpeg` to create an MP4 (looped image + music segment).
- Uploads the MP4 to Supabase Storage (default bucket: `session-media`) under `renders/...`.
- Updates the row to `render_status = 'ready'` (or `failed` with `render_error`).

## Required environment variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Optional environment variables
- `ASSET_BASE_URL` (required if your `preview_url` values are relative like `/audio/social/foo.m4a`)
- `SUPABASE_RENDER_BUCKET` (default: `session-media`)
- `POLL_INTERVAL_MS` (default: 5000)
- `IDLE_SLEEP_MS` (default: 6000)

## Cloud Run deploy (example)
Build & deploy (replace placeholders):

```bash
gcloud builds submit --tag "gcr.io/$PROJECT_ID/dd-social-render-worker"
gcloud run deploy dd-social-render-worker \
  --image "gcr.io/$PROJECT_ID/dd-social-render-worker" \
  --region "$REGION" \
  --platform managed \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 1 \
  --min-instances 0 \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,ASSET_BASE_URL=$ASSET_BASE_URL,SUPABASE_RENDER_BUCKET=session-media" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest" \
  --no-allow-unauthenticated
```

Notes:
- This process polls; Cloud Run instances may scale to zero. If you need always-on, set `--min-instances 1`.\n
