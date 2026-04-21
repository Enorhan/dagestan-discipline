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

type WebhookPayload = {
  provider?: 'mux' | 'cloudflare_stream'
  assetId?: string
  playbackId?: string
  playbackUrl?: string
  thumbnailUrl?: string
  status?: 'pending' | 'processing' | 'ready' | 'failed'
  durationMs?: number
  aspectRatio?: number
  failedReason?: string
}

function normalizeStatus(status: WebhookPayload['status']): 'pending' | 'processing' | 'ready' | 'failed' {
  if (status === 'pending' || status === 'processing' || status === 'ready' || status === 'failed') return status
  return 'ready'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return asJson({ error: 'Method not allowed' }, 405)

  try {
    const expectedToken = requireEnv('SOCIAL_VIDEO_WEBHOOK_TOKEN')
    const provided = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (!provided || !secureCompare(provided, expectedToken)) {
      return asJson({ error: 'Unauthorized' }, 401)
    }

    const payload = (await req.json()) as WebhookPayload
    const assetId = (payload.assetId ?? '').trim()
    if (!assetId) return asJson({ error: 'assetId is required' }, 400)

    const supabaseAdmin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
    const status = normalizeStatus(payload.status)

    const { data: uploadRow, error: uploadError } = await supabaseAdmin
      .from('social_video_uploads')
      .update({
        provider: payload.provider ?? undefined,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('asset_id', assetId)
      .select('*')
      .maybeSingle()
    if (uploadError) throw new Error(uploadError.message)
    if (!uploadRow?.id) return asJson({ ok: true, ignored: true })

    const { data: mediaRows, error: mediaLoadError } = await supabaseAdmin
      .from('post_media')
      .select('id, post_id, playback_id, playback_url, hls_url, poster_url, duration_ms, aspect_ratio, provider, ready_at')
      .eq('video_asset_id', assetId)
    if (mediaLoadError) throw new Error(mediaLoadError.message)

    for (const media of mediaRows ?? []) {
      const resolvedPlaybackUrl = payload.playbackUrl ?? media.playback_url ?? media.hls_url ?? null
      const { error: mediaUpdateError } = await supabaseAdmin
        .from('post_media')
        .update({
          provider: payload.provider ?? media.provider ?? uploadRow.provider ?? null,
          playback_id: payload.playbackId ?? media.playback_id ?? null,
          playback_url: resolvedPlaybackUrl,
          hls_url: resolvedPlaybackUrl,
          poster_url: payload.thumbnailUrl ?? media.poster_url ?? null,
          media_processing_status: status,
          duration_ms: payload.durationMs ?? media.duration_ms ?? null,
          aspect_ratio: payload.aspectRatio ?? media.aspect_ratio ?? null,
          failed_reason: payload.failedReason ?? null,
          ready_at: status === 'ready' ? new Date().toISOString() : media.ready_at ?? null,
        })
        .eq('id', media.id)
      if (mediaUpdateError) throw new Error(mediaUpdateError.message)
    }

    return asJson({ ok: true })
  } catch (error) {
    return asJson({ error: error instanceof Error ? error.message : String(error) }, 400)
  }
})
