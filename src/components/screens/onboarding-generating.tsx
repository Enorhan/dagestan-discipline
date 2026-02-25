'use client'

import { useEffect, useState } from 'react'
import { Equipment, PrimaryGoal, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { haptics } from '@/lib/haptics'
import { SportIcon } from '@/components/ui/sport-icons'

interface OnboardingGeneratingProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  primaryGoal: PrimaryGoal
  sessionMinutes: number
  error?: string | null
  onRetry?: () => void
  onGoBack?: () => void
}

const SPORT_LABELS: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu',
}

const EQUIPMENT_LABELS: Record<Exclude<Equipment, null>, string> = {
  bodyweight: 'Bodyweight only',
  gym: 'Basic gym',
}

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  balanced: 'Balanced',
  strength: 'Strength',
  power: 'Power',
  conditioning: 'Conditioning',
}

const PHASES = [
  'Analyzing your profile...',
  'Selecting exercises...',
  'Optimizing volume...',
  'Balancing recovery...',
  'Finalizing program...',
]

export function OnboardingGenerating({
  sport,
  trainingDays,
  equipment,
  primaryGoal,
  sessionMinutes,
  error,
  onRetry,
  onGoBack,
}: OnboardingGeneratingProps) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const equipmentLabel = equipment ? EQUIPMENT_LABELS[equipment] : 'Not selected'
  const hasError = !!error

  // Cycle through phases for visual feedback
  useEffect(() => {
    if (hasError) return
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % PHASES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [hasError])

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-center h-full">
        <div className="w-full text-center">
          {hasError ? (
            <>
              {/* Error state */}
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6 onboarding-fade-up">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-xs font-semibold tracking-[0.3em] text-red-400 uppercase mb-3 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
                Generation Failed
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground mb-8 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
                {error || 'We couldn\'t generate your program. Please try again.'}
              </p>
            </>
          ) : (
            <>
              {/* Loading state with sport icon */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary spinner-trail" />

                {/* Inner pulsing circle with sport icon */}
                <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center generating-pulse">
                  <SportIcon sport={sport} size={40} className="text-primary" />
                </div>
              </div>

              <p className="text-xs font-semibold tracking-[0.3em] text-primary uppercase mb-3 onboarding-fade-up">
                Building your plan
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
                Tailoring your program
              </h1>

              {/* Phase indicator */}
              <div className="h-6 mb-8">
                <p className="text-sm text-muted-foreground transition-all duration-300">
                  {PHASES[phaseIndex]}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/50 p-5 onboarding-fade-up" style={{ animationDelay: hasError ? '0.25s' : '0.2s' }}>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
            Your inputs
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sport</p>
              <p className="text-sm font-semibold text-foreground">{SPORT_LABELS[sport]}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Days/week</p>
              <p className="text-sm font-semibold text-foreground">{trainingDays} days</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Goal</p>
              <p className="text-sm font-semibold text-foreground">{GOAL_LABELS[primaryGoal]}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Session</p>
              <p className="text-sm font-semibold text-foreground">{sessionMinutes} min</p>
            </div>
          </div>
        </div>

        {hasError ? (
          <div className="mt-6 space-y-3 onboarding-fade-up" style={{ animationDelay: '0.3s' }}>
            {onRetry && (
              <Button
                onClick={() => {
                  haptics.medium()
                  onRetry()
                }}
                variant="primary"
                size="lg"
                fullWidth
                className="rounded-xl"
              >
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button
                onClick={() => {
                  haptics.light()
                  onGoBack()
                }}
                variant="ghost"
                size="sm"
                fullWidth
                className="rounded-xl"
              >
                Go Back and Change Settings
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 onboarding-fade-up" style={{ animationDelay: '0.25s' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </ScreenShellContent>
    </ScreenShell>
  )
}
