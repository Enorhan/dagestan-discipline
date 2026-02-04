// ============================================
// STRIPE CLIENT - Client-side Stripe initialization
// ============================================

import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get the Stripe client instance (client-side only)
 * Uses a singleton pattern to ensure we only create one instance
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

// ============================================
// STRIPE TYPES
// ============================================

export type CheckoutMode = 'subscription' | 'payment'

export interface CreateCheckoutParams {
  mode: CheckoutMode
  priceId?: string // For subscriptions with existing Stripe price
  programId?: string // For one-time premium program purchases
  successUrl: string
  cancelUrl: string
  userId: string
  email?: string
}

export interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

// Subscription status types matching Stripe statuses
export type SubscriptionStatus = 
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'paused'

// Purchase status types
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded'

