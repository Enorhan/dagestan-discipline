#!/usr/bin/env tsx

import { execFile as execFileCallback } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SportType = 'wrestling' | 'judo' | 'bjj'
type QueueType = 'athlete' | 'exercise' | 'athlete_exercise' | 'routine'
type SourceType =
  | 'youtube_search'
  | 'rss_feed'
  | 'reddit_search'
  | 'web_search'
  | 'web_url'
  | 'social_feed'

type JsonMap = Record<string, unknown>

type SourceAttribution = {
  source_id: string
  source_name: string
  platform: string
  document_id: string
  url: string
  title: string
  published_at: string | null
  collected_at: string
}

interface ContentSourceRow {
  id: string
  name: string
  source_type: SourceType
  platform: string
  query: string | null
  url: string | null
  metadata: JsonMap | null
  is_active: boolean
}

interface SourceDocumentRow {
  id: string
  source_id: string
  external_id: string
  url: string
  title: string
  description: string | null
  author_name: string | null
  published_at: string | null
  sport_hint: SportType | null
  raw_payload: JsonMap | null
  processing_state: string
}

interface ExtractedSignalRow {
  id: string
  document_id: string
  confidence: number
  detected_sport: SportType | null
  athlete_mentions: JsonMap[]
  exercise_mentions: JsonMap[]
  routine_summary: string | null
  normalized_payload: JsonMap
}

interface ModerationQueueRow {
  id: string
  document_id: string
  queue_type: QueueType
  proposed_data: JsonMap
  source_attribution: JsonMap[]
  confidence: number
  status: 'pending' | 'approved' | 'rejected' | 'published'
}

interface CollectedDocument {
  externalId: string
  url: string
  title: string
  description: string
  authorName: string | null
  publishedAt: string | null
  sportHint: SportType | null
  language: string
  rawPayload: JsonMap
  collectionConfidence: number
}

interface AthleteEntity {
  id: string
  name: string
  sport: SportType
  source_attribution: JsonMap[] | null
  confidence_score: number | null
}

interface ExerciseEntity {
  id: string
  name: string
  category: string
  sport: SportType | null
  source_attribution: JsonMap[] | null
  confidence_score: number | null
}

interface PipelineOptions {
  perSource: number
  sourceLimit: number
  onlyPlatforms: string[] | null
  onlySourceTypes: SourceType[] | null
  onlySourceIds: string[] | null
  extractLimit: number
  queueLimit: number
  reviewLimit: number
  publishLimit: number
  approveThreshold: number
  rejectThreshold: number
  videoOnly: boolean
  videoRelevanceThreshold: number
  webRelevanceThreshold: number
  webMaxTextChars: number
  frameIntervalSeconds: number
  maxFrames: number
  maxVideoSeconds: number
  videoWorkdir: string
  keepArtifacts: boolean
  ytDlpBin: string
  ffmpegBin: string
  transcriptionModel: string
  extractionModel: string
  visionModel: string
  publishDrillsFromEvents: boolean
  publishRoutinesFromEvents: boolean
}

interface CommandResult {
  processed: number
  created: number
  updated: number
  skipped: number
  failed: number
}

const SPORTS: SportType[] = ['wrestling', 'judo', 'bjj']
const execFileAsync = promisify(execFileCallback)

const FALLBACK_OPTIONS: PipelineOptions = {
  perSource: parseInteger(process.env.PIPELINE_MAX_ITEMS_PER_SOURCE, 8),
  sourceLimit: parseInteger(process.env.PIPELINE_SOURCE_LIMIT, 25),
  onlyPlatforms: null,
  onlySourceTypes: null,
  onlySourceIds: null,
  extractLimit: parseInteger(process.env.PIPELINE_EXTRACT_LIMIT, 150),
  queueLimit: parseInteger(process.env.PIPELINE_QUEUE_LIMIT, 150),
  reviewLimit: parseInteger(process.env.PIPELINE_REVIEW_LIMIT, 300),
  publishLimit: parseInteger(process.env.PIPELINE_PUBLISH_LIMIT, 300),
  approveThreshold: parseFloatSafe(process.env.PIPELINE_AUTO_APPROVE_THRESHOLD, 0.78),
  rejectThreshold: parseFloatSafe(process.env.PIPELINE_AUTO_REJECT_THRESHOLD, 0.28),
  videoOnly: parseBoolean(process.env.PIPELINE_VIDEO_ONLY, true),
  videoRelevanceThreshold: parseFloatSafe(process.env.PIPELINE_VIDEO_RELEVANCE_THRESHOLD, 0.45),
  webRelevanceThreshold: parseFloatSafe(process.env.PIPELINE_WEB_RELEVANCE_THRESHOLD, 0.35),
  webMaxTextChars: parseInteger(process.env.PIPELINE_WEB_MAX_TEXT_CHARS, 18000),
  frameIntervalSeconds: parseInteger(process.env.PIPELINE_FRAME_INTERVAL_SECONDS, 10),
  maxFrames: parseInteger(process.env.PIPELINE_MAX_FRAMES, 12),
  maxVideoSeconds: parseInteger(process.env.PIPELINE_MAX_VIDEO_SECONDS, 1200),
  videoWorkdir: process.env.PIPELINE_VIDEO_WORKDIR ?? '.pipeline_artifacts/video_ingest',
  keepArtifacts: parseBoolean(process.env.PIPELINE_KEEP_VIDEO_ARTIFACTS, true),
  ytDlpBin: process.env.PIPELINE_YTDLP_BIN ?? 'yt-dlp',
  ffmpegBin: process.env.PIPELINE_FFMPEG_BIN ?? 'ffmpeg',
  transcriptionModel: process.env.PIPELINE_TRANSCRIPTION_MODEL ?? 'whisper-1',
  extractionModel: process.env.PIPELINE_EXTRACTION_MODEL ?? 'gpt-4o-mini',
  visionModel: process.env.PIPELINE_VISION_MODEL ?? 'gpt-4o-mini',
  publishDrillsFromEvents: parseBoolean(process.env.PIPELINE_PUBLISH_DRILLS_FROM_EVENTS, true),
  publishRoutinesFromEvents: parseBoolean(process.env.PIPELINE_PUBLISH_ROUTINES_FROM_EVENTS, false),
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseFloatSafe(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback
  }

  const lowered = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(lowered)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(lowered)) {
    return false
  }
  return fallback
}

function parseCsv(value: string | undefined): string[] | null {
  if (!value) {
    return null
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return items.length > 0 ? items : null
}

function parseSourceTypeCsv(value: string | undefined): SourceType[] | null {
  const items = parseCsv(value)
  if (!items) {
    return null
  }

  const allowed: SourceType[] = [
    'youtube_search',
    'rss_feed',
    'reddit_search',
    'web_search',
    'web_url',
    'social_feed',
  ]
  const allowedSet = new Set<string>(allowed)
  const filtered = items.filter((item) => allowedSet.has(item))

  if (filtered.length === 0) {
    throw new Error(`Invalid --onlySourceTypes. Allowed: ${allowed.join(', ')}`)
  }

  return filtered as SourceType[]
}

function loadLocalEnv(): void {
  const files = ['.env.local', '.env']

  for (const file of files) {
    const filePath = resolve(process.cwd(), file)
    if (!existsSync(filePath)) {
      continue
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const index = trimmed.indexOf('=')
      if (index <= 0) {
        continue
      }

      const key = trimmed.slice(0, index).trim()
      const raw = trimmed.slice(index + 1).trim()
      const unwrapped = raw.replace(/^['"]|['"]$/g, '')

      if (!process.env[key]) {
        process.env[key] = unwrapped
      }
    }
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function parseCommandArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      continue
    }

    const stripped = token.slice(2)
    const equalsIndex = stripped.indexOf('=')

    if (equalsIndex >= 0) {
      const key = stripped.slice(0, equalsIndex)
      const value = stripped.slice(equalsIndex + 1)
      args[key] = value
      continue
    }

    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[stripped] = next
      i += 1
    } else {
      args[stripped] = 'true'
    }
  }

  return args
}

function buildOptions(argMap: Record<string, string>): PipelineOptions {
  return {
    perSource: parseInteger(argMap.perSource, FALLBACK_OPTIONS.perSource),
    sourceLimit: parseInteger(argMap.sourceLimit, FALLBACK_OPTIONS.sourceLimit),
    onlyPlatforms: parseCsv(argMap.onlyPlatforms ?? argMap.platforms),
    onlySourceTypes: parseSourceTypeCsv(argMap.onlySourceTypes ?? argMap.sourceTypes),
    onlySourceIds: parseCsv(argMap.onlySourceIds ?? argMap.sourceIds),
    extractLimit: parseInteger(argMap.extractLimit, FALLBACK_OPTIONS.extractLimit),
    queueLimit: parseInteger(argMap.queueLimit, FALLBACK_OPTIONS.queueLimit),
    reviewLimit: parseInteger(argMap.reviewLimit, FALLBACK_OPTIONS.reviewLimit),
    publishLimit: parseInteger(argMap.publishLimit, FALLBACK_OPTIONS.publishLimit),
    approveThreshold: parseFloatSafe(argMap.approveThreshold, FALLBACK_OPTIONS.approveThreshold),
    rejectThreshold: parseFloatSafe(argMap.rejectThreshold, FALLBACK_OPTIONS.rejectThreshold),
    videoOnly: parseBoolean(argMap.videoOnly, FALLBACK_OPTIONS.videoOnly),
    videoRelevanceThreshold: parseFloatSafe(
      argMap.videoRelevanceThreshold,
      FALLBACK_OPTIONS.videoRelevanceThreshold
    ),
    webRelevanceThreshold: parseFloatSafe(
      argMap.webRelevanceThreshold,
      FALLBACK_OPTIONS.webRelevanceThreshold
    ),
    webMaxTextChars: parseInteger(
      argMap.webMaxTextChars,
      FALLBACK_OPTIONS.webMaxTextChars
    ),
    frameIntervalSeconds: parseInteger(
      argMap.frameIntervalSeconds,
      FALLBACK_OPTIONS.frameIntervalSeconds
    ),
    maxFrames: parseInteger(argMap.maxFrames, FALLBACK_OPTIONS.maxFrames),
    maxVideoSeconds: parseInteger(argMap.maxVideoSeconds, FALLBACK_OPTIONS.maxVideoSeconds),
    videoWorkdir: argMap.videoWorkdir || FALLBACK_OPTIONS.videoWorkdir,
    keepArtifacts: parseBoolean(argMap.keepArtifacts, FALLBACK_OPTIONS.keepArtifacts),
    ytDlpBin: argMap.ytDlpBin || FALLBACK_OPTIONS.ytDlpBin,
    ffmpegBin: argMap.ffmpegBin || FALLBACK_OPTIONS.ffmpegBin,
    transcriptionModel: argMap.transcriptionModel || FALLBACK_OPTIONS.transcriptionModel,
    extractionModel: argMap.extractionModel || FALLBACK_OPTIONS.extractionModel,
    visionModel: argMap.visionModel || FALLBACK_OPTIONS.visionModel,
    publishDrillsFromEvents: parseBoolean(
      argMap.publishDrillsFromEvents,
      FALLBACK_OPTIONS.publishDrillsFromEvents
    ),
    publishRoutinesFromEvents: parseBoolean(
      argMap.publishRoutinesFromEvents,
      FALLBACK_OPTIONS.publishRoutinesFromEvents
    ),
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isPlaceholderValue(value: string): boolean {
  const lowered = normalizeText(value).toLowerCase()
  if (!lowered) {
    return true
  }

  // Prevent common schema placeholders from becoming real records.
  const placeholders = new Set([
    'string',
    'null',
    'undefined',
    'unknown',
    'n/a',
    'na',
    'none',
    'nil',
    'tbd',
    'todo',
    'example',
    'sample',
    'placeholder',
    '...',
  ])

  return placeholders.has(lowered)
}

function toFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function redactUrlForLogs(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const sensitiveParams = [
      'key',
      'apikey',
      'api_key',
      'token',
      'access_token',
      'authorization',
      'signature',
    ]

    for (const param of sensitiveParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, 'REDACTED')
      }
    }

    return url.toString()
  } catch {
    return rawUrl
  }
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(0.999, Number(value.toFixed(3))))
}

function detectSport(text: string): SportType | null {
  const lower = text.toLowerCase()

  if (lower.includes('wrestl') || lower.includes('greco') || lower.includes('freestyle')) {
    return 'wrestling'
  }

  if (lower.includes('judo') || lower.includes('ippon') || lower.includes('uchi mata')) {
    return 'judo'
  }

  if (
    lower.includes('jiu jitsu') ||
    lower.includes('jiu-jitsu') ||
    lower.includes('bjj') ||
    lower.includes('grappling')
  ) {
    return 'bjj'
  }

  return null
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes('neck') || lower.includes('bridge')) {
    return 'neck'
  }

  if (
    lower.includes('core') ||
    lower.includes('plank') ||
    lower.includes('ab') ||
    lower.includes('hollow') ||
    lower.includes('twist')
  ) {
    return 'core'
  }

  if (
    lower.includes('shoulder') ||
    lower.includes('overhead') ||
    lower.includes('strict press') ||
    lower.includes('pike')
  ) {
    return 'shoulders'
  }

  if (
    lower.includes('row') ||
    lower.includes('pull-up') ||
    lower.includes('pull up') ||
    lower.includes('chin-up') ||
    lower.includes('chin up') ||
    lower.includes('lat') ||
    lower.includes('rope climb') ||
    lower.includes('back')
  ) {
    return 'back'
  }

  if (
    lower.includes('curl') ||
    lower.includes('tricep') ||
    lower.includes('bicep') ||
    lower.includes('forearm') ||
    lower.includes('grip') ||
    lower.includes('arm')
  ) {
    return 'arms'
  }

  if (
    lower.includes('bench') ||
    lower.includes('chest') ||
    lower.includes('push-up') ||
    lower.includes('push up')
  ) {
    return 'chest'
  }

  if (
    lower.includes('squat') ||
    lower.includes('lunge') ||
    lower.includes('deadlift') ||
    lower.includes('leg') ||
    lower.includes('hamstring') ||
    lower.includes('quad') ||
    lower.includes('calf')
  ) {
    return 'legs'
  }

  return 'full-body'
}

function mapToAppExerciseCategory(rawCategory: string | null | undefined, exerciseName: string): string {
  const normalized = normalizeText(`${rawCategory ?? ''} ${exerciseName}`)
  const inferred = inferCategory(normalized)
  const allowed = new Set([
    'full-body',
    'legs',
    'chest',
    'shoulders',
    'back',
    'arms',
    'core',
    'neck',
  ])
  if (allowed.has(inferred)) {
    return inferred
  }
  return 'full-body'
}

function extractRoutineSummary(text: string): string | null {
  const normalized = normalizeText(text)
  if (!normalized) {
    return null
  }

  const sentence = normalized
    .split(/[.!?]+/)
    .map((chunk) => chunk.trim())
    .find((chunk) => /sets|reps|rounds|drill|routine|session|training/i.test(chunk))

  if (!sentence) {
    return truncate(normalized, 240)
  }

  return truncate(sentence, 240)
}

function extractRoutineSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeText(line.replace(/^[-*0-9.\s]+/, '')))
    .filter((line) => line.length > 0)

  const filtered = lines.filter((line) => /set|rep|round|min|sec|drill|exercise/i.test(line))
  return filtered.slice(0, 10)
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function getTagValue(block: string, tags: string[]): string {
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = block.match(regex)
    if (match?.[1]) {
      return decodeHtmlEntities(normalizeText(match[1].replace(/<!\[CDATA\[|\]\]>/g, '')))
    }
  }

  return ''
}

function extractTagBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = []
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')

  let match: RegExpExecArray | null
  do {
    match = regex.exec(xml)
    if (match?.[0]) {
      blocks.push(match[0])
    }
  } while (match)

  return blocks
}

function parseDate(value: string): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString()
}

function mergeAttribution(
  existing: JsonMap[] | null | undefined,
  incoming: JsonMap[] | null | undefined
): JsonMap[] {
  const result = [...(existing ?? [])]
  const seen = new Set(result.map((item) => String(item.url ?? `${item.document_id ?? ''}`)))

  for (const item of incoming ?? []) {
    const key = String(item.url ?? `${item.document_id ?? ''}`)
    if (!seen.has(key)) {
      result.push(item)
      seen.add(key)
    }
  }

  return result
}

function findMentionNames(text: string, names: string[], maxMatches: number): string[] {
  const lower = text.toLowerCase()
  const matches: string[] = []

  for (const name of names) {
    if (matches.length >= maxMatches) {
      break
    }

    const candidate = name.trim()
    if (candidate.length < 3) {
      continue
    }

    if (lower.includes(candidate.toLowerCase())) {
      matches.push(candidate)
    }
  }

  return matches
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const seconds = Number.parseInt(trimmed, 10)
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000
  }

  const dateMillis = Date.parse(trimmed)
  if (!Number.isNaN(dateMillis)) {
    const delta = dateMillis - Date.now()
    return delta > 0 ? delta : 0
  }

  return null
}

function jitterMs(value: number, ratio: number = 0.15): number {
  const span = Math.max(0, value) * ratio
  const min = Math.max(0, value - span)
  const max = Math.max(min, value + span)
  return Math.round(min + Math.random() * (max - min))
}

const fetchThrottle = new Map<string, number>()

async function throttleFetch(key: string, minIntervalMs: number): Promise<void> {
  if (!key || minIntervalMs <= 0) {
    return
  }

  const last = fetchThrottle.get(key) ?? 0
  const now = Date.now()
  const waitMs = minIntervalMs - (now - last)
  if (waitMs > 0) {
    await sleep(waitMs)
  }

  fetchThrottle.set(key, Date.now())
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(headers ?? {}),
    },
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    let detail = ''

    try {
      const body = JSON.parse(bodyText) as JsonMap
      const err = body.error as JsonMap | undefined
      if (err && typeof err.message === 'string') {
        detail = err.message
      } else if (typeof body.message === 'string') {
        detail = body.message
      }
    } catch {
      // ignore parse failures
    }

    const suffix = detail ? `: ${truncate(normalizeText(detail), 240)}` : ''
    throw new Error(`HTTP ${response.status} for ${redactUrlForLogs(url)}${suffix}`)
  }

  return response.json()
}

async function fetchJsonWithRetry(
  url: string,
  headers?: Record<string, string>,
  options?: {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    retryOnStatuses?: number[]
    throttleKey?: string
    minIntervalMs?: number
  }
): Promise<unknown> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 4)
  const baseDelayMs = Math.max(250, options?.baseDelayMs ?? 900)
  const maxDelayMs = Math.max(baseDelayMs, options?.maxDelayMs ?? 18_000)
  const retrySet = new Set<number>(options?.retryOnStatuses ?? [429, 500, 502, 503, 504])
  const throttleKey = options?.throttleKey
  const minIntervalMs = Math.max(0, options?.minIntervalMs ?? 0)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (throttleKey) {
      await throttleFetch(throttleKey, minIntervalMs)
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(headers ?? {}),
      },
    })

    if (response.ok) {
      return response.json()
    }

    const bodyText = await response.text().catch(() => '')
    let detail = ''

    try {
      const body = JSON.parse(bodyText) as JsonMap
      const err = body.error as JsonMap | undefined
      if (err && typeof err.message === 'string') {
        detail = err.message
      } else if (typeof body.message === 'string') {
        detail = body.message
      }
    } catch {
      // ignore parse failures
    }

    const suffix = detail ? `: ${truncate(normalizeText(detail), 240)}` : ''
    const isRetryable = retrySet.has(response.status)

    if (!isRetryable || attempt >= maxAttempts) {
      throw new Error(`HTTP ${response.status} for ${redactUrlForLogs(url)}${suffix}`)
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
    const backoffMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1))
    const delayMs = jitterMs(retryAfterMs ?? backoffMs)

    console.log(`[fetch] retrying status=${response.status} attempt=${attempt}/${maxAttempts} wait=${delayMs}ms url=${redactUrlForLogs(url)}`)
    await sleep(delayMs)
  }

  throw new Error(`HTTP request failed for ${redactUrlForLogs(url)}`)
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: '*/*',
      ...(headers ?? {}),
    },
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    const snippet = bodyText ? `: ${truncate(normalizeText(bodyText), 240)}` : ''
    throw new Error(`HTTP ${response.status} for ${redactUrlForLogs(url)}${snippet}`)
  }

  return response.text()
}

function collectFromRss(xml: string, source: ContentSourceRow, maxItems: number): CollectedDocument[] {
  const itemBlocks = extractTagBlocks(xml, 'item')
  const entryBlocks = extractTagBlocks(xml, 'entry')
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks

  const documents: CollectedDocument[] = []
  const isWebSearch = source.metadata?.kind === 'web_search' || source.metadata?.provider === 'bing_rss'
  const blockedDomains = new Set([
    'reddit.com',
    'zhihu.com',
    'pinterest.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
  ])
  const requiredTokens = ['workout', 'strength', 'conditioning', 'program', 'routine', 'sets', 'reps', 's&c']
  const bannedWrestlingTokens = ['wwe', 'aew', 'smackdown', 'wrestlemania', 'raw', 'nxt', 'ppv']

  for (const block of blocks.slice(0, maxItems)) {
    const title = getTagValue(block, ['title'])
    const description = getTagValue(block, ['description', 'summary', 'content'])
    const link = getTagValue(block, ['link', 'id'])
    const author = getTagValue(block, ['author', 'dc:creator', 'name'])
    const publishedRaw = getTagValue(block, ['pubDate', 'published', 'updated'])

    const url = link.startsWith('http') ? link : source.url ?? ''
    if (!title || !url) {
      continue
    }

    const combinedText = `${title} ${description}`
    const combinedLower = combinedText.toLowerCase()

    if (isWebSearch) {
      const hostname = getUrlHostname(url)
      if (hostname) {
        const parts = hostname.split('.')
        const domain = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : hostname
        if (blockedDomains.has(domain)) {
          continue
        }
      }

      if (!requiredTokens.some((token) => combinedLower.includes(token))) {
        continue
      }

      const sportMeta = normalizeSport(source.metadata?.sport)
      if (sportMeta === 'wrestling' && bannedWrestlingTokens.some((token) => combinedLower.includes(token))) {
        continue
      }
    }

    documents.push({
      externalId: toFingerprint(`${source.id}:${url}`).slice(0, 24),
      url,
      title: truncate(title, 300),
      description: truncate(description, 4000),
      authorName: author || null,
      publishedAt: parseDate(publishedRaw),
      sportHint: detectSport(combinedText),
      language: 'en',
      rawPayload: {
        source: source.name,
        type: source.source_type,
      },
      collectionConfidence: clampConfidence(0.62),
    })
  }

  return documents
}

async function collectYouTube(source: ContentSourceRow, maxItems: number): Promise<CollectedDocument[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.log(`[collect] skipping ${source.name}: missing YOUTUBE_API_KEY`)
    return []
  }

  const query = source.query?.trim()
  if (!query) {
    return []
  }

  const order =
    typeof source.metadata?.order === 'string'
      ? normalizeText(String(source.metadata.order)).toLowerCase()
      : 'relevance'
  const videoDuration =
    typeof source.metadata?.video_duration === 'string'
      ? normalizeText(String(source.metadata.video_duration)).toLowerCase()
      : 'medium'
  const relevanceLanguage =
    typeof source.metadata?.lang === 'string'
      ? normalizeText(String(source.metadata.lang)).toLowerCase()
      : 'en'

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('order', order === 'date' ? 'date' : 'relevance')
  endpoint.searchParams.set(
    'videoDuration',
    videoDuration === 'short' || videoDuration === 'long' ? videoDuration : 'medium'
  )
  endpoint.searchParams.set('relevanceLanguage', relevanceLanguage)
  endpoint.searchParams.set('safeSearch', 'moderate')
  endpoint.searchParams.set('maxResults', String(Math.min(maxItems, 50)))
  endpoint.searchParams.set('key', apiKey)

  const payload = (await fetchJson(endpoint.toString())) as {
    items?: Array<{
      id?: { videoId?: string }
      snippet?: {
        title?: string
        description?: string
        channelTitle?: string
        publishedAt?: string
      }
    }>
  }

  const documents: CollectedDocument[] = []
  const requiredTokens = [
    'workout',
    'strength',
    'conditioning',
    'routine',
    'program',
    'training',
    'drill',
    'exercises',
  ]
  const bannedTokens = ['#shorts', 'shorts', 'vlog', '#viral', 'motivation']

  for (const item of payload.items ?? []) {
    const videoId = item.id?.videoId
    const title = normalizeText(item.snippet?.title ?? '')
    if (!videoId || !title) {
      continue
    }

    const description = normalizeText(item.snippet?.description ?? '')
    const combinedLower = `${title} ${description}`.toLowerCase()

    if (!requiredTokens.some((token) => combinedLower.includes(token))) {
      continue
    }

    if (bannedTokens.some((token) => combinedLower.includes(token))) {
      continue
    }

    const hashtagCount = (title.match(/#/g) ?? []).length
    if (hashtagCount >= 2) {
      continue
    }

    const sportHint = detectSport(`${query} ${title} ${description}`)

    documents.push({
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: truncate(title, 300),
      description: truncate(description, 4000),
      authorName: item.snippet?.channelTitle ?? null,
      publishedAt: parseDate(item.snippet?.publishedAt ?? ''),
      sportHint,
      language: 'en',
      rawPayload: {
        query,
        video_id: videoId,
        platform: 'youtube',
      },
      collectionConfidence: clampConfidence(sportHint ? 0.78 : 0.68),
    })
  }

  return documents
}

async function collectReddit(source: ContentSourceRow, maxItems: number): Promise<CollectedDocument[]> {
  const query = source.query?.trim()
  if (!query) {
    return []
  }

  const endpoint = new URL('https://www.reddit.com/search.json')
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('sort', 'new')
  endpoint.searchParams.set('limit', String(Math.min(maxItems, 100)))
  endpoint.searchParams.set('t', 'year')
  endpoint.searchParams.set('raw_json', '1')

  const payload = (await fetchJson(endpoint.toString(), {
    'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
  })) as {
    data?: {
      children?: Array<{
        data?: {
          id?: string
          title?: string
          selftext?: string
          permalink?: string
          author?: string
          created_utc?: number
        }
      }>
    }
  }

  const documents: CollectedDocument[] = []

  for (const child of payload.data?.children ?? []) {
    const post = child.data
    if (!post?.id || !post.title) {
      continue
    }

    const description = normalizeText(post.selftext ?? '')
    const url = `https://www.reddit.com${post.permalink ?? ''}`
    const sportHint = detectSport(`${query} ${post.title} ${description}`)

    documents.push({
      externalId: post.id,
      url,
      title: truncate(normalizeText(post.title), 300),
      description: truncate(description, 4000),
      authorName: post.author ?? null,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      sportHint,
      language: 'en',
      rawPayload: {
        query,
        post_id: post.id,
        platform: 'reddit',
      },
      collectionConfidence: clampConfidence(sportHint ? 0.7 : 0.6),
    })
  }

  return documents
}

function resolveSportHintFromSource(source: ContentSourceRow, fallbackText?: string): SportType | null {
  const fromMeta = normalizeSport(source.metadata?.sport)
  if (fromMeta) {
    return fromMeta
  }
  if (fallbackText) {
    return detectSport(fallbackText)
  }
  return null
}

function extractLinksFromBingRss(xml: string): Array<{ title: string; url: string; publishedAt: string | null }> {
  const blocks = extractTagBlocks(xml, 'item')
  const results: Array<{ title: string; url: string; publishedAt: string | null }> = []

  for (const block of blocks) {
    const title = getTagValue(block, ['title'])
    const link = getTagValue(block, ['link'])
    const publishedRaw = getTagValue(block, ['pubDate'])

    const url = link.trim()
    if (!title || !url.startsWith('http')) {
      continue
    }

    results.push({
      title: truncate(normalizeText(title), 300),
      url,
      publishedAt: parseDate(publishedRaw),
    })
  }

  return results
}

async function collectWebSearch(source: ContentSourceRow, maxItems: number): Promise<CollectedDocument[]> {
  const query = source.query?.trim()
  if (!query) {
    return []
  }

  const provider = normalizeText(String(source.metadata?.provider ?? '')).toLowerCase()
  const wantsGoogle = source.platform.toLowerCase() === 'google' || provider === 'google_cse'
  const sportHint = resolveSportHintFromSource(source, query)
  const language = typeof source.metadata?.lang === 'string' ? String(source.metadata.lang) : 'en'

  const blockedDomains = new Set([
    'reddit.com',
    'zhihu.com',
    'pinterest.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
  ])
  const requiredTokens = ['workout', 'strength', 'conditioning', 'program', 'routine', 'sets', 'reps', 's&c']
  const bannedWrestlingTokens = ['wwe', 'aew', 'smackdown', 'wrestlemania', 'raw', 'nxt', 'ppv']

  if (wantsGoogle) {
    const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim()
    const cx = process.env.GOOGLE_CSE_CX?.trim()

    if (!apiKey || !cx) {
      console.log(`[collect] skipping ${source.name}: missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX`)
    } else {
      try {
        const documents: CollectedDocument[] = []
        let startIndex = 1

        while (documents.length < maxItems && startIndex <= 91) {
          const endpoint = new URL('https://www.googleapis.com/customsearch/v1')
          endpoint.searchParams.set('key', apiKey)
          endpoint.searchParams.set('cx', cx)
          endpoint.searchParams.set('q', query)
          endpoint.searchParams.set(
            'num',
            String(Math.min(10, Math.max(1, maxItems - documents.length)))
          )
          endpoint.searchParams.set('start', String(startIndex))
          endpoint.searchParams.set('safe', 'active')
          endpoint.searchParams.set('hl', language)

          const payload = (await fetchJson(endpoint.toString(), {
            'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
          })) as JsonMap

          const rawItems = payload.items
          const items = Array.isArray(rawItems) ? (rawItems as JsonMap[]) : []
          if (items.length === 0) {
            break
          }

          for (const item of items) {
            const url = normalizeText(String(item.link ?? ''))
            const title = normalizeText(String(item.title ?? ''))
            if (!url.startsWith('http') || !title) {
              continue
            }

            const hostname = getUrlHostname(url)
            if (hostname) {
              const parts = hostname.split('.')
              const domain = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : hostname
              if (blockedDomains.has(domain)) {
                continue
              }
            }

            const description = normalizeText(String(item.snippet ?? ''))
            const combinedLower = `${title} ${description}`.toLowerCase()
            if (!requiredTokens.some((token) => combinedLower.includes(token))) {
              continue
            }
            if (sportHint === 'wrestling' && bannedWrestlingTokens.some((token) => combinedLower.includes(token))) {
              continue
            }

            documents.push({
              externalId: toFingerprint(`${source.id}:${url}`).slice(0, 24),
              url,
              title: truncate(title, 300),
              description: truncate(description, 4000),
              authorName: typeof item.displayLink === 'string' ? normalizeText(String(item.displayLink)) : null,
              publishedAt: null,
              sportHint,
              language,
              rawPayload: {
                query,
                platform: 'web',
                provider: 'google_cse',
              },
              collectionConfidence: clampConfidence(sportHint ? 0.72 : 0.62),
            })

            if (documents.length >= maxItems) {
              break
            }
          }

          startIndex += 10
        }

        if (documents.length > 0) {
          return documents
        }
      } catch (error) {
        const message = (error as Error).message
        const braveToken = process.env.BRAVE_SEARCH_API_KEY?.trim()
        if (braveToken) {
          console.log(`[collect] ${source.name} google_cse failed, falling back to Brave: ${message}`)
        } else {
          throw error
        }
      }
    }
  }

  const braveToken = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (braveToken) {
    const endpoint = new URL('https://api.search.brave.com/res/v1/web/search')
    endpoint.searchParams.set('q', query)
    endpoint.searchParams.set('count', String(Math.min(maxItems, 20)))

    const minIntervalMs = parseInteger(process.env.PIPELINE_BRAVE_MIN_INTERVAL_MS, 1100)
    const payload = (await fetchJsonWithRetry(endpoint.toString(), {
      'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
      'X-Subscription-Token': braveToken,
      Accept: 'application/json',
    }, {
      maxAttempts: 5,
      throttleKey: 'brave_search',
      minIntervalMs,
    })) as JsonMap

    const rawResults = (payload.web as JsonMap | undefined)?.results
    const results = Array.isArray(rawResults) ? (rawResults as JsonMap[]) : []

    return results
      .map((result) => {
        const url = normalizeText(String(result.url ?? ''))
        const title = normalizeText(String(result.title ?? ''))
        if (!url.startsWith('http') || !title) {
          return null
        }

        const description = normalizeText(String(result.description ?? ''))

        const hostname = getUrlHostname(url)
        if (hostname) {
          const parts = hostname.split('.')
          const domain = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : hostname
          if (blockedDomains.has(domain)) {
            return null
          }
        }

        const combinedLower = `${title} ${description}`.toLowerCase()
        if (!requiredTokens.some((token) => combinedLower.includes(token))) {
          return null
        }
        if (sportHint === 'wrestling' && bannedWrestlingTokens.some((token) => combinedLower.includes(token))) {
          return null
        }

        return {
          externalId: toFingerprint(`${source.id}:${url}`).slice(0, 24),
          url,
          title: truncate(title, 300),
          description: truncate(description, 4000),
          authorName: null,
          publishedAt: null,
          sportHint,
          language,
          rawPayload: {
            query,
            platform: 'web',
            provider: 'brave_search',
          },
          collectionConfidence: clampConfidence(sportHint ? 0.7 : 0.6),
        } satisfies CollectedDocument
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  const allowBingFallback = parseBoolean(process.env.PIPELINE_ALLOW_BING_RSS_WEB_SEARCH, false)
  if (!allowBingFallback) {
    console.log(`[collect] skipping ${source.name}: missing BRAVE_SEARCH_API_KEY (bing RSS fallback disabled)`)
    return []
  }

  // Bing RSS fallback (dev-only). Note: Bing's RSS output is intended for personal/non-commercial use.
  const endpoint = new URL('https://www.bing.com/search')
  endpoint.searchParams.set('format', 'rss')
  endpoint.searchParams.set('q', query)

  const xml = await fetchText(endpoint.toString(), {
    'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
  })

  const results = extractLinksFromBingRss(xml).slice(0, maxItems)
  const documents: CollectedDocument[] = []

  for (const result of results) {
    const url = result.url
    const title = result.title
    if (!url || !title) {
      continue
    }

    documents.push({
      externalId: toFingerprint(`${source.id}:${url}`).slice(0, 24),
      url,
      title,
      description: '',
      authorName: null,
      publishedAt: result.publishedAt,
      sportHint,
      language: 'en',
      rawPayload: {
        query,
        platform: 'web',
        provider: 'bing_rss',
      },
      collectionConfidence: clampConfidence(sportHint ? 0.62 : 0.56),
    })
  }

  return documents
}

function stripBoilerplateHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ')
  return normalizeText(decodeHtmlEntities(withoutTags))
}

function extractMetaContent(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=[\"']${name}[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>`,
    'i'
  )
  const match = html.match(regex)
  if (match?.[1]) {
    return normalizeText(decodeHtmlEntities(match[1]))
  }
  return null
}

function chooseBestWebText(html: string, maxChars: number): { title: string; description: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = normalizeText(decodeHtmlEntities(titleMatch?.[1] ?? '')) || 'Untitled'
  const metaDescription =
    extractMetaContent(html, 'description') ??
    extractMetaContent(html, 'og:description') ??
    ''

  const stripped = stripBoilerplateHtml(html)
  const clipped = stripped.slice(0, Math.max(2000, maxChars))

  return {
    title: truncate(title, 300),
    description: truncate(metaDescription, 4000),
    text: clipped,
  }
}

function coerceTextSummary(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = normalizeText(value)
    return normalized.length > 0 ? normalized : null
  }

  if (value && typeof value === 'object') {
    const obj = value as JsonMap
    const candidates = [
      obj.summary,
      obj.overview,
      obj.description,
      obj.text,
      obj.notes,
      obj.routine_summary,
    ]
    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const normalized = normalizeText(candidate)
        if (normalized.length > 0) {
          return normalized
        }
      }
    }

    try {
      const json = JSON.stringify(value)
      const normalized = normalizeText(json)
      return normalized.length > 0 ? normalized : null
    } catch {
      return null
    }
  }

  return null
}

function flattenMentionCandidates(value: unknown): unknown[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'object') {
    const obj = value as JsonMap
    const explicitArrays = [
      obj.exercise_mentions,
      obj.exercises,
      obj.items,
      obj.mentions,
    ]
    for (const candidate of explicitArrays) {
      if (Array.isArray(candidate)) {
        return candidate
      }
    }

    const values = Object.values(obj)
    const arrayValues = values.filter((entry) => Array.isArray(entry)) as unknown[][]
    if (arrayValues.length > 0) {
      return arrayValues.flat()
    }
  }

  return []
}

function normalizeAthleteMentions(raw: unknown, defaultSport: SportType | null): JsonMap[] {
  const items = flattenMentionCandidates(raw)
  const mentions: JsonMap[] = []

  for (const item of items) {
    let name = ''
    let sport = defaultSport
    let confidence = 0.5

    if (typeof item === 'string') {
      name = normalizeText(item)
    } else if (item && typeof item === 'object') {
      const row = item as JsonMap
      name = normalizeText(String(row.name ?? row.athlete_name ?? row.athlete ?? row.title ?? ''))
      sport = normalizeSport(row.sport) ?? defaultSport
      confidence = clampConfidence(toNumberOrNull(row.confidence) ?? toNumberOrNull(row.confidence_score) ?? 0.5)
    }

    if (!name || isPlaceholderValue(name) || name.length < 3) {
      continue
    }

    mentions.push({
      name,
      sport,
      confidence,
    })
  }

  return Array.from(
    new Map(mentions.map((m) => [`${String(m.name).toLowerCase()}|${String(m.sport ?? '')}`, m])).values()
  )
}

function normalizeExerciseMentions(raw: unknown, defaultSport: SportType | null): JsonMap[] {
  const items = flattenMentionCandidates(raw)
  const mentions: JsonMap[] = []

  for (const item of items) {
    let name = ''
    let rawCategory: string | null = null
    let sport = defaultSport
    let confidence = 0.52

    if (typeof item === 'string') {
      name = normalizeText(item)
    } else if (item && typeof item === 'object') {
      const row = item as JsonMap
      name = normalizeText(
        String(
          row.name ??
          row.exercise_name ??
          row.exercise ??
          row.movement ??
          row.drill ??
          row.title ??
          ''
        )
      )
      rawCategory = row.category ? normalizeText(String(row.category)) : null
      sport = normalizeSport(row.sport) ?? defaultSport
      confidence = clampConfidence(toNumberOrNull(row.confidence) ?? toNumberOrNull(row.confidence_score) ?? 0.52)
    }

    if (!name || isPlaceholderValue(name) || name.length < 3) {
      continue
    }

    const mappedCategory = mapToAppExerciseCategory(rawCategory, name)

    mentions.push({
      name,
      category: mappedCategory,
      sport,
      confidence,
    })
  }

  return Array.from(
    new Map(mentions.map((m) => [`${String(m.name).toLowerCase()}|${String(m.sport ?? '')}`, m])).values()
  )
}

async function collectWebUrl(source: ContentSourceRow): Promise<CollectedDocument[]> {
  const targetUrl = source.url?.trim()
  if (!targetUrl) {
    return []
  }

  const html = await fetchText(targetUrl, {
    'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
  })
  const picked = chooseBestWebText(html, FALLBACK_OPTIONS.webMaxTextChars)
  const combined = `${picked.title} ${picked.description}`

  return [
    {
      externalId: toFingerprint(`${source.id}:${targetUrl}:${picked.title}`).slice(0, 24),
      url: targetUrl,
      title: picked.title,
      description: picked.description,
      authorName: null,
      publishedAt: null,
      sportHint: detectSport(combined),
      language: 'en',
      rawPayload: {
        platform: source.platform,
        snippet: truncate(picked.text, 5000),
      },
      collectionConfidence: clampConfidence(0.58),
    },
  ]
}

async function collectSourceDocuments(
  source: ContentSourceRow,
  maxItems: number
): Promise<CollectedDocument[]> {
  if (source.source_type === 'youtube_search') {
    return collectYouTube(source, maxItems)
  }

  if (source.source_type === 'reddit_search') {
    return collectReddit(source, maxItems)
  }

  if (source.source_type === 'web_search') {
    return collectWebSearch(source, maxItems)
  }

  if (source.source_type === 'rss_feed') {
    const url = source.url?.trim()
    if (!url) {
      return []
    }
    const xml = await fetchText(url)
    return collectFromRss(xml, source, maxItems)
  }

  if (source.source_type === 'web_url') {
    return collectWebUrl(source)
  }

  if (source.source_type === 'social_feed') {
    const kind = normalizeText(String(source.metadata?.kind ?? '')).toLowerCase()
    if (kind === 'web_search' || source.platform.toLowerCase() === 'google') {
      return collectWebSearch(source, maxItems)
    }
    return collectWebUrl(source)
  }

  return []
}

async function getActiveSources(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<ContentSourceRow[]> {
  let query = client
    .from('content_sources')
    .select('id,name,source_type,platform,query,url,metadata,is_active')
    .eq('is_active', true)

  if (options.onlyPlatforms && options.onlyPlatforms.length > 0) {
    query = query.in('platform', options.onlyPlatforms)
  }

  if (options.onlySourceTypes && options.onlySourceTypes.length > 0) {
    query = query.in('source_type', options.onlySourceTypes)
  }

  if (options.onlySourceIds && options.onlySourceIds.length > 0) {
    query = query.in('id', options.onlySourceIds)
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(options.sourceLimit)

  if (error) {
    throw new Error(`Failed to read content_sources: ${error.message}`)
  }

  return (data ?? []) as ContentSourceRow[]
}

function hasSourceFilters(options: PipelineOptions): boolean {
  return Boolean(
    (options.onlyPlatforms && options.onlyPlatforms.length > 0) ||
    (options.onlySourceTypes && options.onlySourceTypes.length > 0) ||
    (options.onlySourceIds && options.onlySourceIds.length > 0)
  )
}

async function resolveFilteredSourceIds(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<string[] | null> {
  if (!hasSourceFilters(options)) {
    return null
  }

  if (options.onlySourceIds && options.onlySourceIds.length > 0) {
    return options.onlySourceIds
  }

  let query = client
    .from('content_sources')
    .select('id,platform,source_type')

  if (options.onlyPlatforms && options.onlyPlatforms.length > 0) {
    query = query.in('platform', options.onlyPlatforms)
  }

  if (options.onlySourceTypes && options.onlySourceTypes.length > 0) {
    query = query.in('source_type', options.onlySourceTypes)
  }

  const { data, error } = await query.limit(500)
  if (error) {
    throw new Error(`Failed resolving filtered content_sources: ${error.message}`)
  }

  const ids = (data ?? []).map((row) => (row as { id: string }).id).filter(Boolean)
  if (ids.length === 0) {
    throw new Error('No content_sources match the provided source filters.')
  }

  return ids
}

async function filterDocumentIdsBySourceIds(
  client: SupabaseClient,
  documentIds: string[],
  allowedSourceIds: string[]
): Promise<Set<string>> {
  if (documentIds.length === 0) {
    return new Set<string>()
  }

  const { data, error } = await client
    .from('source_documents')
    .select('id,source_id')
    .in('id', documentIds)
    .limit(Math.max(1000, documentIds.length))

  if (error) {
    throw new Error(`Failed mapping moderation items to source_documents: ${error.message}`)
  }

  const allowed = new Set<string>()
  const allowedSourceSet = new Set(allowedSourceIds)
  for (const row of data ?? []) {
    const doc = row as { id: string; source_id: string }
    if (doc?.id && doc?.source_id && allowedSourceSet.has(doc.source_id)) {
      allowed.add(doc.id)
    }
  }

  return allowed
}

async function collectCommand(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const sources = await getActiveSources(client, options)

  const stats: CommandResult = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const source of sources) {
    stats.processed += 1

    if (options.videoOnly) {
      const allowVideoIngest = typeof source.metadata?.allow_video_ingest === 'boolean'
        ? source.metadata.allow_video_ingest
        : source.source_type === 'youtube_search'

      if (!allowVideoIngest) {
        stats.skipped += 1
        continue
      }
    }

    try {
      const documents = await collectSourceDocuments(source, options.perSource)

      for (const document of documents) {
        const fingerprint = toFingerprint(
          normalizeText(`${document.url}|${document.title}|${document.description}`)
        )

        const payload = {
          source_id: source.id,
          external_id: document.externalId,
          url: document.url,
          title: document.title,
          description: document.description,
          author_name: document.authorName,
          published_at: document.publishedAt,
          sport_hint: document.sportHint,
          language: document.language,
          raw_payload: document.rawPayload,
          content_fingerprint: fingerprint,
          collection_confidence: document.collectionConfidence,
          processing_state: 'collected',
          processing_error: null,
        }

        const { error } = await client
          .from('source_documents')
          .insert(payload)

        if (error) {
          if (error.code === '23505') {
            stats.skipped += 1
            continue
          }

          stats.failed += 1
          console.log(`[collect] failed for ${source.name}: ${error.message}`)
          continue
        }

        stats.created += 1
      }

      const { error: touchError } = await client
        .from('content_sources')
        .update({ last_collected_at: new Date().toISOString() })
        .eq('id', source.id)

      if (touchError) {
        console.log(`[collect] could not update last_collected_at for ${source.name}: ${touchError.message}`)
      }
    } catch (error) {
      stats.failed += 1
      console.log(`[collect] source ${source.name} failed: ${(error as Error).message}`)
    }
  }

  return stats
}

async function getEntityDictionaries(client: SupabaseClient): Promise<{
  athletes: AthleteEntity[]
  exercises: ExerciseEntity[]
}> {
  const [athleteResponse, exerciseResponse] = await Promise.all([
    client.from('athletes').select('id,name,sport,source_attribution,confidence_score').limit(4000),
    client
      .from('exercises')
      .select('id,name,category,sport,source_attribution,confidence_score')
      .limit(4000),
  ])

  if (athleteResponse.error) {
    throw new Error(`Failed loading athlete dictionary: ${athleteResponse.error.message}`)
  }

  if (exerciseResponse.error) {
    throw new Error(`Failed loading exercise dictionary: ${exerciseResponse.error.message}`)
  }

  return {
    athletes: (athleteResponse.data ?? []) as AthleteEntity[],
    exercises: (exerciseResponse.data ?? []) as ExerciseEntity[],
  }
}

type VideoIngestStatus =
  | 'pending'
  | 'downloading'
  | 'transcribing'
  | 'analyzing'
  | 'completed'
  | 'skipped'
  | 'failed'

interface TranscriptSegmentInput {
  segment_index: number
  start_seconds: number
  end_seconds: number
  text: string
  confidence: number | null
  speaker_label: string | null
  metadata: JsonMap
}

interface FrameSample {
  frameIndex: number
  frameSecond: number
  framePath: string
}

interface FrameDetectionInput {
  frame_index: number
  frame_second: number
  frame_path: string | null
  ocr_text: string | null
  vision_summary: string | null
  detected_exercises: JsonMap[]
  confidence: number | null
  metadata: JsonMap
}

interface ExerciseEventInput {
  start_second: number | null
  end_second: number | null
  sport: SportType | null
  exercise_name: string
  normalized_name: string
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  confidence: number
  evidence: JsonMap
}

interface ExtractedSignalPayload {
  detectedSport: SportType | null
  athleteMentions: JsonMap[]
  exerciseMentions: JsonMap[]
  routineSummary: string | null
  normalizedPayload: JsonMap
  confidence: number
}

interface ExtractionOutcome {
  status: 'extracted' | 'skipped'
  reason?: string
  payload?: ExtractedSignalPayload
}

function toNumberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIntegerOrNull(value: unknown): number | null {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseJsonObject(text: string): JsonMap {
  const trimmed = text.trim()
  if (!trimmed) {
    return {}
  }

  try {
    return JSON.parse(trimmed) as JsonMap
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('No JSON object found in model output')
    }
    return JSON.parse(match[0]) as JsonMap
  }
}

function normalizeSport(value: unknown): SportType | null {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) {
    return null
  }

  if (raw === 'wrestling') {
    return 'wrestling'
  }
  if (raw === 'judo') {
    return 'judo'
  }
  if (raw === 'bjj' || raw === 'jujitsu' || raw === 'ju jitsu' || raw === 'jiu jitsu') {
    return 'bjj'
  }
  return null
}

function extractYouTubeVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (watchMatch?.[1]) {
    return watchMatch[1]
  }

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (shortMatch?.[1]) {
    return shortMatch[1]
  }

  return null
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/)/i.test(url)
}

function shouldUseVideoIngestion(source: ContentSourceRow | undefined, document: SourceDocumentRow): boolean {
  if (!isYouTubeUrl(document.url)) {
    return false
  }

  if (!source) {
    return true
  }

  if (source.source_type !== 'youtube_search') {
    return false
  }

  const explicitAllow = source.metadata?.allow_video_ingest
  if (typeof explicitAllow === 'boolean') {
    return explicitAllow
  }

  return true
}

async function runCommand(
  binary: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(binary, args, {
    cwd,
    maxBuffer: 1024 * 1024 * 50,
  })

  const stdout = String(result.stdout ?? '')
  const stderr = String(result.stderr ?? '')
  return { stdout, stderr }
}

async function assertVideoTooling(options: PipelineOptions): Promise<void> {
  await runCommand(options.ytDlpBin, ['--version'])
  await runCommand(options.ffmpegBin, ['-version'])
}

function ensureArtifactDirectory(options: PipelineOptions, documentId: string): string {
  const baseDir = resolve(process.cwd(), options.videoWorkdir)
  mkdirSync(baseDir, { recursive: true })

  const documentDir = join(baseDir, documentId)
  mkdirSync(documentDir, { recursive: true })
  return documentDir
}

function findArtifactPath(directory: string, prefix: string): string | null {
  const files = readdirSync(directory)
    .filter((file) => file.startsWith(prefix))
    .sort()

  if (files.length === 0) {
    return null
  }

  return join(directory, files[0])
}

function averageConfidence(values: number[]): number {
  if (values.length === 0) {
    return 0.5
  }

  const total = values.reduce((acc, value) => acc + value, 0)
  return clampConfidence(total / values.length)
}

async function upsertVideoIngest(
  client: SupabaseClient,
  document: SourceDocumentRow,
  artifactDir: string
): Promise<string> {
  const payload = {
    document_id: document.id,
    source_id: document.source_id,
    external_video_id: extractYouTubeVideoId(document.url) ?? document.external_id ?? null,
    video_url: document.url,
    platform: 'youtube',
    ingest_status: 'pending' as VideoIngestStatus,
    local_artifact_dir: artifactDir,
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
  }

  const { data, error } = await client
    .from('video_ingests')
    .upsert(payload, { onConflict: 'document_id' })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Failed to upsert video_ingests: ${error?.message ?? 'unknown error'}`)
  }

  return data.id as string
}

async function updateVideoIngestStatus(
  client: SupabaseClient,
  ingestId: string,
  status: VideoIngestStatus,
  updates?: JsonMap
): Promise<void> {
  const payload: JsonMap = {
    ingest_status: status,
    ...(updates ?? {}),
  }

  if (status === 'completed' || status === 'skipped' || status === 'failed') {
    payload.completed_at = new Date().toISOString()
  }

  const { error } = await client
    .from('video_ingests')
    .update(payload)
    .eq('id', ingestId)

  if (error) {
    console.log(`[extract] unable to update video_ingests ${ingestId}: ${error.message}`)
  }
}

async function replaceTranscriptSegments(
  client: SupabaseClient,
  ingestId: string,
  segments: TranscriptSegmentInput[]
): Promise<void> {
  await client.from('transcript_segments').delete().eq('ingest_id', ingestId)

  if (segments.length === 0) {
    return
  }

  const payload = segments.map((segment) => ({
    ingest_id: ingestId,
    ...segment,
  }))

  const { error } = await client.from('transcript_segments').insert(payload)
  if (error) {
    throw new Error(`Failed writing transcript segments: ${error.message}`)
  }
}

async function replaceFrameDetections(
  client: SupabaseClient,
  ingestId: string,
  frames: FrameDetectionInput[]
): Promise<void> {
  await client.from('frame_detections').delete().eq('ingest_id', ingestId)

  if (frames.length === 0) {
    return
  }

  const payload = frames.map((frame) => ({
    ingest_id: ingestId,
    ...frame,
  }))

  const { error } = await client.from('frame_detections').insert(payload)
  if (error) {
    throw new Error(`Failed writing frame detections: ${error.message}`)
  }
}

async function replaceExerciseEvents(
  client: SupabaseClient,
  ingestId: string,
  events: ExerciseEventInput[]
): Promise<void> {
  await client.from('exercise_events').delete().eq('ingest_id', ingestId)

  if (events.length === 0) {
    return
  }

  const payload = events.map((event) => ({
    ingest_id: ingestId,
    ...event,
  }))

  const { error } = await client.from('exercise_events').insert(payload)
  if (error) {
    throw new Error(`Failed writing exercise events: ${error.message}`)
  }
}

async function fetchYouTubeMetadata(
  document: SourceDocumentRow,
  options: PipelineOptions
): Promise<{ durationSeconds: number | null; channelName: string | null }> {
  const { stdout } = await runCommand(options.ytDlpBin, [
    '--dump-single-json',
    '--no-warnings',
    '--skip-download',
    document.url,
  ])

  const metadata = parseJsonObject(stdout)
  return {
    durationSeconds: toNumberOrNull(metadata.duration),
    channelName: typeof metadata.channel === 'string' ? metadata.channel : null,
  }
}

async function downloadVideoAndAudio(
  document: SourceDocumentRow,
  artifactDir: string,
  options: PipelineOptions
): Promise<{ videoPath: string; audioPath: string }> {
  const videoTemplate = join(artifactDir, 'video.%(ext)s')
  const audioTemplate = join(artifactDir, 'audio.%(ext)s')

  await runCommand(options.ytDlpBin, [
    '-f',
    'mp4[height<=480]/best[height<=480]/best',
    '-o',
    videoTemplate,
    '--no-warnings',
    document.url,
  ])

  await runCommand(options.ytDlpBin, [
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '5',
    '-o',
    audioTemplate,
    '--no-warnings',
    document.url,
  ])

  const videoPath = findArtifactPath(artifactDir, 'video.')
  const audioPath = findArtifactPath(artifactDir, 'audio.')

  if (!videoPath || !audioPath) {
    throw new Error('Video artifacts missing after download')
  }

  return { videoPath, audioPath }
}

async function extractVideoFrames(
  videoPath: string,
  artifactDir: string,
  options: PipelineOptions
): Promise<FrameSample[]> {
  const framesDir = join(artifactDir, 'frames')
  mkdirSync(framesDir, { recursive: true })

  await runCommand(options.ffmpegBin, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    videoPath,
    '-vf',
    `fps=1/${Math.max(1, options.frameIntervalSeconds)},scale=960:-1`,
    '-frames:v',
    String(Math.max(1, options.maxFrames)),
    join(framesDir, 'frame-%03d.jpg'),
  ])

  const frameFiles = readdirSync(framesDir)
    .filter((file) => file.startsWith('frame-') && file.endsWith('.jpg'))
    .sort()

  const samples: FrameSample[] = []
  for (const [index, file] of frameFiles.entries()) {
    const framePath = join(framesDir, file)
    if (!existsSync(framePath) || statSync(framePath).size === 0) {
      continue
    }

    samples.push({
      frameIndex: index + 1,
      frameSecond: index * Math.max(1, options.frameIntervalSeconds),
      framePath,
    })
  }

  return samples
}

async function transcribeAudioWithOpenAI(
  audioPath: string,
  options: PipelineOptions
): Promise<{
  text: string
  language: string | null
  confidence: number
  segments: TranscriptSegmentInput[]
}> {
  const openAiApiKey = getRequiredEnv('OPENAI_API_KEY')
  const bytes = readFileSync(audioPath)

  const formData = new FormData()
  formData.append('file', new Blob([bytes]), 'audio.mp3')
  formData.append('model', options.transcriptionModel)
  formData.append('response_format', 'verbose_json')
  formData.append('temperature', '0')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Audio transcription failed: ${response.status} ${errorText}`)
  }

  const payload = (await response.json()) as JsonMap
  const text = normalizeText(String(payload.text ?? ''))
  const language = typeof payload.language === 'string' ? payload.language : null

  const rawSegments = Array.isArray(payload.segments) ? payload.segments : []
  const segments: TranscriptSegmentInput[] = rawSegments
    .map((segment, index) => {
      const raw = segment as JsonMap
      return {
        segment_index: index,
        start_seconds: toNumberOrNull(raw.start) ?? index,
        end_seconds: toNumberOrNull(raw.end) ?? (index + 1),
        text: normalizeText(String(raw.text ?? '')),
        confidence: raw.avg_logprob !== undefined
          ? clampConfidence(Math.exp(Number(raw.avg_logprob)))
          : null,
        speaker_label: null,
        metadata: {
          avg_logprob: raw.avg_logprob ?? null,
          no_speech_prob: raw.no_speech_prob ?? null,
        },
      }
    })
    .filter((segment) => segment.text.length > 0)

  const confidence = averageConfidence(
    segments
      .map((segment) => segment.confidence)
      .filter((value): value is number => value !== null)
  )

  return {
    text,
    language,
    confidence,
    segments,
  }
}

async function callOpenAiVisionJson(
  model: string,
  systemPrompt: string,
  content: JsonMap[]
): Promise<JsonMap> {
  const openAiApiKey = getRequiredEnv('OPENAI_API_KEY')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vision extraction failed: ${response.status} ${errorText}`)
  }

  const payload = (await response.json()) as JsonMap
  const contentNode = (payload.choices as JsonMap[] | undefined)?.[0]?.message as JsonMap | undefined
  const output = contentNode?.content

  if (typeof output === 'string') {
    return parseJsonObject(output)
  }

  if (Array.isArray(output)) {
    const textPart = output.find((entry) => (entry as JsonMap).type === 'text') as JsonMap | undefined
    if (typeof textPart?.text === 'string') {
      return parseJsonObject(String(textPart.text))
    }
  }

  throw new Error('Vision model returned empty content')
}

async function callOpenAiTextJson(
  model: string,
  systemPrompt: string,
  userText: string
): Promise<JsonMap> {
  const openAiApiKey = getRequiredEnv('OPENAI_API_KEY')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Text extraction failed: ${response.status} ${errorText}`)
  }

  const payload = (await response.json()) as JsonMap
  const contentNode = (payload.choices as JsonMap[] | undefined)?.[0]?.message as JsonMap | undefined
  const output = contentNode?.content

  if (typeof output === 'string') {
    return parseJsonObject(output)
  }

  throw new Error('Text model returned empty content')
}

async function extractSignalsFromWeb(
  document: SourceDocumentRow,
  options: PipelineOptions
): Promise<ExtractionOutcome> {
  getRequiredEnv('OPENAI_API_KEY')

  const hostname = getUrlHostname(document.url)
  const blockedDomains = [
    'reddit.com',
    'zhihu.com',
    'pinterest.com',
    'facebook.com',
    'instagram.com',
    'tiktok.com',
  ]
  if (hostname && blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return { status: 'skipped', reason: `blocked domain ${hostname}` }
  }

  // Prefer raw_payload.snippet from collectWebUrl; otherwise fetch the URL and extract page text.
  const snippet = typeof document.raw_payload?.snippet === 'string' ? document.raw_payload.snippet : null

  let pageTitle = document.title
  let pageDescription = document.description ?? ''
  let text = snippet ? normalizeText(snippet) : ''

  if (text.length < 1200) {
    try {
      const html = await fetchText(document.url, {
        'User-Agent': process.env.PIPELINE_USER_AGENT ?? 'DagestaniDiscipleDataPipeline/1.0',
      })
      const picked = chooseBestWebText(html, options.webMaxTextChars)
      pageTitle = picked.title || pageTitle
      pageDescription = picked.description || pageDescription
      text = normalizeText(picked.text)
    } catch (error) {
      // If we can't fetch the page, fall back to the metadata-only text (low quality).
      console.log(`[extract] web fetch failed for ${document.url}: ${(error as Error).message}`)
      text = normalizeText(`${document.title}\n\n${document.description ?? ''}`)
    }
  }

  text = truncate(text, options.webMaxTextChars)

  if (!text) {
    return { status: 'skipped', reason: 'empty web text' }
  }

  const systemPrompt = `You are extracting structured workout information from web pages about combat-sport training.
Return only JSON with this exact schema and types (no extra keys):
{
  "detected_sport": null,
  "relevance_score": 0.0,
  "relevance_reason": "",
  "routine_summary": null,
  "athlete_mentions": [],
  "exercise_mentions": [],
  "evidence_excerpt": ""
}
Type rules:
- detected_sport: \"wrestling\" | \"judo\" | \"bjj\" | null
- relevance_score: number (0-1)
- routine_summary: string | null
- athlete_mentions: array of { name: string, sport: \"wrestling\"|\"judo\"|\"bjj\"|null, confidence: number }
- exercise_mentions: array of { name: string, category: string|null, sport: \"wrestling\"|\"judo\"|\"bjj\"|null, confidence: number }
Rules:
- Only include exercises explicitly described in the page (not guesses).
- Use the app taxonomy categories when possible: full-body, legs, chest, shoulders, back, arms, core, neck.
- relevance_score must be high only for real workout/training content (not general discussion/forums).`

  const userText = `URL: ${document.url}\nTitle: ${pageTitle}\nDescription: ${pageDescription}\n\nContent:\n${text}`
  const output = await callOpenAiTextJson(options.extractionModel, systemPrompt, userText)

  const detectedSport =
    normalizeSport(output.detected_sport) ??
    document.sport_hint ??
    detectSport(`${document.title} ${document.description ?? ''} ${text}`)

  const relevanceScore = clampConfidence(toNumberOrNull(output.relevance_score) ?? 0.45)
  const relevanceReason = truncate(normalizeText(String(output.relevance_reason ?? '')), 300)
  const routineSummaryValue = coerceTextSummary(output.routine_summary)
  const routineSummary = routineSummaryValue
    ? truncate(routineSummaryValue, 280)
    : extractRoutineSummary(text)

  if (relevanceScore < options.webRelevanceThreshold) {
    return {
      status: 'skipped',
      reason: `relevance below threshold (${relevanceScore.toFixed(3)}): ${relevanceReason}`,
    }
  }

  const rawAthleteMentions =
    (output.athlete_mentions as unknown) ??
    (output.athletes as unknown) ??
    (output.athleteMentions as unknown) ??
    (output.routine_summary as JsonMap | undefined)?.athlete_mentions ??
    (output.routine_summary as JsonMap | undefined)?.athletes

  const rawExerciseMentions =
    (output.exercise_mentions as unknown) ??
    (output.exercises as unknown) ??
    (output.exerciseMentions as unknown) ??
    (output.exercise_list as unknown) ??
    (output.workout_exercises as unknown) ??
    (output.routine_summary as JsonMap | undefined)?.exercise_mentions ??
    (output.routine_summary as JsonMap | undefined)?.exercises ??
    (output.routine_summary as JsonMap | undefined)?.workout_exercises

  const athleteMentions = normalizeAthleteMentions(rawAthleteMentions, detectedSport)
  const exerciseMentions = normalizeExerciseMentions(rawExerciseMentions, detectedSport)

  const evidenceExcerptValue = coerceTextSummary(output.evidence_excerpt)
  const evidenceExcerpt = evidenceExcerptValue ? truncate(evidenceExcerptValue, 800) : null

  const confidence = clampConfidence(
    averageConfidence(exerciseMentions.map((m) => toNumberOrNull((m as JsonMap).confidence) ?? 0.5)) * 0.65
      + relevanceScore * 0.35
  )

  return {
    status: 'extracted',
    payload: {
      detectedSport,
      athleteMentions,
      exerciseMentions,
      routineSummary,
      normalizedPayload: {
        source: 'web_text_v1',
        relevance_score: relevanceScore,
        relevance_reason: relevanceReason,
        evidence_excerpt: evidenceExcerpt,
      },
      confidence,
    },
  }
}

async function analyzeTranscriptAndFrames(
  document: SourceDocumentRow,
  transcriptText: string,
  frames: FrameSample[],
  options: PipelineOptions
): Promise<{
  detectedSport: SportType | null
  relevanceScore: number
  relevanceReason: string
  routineSummary: string | null
  athleteMentions: JsonMap[]
  frameDetections: FrameDetectionInput[]
  exerciseEvents: ExerciseEventInput[]
}> {
  const transcriptSnippet = truncate(transcriptText, 12000)
  const content: JsonMap[] = [
    {
      type: 'text',
      text: `Video title: ${document.title}\nVideo description: ${document.description ?? ''}\nTranscript:\n${transcriptSnippet}`,
    },
    {
      type: 'text',
      text: 'Infer workout details from both speech and on-screen visuals.',
    },
  ]

  const limitedFrames = frames.slice(0, Math.max(1, options.maxFrames))
  for (const frame of limitedFrames) {
    const imageBase64 = readFileSync(frame.framePath).toString('base64')
    content.push({
      type: 'text',
      text: `Frame ${frame.frameIndex} at approximately ${frame.frameSecond.toFixed(1)} seconds.`,
    })
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`,
      },
    })
  }

  const systemPrompt = `You are extracting structured workout information from combat-sport training videos.
Return only JSON with this exact schema:
{
  "detected_sport": null,
  "relevance_score": 0.0,
  "relevance_reason": "",
  "routine_summary": null,
  "athlete_mentions": [],
  "frame_detections": [],
  "exercise_events": []
}
Rules:
- Only include exercises visible or spoken in the video content.
- If uncertain, lower confidence.
- relevance_score must be high only for real workout/training videos.
- Keep names practical and normalized (e.g., "Back Squat", "Pull-up", "Turkish Get-up").`

  const modelOutput = await callOpenAiVisionJson(options.visionModel, systemPrompt, content)
  const detectedSport =
    normalizeSport(modelOutput.detected_sport) ??
    detectSport(`${document.title} ${document.description ?? ''} ${transcriptText}`)
  const relevanceScore = clampConfidence(toNumberOrNull(modelOutput.relevance_score) ?? 0.5)
  const relevanceReason = truncate(String(modelOutput.relevance_reason ?? ''), 300)
  const routineSummary = modelOutput.routine_summary
    ? truncate(normalizeText(String(modelOutput.routine_summary)), 280)
    : extractRoutineSummary(transcriptText || document.description || document.title)

  const athleteMentions = Array.isArray(modelOutput.athlete_mentions)
    ? modelOutput.athlete_mentions
        .map((item) => {
          const row = item as JsonMap
          const name = normalizeText(String(row.name ?? ''))
          if (!name || isPlaceholderValue(name)) {
            return null
          }
          return {
            name,
            sport: normalizeSport(row.sport) ?? detectedSport,
            confidence: clampConfidence(toNumberOrNull(row.confidence) ?? 0.5),
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : []

  const frameMap = new Map(limitedFrames.map((frame) => [frame.frameIndex, frame]))
  const frameDetections: FrameDetectionInput[] = Array.isArray(modelOutput.frame_detections)
    ? modelOutput.frame_detections
        .map((item) => {
          const row = item as JsonMap
          const frameIndex = toIntegerOrNull(row.frame_index)
          if (frameIndex === null || !frameMap.has(frameIndex)) {
            return null
          }
          const frame = frameMap.get(frameIndex)!
          const detectedExercises = Array.isArray(row.detected_exercises)
            ? row.detected_exercises.map((exercise) => {
                const e = exercise as JsonMap
                const name = normalizeText(String(e.name ?? ''))
                if (!name || isPlaceholderValue(name)) {
                  return null
                }
                return {
                  name,
                  confidence: clampConfidence(toNumberOrNull(e.confidence) ?? 0.5),
                }
              }).filter((exercise): exercise is NonNullable<typeof exercise> => exercise !== null)
            : []

          return {
            frame_index: frame.frameIndex,
            frame_second: frame.frameSecond,
            frame_path: frame.framePath,
            ocr_text: normalizeText(String(row.ocr_text ?? '')) || null,
            vision_summary: normalizeText(String(row.vision_summary ?? '')) || null,
            detected_exercises: detectedExercises,
            confidence: clampConfidence(toNumberOrNull(row.confidence) ?? 0.5),
            metadata: {},
          } satisfies FrameDetectionInput
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : []

  const exerciseEvents: ExerciseEventInput[] = Array.isArray(modelOutput.exercise_events)
    ? modelOutput.exercise_events
        .map((item) => {
          const row = item as JsonMap
          const exerciseName = normalizeText(String(row.exercise_name ?? ''))
          if (!exerciseName || isPlaceholderValue(exerciseName)) {
            return null
          }
          const sport = normalizeSport(row.sport) ?? detectedSport
          return {
            start_second: toNumberOrNull(row.start_second),
            end_second: toNumberOrNull(row.end_second),
            sport,
            exercise_name: exerciseName,
            normalized_name: slugify(exerciseName),
            sets: toIntegerOrNull(row.sets),
            reps: toIntegerOrNull(row.reps),
            duration_seconds: toIntegerOrNull(row.duration_seconds),
            rest_seconds: toIntegerOrNull(row.rest_seconds),
            confidence: clampConfidence(toNumberOrNull(row.confidence) ?? 0.55),
            evidence: {
              evidence: String(row.evidence ?? ''),
            },
          } satisfies ExerciseEventInput
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : []

  return {
    detectedSport,
    relevanceScore,
    relevanceReason,
    routineSummary,
    athleteMentions,
    frameDetections,
    exerciseEvents,
  }
}

function buildHeuristicSignal(
  document: SourceDocumentRow,
  dictionaries: { athletes: AthleteEntity[]; exercises: ExerciseEntity[] }
): ExtractedSignalPayload {
  const combinedText = normalizeText(`${document.title} ${document.description ?? ''}`)
  const detectedSport = document.sport_hint ?? detectSport(combinedText)

  const athleteMatches = findMentionNames(
    combinedText,
    dictionaries.athletes.map((item) => item.name),
    8
  )
  const exerciseMatches = findMentionNames(
    combinedText,
    dictionaries.exercises.map((item) => item.name),
    16
  )

  const athleteMentions = athleteMatches.map((name) => ({
    name,
    sport:
      dictionaries.athletes.find((athlete) => athlete.name.toLowerCase() === name.toLowerCase())?.sport ??
      detectedSport,
  }))

  const exerciseMentions = exerciseMatches.map((name) => ({
    name,
    category:
      dictionaries.exercises.find((exercise) => exercise.name.toLowerCase() === name.toLowerCase())
        ?.category ?? inferCategory(combinedText),
    sport:
      dictionaries.exercises.find((exercise) => exercise.name.toLowerCase() === name.toLowerCase())
        ?.sport ?? detectedSport,
  }))

  const routineSummary = extractRoutineSummary(document.description ?? document.title)
  const confidenceBase =
    0.44 +
    (detectedSport ? 0.18 : 0) +
    Math.min(athleteMentions.length * 0.07, 0.21) +
    Math.min(exerciseMentions.length * 0.03, 0.15) +
    (routineSummary ? 0.08 : 0)

  return {
    detectedSport,
    athleteMentions,
    exerciseMentions,
    routineSummary,
    normalizedPayload: {
      source: 'metadata_fallback',
      sport: detectedSport,
      athletes: athleteMentions,
      exercises: exerciseMentions,
    },
    confidence: clampConfidence(confidenceBase),
  }
}

async function getSourceLookupByIds(
  client: SupabaseClient,
  sourceIds: string[]
): Promise<Record<string, ContentSourceRow>> {
  if (sourceIds.length === 0) {
    return {}
  }

  const { data, error } = await client
    .from('content_sources')
    .select('id,name,source_type,platform,query,url,metadata,is_active')
    .in('id', sourceIds)

  if (error) {
    throw new Error(`Failed reading source lookup: ${error.message}`)
  }

  return Object.fromEntries(((data ?? []) as ContentSourceRow[]).map((source) => [source.id, source]))
}

async function extractSignalsFromVideo(
  client: SupabaseClient,
  document: SourceDocumentRow,
  options: PipelineOptions
): Promise<ExtractionOutcome> {
  let ingestId: string | null = null
  const artifactDir = ensureArtifactDirectory(options, document.id)

  try {
    ingestId = await upsertVideoIngest(client, document, artifactDir)
    await updateVideoIngestStatus(client, ingestId, 'downloading')

    const metadata = await fetchYouTubeMetadata(document, options)
    if (metadata.durationSeconds !== null && metadata.durationSeconds > options.maxVideoSeconds) {
      await updateVideoIngestStatus(client, ingestId, 'skipped', {
        duration_seconds: metadata.durationSeconds,
        relevance_score: 0,
        relevance_reason: `Video exceeds max duration (${options.maxVideoSeconds}s)`,
      })
      return {
        status: 'skipped',
        reason: 'video exceeds max duration',
      }
    }

    const { videoPath, audioPath } = await downloadVideoAndAudio(document, artifactDir, options)
    const frames = await extractVideoFrames(videoPath, artifactDir, options)

    await updateVideoIngestStatus(client, ingestId, 'transcribing')
    const transcript = await transcribeAudioWithOpenAI(audioPath, options)
    await replaceTranscriptSegments(client, ingestId, transcript.segments)

    await updateVideoIngestStatus(client, ingestId, 'analyzing')
    const analysis = await analyzeTranscriptAndFrames(
      document,
      transcript.text,
      frames,
      options
    )

    await replaceFrameDetections(client, ingestId, analysis.frameDetections)
    await replaceExerciseEvents(client, ingestId, analysis.exerciseEvents)

    if (analysis.relevanceScore < options.videoRelevanceThreshold) {
      await updateVideoIngestStatus(client, ingestId, 'skipped', {
        duration_seconds: metadata.durationSeconds,
        transcript_text: transcript.text,
        transcript_confidence: transcript.confidence,
        detected_language: transcript.language,
        relevance_score: analysis.relevanceScore,
        relevance_reason: analysis.relevanceReason || 'Low training relevance',
        extraction_model: options.extractionModel,
      })
      return {
        status: 'skipped',
        reason: `relevance below threshold (${analysis.relevanceScore.toFixed(3)})`,
      }
    }

    const eventMentions = analysis.exerciseEvents.map((event) => ({
      name: event.exercise_name,
      category: inferCategory(event.exercise_name),
      sport: event.sport ?? analysis.detectedSport,
      confidence: event.confidence,
    }))

    const dedupMentions = Array.from(
      new Map(
        eventMentions.map((mention) => [
          `${mention.name.toLowerCase()}|${mention.sport ?? 'unknown'}`,
          mention,
        ])
      ).values()
    )

    const extractionConfidence = clampConfidence(
      averageConfidence(analysis.exerciseEvents.map((event) => event.confidence)) * 0.7 +
      analysis.relevanceScore * 0.3
    )

    await updateVideoIngestStatus(client, ingestId, 'completed', {
      duration_seconds: metadata.durationSeconds,
      transcript_text: transcript.text,
      transcript_confidence: transcript.confidence,
      detected_language: transcript.language,
      relevance_score: analysis.relevanceScore,
      relevance_reason: analysis.relevanceReason,
      extraction_model: options.extractionModel,
      error_message: null,
    })

    if (!options.keepArtifacts) {
      rmSync(artifactDir, { recursive: true, force: true })
    }

    return {
      status: 'extracted',
      payload: {
        detectedSport: analysis.detectedSport,
        athleteMentions: analysis.athleteMentions,
        exerciseMentions: dedupMentions,
        routineSummary: analysis.routineSummary,
        normalizedPayload: {
          source: 'video_multimodal_v1',
          transcript_excerpt: truncate(transcript.text, 1000),
          frame_count: analysis.frameDetections.length,
          event_count: analysis.exerciseEvents.length,
          relevance_score: analysis.relevanceScore,
          relevance_reason: analysis.relevanceReason,
        },
        confidence: extractionConfidence,
      },
    }
  } catch (error) {
    if (ingestId) {
      await updateVideoIngestStatus(client, ingestId, 'failed', {
        error_message: (error as Error).message,
      })
    }
    throw error
  }
}

async function extractCommand(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const allowedSourceIds = await resolveFilteredSourceIds(client, options)

  let query = client
    .from('source_documents')
    .select('id,source_id,external_id,url,title,description,author_name,published_at,sport_hint,raw_payload,processing_state')
    .in('processing_state', ['collected', 'error'])
    .order('fetched_at', { ascending: false })
    .limit(options.extractLimit)

  if (allowedSourceIds) {
    query = query.in('source_id', allowedSourceIds)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load source_documents for extraction: ${error.message}`)
  }

  const documents = (data ?? []) as SourceDocumentRow[]
  const sourceLookup = await getSourceLookupByIds(
    client,
    Array.from(new Set(documents.map((document) => document.source_id)))
  )
  const dictionaries = await getEntityDictionaries(client)

  const stats: CommandResult = {
    processed: documents.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  const requiresVideo = documents.some((document) =>
    shouldUseVideoIngestion(sourceLookup[document.source_id], document)
  )

  if (requiresVideo) {
    await assertVideoTooling(options)
    getRequiredEnv('OPENAI_API_KEY')
  }

  const requiresTextExtraction = !options.videoOnly && documents.some((document) => {
    if (shouldUseVideoIngestion(sourceLookup[document.source_id], document)) {
      return false
    }
    return document.url.startsWith('http')
  })

  if (requiresTextExtraction) {
    getRequiredEnv('OPENAI_API_KEY')
  }

  for (const document of documents) {
    try {
      const source = sourceLookup[document.source_id]
      let outcome: ExtractionOutcome

      if (shouldUseVideoIngestion(source, document)) {
        outcome = await extractSignalsFromVideo(client, document, options)
      } else if (options.videoOnly) {
        outcome = {
          status: 'skipped',
          reason: 'video ingestion required and source is not eligible',
        }
      } else {
        // For web documents, attempt LLM-based extraction over scraped text.
        // If it fails, fall back to heuristic extraction.
        const shouldTryWeb =
          source?.platform === 'web' ||
          source?.source_type === 'web_url' ||
          source?.source_type === 'web_search' ||
          source?.source_type === 'rss_feed'

        if (shouldTryWeb) {
          try {
            outcome = await extractSignalsFromWeb(document, options)
          } catch (error) {
            console.log(`[extract] web extraction failed for ${document.url}: ${(error as Error).message}`)
            outcome = {
              status: 'extracted',
              payload: buildHeuristicSignal(document, dictionaries),
            }
          }
        } else {
          outcome = {
            status: 'extracted',
            payload: buildHeuristicSignal(document, dictionaries),
          }
        }
      }

      if (outcome.status === 'skipped' || !outcome.payload) {
        stats.skipped += 1
        await client
          .from('source_documents')
          .update({
            processing_state: 'discarded',
            processing_error: outcome.reason ?? null,
          })
          .eq('id', document.id)
        continue
      }

      const { error: extractError } = await client.from('extracted_signals').upsert(
        {
          document_id: document.id,
          extraction_version: 'v1',
          extractor: shouldUseVideoIngestion(source, document) ? 'multimodal-v1' : 'heuristic',
          model: shouldUseVideoIngestion(source, document) ? options.extractionModel : null,
          confidence: outcome.payload.confidence,
          detected_sport: outcome.payload.detectedSport,
          athlete_mentions: outcome.payload.athleteMentions,
          exercise_mentions: outcome.payload.exerciseMentions,
          routine_summary: outcome.payload.routineSummary,
          normalized_payload: outcome.payload.normalizedPayload,
        },
        { onConflict: 'document_id,extraction_version' }
      )

      if (extractError) {
        throw new Error(`Failed writing extracted_signals: ${extractError.message}`)
      }

      stats.created += 1

      await client
        .from('source_documents')
        .update({ processing_state: 'extracted', processing_error: null })
        .eq('id', document.id)
    } catch (extractError) {
      stats.failed += 1
      await client
        .from('source_documents')
        .update({ processing_state: 'error', processing_error: (extractError as Error).message })
        .eq('id', document.id)
    }
  }

  return stats
}

function buildAttribution(
  sourceLookup: Record<string, ContentSourceRow>,
  document: SourceDocumentRow
): SourceAttribution[] {
  const source = sourceLookup[document.source_id]

  return [
    {
      source_id: document.source_id,
      source_name: source?.name ?? 'unknown-source',
      platform: source?.platform ?? 'unknown-platform',
      document_id: document.id,
      url: document.url,
      title: document.title,
      published_at: document.published_at,
      collected_at: new Date().toISOString(),
    },
  ]
}

function buildQueueProposals(
  signal: ExtractedSignalRow,
  document: SourceDocumentRow,
  sourceLookup: Record<string, ContentSourceRow>
): Array<{
  queueType: QueueType
  key: string
  proposedData: JsonMap
  confidence: number
  sourceAttribution: JsonMap[]
}> {
  const proposals: Array<{
    queueType: QueueType
    key: string
    proposedData: JsonMap
    confidence: number
    sourceAttribution: JsonMap[]
  }> = []

  const sport = signal.detected_sport ?? document.sport_hint
  const attribution = buildAttribution(sourceLookup, document)

  const athleteMentions = Array.isArray(signal.athlete_mentions)
    ? signal.athlete_mentions
    : []
  const exerciseMentions = Array.isArray(signal.exercise_mentions)
    ? signal.exercise_mentions
    : []

  for (const athlete of athleteMentions) {
    const name = String(athlete.name ?? '').trim()
    if (!name || isPlaceholderValue(name)) {
      continue
    }

    const athleteSport = (athlete.sport as SportType | undefined) ?? sport
    if (!athleteSport) {
      continue
    }

    proposals.push({
      queueType: 'athlete',
      key: slugify(`${athleteSport}-${name}`),
      proposedData: {
        name,
        sport: athleteSport,
        bio: null,
      },
      confidence: clampConfidence(signal.confidence),
      sourceAttribution: attribution,
    })
  }

  for (const exercise of exerciseMentions) {
    const name = String(exercise.name ?? '').trim()
    if (!name || isPlaceholderValue(name)) {
      continue
    }

    const category = mapToAppExerciseCategory(
      String(exercise.category ?? ''),
      name
    )
    const linkedAthleteName = athleteMentions.length > 0
      ? String(athleteMentions[0]?.name ?? '').trim()
      : null

    proposals.push({
      queueType: 'exercise',
      key: slugify(`${name}-${sport ?? 'any'}`),
      proposedData: {
        name,
        category,
        sport,
        athlete_name: linkedAthleteName || null,
        athlete_specific: true,
        description: document.description,
      },
      confidence: clampConfidence(signal.confidence - 0.02),
      sourceAttribution: attribution,
    })
  }

  const athleteNames = athleteMentions
    .map((item) => String(item.name ?? '').trim())
    .filter((value) => value.length > 0)
    .slice(0, 4)

  const exerciseNames = exerciseMentions
    .map((item) => String(item.name ?? '').trim())
    .filter((value) => value.length > 0)
    .slice(0, 6)

  for (const athleteName of athleteNames) {
    for (const exerciseName of exerciseNames) {
      proposals.push({
        queueType: 'athlete_exercise',
        key: slugify(`${athleteName}-${exerciseName}`),
        proposedData: {
          athlete_name: athleteName,
          exercise_name: exerciseName,
          sport,
          notes: signal.routine_summary,
          priority: 5,
        },
        confidence: clampConfidence(signal.confidence - 0.05),
        sourceAttribution: attribution,
      })
    }
  }

  const routineTitle = document.title.trim()
  const routineSteps = extractRoutineSteps(document.description ?? '')
  const shouldProposeRoutine =
    Boolean(signal.routine_summary) ||
    routineSteps.length > 0 ||
    exerciseMentions.length > 0

  if (routineTitle && shouldProposeRoutine) {
    proposals.push({
      queueType: 'routine',
      key: slugify(routineTitle),
      proposedData: {
        title: routineTitle,
        sport,
        summary: signal.routine_summary ?? document.description,
        steps: routineSteps,
      },
      confidence: clampConfidence(signal.confidence - 0.03),
      sourceAttribution: attribution,
    })
  }

  return proposals
}

async function queueCommand(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const allowedSourceIds = await resolveFilteredSourceIds(client, options)

  let documentsQuery = client
      .from('source_documents')
      .select('id,source_id,external_id,url,title,description,author_name,published_at,sport_hint,raw_payload,processing_state')
      .eq('processing_state', 'extracted')
      .order('updated_at', { ascending: false })
      .limit(options.queueLimit)

  if (allowedSourceIds) {
    documentsQuery = documentsQuery.in('source_id', allowedSourceIds)
  }

  const [documentsResponse, signalsResponse] = await Promise.all([
    documentsQuery,
    client
      .from('extracted_signals')
      .select('id,document_id,confidence,detected_sport,athlete_mentions,exercise_mentions,routine_summary,normalized_payload')
      .order('updated_at', { ascending: false })
      .limit(options.queueLimit),
  ])

  if (documentsResponse.error) {
    throw new Error(`Failed to load extracted documents: ${documentsResponse.error.message}`)
  }

  if (signalsResponse.error) {
    throw new Error(`Failed to load extracted signals: ${signalsResponse.error.message}`)
  }

  const documents = (documentsResponse.data ?? []) as SourceDocumentRow[]
  const signals = (signalsResponse.data ?? []) as ExtractedSignalRow[]
  const sourceLookup = await getSourceLookupByIds(
    client,
    Array.from(new Set(documents.map((document) => document.source_id)))
  )

  const signalByDocumentId = new Map(signals.map((signal) => [signal.document_id, signal]))

  const stats: CommandResult = {
    processed: documents.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const document of documents) {
    const signal = signalByDocumentId.get(document.id)
    if (!signal) {
      stats.skipped += 1
      continue
    }

    const proposals = buildQueueProposals(signal, document, sourceLookup)

    if (proposals.length === 0) {
      await client
        .from('source_documents')
        .update({ processing_state: 'normalized' })
        .eq('id', document.id)
      stats.skipped += 1
      continue
    }

    for (const proposal of proposals) {
      const { error } = await client.from('moderation_queue').upsert(
        {
          document_id: document.id,
          extraction_id: signal.id,
          queue_type: proposal.queueType,
          proposal_key: proposal.key,
          proposed_data: proposal.proposedData,
          source_attribution: proposal.sourceAttribution,
          confidence: proposal.confidence,
          status: 'pending',
        },
        {
          onConflict: 'document_id,queue_type,proposal_key',
          ignoreDuplicates: true,
        }
      )

      if (error) {
        stats.failed += 1
        console.log(`[queue] failed proposal ${proposal.queueType}:${proposal.key} -> ${error.message}`)
      } else {
        stats.created += 1
      }
    }

    await client
      .from('source_documents')
      .update({ processing_state: 'queued' })
      .eq('id', document.id)
  }

  return stats
}

async function reviewCommand(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const { data, error } = await client
    .from('moderation_queue')
    .select('id,document_id,queue_type,proposed_data,source_attribution,confidence,status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(options.reviewLimit)

  if (error) {
    throw new Error(`Failed to load moderation queue: ${error.message}`)
  }

  const items = (data ?? []) as ModerationQueueRow[]
  const allowedSourceIds = await resolveFilteredSourceIds(client, options)
  const allowedDocumentIds = allowedSourceIds
    ? await filterDocumentIdsBySourceIds(
        client,
        Array.from(new Set(items.map((item) => item.document_id))),
        allowedSourceIds
      )
    : null

  const stats: CommandResult = {
    processed: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const item of items) {
    if (allowedDocumentIds && !allowedDocumentIds.has(item.document_id)) {
      stats.skipped += 1
      continue
    }

    let nextStatus: ModerationQueueRow['status'] | null = null
    let note = ''

    if (item.confidence >= options.approveThreshold) {
      nextStatus = 'approved'
      note = `Auto-approved (confidence ${item.confidence.toFixed(3)} >= ${options.approveThreshold})`
    } else if (item.confidence <= options.rejectThreshold) {
      nextStatus = 'rejected'
      note = `Auto-rejected (confidence ${item.confidence.toFixed(3)} <= ${options.rejectThreshold})`
    }

    if (!nextStatus) {
      stats.skipped += 1
      continue
    }

    const { error: updateError } = await client
      .from('moderation_queue')
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: note,
      })
      .eq('id', item.id)

    if (updateError) {
      stats.failed += 1
      console.log(`[review] failed to update ${item.id}: ${updateError.message}`)
      continue
    }

    stats.updated += 1
  }

  return stats
}

async function findAthleteByName(
  client: SupabaseClient,
  name: string,
  sport: SportType
): Promise<AthleteEntity | null> {
  const { data, error } = await client
    .from('athletes')
    .select('id,name,sport,source_attribution,confidence_score')
    .ilike('name', name)
    .eq('sport', sport)
    .limit(1)

  if (error) {
    throw new Error(`Athlete lookup failed: ${error.message}`)
  }

  return ((data ?? [])[0] as AthleteEntity | undefined) ?? null
}

async function findExerciseByName(
  client: SupabaseClient,
  name: string,
  sport: SportType | null
): Promise<ExerciseEntity | null> {
  let query = client
    .from('exercises')
    .select('id,name,category,sport,source_attribution,confidence_score')
    .ilike('name', name)
    .limit(1)

  if (sport) {
    query = query.eq('sport', sport)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Exercise lookup failed: ${error.message}`)
  }

  return ((data ?? [])[0] as ExerciseEntity | undefined) ?? null
}

function fallbackAthleteNameForSport(sport: SportType): string {
  if (sport === 'wrestling') {
    return 'Source Coach (Wrestling)'
  }
  if (sport === 'judo') {
    return 'Source Coach (Judo)'
  }
  return 'Source Coach (Ju Jitsu)'
}

async function ensureAthleteExerciseLink(
  client: SupabaseClient,
  exerciseId: string,
  proposedData: JsonMap,
  attribution: JsonMap[],
  confidence: number
): Promise<void> {
  const attributionText = attribution
    .map((item) => `${item.title ?? ''} ${item.source_name ?? ''}`)
    .join(' ')
  const inferredSport = detectSport(
    `${String(proposedData.description ?? '')} ${String(proposedData.name ?? '')} ${attributionText}`
  )
  const sport = normalizeSport(proposedData.sport) ?? inferredSport
  if (!sport) {
    return
  }

  const explicitAthleteName = normalizeText(
    String(
      proposedData.athlete_name ??
      proposedData.athlete ??
      ''
    )
  )

  const athleteName = explicitAthleteName || fallbackAthleteNameForSport(sport)
  const athleteId = await upsertAthlete(
    client,
    {
      name: athleteName,
      sport,
      bio: explicitAthleteName
        ? null
        : `Fallback attribution athlete for ${sport} pipeline ingestion`,
    },
    attribution,
    confidence
  )

  const { error } = await client
    .from('athlete_exercises')
    .upsert(
      {
        athlete_id: athleteId,
        exercise_id: exerciseId,
        notes: (proposedData.notes as string | undefined) ?? (proposedData.description as string | undefined) ?? null,
        reps: (proposedData.reps as string | undefined) ?? null,
        sets: (proposedData.sets as string | undefined) ?? null,
        weight: (proposedData.weight as string | undefined) ?? null,
        duration: (proposedData.duration as string | undefined) ?? null,
        frequency: (proposedData.frequency as string | undefined) ?? null,
        priority: Number.isFinite(Number(proposedData.priority))
          ? Number(proposedData.priority)
          : 5,
        source_attribution: attribution,
        confidence_score: confidence,
      },
      { onConflict: 'athlete_id,exercise_id' }
    )

  if (error) {
    throw new Error(`Failed ensuring athlete_exercises link: ${error.message}`)
  }
}

async function upsertAthlete(
  client: SupabaseClient,
  proposedData: JsonMap,
  attribution: JsonMap[],
  confidence: number
): Promise<string> {
  const name = String(proposedData.name ?? '').trim()
  const sport = proposedData.sport as SportType | undefined

  if (!name || !sport || !SPORTS.includes(sport)) {
    throw new Error('Athlete proposal missing valid name/sport')
  }

  const existing = await findAthleteByName(client, name, sport)

  if (existing) {
    const mergedAttribution = mergeAttribution(existing.source_attribution, attribution)
    const nextConfidence = clampConfidence(Math.max(existing.confidence_score ?? 0, confidence))

    const { error } = await client
      .from('athletes')
      .update({
        source_attribution: mergedAttribution,
        confidence_score: nextConfidence,
      })
      .eq('id', existing.id)

    if (error) {
      throw new Error(`Failed updating athlete ${name}: ${error.message}`)
    }

    return existing.id
  }

  const { data, error } = await client
    .from('athletes')
    .insert({
      name,
      sport,
      nationality: (proposedData.nationality as string | undefined) ?? null,
      achievements: (proposedData.achievements as string[] | undefined) ?? null,
      bio: (proposedData.bio as string | undefined) ?? null,
      source_attribution: attribution,
      confidence_score: confidence,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Failed inserting athlete ${name}: ${error?.message ?? 'unknown error'}`)
  }

  return data.id as string
}

async function upsertExercise(
  client: SupabaseClient,
  proposedData: JsonMap,
  attribution: JsonMap[],
  confidence: number,
  options?: {
    ensureAthleteLink?: boolean
  }
): Promise<string> {
  const ensureAthleteLink = options?.ensureAthleteLink ?? true
  const name = String(proposedData.name ?? '').trim()
  const category = mapToAppExerciseCategory(
    String(proposedData.category ?? ''),
    name
  )
  const sport = normalizeSport(proposedData.sport)

  if (!name) {
    throw new Error('Exercise proposal missing name')
  }

  const existing = await findExerciseByName(client, name, sport)

  if (existing) {
    const mergedAttribution = mergeAttribution(existing.source_attribution, attribution)
    const nextConfidence = clampConfidence(Math.max(existing.confidence_score ?? 0, confidence))

    const { error } = await client
      .from('exercises')
      .update({
        category,
        sport,
        description: (proposedData.description as string | undefined) ?? null,
        athlete_specific: true,
        source_attribution: mergedAttribution,
        confidence_score: nextConfidence,
      })
      .eq('id', existing.id)

    if (error) {
      throw new Error(`Failed updating exercise ${name}: ${error.message}`)
    }

    if (ensureAthleteLink) {
      await ensureAthleteExerciseLink(
        client,
        existing.id,
        {
          ...proposedData,
          sport,
          category,
        },
        mergedAttribution,
        nextConfidence
      )
    }

    return existing.id
  }

  const { data, error } = await client
    .from('exercises')
    .insert({
      name,
      category,
      sport,
      description: (proposedData.description as string | undefined) ?? null,
      athlete_specific: true,
      source_attribution: attribution,
      confidence_score: confidence,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Failed inserting exercise ${name}: ${error?.message ?? 'unknown error'}`)
  }

  if (ensureAthleteLink) {
    await ensureAthleteExerciseLink(
      client,
      data.id as string,
      {
        ...proposedData,
        sport,
        category,
      },
      attribution,
      confidence
    )
  }

  return data.id as string
}

async function upsertAthleteExercise(
  client: SupabaseClient,
  proposedData: JsonMap,
  attribution: JsonMap[],
  confidence: number
): Promise<string> {
  const athleteName = String(proposedData.athlete_name ?? '').trim()
  const exerciseName = String(proposedData.exercise_name ?? '').trim()
  const sport = proposedData.sport as SportType | undefined

  if (!athleteName || !exerciseName || !sport || !SPORTS.includes(sport)) {
    throw new Error('Athlete-exercise proposal missing valid athlete/exercise/sport')
  }

  const athleteId = await upsertAthlete(
    client,
    { name: athleteName, sport, bio: null },
    attribution,
    confidence
  )

  const exerciseId = await upsertExercise(
    client,
    {
      name: exerciseName,
      category: mapToAppExerciseCategory(String(proposedData.category ?? ''), exerciseName),
      sport,
      description: (proposedData.notes as string | undefined) ?? null,
    },
    attribution,
    confidence,
    {
      ensureAthleteLink: false,
    }
  )

  const { data, error } = await client
    .from('athlete_exercises')
    .upsert(
      {
        athlete_id: athleteId,
        exercise_id: exerciseId,
        notes: (proposedData.notes as string | undefined) ?? null,
        reps: (proposedData.reps as string | undefined) ?? null,
        sets: (proposedData.sets as string | undefined) ?? null,
        weight: (proposedData.weight as string | undefined) ?? null,
        duration: (proposedData.duration as string | undefined) ?? null,
        frequency: (proposedData.frequency as string | undefined) ?? null,
        priority: Number.isFinite(Number(proposedData.priority))
          ? Number(proposedData.priority)
          : 5,
        source_attribution: attribution,
        confidence_score: confidence,
      },
      {
        onConflict: 'athlete_id,exercise_id',
      }
    )
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(
      `Failed upserting athlete_exercise ${athleteName} -> ${exerciseName}: ${error?.message ?? 'unknown error'}`
    )
  }

  return data.id as string
}

async function upsertRoutine(
  client: SupabaseClient,
  proposedData: JsonMap,
  attribution: JsonMap[],
  confidence: number
): Promise<string> {
  const title = String(proposedData.title ?? '').trim()
  const sport = (proposedData.sport as SportType | null | undefined) ?? null

  if (!title) {
    throw new Error('Routine proposal missing title')
  }

  let existingQuery = client
    .from('ingested_workout_routines')
    .select('id,source_attribution,confidence_score')
    .eq('title', title)
    .limit(1)

  if (sport) {
    existingQuery = existingQuery.eq('sport', sport)
  } else {
    existingQuery = existingQuery.is('sport', null)
  }

  const { data: existingRows, error: existingError } = await existingQuery
  if (existingError) {
    throw new Error(`Routine lookup failed: ${existingError.message}`)
  }

  const existing = (existingRows?.[0] as {
    id: string
    source_attribution: JsonMap[] | null
    confidence_score: number | null
  } | undefined) ?? null

  const stepsFromProposal = Array.isArray(proposedData.steps)
    ? (proposedData.steps as unknown[])
        .map((step) => String(step).trim())
        .filter((step) => step.length > 0)
    : []

  if (existing) {
    const mergedAttribution = mergeAttribution(existing.source_attribution, attribution)
    const nextConfidence = clampConfidence(Math.max(existing.confidence_score ?? 0, confidence))

    const { error } = await client
      .from('ingested_workout_routines')
      .update({
        summary: (proposedData.summary as string | undefined) ?? null,
        steps: stepsFromProposal,
        source_attribution: mergedAttribution,
        confidence_score: nextConfidence,
      })
      .eq('id', existing.id)

    if (error) {
      throw new Error(`Routine update failed: ${error.message}`)
    }

    return existing.id
  }

  const { data, error } = await client
    .from('ingested_workout_routines')
    .insert({
      title,
      sport,
      summary: (proposedData.summary as string | undefined) ?? null,
      steps: stepsFromProposal,
      source_attribution: attribution,
      confidence_score: confidence,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Routine insert failed: ${error?.message ?? 'unknown error'}`)
  }

  return data.id as string
}

type ExerciseEventRow = {
  id: string
  ingest_id: string
  start_second: number | null
  end_second: number | null
  sport: SportType | null
  exercise_name: string
  normalized_name: string | null
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  confidence: number
  evidence: JsonMap | null
}

type VideoIngestRow = {
  id: string
  document_id: string
  video_url: string
}

function drillDifficultyFromConfidence(confidence: number): 'beginner' | 'intermediate' | 'advanced' {
  if (confidence >= 0.82) {
    return 'advanced'
  }
  if (confidence >= 0.62) {
    return 'intermediate'
  }
  return 'beginner'
}

function sportLabel(sport: SportType): string {
  if (sport === 'wrestling') {
    return 'Wrestling'
  }
  if (sport === 'judo') {
    return 'Judo'
  }
  return 'Ju Jitsu'
}

function buildAutoDrillId(sport: SportType, exerciseName: string): string {
  return `auto-drill-${slugify(`${sport}-${exerciseName}`)}`
}

async function publishDrillsFromExerciseEvents(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const stats: CommandResult = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  if (!options.publishDrillsFromEvents) {
    return stats
  }

  const { data: publishedItems, error: publishedError } = await client
    .from('moderation_queue')
    .select('document_id')
    .eq('status', 'published')
    .order('reviewed_at', { ascending: false })
    .limit(Math.max(50, options.publishLimit * 5))

  if (publishedError) {
    throw new Error(`Failed loading published moderation items for drill stage: ${publishedError.message}`)
  }

  const documentIds = Array.from(
    new Set((publishedItems ?? []).map((item: { document_id: string }) => item.document_id))
  )

  if (documentIds.length === 0) {
    return stats
  }

  const allowedSourceIds = await resolveFilteredSourceIds(client, options)
  if (allowedSourceIds) {
    const allowedDocumentIds = await filterDocumentIdsBySourceIds(client, documentIds, allowedSourceIds)
    const filtered = documentIds.filter((id) => allowedDocumentIds.has(id))
    if (filtered.length === 0) {
      return stats
    }
    documentIds.length = 0
    documentIds.push(...filtered)
  }

  const { data: ingests, error: ingestError } = await client
    .from('video_ingests')
    .select('id,document_id,video_url')
    .eq('ingest_status', 'completed')
    .in('document_id', documentIds)

  if (ingestError) {
    throw new Error(`Failed loading completed video ingests: ${ingestError.message}`)
  }

  const ingestRows = (ingests ?? []) as VideoIngestRow[]
  if (ingestRows.length === 0) {
    return stats
  }

  const ingestLookup = new Map(ingestRows.map((ingest) => [ingest.id, ingest]))

  const { data: eventRows, error: eventError } = await client
    .from('exercise_events')
    .select('id,ingest_id,start_second,end_second,sport,exercise_name,normalized_name,sets,reps,duration_seconds,rest_seconds,confidence,evidence')
    .in('ingest_id', ingestRows.map((ingest) => ingest.id))
    .order('created_at', { ascending: false })
    .limit(Math.max(100, options.publishLimit * 20))

  if (eventError) {
    throw new Error(`Failed loading exercise events for drill stage: ${eventError.message}`)
  }

  const events = (eventRows ?? []) as ExerciseEventRow[]
  stats.processed = events.length

  if (events.length === 0) {
    return stats
  }

  const drillIds = Array.from(
    new Set(
      events
        .filter((event) => !!event.sport && event.exercise_name.trim().length > 0)
        .map((event) => buildAutoDrillId(event.sport as SportType, event.exercise_name))
    )
  )

  const existingDrillIds = new Set<string>()
  if (drillIds.length > 0) {
    const { data: existingDrills, error: existingDrillsError } = await client
      .from('drills')
      .select('id')
      .in('id', drillIds)

    if (existingDrillsError) {
      throw new Error(`Failed checking existing drills: ${existingDrillsError.message}`)
    }

    for (const drill of existingDrills ?? []) {
      existingDrillIds.add((drill as { id: string }).id)
    }
  }

  const routinesByIngest = new Map<string, { sport: SportType; drillIds: string[]; title: string; videoUrl: string }>()

  for (const event of events) {
    try {
      const sport = event.sport
      const exerciseName = normalizeText(event.exercise_name)
      if (!sport || !exerciseName) {
        stats.skipped += 1
        continue
      }

      const confidence = clampConfidence(event.confidence ?? 0.5)
      if (confidence < 0.4) {
        stats.skipped += 1
        continue
      }

      const ingest = ingestLookup.get(event.ingest_id)
      if (!ingest) {
        stats.skipped += 1
        continue
      }

      const appCategory = mapToAppExerciseCategory(null, exerciseName)
      const drillId = buildAutoDrillId(sport, exerciseName)
      const eventAttribution: JsonMap[] = [
        {
          source_id: 'video-ingest',
          source_name: 'Video Ingest',
          platform: 'youtube',
          document_id: ingest.document_id,
          url: ingest.video_url,
          title: exerciseName,
          published_at: null,
          collected_at: new Date().toISOString(),
        },
      ]

      await upsertExercise(
        client,
        {
          name: exerciseName,
          category: appCategory,
          sport,
          description: String(event.evidence?.evidence ?? '').slice(0, 600),
        },
        eventAttribution,
        confidence,
        {
          ensureAthleteLink: true,
        }
      )

      const repsText = event.reps ? `${event.reps} reps` : null
      const setsText = event.sets ? `${event.sets} sets` : null
      const durationText = event.duration_seconds ? `${event.duration_seconds}s effort` : null
      const restText = event.rest_seconds ? `${event.rest_seconds}s rest` : null
      const stepHint = [setsText, repsText, durationText, restText].filter(Boolean).join(' · ')
      const evidenceText = normalizeText(String(event.evidence?.evidence ?? '')) || 'Extracted from video evidence'

      const payload = {
        id: drillId,
        name: exerciseName,
        category: 'exercise',
        subcategory: appCategory,
        video_url: ingest.video_url,
        duration: event.duration_seconds ?? Math.max(45, Number((event.end_second ?? 0) - (event.start_second ?? 0)) || 60),
        difficulty: drillDifficultyFromConfidence(confidence),
        sport_relevance: [sport],
        description: `Auto-extracted ${sportLabel(sport)} drill from source video. ${evidenceText}`.slice(0, 600),
        benefits: [`Improves ${appCategory} performance for ${sportLabel(sport)}.`],
        instructions: stepHint
          ? ['Use coach guidance from source video.', stepHint]
          : ['Use coach guidance from source video.', 'Focus on controlled technique and safe progression.'],
        coaching_cues: ['Maintain technical form.', 'Scale intensity to your level.'],
        equipment: null,
        is_premium: false,
      }

      const { error: drillError } = await client
        .from('drills')
        .upsert(payload, { onConflict: 'id' })

      if (drillError) {
        throw new Error(`Drill upsert failed: ${drillError.message}`)
      }

      if (existingDrillIds.has(drillId)) {
        stats.updated += 1
      } else {
        stats.created += 1
        existingDrillIds.add(drillId)
      }

      if (options.publishRoutinesFromEvents) {
        const existingRoutine = routinesByIngest.get(event.ingest_id)
        const routineTitle = `Auto ${sportLabel(sport)} Routine`
        if (existingRoutine) {
          if (!existingRoutine.drillIds.includes(drillId)) {
            existingRoutine.drillIds.push(drillId)
          }
        } else {
          routinesByIngest.set(event.ingest_id, {
            sport,
            drillIds: [drillId],
            title: routineTitle,
            videoUrl: ingest.video_url,
          })
        }
      }
    } catch (error) {
      stats.failed += 1
      console.log(`[publish-drills] failed on event ${event.id}: ${(error as Error).message}`)
    }
  }

  if (options.publishRoutinesFromEvents && routinesByIngest.size > 0) {
    for (const [ingestId, routineData] of routinesByIngest.entries()) {
      try {
        const routineId = `auto-routine-${slugify(ingestId)}`
        const { error: routineError } = await client
          .from('routines')
          .upsert(
            {
              id: routineId,
              name: routineData.title,
              type: 'mobility',
              duration: routineData.drillIds.length * 3,
              description: `Auto-published routine from extracted exercise events (${routineData.videoUrl}).`,
              for_sport: [routineData.sport],
              for_workout_focus: ['Auto Generated'],
              is_premium: false,
            },
            { onConflict: 'id' }
          )

        if (routineError) {
          throw new Error(`Routine upsert failed: ${routineError.message}`)
        }

        await client.from('routine_drills').delete().eq('routine_id', routineId)

        if (routineData.drillIds.length > 0) {
          const routineDrillsPayload = routineData.drillIds.map((drillId, index) => ({
            id: randomUUID(),
            routine_id: routineId,
            drill_id: drillId,
            order_index: index,
            duration: 90,
          }))

          const { error: routineDrillsError } = await client
            .from('routine_drills')
            .insert(routineDrillsPayload)

          if (routineDrillsError) {
            throw new Error(`Routine drills insert failed: ${routineDrillsError.message}`)
          }
        }
      } catch (error) {
        stats.failed += 1
        console.log(`[publish-drills] routine generation failed for ingest ${ingestId}: ${(error as Error).message}`)
      }
    }
  }

  return stats
}

async function publishQueueItem(
  client: SupabaseClient,
  item: ModerationQueueRow
): Promise<string> {
  if (item.queue_type === 'athlete') {
    return upsertAthlete(client, item.proposed_data, item.source_attribution, item.confidence)
  }

  if (item.queue_type === 'exercise') {
    return upsertExercise(client, item.proposed_data, item.source_attribution, item.confidence)
  }

  if (item.queue_type === 'athlete_exercise') {
    return upsertAthleteExercise(
      client,
      item.proposed_data,
      item.source_attribution,
      item.confidence
    )
  }

  return upsertRoutine(client, item.proposed_data, item.source_attribution, item.confidence)
}

async function updateDocumentStateIfDone(
  client: SupabaseClient,
  documentId: string
): Promise<void> {
  const { count, error } = await client
    .from('moderation_queue')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .neq('status', 'published')

  if (error) {
    console.log(`[publish] could not inspect moderation status for document ${documentId}: ${error.message}`)
    return
  }

  if ((count ?? 0) === 0) {
    const { error: stateError } = await client
      .from('source_documents')
      .update({ processing_state: 'published' })
      .eq('id', documentId)

    if (stateError) {
      console.log(`[publish] could not mark document ${documentId} as published: ${stateError.message}`)
    }
  }
}

async function publishCommand(
  client: SupabaseClient,
  options: PipelineOptions
): Promise<CommandResult> {
  const { data, error } = await client
    .from('moderation_queue')
    .select('id,document_id,queue_type,proposed_data,source_attribution,confidence,status')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: true })
    .limit(options.publishLimit)

  if (error) {
    throw new Error(`Failed to load approved moderation items: ${error.message}`)
  }

  const items = (data ?? []) as ModerationQueueRow[]
  const allowedSourceIds = await resolveFilteredSourceIds(client, options)
  const allowedDocumentIds = allowedSourceIds
    ? await filterDocumentIdsBySourceIds(
        client,
        Array.from(new Set(items.map((item) => item.document_id))),
        allowedSourceIds
      )
    : null

  const stats: CommandResult = {
    processed: allowedDocumentIds ? 0 : items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }

  for (const item of items) {
    if (allowedDocumentIds && !allowedDocumentIds.has(item.document_id)) {
      stats.skipped += 1
      continue
    }

    stats.processed += 1

    try {
      const recordId = await publishQueueItem(client, item)

      const { error: auditError } = await client.from('published_records').upsert(
        {
          moderation_item_id: item.id,
          record_type: item.queue_type,
          record_id: recordId,
          source_attribution: item.source_attribution,
          confidence: item.confidence,
          published_by: 'pipeline',
        },
        { onConflict: 'moderation_item_id' }
      )

      if (auditError) {
        throw new Error(`publish audit write failed: ${auditError.message}`)
      }

      const { error: statusError } = await client
        .from('moderation_queue')
        .update({ status: 'published' })
        .eq('id', item.id)

      if (statusError) {
        throw new Error(`queue status update failed: ${statusError.message}`)
      }

      await updateDocumentStateIfDone(client, item.document_id)

      stats.created += 1
    } catch (publishError) {
      stats.failed += 1
      console.log(`[publish] failed for queue item ${item.id}: ${(publishError as Error).message}`)
    }
  }

  const drillStats = await publishDrillsFromExerciseEvents(client, options)
  if (drillStats.processed > 0 || drillStats.created > 0 || drillStats.updated > 0) {
    console.log(
      `[publish-drills] processed=${drillStats.processed} created=${drillStats.created} updated=${drillStats.updated} skipped=${drillStats.skipped} failed=${drillStats.failed}`
    )
  }
  stats.processed += drillStats.processed
  stats.created += drillStats.created
  stats.updated += drillStats.updated
  stats.skipped += drillStats.skipped
  stats.failed += drillStats.failed

  return stats
}

function printStats(command: string, stats: CommandResult): void {
  console.log(`[${command}] processed=${stats.processed} created=${stats.created} updated=${stats.updated} skipped=${stats.skipped} failed=${stats.failed}`)
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/athlete-data-pipeline.ts <command> [options]\n
Commands:
  collect   Collect documents from active sources into source_documents
  extract   Multimodal extraction (video/audio/frame OCR) into extracted_signals
  queue     Build moderation proposals from extracted signals
  review    Auto-review pending proposals by confidence thresholds
  publish   Publish approved proposals into athletes/exercises/routines
  run       Run collect -> extract -> queue -> review -> publish in order

Options:
  --perSource <n>
  --sourceLimit <n>
  --onlyPlatforms <csv>
  --onlySourceTypes <csv>
  --onlySourceIds <csv>
  --extractLimit <n>
  --queueLimit <n>
  --reviewLimit <n>
  --publishLimit <n>
  --approveThreshold <0-1>
  --rejectThreshold <0-1>
  --videoOnly <true|false>
  --videoRelevanceThreshold <0-1>
  --webRelevanceThreshold <0-1>
  --webMaxTextChars <n>
  --frameIntervalSeconds <n>
  --maxFrames <n>
  --maxVideoSeconds <n>
  --videoWorkdir <path>
  --keepArtifacts <true|false>
  --ytDlpBin <bin>
  --ffmpegBin <bin>
  --transcriptionModel <model>
  --extractionModel <model>
  --visionModel <model>
  --publishDrillsFromEvents <true|false>
  --publishRoutinesFromEvents <true|false>
`)
}

async function run(): Promise<void> {
  loadLocalEnv()

  const command = process.argv[2]
  const argMap = parseCommandArgs(process.argv.slice(3))

  if (!command || command === '--help' || command === 'help') {
    printUsage()
    return
  }

  const options = buildOptions(argMap)
  const client = createSupabaseServiceClient()

  if (command === 'collect') {
    const stats = await collectCommand(client, options)
    printStats(command, stats)
    return
  }

  if (command === 'extract') {
    const stats = await extractCommand(client, options)
    printStats(command, stats)
    return
  }

  if (command === 'queue') {
    const stats = await queueCommand(client, options)
    printStats(command, stats)
    return
  }

  if (command === 'review') {
    const stats = await reviewCommand(client, options)
    printStats(command, stats)
    return
  }

  if (command === 'publish') {
    const stats = await publishCommand(client, options)
    printStats(command, stats)
    return
  }

  if (command === 'run') {
    const collectStats = await collectCommand(client, options)
    printStats('collect', collectStats)

    const extractStats = await extractCommand(client, options)
    printStats('extract', extractStats)

    const queueStats = await queueCommand(client, options)
    printStats('queue', queueStats)

    const reviewStats = await reviewCommand(client, options)
    printStats('review', reviewStats)

    const publishStats = await publishCommand(client, options)
    printStats('publish', publishStats)

    return
  }

  printUsage()
  throw new Error(`Unknown command: ${command}`)
}

run().catch((error) => {
  console.error(`[pipeline] fatal error: ${(error as Error).message}`)
  process.exit(1)
})
