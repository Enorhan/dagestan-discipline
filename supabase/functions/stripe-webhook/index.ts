// ============================================================================
// DAGESTAN DISCIPLINE - STRIPE WEBHOOK EDGE FUNCTION
// Canonical payment webhook handler: monthly premium subscriptions.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const PREMIUM_ACTIVE_STATUSES = new Set(['active', 'trialing'])

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return (error as { code?: string }).code === '23505'
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getCustomerId(customer: unknown): string | null {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  if (typeof customer === 'object' && customer !== null && 'id' in customer) {
    const id = (customer as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

function toIsoFromUnix(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return new Date(parsed * 1000).toISOString()
    }
  }
  return null
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEnd: string | null
} {
  const currentPeriodStart =
    toIsoFromUnix((subscription as any).current_period_start)
    || toIsoFromUnix((subscription as any).items?.data?.[0]?.current_period_start)

  const currentPeriodEnd =
    toIsoFromUnix((subscription as any).current_period_end)
    || toIsoFromUnix((subscription as any).cancel_at)
    || toIsoFromUnix((subscription as any).items?.data?.[0]?.current_period_end)

  const trialEnd = toIsoFromUnix((subscription as any).trial_end)

  return {
    currentPeriodStart,
    currentPeriodEnd,
    trialEnd,
  }
}

function getProfileSubscriptionStatus(subscription: Stripe.Subscription): string {
  if (subscription.cancel_at_period_end && subscription.status === 'active') {
    return 'canceling'
  }
  return subscription.status
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const priceId = (subscription.items?.data?.[0] as any)?.price?.id
  return typeof priceId === 'string' ? priceId : null
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as any)?.subscription
  if (typeof direct === 'string') return direct

  const fromParent = (invoice as any)?.parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent

  const fromLines = (invoice as any)?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
  return typeof fromLines === 'string' ? fromLines : null
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('processed_stripe_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('Failed to check processed webhook event:', error.message)
    return false
  }

  return !!data
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('processed_stripe_events')
    .insert({ event_id: eventId, event_type: eventType, processed_at: new Date().toISOString() })

  if (error && !isUniqueViolation(error)) {
    throw new Error(`Failed to mark webhook event processed: ${error.message}`)
  }
}

async function resolveUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = subscription.metadata?.userId
  if (metadataUserId) return metadataUserId

  const customerId = getCustomerId(subscription.customer)
  if (customerId) {
    const { data: profileByCustomer } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if ((profileByCustomer as any)?.id) {
      return (profileByCustomer as any).id
    }
  }

  const { data: subscriptionRow } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  return (subscriptionRow as any)?.user_id ?? null
}

async function resolvePlanId(userId: string, subscription: Stripe.Subscription): Promise<string | null> {
  const stripePriceId = getSubscriptionPriceId(subscription)

  if (stripePriceId) {
    const { data: planByPrice } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', stripePriceId)
      .maybeSingle()

    if ((planByPrice as any)?.id) {
      return (planByPrice as any).id
    }
  }

  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle()

  if ((existingSubscription as any)?.plan_id) {
    return (existingSubscription as any).plan_id
  }

  const { data: fallbackPlan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (fallbackPlan as any)?.id ?? null
}

async function syncProfileFromSubscription(
  userId: string,
  customerId: string | null,
  subscription: Stripe.Subscription
): Promise<void> {
  const { currentPeriodEnd } = getSubscriptionPeriod(subscription)
  const isPremium = PREMIUM_ACTIVE_STATUSES.has(subscription.status)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      is_premium: isPremium,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: getProfileSubscriptionStatus(subscription),
      subscription_period_end: currentPeriodEnd,
      premium_source: 'stripe',
      premium_provider_id: subscription.id,
      premium_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to sync profile subscription: ${error.message}`)
  }
}

async function syncSubscriptionRecord(
  userId: string,
  customerId: string | null,
  subscription: Stripe.Subscription
): Promise<void> {
  const planId = await resolvePlanId(userId, subscription)
  if (!planId) {
    console.warn('No plan ID resolved for subscription:', subscription.id)
    return
  }

  const period = getSubscriptionPeriod(subscription)

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        current_period_start: period.currentPeriodStart,
        current_period_end: period.currentPeriodEnd,
        trial_end: period.trialEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    throw new Error(`Failed to sync subscription record: ${error.message}`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId) {
    throw new Error(`Checkout ${session.id} is missing metadata.userId`)
  }

  const mode = session.metadata?.mode ?? session.mode

  if (mode === 'payment') {
    console.warn(`Ignoring unsupported non-subscription checkout ${session.id}; Premium is subscription-only.`)
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as any)?.id ?? null

  if (!subscriptionId) {
    throw new Error(`Checkout ${session.id} subscription mode is missing subscription ID`)
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = getCustomerId(subscription.customer) ?? getCustomerId(session.customer)

  await syncSubscriptionRecord(userId, customerId, subscription)
  await syncProfileFromSubscription(userId, customerId, subscription)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromSubscription(subscription)
  if (!userId) {
    console.log('No user found for subscription update:', subscription.id)
    return
  }

  const customerId = getCustomerId(subscription.customer)

  await syncSubscriptionRecord(userId, customerId, subscription)
  await syncProfileFromSubscription(userId, customerId, subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromSubscription(subscription)
  if (!userId) {
    console.log('No user found for deleted subscription:', subscription.id)
    return
  }

  const customerId = getCustomerId(subscription.customer)
  const periodEnd =
    toIsoFromUnix((subscription as any).ended_at)
    || toIsoFromUnix((subscription as any).canceled_at)
    || toIsoFromUnix((subscription as any).cancel_at)
    || null

  const { error: subscriptionError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (subscriptionError) {
    throw new Error(`Failed to mark subscription canceled: ${subscriptionError.message}`)
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      is_premium: false,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: 'canceled',
      subscription_period_end: periodEnd,
    })
    .eq('id', userId)

  if (profileError) {
    throw new Error(`Failed to mark profile canceled: ${profileError.message}`)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) {
    console.log('Invoice has no subscription, skipping:', invoice.id)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await handleSubscriptionUpdate(subscription)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) {
    console.log('Invoice payment failed without subscription:', invoice.id)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await handleSubscriptionUpdate(subscription)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'No stripe-signature header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret || '')
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid signature', details: toErrorMessage(error) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (await isEventProcessed(event.id)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }

    await markEventProcessed(event.id, event.type)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', toErrorMessage(error))
    return new Response(JSON.stringify({ error: toErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
