import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type UploadIntentRequest = {
  fileName?: string
  contentType?: string
  clientUploadKey?: string
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

function sanitizeUploadKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().slice(0, 96)
  return normalized.length > 0 ? normalized : null
}

async function createMuxUploadIntent(body: UploadIntentRequest): Promise<{ provider: 'mux'; assetId: string; uploadUrl: string }> {
  const token = btoa(`${requireEnv('MUX_TOKEN_ID')}:${requireEnv('MUX_TOKEN_SECRET')}`)
  const response = await fetch('https://api.mux.com/video/v1/uploads', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: JSON.stringify({
          fileName: body.fileName ?? null,
          contentType: body.contentType ?? null,
          source: 'dagestani-disciple',
        }),
      },
      cors_origin: '*',
      test: false,
    }),
  })

  const payload = await response.json()
  if (!response.ok || !payload?.data?.id || !payload?.data?.url) {
    throw new Error(payload?.error?.message ?? `Mux upload intent failed (${response.status})`)
  }

  return {
    provider: 'mux',
    assetId: payload.data.id,
    uploadUrl: payload.data.url,
  }
}

async function createCloudflareIntent(body: UploadIntentRequest): Promise<{ provider: 'cloudflare_stream'; assetId: string; uploadUrl: string }> {
  const accountId = requireEnv('CLOUDFLARE_STREAM_ACCOUNT_ID')
  const apiToken = requireEnv('CLOUDFLARE_STREAM_API_TOKEN')
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxDurationSeconds: 180,
      expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      meta: {
        fileName: body.fileName ?? '',
        contentType: body.contentType ?? '',
      },
    }),
  })

  const payload = await response.json()
  const result = payload?.result
  if (!response.ok || !result?.uid || !result?.uploadURL) {
    throw new Error(payload?.errors?.[0]?.message ?? `Cloudflare direct upload failed (${response.status})`)
  }

  return {
    provider: 'cloudflare_stream',
    assetId: result.uid,
    uploadUrl: result.uploadURL,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return asJson({ error: 'Method not allowed' }, 405)

  try {
    const authorization = req.headers.get('authorization') ?? ''
    const supabaseAuth = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    })
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !authData.user) {
      return asJson({ error: 'Unauthorized' }, 401)
    }

    const body = (await req.json()) as UploadIntentRequest
    const userId = authData.user.id
    const clientUploadKey = sanitizeUploadKey(body.clientUploadKey)

    const supabaseAdmin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
    if (clientUploadKey) {
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('social_video_uploads')
        .select('provider, asset_id, upload_url, status')
        .eq('user_id', userId)
        .eq('client_upload_key', clientUploadKey)
        .maybeSingle()
      if (existingError) throw new Error(existingError.message)

      if (existingRow?.asset_id && existingRow.upload_url) {
        return asJson({
          provider: existingRow.provider,
          assetId: existingRow.asset_id,
          uploadUrl: existingRow.upload_url,
          reused: true,
        })
      }
    }

    const provider = ((Deno.env.get('SOCIAL_VIDEO_PROVIDER') ?? 'mux').trim().toLowerCase())
    const intent = provider === 'cloudflare_stream'
      ? await createCloudflareIntent(body)
      : await createMuxUploadIntent(body)

    const { error: insertError } = await supabaseAdmin
      .from('social_video_uploads')
      .insert({
        user_id: userId,
        provider: intent.provider,
        asset_id: intent.assetId,
        upload_url: intent.uploadUrl,
        client_upload_key: clientUploadKey,
        status: 'pending',
      })

    if (insertError) {
      if (clientUploadKey && /duplicate key/i.test(insertError.message)) {
        const { data: existingRow, error: existingError } = await supabaseAdmin
          .from('social_video_uploads')
          .select('provider, asset_id, upload_url')
          .eq('user_id', userId)
          .eq('client_upload_key', clientUploadKey)
          .maybeSingle()
        if (existingError) throw new Error(existingError.message)
        if (existingRow?.asset_id && existingRow.upload_url) {
          return asJson({
            provider: existingRow.provider,
            assetId: existingRow.asset_id,
            uploadUrl: existingRow.upload_url,
            reused: true,
          })
        }
      }
      throw new Error(insertError.message)
    }

    return asJson(intent)
  } catch (error) {
    return asJson({ error: error instanceof Error ? error.message : String(error) }, 400)
  }
})
