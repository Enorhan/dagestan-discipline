// ============================================
// STRIPE SERVICE - Client-side service for initiating checkout
// ============================================

import { CreateCheckoutParams, CheckoutSessionResponse } from './stripe'

/**
 * Stripe service for handling client-side payment operations
 */
export const stripeService = {
  /**
   * Create a checkout session and redirect to Stripe Checkout
   */
  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create checkout session')
    }

    return response.json()
  },

  /**
   * Redirect to Stripe Checkout
   * Uses the session URL directly instead of deprecated redirectToCheckout
   */
  async redirectToCheckout(sessionUrl: string): Promise<void> {
    // Redirect to the Stripe checkout URL
    window.location.href = sessionUrl
  },

  /**
   * Subscribe to premium plan (25 SEK/month)
   */
  async subscribeToPremium(userId: string, email?: string): Promise<void> {
    const session = await this.createCheckoutSession({
      mode: 'subscription',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
      successUrl: `${window.location.origin}/settings?subscription=success`,
      cancelUrl: `${window.location.origin}/settings?subscription=canceled`,
      userId,
      email,
    })

    await this.redirectToCheckout(session.url)
  },

  /**
   * Purchase a premium workout program (one-time)
   */
  async purchaseProgram(programId: string, userId: string, email?: string): Promise<void> {
    const session = await this.createCheckoutSession({
      mode: 'payment',
      programId,
      successUrl: `${window.location.origin}/training-hub?purchase=success&program=${programId}`,
      cancelUrl: `${window.location.origin}/training-hub?purchase=canceled`,
      userId,
      email,
    })

    await this.redirectToCheckout(session.url)
  },
}

export default stripeService

