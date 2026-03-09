'use client'

import { Home } from '@/components/screens/home'
import { LogActivity } from '@/components/screens/log-activity'
import { TodayEditor } from '@/components/screens/today-editor'
import { TrainingStats } from '@/components/screens/training-stats'
import { ActivityLog, Drill, Equipment, Exercise, Screen, Session, SessionAdjustmentMode, SessionLog, SportType, TimerMode, WeightUnit, WeekDay } from '@/lib/types'

interface CoreAppRoutesProps {
  currentScreen: Screen
  displaySession: Session | null
  weekProgress: WeekDay[]
  currentStreak: number
  longestStreak: number
  userName?: string
  sessionHistory: SessionLog[]
  activityLogs: ActivityLog[]
  selectedSport: SportType
  equipment: Equipment | null
  programSession: Session | null
  effectiveProgramSession: Session | null
  todayRemovedExercises: Exercise[]
  todayActiveDrillIds: string[]
  todayRemovedDrillIds: string[]
  todayDrillDoneIdSet: Set<string>
  todayDrillsLoggedAt: string | null
  hasTodayOverrides: boolean
  hasTodayBaseChanged: boolean
  sessionAdjustmentMode: SessionAdjustmentMode | null
  carryOverSessionDayLabel: string | null
  missedPlannedSessionCount: number
  canEditProgram: boolean
  homeScrollTop?: number
  completedExerciseCount: number
  weightUnit: WeightUnit
  isPremium: boolean
  isStatsLoading: boolean
  hasWorkoutToday: boolean
  editingActivity: ActivityLog | null
  navigateTo: (screen: Screen) => void
  onUndo: () => void
  undoLabel?: string | null
  onStartAction: () => void
  onStartSession: () => void
  onSetSessionAdjustmentMode: (mode: SessionAdjustmentMode) => void
  onStartRoundTimer: (mode: TimerMode) => void
  onHomeScrollChange: (scrollTop: number) => void
  onCloseTodayEditor: () => void
  onResetToday: () => void
  onEditTodayProgram: () => void
  onAddExercise: (picked: { id: string; name: string; videoUrl?: string | null }) => void
  onReplaceExercise: (targetExerciseId: string, picked: { id: string; name: string; videoUrl?: string | null }) => void
  onSetExerciseOrder: (orderIds: string[]) => void
  onUpdateExercise: (exerciseId: string, patch: { sets?: number; reps?: number | null; duration?: number | null; restTime?: number; notes?: string | null }) => void
  onResetExerciseEdits: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onRestoreExercise: (exerciseId: string) => void
  onRemoveDrill: (drillId: string) => void
  onRestoreDrill: (drillId: string) => void
  onToggleDrillDone: (drillId: string, done: boolean) => void
  onLogDrills: (params: { drillIds: string[]; durationMinutes: number; notes: string }) => void
  onOpenDrill: (drill: Drill) => void
  onLogActivity: (log: Omit<ActivityLog, 'id'>) => void
  onUpdateActivity: (log: Omit<ActivityLog, 'id'>, activityId: string) => void
  onCloseLogActivity: () => void
  onCloseTrainingStats: () => void
  onUpgradeTrainingStats: () => void
}

export function CoreAppRoutes({
  currentScreen,
  displaySession,
  weekProgress,
  currentStreak,
  longestStreak,
  userName,
  sessionHistory,
  activityLogs,
  selectedSport,
  equipment,
  programSession,
  effectiveProgramSession,
  todayRemovedExercises,
  todayActiveDrillIds,
  todayRemovedDrillIds,
  todayDrillDoneIdSet,
  todayDrillsLoggedAt,
  hasTodayOverrides,
  hasTodayBaseChanged,
  sessionAdjustmentMode,
  carryOverSessionDayLabel,
  missedPlannedSessionCount,
  canEditProgram,
  homeScrollTop,
  completedExerciseCount,
  weightUnit,
  isPremium,
  isStatsLoading,
  hasWorkoutToday,
  editingActivity,
  navigateTo,
  onUndo,
  undoLabel,
  onStartAction,
  onStartSession,
  onSetSessionAdjustmentMode,
  onStartRoundTimer,
  onHomeScrollChange,
  onCloseTodayEditor,
  onResetToday,
  onEditTodayProgram,
  onAddExercise,
  onReplaceExercise,
  onSetExerciseOrder,
  onUpdateExercise,
  onResetExerciseEdits,
  onRemoveExercise,
  onRestoreExercise,
  onRemoveDrill,
  onRestoreDrill,
  onToggleDrillDone,
  onLogDrills,
  onOpenDrill,
  onLogActivity,
  onUpdateActivity,
  onCloseLogActivity,
  onCloseTrainingStats,
  onUpgradeTrainingStats,
}: CoreAppRoutesProps) {
  switch (currentScreen) {
    case 'home':
      return (
        <Home
          session={displaySession}
          weekProgress={weekProgress}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          userName={userName}
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
          selectedSport={selectedSport}
          equipment={equipment}
          onStartSession={onStartSession}
          sessionAdjustmentMode={sessionAdjustmentMode}
          onSetSessionAdjustmentMode={onSetSessionAdjustmentMode}
          carryOverSessionDayLabel={carryOverSessionDayLabel}
          missedPlannedSessionCount={missedPlannedSessionCount}
          onNavigate={navigateTo}
          undoLabel={undoLabel}
          onUndo={onUndo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          onStartRoundTimer={onStartRoundTimer}
          initialScrollTop={homeScrollTop}
          onScrollChange={onHomeScrollChange}
        />
      )

    case 'today-editor':
      return (
        <TodayEditor
          sport={selectedSport}
          baseSession={programSession}
          session={effectiveProgramSession}
          removedExercises={todayRemovedExercises}
          activeDrillIds={todayActiveDrillIds}
          removedDrillIds={todayRemovedDrillIds}
          drillDoneIds={todayDrillDoneIdSet}
          drillsLoggedAt={todayDrillsLoggedAt}
          hasOverrides={hasTodayOverrides}
          hasBaseChanged={hasTodayBaseChanged}
          sessionAdjustmentMode={sessionAdjustmentMode}
          canEditProgram={canEditProgram}
          onBack={onCloseTodayEditor}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          onStartWorkout={onStartSession}
          onResetToday={onResetToday}
          onEditProgram={onEditTodayProgram}
          onAddExercise={onAddExercise}
          onReplaceExercise={onReplaceExercise}
          onSetExerciseOrder={onSetExerciseOrder}
          onUpdateExercise={onUpdateExercise}
          onResetExerciseEdits={onResetExerciseEdits}
          onRemoveExercise={onRemoveExercise}
          onRestoreExercise={onRestoreExercise}
          onRemoveDrill={onRemoveDrill}
          onRestoreDrill={onRestoreDrill}
          onToggleDrillDone={onToggleDrillDone}
          onLogDrills={onLogDrills}
          onOpenDrill={onOpenDrill}
        />
      )

    case 'log-activity':
      return (
        <LogActivity
          onLogActivity={onLogActivity}
          onUpdateActivity={onUpdateActivity}
          editingActivity={editingActivity}
          onClose={onCloseLogActivity}
        />
      )

    case 'training-stats':
      return (
        <TrainingStats
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
          completedExerciseCount={completedExerciseCount}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weightUnit={weightUnit}
          isPremium={isPremium}
          onClose={onCloseTrainingStats}
          onNavigate={navigateTo}
          onUpgrade={onUpgradeTrainingStats}
          isLoading={isStatsLoading}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )

    default:
      return null
  }
}