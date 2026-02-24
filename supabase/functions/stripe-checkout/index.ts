// ============================================================================
// DAGESTAN DISCIPLINE - STRIPE CHECKOUT EDGE FUNCTION
// Creates Stripe Checkout sessions for subscriptions and one-time payments
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Premium subscription price: 25 SEK/month (in öre)
const PREMIUM_PRICE_SEK = 2500

interface CheckoutRequest {
  mode: 'subscription' | 'payment'
  priceId?: string
  programId?: string
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
    const { mode, priceId, programId, successUrl, cancelUrl, email } = body

    if (!mode || !successUrl || !cancelUrl) {
      throw new Error('Missing required fields: mode, successUrl, cancelUrl')
    }

    const customerEmail = email ?? user.email ?? undefined
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (mode === 'subscription') {
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
      const { data: program, error: programError } = await supabaseAdmin
        .from('programs')
        .select('id, name, description, price_sek')
        .eq('id', programId)
        .eq('is_premium', true)
        .single()

      if (programError || !program) {
        throw new Error('Program not found')
      }

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
            unit_amount: (program.price_sek || 99) * 100,
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
      throw new Error('Invalid checkout mode or missing programId')
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout session' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

