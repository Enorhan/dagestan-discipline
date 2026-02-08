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

// Premium subscription price: 25 SEK/month
const PREMIUM_PRICE_SEK = 2500 // in öre (cents)

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient()
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    const { mode, priceId, programId, successUrl, cancelUrl, userId, email } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Success and cancel URLs are required' }, { status: 400 })
    }

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
        customer_email: email,
        metadata: {
          userId,
          mode: 'subscription',
        },
        subscription_data: {
          metadata: { userId },
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
        customer_email: email,
        metadata: {
          userId,
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
