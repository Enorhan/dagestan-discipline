'use client'

import { useState, useEffect } from 'react'
import { haptics } from '@/lib/haptics'
import { audio } from '@/lib/audio'
import { ScreenShell } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Button } from '@/components/ui/button'

type TimerMode = 'mma' | 'hiit' | 'tabata'

interface RoundTimerProps {
  mode: TimerMode
  onComplete: () => void
  onClose: () => void
}

const TIMER_CONFIGS = {
  mma: {
    name: 'MMA Rounds',
    workTime: 300, // 5 minutes
    restTime: 60,  // 1 minute
    rounds: 5,
  },
  hiit: {
    name: 'HIIT',
    workTime: 40,  // 40 seconds
    restTime: 20,  // 20 seconds
    rounds: 8,
  },
  tabata: {
    name: 'Tabata',
    workTime: 20,  // 20 seconds
    restTime: 10,  // 10 seconds
    rounds: 8,
  },
}

export function RoundTimer({ mode, onComplete, onClose }: RoundTimerProps) {
  const config = TIMER_CONFIGS[mode]
  const [currentRound, setCurrentRound] = useState(1)
  const [isWorking, setIsWorking] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(config.workTime)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null)
  const [phaseEndsAt, setPhaseEndsAt] = useState(Date.now() + config.workTime * 1000)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const getRemainingTime = () => Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000))

  useEffect(() => {
    setCurrentRound(1)
    setIsWorking(true)
    setIsPaused(false)
    setPauseStartedAt(null)
    setTimeRemaining(config.workTime)
    setPhaseEndsAt(Date.now() + config.workTime * 1000)
  }, [mode])

  useEffect(() => {
    setTimeRemaining(getRemainingTime())
  }, [phaseEndsAt])

  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setTimeRemaining(getRemainingTime())
    }, 250)

    return () => clearInterval(timer)
  }, [phaseEndsAt, isPaused])

  useEffect(() => {
    if (timeRemaining > 0) return

    if (isWorking) {
      // Work period done, start rest
      haptics.heavy()
      audio.restComplete()
      setIsWorking(false)
      setIsPaused(false)
      setPauseStartedAt(null)
      setPhaseEndsAt(Date.now() + config.restTime * 1000)
      setTimeRemaining(config.restTime)
    } else {
      // Rest period done
      if (currentRound >= config.rounds) {
        haptics.success()
        audio.sessionComplete()
        onComplete()
        return
      }
      haptics.medium()
      setCurrentRound(prev => prev + 1)
      setIsWorking(true)
      setIsPaused(false)
      setPauseStartedAt(null)
      setPhaseEndsAt(Date.now() + config.workTime * 1000)
      setTimeRemaining(config.workTime)
    }
  }, [timeRemaining, isWorking, currentRound, config, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePauseToggle = () => {
    haptics.light()
    if (isPaused) {
      const pausedFor = pauseStartedAt ? Date.now() - pauseStartedAt : 0
      if (pausedFor > 0) {
        setPhaseEndsAt(prev => prev + pausedFor)
      }
      setPauseStartedAt(null)
      setIsPaused(false)
      return
    }

    setPauseStartedAt(Date.now())
    setIsPaused(true)
  }

  const totalTime = isWorking ? config.workTime : config.restTime
  const progress = ((totalTime - timeRemaining) / totalTime) * 100

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="px-6 safe-area-top pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            {config.name}
          </p>
          <h1 className="text-xl font-black text-foreground tracking-tight mt-1">
            Round {currentRound} of {config.rounds}
          </h1>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
            Work {formatTime(config.workTime)} · Rest {formatTime(config.restTime)}
          </p>
        </div>
        <Button
          onClick={() => {
            haptics.light()
            setShowEndConfirm(true)
          }}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors px-4 rounded-lg bg-card/50 hover:bg-card"
          aria-label="End round timer"
        >
          End
        </Button>
      </header>

      {/* Main Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Status */}
        <div className={`mb-8 px-6 py-3 rounded-lg ${isWorking ? 'bg-primary' : 'bg-card/50'}`}>
          <p className={`text-xs font-bold tracking-[0.3em] uppercase ${isWorking ? 'text-primary-foreground' : 'text-foreground'}`}>
            {isWorking ? 'WORK' : 'REST'}
          </p>
        </div>

        {/* Time Display */}
        <div className="text-center mb-12">
          <p className="text-6xl sm:text-8xl font-black text-foreground tabular-nums" aria-live="polite">
            {formatTime(timeRemaining)}
          </p>
        </div>

        {isPaused && (
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-6">
            Paused
          </p>
        )}

        {/* Progress Bar */}
        <div
          className="w-full max-w-md h-2 bg-card/50 rounded-full mb-8 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${isWorking ? 'Work' : 'Rest'} phase: ${Math.round(progress)}% complete`}
        >
          <div
            className={`h-full transition-all duration-1000 rounded-full ${isWorking ? 'bg-primary' : 'bg-muted-foreground'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pause/Resume */}
        <Button
          onClick={handlePauseToggle}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.3em] hover:text-foreground transition-colors px-6 rounded-lg bg-card/50 hover:bg-card mb-6"
          aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </Button>

        {/* Round Indicators */}
        <div
          className="flex gap-2 flex-wrap justify-center"
          role="group"
          aria-label={`Round ${currentRound} of ${config.rounds}`}
        >
          {Array.from({ length: config.rounds }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i + 1 < currentRound
                  ? 'bg-primary'
                  : i + 1 === currentRound
                  ? 'bg-foreground'
                  : 'bg-card/50'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
      </div>

      {/* End Timer Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={() => {
          setShowEndConfirm(false)
          onClose()
        }}
        title="End Timer Early?"
        message="You're in the middle of your conditioning. Champions finish what they start."
        confirmText="End Timer"
        cancelText="Keep Going"
        variant="warning"
      />
    </ScreenShell>
  )
}
