import assert from 'node:assert/strict'
import {
  resolveNavigation,
  type NavigationBlockReason,
  type NavigationContext,
} from '../src/lib/navigation-machine'
import {
  sanitizePersistedScreenRestore,
  type PersistedNavigationRestoreState,
} from '../src/lib/navigation-restore'
import type { Screen } from '../src/lib/types'

type NavigationTestCase = {
  name: string
  from: Screen
  to: Screen
  fallback?: Screen
  context: NavigationContext
  expected: {
    screen: Screen
    blocked: boolean
    reason?: NavigationBlockReason
  }
}

type RestoreTestCase = {
  name: string
  screen: Screen
  state: PersistedNavigationRestoreState
  expected: {
    screen: Screen
    reason?: string
  }
}

const contexts = {
  unauthenticated: {
    isAuthenticated: false,
    onboardingCompleted: false,
    hasActiveSession: false,
  } satisfies NavigationContext,
  onboardingPending: {
    isAuthenticated: true,
    onboardingCompleted: false,
    hasActiveSession: false,
  } satisfies NavigationContext,
  ready: {
    isAuthenticated: true,
    onboardingCompleted: true,
    hasActiveSession: false,
  } satisfies NavigationContext,
  activeSession: {
    isAuthenticated: true,
    onboardingCompleted: true,
    hasActiveSession: true,
  } satisfies NavigationContext,
}

const cases: NavigationTestCase[] = [
  {
    name: 'Unauthenticated users are redirected to login for protected screens',
    from: 'auth-login',
    to: 'home',
    context: contexts.unauthenticated,
    expected: {
      screen: 'auth-login',
      blocked: true,
      reason: 'auth-required',
    },
  },
  {
    name: 'Unauthenticated users can open auth screens',
    from: 'auth-login',
    to: 'auth-signup',
    context: contexts.unauthenticated,
    expected: {
      screen: 'auth-signup',
      blocked: false,
    },
  },
  {
    name: 'Authenticated users with incomplete onboarding are routed to onboarding',
    from: 'home',
    to: 'training-hub',
    context: contexts.onboardingPending,
    expected: {
      screen: 'onboarding-sport',
      blocked: true,
      reason: 'onboarding-required',
    },
  },
  {
    name: 'Onboarding users can move inside onboarding flow',
    from: 'onboarding-sport',
    to: 'onboarding-schedule',
    context: contexts.onboardingPending,
    expected: {
      screen: 'onboarding-schedule',
      blocked: false,
    },
  },
  {
    name: 'Completed users cannot re-enter onboarding (fallback sanitized)',
    from: 'home',
    to: 'onboarding-sport',
    fallback: 'onboarding-sport',
    context: contexts.ready,
    expected: {
      screen: 'home',
      blocked: true,
      reason: 'onboarding-complete',
    },
  },
  {
    name: 'Active session lock prevents leaving workout session',
    from: 'workout-session',
    to: 'home',
    context: contexts.activeSession,
    expected: {
      screen: 'workout-session',
      blocked: true,
      reason: 'active-session-lock',
    },
  },
  {
    name: 'Workout flow transitions remain valid',
    from: 'workout-session',
    to: 'rest-timer',
    context: contexts.activeSession,
    expected: {
      screen: 'rest-timer',
      blocked: false,
    },
  },
  {
    name: 'Invalid auth-login transition is blocked',
    from: 'auth-login',
    to: 'workout-session',
    context: contexts.ready,
    expected: {
      screen: 'home',
      blocked: true,
      reason: 'invalid-transition',
    },
  },
  {
    name: 'Invalid post-reflection transition is blocked',
    from: 'post-workout-reflection',
    to: 'drill-detail',
    context: contexts.ready,
    expected: {
      screen: 'home',
      blocked: true,
      reason: 'invalid-transition',
    },
  },
  {
    name: 'Training hub can open athlete detail',
    from: 'training-hub',
    to: 'athlete-detail',
    context: contexts.ready,
    expected: {
      screen: 'athlete-detail',
      blocked: false,
    },
  },
  {
    name: 'Athlete detail can open exercise detail',
    from: 'athlete-detail',
    to: 'exercise-detail',
    context: contexts.ready,
    expected: {
      screen: 'exercise-detail',
      blocked: false,
    },
  },
  {
    name: 'Exercise detail can return to user profile area',
    from: 'exercise-detail',
    to: 'user-profile',
    context: contexts.ready,
    expected: {
      screen: 'user-profile',
      blocked: false,
    },
  },
  {
    name: 'Invalid transition from session-complete is blocked',
    from: 'session-complete',
    to: 'training-hub',
    context: contexts.ready,
    expected: {
      screen: 'home',
      blocked: true,
      reason: 'invalid-transition',
    },
  },
  {
    name: 'Edit profile can return to own profile',
    from: 'edit-profile',
    to: 'user-profile',
    context: contexts.ready,
    expected: {
      screen: 'user-profile',
      blocked: false,
    },
  },
  {
    name: 'Loading only allows constrained targets',
    from: 'loading',
    to: 'training-hub',
    context: contexts.ready,
    expected: {
      screen: 'home',
      blocked: true,
      reason: 'invalid-transition',
    },
  },
  {
    name: 'Rest timer cannot exit to home during active session',
    from: 'rest-timer',
    to: 'home',
    context: contexts.activeSession,
    expected: {
      screen: 'workout-session',
      blocked: true,
      reason: 'active-session-lock',
    },
  },
]

const restoreCases: RestoreTestCase[] = [
  {
    name: 'Drill detail restore falls back when selected drill was not persisted',
    screen: 'drill-detail',
    state: {},
    expected: {
      screen: 'training-hub',
      reason: 'selected drill state was not available to restore',
    },
  },
  {
    name: 'Learning path restore succeeds when persisted learning path is present',
    screen: 'learning-path',
    state: {
      selectedLearningPath: {
        id: 'path-1',
        name: 'Takedown Chain',
        description: 'A short path',
        sport: 'wrestling',
        difficulty: 'beginner',
        drills: ['drill-1'],
        estimatedWeeks: 2,
      },
    },
    expected: {
      screen: 'learning-path',
    },
  },
  {
    name: 'Program session editor restore falls back without day context',
    screen: 'program-session-editor',
    state: {
      generatedProgram: [{ id: 'session-1' }],
    },
    expected: {
      screen: 'week-view',
      reason: 'session editor context was not available to restore',
    },
  },
  {
    name: 'Program session editor restore succeeds with day context and program',
    screen: 'program-session-editor',
    state: {
      editingSessionDayIndex: 1,
      generatedProgram: [{ id: 'session-1' }],
    },
    expected: {
      screen: 'program-session-editor',
    },
  },
  {
    name: 'Exercise detail restore falls back when selected exercise was not persisted',
    screen: 'exercise-detail',
    state: {},
    expected: {
      screen: 'sport-exercise-categories',
      reason: 'selected exercise state was not available to restore',
    },
  },
  {
    name: 'Workout detail restore falls back when selected workout was not persisted',
    screen: 'workout-detail',
    state: {},
    expected: {
      screen: 'user-profile',
      reason: 'selected workout state was not available to restore',
    },
  },
]

for (const testCase of cases) {
  const result = resolveNavigation({
    from: testCase.from,
    to: testCase.to,
    fallback: testCase.fallback,
    context: testCase.context,
  })

  assert.equal(
    result.screen,
    testCase.expected.screen,
    `${testCase.name}: expected screen "${testCase.expected.screen}" but got "${result.screen}"`
  )
  assert.equal(
    result.blocked,
    testCase.expected.blocked,
    `${testCase.name}: expected blocked "${testCase.expected.blocked}" but got "${result.blocked}"`
  )
  assert.equal(
    result.reason,
    testCase.expected.reason,
    `${testCase.name}: expected reason "${testCase.expected.reason ?? 'none'}" but got "${result.reason ?? 'none'}"`
  )
}

for (const testCase of restoreCases) {
  const result = sanitizePersistedScreenRestore(testCase.screen, testCase.state)

  assert.equal(
    result.screen,
    testCase.expected.screen,
    `${testCase.name}: expected screen "${testCase.expected.screen}" but got "${result.screen}"`
  )
  assert.equal(
    result.reason,
    testCase.expected.reason,
    `${testCase.name}: expected reason "${testCase.expected.reason ?? 'none'}" but got "${result.reason ?? 'none'}"`
  )
}

console.log(`Navigation machine tests passed (${cases.length} navigation cases, ${restoreCases.length} restore cases).`)
