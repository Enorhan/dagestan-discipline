// ============================================================================
// DAGESTAN DISCIPLINE - STRIPE CHECKOUT EDGE FUNCTION
// Creates Stripe Checkout sessions for the monthly Premium subscription.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Premium subscription price: 25 SEK/month (in öre)
const PREMIUM_PRICE_SEK = 2500
const APP_URL_SCHEME = 'dagestanidiscipline://'
const DEFAULT_REDIRECT_ORIGIN = 'https://enorhan.github.io'

function parseCsvEnv(name: string): string[] {
  const raw = Deno.env.get(name)
  if (!raw) return []
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function getAllowedSubscriptionPriceIds(): Set<string> {
  const ids = new Set<string>()

  const primaryPriceId = Deno.env.get('STRIPE_PREMIUM_PRICE_ID')
  if (primaryPriceId) ids.add(primaryPriceId)

  for (const id of parseCsvEnv('STRIPE_ALLOWED_SUBSCRIPTION_PRICE_IDS')) {
    ids.add(id)
  }

  return ids
}

function validateCheckoutRedirectUrl(rawUrl: string | undefined, label: string): string {
  if (!rawUrl) throw new Error(`${label} URL is required`)

  if (rawUrl.startsWith(APP_URL_SCHEME)) {
    return rawUrl
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error(`${label} URL is invalid`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${label} URL must use http or https`)
  }

  const allowedOrigins = new Set<string>([DEFAULT_REDIRECT_ORIGIN])
  const appUrl = Deno.env.get('APP_URL')
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
    throw new Error(`${label} URL origin is not allowed`)
  }

  return parsed.toString()
}

async function hasOpenSubscription(supabaseAdmin: any, userId: string): Promise<boolean> {
  const openStatuses = ['active', 'trialing', 'canceling', 'past_due', 'unpaid']

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_premium, subscription_status')
    .eq('id', userId)
    .maybeSingle()

  const profileIsPremium = (profile as any)?.is_premium === true
  const profileSubscriptionStatus = String((profile as any)?.subscription_status ?? '')
  if (profileIsPremium || openStatuses.includes(profileSubscriptionStatus)) {
    return true
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('status', openStatuses)
    .maybeSingle()

  return !!subscription
}

interface CheckoutRequest {
  mode: string
  priceId?: string
  successUrl: string
  cancelUrl: string
  email?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not found in environment')
      throw new Error('Stripe is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No Authorization header found')
      throw new Error('Missing authorization header')
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase environment variables not found')
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

    if (authError) {
      console.error('Auth error:', authError.message)
      throw new Error('Unauthorized: ' + authError.message)
    }

    if (!user) {
      console.error('No user found for token')
      throw new Error('Unauthorized')
    }

    console.log('User authenticated:', user.id, user.email)

    // Parse request body
    const body: CheckoutRequest = await req.json()
    const { mode, priceId, successUrl, cancelUrl, email } = body

    if (!mode || !successUrl || !cancelUrl) {
      throw new Error('Missing required fields: mode, successUrl, cancelUrl')
    }

    const validatedSuccessUrl = validateCheckoutRedirectUrl(successUrl, 'Success')
    const validatedCancelUrl = validateCheckoutRedirectUrl(cancelUrl, 'Cancel')
    const customerEmail = email ?? user.email ?? undefined
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (mode !== 'subscription') {
      throw new Error('Premium is only available as a 25 SEK/month subscription')
    }

    const alreadySubscribed = await hasOpenSubscription(supabaseAdmin, user.id)
    if (alreadySubscribed) {
      throw new Error('You already have an active subscription. Use Manage Subscription to update billing.')
    }

    const allowedPriceIds = getAllowedSubscriptionPriceIds()
    const selectedPriceId = priceId
      ? (allowedPriceIds.has(priceId) ? priceId : null)
      : (allowedPriceIds.size > 0 ? [...allowedPriceIds][0] : null)

    if (priceId && !selectedPriceId) {
      throw new Error('Invalid subscription price ID')
    }

    sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: selectedPriceId
        ? [{ price: selectedPriceId, quantity: 1 }]
        : [{
            price_data: {
              currency: 'sek',
              product_data: {
                name: 'Dagestan Discipline Premium',
                description: 'Access all premium workout programs and features',
              },
              unit_amount: PREMIUM_PRICE_SEK,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          }],
      success_url: validatedSuccessUrl,
      cancel_url: validatedCancelUrl,
      customer_email: customerEmail,
      metadata: {
        userId: user.id,
        mode: 'subscription',
      },
      subscription_data: {
        metadata: { userId: user.id },
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: message || 'Failed to create checkout session' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
