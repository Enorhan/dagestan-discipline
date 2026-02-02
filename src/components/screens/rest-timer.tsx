'use client'

import { useEffect, useState, useRef } from 'react'
import { haptics } from '@/lib/haptics'
import { audio } from '@/lib/audio'
import { ScreenShell } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'

interface RestTimerProps {
  totalTime: number
  endsAt: number | null
  exerciseName: string
  nextSetNumber: number
  totalSets: number
  isPaused: boolean
  onTogglePause: () => void
  onAdjustTime: (deltaSeconds: number) => void
  onSkip: () => void
  onTimerComplete: () => void
  undoLabel?: string | null
  onUndo: () => void
}

export function RestTimer({
  totalTime,
  endsAt,
  exerciseName,
  nextSetNumber,
  totalSets,
  isPaused,
  onTogglePause,
  onAdjustTime,
  onSkip,
  onTimerComplete,
  undoLabel,
  onUndo
}: RestTimerProps) {
  const cues = [
    'Breathe slow. Reset your grip.',
    'Shake out your arms. Stay loose.',
    'Nasal breath in. Exhale longer.',
    'Loosen the shoulders. Stay ready.',
    'Visualize the next rep.',
  ]
  const cueIndex = Math.abs((exerciseName.length + nextSetNumber + totalSets) % cues.length)
  const cue = cues[cueIndex]
  const getRemainingTime = () => {
    if (!endsAt) return 0
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  }

  const [displayTime, setDisplayTime] = useState(getRemainingTime())
  const [countdownPhase, setCountdownPhase] = useState<3 | 2 | 1 | 'GO' | null>(null)
  const hasCompletedRef = useRef(false)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setDisplayTime(getRemainingTime())
    if (!endsAt) {
      hasCompletedRef.current = false
      setCountdownPhase(null)
    }
  }, [endsAt])

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  // Timer countdown effect - keeps the updater pure
  useEffect(() => {
    if (!endsAt || isPaused || countdownPhase !== null) return

    const timer = setInterval(() => {
      setDisplayTime(getRemainingTime())
    }, 250)

    return () => clearInterval(timer)
  }, [endsAt, isPaused, countdownPhase])

  // Completion effect - triggers 3-2-1 countdown when timer reaches 0
  useEffect(() => {
    if (displayTime === 0 && endsAt && !hasCompletedRef.current && countdownPhase === null) {
      hasCompletedRef.current = true

      // Start 3-2-1 countdown
      setCountdownPhase(3)
      haptics.medium()
      audio.countdown()

      let count = 3
      countdownIntervalRef.current = setInterval(() => {
        count--
        if (count === 2) {
          setCountdownPhase(2)
          haptics.medium()
          audio.countdown()
        } else if (count === 1) {
          setCountdownPhase(1)
          haptics.medium()
          audio.countdown()
        } else if (count === 0) {
          setCountdownPhase('GO')
          haptics.heavy()
          audio.restComplete()
          // Complete after showing GO briefly
          setTimeout(() => {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            onTimerComplete()
          }, 500)
        }
      }, 800)
    }
  }, [displayTime, endsAt, onTimerComplete, countdownPhase])

  const progress = totalTime > 0 ? ((totalTime - displayTime) / totalTime) * 100 : 0
  const minutes = Math.floor(displayTime / 60)
  const seconds = displayTime % 60

  if (!endsAt || totalTime === 0) {
    return (
      <ScreenShell className="items-center justify-center px-6">
        <div className="max-w-lg mx-auto w-full flex flex-col items-center">
          <p className="text-xs font-semibold tracking-[0.4em] text-muted-foreground uppercase mb-4">
            Rest
          </p>
          <p className="text-lg font-bold text-foreground mb-8">
            No rest timer active.
          </p>
        <Button
          onClick={() => {
            haptics.light()
            onSkip()
          }}
          variant="primary"
          size="lg"
          fullWidth
          withHaptic={false}
          className="max-w-sm bg-foreground text-background"
        >
          Continue
        </Button>
        </div>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell className="items-center justify-center px-6">
      <div className="max-w-lg mx-auto w-full flex flex-col items-center">
      {/* Rest Label */}
      <p className="text-xs font-semibold tracking-[0.4em] text-muted-foreground uppercase mb-8">
        Rest
      </p>

      {/* Timer Display */}
      <div
        className="relative mb-12"
        role="timer"
        aria-label={`Rest timer: ${minutes > 0 ? `${minutes} minutes and ${seconds} seconds` : `${seconds} seconds`} remaining`}
      >
        {/* Circular Progress Background */}
        <svg
          className="w-48 h-48 sm:w-64 sm:h-64 -rotate-90"
          viewBox="0 0 256 256"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Rest progress: ${Math.round(progress)}% complete`}
        >
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-card"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="square"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            className="text-primary transition-all duration-1000 ease-linear"
          />
        </svg>
        
        {/* Time Numbers or Countdown */}
        <div className="absolute inset-0 flex items-center justify-center">
          {countdownPhase !== null ? (
            <span
              className={`font-black tabular-nums animate-[countdown-pulse_800ms_ease-out] ${
                countdownPhase === 'GO'
                  ? 'text-4xl sm:text-6xl text-primary'
                  : 'text-6xl sm:text-8xl text-foreground'
              }`}
              aria-live="assertive"
            >
              {countdownPhase}
            </span>
          ) : (
            <span className="text-5xl sm:text-7xl font-black text-foreground tabular-nums" aria-live="polite">
              {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : seconds}
            </span>
          )}
        </div>
      </div>

      {countdownPhase !== null && (
        <p className="text-xs font-semibold tracking-[0.3em] text-primary uppercase mb-6">
          Get Ready
        </p>
      )}

      {isPaused && countdownPhase === null && (
        <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-6">
          Paused
        </p>
      )}

      {/* Rest Controls - hidden during countdown */}
      {countdownPhase === null && (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          <Button
            onClick={() => {
              haptics.light()
              onAdjustTime(-10)
            }}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className="px-3 sm:px-4 py-2.5 min-h-[44px] rounded-lg bg-card/50 text-muted-foreground text-xs font-semibold uppercase tracking-wide hover:text-foreground hover:bg-card transition-colors normal-case tracking-normal"
            aria-label="Decrease rest by 10 seconds"
          >
            -10s
          </Button>
          <Button
            onClick={() => {
              haptics.light()
              onTogglePause()
            }}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className="px-3 sm:px-4 py-2.5 min-h-[44px] rounded-lg bg-card/50 text-muted-foreground text-xs font-semibold uppercase tracking-wide hover:text-foreground hover:bg-card transition-colors normal-case tracking-normal"
            aria-label={isPaused ? 'Resume rest timer' : 'Pause rest timer'}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            onClick={() => {
              haptics.light()
              onAdjustTime(10)
            }}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className="px-3 sm:px-4 py-2.5 min-h-[44px] rounded-lg bg-card/50 text-muted-foreground text-xs font-semibold uppercase tracking-wide hover:text-foreground hover:bg-card transition-colors normal-case tracking-normal"
            aria-label="Increase rest by 10 seconds"
          >
            +10s
          </Button>
        </div>
      )}

      {/* Next Up Info */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-2">
          Next up
        </p>
        <p className="text-lg font-bold text-foreground">
          {exerciseName}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Set {nextSetNumber} of {totalSets}
        </p>
      </div>

      {/* Discipline Message */}
      <div className="text-center px-8">
        <p className="text-sm text-muted-foreground italic">
          {cue}
        </p>
      </div>

      {countdownPhase === null && (
        <div className="mt-6 sm:mt-8 w-full flex items-center justify-center">
          <Button
            onClick={() => {
              haptics.light()
              onSkip()
            }}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className="px-4 py-3 min-h-[44px] rounded-lg text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors normal-case tracking-normal"
            aria-label="Skip rest timer"
          >
            Skip Rest
          </Button>
        </div>
      )}
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
    </ScreenShell>
  )
}
