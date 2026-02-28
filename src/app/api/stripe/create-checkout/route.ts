import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  })
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }
  return createClient(url, serviceKey)
}

type CheckoutRequestBody = {
  mode?: 'subscription' | 'payment'
  priceId?: string
  programId?: string
  successUrl?: string
  cancelUrl?: string
  userId?: string
  email?: string
}

// App's custom URL scheme for deep linking (iOS/Android)
const APP_URL_SCHEME = 'dagestanidiscipline://'

function getAllowedCheckoutOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>([request.nextUrl.origin])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin)
    } catch {
      // Ignore invalid app URL values.
    }
  }
  // Add the app's custom URL scheme origin
  origins.add('dagestanidiscipline://app')
  return origins
}

function validateCheckoutRedirectUrl(
  rawUrl: string | undefined,
  label: string,
  allowedOrigins: Set<string>
): string {
  if (!rawUrl) {
    throw new Error(`${label} URL is required`)
  }

  // Check if it's using the app's custom URL scheme (deep link)
  if (rawUrl.startsWith(APP_URL_SCHEME)) {
    // Validate the deep link format
    return rawUrl
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error(`${label} URL is invalid`)
  }

  if (!allowedOrigins.has(parsed.origin)) {
    throw new Error(`${label} URL origin is not allowed`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${label} URL must use http or https`)
  }

  return parsed.toString()
}

async function requireAuthenticatedUser(request: NextRequest): Promise<{ id: string; email: string | null }> {
  const supabase = getSupabaseAdminClient()
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token')
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    throw new Error('Missing bearer token')
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return { id: user.id, email: user.email ?? null }
}

// Premium subscription price: 25 SEK/month
const PREMIUM_PRICE_SEK = 2500 // in öre (cents)

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient()
    const supabase = getSupabaseAdminClient()
    const user = await requireAuthenticatedUser(request)
    const body = (await request.json()) as CheckoutRequestBody
    const { mode, priceId, programId, userId, email } = body

    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    const allowedOrigins = getAllowedCheckoutOrigins(request)
    const successUrl = validateCheckoutRedirectUrl(body.successUrl, 'Success', allowedOrigins)
    const cancelUrl = validateCheckoutRedirectUrl(body.cancelUrl, 'Cancel', allowedOrigins)
    const customerEmail = email ?? user.email ?? undefined

    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (mode === 'subscription') {
      // Create subscription checkout session
      sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: priceId
          ? [{ price: priceId, quantity: 1 }]
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
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          userId: user.id,
          mode: 'subscription',
        },
        subscription_data: {
          metadata: { userId: user.id },
        },
      }
    } else if (mode === 'payment' && programId) {
      // Fetch program details from Supabase
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id, name, description, price_sek')
        .eq('id', programId)
        .eq('is_premium', true)
        .single()

      if (programError || !program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 })
      }

      // Create one-time payment checkout session
      sessionParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'sek',
            product_data: {
              name: program.name,
              description: program.description || 'Premium workout program',
            },
            unit_amount: (program.price_sek || 99) * 100, // Convert SEK to öre
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          userId: user.id,
          programId,
          mode: 'payment',
        },
      }
    } else {
      return NextResponse.json({ error: 'Invalid checkout mode or missing programId' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (
      message === 'Missing bearer token' ||
      message.includes('URL is') ||
      message.includes('URL must use')
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
