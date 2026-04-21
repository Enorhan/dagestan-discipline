import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { fetch } from 'undici'

type RenderStatus = 'idle' | 'processing' | 'ready' | 'failed'
type CreativeMode = 'post' | 'story'

type MusicSelection = {
  trackId: string
  previewUrl?: string
  startMs?: number
  durationMs?: number
  volume?: number
}

type CreativeEdit = {
  mode?: CreativeMode
  crop?: { aspectPreset?: '9:16' | '4:5' | '1:1' }
  music?: MusicSelection | null
}

const OUTPUT_SIZES: Record<NonNullable<NonNullable<CreativeEdit['crop']>['aspectPreset']>, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function normalizeUrl(input: string, baseUrl: string | undefined): string {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (!baseUrl) throw new Error(`Relative URL requires ASSET_BASE_URL: ${trimmed}`)
  return `${baseUrl.replace(/\/$/, '')}/${trimmed.replace(/^\/+/, '')}`
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function runFfmpeg(args: string[], timeoutMs: number) {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('ffmpeg', args, {
      env: process.env,
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let errorOutput = ''
    const timeoutId = setTimeout(() => {
      child.kill('SIGKILL')
      rejectPromise(new Error(`ffmpeg timed out after ${timeoutMs}ms`))
    }, Math.max(1_000, timeoutMs))

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString()
    })

    child.on('error', (error) => rejectPromise(error))
    child.on('close', (code) => {
      clearTimeout(timeoutId)
      if (code === 0) return resolvePromise()
      rejectPromise(new Error(errorOutput.trim() || `ffmpeg exited with code ${code}`))
    })
  })
}

async function uploadToStorage(params: {
  supabase: any
  bucket: string
  path: string
  contentType: string
  bytes: Buffer
}): Promise<string> {
  const { supabase, bucket, path, contentType, bytes } = params

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to derive public URL for uploaded render')
  return data.publicUrl
}

async function claimNextJob(params: {
  supabase: any
}): Promise<null | {
  kind: 'post' | 'story'
  id: string
  creativeEdit: CreativeEdit
  sourceImageUrl: string
  thumbnailUrl: string
}> {
  const { supabase } = params

  // Posts first.
  {
    const { data, error } = await supabase
      .from('posts')
      .select('id, creative_edit, render_status, post_media(image_url, poster_url)')
      .eq('media_type', 'image')
      .eq('render_status', 'processing')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as any[]) {
      const edit = (row.creative_edit ?? {}) as CreativeEdit
      if (!edit.music?.trackId) continue
      const media = Array.isArray(row.post_media) ? row.post_media[0] : row.post_media
      const source = String(media?.poster_url ?? media?.image_url ?? '').trim()
      if (!source) continue

      const { data: claimed, error: claimError } = await supabase
        .from('posts')
        .update({ render_status: 'processing' satisfies RenderStatus })
        .eq('id', row.id)
        .eq('render_status', 'processing')
        .select('id')
        .maybeSingle()
      if (claimError) throw new Error(claimError.message)
      if (!claimed) continue

      return {
        kind: 'post',
        id: row.id,
        creativeEdit: edit,
        sourceImageUrl: source,
        thumbnailUrl: source,
      }
    }
  }

  // Stories.
  {
    const { data, error } = await supabase
      .from('stories')
      .select('id, creative_edit, render_status, media_url, thumbnail_url')
      .eq('media_type', 'image')
      .eq('render_status', 'processing')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as any[]) {
      const edit = (row.creative_edit ?? {}) as CreativeEdit
      if (!edit.music?.trackId) continue
      const source = String(row.thumbnail_url ?? row.media_url ?? '').trim()
      if (!source) continue

      const { data: claimed, error: claimError } = await supabase
        .from('stories')
        .update({ render_status: 'processing' satisfies RenderStatus })
        .eq('id', row.id)
        .eq('render_status', 'processing')
        .select('id')
        .maybeSingle()
      if (claimError) throw new Error(claimError.message)
      if (!claimed) continue

      return {
        kind: 'story',
        id: row.id,
        creativeEdit: edit,
        sourceImageUrl: source,
        thumbnailUrl: source,
      }
    }
  }

  return null
}

async function resolveTrackPreviewUrl(params: {
  supabase: any
  trackId: string
  fallbackPreviewUrl?: string
  assetBaseUrl?: string
}): Promise<string> {
  const { supabase, trackId, fallbackPreviewUrl, assetBaseUrl } = params

  const { data, error } = await supabase
    .from('social_music_tracks')
    .select('preview_url')
    .eq('id', trackId)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const previewUrl = String((data as any)?.preview_url ?? fallbackPreviewUrl ?? '').trim()
  if (!previewUrl) throw new Error(`Missing preview_url for track ${trackId}`)
  return normalizeUrl(previewUrl, assetBaseUrl)
}

async function renderJob(params: {
  supabase: any
  kind: 'post' | 'story'
  id: string
  creativeEdit: CreativeEdit
  sourceImageUrl: string
  thumbnailUrl: string
}) {
  const { supabase, kind, id, creativeEdit, sourceImageUrl, thumbnailUrl } = params

  const music = creativeEdit.music
  if (!music?.trackId) {
    throw new Error('Job has no music selection')
  }

  const aspectPreset = creativeEdit.crop?.aspectPreset ?? (creativeEdit.mode === 'story' ? '9:16' : '4:5')
  const outputSize = OUTPUT_SIZES[aspectPreset] ?? OUTPUT_SIZES['9:16']

  const assetBaseUrl = process.env.ASSET_BASE_URL?.trim() || undefined
  const audioUrl = await resolveTrackPreviewUrl({
    supabase,
    trackId: music.trackId,
    fallbackPreviewUrl: music.previewUrl,
    assetBaseUrl,
  })

  const durationMs = clampNumber(music.durationMs, 1_000, 15_000, creativeEdit.mode === 'story' ? 15_000 : 10_000)
  const startMs = clampNumber(music.startMs, 0, 14_000, 0)
  const volume = clampNumber(music.volume, 0, 1, 1)

  let workingDirectory = ''
  try {
    workingDirectory = await mkdtemp(join(tmpdir(), 'dd-social-render-worker-'))
    await mkdir(workingDirectory, { recursive: true })
    const imagePath = join(workingDirectory, 'frame.jpg')
    const audioPath = join(workingDirectory, 'track.m4a')
    const outputPath = join(workingDirectory, 'output.mp4')

    const [imageBytes, audioBytes] = await Promise.all([
      downloadToBuffer(sourceImageUrl),
      downloadToBuffer(audioUrl),
    ])

    await Promise.all([
      writeFile(imagePath, imageBytes),
      writeFile(audioPath, audioBytes),
    ])

    const ffmpegTimeoutMs = clampNumber(process.env.FFMPEG_TIMEOUT_MS, 5_000, 5 * 60_000, 90_000)
    await runFfmpeg([
      '-y',
      '-loop',
      '1',
      '-framerate',
      '30',
      '-i',
      imagePath,
      '-ss',
      (startMs / 1000).toFixed(3),
      '-t',
      (durationMs / 1000).toFixed(3),
      '-i',
      audioPath,
      '-vf',
      `scale=${outputSize.width}:${outputSize.height}:force_original_aspect_ratio=increase,crop=${outputSize.width}:${outputSize.height}`,
      '-filter:a',
      `volume=${volume}`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-shortest',
      outputPath,
    ], ffmpegTimeoutMs)

    const bytes = await readFile(outputPath)
    const bucket = process.env.SUPABASE_RENDER_BUCKET?.trim() || 'session-media'
    const objectPath = `renders/${kind}/${id}/${Date.now()}-${music.trackId}.mp4`
    const publicUrl = await uploadToStorage({
      supabase,
      bucket,
      path: objectPath,
      contentType: 'video/mp4',
      bytes,
    })

    if (kind === 'post') {
      const { error: postError } = await supabase
        .from('posts')
        .update({
          render_status: 'ready',
          render_error: null,
          media_type: 'video',
        })
        .eq('id', id)
      if (postError) throw new Error(postError.message)

      const { error: mediaError } = await supabase
        .from('post_media')
        .upsert({
          post_id: id,
          video_url: publicUrl,
          playback_url: publicUrl,
          poster_url: thumbnailUrl,
          media_processing_status: 'ready',
          duration_ms: durationMs,
        }, { onConflict: 'post_id' })
      if (mediaError) throw new Error(mediaError.message)
      return
    }

    const { error: storyError } = await supabase
      .from('stories')
      .update({
        render_status: 'ready',
        render_error: null,
        media_type: 'video',
        media_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        duration_ms: durationMs,
      })
      .eq('id', id)
    if (storyError) throw new Error(storyError.message)
  } finally {
    if (workingDirectory) {
      await rm(workingDirectory, { recursive: true, force: true }).catch(() => {})
    }
  }
}

async function setFailed(params: {
  supabase: any
  kind: 'post' | 'story'
  id: string
  message: string
}) {
  const { supabase, kind, id, message } = params
  const errorText = message.slice(0, 9000)
  if (kind === 'post') {
    await supabase.from('posts').update({ render_status: 'failed', render_error: errorText }).eq('id', id)
    return
  }
  await supabase.from('stories').update({ render_status: 'failed', render_error: errorText }).eq('id', id)
}

async function main() {
  const supabaseUrl = requiredEnv('SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase: any = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const port = Math.max(1, Math.floor(Number(process.env.PORT ?? '8080') || 8080))
  const server = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.statusCode = 200
      res.setHeader('content-type', 'text/plain')
      res.end('ok')
      return
    }
    res.statusCode = 200
    res.setHeader('content-type', 'text/plain')
    res.end('dd-social-render-worker')
  })
  server.listen(port, '0.0.0.0', () => {
    console.log('http-listening', { port })
  })

  let shuttingDown = false
  const requestShutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('shutdown', { signal })
    server.close(() => {
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 2500).unref()
  }
  process.on('SIGTERM', () => requestShutdown('SIGTERM'))
  process.on('SIGINT', () => requestShutdown('SIGINT'))

  const pollMs = clampNumber(process.env.POLL_INTERVAL_MS, 1500, 30_000, 5000)
  const idleSleepMs = clampNumber(process.env.IDLE_SLEEP_MS, 1000, 60_000, 6000)

  // Cloud Run can keep one instance warm; this loop is also fine on a small always-on container.
  for (;;) {
    if (shuttingDown) return
    let job: Awaited<ReturnType<typeof claimNextJob>> = null
    try {
      job = await claimNextJob({ supabase })
    } catch (error) {
      console.error('job-claim-failed', error)
      await new Promise((resolve) => setTimeout(resolve, idleSleepMs))
      continue
    }

    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, pollMs))
      continue
    }

    try {
      console.log('render-start', { kind: job.kind, id: job.id })
      await renderJob({
        supabase,
        kind: job.kind,
        id: job.id,
        creativeEdit: job.creativeEdit,
        sourceImageUrl: job.sourceImageUrl,
        thumbnailUrl: job.thumbnailUrl,
      })
      console.log('render-success', { kind: job.kind, id: job.id })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('render-failed', { kind: job.kind, id: job.id, message })
      await setFailed({ supabase, kind: job.kind, id: job.id, message })
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

main().catch((error) => {
  console.error('fatal', error)
  process.exit(1)
})

