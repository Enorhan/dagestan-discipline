'use client'

import { useEffect, useState } from 'react'
import { Equipment, PrimaryGoal, SportType, ExperienceLevel } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { haptics } from '@/lib/haptics'
import { SportIcon } from '@/components/ui/sport-icons'

interface OnboardingGeneratingProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  primaryGoal: PrimaryGoal
  experienceLevel: ExperienceLevel
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
  gym: 'Full gym access',
}

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  balanced: 'Balanced fitness',
  strength: 'Max strength',
  power: 'Explosive power',
  conditioning: 'Fight conditioning',
}

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

// Transparent template selection phases
const TEMPLATE_PHASES = [
  { label: 'Loading program templates...', detail: 'Accessing elite athlete protocols' },
  { label: 'Selecting optimal template...', detail: 'Matching to your training frequency' },
  { label: 'Applying personalization...', detail: 'Adjusting for your level and goals' },
  { label: 'Finalizing your program...', detail: 'Ready to start training' },
]

export function OnboardingGenerating({
  sport,
  trainingDays,
  equipment,
  primaryGoal,
  experienceLevel,
  sessionMinutes,
  error,
  onRetry,
  onGoBack,
}: OnboardingGeneratingProps) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const equipmentLabel = equipment ? EQUIPMENT_LABELS[equipment] : 'Adaptive'
  const hasError = !!error

  // Faster phase cycling with quick completion
  useEffect(() => {
    if (hasError) return
    const interval = setInterval(() => {
      setPhaseIndex((prev) => {
        if (prev >= TEMPLATE_PHASES.length - 1) return prev
        return prev + 1
      })
    }, 600) // Faster transitions
    return () => clearInterval(interval)
  }, [hasError])

  // Show technical details after 2 seconds
  useEffect(() => {
    if (hasError) return
    const timeout = setTimeout(() => setShowDetails(true), 2000)
    return () => clearTimeout(timeout)
  }, [hasError])

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-center h-full">
        <div className="w-full text-center">
          {hasError ? (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6 onboarding-fade-up">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-xs font-semibold tracking-[0.3em] text-red-400 uppercase mb-3 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
                Setup Failed
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground mb-8 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
                {error || 'We couldn\'t set up your program. Please try again.'}
              </p>
            </>
          ) : (
            <>
              {/* Sport icon with progress ring */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-primary/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="text-primary transition-all duration-500"
                    strokeDasharray={`${(phaseIndex + 1) / TEMPLATE_PHASES.length * 283} 283`}
                  />
                </svg>
                <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <SportIcon sport={sport} size={36} className="text-primary" />
                </div>
              </div>

              <p className="text-xs font-semibold tracking-[0.3em] text-primary uppercase mb-2 onboarding-fade-up">
                Step {phaseIndex + 1} of {TEMPLATE_PHASES.length}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
                {TEMPLATE_PHASES[phaseIndex]?.label}
              </h1>
              <p className="text-sm text-muted-foreground mb-6 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
                {TEMPLATE_PHASES[phaseIndex]?.detail}
              </p>
            </>
          )}
        </div>

        {/* Program Summary Card */}
        <div className="rounded-2xl border border-border/70 bg-card/50 p-5 onboarding-fade-up" style={{ animationDelay: hasError ? '0.25s' : '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Your Program Settings
            </p>
            {showDetails && !hasError && (
              <span className="text-[10px] text-primary/70 bg-primary/10 px-2 py-1 rounded-full">
                Template-based
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sport</p>
              <p className="text-sm font-semibold text-foreground">{SPORT_LABELS[sport]}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Training</p>
              <p className="text-sm font-semibold text-foreground">{trainingDays} days/week</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Level</p>
              <p className="text-sm font-semibold text-foreground">{EXPERIENCE_LABELS[experienceLevel]}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Focus</p>
              <p className="text-sm font-semibold text-foreground">{GOAL_LABELS[primaryGoal]}</p>
            </div>
          </div>
          {showDetails && !hasError && (
            <p className="text-[10px] text-muted-foreground/70 mt-4 leading-relaxed">
              Your program is built from proven templates used by elite athletes. 
              Sessions are {sessionMinutes} minutes, adapted for {equipmentLabel.toLowerCase()}.
            </p>
          )}
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
                Change Settings
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 onboarding-fade-up" style={{ animationDelay: '0.25s' }}>
            {TEMPLATE_PHASES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= phaseIndex ? 'bg-primary w-4' : 'bg-primary/30'
                }`}
              />
            ))}
          </div>
        )}
      </ScreenShellContent>
    </ScreenShell>
  )
}
