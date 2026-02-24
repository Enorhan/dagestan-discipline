// ============================================
// STRIPE SERVICE - Client-side service for initiating checkout
// ============================================

import { CreateCheckoutParams, CheckoutSessionResponse } from './stripe'
import { supabase } from './supabase'

// Supabase Edge Function URL for Stripe checkout
const STRIPE_CHECKOUT_FUNCTION_URL = 'https://ftwtxslonvjgvbaexkwn.supabase.co/functions/v1/stripe-checkout'

// Supabase anon key for Edge Function calls (hardcoded for static export compatibility)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d3R4c2xvbnZqZ3ZiYWV4a3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MzQsImV4cCI6MjA4NTYwNTYzNH0.Owl7W3VEha3y3VpfTzWMNP3hmfpCoYZ_hRFUev-lO6A'

/**
 * Get the base URL for checkout redirects.
 * In Capacitor apps, window.location.origin is 'capacitor://localhost' which isn't valid for Stripe.
 * We use the app's deep link scheme instead.
 */
function getCheckoutBaseUrl(): string {
  // Check if we're in a Capacitor environment
  const isCapacitor = typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
     window.location.origin.includes('capacitor://'))

  if (isCapacitor) {
    // Use the app's custom URL scheme for deep linking
    return 'dagestanidiscipline://app'
  }

  // In web environment, use the actual origin
  return window.location.origin
}

/**
 * Stripe service for handling client-side payment operations
 */
export const stripeService = {
  /**
   * Create a checkout session via Supabase Edge Function
   */
  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      throw new Error('You must be signed in to start checkout')
    }

    console.log('[Stripe] Creating checkout session with params:', JSON.stringify(params))
    console.log('[Stripe] Using URL:', STRIPE_CHECKOUT_FUNCTION_URL)

    const response = await fetch(STRIPE_CHECKOUT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    })

    console.log('[Stripe] Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Stripe] Error response:', JSON.stringify(errorData))
      throw new Error(errorData.error || 'Failed to create checkout session')
    }

    const result = await response.json()
    console.log('[Stripe] Success, got session URL:', result.url)
    return result
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
  async subscribeToPremium(email?: string): Promise<void> {
    const baseUrl = getCheckoutBaseUrl()
    const session = await this.createCheckoutSession({
      mode: 'subscription',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
      successUrl: `${baseUrl}/settings?subscription=success`,
      cancelUrl: `${baseUrl}/settings?subscription=canceled`,
      email,
    })

    await this.redirectToCheckout(session.url)
  },

  /**
   * Purchase a premium workout program (one-time)
   */
  async purchaseProgram(programId: string, email?: string): Promise<void> {
    const baseUrl = getCheckoutBaseUrl()
    const session = await this.createCheckoutSession({
      mode: 'payment',
      programId,
      successUrl: `${baseUrl}/training-hub?purchase=success&program=${programId}`,
      cancelUrl: `${baseUrl}/training-hub?purchase=canceled`,
      email,
    })

    await this.redirectToCheckout(session.url)
  },
}

export default stripeService
