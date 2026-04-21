import assert from 'node:assert/strict'

async function main() {
  const { createDefaultBjjState } = await import('../src/lib/bjj-seed')
  const { applyServerProfileFlags, mergeShellProfilePatch, normalizeBjjState, resolveOnboardingDisplayNameDraft } = await import('../src/lib/bjj-state')
  const { createDisplayNameInputBehavior, shouldIgnoreDisplayNameRefill } = await import('../src/lib/display-name-input')

  const identityDisplayName = 'Enes'
  const identityUsername = 'enes'

  const baseline = createDefaultBjjState(identityDisplayName, identityUsername)

  const clearedNameState = normalizeBjjState(
    {
      ...baseline,
      profile: {
        ...baseline.profile,
        displayName: '',
      },
    },
    identityDisplayName,
    identityUsername,
  )

  assert.equal(
    clearedNameState.profile.displayName,
    '',
    'normalizeBjjState should preserve an intentionally cleared displayName during editing',
  )

  const missingNameState = normalizeBjjState(
    {
      ...baseline,
      profile: {
        username: baseline.profile.username,
      },
    },
    identityDisplayName,
    identityUsername,
  )

  assert.equal(
    missingNameState.profile.displayName,
    identityDisplayName,
    'normalizeBjjState should still fall back to the identity displayName when the field is actually missing',
  )

  const typedNameState = normalizeBjjState(
    {
      ...baseline,
      profile: {
        ...baseline.profile,
        displayName: 'Murat',
      },
    },
    identityDisplayName,
    identityUsername,
  )

  assert.equal(typedNameState.profile.displayName, 'Murat')

  const incompleteProfile = {
    ...baseline.profile,
    displayName: 'Local Draft',
    username: 'local-draft',
    belt: 'blue' as const,
    stripes: 2,
    primaryDiscipline: 'BJJ',
    experienceLevel: 'beginner',
    favoriteContentTypes: ['Technique breakdowns'],
    biggestChallenges: ['Training feels scattered'],
    heardFrom: 'Friends',
    onboardingCompleted: false,
    avatarUrl: undefined,
    xp: 50,
    flowStreak: 1,
  }

  const protectedMerge = mergeShellProfilePatch(incompleteProfile, {
    displayName: 'Server Name',
    username: 'server-name',
    belt: 'white',
    stripes: 0,
    primaryDiscipline: 'Wrestling',
    experienceLevel: 'intermediate',
    favoriteContentTypes: ['Drill libraries'],
    biggestChallenges: [],
    heardFrom: 'Google',
    avatarUrl: 'https://example.com/avatar.png',
    xp: 200,
    flowStreak: 4,
  })

  assert.equal(protectedMerge.displayName, 'Server Name')
  assert.equal(protectedMerge.username, 'server-name')
  assert.equal(protectedMerge.belt, 'white')
  assert.equal(protectedMerge.stripes, 0)
  assert.equal(protectedMerge.primaryDiscipline, 'Wrestling')
  assert.equal(protectedMerge.experienceLevel, 'intermediate')
  assert.deepEqual(protectedMerge.favoriteContentTypes, ['Drill libraries'])
  assert.deepEqual(protectedMerge.biggestChallenges, [])
  assert.equal(protectedMerge.heardFrom, 'Google')
  assert.equal(protectedMerge.avatarUrl, 'https://example.com/avatar.png')
  assert.equal(protectedMerge.xp, 200)
  assert.equal(protectedMerge.flowStreak, 4)

  const completeMerge = mergeShellProfilePatch(
    {
      ...incompleteProfile,
      onboardingCompleted: true,
    },
    {
      displayName: 'Server Name',
      belt: 'white',
    },
  )

  assert.equal(completeMerge.displayName, 'Server Name')
  assert.equal(completeMerge.belt, 'white')

  const hydratedProfileFlags = applyServerProfileFlags(incompleteProfile, {
    onboardingCompleted: true,
    paywallCompleted: true,
    coachMarksSeen: true,
  })

  assert.equal(hydratedProfileFlags.onboardingCompleted, true)
  assert.equal(hydratedProfileFlags.paywallCompleted, true)
  assert.equal(hydratedProfileFlags.coachMarksSeen, true)

  const emptyDraftResult = resolveOnboardingDisplayNameDraft('   ')
  assert.equal(emptyDraftResult.error, 'Enter your name to continue')
  assert.equal(emptyDraftResult.value, '')

  const trimmedDraftResult = resolveOnboardingDisplayNameDraft('  Murat  ')
  assert.equal(trimmedDraftResult.error, null)
  assert.equal(trimmedDraftResult.value, 'Murat')

  const lockedOnboardingBehavior = createDisplayNameInputBehavior('onboarding', false, () => {})
  assert.equal(lockedOnboardingBehavior.name, 'dd_name_onboarding')
  assert.equal(lockedOnboardingBehavior.autoComplete, 'new-password')
  assert.equal(lockedOnboardingBehavior.autoCorrect, 'off')
  assert.equal(lockedOnboardingBehavior.spellCheck, false)
  assert.equal(lockedOnboardingBehavior.autoCapitalize, 'none')
  assert.equal(lockedOnboardingBehavior.inputMode, 'text')
  assert.equal(lockedOnboardingBehavior.readOnly, true)
  assert.equal(lockedOnboardingBehavior['data-lpignore'], 'true')
  assert.equal(lockedOnboardingBehavior['data-1p-ignore'], 'true')
  assert.equal(typeof lockedOnboardingBehavior.onFocus, 'function')
  assert.equal(typeof lockedOnboardingBehavior.onPointerDown, 'function')

  const unlockedProfileBehavior = createDisplayNameInputBehavior('profile', true, () => {})
  assert.equal(unlockedProfileBehavior.name, 'dd_name_profile')
  assert.equal(unlockedProfileBehavior.readOnly, false)

  assert.equal(shouldIgnoreDisplayNameRefill({
    sentinelValue: 'enestcp',
    currentValue: 'e',
    nextValue: 'enestcp',
    hasManualEdit: true,
    inputType: 'insertReplacementText',
    isComposing: false,
  }), true, 'should block the iOS refill pattern when the last remaining character is cleared')

  assert.equal(shouldIgnoreDisplayNameRefill({
    sentinelValue: 'enestcp',
    currentValue: '',
    nextValue: 'enestcp',
    hasManualEdit: true,
    inputType: 'insertFromPaste',
    isComposing: false,
  }), false, 'should allow an intentional paste of the original display name')

  assert.equal(shouldIgnoreDisplayNameRefill({
    sentinelValue: 'enestcp',
    currentValue: 'e',
    nextValue: 'enes',
    hasManualEdit: true,
    inputType: 'insertText',
    isComposing: false,
  }), false, 'should allow ordinary user edits that do not restore the sentinel value')

  assert.equal(shouldIgnoreDisplayNameRefill({
    sentinelValue: 'enestcp',
    currentValue: 'e',
    nextValue: 'enestcp',
    hasManualEdit: true,
    inputType: 'insertCompositionText',
    isComposing: true,
  }), false, 'should not block composition flows')

  console.log('BJJ onboarding name normalization tests passed.')
}

void main()
