'use client'

import { useState, useEffect, useRef } from 'react'
import { Equipment, Session, WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { ExerciseNavigator } from '@/components/ui/exercise-navigator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
  onConfirmSet: (weight?: number) => void
  onPreviousSet: () => void
  onEndSession: () => void
  onWeightUnitChange?: (unit: WeightUnit) => void
  lastSessionWeights?: Record<string, number[]> // exerciseId -> weights per set
  undoLabel?: string | null
  onUndo: () => void
  // Exercise navigation
  skippedExercises: Set<string>
  onJumpToExercise: (index: number) => void
  onSkipExercise: (exerciseId: string) => void
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
  onConfirmSet,
  onPreviousSet,
  onEndSession,
  onWeightUnitChange,
  lastSessionWeights,
  undoLabel,
  onUndo,
  skippedExercises,
  onJumpToExercise,
  onSkipExercise
}: WorkoutSessionProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [weight, setWeight] = useState<string>('')
  const [showVideo, setShowVideo] = useState(false)
  const [weightFlash, setWeightFlash] = useState<'increase' | 'decrease' | null>(null)
  const [confirmPulse, setConfirmPulse] = useState(false)
  const [showSetCheck, setShowSetCheck] = useState(false)
  const [isBodyweight, setIsBodyweight] = useState(false)
  const [weightUndo, setWeightUndo] = useState<{ previous: string } | null>(null)

  const lastWeightRef = useRef<number | null>(null)
  const unitRef = useRef<WeightUnit>(weightUnit)
  const weightFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const weightUndoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const isLastSet = currentSet === currentExercise.sets
  const isLastExercise = currentExerciseIndex === totalExercises - 1

  // Get last session weight for this exercise and set
  const getLastWeight = () => {
    if (!lastSessionWeights || !currentExercise) return null
    const weights = lastSessionWeights[currentExercise.id]
    if (!weights || weights.length < currentSet) return null
    return weights[currentSet - 1]
  }

  const lastWeight = getLastWeight()
  const lastBestWeight = lastSessionWeights?.[currentExercise.id]?.reduce((max, value) => Math.max(max, value), 0) ?? null
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

  const canGoPrevious = currentExerciseIndex > 0 || currentSet > 1
  const nextExercise = isLastSet ? session.exercises[currentExerciseIndex + 1] : currentExercise
  const nextSetNumber = isLastSet ? 1 : currentSet + 1
  const remainingSets = session.exercises.reduce((acc, exercise, index) => {
    if (index < currentExerciseIndex) return acc
    if (index === currentExerciseIndex) {
      return acc + Math.max(0, exercise.sets - currentSet + 1)
    }
    return acc + exercise.sets
  }, 0)
  const remainingRestSeconds = session.exercises.reduce((acc, exercise, index) => {
    if (index < currentExerciseIndex) return acc
    const setsLeft = index === currentExerciseIndex
      ? Math.max(0, exercise.sets - currentSet)
      : exercise.sets
    return acc + (setsLeft * exercise.restTime)
  }, 0)
  const remainingMinutes = Math.max(1, Math.round(remainingRestSeconds / 60))
  const lastWeightDisplay = lastWeight !== null && lastWeight !== undefined
    ? formatWeightValue(toDisplayWeight(lastWeight))
    : null
  const lastBestDisplay = lastBestWeight !== null && lastBestWeight !== undefined && lastBestWeight > 0
    ? formatWeightValue(toDisplayWeight(lastBestWeight))
    : null
  const currentWeightValue = parseFloat(weight)
  const weightDelta = lastWeightDisplay && !Number.isNaN(currentWeightValue)
    ? Number((currentWeightValue - parseFloat(lastWeightDisplay)).toFixed(1))
    : null
  const lastBestDisplayValue = lastBestDisplay ? parseFloat(lastBestDisplay) : null
  const isPrAttempt = lastBestDisplayValue !== null && !Number.isNaN(currentWeightValue)
    ? currentWeightValue > lastBestDisplayValue
    : false
  const suggestionBase = lastWeight ?? lastBestWeight
  const suggestionIncrement = weightUnit === 'kg' ? (2.5 * LBS_PER_KG) : 5
  const suggestedWeight = suggestionBase ? suggestionBase + suggestionIncrement : null
  const suggestedDisplay = suggestedWeight ? formatWeightValue(toDisplayWeight(suggestedWeight)) : null

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

  // Auto-fill weight with last session data
  useEffect(() => {
    if (isBodyweightOnly) {
      setWeight('')
      setIsBodyweight(true)
      return
    }
    if (lastWeight !== null && lastWeight !== undefined) {
      setWeight(formatWeightValue(toDisplayWeight(lastWeight)))
      setIsBodyweight(false)
    } else {
      setWeight('')
      setIsBodyweight(false)
    }
  }, [currentExerciseIndex, currentSet, lastWeight, isBodyweightOnly])

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

  // Weight change feedback
  useEffect(() => {
    const currentValue = parseFloat(weight)
    if (Number.isNaN(currentValue)) {
      lastWeightRef.current = null
      return
    }

    const previousValue = lastWeightRef.current
    if (previousValue !== null && currentValue !== previousValue) {
      setWeightFlash(currentValue > previousValue ? 'increase' : 'decrease')
      if (weightFlashTimeoutRef.current) {
        clearTimeout(weightFlashTimeoutRef.current)
      }
      weightFlashTimeoutRef.current = setTimeout(() => {
        setWeightFlash(null)
      }, 250)
    }

    lastWeightRef.current = currentValue
  }, [weight])

  useEffect(() => {
    return () => {
      if (weightFlashTimeoutRef.current) {
        clearTimeout(weightFlashTimeoutRef.current)
      }
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current)
      }
      if (weightUndoTimeoutRef.current) {
        clearTimeout(weightUndoTimeoutRef.current)
      }
    }
  }, [])

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleConfirmSetWithHaptic = () => {
    if (isPaused) return
    haptics.medium()
    setConfirmPulse(true)
    setShowSetCheck(true)

    const weightNum = !isBodyweight && weight ? parseFloat(weight) : undefined
    const baseWeight = weightNum !== undefined && !Number.isNaN(weightNum)
      ? Number(toBaseWeight(weightNum).toFixed(2))
      : undefined

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current)
    }

    confirmTimeoutRef.current = setTimeout(() => {
      onConfirmSet(baseWeight)
      setWeight('')
      setIsBodyweight(false)
      setConfirmPulse(false)
      setShowSetCheck(false)
    }, 250)
  }

  const handleEndSessionWithHaptic = () => {
    haptics.warning()
    onEndSession()
  }

  const handlePauseToggle = () => {
    haptics.light()
    onTogglePause()
  }

  const handlePreviousSetWithHaptic = () => {
    if (!canGoPrevious || isPaused) return
    haptics.warning()
    onPreviousSet()
  }

  const queueWeightUndo = (previous: string) => {
    setWeightUndo({ previous })
    if (weightUndoTimeoutRef.current) {
      clearTimeout(weightUndoTimeoutRef.current)
    }
    weightUndoTimeoutRef.current = setTimeout(() => {
      setWeightUndo(null)
    }, 4000)
  }

  const handleUndoWeight = () => {
    if (!weightUndo) return
    setWeight(weightUndo.previous)
    setWeightUndo(null)
    setIsBodyweight(false)
  }

  const progressPercent = ((currentExerciseIndex * 100) / totalExercises) +
    ((currentSet / currentExercise.sets) * (100 / totalExercises))

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
        {/* Header */}
        <header className="px-6 safe-area-top pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {session.day}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Exercise {currentExerciseIndex + 1} of {totalExercises} · Set {currentSet} of {currentExercise.sets}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground tabular-nums" aria-live="polite">
              {formatElapsedTime(elapsedTime)}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
              {onWeightUnitChange && !isBodyweightOnly && (
                <Button
                  onClick={() => {
                    haptics.light()
                    onWeightUnitChange(weightUnit === 'lbs' ? 'kg' : 'lbs')
                  }}
                  variant="ghost"
                  size="sm"
                  withHaptic={false}
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card/40"
                  aria-label={`Switch to ${weightUnit === 'lbs' ? 'kg' : 'lbs'}`}
                >
                  {weightUnit}
                </Button>
              )}
              <Button
                onClick={() => {
                  haptics.light()
                  setShowNavigator(true)
                }}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className="text-xs font-medium text-primary uppercase tracking-wide hover:text-primary/80 transition-colors px-3 rounded-lg hover:bg-primary/10"
                aria-label="Open exercise navigator"
              >
                Exercises
              </Button>
              <Button
                onClick={handlePreviousSetWithHaptic}
                disabled={!canGoPrevious || isPaused}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className={`text-xs font-medium uppercase tracking-wide transition-colors px-3 rounded-lg ${
                  !canGoPrevious || isPaused
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
                aria-label="Go to previous set"
              >
                ← Previous
              </Button>
              <Button
                onClick={() => {
                  if (isPaused || isLastExercise) return
                  haptics.warning()
                  onSkipExercise(currentExercise.id)
                }}
                disabled={isPaused || isLastExercise}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className={`text-xs font-medium uppercase tracking-wide transition-colors px-3 rounded-lg ${
                  isPaused || isLastExercise
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-primary hover:text-primary/80 hover:bg-primary/10'
                }`}
                aria-label="Skip to next exercise"
              >
                Skip →
              </Button>
              <Button
                onClick={() => {
                  haptics.light()
                  setShowEndConfirm(true)
                }}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-destructive transition-colors px-3 rounded-lg hover:bg-card/40"
                aria-label="End session"
              >
                End
              </Button>
              <Button
                onClick={handlePauseToggle}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card/40"
                aria-label={isPaused ? 'Resume session' : 'Pause session'}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
          </div>
        </header>

        {/* Now / Next */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card/50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3em]">
                Now
              </p>
              <p className="text-sm font-semibold text-foreground mt-2">
                {currentExercise.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Set {currentSet} of {currentExercise.sets}
              </p>
            </div>
            <div className="bg-card/50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.3em]">
                Next
              </p>
              <p className="text-sm font-semibold text-foreground mt-2">
                {isLastSet && isLastExercise ? 'Finish session' : (nextExercise?.name ?? 'Next exercise')}
              </p>
              {!(isLastSet && isLastExercise) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Set {nextSetNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Exercise Display */}
        <div className="px-6 flex flex-col justify-center min-h-0">
        {/* Current Exercise - HERO */}
        <div className="mb-6">
          <h1 className="type-title text-foreground tracking-tight leading-none text-balance">
            {currentExercise.name}
          </h1>

          {/* Prescription - LARGE */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-primary tabular-nums">
              {currentExercise.duration || currentExercise.reps}
            </span>
            <span className="text-lg text-muted-foreground">
              {currentExercise.duration ? 'seconds' : 'reps'}
            </span>
          </div>

          {/* Notes if present - SMALL */}
          {currentExercise.notes && (
            <p className="mt-4 text-sm text-muted-foreground/70 border-l-2 border-primary/30 pl-3">
              {currentExercise.notes}
            </p>
          )}

          {/* Video Demo Toggle & Player */}
          {currentExercise.videoUrl && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  haptics.light()
                  setShowVideo(!showVideo)
                }}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className="text-sm font-semibold text-primary uppercase tracking-wide hover:opacity-80 transition-opacity flex items-center gap-2 px-3 rounded-lg normal-case tracking-normal"
                aria-expanded={showVideo}
                aria-label={showVideo ? 'Hide exercise demo' : 'Show exercise demo'}
              >
                {showVideo ? '▼ Hide Demo' : '▶ Show Demo'}
              </Button>

              {showVideo && (
                <div className="mt-3 rounded-lg overflow-hidden bg-card/50">
                  <iframe
                    src={currentExercise.videoUrl}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${currentExercise.name} demonstration`}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weight Input with +/- buttons */}
        <div className="mb-8">
          {!isBodyweightOnly && (
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg bg-card/40 px-3 py-2">
                <p className="uppercase tracking-wide">Last set</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {lastWeightDisplay ? `${lastWeightDisplay} ${weightUnit}` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-card/40 px-3 py-2">
                <p className="uppercase tracking-wide">Best set</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {lastBestDisplay ? `${lastBestDisplay} ${weightUnit}` : '—'}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Weight
            </span>
            <Button
              onClick={() => {
                if (isBodyweightOnly) return
                haptics.light()
                setIsBodyweight(prev => !prev)
                if (!isBodyweight) {
                  setWeight('')
                }
              }}
              variant="ghost"
              size="sm"
              withHaptic={false}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-colors normal-case tracking-normal ${
                isBodyweight || isBodyweightOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/50 text-muted-foreground hover:text-foreground'
              } ${isBodyweightOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              aria-pressed={isBodyweight || isBodyweightOnly}
              aria-label={isBodyweightOnly ? 'Bodyweight only session' : 'Toggle bodyweight input'}
              disabled={isBodyweightOnly}
            >
              Bodyweight
            </Button>
          </div>
          {isBodyweightOnly ? (
            <div className="rounded-lg bg-card/40 p-4 text-center">
              <p className="text-sm font-semibold text-foreground">
                Bodyweight session
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Weight input disabled for this mode.
              </p>
            </div>
          ) : null}
          {!isBodyweightOnly && lastWeightDisplay && (
            <p className="text-xs text-muted-foreground text-center mb-3">
              Last: {lastWeightDisplay} {weightUnit}
              {weightDelta !== null && !Number.isNaN(weightDelta) && (
                <span className={weightDelta >= 0 ? 'text-primary' : 'text-destructive'}>
                  {' '}
                  ({weightDelta >= 0 ? '+' : ''}{weightDelta})
                </span>
              )}
            </p>
          )}
          {!isBodyweightOnly && suggestedDisplay && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">
                Suggested: {suggestedDisplay} {weightUnit}
              </span>
              <Button
                onClick={() => {
                  haptics.light()
                  setIsBodyweight(false)
                  setWeight(suggestedDisplay)
                }}
                variant="ghost"
                size="sm"
                withHaptic={false}
                className="px-4 rounded-full text-xs font-semibold uppercase tracking-wide text-foreground bg-card/50 hover:bg-card transition-colors normal-case tracking-normal"
                aria-label="Use suggested weight"
              >
                Use
              </Button>
              {isPrAttempt && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  PR attempt
                </span>
              )}
            </div>
          )}
          {!isBodyweightOnly && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-3 items-center">
            <Button
              onClick={() => {
                haptics.light()
                setIsBodyweight(false)
                queueWeightUndo(weight)
                const current = parseFloat(weight) || 0
                setWeight(Math.max(0, current - 10).toString())
              }}
              variant="ghost"
              size="lg"
              withHaptic={false}
              className="order-1 sm:order-1 w-full h-14 bg-card/30 rounded-lg text-muted-foreground text-lg font-semibold hover:bg-card transition-colors active:scale-95 normal-case tracking-normal"
              aria-label="Decrease weight by 10"
            >
              -10
            </Button>
            <Button
              onClick={() => {
                haptics.light()
                setIsBodyweight(false)
                queueWeightUndo(weight)
                const current = parseFloat(weight) || 0
                setWeight(Math.max(0, current - 5).toString())
              }}
              variant="ghost"
              size="lg"
              withHaptic={false}
              className="order-2 sm:order-2 w-full h-14 bg-primary/15 rounded-lg text-foreground text-lg font-bold hover:bg-primary/25 transition-colors active:scale-95 normal-case tracking-normal"
              aria-label="Decrease weight by 5"
            >
              -5
            </Button>
            <div
              className={`order-3 sm:order-3 col-span-2 sm:col-span-1 relative rounded-lg transition-all duration-200 ${
                weightFlash
                  ? 'animate-[weight-bump_200ms_ease-out]'
                  : ''
              } ${weightFlash === 'increase' ? 'ring-2 ring-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb,34,197,94),0.3)]' : ''} ${weightFlash === 'decrease' ? 'ring-2 ring-destructive/40 shadow-[0_0_12px_rgba(var(--destructive-rgb,239,68,68),0.3)]' : ''}`}
            >
              <Input
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                value={isBodyweight ? '' : weight}
                onChange={(e) => {
                  setIsBodyweight(false)
                  setWeight(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                    haptics.light()
                  }
                }}
                onBlur={() => {
                  const current = parseFloat(weight)
                  if (!Number.isNaN(current) && current < 0) {
                    setWeight('0')
                  }
                }}
                placeholder={isBodyweight ? 'BW' : '0'}
                disabled={isBodyweight}
                className={`h-14 bg-card/50 text-center text-2xl font-bold tabular-nums pr-12 transition-colors duration-200 ${
                  isBodyweight ? 'opacity-60 cursor-not-allowed' : ''
                } ${weightFlash === 'increase' ? 'text-primary' : ''} ${weightFlash === 'decrease' ? 'text-destructive' : ''}`}
                aria-label="Weight input"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
                weightFlash === 'increase' ? 'text-primary' : weightFlash === 'decrease' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {weightUnit}
              </span>
            </div>
            <Button
              onClick={() => {
                haptics.light()
                setIsBodyweight(false)
                queueWeightUndo(weight)
                const current = parseFloat(weight) || 0
                setWeight((current + 5).toString())
              }}
              variant="ghost"
              size="lg"
              withHaptic={false}
              className="order-4 sm:order-4 w-full h-14 bg-primary/15 rounded-lg text-foreground text-lg font-bold hover:bg-primary/25 transition-colors active:scale-95 normal-case tracking-normal"
              aria-label="Increase weight by 5"
            >
              +5
            </Button>
            <Button
              onClick={() => {
                haptics.light()
                setIsBodyweight(false)
                queueWeightUndo(weight)
                const current = parseFloat(weight) || 0
                setWeight((current + 10).toString())
              }}
              variant="ghost"
              size="lg"
              withHaptic={false}
              className="order-5 sm:order-5 w-full h-14 bg-card/30 rounded-lg text-muted-foreground text-lg font-semibold hover:bg-card transition-colors active:scale-95 normal-case tracking-normal"
              aria-label="Increase weight by 10"
            >
              +10
            </Button>
          </div>
          )}
          {weightUndo && (
            <div className="mt-3 flex items-center justify-center">
              <Button
                onClick={handleUndoWeight}
                variant="ghost"
                size="sm"
                className="px-4 rounded-full text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors normal-case tracking-normal"
                aria-label="Undo weight change"
              >
                Undo weight change
              </Button>
            </div>
          )}
        </div>

        {/* Set Counter - Simple text */}
        <div
          className="mb-8 text-center"
          role="status"
          aria-label={`Set ${currentSet} of ${currentExercise.sets}. ${remainingSets} sets remaining, approximately ${remainingMinutes} minutes left.`}
        >
          <p className="text-3xl font-bold text-foreground tabular-nums" aria-hidden="true">
            {currentSet}<span className="text-muted-foreground">/{currentExercise.sets}</span>
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1" aria-hidden="true">
            Sets
          </p>
          <p className="text-xs text-muted-foreground mt-3" aria-hidden="true">
            {remainingSets} sets left · ~{remainingMinutes} min remaining
          </p>
        </div>
        </div>
      </ScreenShellContent>

      {/* Confirm Set CTA */}
      <ScreenShellFooter className="px-6">
        <Button
          onClick={handleConfirmSetWithHaptic}
          disabled={isPaused}
          variant="primary"
          size="xl"
          fullWidth
          withHaptic={false}
          className={`h-20 font-black text-xl tracking-wide uppercase transition-all hover:opacity-90 active:scale-[0.99] rounded-lg relative ${
            confirmPulse ? 'animate-[button-pulse_250ms_ease-out]' : ''
          } ${isPaused ? 'opacity-60 cursor-not-allowed' : ''}`}
          aria-label={isLastSet && isLastExercise ? 'Finish session' : 'Confirm set'}
        >
          <span className={showSetCheck ? 'opacity-0' : 'opacity-100'}>
            {isLastSet && isLastExercise ? 'Finish Session' : 'Confirm Set'}
          </span>
          {showSetCheck && (
            <span className="absolute inset-0 flex items-center justify-center animate-[check-pop_200ms_ease-out]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground uppercase tracking-wide">
          {isLastSet && isLastExercise
            ? 'Next: Reflection'
            : isLastSet
              ? `Next: Rest ${currentExercise.restTime}s · ${nextExercise?.name ?? 'Next exercise'}`
              : `Next: Rest ${currentExercise.restTime}s · Set ${currentSet + 1}`}
        </p>
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

      {/* Exercise Navigator */}
      {showNavigator && (
        <ExerciseNavigator
          exercises={session.exercises}
          currentExerciseIndex={currentExerciseIndex}
          currentSet={currentSet}
          skippedExercises={skippedExercises}
          onJumpToExercise={onJumpToExercise}
          onSkipExercise={onSkipExercise}
          onClose={() => setShowNavigator(false)}
        />
      )}
    </ScreenShell>
  )
}
