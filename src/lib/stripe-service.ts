// ============================================
// STRIPE SERVICE - Client-side service for initiating checkout
// ============================================

import { CreateCheckoutParams, CheckoutSessionResponse } from './stripe'
import { supabase } from './supabase'

// Supabase Edge Function URLs
const STRIPE_CHECKOUT_FUNCTION_URL = 'https://ftwtxslonvjgvbaexkwn.supabase.co/functions/v1/stripe-checkout'
const STRIPE_PORTAL_FUNCTION_URL = 'https://ftwtxslonvjgvbaexkwn.supabase.co/functions/v1/stripe-portal'

// Supabase anon key for Edge Function calls (hardcoded for static export compatibility)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d3R4c2xvbnZqZ3ZiYWV4a3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MzQsImV4cCI6MjA4NTYwNTYzNH0.Owl7W3VEha3y3VpfTzWMNP3hmfpCoYZ_hRFUev-lO6A'

/**
 * Get the redirect URLs for Stripe checkout.
 * Uses GitHub Pages redirect page which then attempts to deep link back to the app.
 * This works better than direct deep links which Safari can't handle.
 */
function getCheckoutRedirectUrls(): { successUrl: string; cancelUrl: string } {
  // Use the GitHub Pages redirect page which handles the deep linking
  const redirectPageBase = 'https://enorhan.github.io/dagestan-discipline/redirect.html'

  return {
    successUrl: `${redirectPageBase}?status=success`,
    cancelUrl: `${redirectPageBase}?status=canceled`,
  }
}

/**
 * Stripe service for handling client-side payment operations
 */
export const stripeService = {
  /**
   * Create a checkout session via Supabase Edge Function
   */
  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
    console.log('[Stripe] Getting auth session...')
    if (typeof window !== 'undefined') {
      console.log('[Stripe] Window location:', window.location.href)
    }

    let accessToken: string | undefined
    try {
      // Get current session (don't refresh - it can hang in Capacitor)
      console.log('[Stripe] Calling getSession...')
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('[Stripe] getSession returned')

      if (error) {
        console.error('[Stripe] Auth error:', error.message)
        if (typeof window !== 'undefined') {
          window.alert('Auth Error: ' + error.message)
        }
        throw new Error('Authentication failed: ' + error.message)
      }

      if (!session) {
        console.error('[Stripe] No session found')
        if (typeof window !== 'undefined') {
          window.alert('No session found. Please log in again.')
        }
        throw new Error('No active session. Please sign in again.')
      }

      accessToken = session.access_token
      console.log('[Stripe] Got access token:', accessToken ? 'yes (length: ' + accessToken.length + ')' : 'no')
      console.log('[Stripe] Token expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown')
    } catch (authError) {
      console.error('[Stripe] Failed to get session:', authError)
      const errMsg = authError instanceof Error ? authError.message : String(authError)
      if (typeof window !== 'undefined') {
        window.alert('Session Error: ' + errMsg)
      }
      throw new Error('Failed to authenticate. Please sign in again.')
    }

    if (!accessToken) {
      console.error('[Stripe] No access token available')
      if (typeof window !== 'undefined') {
        window.alert('No access token. Please log out and log in again.')
      }
      throw new Error('You must be signed in to start checkout. Please log out and log in again.')
    }

    console.log('[Stripe] Creating checkout session with params:', JSON.stringify(params))
    console.log('[Stripe] Price ID:', params.priceId)
    console.log('[Stripe] Using URL:', STRIPE_CHECKOUT_FUNCTION_URL)

    let response: Response
    try {
      console.log('[Stripe] Making fetch request...')
      response = await fetch(STRIPE_CHECKOUT_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      })
      console.log('[Stripe] Fetch completed, status:', response.status)
    } catch (fetchError) {
      const fetchErrMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error('[Stripe] Fetch failed:', fetchErrMsg)
      if (typeof window !== 'undefined') {
        window.alert('Fetch Error:\n\n' + fetchErrMsg)
      }
      throw new Error('Network error: ' + fetchErrMsg)
    }

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session'
      try {
        const errorData = await response.json()
        console.error('[Stripe] Error response:', JSON.stringify(errorData))
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {
        const errorText = await response.text()
        console.error('[Stripe] Error response (text):', errorText)
        errorMessage = errorText || errorMessage
      }
      if (typeof window !== 'undefined') {
        window.alert('API Error (status ' + response.status + '):\n\n' + errorMessage)
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('[Stripe] Success, got session URL:', result.url)
    return result
  },

  /**
   * Redirect to Stripe Checkout
   * Uses the session URL directly instead of deprecated redirectToCheckout
   * In Capacitor/mobile environment, opens in system browser
   */
  async redirectToCheckout(sessionUrl: string): Promise<void> {
    console.log('[Stripe] redirectToCheckout called with URL:', sessionUrl)

    if (typeof window === 'undefined') {
      console.error('[Stripe] No window object available')
      return
    }

    // Check if we're in a Capacitor environment
    const isCapacitor = window.location.protocol === 'capacitor:' ||
       window.location.origin.includes('capacitor://') ||
       window.location.hostname === 'localhost'

    console.log('[Stripe] isCapacitor:', isCapacitor)
    console.log('[Stripe] protocol:', window.location.protocol)
    console.log('[Stripe] origin:', window.location.origin)

    // Show the URL so user knows checkout was created
    const confirmed = window.confirm('Checkout session created! Open Stripe checkout?\n\nURL: ' + sessionUrl.substring(0, 50) + '...')
    if (confirmed) {
      // Try multiple methods to open the URL
      console.log('[Stripe] Opening URL...')

      // Method 1: window.open with _blank (works better in iOS WebView)
      const newWindow = window.open(sessionUrl, '_blank')

      if (!newWindow) {
        console.log('[Stripe] window.open returned null, trying location.href...')
        // Fallback: direct navigation
        window.location.href = sessionUrl
      }
    }
  },

  /**
   * Subscribe to premium plan (25 SEK/month)
   */
  async subscribeToPremium(email?: string): Promise<void> {
    const { successUrl, cancelUrl } = getCheckoutRedirectUrls()
    console.log('[Stripe] subscribeToPremium called')
    console.log('[Stripe] successUrl:', successUrl)
    console.log('[Stripe] cancelUrl:', cancelUrl)
    console.log('[Stripe] priceId from env:', process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID)

    try {
      const session = await this.createCheckoutSession({
        mode: 'subscription',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
        successUrl,
        cancelUrl,
        email,
      })

      console.log('[Stripe] Got session, redirecting to:', session.url)
      await this.redirectToCheckout(session.url)
    } catch (error) {
      console.error('[Stripe] subscribeToPremium error:', error)
      let errorMsg = 'Unknown error'
      if (error instanceof Error) {
        errorMsg = error.message || error.toString()
      } else if (typeof error === 'string') {
        errorMsg = error
      } else {
        errorMsg = JSON.stringify(error)
      }
      console.error('[Stripe] Error message:', errorMsg)
      // Show alert so user can see the actual error
      if (typeof window !== 'undefined') {
        window.alert('Stripe Error Details:\n\n' + errorMsg)
      }
      throw new Error(errorMsg)
    }
  },

  /**
   * Purchase a premium workout program (one-time)
   */
  async purchaseProgram(programId: string, email?: string): Promise<void> {
    // Use GitHub Pages redirect for program purchases too
    const redirectPageBase = 'https://enorhan.github.io/dagestan-discipline/redirect.html'
    const session = await this.createCheckoutSession({
      mode: 'payment',
      programId,
      successUrl: `${redirectPageBase}?status=success&type=purchase&program=${programId}`,
      cancelUrl: `${redirectPageBase}?status=canceled&type=purchase`,
      email,
    })

    await this.redirectToCheckout(session.url)
  },

  /**
   * Open Stripe Customer Portal for subscription management
   * Allows users to cancel subscription, update payment method, view invoices
   */
  async openCustomerPortal(): Promise<void> {
    console.log('[Stripe] Opening Customer Portal...')

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      throw new Error('You must be signed in to manage your subscription.')
    }

    const response = await fetch(STRIPE_PORTAL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        returnUrl: 'https://enorhan.github.io/dagestan-discipline/redirect.html?status=portal',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Stripe] Portal error:', errorText)
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    const { url } = data

    if (!url) {
      throw new Error('No portal URL received from server')
    }

    console.log('[Stripe] Opening portal URL with Capacitor Browser...')

    // Use Capacitor Browser plugin for proper external URL handling
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  },

  /**
   * Poll for subscription status after returning from Stripe checkout
   * AAA PATTERN: Don't trust redirects, poll the server for actual status
   */
  async pollForSubscriptionStatus(
    maxAttempts: number = 10,
    intervalMs: number = 2000
  ): Promise<boolean> {
    console.log('[Stripe] Polling for subscription status...')

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('[Stripe] No user found during poll')
          return false
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Cast to access Stripe fields (added to DB but not in generated types)
        const isPremium = (profile as any)?.is_premium
        const subscriptionStatus = (profile as any)?.subscription_status

        if (isPremium) {
          console.log('[Stripe] ✅ Subscription confirmed! Status:', subscriptionStatus)
          return true
        }

        console.log(`[Stripe] Poll ${i + 1}/${maxAttempts}: Not premium yet, waiting...`)
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (err) {
        console.error('[Stripe] Poll error:', err)
      }
    }

    console.log('[Stripe] Polling complete, subscription not confirmed')
    return false
  },
}

export default stripeService
