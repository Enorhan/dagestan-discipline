import assert from 'node:assert/strict'
import type { Session as AuthSession } from '@supabase/supabase-js'
import {
  BILLING_ACCESS_TOKEN_EXPIRY_SKEW_MS,
  createBillingAccessTokenCacheSnapshot,
  getBillingAccessTokenFromCache,
  isBillingAccessTokenCacheUsable,
} from '@/lib/billing-auth-token-cache'

const now = Date.UTC(2026, 2, 9, 12, 0, 0)

const freshSession = {
  access_token: 'fresh-token',
  expires_at: Math.floor((now + BILLING_ACCESS_TOKEN_EXPIRY_SKEW_MS + 120_000) / 1000),
} as AuthSession

const freshSnapshot = createBillingAccessTokenCacheSnapshot(freshSession)
assert.equal(freshSnapshot.accessToken, 'fresh-token')
assert.equal(isBillingAccessTokenCacheUsable(freshSnapshot, now), true)
assert.equal(getBillingAccessTokenFromCache(freshSnapshot, now), 'fresh-token')

const expiringSoonSession = {
  access_token: 'expiring-soon',
  expires_at: Math.floor((now + BILLING_ACCESS_TOKEN_EXPIRY_SKEW_MS - 5_000) / 1000),
} as AuthSession

const expiringSoonSnapshot = createBillingAccessTokenCacheSnapshot(expiringSoonSession)
assert.equal(isBillingAccessTokenCacheUsable(expiringSoonSnapshot, now), false)
assert.equal(getBillingAccessTokenFromCache(expiringSoonSnapshot, now), null)

const sessionWithoutExpiry = {
  access_token: 'no-expiry-token',
  expires_at: undefined,
} as AuthSession

const noExpirySnapshot = createBillingAccessTokenCacheSnapshot(sessionWithoutExpiry)
assert.equal(isBillingAccessTokenCacheUsable(noExpirySnapshot, now), true)
assert.equal(getBillingAccessTokenFromCache(noExpirySnapshot, now), 'no-expiry-token')

const emptySnapshot = createBillingAccessTokenCacheSnapshot(null)
assert.equal(isBillingAccessTokenCacheUsable(emptySnapshot, now), false)
assert.equal(getBillingAccessTokenFromCache(emptySnapshot, now), null)

console.log('Billing auth cache tests passed.')