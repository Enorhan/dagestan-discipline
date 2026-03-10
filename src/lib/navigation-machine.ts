import type { Screen } from './types'

const AUTH_SCREENS: ReadonlySet<Screen> = new Set([
  'auth-login',
  'auth-signup',
  'email-verification-pending',
  'loading',
])

const ONBOARDING_SCREENS: ReadonlySet<Screen> = new Set([
  'onboarding-sport',
  'onboarding-schedule',
  'onboarding-level',
  'onboarding-intake',
  'onboarding-equipment',
  'onboarding-generating',
  'onboarding-program-explainer',
  'onboarding-app-tour',
])

const SESSION_LOCK_SCREENS: ReadonlySet<Screen> = new Set([
  'workout-session',
  'rest-timer',
])

export interface NavigationContext {
  isAuthenticated: boolean
  onboardingCompleted: boolean
  hasActiveSession: boolean
}

export interface NavigationRequest {
  from: Screen
  to: Screen
  fallback?: Screen
  context: NavigationContext
}

export interface NavigationDecision {
  screen: Screen
  blocked: boolean
  reason?: NavigationBlockReason
}

export type NavigationBlockReason =
  | 'auth-required'
  | 'onboarding-required'
  | 'onboarding-complete'
  | 'active-session-lock'
  | 'invalid-transition'

const getDefaultFallback = (context: NavigationContext): Screen => (
  context.isAuthenticated ? 'home' : 'auth-login'
)

const sanitizeFallback = (fallback: Screen, context: NavigationContext): Screen => {
  if (!context.isAuthenticated && !AUTH_SCREENS.has(fallback)) {
    return 'auth-login'
  }

  if (context.isAuthenticated && context.onboardingCompleted && ONBOARDING_SCREENS.has(fallback)) {
    return 'home'
  }

  return fallback
}

const PRIMARY_APP_SCREENS: Screen[] = [
  'home',
  'training-hub',
  'week-view',
  'settings',
  'user-profile',
]

const COMMON_DESTINATIONS: Screen[] = [
  ...PRIMARY_APP_SCREENS,
  'training-stats',
  'workout-builder',
  'today-editor',
  'log-activity',
]

const withCommonDestinations = (extra: Screen[]): ReadonlySet<Screen> => (
  new Set([...COMMON_DESTINATIONS, ...extra])
)

const TRANSITION_OVERRIDES: Partial<Record<Screen, ReadonlySet<Screen>>> = {
  'auth-login': new Set(['auth-signup', 'email-verification-pending', 'loading', 'onboarding-sport', 'home']),
  'auth-signup': new Set(['auth-login', 'email-verification-pending', 'onboarding-schedule']),
  'email-verification-pending': new Set(['auth-login', 'onboarding-schedule', 'home']),
  'onboarding-sport': new Set(['onboarding-schedule', 'auth-login']),
  'onboarding-schedule': new Set([
    'onboarding-generating',
    'onboarding-level',
    'onboarding-intake',
    'onboarding-equipment',
    'onboarding-sport',
  ]),
  'onboarding-level': new Set(['onboarding-intake', 'onboarding-schedule']),
  'onboarding-intake': new Set(['onboarding-equipment', 'onboarding-level', 'onboarding-schedule']),
  'onboarding-equipment': new Set(['onboarding-generating', 'onboarding-program-explainer', 'onboarding-intake', 'onboarding-schedule']),
  'onboarding-generating': new Set(['onboarding-program-explainer', 'onboarding-equipment', 'onboarding-schedule', 'home']),
  'onboarding-program-explainer': new Set(['onboarding-app-tour', 'onboarding-equipment', 'home']),
  'onboarding-app-tour': new Set(['home', 'onboarding-program-explainer', 'onboarding-equipment']),
  'loading': new Set(['home', 'onboarding-sport', 'auth-login']),
  'navigation-not-set': new Set(['home', 'training-hub', 'week-view', 'settings', 'user-profile', 'auth-login']),
  'home': withCommonDestinations([
    'round-timer',
    'workout-session',
    'session-complete',
    'missed-session-accountability',
    'sport-exercise-categories',
    'sport-category-exercises',
    'exercise-detail',
  ]),
  'today-editor': withCommonDestinations([
    'program-session-editor',
    'drill-detail',
    'workout-session',
  ]),
  'week-view': withCommonDestinations([
    'program-session-editor',
    'workout-session',
  ]),
  'settings': withCommonDestinations([
    'auth-login',
    'loading',
  ]),
  'training-stats': withCommonDestinations([]),
  'training-hub': withCommonDestinations([
    'drill-detail',
    'category-list',
    'routine-player',
    'learning-path',
    'body-part-selector',
    'athlete-detail',
    'sport-exercise-categories',
    'sport-category-exercises',
    'exercise-detail',
  ]),
  'drill-detail': withCommonDestinations([
    'training-hub',
    'category-list',
    'learning-path',
    'body-part-selector',
  ]),
  'category-list': withCommonDestinations([
    'drill-detail',
    'training-hub',
  ]),
  'routine-player': withCommonDestinations([
    'training-hub',
  ]),
  'learning-path': withCommonDestinations([
    'drill-detail',
    'training-hub',
  ]),
  'body-part-selector': withCommonDestinations([
    'training-hub',
    'category-list',
  ]),
  'athlete-detail': withCommonDestinations([
    'exercise-detail',
    'training-hub',
    'sport-exercise-categories',
    'sport-category-exercises',
  ]),
  'sport-exercise-categories': withCommonDestinations([
    'training-hub',
    'sport-category-exercises',
    'exercise-detail',
  ]),
  'sport-category-exercises': withCommonDestinations([
    'training-hub',
    'sport-exercise-categories',
    'exercise-detail',
  ]),
  'exercise-detail': withCommonDestinations([
    'athlete-detail',
    'sport-category-exercises',
    'sport-exercise-categories',
  ]),
  'log-activity': withCommonDestinations([
    'home',
    'week-view',
  ]),
  'workout-builder': withCommonDestinations([
    'user-profile',
    'workout-detail',
  ]),
  'user-profile': withCommonDestinations([
    'workout-detail',
    'edit-profile',
  ]),
  'edit-profile': withCommonDestinations([
    'user-profile',
  ]),
  'workout-detail': withCommonDestinations([
    'user-profile',
    'workout-builder',
    'workout-session',
  ]),
  'program-session-editor': withCommonDestinations([
    'week-view',
  ]),
  'missed-session-accountability': withCommonDestinations([
    'home',
  ]),
  'round-timer': withCommonDestinations([
    'home',
  ]),
  'workout-session': new Set(['rest-timer', 'post-workout-reflection', 'home']),
  'rest-timer': new Set(['workout-session', 'post-workout-reflection']),
  'post-workout-reflection': new Set(['session-complete', 'home']),
  'session-complete': new Set(['home', 'week-view']),
}

export function resolveNavigation(request: NavigationRequest): NavigationDecision {
  const { from, to, context } = request
  const fallback = sanitizeFallback(request.fallback ?? getDefaultFallback(context), context)

  if (to === from) {
    return { screen: to, blocked: false }
  }

  if (!context.isAuthenticated) {
    if (!AUTH_SCREENS.has(to)) {
      return { screen: 'auth-login', blocked: true, reason: 'auth-required' }
    }
    return { screen: to, blocked: false }
  }

  if (!context.onboardingCompleted) {
    if (!ONBOARDING_SCREENS.has(to) && !AUTH_SCREENS.has(to) && to !== 'navigation-not-set') {
      return { screen: 'onboarding-sport', blocked: true, reason: 'onboarding-required' }
    }
    return { screen: to, blocked: false }
  }

  if (ONBOARDING_SCREENS.has(to)) {
    return { screen: fallback, blocked: true, reason: 'onboarding-complete' }
  }

  if (context.hasActiveSession && SESSION_LOCK_SCREENS.has(from) && !SESSION_LOCK_SCREENS.has(to)) {
    return { screen: 'workout-session', blocked: true, reason: 'active-session-lock' }
  }

  const allowedTargets = TRANSITION_OVERRIDES[from]
  if (allowedTargets && !allowedTargets.has(to)) {
    return { screen: fallback, blocked: true, reason: 'invalid-transition' }
  }

  return { screen: to, blocked: false }
}
