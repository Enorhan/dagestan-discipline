import assert from 'node:assert/strict'
import type { ReactElement, ReactNode } from 'react'
import type { Athlete, EnhancedExerciseData, Screen, Session, SportType } from '../src/lib/types'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

function expectElement<Props extends Record<string, unknown>>(
  node: ReactNode,
  message: string
): ReactElement<Props> {
  assert.ok(node && typeof node === 'object' && 'type' in node && 'props' in node, message)
  return node as ReactElement<Props>
}

const athlete = {
  id: 'athlete-1',
  name: 'Khabib Nurmagomedov',
  sport: 'wrestling',
  achievements: ['UFC Champion'],
} satisfies Athlete

const exercise = {
  id: 'exercise-1',
  name: 'Sled Push',
  category: 'conditioning',
  muscleGroups: ['Legs'],
  equipment: ['Sled'],
  isWeighted: true,
  sport: 'wrestling',
  athleteId: 'athlete-1',
  athleteName: 'Khabib Nurmagomedov',
  athleteAchievements: ['UFC Champion'],
  priority: 9,
} satisfies EnhancedExerciseData

const session = {
  id: 'session-1',
  day: 'Monday',
  focus: 'Power',
  duration: 60,
  exercises: [],
} satisfies Session

const navigationCalls: Screen[] = []
const sportSelectionCalls: SportType[] = []
const backCalls: Array<Screen | undefined> = []
const scrollCalls: Array<{ screen: Screen; scrollTop: number }> = []

const noop = () => {}
const asyncNoop = async () => {}

async function main() {
  const [
    { TrainingLibraryRoutes },
    { AthleteDetail },
    { CategoryList },
    { ExerciseDetail },
    { SportExerciseCategories },
    { TrainingHub },
  ] = await Promise.all([
    import('../src/components/app/training-library-routes'),
    import('../src/components/screens/athlete-detail'),
    import('../src/components/screens/category-list'),
    import('../src/components/screens/exercise-detail'),
    import('../src/components/screens/sport-exercise-categories'),
    import('../src/components/screens/training-hub'),
  ])

  type TrainingLibraryRoutesProps = Parameters<typeof TrainingLibraryRoutes>[0]

  const baseProps: TrainingLibraryRoutesProps = {
    currentScreen: 'training-hub',
    contentDataVersion: 3,
    selectedSport: 'wrestling',
    displaySession: session,
    selectedDrill: null,
    selectedAthlete: athlete,
    selectedCategory: null,
    selectedSubcategory: null,
    selectedTrainingSport: null,
    selectedRoutine: null,
    selectedLearningPath: null,
    selectedExerciseSport: 'wrestling',
    selectedExerciseCategory: 'legs',
    selectedExercise: exercise,
    userExperienceLevel: 'intermediate',
    learningPathProgress: {},
    isPremium: false,
    learningPathUsage: 1,
    hasWorkoutToday: true,
    todayActiveDrillIdSet: new Set(),
    todayWorkoutExerciseIds: new Set([exercise.id]),
    workoutExerciseIds: new Set([exercise.id]),
    favoriteExercises: new Set([exercise.id]),
    completedExercises: new Set([exercise.id]),
    screenScrollPositions: {
      'training-hub': 24,
      'athlete-detail': 128,
      'sport-category-exercises': 256,
    },
    navigateTo: (screen) => {
      navigationCalls.push(screen)
    },
    goBack: (fallback) => {
      backCalls.push(fallback)
    },
    renderNavigationNotSet: () => null,
    onScreenScrollChange: (screen, scrollTop) => {
      scrollCalls.push({ screen, scrollTop })
    },
    onStartAction: noop,
    onSelectTrainingDrill: noop,
    onSelectTrainingCategory: noop,
    onOpenSportDrills: noop,
    onSelectTrainingRoutine: noop,
    onSelectLearningPath: asyncNoop,
    onOpenBodyPartSelector: noop,
    onSelectTrainingAthlete: noop,
    onSelectExerciseSport: (sport) => {
      sportSelectionCalls.push(sport)
    },
    onSelectAthleteExercise: noop,
    onSelectExerciseCategory: noop,
    onSelectLibraryExercise: noop,
    onAddDrillToToday: noop,
    onAddAthleteExerciseToWorkout: noop,
    onAddExerciseToWorkout: noop,
    onAddExerciseToToday: noop,
    onAdvanceLearningPath: noop,
    onResetLearningPathProgress: noop,
    onSelectBodyPart: noop,
    onToggleFavoriteExercise: noop,
    onMarkExerciseComplete: noop,
    onShareExercise: noop,
    onCloseRoutinePlayer: noop,
  }

  const trainingHubElement = expectElement<{
    initialScrollTop?: number
    onScrollChange: (scrollTop: number) => void
  }>(
    TrainingLibraryRoutes(baseProps),
    'TrainingLibraryRoutes should render a training hub element'
  )
  assert.equal(trainingHubElement.type, TrainingHub, 'training-hub should delegate to TrainingHub')
  assert.equal(trainingHubElement.props.initialScrollTop, 24, 'training hub scroll position should be forwarded')
  assert.equal('backScreen' in trainingHubElement.props, false, 'training hub route should not pass the removed backScreen prop')
  trainingHubElement.props.onScrollChange(33)
  assert.deepEqual(scrollCalls.pop(), { screen: 'training-hub', scrollTop: 33 }, 'training hub scroll callback should be wrapped with the correct screen key')

  const athleteDetailElement = expectElement<{
    initialScrollTop?: number
    onScrollChange?: (scrollTop: number) => void
    onBrowseSportLibrary?: (sport: SportType) => void
  }>(
    TrainingLibraryRoutes({ ...baseProps, currentScreen: 'athlete-detail' }),
    'athlete-detail should render an element when an athlete is selected'
  )
  assert.equal(athleteDetailElement.type, AthleteDetail, 'athlete-detail should delegate to AthleteDetail')
  assert.equal(athleteDetailElement.props.initialScrollTop, 128, 'athlete detail scroll position should be forwarded')
  athleteDetailElement.props.onScrollChange?.(144)
  assert.deepEqual(scrollCalls.pop(), { screen: 'athlete-detail', scrollTop: 144 }, 'athlete detail scroll callback should be wrapped with the correct screen key')
  athleteDetailElement.props.onBrowseSportLibrary?.('judo')
  assert.equal(sportSelectionCalls.at(-1), 'judo', 'athlete detail browse action should select the requested sport')
  assert.equal(navigationCalls.at(-1), 'sport-exercise-categories', 'athlete detail browse action should navigate into sport exercise categories')

  const exerciseDetailElement = expectElement<{
    isFavorite?: boolean
    isCompleted?: boolean
    isInToday?: boolean
    isInWorkoutBuilder?: boolean
    onBack: () => void
  }>(
    TrainingLibraryRoutes({ ...baseProps, currentScreen: 'exercise-detail' }),
    'exercise-detail should render an element when an exercise is selected'
  )
  assert.equal(exerciseDetailElement.type, ExerciseDetail, 'exercise-detail should delegate to ExerciseDetail')
  assert.equal(exerciseDetailElement.props.isFavorite, true, 'favorite state should be forwarded to exercise detail')
  assert.equal(exerciseDetailElement.props.isCompleted, true, 'completion state should be forwarded to exercise detail')
  assert.equal(exerciseDetailElement.props.isInToday, true, 'today membership should be forwarded to exercise detail')
  assert.equal(exerciseDetailElement.props.isInWorkoutBuilder, true, 'workout-builder membership should be forwarded to exercise detail')
  exerciseDetailElement.props.onBack()
  assert.equal(backCalls.at(-1), 'sport-category-exercises', 'exercise detail back action should return to sport-category-exercises')

  const categoryListElement = expectElement<{
    sportFilter?: SportType
  }>(
    TrainingLibraryRoutes({
      ...baseProps,
      currentScreen: 'category-list',
      selectedCategory: 'technique',
      selectedTrainingSport: 'judo',
    }),
    'category-list should render when a training category is selected'
  )
  assert.equal(categoryListElement.type, CategoryList, 'category-list route should delegate to CategoryList')
  assert.equal(categoryListElement.props.sportFilter, 'judo', 'category-list should receive the sport drill filter when present')

  const categoryFallbackElement = expectElement<{ onBack: () => void }>(
    TrainingLibraryRoutes({
      ...baseProps,
      currentScreen: 'sport-category-exercises',
      selectedExerciseCategory: null,
    }),
    'sport-category-exercises should fall back to the categories screen when no category is selected'
  )
  assert.equal(categoryFallbackElement.type, SportExerciseCategories, 'missing category should fall back to SportExerciseCategories')
  categoryFallbackElement.props.onBack()
  assert.equal(backCalls.at(-1), 'training-hub', 'category fallback back action should return to the training hub')

  console.log('Training library route tests passed (training hub, category list, athlete detail, exercise detail, and category fallback routing).')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})