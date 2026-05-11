// MatFlow — text-to-system AI generator.
// Converts a plain-language grappling sequence into a compact graph payload.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Branch = 'bjj' | 'grappling'

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

function normalizeBranch(value: unknown): Branch {
  return value === 'grappling' ? 'grappling' : 'bjj'
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text
  const chunks: string[] = []
  for (const item of response?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') chunks.push(content.text)
    }
  }
  return chunks.join('').trim()
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['system'],
  properties: {
    system: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary', 'nodes', 'edges'],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        nodes: {
          type: 'array',
          maxItems: 24,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'label', 'details', 'trigger', 'commonMistake', 'videoUrl', 'videoTimestampSeconds'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              details: { type: 'string' },
              trigger: { type: 'string' },
              commonMistake: { type: 'string' },
              videoUrl: { type: 'string' },
              videoTimestampSeconds: { type: 'integer' },
            },
          },
        },
        edges: {
          type: 'array',
          maxItems: 48,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'to', 'label'],
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              label: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const

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

    const body = await req.json().catch(() => ({})) as { text?: unknown; branch?: unknown; initial?: unknown }
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : ''
    const branch = normalizeBranch(body.branch)
    if (text.length < 3) return jsonResponse({ ok: false, error: 'Text is required' }, 400)

    const dailyQuota = Number.parseInt(Deno.env.get('SYSTEM_TEXT_DAILY_QUOTA') ?? '30', 10)
    const safeQuota = Number.isFinite(dailyQuota) && dailyQuota >= 0 ? dailyQuota : 30
    const { data: quotaRows, error: quotaError } = await supabaseAdmin.rpc('claim_ai_quota', {
      p_user_id: user.id,
      p_feature: 'system_text_generator',
      p_quota: safeQuota,
    })
    if (quotaError) {
      console.error('[system-text-generator] quota error:', quotaError.message)
      return jsonResponse({ ok: false, error: 'Quota check failed' }, 500)
    }
    const quotaRow = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows
    if (quotaRow && quotaRow.allowed === false) {
      return jsonResponse({ ok: false, error: 'Daily AI generation limit reached. Try again tomorrow.' }, 429)
    }

    const openAiKey = requireEnv('OPENAI_API_KEY')
    const model = (Deno.env.get('OPENAI_SYSTEM_MODEL') ?? 'gpt-4o-mini').trim()
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [
              'You convert Brazilian jiu-jitsu and grappling notes into a connected training system graph.',
              'Return concise node labels. Preserve submission names and accepted spellings such as D’Arce, armbar, foot lock, sweep, escape.',
              'Use stable node ids like n1, n2. Edge endpoints must reference node ids. Empty optional text fields should be empty strings.',
              'Do not add striking or unrelated martial arts content.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({ branch, text, initial: body.initial ?? null }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'matflow_system_graph',
            strict: true,
            schema: responseSchema,
          },
        },
        max_output_tokens: 1800,
      }),
    })

    if (!openAiResponse.ok) {
      const message = await openAiResponse.text().catch(() => '')
      console.error('[system-text-generator] OpenAI error:', openAiResponse.status, message.slice(0, 500))
      return jsonResponse({ ok: false, error: 'AI generation failed' }, 502)
    }

    const aiJson = await openAiResponse.json()
    const outputText = extractOutputText(aiJson)
    if (!outputText) return jsonResponse({ ok: false, error: 'AI generation returned no content' }, 502)

    const parsed = JSON.parse(outputText)
    return jsonResponse({ ok: true, ...parsed }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message.startsWith('Missing ') ? 500 : 400
    return jsonResponse({ ok: false, error: message }, status)
  }
})
