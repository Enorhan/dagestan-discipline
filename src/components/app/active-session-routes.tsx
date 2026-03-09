'use client'

import { ExerciseList } from '@/components/screens/exercise-list'
import { MissedSessionAccountability } from '@/components/screens/missed-session-accountability'
import { PostWorkoutReflection } from '@/components/screens/post-workout-reflection'
import { RestTimer } from '@/components/screens/rest-timer'
import { RoundTimer } from '@/components/screens/round-timer'
import { SessionComplete } from '@/components/screens/session-complete'
import { WorkoutSession } from '@/components/screens/workout-session'
import { Equipment, Exercise, PersonalRecord, Screen, Session, SessionLog, TimerMode, WeightUnit } from '@/lib/types'

interface BestSet {
  weight: number
  exerciseName: string
}

interface ActiveSessionRoutesProps {
  currentScreen: Screen
  currentSession: Session | null
  displaySession: Session | null
  currentExerciseIndex: number
  currentSet: number
  sessionStartTime: number | null
  weightUnit: WeightUnit
  equipment: Equipment | null
  sessionPaused: boolean
  pausedTime: number
  pauseStartedAt: number | null
  setProgressByExercise: Record<string, boolean[]>
  currentSessionWeights: Record<string, number[]>
  lastSessionWeights?: Record<string, number[]>
  restTimerDuration: number
  restTimerEndsAt: number | null
  restExercise: Exercise | null
  sessionDurationSeconds: number
  completedSessions: number
  plannedSessions: number
  lastCompletedSessionVolume?: number
  bestSet: BestSet | null
  currentStreak: number
  longestStreak: number
  lastCompletedSession: SessionLog | null
  editingReflectionSession: SessionLog | null
  previousReflectionSession: SessionLog | null
  lastCompletedSessionPrs: PersonalRecord[]
  roundTimerMode: TimerMode
  hasWorkoutToday: boolean
  carryOverSessionDayLabel: string | null
  missedPlannedSessionCount: number
  undoLabel?: string | null
  navigateTo: (screen: Screen) => void
  onStartAction: () => void
  onTogglePause: () => void
  onEndSession: () => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onSelectSet: (exerciseIndex: number, setNumber: number) => void
  onToggleSetDone: (exerciseIndex: number, setNumber: number, shouldBeDone: boolean, weightBase?: number) => void
  onFinishWorkoutSession: () => void
  onRecordSessionPr: (pr: PersonalRecord) => void
  onUndo: () => void
  onAdjustRest: (deltaSeconds: number) => void
  onSkipRest: () => void
  onTimerComplete: () => void
  onCloseSessionComplete: () => void
  onViewWeekFromSessionComplete: () => void
  onEditReflection: () => void
  onCompleteReflection: (effortRating: number, notes: string) => void
  onSkipReflection: () => void
  onSubmitMissedSession: (excuse: string) => void
  onDismissMissedSession: () => void
  onCompleteRoundTimer: () => void
  onCloseRoundTimer: () => void
}

export function ActiveSessionRoutes({
  currentScreen,
  currentSession,
  displaySession,
  currentExerciseIndex,
  currentSet,
  sessionStartTime,
  weightUnit,
  equipment,
  sessionPaused,
  pausedTime,
  pauseStartedAt,
  setProgressByExercise,
  currentSessionWeights,
  lastSessionWeights,
  restTimerDuration,
  restTimerEndsAt,
  restExercise,
  sessionDurationSeconds,
  completedSessions,
  plannedSessions,
  lastCompletedSessionVolume,
  bestSet,
  currentStreak,
  longestStreak,
  lastCompletedSession,
  editingReflectionSession,
  previousReflectionSession,
  lastCompletedSessionPrs,
  roundTimerMode,
  hasWorkoutToday,
  carryOverSessionDayLabel,
  missedPlannedSessionCount,
  undoLabel,
  navigateTo,
  onStartAction,
  onTogglePause,
  onEndSession,
  onWeightUnitChange,
  onSelectSet,
  onToggleSetDone,
  onFinishWorkoutSession,
  onRecordSessionPr,
  onUndo,
  onAdjustRest,
  onSkipRest,
  onTimerComplete,
  onCloseSessionComplete,
  onViewWeekFromSessionComplete,
  onEditReflection,
  onCompleteReflection,
  onSkipReflection,
  onSubmitMissedSession,
  onDismissMissedSession,
  onCompleteRoundTimer,
  onCloseRoundTimer,
}: ActiveSessionRoutesProps) {
  switch (currentScreen) {
    case 'workout-session':
      return (
        <WorkoutSession
          session={currentSession}
          currentExerciseIndex={currentExerciseIndex}
          currentSet={currentSet}
          sessionStartTime={sessionStartTime}
          weightUnit={weightUnit}
          equipment={equipment}
          isPaused={sessionPaused}
          pausedTime={pausedTime}
          pauseStartedAt={pauseStartedAt}
          onTogglePause={onTogglePause}
          onEndSession={onEndSession}
          onWeightUnitChange={onWeightUnitChange}
          setProgressByExercise={setProgressByExercise}
          currentSessionWeights={currentSessionWeights}
          lastSessionWeights={lastSessionWeights ?? undefined}
          onSelectSet={onSelectSet}
          onToggleSetDone={onToggleSetDone}
          onFinishSession={onFinishWorkoutSession}
          onNewPR={onRecordSessionPr}
          undoLabel={undoLabel}
          onUndo={onUndo}
        />
      )

    case 'rest-timer':
      return (
        <RestTimer
          totalTime={restTimerDuration}
          endsAt={restTimerEndsAt}
          exerciseName={restExercise?.name ?? 'Next exercise'}
          nextSetNumber={currentSet}
          totalSets={restExercise?.sets ?? 0}
          isPaused={sessionPaused}
          onTogglePause={onTogglePause}
          onAdjustTime={onAdjustRest}
          onSkip={onSkipRest}
          onTimerComplete={onTimerComplete}
          undoLabel={undoLabel}
          onUndo={onUndo}
        />
      )

    case 'session-complete':
      return (
        <SessionComplete
          totalTime={sessionDurationSeconds}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          totalVolume={lastCompletedSessionVolume}
          currentSessionWeights={currentSessionWeights}
          lastSessionWeights={lastSessionWeights ?? undefined}
          weightUnit={weightUnit}
          bestSet={bestSet}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          prs={lastCompletedSessionPrs}
          reflectionEffortRating={lastCompletedSession?.effortRating}
          reflectionNotes={lastCompletedSession?.notes}
          onEditReflection={onEditReflection}
          onClose={onCloseSessionComplete}
          onViewWeek={onViewWeekFromSessionComplete}
        />
      )

    case 'exercise-list':
      return (
        <ExerciseList
          session={displaySession}
          currentExerciseIndex={currentExerciseIndex}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )

    case 'post-workout-reflection':
      return (
        <PostWorkoutReflection
          totalTime={sessionDurationSeconds}
          onComplete={onCompleteReflection}
          onSkip={onSkipReflection}
          mode={editingReflectionSession ? 'edit' : 'create'}
          initialEffortRating={editingReflectionSession?.effortRating ?? null}
          initialNotes={editingReflectionSession?.notes ?? ''}
          previousSession={previousReflectionSession}
          undoLabel={undoLabel}
          onUndo={onUndo}
        />
      )

    case 'missed-session-accountability':
      return (
        <MissedSessionAccountability
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          carryOverSessionDayLabel={carryOverSessionDayLabel}
          missedPlannedSessionCount={missedPlannedSessionCount}
          onSubmit={onSubmitMissedSession}
          onDismiss={onDismissMissedSession}
        />
      )

    case 'round-timer':
      return (
        <RoundTimer
          mode={roundTimerMode}
          onComplete={onCompleteRoundTimer}
          onClose={onCloseRoundTimer}
        />
      )

    default:
      return null
  }
}