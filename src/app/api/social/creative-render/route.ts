import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { NextResponse } from 'next/server'
import { SOCIAL_MUSIC_TRACK_FALLBACKS } from '@/lib/social-creative'
import { createServerSupabase } from '@/lib/supabase-server'
import type {
  SocialCreativeAspectPreset,
  SocialCreativeFilterId,
} from '@/lib/social-models'

export const runtime = 'nodejs'

const OUTPUT_SIZES: Record<SocialCreativeAspectPreset, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
}

const MAX_SOURCE_BYTES = 128 * 1024 * 1024
const MAX_AUDIO_BYTES = 16 * 1024 * 1024
const MAX_OUTPUT_BYTES = 160 * 1024 * 1024
const FFMPEG_TIMEOUT_MS = 60_000
const MAX_GLOBAL_CONCURRENCY = 2
const RATE_LIMIT_WINDOW_MS = 5 * 60_000
const RATE_LIMIT_MAX_REQUESTS = 5

let globalInFlight = 0
const userRequestTimestamps = new Map<string, number[]>()

function getSupabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function isAllowedRemoteUrl(rawUrl: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const supabaseOrigin = getSupabaseOrigin()
  if (supabaseOrigin && parsed.origin === supabaseOrigin) {
    return parsed.pathname.startsWith('/storage/v1/object/public/')
  }
  const host = parsed.hostname.toLowerCase()
  if (host === 'stream.mux.com' || host.endsWith('.mux.com')) return true
  return false
}

function takeRateLimitSlot(userId: string): boolean {
  const now = Date.now()
  const timestamps = (userRequestTimestamps.get(userId) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  )
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    userRequestTimestamps.set(userId, timestamps)
    return false
  }
  timestamps.push(now)
  userRequestTimestamps.set(userId, timestamps)
  return true
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function toSeconds(valueMs: number): string {
  return Math.max(0, valueMs / 1000).toFixed(3)
}

function resolveOutputSize(aspectPreset: unknown) {
  const key = typeof aspectPreset === 'string' && aspectPreset in OUTPUT_SIZES
    ? aspectPreset as SocialCreativeAspectPreset
    : '9:16'
  return OUTPUT_SIZES[key]
}

function buildVideoFilter(filterId: SocialCreativeFilterId, intensity: number): string | null {
  const level = clampNumber(intensity, 0, 1, 0)
  switch (filterId) {
    case 'vivid':
      return `eq=saturation=${(1 + level * 0.65).toFixed(3)}:contrast=${(1 + level * 0.18).toFixed(3)}:brightness=${(level * 0.04).toFixed(3)}`
    case 'mono':
      return `hue=s=${(Math.max(0, 1 - (0.45 + level * 0.55))).toFixed(3)},eq=contrast=${(1 + level * 0.1).toFixed(3)}`
    case 'warm':
      return [
        `eq=saturation=${(1 + level * 0.25).toFixed(3)}:brightness=${(level * 0.06).toFixed(3)}`,
        `colorbalance=rs=${(0.05 + level * 0.12).toFixed(3)}:gs=${(0.02 + level * 0.06).toFixed(3)}:bs=${(-0.03 - level * 0.08).toFixed(3)}`,
      ].join(',')
    case 'cool':
      return [
        `eq=saturation=${(1 + level * 0.15).toFixed(3)}:brightness=${(level * 0.02).toFixed(3)}`,
        `colorbalance=rs=${(-0.06 * level).toFixed(3)}:gs=${(-0.02 * level).toFixed(3)}:bs=${(0.10 * level).toFixed(3)}`,
      ].join(',')
    case 'dramatic':
      return `eq=contrast=${(1 + level * 0.32).toFixed(3)}:brightness=${(-0.08 * level).toFixed(3)}:saturation=${(1 + level * 0.18).toFixed(3)}`
    default:
      return null
  }
}

async function writeFormFile(file: File, outputPath: string, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error('Uploaded file exceeds the maximum allowed size')
  }
  await writeFile(outputPath, Buffer.from(await file.arrayBuffer()))
}

async function downloadToFile(url: string, outputPath: string, maxBytes: number) {
  if (!isAllowedRemoteUrl(url)) {
    throw new Error('sourceUrl host is not allowed')
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to download source media (${response.status})`)
  }
  const declaredLength = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Remote media exceeds the maximum allowed size')
  }
  const body = response.body
  if (!body) {
    throw new Error('Remote media response has no body')
  }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (!value) continue
    received += value.byteLength
    if (received > maxBytes) {
      try { await reader.cancel() } catch {}
      throw new Error('Remote media exceeds the maximum allowed size')
    }
    chunks.push(value)
  }
  await writeFile(outputPath, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))
}

async function resolveAudioInput(trackId: string, previewUrl: string | null, outputPath: string) {
  const track = SOCIAL_MUSIC_TRACK_FALLBACKS.find((entry) => entry.id === trackId)
  const candidateUrl = track?.previewUrl ?? previewUrl
  if (!candidateUrl) {
    throw new Error('trackId is invalid')
  }

  if (candidateUrl.startsWith('/')) {
    const localPath = resolve(process.cwd(), 'public', candidateUrl.replace(/^\/+/, ''))
    await access(localPath)
    return localPath
  }

  await downloadToFile(candidateUrl, outputPath, MAX_AUDIO_BYTES)
  return outputPath
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('ffmpeg', args, {
      env: process.env,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let errorOutput = ''
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch {}
    }, FFMPEG_TIMEOUT_MS)

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      rejectPromise(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (timedOut) {
        rejectPromise(new Error('ffmpeg exceeded the maximum render time'))
        return
      }
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(errorOutput.trim() || `ffmpeg exited with code ${code}`))
    })
  })
}

async function readOutputWithinLimit(outputPath: string): Promise<Blob> {
  const info = await stat(outputPath)
  if (info.size > MAX_OUTPUT_BYTES) {
    throw new Error('Rendered output exceeds the maximum allowed size')
  }
  const buffer = await readFile(outputPath)
  const body = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return new Blob([body], { type: 'video/mp4' })
}

async function renderImageWithMusic(formData: FormData, workingDirectory: string) {
  const sourceImage = formData.get('image')
  if (!(sourceImage instanceof File)) {
    return NextResponse.json({ error: 'image is required' }, { status: 400 })
  }

  const trackId = String(formData.get('trackId') ?? '').trim()
  const trackPreviewUrl = String(formData.get('trackPreviewUrl') ?? '').trim() || null
  const track = SOCIAL_MUSIC_TRACK_FALLBACKS.find((entry) => entry.id === trackId)
  const trackDurationMs = track?.durationMs ?? 15_000
  const outputSize = resolveOutputSize(formData.get('aspectPreset'))
  const durationMs = clampNumber(formData.get('durationMs'), 1_000, trackDurationMs, 10_000)
  const startMs = clampNumber(formData.get('startMs'), 0, Math.max(trackDurationMs - durationMs, 0), 0)
  const volume = clampNumber(formData.get('volume'), 0, 1, 1)

  const sourcePath = join(workingDirectory, 'frame.jpg')
  const audioPath = join(workingDirectory, 'track.m4a')
  const outputPath = join(workingDirectory, 'output.mp4')

  await writeFormFile(sourceImage, sourcePath, MAX_SOURCE_BYTES)
  const resolvedAudioPath = await resolveAudioInput(trackId, trackPreviewUrl, audioPath)

  await runFfmpeg([
    '-y',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    sourcePath,
    '-ss',
    toSeconds(startMs),
    '-t',
    toSeconds(durationMs),
    '-i',
    resolvedAudioPath,
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
  ])

  const outputBuffer = await readOutputWithinLimit(outputPath)
  return new Response(outputBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-store',
    },
  })
}

async function renderEditedVideo(formData: FormData, workingDirectory: string) {
  const sourceUrl = String(formData.get('sourceUrl') ?? '').trim()
  if (!sourceUrl) {
    return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  }
  if (!isAllowedRemoteUrl(sourceUrl)) {
    return NextResponse.json({ error: 'sourceUrl host is not allowed' }, { status: 400 })
  }

  const sourcePath = join(workingDirectory, 'source.mp4')
  await downloadToFile(sourceUrl, sourcePath, MAX_SOURCE_BYTES)

  const overlayImage = formData.get('overlayImage')
  const overlayPath = join(workingDirectory, 'overlay.png')
  const hasOverlay = overlayImage instanceof File && overlayImage.size > 0
  if (hasOverlay) {
    await writeFormFile(overlayImage, overlayPath, MAX_SOURCE_BYTES)
  }

  const outputSize = resolveOutputSize(formData.get('aspectPreset'))
  const filterId = String(formData.get('filterId') ?? 'none') as SocialCreativeFilterId
  const filterIntensity = clampNumber(formData.get('filterIntensity'), 0, 1, 0)
  const trimStartMs = clampNumber(formData.get('trimStartMs'), 0, 60 * 60 * 1000, 0)
  const trimEndMs = clampNumber(formData.get('trimEndMs'), 0, 60 * 60 * 1000, 0)
  const trackId = String(formData.get('trackId') ?? '').trim()
  const trackPreviewUrl = String(formData.get('trackPreviewUrl') ?? '').trim() || null
  const hasMusic = trackId.length > 0
  const requestedMusicDurationMs = clampNumber(formData.get('durationMs'), 1_000, 60 * 1000, 15_000)
  const requestedMusicStartMs = clampNumber(formData.get('startMs'), 0, 60 * 60 * 1000, 0)
  const musicVolume = clampNumber(formData.get('volume'), 0, 1, 1)
  const trimDurationMs = trimEndMs > trimStartMs ? trimEndMs - trimStartMs : 0
  const outputDurationMs = hasMusic
    ? requestedMusicDurationMs
    : trimDurationMs > 0
      ? trimDurationMs
      : 0
  const audioPath = join(workingDirectory, 'track.m4a')
  const outputPath = join(workingDirectory, 'output.mp4')
  const sourceInputArgs = ['-ss', toSeconds(trimStartMs)]

  if (outputDurationMs > 0) {
    sourceInputArgs.push('-t', toSeconds(outputDurationMs))
  }

  const inputArgs = [...sourceInputArgs, '-i', sourcePath]
  if (hasOverlay) {
    inputArgs.push('-i', overlayPath)
  }

  let musicInputIndex: number | null = null
  if (hasMusic) {
    const resolvedAudioPath = await resolveAudioInput(trackId, trackPreviewUrl, audioPath)
    musicInputIndex = hasOverlay ? 2 : 1
    inputArgs.push(
      '-ss',
      toSeconds(requestedMusicStartMs),
      '-t',
      toSeconds(requestedMusicDurationMs),
      '-i',
      resolvedAudioPath,
    )
  }

  const filterChain = [
    `scale=${outputSize.width}:${outputSize.height}:force_original_aspect_ratio=increase`,
    `crop=${outputSize.width}:${outputSize.height}`,
    'setsar=1',
  ]
  const colorFilter = buildVideoFilter(filterId, filterIntensity)
  if (colorFilter) {
    filterChain.push(colorFilter)
  }

  const filterComplexParts = [`[0:v]${filterChain.join(',')}[base]`]
  const videoMapLabel = hasOverlay ? '[video]' : '[base]'
  if (hasOverlay) {
    filterComplexParts.push('[base][1:v]overlay=0:0:format=auto[video]')
  }

  const args = [
    '-y',
    ...inputArgs,
    '-filter_complex',
    filterComplexParts.join(';'),
    '-map',
    videoMapLabel,
  ]

  if (musicInputIndex !== null) {
    args.push('-map', `${musicInputIndex}:a`, '-filter:a', `volume=${musicVolume}`, '-shortest')
  } else {
    args.push('-map', '0:a?')
  }

  args.push(
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
    outputPath,
  )

  await runFfmpeg(args)

  const outputBuffer = await readOutputWithinLimit(outputPath)
  return new Response(outputBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-store',
    },
  })
}

async function verifyRequest(request: Request): Promise<{ userId: string } | NextResponse> {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const client = createServerSupabase(token)
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
  return { userId: data.user.id }
}

export async function POST(request: Request) {
  const verification = await verifyRequest(request)
  if (verification instanceof NextResponse) {
    return verification
  }
  const { userId } = verification

  if (!takeRateLimitSlot(userId)) {
    return NextResponse.json({ error: 'Too many renders, try again soon' }, { status: 429 })
  }

  if (globalInFlight >= MAX_GLOBAL_CONCURRENCY) {
    return NextResponse.json({ error: 'Render service is busy, retry shortly' }, { status: 503 })
  }

  globalInFlight += 1
  let workingDirectory = ''

  try {
    const formData = await request.formData()
    const sourceType = String(formData.get('sourceType') ?? 'image').trim()
    workingDirectory = await mkdtemp(join(tmpdir(), 'dd-social-render-'))

    if (sourceType === 'video') {
      return await renderEditedVideo(formData, workingDirectory)
    }

    return await renderImageWithMusic(formData, workingDirectory)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Creative render failed' },
      { status: 500 },
    )
  } finally {
    globalInFlight = Math.max(0, globalInFlight - 1)
    if (workingDirectory) {
      await rm(workingDirectory, { recursive: true, force: true }).catch(() => {})
    }
  }
}
