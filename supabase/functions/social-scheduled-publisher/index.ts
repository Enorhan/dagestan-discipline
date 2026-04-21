import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) ?? '').trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function asJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function secureCompare(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let out = 0
  for (let i = 0; i < left.length; i += 1) out |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return out === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return asJson({ error: 'Method not allowed' }, 405)

  try {
    const token = requireEnv('SOCIAL_SCHEDULER_TOKEN')
    const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!provided || !secureCompare(provided, token)) {
      return asJson({ error: 'Unauthorized' }, 401)
    }

    const supabaseAdmin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
    const now = new Date().toISOString()

    const { data: duePosts, error: loadError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id, scheduled_for')
      .eq('is_published', false)
      .lte('scheduled_for', now)
      .limit(250)
    if (loadError) throw new Error(loadError.message)

    let published = 0
    for (const post of duePosts ?? []) {
      const { data: updatedPost, error: publishError } = await supabaseAdmin
        .from('posts')
        .update({
          is_published: true,
          published_at: now,
          updated_at: now,
        })
        .eq('id', post.id)
        .eq('is_published', false)
        .select('id, user_id')
        .maybeSingle()
      if (publishError) throw new Error(publishError.message)
      if (!updatedPost?.id) {
        // Already published by another worker instance.
        continue
      }

      const { data: existingNotification, error: existingNotificationError } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', updatedPost.user_id)
        .eq('kind', 'social_scheduled_post_published')
        .contains('metadata', { postId: updatedPost.id })
        .maybeSingle()
      if (existingNotificationError) throw new Error(existingNotificationError.message)

      if (!existingNotification?.id) {
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: updatedPost.user_id,
            kind: 'social_scheduled_post_published',
            title: 'Scheduled post published',
            body: 'Your scheduled post is now live.',
            metadata: { postId: updatedPost.id },
          })
        if (notificationError) throw new Error(notificationError.message)
      }

      const { error: draftUpdateError } = await supabaseAdmin
        .from('creator_drafts')
        .update({
          published_post_id: updatedPost.id,
          upload_status: 'ready',
          updated_at: now,
        })
        .eq('published_post_id', updatedPost.id)
      if (draftUpdateError) throw new Error(draftUpdateError.message)

      published += 1
    }

    return asJson({ ok: true, published })
  } catch (error) {
    return asJson({ error: error instanceof Error ? error.message : String(error) }, 400)
  }
})
