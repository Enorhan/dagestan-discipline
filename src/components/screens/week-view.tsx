'use client'

import React, { useState } from 'react'
import { Screen, WeekDay, Session, ActivityLog, ActivityType } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { Gi, Wrestling, Trophy, Boxing, Drill, Flame, Activity, Stretch } from '@/components/ui/icons'

// Activity type icons
const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  'bjj-session': <Gi size={20} className="text-primary" />,
  'wrestling-practice': <Wrestling size={20} className="text-primary" />,
  'judo-class': <Gi size={20} className="text-blue-500" />,
  'open-mat': <Stretch size={20} className="text-primary" />,
  'competition': <Trophy size={20} className="text-primary" />,
  'sparring': <Boxing size={20} className="text-primary" />,
  'drilling': <Drill size={20} className="text-primary" />,
  'conditioning': <Flame size={20} className="text-primary" />
}

// Activity type labels
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  'bjj-session': 'BJJ',
  'wrestling-practice': 'Wrestling',
  'judo-class': 'Judo',
  'open-mat': 'Open Mat',
  'competition': 'Competition',
  'sparring': 'Sparring',
  'drilling': 'Drilling',
  'conditioning': 'Conditioning'
}

interface WeekViewProps {
  weekProgress: WeekDay[]
  completedSessions: number
  plannedSessions: number
  onClose: () => void
  onRefresh?: () => Promise<void> | void
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  // Workout previews
  program?: Session[] | null
  // Activity logs for external training
  activityLogs?: ActivityLog[]
  // Activity CRUD operations
  onEditActivity?: (activity: ActivityLog) => void
  onDeleteActivity?: (activityId: string) => void
}

export function WeekView({
  weekProgress,
  completedSessions,
  plannedSessions,
  onClose,
  onRefresh,
  trainingTarget,
  onNavigate,
  program,
  activityLogs,
  onEditActivity,
  onDeleteActivity
}: WeekViewProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [activityToDelete, setActivityToDelete] = useState<ActivityLog | null>(null)

  // Use pull-to-refresh hook
  const {
    pullDistance,
    isRefreshing,
    handleTouchStart: handlePullStart,
    handleTouchMove: handlePullMove,
    handleTouchEnd: handlePullEnd
  } = usePullToRefresh({
    onRefresh: onRefresh || (() => {})
  })

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (activityToDelete && onDeleteActivity) {
      onDeleteActivity(activityToDelete.id)
      setActivityToDelete(null)
    }
  }

  // Map planned days to program sessions
  const getSessionForDay = (dayIndex: number): Session | null => {
    if (!program) return null
    // Count how many planned days come before this one
    let plannedCount = 0
    for (let i = 0; i < dayIndex; i++) {
      if (weekProgress[i].planned) plannedCount++
    }
    return program[plannedCount] ?? null
  }

  // Get activities logged for a specific day of the week
  const getActivitiesForDay = (dayName: string): ActivityLog[] => {
    if (!activityLogs || activityLogs.length === 0) return []

    return activityLogs.filter(log => {
      const logDate = new Date(log.date)
      const logDayName = logDate.toLocaleDateString('en-US', { weekday: 'long' })
      return logDayName === dayName
    })
  }

  // Combined touch handlers for pull-to-refresh and swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
    if (onRefresh) {
      handlePullStart(e)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (onRefresh) {
      handlePullMove(e)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (onRefresh) {
      handlePullEnd()
    }

    // Handle swipe gestures
    if (!touchStart) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y

    // Swipe right to go back (horizontal swipe > 100px, more horizontal than vertical)
    if (deltaX > 100 && Math.abs(deltaX) > Math.abs(deltaY)) {
      haptics.light()
      onClose()
    }

    setTouchStart(null)
  }

  const PULL_THRESHOLD = 80

  return (
    <ScreenShell
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {onRefresh && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 transition-all"
          style={{
            height: isRefreshing ? 60 : pullDistance,
            paddingTop: isRefreshing ? 20 : Math.max(0, pullDistance - 20)
          }}
        >
          <div
            className={`
              w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center
              ${isRefreshing ? 'animate-spin' : ''}
              ${pullDistance >= PULL_THRESHOLD ? 'bg-primary/20' : ''}
            `}
            style={{
              opacity: isRefreshing ? 1 : Math.min(1, pullDistance / PULL_THRESHOLD),
              transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)`
            }}
          >
            {isRefreshing ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            ) : (
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        </div>
      )}

      <ScreenShellContent
        className="transition-transform"
        style={{ transform: pullDistance > 0 || isRefreshing ? `translateY(${isRefreshing ? 60 : pullDistance}px)` : 'none' }}
      >
        <div className="max-w-lg mx-auto w-full pb-28">
          {/* Header */}
          <header className="px-6 safe-area-top pb-4">
            <BackButton onClick={onClose} label="Back" />
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-4">
              Week Progress
            </p>
            <h1 className="type-title text-foreground mt-1">
              Consistency
            </h1>
          </header>

          {/* Stats */}
          <div className="px-6 py-8">
            <div className="card-elevated rounded-xl p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-foreground tabular-nums">
                  {completedSessions}
                </span>
                <span className="text-2xl font-bold text-muted-foreground">
                  / {plannedSessions}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mt-4 mb-3 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${plannedSessions > 0 ? (completedSessions / plannedSessions) * 100 : 0}%`,
                    boxShadow: completedSessions > 0 ? '0 0 10px rgba(139, 0, 0, 0.5)' : 'none'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Sessions completed
              </p>
              {completedSessions === 0 && (
                <p className="text-sm text-muted-foreground/70 mt-3">
                  Complete your first session to see your progress here
                </p>
              )}
            </div>
          </div>

          {/* Week Grid */}
          <div className="px-6 py-6">
            <div className="flex flex-col gap-2">
              {weekProgress.map((day, index) => {
                const isToday = day.day === today
                const session = day.planned ? getSessionForDay(index) : null
                const isExpanded = expandedDay === index
                const dayActivities = getActivitiesForDay(day.day)
                const hasActivities = dayActivities.length > 0
                const hasContent = (day.planned && session) || hasActivities

                const dayButtonId = `day-button-${index}`

                return (
                  <div key={index} className="flex flex-col">
                    <Button
                      id={dayButtonId}
                      onClick={() => {
                        if (hasContent) {
                          setExpandedDay(isExpanded ? null : index)
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className={`
                        w-full flex items-start justify-start p-4 rounded-lg relative text-left transition-all normal-case tracking-normal h-auto
                        ${day.completed
                          ? 'bg-primary/10'
                          : day.planned || hasActivities
                            ? 'bg-card/50 hover:bg-card/70'
                            : 'bg-background cursor-default'
                        }
                        ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                        ${isExpanded ? 'rounded-b-none' : ''}
                      `}
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? `day-content-${index}` : undefined}
                      disabled={!hasContent}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`
                          w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg
                          ${day.completed
                            ? 'bg-primary text-primary-foreground'
                            : day.planned
                              ? 'bg-card text-muted-foreground'
                              : 'text-muted-foreground/50'
                          }
                        `}>
                          {day.shortDay}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`
                              text-base font-medium
                              ${day.completed
                                ? 'text-foreground'
                                : day.planned
                                  ? 'text-foreground'
                                  : 'text-muted-foreground/50'
                              }
                            `}>
                              {day.day}
                            </span>
                            {isToday && (
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Today
                              </span>
                            )}
                          </div>
                          {/* Show workout focus for planned days */}
                          {isExpanded && day.planned && session && !day.completed && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {session.focus} · {session.duration} min
                            </p>
                          )}
                          {/* Show activity summary only when expanded */}
                          {isExpanded && hasActivities && !day.planned && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                {dayActivities.slice(0, 3).map((a, i) => (
                                  <span key={i} className="flex-shrink-0">{ACTIVITY_ICONS[a.type]}</span>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {day.completed ? (
                          <span className="text-xs font-semibold text-primary">
                            Done
                          </span>
                        ) : day.planned ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {session ? `${session.exercises.length} ex` : 'Planned'}
                            </span>
                            {hasContent && (
                              <svg
                                className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </>
                        ) : hasActivities ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {dayActivities.length} log
                            </span>
                            <svg
                              className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            Rest
                          </span>
                        )}
                      </div>
                    </Button>

                    {/* Expanded content: exercises and/or activities */}
                    {isExpanded && hasContent && (
                      <div
                        id={`day-content-${index}`}
                        role="region"
                        aria-labelledby={dayButtonId}
                        tabIndex={0}
                        className="bg-card/30 rounded-b-lg border-t border-border/50 p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      >
                        <div className="flex flex-col gap-3">
                          {/* Planned workout exercises */}
                          {session && (
                            <div className="flex flex-col gap-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Planned Workout
                              </p>
                              {session.exercises.map((exercise, exIndex) => (
                                <div
                                  key={exercise.id}
                                  className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-card rounded-full">
                                      {exIndex + 1}
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                      {exercise.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {exercise.sets} × {exercise.duration ? `${exercise.duration}s` : exercise.reps}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Logged activities */}
                          {hasActivities && (
                            <div className="flex flex-col gap-2">
                              {session && <div className="border-t border-border/30 my-2" />}
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Logged Training
                              </p>
                              {dayActivities.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      {ACTIVITY_ICONS[activity.type]}
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-foreground">
                                        {ACTIVITY_LABELS[activity.type]}
                                      </span>
                                      {activity.notes && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                          {activity.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="text-xs text-muted-foreground">
                                        {activity.duration} min
                                      </span>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className={`text-xs font-semibold ${
                                          activity.intensity >= 8 ? 'text-primary' :
                                          activity.intensity >= 5 ? 'text-yellow-500' :
                                          'text-green-500'
                                        }`}>
                                          {activity.intensity}/10
                                        </span>
                                      </div>
                                    </div>
                                    {/* Edit/Delete buttons */}
                                    <div className="flex items-center gap-1 ml-2">
                                      {onEditActivity && (
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onEditActivity(activity)
                                          }}
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 rounded-lg bg-card/50 hover:bg-card transition-colors"
                                          aria-label="Edit activity"
                                        >
                                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </Button>
                                      )}
                                      {onDeleteActivity && (
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setActivityToDelete(activity)
                                          }}
                                          variant="ghost"
                                          size="icon"
                                          className="w-8 h-8 rounded-lg bg-card/50 hover:bg-red-500/20 transition-colors"
                                          aria-label="Delete activity"
                                        >
                                          <svg className="w-4 h-4 text-muted-foreground hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </ScreenShellContent>

      <BottomNav
        active="week"
        trainingTarget={trainingTarget}
        onNavigate={onNavigate}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={activityToDelete !== null}
        title="Delete Activity"
        message={activityToDelete ? `Delete this ${ACTIVITY_LABELS[activityToDelete.type]} session? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Keep"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onClose={() => setActivityToDelete(null)}
      />
    </ScreenShell>
  )
}
