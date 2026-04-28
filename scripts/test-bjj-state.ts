import assert from 'node:assert/strict'

async function main() {
  const {
    BJJ_PROFILE_FLAGS_STORAGE_KEY,
    BJJ_UI_PREFS_STORAGE_KEY,
    applyServerProfileFlags,
    mergePersistedShellProfileFlags,
    normalizeBjjState,
    normalizePersistedShellProfileFlags,
    normalizePersistedShellUiPrefs,
  } = await import('../src/lib/bjj-state')
  const { BJJ_STORAGE_KEY, createDefaultBjjState } = await import('../src/lib/bjj-seed')

  assert.equal(BJJ_PROFILE_FLAGS_STORAGE_KEY, `${BJJ_STORAGE_KEY}:profile-flags`)
  assert.equal(BJJ_UI_PREFS_STORAGE_KEY, `${BJJ_STORAGE_KEY}:ui-prefs`)

  assert.deepEqual(
    normalizePersistedShellProfileFlags({
      onboardingCompleted: true,
      paywallCompleted: false,
      coachMarksSeen: true,
      ignored: 'value',
    }),
    {
      onboardingCompleted: true,
      coachMarksSeen: true,
    },
  )

  const stickyFlags = mergePersistedShellProfileFlags(
    { onboardingCompleted: true },
    { paywallCompleted: true },
    { coachMarksSeen: true },
    { onboardingCompleted: false, paywallCompleted: false, coachMarksSeen: false },
  )

  assert.deepEqual(stickyFlags, {
    onboardingCompleted: true,
    paywallCompleted: true,
    coachMarksSeen: true,
  })

  assert.deepEqual(
    normalizePersistedShellUiPrefs({
      selectedBottomTab: 'social',
      selectedSessionsTab: 'social-feed',
      selectedTechniquesTab: 'discover',
      socialSurface: 'boxing',
      socialHomeRail: 'following',
      selectedTechniqueBranch: 'grappling',
      selectedSystemBranch: 'boxing',
    }),
    {
      selectedBottomTab: 'community',
      selectedTechniquesTab: 'discover',
      socialSurface: 'boxing',
      socialHomeRail: 'following',
      selectedTechniqueBranch: 'grappling',
      selectedSystemBranch: 'boxing',
    },
  )

  const defaultState = createDefaultBjjState('Enes', 'enes')
  const hydratedProfile = applyServerProfileFlags(defaultState.profile, stickyFlags)

  assert.equal(hydratedProfile.onboardingCompleted, true)
  assert.equal(hydratedProfile.paywallCompleted, true)
  assert.equal(hydratedProfile.coachMarksSeen, true)

  const normalizedState = normalizeBjjState({
    selectedBottomTab: 'social',
    selectedSessionsTab: 'social-feed',
    socialSurface: 'explore',
    socialHomeRail: 'following',
  }, 'Enes', 'enes')

  assert.equal(normalizedState.selectedBottomTab, 'community')
  assert.equal(normalizedState.selectedSessionsTab, 'my-sessions')
  assert.equal(normalizedState.socialSurface, 'bjj')
  assert.equal(normalizedState.socialHomeRail, 'following')

  console.log('BJJ state persistence tests passed.')
}

void main()
