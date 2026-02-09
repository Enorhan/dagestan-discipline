'use client'

import { useState, useEffect, useRef } from 'react'
import { Equipment, Session, WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Pause, Play, Check } from '@/components/ui/icons'

const sessionVisualTheme = (focus: string | undefined) => {
  const f = (focus ?? '').toLowerCase()
  if (f.includes('push') || f.includes('press') || f.includes('bench')) {
    return {
      headerGradient: 'from-blue-950 via-blue-900 to-background',
      chipText: 'text-blue-200',
      chipBg: 'bg-blue-500/15',
      chipBorder: 'border-blue-500/20',
    }
  }
  if (f.includes('pull') || f.includes('grip') || f.includes('row')) {
    return {
      headerGradient: 'from-emerald-950 via-emerald-900 to-background',
      chipText: 'text-emerald-200',
      chipBg: 'bg-emerald-500/15',
      chipBorder: 'border-emerald-500/20',
    }
  }
  if (f.includes('legs') || f.includes('squat') || f.includes('hips')) {
    return {
      headerGradient: 'from-orange-950 via-orange-900 to-background',
      chipText: 'text-orange-200',
      chipBg: 'bg-orange-500/15',
      chipBorder: 'border-orange-500/20',
    }
  }
  if (f.includes('core') || f.includes('neck')) {
    return {
      headerGradient: 'from-rose-950 via-rose-900 to-background',
      chipText: 'text-rose-200',
      chipBg: 'bg-rose-500/15',
      chipBorder: 'border-rose-500/20',
    }
  }
  if (f.includes('conditioning') || f.includes('circuit') || f.includes('round')) {
    return {
      headerGradient: 'from-red-950 via-red-900 to-background',
      chipText: 'text-red-200',
      chipBg: 'bg-red-500/15',
      chipBorder: 'border-red-500/20',
    }
  }
  if (f.includes('mobility') || f.includes('movement') || f.includes('recovery')) {
    return {
      headerGradient: 'from-purple-950 via-purple-900 to-background',
      chipText: 'text-purple-200',
      chipBg: 'bg-purple-500/15',
      chipBorder: 'border-purple-500/20',
    }
  }
  return {
    headerGradient: 'from-primary/30 via-background to-background',
    chipText: 'text-foreground',
    chipBg: 'bg-white/10',
    chipBorder: 'border-white/10',
  }
}

interface WorkoutSessionProps {
  session: Session | null
  currentExerciseIndex: number
  currentSet: number
  sessionStartTime: number | null
  weightUnit: WeightUnit
  equipment: Equipment | null
  isPaused: boolean
  pausedTime: number
  pauseStartedAt: number | null
  onTogglePause: () => void
  onEndSession: () => void
  onWeightUnitChange?: (unit: WeightUnit) => void
  // Progress tracking (per set)
  setProgressByExercise: Record<string, boolean[]>
  currentSessionWeights: Record<string, number[]> // base-unit (lbs) weights per set index; 0 means "not set"
  lastSessionWeights?: Record<string, number[]> // base-unit (lbs) weights per set index
  onSelectSet: (exerciseIndex: number, setNumber: number) => void
  onToggleSetDone: (exerciseIndex: number, setNumber: number, shouldBeDone: boolean, weightBase?: number) => void
  onFinishSession: () => void
  undoLabel?: string | null
  onUndo: () => void
}

export function WorkoutSession({
  session,
  currentExerciseIndex,
  currentSet,
  sessionStartTime,
  weightUnit,
  equipment,
  isPaused,
  pausedTime,
  pauseStartedAt,
  onTogglePause,
  onEndSession,
  onWeightUnitChange,
  setProgressByExercise,
  currentSessionWeights,
  lastSessionWeights,
  onSelectSet,
  onToggleSetDone,
  onFinishSession,
  undoLabel,
  onUndo,
}: WorkoutSessionProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [weight, setWeight] = useState<string>('')

  const unitRef = useRef<WeightUnit>(weightUnit)

  // Handle null session
  if (!session) {
    return (
      <ScreenShell className="items-center justify-center px-6">
        <p className="text-sm text-muted-foreground uppercase tracking-[0.3em] mb-4">
          No workout program loaded
        </p>
        <Button
          onClick={onEndSession}
          variant="primary"
          size="lg"
          fullWidth
          className="max-w-sm bg-foreground text-background"
        >
          Go Back
        </Button>
      </ScreenShell>
    )
  }

  const currentExercise = session.exercises[currentExerciseIndex]
  const totalExercises = session.exercises.length
  const isBodyweightOnly = equipment === 'bodyweight'

  if (!currentExercise) {
    return (
      <ScreenShell className="items-center justify-center px-6">
        <p className="text-sm text-muted-foreground uppercase tracking-[0.3em] mb-4">
          No exercise loaded
        </p>
        <Button
          onClick={onEndSession}
          variant="primary"
          size="lg"
          fullWidth
          className="max-w-sm bg-foreground text-background"
        >
          Return home
        </Button>
      </ScreenShell>
    )
  }

  const LBS_PER_KG = 2.20462

  const formatWeightValue = (value: number) => {
    const decimals = weightUnit === 'kg' ? 1 : 0
    return Number(value.toFixed(decimals)).toString()
  }

  const toDisplayWeight = (valueLbs: number) => (
    weightUnit === 'lbs' ? valueLbs : valueLbs / LBS_PER_KG
  )

  const toBaseWeight = (value: number) => (
    weightUnit === 'lbs' ? value : value * LBS_PER_KG
  )

  const visualTheme = sessionVisualTheme(session.focus)
  const selectedSetIndex = Math.max(0, currentSet - 1)

  const selectedDone =
    !!setProgressByExercise[currentExercise.id]?.[selectedSetIndex]

  const selectedCurrentBase = currentSessionWeights[currentExercise.id]?.[selectedSetIndex] ?? 0
  const selectedLastBase = lastSessionWeights?.[currentExercise.id]?.[selectedSetIndex] ?? 0

  const selectedLastDisplay = selectedLastBase > 0 ? formatWeightValue(toDisplayWeight(selectedLastBase)) : null

  const getDisplayForBase = (valueLbs: number | null | undefined) => {
    if (!valueLbs || valueLbs <= 0) return null
    return formatWeightValue(toDisplayWeight(valueLbs))
  }

  // Update elapsed time every second (paused time excluded)
  useEffect(() => {
    if (!sessionStartTime) return

    const updateElapsed = () => {
      const activePausedTime = isPaused && pauseStartedAt
        ? pausedTime + (Date.now() - pauseStartedAt)
        : pausedTime
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartTime - activePausedTime) / 1000))
      setElapsedTime(elapsed)
    }

    updateElapsed()
    if (isPaused) return

    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime, isPaused, pausedTime, pauseStartedAt])

  // Prefill weight when selection changes.
  useEffect(() => {
    if (isBodyweightOnly) {
      setWeight('')
      return
    }
    if (selectedCurrentBase > 0) {
      setWeight(formatWeightValue(toDisplayWeight(selectedCurrentBase)))
      return
    }
    if (selectedLastBase > 0) {
      setWeight(formatWeightValue(toDisplayWeight(selectedLastBase)))
      return
    }
    setWeight('')
  }, [currentExerciseIndex, currentSet, isBodyweightOnly, selectedCurrentBase, selectedLastBase, weightUnit])

  // Convert input when unit changes
  useEffect(() => {
    if (unitRef.current === weightUnit) return
    const currentValue = parseFloat(weight)
    if (!Number.isNaN(currentValue)) {
      const converted = unitRef.current === 'lbs'
        ? currentValue / LBS_PER_KG
        : currentValue * LBS_PER_KG
      setWeight(formatWeightValue(converted))
    }
    unitRef.current = weightUnit
  }, [weightUnit, weight, LBS_PER_KG])

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleSelectedSet = () => {
    if (isPaused) return
    const parsed = weight ? parseFloat(weight) : Number.NaN
    const baseWeight = !Number.isNaN(parsed) ? Number(toBaseWeight(parsed).toFixed(2)) : undefined
    const nextState = !selectedDone
    haptics.medium()
    onToggleSetDone(currentExerciseIndex, currentSet, nextState, baseWeight)

    // Practical auto-advance within the same exercise.
    if (nextState && currentSet < currentExercise.sets) {
      onSelectSet(currentExerciseIndex, currentSet + 1)
    }
  }

  const handleEndSessionWithHaptic = () => {
    haptics.warning()
    onEndSession()
  }

  const handlePauseToggle = () => {
    haptics.light()
    onTogglePause()
  }

  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets, 0)
  const completedSets = session.exercises.reduce((acc, ex) => {
    const flags = setProgressByExercise[ex.id] ?? []
    const done = flags.slice(0, ex.sets).filter(Boolean).length
    return acc + done
  }, 0)
  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const isSessionComplete = totalSets > 0 && completedSets >= totalSets

  return (
    <ScreenShell className="relative">
      {/* Progress Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-border"
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Workout progress: ${Math.round(progressPercent)}% complete`}
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        <ScreenShellContent className="pb-24">
          {/* Hero Header (Training Hub style) */}
          <div className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-b ${visualTheme.headerGradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10 px-6 safe-area-top pb-8">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    haptics.light()
                    setShowEndConfirm(true)
                  }}
                  className="min-h-[44px] px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-2"
                  aria-label="End session"
                >
                  <X size={18} strokeWidth={3} />
                  <span className="text-sm font-bold tracking-tight uppercase">End</span>
                </button>

                <div className="min-h-[44px] px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
                      Time
                    </p>
                    <p className="text-lg font-black text-white tabular-nums" aria-live="polite">
                      {formatElapsedTime(elapsedTime)}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <button
                    onClick={handlePauseToggle}
                    className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors flex items-center justify-center"
                    aria-label={isPaused ? 'Resume session' : 'Pause session'}
                  >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
                  {session.day}
                </p>
                <h1 className="text-4xl font-black tracking-tight text-foreground uppercase mt-2 leading-none">
                  {session.focus}
                </h1>
                <p className="text-sm text-white/60 mt-3 leading-relaxed">
                  {completedSets}/{totalSets} sets completed
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {onWeightUnitChange && !isBodyweightOnly && (
                  <button
                    onClick={() => {
                      haptics.light()
                      onWeightUnitChange(weightUnit === 'lbs' ? 'kg' : 'lbs')
                    }}
                    className={[
                      'min-h-[44px] px-4 rounded-full border backdrop-blur-md',
                      visualTheme.chipBg,
                      visualTheme.chipBorder,
                      visualTheme.chipText,
                      'text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity'
                    ].join(' ')}
                    aria-label={`Switch to ${weightUnit === 'lbs' ? 'kg' : 'lbs'}`}
                  >
                    {weightUnit}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div className="px-6 py-6 space-y-4">
            {session.exercises.map((exercise, exerciseIndex) => {
              const doneFlags = setProgressByExercise[exercise.id] ?? Array.from({ length: exercise.sets }, () => false)
              const doneCount = doneFlags.slice(0, exercise.sets).filter(Boolean).length
              return (
                <div
                  key={exercise.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-black/80 to-black/95 overflow-hidden"
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
                        {exercise.sets} sets · {exercise.duration ? `${exercise.duration}s` : `${exercise.reps ?? 0} reps`} · {exercise.restTime}s rest
                      </p>
                      <h3 className="text-base font-black text-white mt-1 truncate">
                        {exercise.name}
                      </h3>
                      {exercise.notes && (
                        <p className="text-xs text-white/60 mt-2 leading-relaxed line-clamp-2">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-white/70 tabular-nums">
                        {doneCount}/{exercise.sets}
                      </p>
                      <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mt-0.5">
                        Done
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {Array.from({ length: exercise.sets }).map((_, setIndex) => {
                        const isSelected = exerciseIndex === currentExerciseIndex && setIndex === selectedSetIndex
                        const isDone = !!doneFlags[setIndex]
                        const currentBase = currentSessionWeights[exercise.id]?.[setIndex] ?? 0
                        const lastBase = lastSessionWeights?.[exercise.id]?.[setIndex] ?? 0
                        const currentDisplay = getDisplayForBase(currentBase)
                        const lastDisplay = getDisplayForBase(lastBase)
                        const subtitle = currentDisplay
                          ? `${currentDisplay} ${weightUnit}`
                          : lastDisplay
                            ? `${lastDisplay} ${weightUnit} (last)`
                            : (isBodyweightOnly ? 'Bodyweight' : '—')

                        return (
                          <button
                            key={`${exercise.id}-set-${setIndex}`}
                            onClick={() => {
                              haptics.light()
                              onSelectSet(exerciseIndex, setIndex + 1)
                            }}
                            className={[
                              'w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-colors text-left',
                              isSelected ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10',
                              isDone ? 'opacity-90' : '',
                            ].join(' ')}
                            aria-label={`Select ${exercise.name} set ${setIndex + 1}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={[
                                  'w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0',
                                  isDone ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5 border-white/15',
                                ].join(' ')}
                                aria-hidden="true"
                              >
                                {isDone ? <Check size={16} className="text-emerald-300" /> : null}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                  Set {setIndex + 1}
                                </p>
                                <p className="text-xs text-white/60 truncate">
                                  {subtitle}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase flex-shrink-0">
                              {isDone ? 'Done' : 'Pending'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScreenShellContent>

        <ScreenShellFooter className="px-6">
          {isSessionComplete ? (
            <Button
              onClick={() => {
                haptics.success()
                onFinishSession()
              }}
              variant="primary"
              size="xl"
              fullWidth
              withHaptic={false}
              className="h-20 rounded-2xl font-black text-xl uppercase tracking-wide glow-primary-subtle"
              aria-label="Finish session"
            >
              Finish Session
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                    Selected
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {currentExercise.name} · Set {currentSet}/{currentExercise.sets}
                  </p>
                </div>
                <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${selectedDone ? 'text-emerald-400' : 'text-white/50'}`}>
                  {selectedDone ? 'Done' : 'Pending'}
                </span>
              </div>

              {!isBodyweightOnly && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={selectedLastDisplay ? `${selectedLastDisplay} (${weightUnit})` : `0 (${weightUnit})`}
                      className="h-14 bg-card/50 text-center text-xl font-bold tabular-nums"
                      aria-label="Weight input"
                      disabled={isPaused}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Last
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {selectedLastDisplay ? `${selectedLastDisplay} ${weightUnit}` : '—'}
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleToggleSelectedSet}
                disabled={isPaused}
                variant="primary"
                size="lg"
                fullWidth
                withHaptic={false}
                className="h-16 rounded-2xl font-black text-lg uppercase tracking-wide"
                aria-label={selectedDone ? 'Unmark set as done' : 'Mark set as done'}
              >
                {selectedDone ? 'Unmark Set' : 'Mark Set Done'}
              </Button>
            </div>
          )}
        </ScreenShellFooter>
      </div>

      {undoLabel && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4">
          <div className="flex items-center gap-3 bg-foreground text-background px-4 py-2 rounded-full shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {undoLabel}
            </span>
            <Button
              onClick={onUndo}
              variant="link"
              size="sm"
              className="text-xs font-bold uppercase tracking-wide text-background/90 hover:text-background p-0 h-auto min-h-0 normal-case tracking-normal"
              aria-label="Undo last action"
            >
              Undo
            </Button>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-40 px-6">
          <div className="w-full max-w-sm text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-4">
              Paused
            </p>
            <h2 className="text-3xl font-black text-foreground mb-3">
              Take a breath
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Resume when you're ready.
            </p>
            <Button
              onClick={handlePauseToggle}
              variant="primary"
              size="lg"
              fullWidth
              withHaptic={false}
              className="bg-foreground text-background"
            >
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEndSessionWithHaptic}
        title="End Session?"
        message="You know what you came here to do. The choice is yours."
        confirmText="End Session"
        cancelText="Continue"
        variant="destructive"
      />
    </ScreenShell>
  )
}
