import assert from 'node:assert/strict'
import {
  resolveHydratedScreenWithoutStorage,
  resolvePersistedHydratedScreen,
  type PersistedHydrationState,
} from '../src/lib/hydration-restore'
import type { Screen } from '../src/lib/types'

type NoStorageCase = {
  name: string
  previousScreen: Screen
  needsOnboarding: boolean
  expectedScreen: Screen
}

type PersistedCase = {
  name: string
  savedScreen: unknown
  needsOnboarding: boolean
  state: PersistedHydrationState
  expected: {
    screen: Screen
    requestedScreen?: Screen
    reason?: string
    navigationErrorMessage?: string
    showResumePrompt: boolean
  }
}

const noStorageCases: NoStorageCase[] = [
  { name: 'Onboarding users resume the equipment step instead of generating', previousScreen: 'onboarding-generating', needsOnboarding: true, expectedScreen: 'onboarding-equipment' },
  { name: 'Onboarding users fall back to onboarding-sport from non-onboarding screens', previousScreen: 'home', needsOnboarding: true, expectedScreen: 'onboarding-sport' },
  { name: 'Completed users leave auth screens for loading when no state exists', previousScreen: 'auth-login', needsOnboarding: false, expectedScreen: 'loading' },
]

const persistedCases: PersistedCase[] = [
  {
    name: 'Unknown persisted routes fall back to navigation-not-set with an error',
    savedScreen: 'ghost-screen',
    needsOnboarding: false,
    state: {},
    expected: {
      screen: 'navigation-not-set',
      navigationErrorMessage: 'The previous route is not available in this build.',
      showResumePrompt: false,
    },
  },
  {
    name: 'Onboarding restores generating to equipment',
    savedScreen: 'onboarding-generating',
    needsOnboarding: true,
    state: {},
    expected: {
      screen: 'onboarding-equipment',
      requestedScreen: 'onboarding-generating',
      showResumePrompt: false,
    },
  },
  {
    name: 'Onboarding explainer falls back when no program was restored',
    savedScreen: 'onboarding-program-explainer',
    needsOnboarding: true,
    state: {},
    expected: {
      screen: 'onboarding-equipment',
      requestedScreen: 'onboarding-program-explainer',
      showResumePrompt: false,
    },
  },
  {
    name: 'Onboarding explainer is preserved when a program exists',
    savedScreen: 'onboarding-program-explainer',
    needsOnboarding: true,
    state: { generatedProgram: [{ id: 'session-1' }] },
    expected: {
      screen: 'onboarding-program-explainer',
      requestedScreen: 'onboarding-program-explainer',
      showResumePrompt: false,
    },
  },
  {
    name: 'Authenticated restores never return to auth screens',
    savedScreen: 'auth-login',
    needsOnboarding: false,
    state: {},
    expected: {
      screen: 'home',
      requestedScreen: 'home',
      showResumePrompt: false,
    },
  },
  {
    name: 'Restore requirements still sanitize unavailable drill-detail context',
    savedScreen: 'drill-detail',
    needsOnboarding: false,
    state: {},
    expected: {
      screen: 'training-hub',
      requestedScreen: 'drill-detail',
      reason: 'selected drill state was not available to restore',
      showResumePrompt: false,
    },
  },
  {
    name: 'Restored active session screens trigger the resume prompt',
    savedScreen: 'rest-timer',
    needsOnboarding: false,
    state: { sessionStartTime: 12345 },
    expected: {
      screen: 'rest-timer',
      requestedScreen: 'rest-timer',
      showResumePrompt: true,
    },
  },
]

for (const testCase of noStorageCases) {
  const result = resolveHydratedScreenWithoutStorage(testCase.previousScreen, testCase.needsOnboarding)
  assert.equal(result, testCase.expectedScreen, `${testCase.name}: expected ${testCase.expectedScreen} but got ${result}`)
}

for (const testCase of persistedCases) {
  const result = resolvePersistedHydratedScreen(testCase.savedScreen, testCase.state, testCase.needsOnboarding)
  assert.equal(result.screen, testCase.expected.screen, `${testCase.name}: expected screen ${testCase.expected.screen} but got ${result.screen}`)
  assert.equal(result.requestedScreen, testCase.expected.requestedScreen, `${testCase.name}: requested screen mismatch`)
  assert.equal(result.reason, testCase.expected.reason, `${testCase.name}: reason mismatch`)
  assert.equal(result.navigationError?.message, testCase.expected.navigationErrorMessage, `${testCase.name}: navigation error mismatch`)
  assert.equal(result.showResumePrompt, testCase.expected.showResumePrompt, `${testCase.name}: resume prompt mismatch`)
}

console.log(`Hydration restore tests passed (${noStorageCases.length} no-storage cases, ${persistedCases.length} persisted cases).`)