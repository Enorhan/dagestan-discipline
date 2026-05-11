// MatFlow — Whisper audio transcription.
// Accepts base64-encoded audio from authenticated users, enforces a per-user
// daily quota via claim_ai_quota(), caps payload size, and proxies to OpenAI
// Whisper API. Returns the transcribed text.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_FORMATS = new Set(['m4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'wav', 'webm', 'ogg', 'flac'])
const MAX_AUDIO_BYTES = 12 * 1024 * 1024 // 12 MB raw decoded payload

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) ?? '').trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function decodeBase64(value: string): Uint8Array {
  const cleaned = value.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) return jsonResponse({ ok: false, error: 'Missing authorization header' }, 401)

    const supabaseAdmin = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({})) as {
      audioBase64?: unknown
      format?: unknown
      language?: unknown
      prompt?: unknown
    }
    if (typeof body.audioBase64 !== 'string' || body.audioBase64.trim().length === 0) {
      return jsonResponse({ ok: false, error: 'audioBase64 is required' }, 400)
    }
    const rawFormat = typeof body.format === 'string' ? body.format.toLowerCase().trim() : 'm4a'
    const format = ALLOWED_FORMATS.has(rawFormat) ? rawFormat : 'm4a'
    const language = typeof body.language === 'string' && body.language.trim().length === 2
      ? body.language.trim().toLowerCase()
      : 'en'
    const promptHint = typeof body.prompt === 'string' ? body.prompt.slice(0, 240) : ''

    let audioBytes: Uint8Array
    try {
      audioBytes = decodeBase64(body.audioBase64)
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid audio encoding' }, 400)
    }
    if (audioBytes.length === 0) return jsonResponse({ ok: false, error: 'Empty audio payload' }, 400)
    if (audioBytes.length > MAX_AUDIO_BYTES) {
      return jsonResponse({ ok: false, error: 'Audio payload too large' }, 413)
    }

    const dailyQuota = Number.parseInt(Deno.env.get('WHISPER_DAILY_QUOTA') ?? '30', 10)
    const safeQuota = Number.isFinite(dailyQuota) && dailyQuota >= 0 ? dailyQuota : 30
    const { data: quotaRows, error: quotaError } = await supabaseAdmin.rpc('claim_ai_quota', {
      p_user_id: user.id,
      p_feature: 'whisper_transcribe',
      p_quota: safeQuota,
    })
    if (quotaError) {
      console.error('[whisper-transcribe] quota error:', quotaError.message)
      return jsonResponse({ ok: false, error: 'Quota check failed' }, 500)
    }
    const quotaRow = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows
    if (quotaRow && quotaRow.allowed === false) {
      return jsonResponse({ ok: false, error: 'Daily transcription limit reached. Try again tomorrow.' }, 429)
    }

    const openAiKey = requireEnv('OPENAI_API_KEY')
    const formData = new FormData()
    const audioBlob = new Blob([audioBytes], { type: `audio/${format === 'm4a' ? 'mp4' : format}` })
    formData.append('file', audioBlob, `audio.${format}`)
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'text')
    if (promptHint) formData.append('prompt', promptHint)

    const openAiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: formData,
    })

    if (!openAiResponse.ok) {
      const message = await openAiResponse.text().catch(() => '')
      console.error('[whisper-transcribe] OpenAI error:', openAiResponse.status, message.slice(0, 500))
      return jsonResponse({ ok: false, error: 'Transcription failed' }, 502)
    }

    const text = (await openAiResponse.text()).trim()
    return jsonResponse({ ok: true, text }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.startsWith('Missing ') ? 500 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})

