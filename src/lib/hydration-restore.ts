import {
  sanitizePersistedScreenRestore,
  type PersistedNavigationRestoreState,
} from './navigation-restore'
import type { Screen } from './types'

const HYDRATION_AUTH_SCREENS: ReadonlySet<Screen> = new Set(['auth-login', 'auth-signup', 'loading'])
const HYDRATION_NO_STORAGE_AUTH_SCREENS: ReadonlySet<Screen> = new Set(['auth-login', 'auth-signup'])
const RESUMABLE_SESSION_SCREENS: ReadonlySet<Screen> = new Set(['workout-session', 'rest-timer'])

const ONBOARDING_FLOW_SCREENS: ReadonlySet<Screen> = new Set([
  'onboarding-sport',
  'onboarding-schedule',
  'onboarding-level',
  'onboarding-intake',
  'onboarding-equipment',
  'onboarding-generating',
  'onboarding-program-explainer',
  'onboarding-app-tour',
])

const IMPLEMENTED_HYDRATION_SCREENS: ReadonlySet<Screen> = new Set([
  ...ONBOARDING_FLOW_SCREENS,
  'home',
  'today-editor',
  'settings',
  'log-activity',
  'training-stats',
  'training-hub',
  'drill-detail',
  'athlete-detail',
  'category-list',
  'routine-player',
  'learning-path',
  'body-part-selector',
  'week-view',
  'program-session-editor',
  'workout-session',
  'rest-timer',
  'session-complete',
  'exercise-list',
  'sport-exercise-categories',
  'sport-category-exercises',
  'exercise-detail',
  'post-workout-reflection',
  'missed-session-accountability',
  'round-timer',
  'loading',
  'auth-login',
  'auth-signup',
  'workout-builder',
  'user-profile',
  'edit-profile',
  'workout-detail',
  'navigation-not-set',
])

export interface HydrationNavigationError {
  message: string
  details?: string
}

export interface PersistedHydrationState extends PersistedNavigationRestoreState {
  sessionStartTime?: unknown
}

export interface PersistedHydrationDecision {
  screen: Screen
  requestedScreen?: Screen
  reason?: string
  navigationError: HydrationNavigationError | null
  showResumePrompt: boolean
}

const hasRestoredProgram = (value: unknown): boolean => Array.isArray(value) && value.length > 0

export function resolveHydratedScreenWithoutStorage(previousScreen: Screen, needsOnboarding: boolean): Screen {
  const onboardingResumeScreen = previousScreen === 'onboarding-generating' ? 'onboarding-equipment' : previousScreen

  if (needsOnboarding) {
    return ONBOARDING_FLOW_SCREENS.has(onboardingResumeScreen) ? onboardingResumeScreen : 'onboarding-sport'
  }

  return HYDRATION_NO_STORAGE_AUTH_SCREENS.has(previousScreen) ? 'loading' : previousScreen
}

export function resolvePersistedHydratedScreen(
  savedScreen: unknown,
  state: PersistedHydrationState,
  needsOnboarding: boolean,
): PersistedHydrationDecision {
  const normalizedScreen = typeof savedScreen === 'string' ? savedScreen : 'home'
  if (!IMPLEMENTED_HYDRATION_SCREENS.has(normalizedScreen as Screen)) {
    return {
      screen: 'navigation-not-set',
      navigationError: {
        message: 'The previous route is not available in this build.',
        details: `Saved route: ${String(normalizedScreen)}`,
      },
      showResumePrompt: false,
    }
  }

  const parsed = normalizedScreen as Screen
  const showResumePrompt = !!state.sessionStartTime && RESUMABLE_SESSION_SCREENS.has(parsed)

  if (needsOnboarding) {
    let onboardingScreen: Screen = ONBOARDING_FLOW_SCREENS.has(parsed) ? parsed : 'onboarding-sport'
    if (onboardingScreen === 'onboarding-generating') {
      onboardingScreen = 'onboarding-equipment'
    }
    if (
      (onboardingScreen === 'onboarding-program-explainer' || onboardingScreen === 'onboarding-app-tour')
      && !hasRestoredProgram(state.generatedProgram)
    ) {
      onboardingScreen = 'onboarding-equipment'
    }

    return {
      screen: onboardingScreen,
      requestedScreen: parsed,
      navigationError: null,
      showResumePrompt,
    }
  }

  const requestedScreen = HYDRATION_AUTH_SCREENS.has(parsed) ? 'home' : parsed
  const restoreDecision = sanitizePersistedScreenRestore(requestedScreen, state)

  return {
    screen: restoreDecision.screen,
    requestedScreen,
    reason: restoreDecision.screen !== requestedScreen ? restoreDecision.reason : undefined,
    navigationError: null,
    showResumePrompt,
  }
}