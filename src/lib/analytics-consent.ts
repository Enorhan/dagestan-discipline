// Lightweight analytics consent layer.
//
// MatFlow's analytics are first-party (Vercel Analytics + buffered error reports).
// We do not use IDFA, share data with brokers, or track across other apps, so
// Apple's App Tracking Transparency prompt is not required.  This module exists
// so users can still opt out of first-party product analytics from Settings.
//
// Default is opted-in; the disclosure lives in privacy-policy.html.

const CONSENT_STORAGE_KEY = 'matflow.analyticsConsent'

type AnalyticsConsentListener = (consented: boolean) => void
const listeners = new Set<AnalyticsConsentListener>()

function safeReadLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteLocalStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Ignore storage failures \u2013 consent should never break the app.
  }
}

export function getAnalyticsConsent(): boolean {
  const stored = safeReadLocalStorage(CONSENT_STORAGE_KEY)
  if (stored === '0' || stored === 'false') return false
  return true
}

export function setAnalyticsConsent(consented: boolean): void {
  safeWriteLocalStorage(CONSENT_STORAGE_KEY, consented ? '1' : '0')
  for (const listener of listeners) {
    try {
      listener(consented)
    } catch {
      // Ignore listener failures.
    }
  }
}

export function subscribeAnalyticsConsent(listener: AnalyticsConsentListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

