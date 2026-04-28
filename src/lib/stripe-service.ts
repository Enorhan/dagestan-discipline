// ============================================
// STRIPE SERVICE - Client-side service for initiating checkout
// ============================================

import { Capacitor } from '@capacitor/core'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { CreateCheckoutParams, CheckoutSessionResponse } from './stripe'
import { captureException } from './monitoring'
import { getBillingCheckoutAvailability, getBillingPortalAvailability } from './runtime-flags'
import { supabase } from './supabase'
import { buildCheckoutRedirectUrl } from './subscription-config'
import {
  createBillingAccessTokenCacheSnapshot,
  EMPTY_BILLING_ACCESS_TOKEN_CACHE_SNAPSHOT,
  getBillingAccessTokenFromCache,
} from './billing-auth-token-cache'

const BILLING_AUTH_TIMEOUT_MS = 8000
const BILLING_FETCH_TIMEOUT_MS = 12000

let lastKnownBillingAccessTokenCache = { ...EMPTY_BILLING_ACCESS_TOKEN_CACHE_SNAPSHOT }
let hasInitializedBillingAccessTokenCache = false

function updateBillingAccessTokenCache(session: AuthSession | null | undefined): void {
  lastKnownBillingAccessTokenCache = createBillingAccessTokenCacheSnapshot(session)
}

function ensureBillingAccessTokenCacheInitialized(): void {
  if (hasInitializedBillingAccessTokenCache || typeof window === 'undefined') {
    return
  }

  hasInitializedBillingAccessTokenCache = true

  supabase.auth.onAuthStateChange((_event, session) => {
    updateBillingAccessTokenCache(session)
  })
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`))
        }, ms)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function getSupabaseEdgeFunctionUrl(functionName: 'stripe-checkout' | 'stripe-portal'): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`
}

function getSupabaseAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return anonKey
}

async function getBillingAccessToken(flow: 'checkout' | 'portal'): Promise<string> {
  ensureBillingAccessTokenCacheInitialized()

  const cachedAccessToken = getBillingAccessTokenFromCache(lastKnownBillingAccessTokenCache)
  if (cachedAccessToken) {
    return cachedAccessToken
  }

  try {
    const {
      data: { session },
      error,
    } = await withTimeout(
      supabase.auth.getSession(),
      BILLING_AUTH_TIMEOUT_MS,
      `${flow} session lookup`
    )

    if (error) {
      throw error
    }

    updateBillingAccessTokenCache(session)

    if (session?.access_token) {
      return session.access_token
    }
  } catch (error) {
    captureException(`stripe-${flow}`, error, {
      step: 'auth.getSession',
      platform: Capacitor.getPlatform(),
    }, 'warning')
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.refreshSession(),
      BILLING_AUTH_TIMEOUT_MS,
      `${flow} session refresh`
    )

    if (error) {
      throw error
    }

    updateBillingAccessTokenCache(data.session)

    if (data.session?.access_token) {
      return data.session.access_token
    }
  } catch (error) {
    captureException(`stripe-${flow}`, error, {
      step: 'auth.refreshSession',
      platform: Capacitor.getPlatform(),
    }, 'warning')
  }

  throw new Error('Your session needs to be refreshed before opening billing. Please try again in a moment.')
}

async function fetchBillingEndpoint(
  flow: 'checkout' | 'portal',
  url: string,
  init: RequestInit
): Promise<Response> {
  try {
    return await withTimeout(
      fetch(url, init),
      BILLING_FETCH_TIMEOUT_MS,
      `${flow} billing request`
    )
  } catch (error) {
    captureException(`stripe-${flow}`, error, {
      step: 'fetch',
      platform: Capacitor.getPlatform(),
    }, 'warning')

    const fallbackMessage = flow === 'portal'
      ? 'Unable to reach subscription management right now. Check your connection and try again.'
      : 'Unable to reach billing right now. Check your connection and try again.'

    throw new Error(fallbackMessage)
  }
}

/**
 * Get the redirect URLs for Stripe checkout.
 * Uses the configured redirect page which then attempts to deep link back to the app.
 * This works better than direct deep links which Safari can't handle.
 */
function getCheckoutRedirectUrls(): { successUrl: string; cancelUrl: string } {
  return {
    successUrl: buildCheckoutRedirectUrl({ status: 'success' }),
    cancelUrl: buildCheckoutRedirectUrl({ status: 'canceled' }),
  }
}

export async function closeExternalBillingBrowser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  const { Browser } = await import('@capacitor/browser')

  try {
    await Browser.close()
  } catch {
    // Browser.close() rejects when there is no active window. Ignore that case.
  }
}

function shouldUseSystemBrowserForBilling(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

async function openExternalBillingUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (shouldUseSystemBrowserForBilling()) {
    // Avoid SFSafariViewController on iOS for Stripe return flows.
    // Capacitor opens external URLs in the system browser by default.
    window.location.assign(url)
    return
  }

  if (Capacitor.isNativePlatform()) {
    await closeExternalBillingBrowser()

    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  }

  window.location.assign(url)
}

/**
 * Stripe service for handling client-side payment operations
 */
export const stripeService = {
  /**
   * Create a checkout session via Supabase Edge Function
   */
  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
    const accessToken = await getBillingAccessToken('checkout')

    const checkoutFunctionUrl = getSupabaseEdgeFunctionUrl('stripe-checkout')
    const supabaseAnonKey = getSupabaseAnonKey()

    const response = await fetchBillingEndpoint('checkout', checkoutFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session'
      const errorText = (await response.text()).trim()

      if (errorText) {
        try {
          const errorData = JSON.parse(errorText) as { error?: string }
          errorMessage = typeof errorData.error === 'string' && errorData.error.trim().length > 0
            ? errorData.error
            : errorText
        } catch {
          errorMessage = errorText
        }
      }

      throw new Error(errorMessage)
    }

    const result = await response.json() as CheckoutSessionResponse
    return result
  },

  /**
   * Redirect to Stripe Checkout
   * Uses the session URL directly instead of deprecated redirectToCheckout
   * In Capacitor/mobile environment, opens in system browser
   */
  async redirectToCheckout(sessionUrl: string): Promise<void> {
    await openExternalBillingUrl(sessionUrl)
  },

  /**
   * Subscribe to premium plan (25 kr/month)
   */
  async subscribeToPremium(priceId?: string, email?: string): Promise<void> {
    const checkoutAvailability = getBillingCheckoutAvailability()
    if (!checkoutAvailability.enabled) {
      throw new Error(checkoutAvailability.message ?? 'Premium upgrades are temporarily unavailable right now.')
    }

    const { successUrl, cancelUrl } = getCheckoutRedirectUrls()
    try {
      const session = await this.createCheckoutSession({
        mode: 'subscription',
        priceId: priceId ?? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
        successUrl,
        cancelUrl,
        email,
      })

      await this.redirectToCheckout(session.url)
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unable to start checkout right now.')
    }
  },

  /**
   * Open Stripe Customer Portal for subscription management
   * Allows users to cancel subscription, update payment method, view invoices
   */
  async openCustomerPortal(): Promise<void> {
    const portalAvailability = getBillingPortalAvailability()
    if (!portalAvailability.enabled) {
      throw new Error(portalAvailability.message ?? 'Subscription management is temporarily unavailable right now.')
    }

    const accessToken = await getBillingAccessToken('portal')

    const portalFunctionUrl = getSupabaseEdgeFunctionUrl('stripe-portal')
    const supabaseAnonKey = getSupabaseAnonKey()

    const response = await fetchBillingEndpoint('portal', portalFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        returnUrl: buildCheckoutRedirectUrl({ status: 'portal' }),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      captureException('stripe-portal', new Error(errorText || `Server error: ${response.status}`), {
        step: 'response',
        status: response.status,
      }, 'warning')
      throw new Error(errorText || `Server error: ${response.status}`)
    }

    const data = await response.json()
    const { url } = data

    if (!url) {
      throw new Error('No portal URL received from server')
    }

    await openExternalBillingUrl(url)
  },

  /**
   * Poll for subscription status after returning from Stripe checkout
   * AAA PATTERN: Don't trust redirects, poll the server for actual status
   */
  async pollForSubscriptionStatus(
    maxAttempts: number = 10,
    intervalMs: number = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
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
          return true
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (err) {
        captureException('stripe-subscription-poll', err, {
          attempt: i + 1,
          maxAttempts,
        }, 'warning')
      }
    }

    return false
  },
}

export default stripeService
