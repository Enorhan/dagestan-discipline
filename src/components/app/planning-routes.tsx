'use client'

import type { ReactNode } from 'react'
import { ProgramSessionEditor } from '@/components/screens/program-session-editor'
import { WeekView } from '@/components/screens/week-view'
import { ActivityLog, Screen, Session, SportType, WeekDay } from '@/lib/types'

interface PlanningRoutesProps {
  currentScreen: Screen
  selectedSport: SportType
  weekProgress: WeekDay[]
  completedSessions: number
  plannedSessions: number
  generatedProgram: Session[] | null
  activityLogs: ActivityLog[]
  editingProgramSession: Session | null
  editingSessionDayLabel: string
  hasWorkoutToday: boolean
  weekViewScrollTop?: number
  navigateTo: (screen: Screen) => void
  renderNavigationNotSet: (message: string, details?: string, backTo?: Screen) => ReactNode
  onCloseWeekView: () => void
  onEditActivity: (activity: ActivityLog) => void
  onDeleteActivity: (activityId: string) => void
  onLogTraining: () => void
  onStartSessionForDay: (dayIndex: number) => void
  onEditSession: (dayIndex: number) => void
  onStartAction: () => void
  onWeekViewScrollChange: (scrollTop: number) => void
  onSaveProgramSession: (session: Session) => void
  onCloseProgramSessionEditor: () => void
}

export function PlanningRoutes({
  currentScreen,
  selectedSport,
  weekProgress,
  completedSessions,
  plannedSessions,
  generatedProgram,
  activityLogs,
  editingProgramSession,
  editingSessionDayLabel,
  hasWorkoutToday,
  weekViewScrollTop,
  navigateTo,
  renderNavigationNotSet,
  onCloseWeekView,
  onEditActivity,
  onDeleteActivity,
  onLogTraining,
  onStartSessionForDay,
  onEditSession,
  onStartAction,
  onWeekViewScrollChange,
  onSaveProgramSession,
  onCloseProgramSessionEditor,
}: PlanningRoutesProps) {
  switch (currentScreen) {
    case 'week-view':
      return (
        <WeekView
          weekProgress={weekProgress}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          onClose={onCloseWeekView}
          onNavigate={navigateTo}
          program={generatedProgram}
          activityLogs={activityLogs}
          onEditActivity={onEditActivity}
          onDeleteActivity={onDeleteActivity}
          onLogTraining={onLogTraining}
          onStartSessionForDay={onStartSessionForDay}
          onEditSession={onEditSession}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          initialScrollTop={weekViewScrollTop}
          onScrollChange={onWeekViewScrollChange}
        />
      )

    case 'program-session-editor':
      return editingProgramSession ? (
        <ProgramSessionEditor
          sport={selectedSport}
          session={editingProgramSession}
          dayLabel={editingSessionDayLabel}
          onSave={onSaveProgramSession}
          onClose={onCloseProgramSessionEditor}
        />
      ) : renderNavigationNotSet(
        'The requested session could not be found for this day.',
        'Open Week View and select a planned day again.',
        'week-view'
      )

    default:
      return null
  }
}