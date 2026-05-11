// ============================================================================
// DAGESTAN DISCIPLINE - ACCOUNT DELETION EDGE FUNCTION
// App Store Guideline 5.1.1(v) compliant in-app account deletion.
//
// Contract:
//   - POST with `Authorization: Bearer <user JWT>` and JSON body `{ confirm: "DELETE" }`.
//   - Verifies the JWT, requires the literal confirmation token, then:
//       1. Snapshots the user's display name onto owned systems and techniques so
//          attribution survives the FK ON DELETE SET NULL transition.
//       2. Deletes storage objects under `<uid>/` in session-media, technique-media,
//          and profile-images.
//       3. Deletes the auth user via auth.admin.deleteUser. Personal data cascades;
//          created systems are preserved by the systems.user_id ON DELETE SET NULL FK.
//   - Idempotent: storage + auth deletes tolerate "not found".
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKETS = ['session-media', 'technique-media', 'profile-images'] as const

interface DeleteAccountResponse {
  success: boolean
  error?: string
}

async function purgeBucketForUser(
  client: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<void> {
  // storage.list is paginated; keep looping until the folder is empty.
  for (let i = 0; i < 20; i++) {
    const { data: entries, error } = await client.storage.from(bucket).list(userId, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      // "not found" or "bucket not found" is acceptable on idempotent delete.
      console.warn(`[delete-account] list failed for ${bucket}/${userId}:`, error.message)
      return
    }
    if (!entries || entries.length === 0) {
      return
    }
    const paths = entries.map((entry) => `${userId}/${entry.name}`)
    const { error: removeError } = await client.storage.from(bucket).remove(paths)
    if (removeError) {
      console.warn(`[delete-account] remove failed for ${bucket}/${userId}:`, removeError.message)
      return
    }
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
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    let body: { confirm?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      throw new Error('Invalid request body')
    }

    if (body.confirm !== 'DELETE') {
      throw new Error('Confirmation token missing')
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()

    const displayName = (profile?.display_name as string | undefined)?.trim() || null
    if (displayName) {
      const { error: snapSystemsError } = await supabaseAdmin
        .from('systems')
        .update({ creator_display_name_snapshot: displayName })
        .eq('user_id', user.id)
        .is('creator_display_name_snapshot', null)
      if (snapSystemsError) {
        console.warn('[delete-account] systems snapshot failed:', snapSystemsError.message)
      }

      const { error: snapTechniquesError } = await supabaseAdmin
        .from('techniques')
        .update({ creator_display_name_snapshot: displayName })
        .eq('created_by', user.id)
        .is('creator_display_name_snapshot', null)
      if (snapTechniquesError) {
        console.warn('[delete-account] techniques snapshot failed:', snapTechniquesError.message)
      }
    }

    for (const bucket of BUCKETS) {
      await purgeBucketForUser(supabaseAdmin, bucket, user.id)
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('[delete-account] auth delete failed:', deleteError)
      throw new Error('Failed to delete account')
    }

    const response: DeleteAccountResponse = { success: true }
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
