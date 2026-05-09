// ============================================================================
// MatFlow — App Store Server Notifications (v2) handler
// ============================================================================
// Apple posts `{ "signedPayload": "<JWS>" }` server-to-server.  We:
//   1) verify the JWS x5c chain back to Apple Root CA - G3
//   2) verify the inner signedTransactionInfo JWS the same way
//   3) enforce bundleId match
//   4) idempotently record the notificationUUID
//   5) upsert app_store_transactions and update profiles entitlement
//
// User mapping uses the verified `appAccountToken` field that the iOS client
// sets at purchase time (see MatFlowIAPPlugin) — never client-supplied.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { verifyNotification, verifyTransaction } from './verify.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function trimEnv(value: string | undefined): string {
  return (value ?? '').trim()
}

function requireEnv(name: string): string {
  const value = trimEnv(Deno.env.get(name))
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function appleEpochMillisToIso(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  // Apple emits transaction timestamps as ms since epoch.
  return new Date(value).toISOString()
}

interface ProcessedTransactionResult {
  userId: string
  originalTransactionId: string
  productId: string
  transactionId: string | null
  environment: string | null
  status: string | null
  purchasedAt: string | null
  expiresAt: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({})) as { signedPayload?: string }
    const signedPayload = (body.signedPayload ?? '').trim()
    if (!signedPayload) {
      return jsonResponse({ ok: false, error: 'Missing signedPayload' }, 400)
    }

    const expectedBundleId = requireEnv('APPSTORE_BUNDLE_ID')
    const supabaseAdmin = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const notification = await verifyNotification(signedPayload)
    const notificationUUID = (notification.notificationUUID ?? '').trim()
    const data = notification.data ?? {}

    if (data.bundleId && data.bundleId !== expectedBundleId) {
      return jsonResponse({ ok: false, error: 'Bundle ID mismatch' }, 400)
    }

    if (notificationUUID) {
      const { data: existing } = await supabaseAdmin
        .from('processed_app_store_notifications')
        .select('id')
        .eq('notification_uuid', notificationUUID)
        .maybeSingle()

      if (existing?.id) {
        return jsonResponse({ ok: true, deduped: true }, 200)
      }

      await supabaseAdmin
        .from('processed_app_store_notifications')
        .insert({
          notification_uuid: notificationUUID,
          notification_type: notification.notificationType ?? null,
          subtype: notification.subtype ?? null,
        })
    }

    const signedTransactionInfo = (data.signedTransactionInfo ?? '').trim()
    if (!signedTransactionInfo) {
      return jsonResponse({ ok: true, ignored: 'no signedTransactionInfo' }, 200)
    }

    const transaction = await verifyTransaction(signedTransactionInfo)
    if (transaction.bundleId && transaction.bundleId !== expectedBundleId) {
      return jsonResponse({ ok: false, error: 'Transaction bundle ID mismatch' }, 400)
    }

    const userId = (transaction.appAccountToken ?? '').trim()
    const originalTransactionId = (transaction.originalTransactionId ?? '').trim()
    const productId = (transaction.productId ?? '').trim()

    if (!userId || !originalTransactionId || !productId) {
      return jsonResponse({ ok: false, error: 'Missing appAccountToken / originalTransactionId / productId' }, 400)
    }

    const result: ProcessedTransactionResult = {
      userId,
      originalTransactionId,
      productId,
      transactionId: (transaction.transactionId ?? '').trim() || null,
      environment: transaction.environment ?? data.environment ?? null,
      status: notification.notificationType ?? null,
      purchasedAt: appleEpochMillisToIso(transaction.purchaseDate),
      expiresAt: appleEpochMillisToIso(transaction.expiresDate),
    }

    await supabaseAdmin
      .from('app_store_transactions')
      .upsert(
        {
          user_id: result.userId,
          original_transaction_id: result.originalTransactionId,
          transaction_id: result.transactionId,
          product_id: result.productId,
          environment: result.environment,
          status: result.status,
          purchased_at: result.purchasedAt,
          expires_at: result.expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,original_transaction_id,product_id' },
      )

    const isPremium = result.expiresAt ? Date.parse(result.expiresAt) > Date.now() : true
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: isPremium,
        premium_source: 'apple_iap',
        premium_provider_id: result.originalTransactionId,
        premium_updated_at: new Date().toISOString(),
      })
      .eq('id', result.userId)

    if (profileError) throw new Error(profileError.message)

    return jsonResponse({ ok: true }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[appstore-notifications]', message)
    return jsonResponse({ ok: false, error: message }, 400)
  }
})

