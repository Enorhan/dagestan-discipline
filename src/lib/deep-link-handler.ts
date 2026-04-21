'use client'

import { App, URLOpenListenerEvent } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { captureException } from './monitoring'
import { closeExternalBillingBrowser } from './stripe-service'
import { supabase } from './supabase'
import { normalizeSubscriptionReturnStatus, SubscriptionReturnStatus } from './subscription-return'

// Deep link URL scheme
const URL_SCHEME = 'dagestanidiscipline://'

/**
 * Extracts auth tokens from a deep link URL
 * Supabase sends tokens in the URL fragment (after #) or as query params
 */
function extractAuthTokens(url: string): { accessToken?: string; refreshToken?: string; type?: string; code?: string } | null {
  try {
    // Handle both hash fragments and query params
    // Supabase typically sends: scheme://auth/callback#access_token=...&refresh_token=...&type=...
    const hashIndex = url.indexOf('#')
    const queryIndex = url.indexOf('?')
    
    let params: URLSearchParams
    
    if (hashIndex !== -1) {
      // Token is in hash fragment
      params = new URLSearchParams(url.substring(hashIndex + 1))
    } else if (queryIndex !== -1) {
      // Token is in query params
      params = new URLSearchParams(url.substring(queryIndex + 1))
    } else {
      return null
    }
    
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    const code = params.get('code')
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken, type: type || undefined }
    }

    if (code) {
      return { code, type: type || undefined }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting auth tokens:', error)
    captureException('deep-link-auth-parse', error, { step: 'extractAuthTokens' }, 'warning')
    return null
  }
}

/**
 * Handles deep link auth callbacks
 * Sets the session in Supabase when receiving auth tokens
 */
async function handleAuthCallback(url: string): Promise<boolean> {
  const tokens = extractAuthTokens(url)
  
  if (!tokens) {
    return false
  }
  
  try {
    let error: Error | null = null

    if (tokens.accessToken && tokens.refreshToken) {
      const result = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      })
      error = result.error
    } else if (tokens.code) {
      const result = await supabase.auth.exchangeCodeForSession(tokens.code)
      error = result.error
    } else {
      return false
    }
    
    if (error) {
      console.error('Error setting session from deep link:', error)
      captureException('deep-link-auth-session', error, { step: 'handleAuthCallback' }, 'warning')
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error handling auth callback:', error)
    captureException('deep-link-auth-callback', error, { step: 'handleAuthCallback' }, 'warning')
    return false
  }
}

/**
 * Callback type for auth events
 */
export type DeepLinkAuthCallback = (type: 'email_verified' | 'password_reset' | 'authenticated') => void

/**
 * Callback type for subscription events
 */
export type DeepLinkSubscriptionCallback = (status: SubscriptionReturnStatus) => void
export type DeepLinkAuthFailureCallback = (message: string) => void

/**
 * Initialize deep link listener for Capacitor
 * Call this once when the app starts
 */
export function initDeepLinkHandler(
  onAuthSuccess?: DeepLinkAuthCallback,
  onSubscription?: DeepLinkSubscriptionCallback,
  onAuthFailure?: DeepLinkAuthFailureCallback,
): () => void {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const processUrl = async (url: string) => {
    if (!url) return

    // Check if this is our app's URL scheme
    if (!url.startsWith(URL_SCHEME)) {
      return
    }

    // Handle subscription callbacks
    if (url.includes('subscription=') || url.includes('status=')) {
      const params = new URLSearchParams(url.split('?')[1] || '')
      const subscriptionStatus = normalizeSubscriptionReturnStatus(
        params.get('subscription') ?? params.get('status')
      )

      if (subscriptionStatus && onSubscription) {
        await closeExternalBillingBrowser()
        onSubscription(subscriptionStatus)
      }
      return
    }

    // Handle auth callbacks
    if (url.includes('auth/callback') || url.includes('auth-callback') || url.includes('access_token') || url.includes('code=')) {
      await closeExternalBillingBrowser()
      const success = await handleAuthCallback(url)

      if (success && onAuthSuccess) {
        // Determine the type of auth event
        const tokens = extractAuthTokens(url)
        if (tokens?.type === 'recovery') {
          onAuthSuccess('password_reset')
        } else if (tokens?.type === 'signup' || tokens?.type === 'email_change') {
          onAuthSuccess('email_verified')
        } else {
          onAuthSuccess('authenticated')
        }
      } else if (!success && onAuthFailure) {
        onAuthFailure('Could not complete sign-in. Please try again.')
      }
    }
  }

  const handleUrl = async (event: URLOpenListenerEvent) => {
    await processUrl(event.url)
  }

  // Listen for app URL open events
  const appUrlOpenListener = App.addListener('appUrlOpen', handleUrl)

  // Handle cold-start deep links where appUrlOpen may not fire.
  void App.getLaunchUrl()
    .then((launch) => processUrl(launch?.url ?? ''))
    .catch((error) => {
      console.error('Failed to read launch URL:', error)
      captureException('deep-link-launch-url', error, { step: 'App.getLaunchUrl' }, 'warning')
    })

  // Return cleanup function
  return () => {
    void appUrlOpenListener
      .then((listener) => listener.remove())
      .catch((error) => {
        console.error('Failed to remove deep link listener:', error)
        captureException('deep-link-listener-cleanup', error, { step: 'listener.remove' }, 'warning')
      })
  }
}

/**
 * Check if running on a native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

