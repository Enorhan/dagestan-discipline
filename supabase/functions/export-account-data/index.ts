// ============================================================================
// MATFLOW - ACCOUNT DATA EXPORT EDGE FUNCTION
// GDPR Article 20 / CCPA portability compliant in-app data export.
//
// Contract:
//   - POST with `Authorization: Bearer <user JWT>` and JSON body `{ confirm: "EXPORT" }`.
//   - Verifies the JWT, then aggregates all user-owned rows from the well-known
//     BJJ + social tables and returns a single JSON archive in the response.
//   - The response includes a generatedAt timestamp and a schemaVersion to allow
//     future migrations of the export shape.
//   - Idempotent: read-only.
// ============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SCHEMA_VERSION = 1

// User-owned tables keyed by `user_id` (single column).
const USER_ID_TABLES = [
  'training_sessions',
  'user_techniques',
  'technique_tags',
  'technique_links',
  'user_system_access',
  'notifications',
  'challenge_progress',
  'achievement_progress',
  'posts',
  'likes',
  'saves',
  'comments',
  'feed_events',
  'feature_usage_counters',
  'user_learning_progress',
  'training_programs',
  'training_program_state',
  'exercise_favorites',
  'exercise_completions',
  'exercise_events',
  'app_store_transactions',
] as const

interface ExportArchive {
  schemaVersion: number
  generatedAt: string
  userId: string
  email: string | null
  profile: unknown
  tables: Record<string, unknown[]>
  follows: { following: unknown[]; followers: unknown[] }
}

async function safeSelectByUserId(
  client: SupabaseClient,
  table: string,
  userId: string,
): Promise<unknown[]> {
  try {
    const { data, error } = await client.from(table).select('*').eq('user_id', userId)
    if (error) {
      console.warn(`[export] ${table} read failed:`, error.message)
      return []
    }
    return data ?? []
  } catch (cause) {
    console.warn(`[export] ${table} threw:`, cause)
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    let body: { confirm?: unknown } = {}
    try { body = await req.json() } catch { throw new Error('Invalid request body') }
    if (body.confirm !== 'EXPORT') throw new Error('Confirmation token missing')

    const userId = user.id

    const profileResult = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const tables: Record<string, unknown[]> = {}
    for (const table of USER_ID_TABLES) {
      tables[table] = await safeSelectByUserId(supabaseAdmin, table, userId)
    }

    const [followingResult, followersResult] = await Promise.all([
      supabaseAdmin.from('follows').select('*').eq('follower_user_id', userId),
      supabaseAdmin.from('follows').select('*').eq('following_user_id', userId),
    ])

    const archive: ExportArchive = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      userId,
      email: user.email ?? null,
      profile: profileResult.data ?? null,
      tables,
      follows: {
        following: followingResult.data ?? [],
        followers: followersResult.data ?? [],
      },
    }

    const filename = `matflow-export-${userId}-${archive.generatedAt}.json`
    return new Response(JSON.stringify(archive, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : 400
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})

