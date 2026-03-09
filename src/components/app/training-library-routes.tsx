'use client'

import type { ReactNode } from 'react'
import { AthleteDetail } from '@/components/screens/athlete-detail'
import { BodyPartSelector } from '@/components/screens/body-part-selector'
import { CategoryList } from '@/components/screens/category-list'
import { DrillDetail } from '@/components/screens/drill-detail'
import { ExerciseDetail } from '@/components/screens/exercise-detail'
import { LearningPathScreen } from '@/components/screens/learning-path'
import { RoutinePlayer } from '@/components/screens/routine-player'
import { SportCategoryExercises } from '@/components/screens/sport-category-exercises'
import { SportExerciseCategories } from '@/components/screens/sport-exercise-categories'
import { TrainingHub } from '@/components/screens/training-hub'
import {
  Athlete,
  Drill,
  DrillCategory,
  DrillSubcategory,
  EnhancedExerciseData,
  ExerciseCategory,
  ExerciseWithGuidance,
  ExperienceLevel,
  LearningPath,
  Routine,
  Screen,
  Session,
  SportType,
} from '@/lib/types'

interface TrainingLibraryRoutesProps {
  currentScreen: Screen
  contentDataVersion: number
  selectedSport: SportType
  displaySession: Session | null
  selectedDrill: Drill | null
  selectedAthlete: Athlete | null
  selectedCategory: DrillCategory | null
  selectedSubcategory: DrillSubcategory | null
  selectedRoutine: Routine | null
  selectedLearningPath: LearningPath | null
  selectedExerciseSport: SportType | null
  selectedExerciseCategory: ExerciseCategory | null
  selectedExercise: EnhancedExerciseData | null
  userExperienceLevel: ExperienceLevel
  learningPathProgress: Record<string, number>
  isPremium: boolean
  learningPathUsage: number
  hasWorkoutToday: boolean
  todayActiveDrillIdSet: Set<string>
  todayWorkoutExerciseIds: Set<string>
  workoutExerciseIds: Set<string>
  favoriteExercises: Set<string>
  completedExercises: Set<string>
  screenScrollPositions: Partial<Record<Screen, number>>
  navigateTo: (screen: Screen) => void
  goBack: (fallback?: Screen) => void
  renderNavigationNotSet: (message: string, details?: string, backTo?: Screen) => ReactNode
  onScreenScrollChange: (screen: Screen, scrollTop: number) => void
  onStartAction: () => void
  onSelectTrainingDrill: (drill: Drill) => void
  onSelectTrainingCategory: (category: DrillCategory) => void
  onSelectTrainingRoutine: (routine: Routine) => void
  onSelectLearningPath: (path: LearningPath) => void | Promise<void>
  onOpenBodyPartSelector: () => void
  onSelectTrainingAthlete: (athlete: Athlete) => void
  onSelectExerciseSport: (sport: SportType) => void
  onSelectAthleteExercise: (exercise: ExerciseWithGuidance) => void
  onSelectExerciseCategory: (sport: SportType, category: ExerciseCategory) => void
  onSelectLibraryExercise: (exercise: EnhancedExerciseData) => void
  onAddDrillToToday: (drill: Drill) => void
  onAddAthleteExerciseToWorkout: (exercise: ExerciseWithGuidance) => void
  onAddExerciseToWorkout: (exercise: EnhancedExerciseData) => void
  onAddExerciseToToday: (exercise: EnhancedExerciseData) => void
  onAdvanceLearningPath: () => void
  onResetLearningPathProgress: () => void
  onSelectBodyPart: (bodyPart: DrillSubcategory) => void
  onToggleFavoriteExercise: (exerciseId: string) => void
  onMarkExerciseComplete: (exerciseId: string) => void
  onShareExercise: (exercise: EnhancedExerciseData) => void
  onCloseRoutinePlayer: () => void
}

export function TrainingLibraryRoutes({
  currentScreen,
  contentDataVersion,
  selectedSport,
  displaySession,
  selectedDrill,
  selectedAthlete,
  selectedCategory,
  selectedSubcategory,
  selectedRoutine,
  selectedLearningPath,
  selectedExerciseSport,
  selectedExerciseCategory,
  selectedExercise,
  userExperienceLevel,
  learningPathProgress,
  isPremium,
  learningPathUsage,
  hasWorkoutToday,
  todayActiveDrillIdSet,
  todayWorkoutExerciseIds,
  workoutExerciseIds,
  favoriteExercises,
  completedExercises,
  screenScrollPositions,
  navigateTo,
  goBack,
  renderNavigationNotSet,
  onScreenScrollChange,
  onStartAction,
  onSelectTrainingDrill,
  onSelectTrainingCategory,
  onSelectTrainingRoutine,
  onSelectLearningPath,
  onOpenBodyPartSelector,
  onSelectTrainingAthlete,
  onSelectExerciseSport,
  onSelectAthleteExercise,
  onSelectExerciseCategory,
  onSelectLibraryExercise,
  onAddDrillToToday,
  onAddAthleteExerciseToWorkout,
  onAddExerciseToWorkout,
  onAddExerciseToToday,
  onAdvanceLearningPath,
  onResetLearningPathProgress,
  onSelectBodyPart,
  onToggleFavoriteExercise,
  onMarkExerciseComplete,
  onShareExercise,
  onCloseRoutinePlayer,
}: TrainingLibraryRoutesProps) {
  switch (currentScreen) {
    case 'training-hub':
      return (
        <TrainingHub
          sport={selectedSport}
          dataVersion={contentDataVersion}
          currentWorkoutFocus={displaySession?.focus}
          onNavigate={navigateTo}
          backScreen='home'
          session={displaySession}
          onSelectDrill={onSelectTrainingDrill}
          onSelectCategory={onSelectTrainingCategory}
          onSelectRoutine={onSelectTrainingRoutine}
          onSelectLearningPath={onSelectLearningPath}
          onSelectBodyPart={onOpenBodyPartSelector}
          onSelectAthlete={onSelectTrainingAthlete}
          onSelectSport={onSelectExerciseSport}
          learningPathProgress={learningPathProgress}
          isPremium={isPremium}
          learningPathUsage={learningPathUsage}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={screenScrollPositions['training-hub']}
          onScrollChange={(scrollTop) => onScreenScrollChange('training-hub', scrollTop)}
        />
      )

    case 'drill-detail':
      return selectedDrill ? (
        <DrillDetail
          drill={selectedDrill}
          dataVersion={contentDataVersion}
          onBack={() => goBack('training-hub')}
          onAddToToday={onAddDrillToToday}
          isInToday={todayActiveDrillIdSet.has(selectedDrill.id)}
          onSelectRelatedDrill={onSelectTrainingDrill}
        />
      ) : renderNavigationNotSet(
        'The selected drill is missing from the current app state.',
        'Open Training Hub and choose a drill again.',
        'training-hub'
      )

    case 'athlete-detail':
      return selectedAthlete ? (
        <AthleteDetail
          athlete={selectedAthlete}
          userLevel={userExperienceLevel}
          dataVersion={contentDataVersion}
          onNavigate={navigateTo}
          onBack={() => goBack('training-hub')}
          onExerciseSelect={onSelectAthleteExercise}
          onAddToWorkout={onAddAthleteExerciseToWorkout}
          workoutExerciseIds={workoutExerciseIds}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : renderNavigationNotSet(
        'The selected athlete is missing from the current app state.',
        'Open Training Hub and choose an athlete again.',
        'training-hub'
      )

    case 'category-list':
      return selectedCategory ? (
        <CategoryList
          category={selectedCategory}
          dataVersion={contentDataVersion}
          onBack={() => goBack('training-hub')}
          onNavigate={navigateTo}
          onSelectDrill={onSelectTrainingDrill}
          onAddToToday={onAddDrillToToday}
          todayDrillIds={todayActiveDrillIdSet}
          initialSubcategory={selectedSubcategory || undefined}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={screenScrollPositions['category-list']}
          onScrollChange={(scrollTop) => onScreenScrollChange('category-list', scrollTop)}
        />
      ) : renderNavigationNotSet(
        'No category was selected before opening this page.',
        'Open Training Hub and choose a category again.',
        'training-hub'
      )

    case 'routine-player':
      return selectedRoutine ? (
        <RoutinePlayer
          routine={selectedRoutine}
          onComplete={onCloseRoutinePlayer}
          onClose={onCloseRoutinePlayer}
        />
      ) : renderNavigationNotSet(
        'No routine is available for playback right now.',
        'Open Training Hub and choose a routine again.',
        'training-hub'
      )

    case 'learning-path': {
      const learningPath = selectedLearningPath
      const completedSteps = learningPath ? (learningPathProgress[learningPath.id] ?? 0) : 0

      return learningPath ? (
        <LearningPathScreen
          path={learningPath}
          dataVersion={contentDataVersion}
          completedSteps={completedSteps}
          onBack={() => goBack('training-hub')}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          onOpenDrill={onSelectTrainingDrill}
          onAdvanceStep={onAdvanceLearningPath}
          onResetProgress={onResetLearningPathProgress}
          initialScrollTop={screenScrollPositions['learning-path']}
          onScrollChange={(scrollTop) => onScreenScrollChange('learning-path', scrollTop)}
        />
      ) : renderNavigationNotSet(
        'No learning path was selected before opening this page.',
        'Open Training Hub and choose a learning path again.',
        'training-hub'
      )
    }

    case 'body-part-selector':
      return (
        <BodyPartSelector
          dataVersion={contentDataVersion}
          onBack={() => goBack('training-hub')}
          onSelectBodyPart={onSelectBodyPart}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={screenScrollPositions['body-part-selector']}
          onScrollChange={(scrollTop) => onScreenScrollChange('body-part-selector', scrollTop)}
        />
      )

    case 'sport-exercise-categories':
      return (
        <SportExerciseCategories
          sport={selectedExerciseSport ?? selectedSport}
          dataVersion={contentDataVersion}
          onNavigate={navigateTo}
          onBack={() => goBack('training-hub')}
          onSelectCategory={onSelectExerciseCategory}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={screenScrollPositions['sport-exercise-categories']}
          onScrollChange={(scrollTop) => onScreenScrollChange('sport-exercise-categories', scrollTop)}
        />
      )

    case 'sport-category-exercises':
      return selectedExerciseCategory ? (
        <SportCategoryExercises
          sport={selectedExerciseSport ?? selectedSport}
          category={selectedExerciseCategory}
          dataVersion={contentDataVersion}
          onNavigate={navigateTo}
          onBack={() => goBack('sport-exercise-categories')}
          onExerciseSelect={onSelectLibraryExercise}
          onAddToToday={onAddExerciseToToday}
          todayExerciseIds={todayWorkoutExerciseIds}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={screenScrollPositions['sport-category-exercises']}
          onScrollChange={(scrollTop) => onScreenScrollChange('sport-category-exercises', scrollTop)}
        />
      ) : (
        <SportExerciseCategories
          sport={selectedExerciseSport ?? selectedSport}
          dataVersion={contentDataVersion}
          onNavigate={navigateTo}
          onBack={() => goBack('training-hub')}
          onSelectCategory={onSelectExerciseCategory}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )

    case 'exercise-detail':
      return selectedExercise ? (
        <ExerciseDetail
          exercise={selectedExercise}
          dataVersion={contentDataVersion}
          onNavigate={navigateTo}
          onBack={() => goBack('sport-category-exercises')}
          isFavorite={favoriteExercises.has(selectedExercise.id)}
          isCompleted={completedExercises.has(selectedExercise.id)}
          isInToday={todayWorkoutExerciseIds.has(selectedExercise.id)}
          isInWorkoutBuilder={workoutExerciseIds.has(selectedExercise.id)}
          onAddToWorkout={onAddExerciseToWorkout}
          onAddToToday={onAddExerciseToToday}
          onToggleFavorite={onToggleFavoriteExercise}
          onMarkComplete={onMarkExerciseComplete}
          onShare={onShareExercise}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : renderNavigationNotSet(
        'The selected exercise is missing from the current app state.',
        'Open the exercise library and choose an exercise again.',
        'sport-exercise-categories'
      )

    default:
      return null
  }
}