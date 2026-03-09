import type { Session as AuthSession } from '@supabase/supabase-js'

export interface BillingAccessTokenCacheSnapshot {
  accessToken: string | null
  expiresAtMs: number | null
}

export const BILLING_ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000

export const EMPTY_BILLING_ACCESS_TOKEN_CACHE_SNAPSHOT: BillingAccessTokenCacheSnapshot = {
  accessToken: null,
  expiresAtMs: null,
}

export function createBillingAccessTokenCacheSnapshot(
  session: AuthSession | null | undefined
): BillingAccessTokenCacheSnapshot {
  return {
    accessToken: session?.access_token ?? null,
    expiresAtMs: typeof session?.expires_at === 'number'
      ? session.expires_at * 1000
      : null,
  }
}

export function isBillingAccessTokenCacheUsable(
  snapshot: BillingAccessTokenCacheSnapshot,
  now: number = Date.now()
): boolean {
  if (!snapshot.accessToken) {
    return false
  }

  if (!snapshot.expiresAtMs) {
    return true
  }

  return snapshot.expiresAtMs - now > BILLING_ACCESS_TOKEN_EXPIRY_SKEW_MS
}

export function getBillingAccessTokenFromCache(
  snapshot: BillingAccessTokenCacheSnapshot,
  now: number = Date.now()
): string | null {
  return isBillingAccessTokenCacheUsable(snapshot, now)
    ? snapshot.accessToken
    : null
}