import type { LearningPath, Screen } from './types'

export interface PersistedNavigationRestoreState {
  currentScreen?: unknown
  generatedProgram?: unknown
  editingSessionDayIndex?: unknown
  selectedDrill?: unknown
  selectedAthlete?: unknown
  selectedCategory?: unknown
  selectedRoutine?: unknown
  selectedLearningPath?: unknown
  selectedExercise?: unknown
  selectedWorkout?: unknown
}

export interface NavigationRestoreDecision {
  screen: Screen
  reason?: string
}

type RestoreRequirement = {
  fallback: Screen
  reason: string
  isSatisfied: (state: PersistedNavigationRestoreState) => boolean
}

const hasNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
)

const hasObjectId = (value: unknown): value is { id: string } => (
  !!value
  && typeof value === 'object'
  && hasNonEmptyString((value as { id?: unknown }).id)
)

const hasLearningPath = (value: unknown): value is LearningPath => (
  hasObjectId(value)
  && Array.isArray((value as Partial<LearningPath>).drills)
)

const hasGeneratedProgram = (value: unknown): boolean => (
  Array.isArray(value) && value.length > 0
)

const hasEditableProgramSession = (state: PersistedNavigationRestoreState): boolean => (
  Number.isInteger(state.editingSessionDayIndex)
  && Number(state.editingSessionDayIndex) >= 0
  && hasGeneratedProgram(state.generatedProgram)
)

const RESTORE_REQUIREMENTS: Partial<Record<Screen, RestoreRequirement>> = {
  'drill-detail': {
    fallback: 'training-hub',
    reason: 'selected drill state was not available to restore',
    isSatisfied: (state) => hasObjectId(state.selectedDrill),
  },
  'athlete-detail': {
    fallback: 'training-hub',
    reason: 'selected athlete state was not available to restore',
    isSatisfied: (state) => hasObjectId(state.selectedAthlete),
  },
  'category-list': {
    fallback: 'training-hub',
    reason: 'selected category state was not available to restore',
    isSatisfied: (state) => hasNonEmptyString(state.selectedCategory),
  },
  'routine-player': {
    fallback: 'training-hub',
    reason: 'selected routine state was not available to restore',
    isSatisfied: (state) => hasObjectId(state.selectedRoutine),
  },
  'learning-path': {
    fallback: 'training-hub',
    reason: 'selected learning path state was not available to restore',
    isSatisfied: (state) => hasLearningPath(state.selectedLearningPath),
  },
  'program-session-editor': {
    fallback: 'week-view',
    reason: 'session editor context was not available to restore',
    isSatisfied: hasEditableProgramSession,
  },
  'exercise-detail': {
    fallback: 'sport-exercise-categories',
    reason: 'selected exercise state was not available to restore',
    isSatisfied: (state) => hasObjectId(state.selectedExercise),
  },
  'workout-detail': {
    fallback: 'user-profile',
    reason: 'selected workout state was not available to restore',
    isSatisfied: (state) => hasObjectId(state.selectedWorkout),
  },
}

export function sanitizePersistedScreenRestore(
  screen: Screen,
  state: PersistedNavigationRestoreState,
): NavigationRestoreDecision {
  const requirement = RESTORE_REQUIREMENTS[screen]
  if (!requirement || requirement.isSatisfied(state)) {
    return { screen }
  }

  return {
    screen: requirement.fallback,
    reason: requirement.reason,
  }
}