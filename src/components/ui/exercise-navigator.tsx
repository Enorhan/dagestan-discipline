'use client'

import { Exercise } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { Button } from './button'

interface ExerciseNavigatorProps {
  exercises: Exercise[]
  currentExerciseIndex: number
  currentSet: number
  skippedExercises: Set<string>
  onJumpToExercise: (index: number) => void
  onSkipExercise: (exerciseId: string) => void
  onClose: () => void
}

export function ExerciseNavigator({
  exercises,
  currentExerciseIndex,
  currentSet,
  skippedExercises,
  onJumpToExercise,
  onSkipExercise,
  onClose
}: ExerciseNavigatorProps) {
  return (
    <div className="fixed inset-0 bg-background/98 z-50 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Exercise Navigator
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tap to jump · Long press to skip
          </p>
        </div>
        <Button
          onClick={() => {
            haptics.light()
            onClose()
          }}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="text-sm font-semibold text-foreground uppercase tracking-wide px-4 rounded-lg hover:bg-card/40 transition-colors"
          aria-label="Close navigator"
        >
          Done
        </Button>
      </header>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col gap-2 max-w-lg mx-auto">
          {exercises.map((exercise, index) => {
            const isSkipped = skippedExercises.has(exercise.id)
            const isCurrent = index === currentExerciseIndex
            const isPast = index < currentExerciseIndex
            const isFuture = index > currentExerciseIndex

            return (
              <Button
                key={exercise.id}
                onClick={() => {
                  if (!isSkipped) {
                    haptics.medium()
                    onJumpToExercise(index)
                    onClose()
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isPast) {
                    haptics.warning()
                    onSkipExercise(exercise.id)
                  }
                }}
                onTouchStart={(e) => {
                  // Long press detection for mobile
                  const timer = setTimeout(() => {
                    if (!isPast) {
                      haptics.warning()
                      onSkipExercise(exercise.id)
                    }
                  }, 500)
                  ;(e.currentTarget as HTMLButtonElement).dataset.longPressTimer = String(timer)
                }}
                onTouchEnd={(e) => {
                  const timer = (e.currentTarget as HTMLButtonElement).dataset.longPressTimer
                  if (timer) clearTimeout(Number(timer))
                }}
                onTouchMove={(e) => {
                  const timer = (e.currentTarget as HTMLButtonElement).dataset.longPressTimer
                  if (timer) clearTimeout(Number(timer))
                }}
                disabled={isSkipped}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className={`
                  w-full p-4 rounded-lg text-left transition-all relative normal-case tracking-normal h-auto items-start justify-start
                  ${isCurrent ? 'bg-primary/20 ring-2 ring-primary' : ''}
                  ${isPast && !isSkipped ? 'bg-card/30 opacity-60' : ''}
                  ${isFuture && !isSkipped ? 'bg-card/50 hover:bg-card/70' : ''}
                  ${isSkipped ? 'bg-card/20 opacity-40 cursor-not-allowed' : ''}
                `}
                aria-label={`${exercise.name}${isSkipped ? ' (skipped)' : isCurrent ? ' (current)' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`
                        w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full
                        ${isCurrent ? 'bg-primary text-primary-foreground' : ''}
                        ${isPast && !isSkipped ? 'bg-primary/50 text-primary-foreground' : ''}
                        ${isFuture && !isSkipped ? 'bg-card text-muted-foreground' : ''}
                        ${isSkipped ? 'bg-muted text-muted-foreground line-through' : ''}
                      `}>
                        {index + 1}
                      </span>
                      <span className={`
                        font-semibold truncate
                        ${isSkipped ? 'line-through text-muted-foreground' : 'text-foreground'}
                      `}>
                        {exercise.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-8">
                      {exercise.sets} sets × {exercise.duration ? `${exercise.duration}s` : `${exercise.reps} reps`}
                      {isCurrent && ` · Set ${currentSet}/${exercise.sets}`}
                    </p>
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-2">
                    {isSkipped && (
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Skipped
                      </span>
                    )}
                    {isPast && !isSkipped && (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide animate-pulse">
                        Now
                      </span>
                    )}
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-6 py-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Long press any upcoming exercise to skip it
        </p>
      </div>
    </div>
  )
}
