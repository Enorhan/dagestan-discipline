'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Screen, SessionLog, ActivityLog } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile as UserProfileType, CustomWorkout, focusAreaInfo } from '@/lib/social-types'
import { ACHIEVEMENTS, AchievementType, getAchievementProgress, getAchievementState, isUnlocked } from '@/lib/achievements'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { AchievementProgressCard } from '@/components/ui/achievement-celebration'
import { Settings, Plus, ChevronRight, Edit, BarChart } from '@/components/ui/icons'

interface UserProfileProps {
  user: UserProfileType
  isOwnProfile: boolean
  currentUser: UserProfileType | null
  onNavigate: (screen: Screen) => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onBack?: () => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  currentStreak?: number
  longestStreak?: number
  sessionHistory?: SessionLog[]
  activityLogs?: ActivityLog[]
}

export function UserProfileScreen({
  user,
  isOwnProfile,
  currentUser,
  onNavigate,
  onSelectWorkout,
  onBack,
  onStartAction,
  hasWorkoutToday = false,
  currentStreak = 0,
  longestStreak = 0,
  sessionHistory = [],
  activityLogs = []
}: UserProfileProps) {
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const userWorkouts = await supabaseService.getUserWorkouts(user.id)
      if (isOwnProfile) {
        setWorkouts(userWorkouts)
      } else {
        setWorkouts(userWorkouts.filter(w => w.visibility === 'public'))
      }
    } catch (e) {
      console.error('Failed to load profile data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [user.id, isOwnProfile])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const achievementState = useMemo(() => getAchievementState(), [])
  const unlockedCount = achievementState.unlocked.length
  const totalAchievements = Object.keys(ACHIEVEMENTS).length
  const totalSessionLogs = sessionHistory.length
  const totalActivityLogs = activityLogs.length
  const totalPRs = sessionHistory.reduce((sum, log) => sum + (log.prs?.length ?? 0), 0)

  const featuredAchievementTypes: AchievementType[] = ['workouts-50', 'streak-30', 'prs-25']
  const featuredAchievements = featuredAchievementTypes.map((type) => {
    const definition = ACHIEVEMENTS[type]
    const progress = getAchievementProgress(type)
    return {
      type,
      title: definition.title,
      description: definition.description,
      progress: progress.current,
      target: progress.target,
      tier: definition.tier,
      unlocked: isUnlocked(type),
    }
  })


  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          {onBack && (
            <div className="pt-2">
              <BackButton onClick={onBack} label="Back" />
            </div>
          )}
          {/* Profile Header */}
          <div className="flex items-start gap-4 mt-4 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName}
                  width={80}
                  height={80}
                  unoptimized
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-black text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground truncate">{user.displayName}</h1>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-foreground mt-2 line-clamp-2">{user.bio}</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded capitalize">
                  {user.sport}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isOwnProfile ? (
              <Button
                onClick={() => onNavigate('settings')}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-card text-foreground"
              >
                <Settings size={20} className="text-foreground" />
              </Button>
            ) : null}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-foreground tabular-nums">{user.workoutCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Workouts</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-primary tabular-nums">{currentStreak}</p>
              <p className="text-xs text-muted-foreground uppercase">Streak</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-amber-400 tabular-nums">{unlockedCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Badges</p>
            </div>
          </div>

          {/* Progress Snapshot */}
          <div className="mb-4 rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                Progress Snapshot
              </p>
              {!currentUser?.isPremium && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  Pro stats in analytics
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                <p className="text-lg font-black text-foreground tabular-nums">{totalSessionLogs}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Gym Logs</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                <p className="text-lg font-black text-foreground tabular-nums">{totalActivityLogs}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Combat Logs</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center">
                <p className="text-lg font-black text-primary tabular-nums">{totalPRs}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total PRs</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Best streak: <span className="font-bold text-foreground">{longestStreak}</span> days.
              Achievements unlocked: <span className="font-bold text-foreground">{unlockedCount}/{totalAchievements}</span>.
            </p>
          </div>

          {/* View Statistics - Own Profile Only */}
          {isOwnProfile && (
            <Button
              onClick={() => {
                haptics.light()
                onNavigate('training-stats')
              }}
              variant="ghost"
              size="md"
              fullWidth
              withHaptic={false}
              className="mb-4 h-14 card-elevated rounded-xl font-semibold text-foreground hover:bg-card/80 transition-colors normal-case tracking-normal"
            >
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <BarChart size={20} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Training Statistics</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.isPremium
                        ? 'View your full analytics and insights'
                        : 'Open analytics preview and unlock full insights'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </div>
            </Button>
          )}

          {/* Achievement Progress */}
          {isOwnProfile && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                  Achievement Progress
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {unlockedCount}/{totalAchievements} unlocked
                </span>
              </div>
              <div className="space-y-3">
                {featuredAchievements.map((achievement) => (
                  <AchievementProgressCard
                    key={achievement.type}
                    type={achievement.type}
                    title={achievement.title}
                    description={achievement.description}
                    progress={achievement.progress}
                    target={achievement.target}
                    tier={achievement.tier}
                    isUnlocked={achievement.unlocked}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Edit Button */}
          {isOwnProfile && (
            <Button
              onClick={() => onNavigate('edit-profile')}
              variant="outline"
              size="md"
              fullWidth
              className="rounded-xl font-semibold gap-2 mb-6 normal-case tracking-normal"
            >
              <Edit size={18} />
              Edit Profile
            </Button>
          )}

          {/* Workouts */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-elevated rounded-xl p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-card rounded mb-2" />
                  <div className="h-4 w-1/2 bg-card rounded" />
                </div>
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <EmptyWorkouts
              isOwnProfile={isOwnProfile}
              onCreateWorkout={() => onNavigate('workout-builder')}
            />
          ) : (
            <div className="space-y-3">
              {workouts.map(workout => (
                <WorkoutListItem
                  key={workout.id}
                  workout={workout}
                  onTap={() => onSelectWorkout(workout)}
                />
              ))}
            </div>
          )}

          {/* Create Workout Button */}
          {isOwnProfile && workouts.length > 0 && (
            <Button
              onClick={() => {
                haptics.medium()
                onNavigate('workout-builder')
              }}
              variant="ghost"
              size="lg"
              fullWidth
              withHaptic={false}
              className="mt-4 border-2 border-dashed border-border rounded-xl gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors normal-case tracking-normal"
            >
              <Plus size={20} />
              Create New Workout
            </Button>
          )}
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav
          active="profile"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>

    </ScreenShell>
  )
}

// Workout List Item Component
function WorkoutListItem({
  workout,
  onTap
}: {
  workout: CustomWorkout
  onTap: () => void
}) {
  return (
    <Button
      onClick={onTap}
      variant="ghost"
      size="sm"
      className="w-full card-elevated rounded-xl p-4 text-left stagger-item normal-case tracking-normal h-auto items-start justify-start"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{workout.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {workout.description || 'No description'}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{workout.estimatedDuration} min</span>
            <span>•</span>
            <span>{workout.exercises.length} exercises</span>
            <span>•</span>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${focusAreaInfo[workout.focus].color}20`,
                color: focusAreaInfo[workout.focus].color
              }}
            >
              {focusAreaInfo[workout.focus].name}
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </Button>
  )
}

// Empty Workouts Component
function EmptyWorkouts({
  isOwnProfile,
  onCreateWorkout
}: {
  isOwnProfile: boolean
  onCreateWorkout: () => void
}) {
  if (isOwnProfile) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
          <Plus size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No workouts yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          Create your first workout to get started
        </p>
        <Button
          onClick={() => {
            haptics.medium()
            onCreateWorkout()
          }}
          variant="primary"
          size="md"
          withHaptic={false}
          className="px-6 py-3"
        >
          Create Workout
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">No public workouts</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        This user has not shared any workouts yet
      </p>
    </div>
  )
}
