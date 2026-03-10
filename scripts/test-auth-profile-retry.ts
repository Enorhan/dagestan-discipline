import assert from 'node:assert/strict'
import type { UserProfile } from '../src/lib/social-types'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

async function main() {
  const { resolveAuthenticatedProfileWithRetry } = await import('../src/lib/supabase-service')

  const baseProfile: UserProfile = {
    id: 'user-1',
    username: 'dagestani_disciple',
    displayName: 'Dagestani Disciple',
    sport: 'wrestling',
    createdAt: '2026-03-09T12:00:00.000Z',
    workoutCount: 0,
    followerCount: 0,
    followingCount: 0,
    totalSaves: 0,
  }

  let delayedAttempts = 0
  const recoveredAfterRetry = await resolveAuthenticatedProfileWithRetry(async () => {
    delayedAttempts += 1
    if (delayedAttempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      return null
    }
    return baseProfile
  }, {
    attempts: 3,
    attemptTimeoutMs: 120,
    retryDelayMs: 5,
  })

  assert.deepEqual(recoveredAfterRetry, baseProfile)
  assert.equal(delayedAttempts, 2)

  let timeoutAttempts = 0
  const recoveredAfterTimeout = await resolveAuthenticatedProfileWithRetry(async () => {
    timeoutAttempts += 1
    if (timeoutAttempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 320))
    }
    return baseProfile
  }, {
    attempts: 2,
    attemptTimeoutMs: 250,
    retryDelayMs: 5,
  })

  assert.deepEqual(recoveredAfterTimeout, baseProfile)
  assert.equal(timeoutAttempts, 2)

  let missingAttempts = 0
  const missingProfile = await resolveAuthenticatedProfileWithRetry(async () => {
    missingAttempts += 1
    return null
  }, {
    attempts: 3,
    attemptTimeoutMs: 20,
    retryDelayMs: 0,
  })

  assert.equal(missingProfile, null)
  assert.equal(missingAttempts, 3)

  console.log('Auth profile retry tests passed.')
}

void main()