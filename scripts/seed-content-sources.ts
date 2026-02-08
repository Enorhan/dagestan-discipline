#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'

type SourceType = 'youtube_search' | 'rss_feed' | 'reddit_search' | 'web_url' | 'social_feed'

interface ContentSourceSeed {
  name: string
  source_type: SourceType
  platform: string
  query: string | null
  url: string | null
  metadata: Record<string, unknown>
  is_active: boolean
}

const DEFAULT_SOURCES: ContentSourceSeed[] = [
  {
    name: 'YouTube Wrestling S&C',
    source_type: 'youtube_search',
    platform: 'youtube',
    query: 'wrestling strength and conditioning workout routine',
    url: null,
    // Prefer newest videos so subsequent runs discover fresh content instead of reprocessing the same results.
    metadata: { sport: 'wrestling', lang: 'en', order: 'date', allow_video_ingest: true },
    is_active: true,
  },
  {
    name: 'YouTube Judo S&C',
    source_type: 'youtube_search',
    platform: 'youtube',
    query: 'judo strength and conditioning workout routine',
    url: null,
    metadata: { sport: 'judo', lang: 'en', order: 'date', allow_video_ingest: true },
    is_active: true,
  },
  {
    name: 'YouTube BJJ S&C',
    source_type: 'youtube_search',
    platform: 'youtube',
    query: 'bjj strength and conditioning workout routine',
    url: null,
    metadata: { sport: 'bjj', lang: 'en', order: 'date', allow_video_ingest: true },
    is_active: true,
  },
  {
    name: 'Reddit Wrestling Training',
    source_type: 'reddit_search',
    platform: 'reddit',
    query: 'wrestling training routine exercises',
    url: null,
    metadata: { sport: 'wrestling', lang: 'en', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'Reddit Judo Training',
    source_type: 'reddit_search',
    platform: 'reddit',
    query: 'judo training routine exercises',
    url: null,
    metadata: { sport: 'judo', lang: 'en', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'Reddit BJJ Training',
    source_type: 'reddit_search',
    platform: 'reddit',
    query: 'bjj training routine exercises',
    url: null,
    metadata: { sport: 'bjj', lang: 'en', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'IJF Athlete Directory',
    source_type: 'web_url',
    platform: 'web',
    query: null,
    url: 'https://www.ijf.org/judoka',
    metadata: { sport: 'judo', kind: 'athlete-index', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'Web Search Wrestling S&C',
    source_type: 'social_feed',
    platform: 'web',
    query: 'wrestling strength and conditioning workout routine exercises sets reps',
    url: null,
    metadata: { sport: 'wrestling', lang: 'en', kind: 'web_search', provider: 'brave_search', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'Web Search Judo S&C',
    source_type: 'social_feed',
    platform: 'web',
    query: 'judo strength and conditioning workout routine exercises sets reps',
    url: null,
    metadata: { sport: 'judo', lang: 'en', kind: 'web_search', provider: 'brave_search', allow_video_ingest: false },
    is_active: true,
  },
  {
    name: 'Web Search BJJ S&C',
    source_type: 'social_feed',
    platform: 'web',
    query: 'bjj strength and conditioning workout routine exercises sets reps',
    url: null,
    metadata: { sport: 'bjj', lang: 'en', kind: 'web_search', provider: 'brave_search', allow_video_ingest: false },
    is_active: true,
  },
]

function loadLocalEnv(): void {
  const envFiles = ['.env.local', '.env']

  for (const envFile of envFiles) {
    const filePath = resolve(process.cwd(), envFile)
    if (!existsSync(filePath)) {
      continue
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separator = trimmed.indexOf('=')
      if (separator <= 0) {
        continue
      }

      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')

      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

async function run(): Promise<void> {
  loadLocalEnv()

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('content_sources').upsert(DEFAULT_SOURCES, {
    onConflict: 'name',
  })

  if (error) {
    throw new Error(`Failed to seed content_sources: ${error.message}`)
  }

  console.log(`Seeded ${DEFAULT_SOURCES.length} content sources.`)
}

run().catch((error) => {
  console.error(`[seed-content-sources] ${(error as Error).message}`)
  process.exit(1)
})
