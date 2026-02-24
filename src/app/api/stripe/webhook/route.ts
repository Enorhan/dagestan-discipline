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

function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  }
  return secret
}

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>

type WebhookEventStatus = 'processing' | 'processed' | 'failed'

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  return code === '23505'
}

async function beginWebhookProcessing(
  supabase: SupabaseAdminClient,
  event: Stripe.Event
): Promise<{ eventRowId: string; duplicate: boolean }> {
  const now = new Date().toISOString()
  const basePayload = {
    stripe_event_id: event.id,
    event_type: event.type,
    status: 'processing' as WebhookEventStatus,
    attempt_count: 1,
    received_at: now,
    last_error: null,
    payload: event as unknown as Record<string, unknown>,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert(basePayload)
    .select('id,status,attempt_count')
    .single()

  if (!insertError && inserted?.id) {
    return { eventRowId: inserted.id, duplicate: false }
  }

  if (!isUniqueViolation(insertError)) {
    const message = insertError?.message ?? 'unknown error'
    throw new Error(`Failed to create webhook event row: ${message}`)
  }

  const { data: existing, error: existingError } = await supabase
    .from('stripe_webhook_events')
    .select('id,status,attempt_count')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existingError || !existing?.id) {
    const message = existingError?.message ?? 'missing existing event row'
    throw new Error(`Failed to read existing webhook event row: ${message}`)
  }

  const status = String(existing.status ?? '') as WebhookEventStatus
  if (status === 'processed') {
    return { eventRowId: existing.id, duplicate: true }
  }
  if (status === 'processing') {
    throw new Error('Webhook event is currently being processed')
  }

  const { error: claimError } = await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      attempt_count: (existing.attempt_count ?? 0) + 1,
      last_error: null,
      received_at: now,
    })
    .eq('id', existing.id)

  if (claimError) {
    throw new Error(`Failed to claim existing webhook event row: ${claimError.message}`)
  }

  return { eventRowId: existing.id, duplicate: false }
}

async function markWebhookProcessed(
  supabase: SupabaseAdminClient,
  eventRowId: string
): Promise<void> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', eventRowId)

  if (error) {
    throw new Error(`Failed to mark webhook as processed: ${error.message}`)
  }
}

async function markWebhookFailed(
  supabase: SupabaseAdminClient,
  eventRowId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'failed',
      last_error: errorMessage.slice(0, 4000),
    })
    .eq('id', eventRowId)

  if (error) {
    console.error('Failed to mark webhook as failed:', error.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient()
    const supabase = getSupabaseAdminClient()
    const webhookSecret = getStripeWebhookSecret()
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Webhook signature verification failed:', message)
      return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
    }

    const { eventRowId, duplicate } = await beginWebhookProcessing(supabase, event)
    if (duplicate) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(stripe, supabase, event.data.object as Stripe.Checkout.Session)
          break

        case 'invoice.paid':
          await handleInvoicePaid(stripe, supabase, event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      await markWebhookProcessed(supabase, eventRowId)
      return NextResponse.json({ received: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await markWebhookFailed(supabase, eventRowId, message)
      throw error
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  supabase: SupabaseAdminClient,
  session: Stripe.Checkout.Session
) {
  const { userId, programId, mode } = session.metadata || {}

  if (!userId) {
    throw new Error('Checkout metadata is missing userId')
  }

  if (mode === 'subscription' && session.subscription) {
    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

    // Get or create subscription plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', subscription.items.data[0]?.price.id)
      .maybeSingle()

    if (planError) {
      throw new Error(`Failed to fetch subscription plan: ${planError.message}`)
    }

    // Get billing period from the first subscription item
    const firstItem = subscription.items.data[0]
    const currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000).toISOString()
      : new Date().toISOString()
    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : new Date().toISOString()

    // Create or update subscription record
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: plan?.id || null,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) throw new Error(`Failed to upsert subscription: ${error.message}`)
  } else if (mode === 'payment' && programId) {
    // Create purchase record for one-time program purchase
    const { error } = await supabase.from('purchases').insert({
      user_id: userId,
      program_id: programId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount_sek: Math.round((session.amount_total || 0) / 100),
      status: 'completed',
      purchased_at: new Date().toISOString(),
    })

    if (error) throw new Error(`Failed to create purchase: ${error.message}`)

    // Also add to user_programs to grant access
    const { error: grantError } = await supabase.from('user_programs').upsert({
      user_id: userId,
      program_id: programId,
      is_active: true,
      purchased_at: new Date().toISOString(),
    }, { onConflict: 'user_id,program_id' })

    if (grantError) throw new Error(`Failed to grant purchased program access: ${grantError.message}`)
  } else {
    throw new Error(`Unsupported checkout mode in metadata: ${mode ?? 'unknown'}`)
  }
}

async function handleInvoicePaid(
  stripe: Stripe,
  supabase: SupabaseAdminClient,
  invoice: Stripe.Invoice
) {
  // Access subscription from parent or lines
  const subscriptionId = invoice.parent?.subscription_details?.subscription
    || (invoice.lines.data[0]?.parent?.subscription_item_details?.subscription)

  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
  const userId = subscription.metadata.userId

  if (!userId) return

  // Get billing period from the first subscription item
  const firstItem = subscription.items.data[0]
  const currentPeriodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : new Date().toISOString()
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : new Date().toISOString()

  // Update subscription period
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw new Error(`Failed to update subscription period: ${error.message}`)
}

async function handleSubscriptionUpdated(
  supabase: SupabaseAdminClient,
  subscription: Stripe.Subscription
) {
  // Get billing period from the first subscription item
  const firstItem = subscription.items.data[0]
  const currentPeriodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : new Date().toISOString()
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : new Date().toISOString()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw new Error(`Failed to update subscription: ${error.message}`)
}

async function handleSubscriptionDeleted(
  supabase: SupabaseAdminClient,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw new Error(`Failed to cancel subscription: ${error.message}`)
}
