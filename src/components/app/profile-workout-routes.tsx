'use client'

import type { ReactNode } from 'react'
import { AuthLogin } from '@/components/screens/auth-login'
import { EditProfile } from '@/components/screens/edit-profile'
import { UserProfileScreen } from '@/components/screens/user-profile'
import { WorkoutBuilder } from '@/components/screens/workout-builder'
import { WorkoutDetail } from '@/components/screens/workout-detail'
import { ActivityLog, Screen, SessionLog } from '@/lib/types'
import { CustomWorkout, UserProfile } from '@/lib/social-types'

interface WorkoutBuilderPrefillExercise {
  id: string
  name: string
  videoUrl?: string | null
}

interface ProfileWorkoutRoutesProps {
  currentScreen: Screen
  currentUser: UserProfile | null
  selectedWorkout: CustomWorkout | null
  workoutBuilderPrefillExercise: WorkoutBuilderPrefillExercise | null
  hasWorkoutToday: boolean
  currentStreak: number
  longestStreak: number
  sessionHistory: SessionLog[]
  activityLogs: ActivityLog[]
  navigateTo: (screen: Screen) => void
  goBack: (fallback?: Screen) => void
  renderNavigationNotSet: (message: string, details?: string, backTo?: Screen) => ReactNode
  onSaveWorkout: (workout: CustomWorkout) => void
  onCloseWorkoutBuilder: () => void
  onWorkoutPrefillHandled: () => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onSaveEditedProfile: (updatedUser: UserProfile) => void
  onStartWorkout: (workout: CustomWorkout) => void
  onCopyWorkout: (workout: CustomWorkout) => void
  onLoginToProfile: (user: UserProfile) => void
  onStartAction: () => void
}

export function ProfileWorkoutRoutes({
  currentScreen,
  currentUser,
  selectedWorkout,
  workoutBuilderPrefillExercise,
  hasWorkoutToday,
  currentStreak,
  longestStreak,
  sessionHistory,
  activityLogs,
  navigateTo,
  goBack,
  renderNavigationNotSet,
  onSaveWorkout,
  onCloseWorkoutBuilder,
  onWorkoutPrefillHandled,
  onSelectWorkout,
  onSaveEditedProfile,
  onStartWorkout,
  onCopyWorkout,
  onLoginToProfile,
  onStartAction,
}: ProfileWorkoutRoutesProps) {
  switch (currentScreen) {
    case 'workout-builder':
      return (
        <WorkoutBuilder
          onSave={onSaveWorkout}
          onClose={onCloseWorkoutBuilder}
          editingWorkout={selectedWorkout || undefined}
          prefillExercise={workoutBuilderPrefillExercise}
          onPrefillExerciseHandled={onWorkoutPrefillHandled}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )

    case 'user-profile':
      return currentUser ? (
        <UserProfileScreen
          user={currentUser}
          isOwnProfile={true}
          currentUser={currentUser}
          onNavigate={navigateTo}
          onSelectWorkout={onSelectWorkout}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
        />
      ) : (
        <AuthLogin
          onLogin={onLoginToProfile}
          onNavigate={navigateTo}
          onSkip={() => navigateTo('home')}
        />
      )

    case 'edit-profile':
      return currentUser ? (
        <EditProfile
          user={currentUser}
          onSave={onSaveEditedProfile}
          onBack={() => goBack('user-profile')}
        />
      ) : renderNavigationNotSet(
        'Profile data is not loaded for editing.',
        'Sign in again and retry.',
        'auth-login'
      )

    case 'workout-detail':
      return selectedWorkout ? (
        <WorkoutDetail
          workout={selectedWorkout}
          currentUser={currentUser}
          onStartWorkout={onStartWorkout}
          onCopyWorkout={onCopyWorkout}
          onBack={() => goBack('user-profile')}
        />
      ) : renderNavigationNotSet(
        'The selected workout is missing from the current app state.',
        'Open your profile and select a workout again.',
        'user-profile'
      )

    default:
      return null
  }
}