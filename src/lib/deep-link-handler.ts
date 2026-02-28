'use client'

import { App, URLOpenListenerEvent } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

// Deep link URL scheme
const URL_SCHEME = 'dagestanidiscipline://'

/**
 * Extracts auth tokens from a deep link URL
 * Supabase sends tokens in the URL fragment (after #) or as query params
 */
function extractAuthTokens(url: string): { accessToken?: string; refreshToken?: string; type?: string } | null {
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
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken, type: type || undefined }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting auth tokens:', error)
    return null
  }
}

/**
 * Handles deep link auth callbacks
 * Sets the session in Supabase when receiving auth tokens
 */
async function handleAuthCallback(url: string): Promise<boolean> {
  const tokens = extractAuthTokens(url)
  
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return false
  }
  
  try {
    const { error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    })
    
    if (error) {
      console.error('Error setting session from deep link:', error)
      return false
    }
    
    console.log('Successfully authenticated via deep link, type:', tokens.type)
    return true
  } catch (error) {
    console.error('Error handling auth callback:', error)
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
export type DeepLinkSubscriptionCallback = (status: 'success' | 'canceled') => void

/**
 * Initialize deep link listener for Capacitor
 * Call this once when the app starts
 */
export function initDeepLinkHandler(
  onAuthSuccess?: DeepLinkAuthCallback,
  onSubscription?: DeepLinkSubscriptionCallback
): () => void {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return () => {}
  }

  const handleUrl = async (event: URLOpenListenerEvent) => {
    const url = event.url

    // Check if this is our app's URL scheme
    if (!url.startsWith(URL_SCHEME)) {
      return
    }

    console.log('Deep link received:', url)

    // Handle subscription callbacks
    if (url.includes('subscription=')) {
      const params = new URLSearchParams(url.split('?')[1] || '')
      const subscriptionStatus = params.get('subscription')

      if (subscriptionStatus && onSubscription) {
        onSubscription(subscriptionStatus as 'success' | 'canceled')
      }
      return
    }

    // Handle auth callbacks
    if (url.includes('auth/callback') || url.includes('access_token')) {
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
      }
    }
  }

  // Listen for app URL open events
  App.addListener('appUrlOpen', handleUrl)

  // Return cleanup function
  return () => {
    App.removeAllListeners()
  }
}

/**
 * Check if running on a native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

