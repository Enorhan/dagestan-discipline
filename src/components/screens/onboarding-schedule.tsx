'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'

interface OnboardingScheduleProps {
  trainingDays: number
  onDaysChange: (days: number) => void
  onContinue: () => void
  onBack?: () => void
}

const DAY_DESCRIPTIONS: Record<number, string> = {
  3: 'Recovery-focused',
  4: 'Balanced approach',
  5: 'High frequency',
  6: 'Elite commitment',
}

export function OnboardingSchedule({
  trainingDays,
  onDaysChange,
  onContinue,
  onBack
}: OnboardingScheduleProps) {
  const [animatingDay, setAnimatingDay] = useState<number | null>(null)
  const days = [3, 4, 5, 6]

  const handleSelect = (day: number) => {
    haptics.light()
    setAnimatingDay(day)
    onDaysChange(day)
    setTimeout(() => setAnimatingDay(null), 300)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={1} totalSteps={6} />
        </div>

        {/* Logo / Brand */}
        <div className="mb-10 onboarding-fade-up" style={{ animationDelay: '0.05s' }}>
          <h1 className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Dagestan
          </h1>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-1">
            DISCIPLINE
          </h2>
        </div>

        {/* Question */}
        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-lg font-medium text-foreground mb-2">
            Training days per week
          </p>
          <p className="text-sm text-muted-foreground">
            Select your commitment level
          </p>
        </div>

        {/* Day Selector */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
          {days.map((day) => {
            const isSelected = trainingDays === day
            const isAnimating = animatingDay === day

            return (
              <button
                key={day}
                onClick={() => handleSelect(day)}
                className={`
                  h-20 flex flex-col items-center justify-center rounded-xl
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_20px_rgba(139,0,0,0.3)]'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card hover:border-border'
                  }
                  ${isAnimating ? 'selection-pop' : ''}
                `}
                aria-pressed={isSelected}
              >
                <span className="text-2xl font-black">{day}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">days</span>
              </button>
            )
          })}
        </div>

        {/* Selected day description */}
        <div className="mb-10 h-8 flex items-center justify-center onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm text-muted-foreground text-center transition-all duration-200">
            {DAY_DESCRIPTIONS[trainingDays]}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 onboarding-fade-up" style={{ animationDelay: '0.25s' }}>
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="lg"
              className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-xl"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              haptics.medium()
              onContinue()
            }}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
          >
            Continue
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
