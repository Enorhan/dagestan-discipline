// ============================================================================
// DAGESTAN DISCIPLINE - STRIPE CUSTOMER PORTAL EDGE FUNCTION
// Creates Stripe Customer Portal sessions for subscription management
// Users can cancel subscriptions, update payment methods, view invoices
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const APP_URL_SCHEME = 'dagestanidiscipline://'
const DEFAULT_REDIRECT_ORIGIN = 'https://enorhan.github.io'
const DEFAULT_FALLBACK_PORTAL_RETURN_URL = 'https://enorhan.github.io/dagestan-discipline/redirect.html?status=portal'

function trimEnv(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseCsvEnv(name: string): string[] {
  const raw = Deno.env.get(name)
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function withPortalStatus(rawUrl: string): string {
  const url = new URL(rawUrl)
  url.searchParams.set('status', 'portal')
  return url.toString()
}

function getFallbackPortalReturnUrl(): string {
  const appUrl = trimEnv(Deno.env.get('APP_URL'))
  if (appUrl) {
    return withPortalStatus(new URL('redirect.html', appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString())
  }

  return DEFAULT_FALLBACK_PORTAL_RETURN_URL
}

function validatePortalReturnUrl(rawUrl: string | undefined): string {
  const candidateUrl = trimEnv(rawUrl) ?? getFallbackPortalReturnUrl()

  if (candidateUrl.startsWith(APP_URL_SCHEME)) {
    return candidateUrl
  }

  let parsed: URL
  try {
    parsed = new URL(candidateUrl)
  } catch {
    throw new Error('Return URL is invalid')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Return URL must use http or https')
  }

  const allowedOrigins = new Set<string>([DEFAULT_REDIRECT_ORIGIN])
  const appUrl = trimEnv(Deno.env.get('APP_URL'))
  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin)
    } catch {
      // Ignore malformed APP_URL values.
    }
  }
  for (const origin of parseCsvEnv('CHECKOUT_ALLOWED_ORIGINS')) {
    try {
      allowedOrigins.add(new URL(origin).origin)
    } catch {
      // Ignore malformed allowlist entries.
    }
  }

  if (!allowedOrigins.has(parsed.origin)) {
    throw new Error('Return URL origin is not allowed')
  }

  return parsed.toString()
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Server configuration error')
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Portal request from user:', user.id)

    // Get user's stripe_customer_id from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error('No subscription found. Please subscribe first.')
    }

    // Parse request body for return URL
    const body = await req.json().catch(() => ({})) as { returnUrl?: string }
    const returnUrl = validatePortalReturnUrl(body.returnUrl)

    // Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log('Portal session created:', portalSession.id)

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Portal error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create portal session' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

