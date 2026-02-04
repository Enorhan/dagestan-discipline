import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
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

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { userId, programId, mode } = session.metadata || {}

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  if (mode === 'subscription' && session.subscription) {
    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

    // Get or create subscription plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', subscription.items.data[0]?.price.id)
      .single()

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

    if (error) console.error('Error upserting subscription:', error)
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

    if (error) console.error('Error creating purchase:', error)

    // Also add to user_programs to grant access
    await supabase.from('user_programs').upsert({
      user_id: userId,
      program_id: programId,
      is_active: true,
      purchased_at: new Date().toISOString(),
    }, { onConflict: 'user_id,program_id' })
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
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

  if (error) console.error('Error updating subscription period:', error)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
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

  if (error) console.error('Error updating subscription:', error)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error canceling subscription:', error)
}

