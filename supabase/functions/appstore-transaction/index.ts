// ============================================================================
// MatFlow — verified App Store transaction bridge
// ============================================================================
// The iOS app sends StoreKit's signed transaction JWS after purchase/restore.
// We verify Apple's signature chain, enforce bundle/product/user binding, then
// write entitlement state with the service role. The client never gets to decide
// whether a transaction unlocks premium access.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { verifyTransaction } from '../appstore-notifications/verify.ts'

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
  return new Date(value).toISOString()
}

function allowedProductIds(): Set<string> {
  const configured = trimEnv(Deno.env.get('APPSTORE_ALLOWED_PRODUCT_IDS'))
    || trimEnv(Deno.env.get('APPSTORE_IAP_PRODUCT_IDS'))
    || trimEnv(Deno.env.get('APPSTORE_MONTHLY_PRODUCT_ID'))
    || 'matflow.monthly'

  return new Set(
    configured
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
}

function normalizeUuid(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) {
      return jsonResponse({ ok: false, error: 'Missing authorization header' }, 401)
    }

    const supabaseAdmin = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({})) as { signedTransactionInfo?: string }
    const signedTransactionInfo = (body.signedTransactionInfo ?? '').trim()
    if (!signedTransactionInfo) {
      return jsonResponse({ ok: false, error: 'Missing signedTransactionInfo' }, 400)
    }

    const expectedBundleId = requireEnv('APPSTORE_BUNDLE_ID')
    const transaction = await verifyTransaction(signedTransactionInfo)
    if (transaction.bundleId !== expectedBundleId) {
      return jsonResponse({ ok: false, error: 'Transaction bundle ID mismatch' }, 400)
    }

    const productId = (transaction.productId ?? '').trim()
    if (!allowedProductIds().has(productId)) {
      return jsonResponse({ ok: false, error: 'Unsupported App Store product' }, 400)
    }

    const appAccountToken = normalizeUuid(transaction.appAccountToken)
    if (!appAccountToken || appAccountToken !== normalizeUuid(user.id)) {
      return jsonResponse({ ok: false, error: 'App Store transaction is not linked to this account' }, 403)
    }

    const originalTransactionId = (transaction.originalTransactionId ?? '').trim()
    const transactionId = (transaction.transactionId ?? '').trim()
    if (!originalTransactionId || !transactionId) {
      return jsonResponse({ ok: false, error: 'Missing App Store transaction identifiers' }, 400)
    }

    const purchasedAt = appleEpochMillisToIso(transaction.purchaseDate)
    const expiresAt = appleEpochMillisToIso(transaction.expiresDate)
    const revokedAt = appleEpochMillisToIso(transaction.revocationDate)
    const expiresAtMs = expiresAt ? Date.parse(expiresAt) : null
    const isActive = !revokedAt && expiresAtMs != null && expiresAtMs > Date.now()
    const status = revokedAt ? 'revoked' : isActive ? 'active' : 'expired'

    const { error: transactionError } = await supabaseAdmin
      .from('app_store_transactions')
      .upsert(
        {
          user_id: user.id,
          original_transaction_id: originalTransactionId,
          transaction_id: transactionId,
          product_id: productId,
          environment: transaction.environment ?? null,
          status,
          purchased_at: purchasedAt,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,original_transaction_id,product_id' },
      )
    if (transactionError) throw new Error(transactionError.message)

    const { data: currentProfile, error: profileReadError } = await supabaseAdmin
      .from('profiles')
      .select('premium_source, premium_provider_id')
      .eq('id', user.id)
      .maybeSingle()
    if (profileReadError) throw new Error(profileReadError.message)

    const currentSource = String(currentProfile?.premium_source ?? '')
    const currentProviderId = String(currentProfile?.premium_provider_id ?? '')
    const canUpdateProfile =
      isActive
      || !currentSource
      || currentSource === 'apple_iap'
      || currentProviderId === originalTransactionId

    if (canUpdateProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: isActive,
          premium_source: 'apple_iap',
          premium_provider_id: originalTransactionId,
          premium_updated_at: new Date().toISOString(),
          subscription_status: isActive ? 'active' : status,
          subscription_period_end: expiresAt,
        })
        .eq('id', user.id)
      if (profileError) throw new Error(profileError.message)
    }

    return jsonResponse({ ok: true, status, active: isActive }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[appstore-transaction]', message)
    return jsonResponse({ ok: false, error: message }, 400)
  }
})
