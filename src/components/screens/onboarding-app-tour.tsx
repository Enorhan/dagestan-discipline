'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'

interface OnboardingAppTourProps {
  onBack: () => void
  onFinish: () => Promise<void> | void
}

const TOUR_STEPS = [
  {
    eyebrow: 'Home',
    title: 'Start from Today',
    body: 'Your home screen is your daily command center: this week progress, your assigned workout, and one-tap quick actions.',
  },
  {
    eyebrow: 'Execution',
    title: 'Run and adapt sessions',
    body: 'Start Workout runs your plan as written. Edit Today lets you adapt when time, recovery, or equipment changes.',
  },
  {
    eyebrow: 'Training Hub',
    title: 'Explore elite exercise libraries',
    body: 'Browse wrestling, judo, and BJJ categories. Athlete cards are shown only when they have relevant exercises attached.',
  },
  {
    eyebrow: 'Progress',
    title: 'Track consistency over motivation',
    body: 'Session history, weekly completion, and streak feedback keep you honest and help you course-correct quickly.',
  },
] as const

export function OnboardingAppTour({ onBack, onFinish }: OnboardingAppTourProps) {
  const [step, setStep] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const isLast = step === TOUR_STEPS.length - 1
  const active = TOUR_STEPS[step]

  const handlePrimary = () => {
    if (!isLast) {
      setStep((prev) => prev + 1)
      return
    }

    if (isFinishing) return
    setIsFinishing(true)
    let released = false
    const release = () => {
      if (released) return
      released = true
      setIsFinishing(false)
    }

    const safetyTimeout = setTimeout(release, 3500)
    Promise.resolve(onFinish())
      .catch(() => {})
      .finally(() => {
        clearTimeout(safetyTimeout)
        release()
      })
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            App walkthrough
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-2">
            How to use the app
          </h1>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/50 p-6 mb-6 min-h-[260px]">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            {active.eyebrow}
          </p>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-3">
            {active.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {active.body}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {TOUR_STEPS.map((_, index) => (
            <span
              key={`onboarding-tour-step-${index}`}
              className={`h-1.5 rounded-full transition-all ${
                index === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (isFinishing) return
              if (step > 0) {
                setStep((prev) => prev - 1)
                return
              }
              onBack()
            }}
            disabled={isFinishing}
            variant="ghost"
            size="lg"
            className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-lg"
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
            className="flex-1 bg-foreground text-background"
          >
            {isLast ? 'Enter app' : 'Next'}
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
