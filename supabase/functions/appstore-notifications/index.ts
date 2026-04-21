// ============================================================================
// DAGestan Disciple - App Store Server Notifications (v2) handler
// ============================================================================
// This is intentionally minimal: it stores a transaction snapshot and updates
// profiles.is_premium + provenance fields so iOS IAP and Stripe share the same
// entitlement surface.
//
// NOTE: This endpoint requires APPSTORE_NOTIFICATION_BEARER_TOKEN and rejects
// unauthenticated requests. Full JWS chain verification should still be added.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type NotificationPayload = {
  notificationUUID?: string
  notificationType?: string
  subtype?: string | null
  data?: {
    appAppleId?: number
    bundleId?: string
    environment?: string
    signedTransactionInfo?: string
    signedRenewalInfo?: string
  }
  // Optional helper fields if you post decoded values from a client/worker.
  userId?: string
  originalTransactionId?: string
  transactionId?: string
  productId?: string
  status?: string
  purchasedAt?: string | null
  expiresAt?: string | null
}

function trimEnv(value: string | undefined): string {
  return (value ?? '').trim()
}

function requireEnv(name: string): string {
  const value = trimEnv(Deno.env.get(name))
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.trim().split(/\s+/, 2)
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token.trim() || null
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const expectedBearerToken = requireEnv('APPSTORE_NOTIFICATION_BEARER_TOKEN')
    const providedBearerToken = extractBearerToken(req.headers.get('authorization'))
    if (!providedBearerToken || providedBearerToken !== expectedBearerToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const body = (await req.json()) as NotificationPayload
    const notificationUUID = (body.notificationUUID ?? '').trim()

    if (notificationUUID) {
      const { data: existing } = await supabaseAdmin
        .from('processed_app_store_notifications')
        .select('id')
        .eq('notification_uuid', notificationUUID)
        .maybeSingle()

      if (existing?.id) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      await supabaseAdmin
        .from('processed_app_store_notifications')
        .insert({
          notification_uuid: notificationUUID,
          notification_type: body.notificationType ?? null,
          subtype: body.subtype ?? null,
        })
    }

    const userId = (body.userId ?? '').trim()
    const originalTransactionId = (body.originalTransactionId ?? '').trim()
    const productId = (body.productId ?? '').trim()

    if (!userId || !originalTransactionId || !productId) {
      // For a hardened implementation we'd decode signedTransactionInfo and map
      // it to user_id. MVP requires explicit mapping.
      throw new Error('Missing required fields: userId, originalTransactionId, productId')
    }

    const environment = (body.data?.environment ?? body.data?.environment ?? null) as string | null
    const status = (body.status ?? '').trim() || null
    const purchasedAt = toIsoOrNull(body.purchasedAt)
    const expiresAt = toIsoOrNull(body.expiresAt)

    await supabaseAdmin
      .from('app_store_transactions')
      .upsert(
        {
          user_id: userId,
          original_transaction_id: originalTransactionId,
          transaction_id: (body.transactionId ?? '').trim() || null,
          product_id: productId,
          environment,
          status,
          purchased_at: purchasedAt,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,original_transaction_id,product_id' },
      )

    const nowIso = new Date().toISOString()
    const isPremium = expiresAt ? Date.parse(expiresAt) > Date.now() : true

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: isPremium,
        premium_source: 'apple_iap',
        premium_provider_id: originalTransactionId,
        premium_updated_at: nowIso,
      })
      .eq('id', userId)

    if (profileError) {
      throw new Error(profileError.message)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

