'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { Celebration } from '@/components/ui/confetti'
import { haptics } from '@/lib/haptics'

interface OnboardingAppTourProps {
  onBack: () => void
  onFinish: () => Promise<void> | void
}

const TOUR_STEPS = [
  {
    eyebrow: 'Home',
    title: 'Start from Today',
    body: 'Your home screen is your daily command center: this week progress, your assigned workout, and one-tap quick actions.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-primary">
        <rect x="8" y="8" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 20h16M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    eyebrow: 'Execution',
    title: 'Run and adapt sessions',
    body: 'Start Workout runs your plan as written. Edit Today lets you adapt when time, recovery, or equipment changes.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-primary">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2"/>
        <path d="M20 18l10 6-10 6V18z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    eyebrow: 'Training Hub',
    title: 'Explore elite exercise libraries',
    body: 'Browse wrestling, judo, and BJJ categories. Athlete cards are shown only when they have relevant exercises attached.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-primary">
        <rect x="6" y="20" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="20" y="20" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="34" y="20" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    eyebrow: 'Progress',
    title: 'Track consistency over motivation',
    body: 'Session history, weekly completion, and streak feedback keep you honest and help you course-correct quickly.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-primary">
        <path d="M12 32l8-8 6 6 10-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
] as const

export function OnboardingAppTour({ onBack, onFinish }: OnboardingAppTourProps) {
  const [step, setStep] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const isLast = step === TOUR_STEPS.length - 1
  const active = TOUR_STEPS[step]

  const handlePrimary = () => {
    if (!isLast) {
      haptics.light()
      setStep((prev) => prev + 1)
      return
    }

    if (isFinishing) return

    // Trigger celebration
    haptics.medium()
    setShowCelebration(true)
    setIsFinishing(true)

    // Delay the actual finish to show celebration
    setTimeout(() => {
      Promise.resolve(onFinish())
        .catch(() => {})
        .finally(() => {
          setIsFinishing(false)
        })
    }, 1500)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      {/* Celebration overlay */}
      <Celebration active={showCelebration} />

      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={7} totalSteps={7} />
        </div>

        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.05s' }}>
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            App walkthrough
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-2">
            How to use the app
          </h1>
        </div>

        <div
          key={`tour-${step}`}
          className="rounded-2xl border border-border/70 bg-card/50 p-6 mb-6 min-h-[280px] onboarding-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            {active.icon}
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-3">
            {active.eyebrow}
          </p>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-3">
            {active.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {active.body}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
          {TOUR_STEPS.map((_, index) => (
            <button
              key={`onboarding-tour-step-${index}`}
              onClick={() => {
                if (!isFinishing) {
                  haptics.light()
                  setStep(index)
                }
              }}
              disabled={isFinishing}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === step
                  ? 'w-8 bg-primary shadow-[0_0_8px_rgba(139,0,0,0.4)]'
                  : 'w-2 bg-muted hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={() => {
              if (isFinishing) return
              haptics.light()
              if (step > 0) {
                setStep((prev) => prev - 1)
                return
              }
              onBack()
            }}
            disabled={isFinishing}
            variant="ghost"
            size="lg"
            className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handlePrimary}
            loading={isFinishing}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className={`flex-1 rounded-xl transition-all duration-200 ${
              isLast
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          >
            {isLast ? '🎉 Enter app' : 'Next'}
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
