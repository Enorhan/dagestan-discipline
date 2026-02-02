'use client'

import { useEffect, useRef, useState } from 'react'
import { Screen, Session, Exercise } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Dumbbell } from '@/components/ui/icons'

interface ExerciseListProps {
  session: Session
  currentExerciseIndex?: number
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
}

export function ExerciseList({ 
  session,
  currentExerciseIndex,
  trainingTarget,
  onNavigate
}: ExerciseListProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(() => new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollKey = `exercise-list-scroll-${session.id}`

  const formatPrescription = (exercise: Exercise) => {
    if (exercise.duration) {
      return `${exercise.duration}s hold`
    }
    return `${exercise.reps} reps`
  }

  const toggleExercise = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  useEffect(() => {
    if (currentExerciseIndex === undefined) return
    const currentExercise = session.exercises[currentExerciseIndex]
    if (!currentExercise) return
    const element = document.getElementById(`exercise-${currentExercise.id}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentExerciseIndex, session.exercises])

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(scrollKey)
    if (savedPosition && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedPosition, 10)
    }
  }, [scrollKey])

  // Save scroll position on unmount
  useEffect(() => {
    const container = scrollContainerRef.current
    return () => {
      if (container) {
        sessionStorage.setItem(scrollKey, String(container.scrollTop))
      }
    }
  }, [scrollKey])

  if (session.exercises.length === 0) {
    return (
      <ScreenShell className="items-center justify-center">
        <EmptyState
          icon={<Dumbbell size={40} className="text-muted-foreground" />}
          title="No Exercises Yet"
          message="This session doesn't have any exercises. Head back and start a workout to begin your training."
          actionText="Back home"
          onAction={() => onNavigate('home')}
        />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0 pb-28">
      {/* Header */}
      <header className="px-6 safe-area-top pb-4">
        <BackButton onClick={() => onNavigate('home')} label="Back" />
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-4">
          {session.day}
        </p>
        <h1 className="type-title text-foreground mt-2">
          {session.focus}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          {session.exercises.length} exercises
        </p>
      </header>

      {/* Session Info */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-center bg-card/50 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Est. time
            </p>
            <p className="text-base font-medium text-foreground mt-0.5">
              {session.duration} min
            </p>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div ref={scrollContainerRef} className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-3">
          {session.exercises.map((exercise, index) => {
            const isCurrent = currentExerciseIndex !== undefined && index === currentExerciseIndex
            const isPast = currentExerciseIndex !== undefined && index < currentExerciseIndex
            const isCollapsed = isPast && !expandedExercises.has(exercise.id)
            
            return (
              <div
                key={exercise.id}
                id={`exercise-${exercise.id}`}
                onClick={() => {
                  if (isPast) {
                    haptics.light()
                    toggleExercise(exercise.id)
                  }
                }}
                className={`
                  p-4 rounded-lg transition-all ${isPast ? 'cursor-pointer' : ''}
                  ${isCurrent
                    ? 'bg-primary/10'
                    : isPast
                      ? 'bg-muted/50 opacity-60'
                      : 'bg-card/50'
                  }
                `}
              >
                {/* Collapsed state - checkmark view */}
                <div className={`
                  flex items-center justify-between transition-all duration-200
                  ${isCollapsed ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}
                `}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {exercise.name}
                    </h3>
                  </div>
                </div>

                {/* Expanded state - full details view */}
                <div className={`
                  transition-all duration-200 ease-out
                  ${isCollapsed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-96'}
                `}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg transition-colors duration-200
                        ${isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isPast
                            ? 'bg-muted/50 text-muted-foreground'
                            : 'bg-card text-foreground'
                        }
                      `}>
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {exercise.name}
                        </h3>
                        {isCurrent && (
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                            Current
                          </span>
                        )}
                        {isPast && (
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-11 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span>{exercise.sets} sets</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{formatPrescription(exercise)}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{exercise.restTime}s rest</span>
                  </div>

                  {exercise.notes && (
                    <p className="ml-11 mt-3 text-sm text-muted-foreground bg-card/30 rounded-lg px-3 py-2">
                      {exercise.notes}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between text-sm bg-card/50 rounded-lg p-4">
          <span className="text-muted-foreground uppercase tracking-wide">
            Total
          </span>
          <span className="font-medium text-foreground">
            {session.exercises.length} exercises · {session.exercises.reduce((acc, ex) => acc + ex.sets, 0)} sets
          </span>
        </div>
      </div>
      </div>

      <BottomNav
        active="training"
        trainingTarget={trainingTarget}
        onNavigate={onNavigate}
      />
    </ScreenShell>
  )
}
