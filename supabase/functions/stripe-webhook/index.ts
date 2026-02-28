// ============================================================================
// DAGESTAN DISCIPLINE - STRIPE WEBHOOK EDGE FUNCTION (AAA PRODUCTION READY)
// Handles Stripe webhook events to update user subscription status
// Uses metadata.userId for reliable user lookup (not email)
// Implements idempotency to handle duplicate webhook deliveries
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize Stripe
// Note: We use 'any' for apiVersion to handle webhook events from different Stripe API versions
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

// ============================================================================
// IDEMPOTENCY: Check if event was already processed
// ============================================================================
async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('processed_stripe_events')
    .select('id')
    .eq('event_id', eventId)
    .single()
  return !!data
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await supabaseAdmin
    .from('processed_stripe_events')
    .insert({ event_id: eventId, event_type: eventType, processed_at: new Date().toISOString() })
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('No stripe-signature header')
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret || '')
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(JSON.stringify({ error: 'Invalid signature', details: err.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Received webhook event:', event.type, 'ID:', event.id)

    // IDEMPOTENCY CHECK: Skip if already processed
    if (await isEventProcessed(event.id)) {
      console.log('Event already processed, skipping:', event.id)
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', invoice.id, 'Customer:', invoice.customer)
        // In production, send email notification to user
        break
      }
      default:
        console.log('Unhandled event type:', event.type)
    }

    // Mark event as processed (idempotency)
    await markEventProcessed(event.id, event.type)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ============================================================================
// AAA PATTERN: Use metadata.userId passed during checkout creation
// This is reliable and doesn't require searching by email
// ============================================================================

// Handle checkout.session.completed - user just subscribed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // AAA PATTERN: Get userId from metadata (passed during checkout creation)
  const userId = session.metadata?.userId

  if (!userId) {
    console.error('No userId in session metadata! Session:', session.id)
    console.error('Metadata:', JSON.stringify(session.metadata))
    return
  }

  console.log('Processing checkout for userId:', userId)

  // Update the profile with Stripe info
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      is_premium: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating profile:', updateError)
  } else {
    console.log('✅ Profile updated to premium for user:', userId)
  }
}

// Handle subscription updates (created/updated)
// AAA PATTERN: Try metadata.userId first, fallback to stripe_customer_id lookup
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription updated:', subscription.id, 'Status:', subscription.status)
    console.log('cancel_at_period_end:', subscription.cancel_at_period_end)
    console.log('Subscription customer:', subscription.customer)
    console.log('Subscription metadata:', JSON.stringify(subscription.metadata))

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || String(subscription.customer)

    console.log('Resolved customerId:', customerId)

    // AAA PATTERN: First try to get userId from subscription metadata
    let userId = subscription.metadata?.userId
    console.log('userId from metadata:', userId)

    // Fallback: Find profile by stripe_customer_id (for subsequent events after checkout)
    if (!userId) {
      console.log('Looking up profile by stripe_customer_id:', customerId)
      const { data: profile, error: lookupError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (lookupError) {
        console.log('Profile lookup error:', lookupError.message, lookupError.code)
      }

      if (profile) {
        userId = profile.id
        console.log('Found userId via stripe_customer_id lookup:', userId)
      }
    }

    if (!userId) {
      console.log('No userId found for subscription event - checkout.completed will handle this')
      return // This is OK - checkout.completed runs first and sets up the profile
    }

    // Determine premium status
    // User is premium if subscription is active/trialing
    const isPremium = subscription.status === 'active' || subscription.status === 'trialing'

    // Handle period_end - try multiple sources:
    // 1. current_period_end (main subscription field)
    // 2. cancel_at (when subscription is scheduled for cancellation)
    // 3. items.data[0].current_period_end (subscription item level)
    let periodEnd: string | null = null
    const periodEndRaw = subscription.current_period_end
      || (subscription as any).cancel_at
      || (subscription as any).items?.data?.[0]?.current_period_end

    console.log('period_end sources:', {
      current_period_end: subscription.current_period_end,
      cancel_at: (subscription as any).cancel_at,
      item_period_end: (subscription as any).items?.data?.[0]?.current_period_end,
      resolved: periodEndRaw
    })

    if (periodEndRaw) {
      const timestamp = typeof periodEndRaw === 'number'
        ? periodEndRaw
        : parseInt(String(periodEndRaw), 10)
      if (!isNaN(timestamp)) {
        periodEnd = new Date(timestamp * 1000).toISOString()
      }
    }
    console.log('periodEnd final:', periodEnd)

    // AAA PATTERN: Track "canceling" state when user has cancelled but subscription still active
    // This lets us show "Premium ends on [date]" in the UI
    let subscriptionStatus: string = subscription.status
    if (subscription.cancel_at_period_end && subscription.status === 'active') {
      subscriptionStatus = 'canceling' // Custom status: cancelled but still has access until period end
      console.log('User has cancelled - premium access until:', periodEnd)
    }

    console.log('Updating profile:', userId, 'isPremium:', isPremium, 'status:', subscriptionStatus)

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: isPremium,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        subscription_period_end: periodEnd,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
    } else {
      console.log('✅ Subscription updated for user:', userId, 'Premium:', isPremium, 'Status:', subscriptionStatus)
    }
  } catch (err) {
    console.error('handleSubscriptionUpdate error:', err)
    throw err // Re-throw to be caught by main handler
  }
}

// Handle subscription deleted/canceled
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  const customerId = subscription.customer as string

  // Try metadata first, then fallback to customer_id lookup
  let userId = subscription.metadata?.userId

  if (!userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (profile) {
      userId = profile.id
    }
  }

  if (!userId) {
    console.error('No profile found for canceled subscription:', subscription.id)
    return
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      is_premium: false,
      subscription_status: 'canceled',
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating subscription:', updateError)
  } else {
    console.log('✅ Subscription canceled for user:', userId)
  }
}

// Handle invoice payment succeeded - extend subscription period
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.log('Invoice not related to subscription, skipping')
    return
  }

  // Fetch the subscription to get period end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      is_premium: true,
      subscription_status: 'active',
      subscription_period_end: periodEnd,
    })
    .eq('stripe_customer_id', customerId)

  if (updateError) {
    console.error('Error updating on invoice success:', updateError)
  } else {
    console.log('✅ Profile updated on successful payment for customer:', customerId)
  }
}

