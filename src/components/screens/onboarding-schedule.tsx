'use client'

import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'

interface OnboardingScheduleProps {
  trainingDays: number
  onDaysChange: (days: number) => void
  onContinue: () => void
  onBack?: () => void
}

export function OnboardingSchedule({
  trainingDays,
  onDaysChange,
  onContinue,
  onBack
}: OnboardingScheduleProps) {
  const days = [3, 4, 5, 6]

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Logo / Brand */}
        <div className="mb-10">
          <h1 className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Dagestan
          </h1>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-1">
            DISCIPLINE
          </h2>
        </div>

        {/* Question */}
        <div className="mb-8">
          <p className="text-lg font-medium text-foreground mb-2">
            Training days per week
          </p>
          <p className="text-sm text-muted-foreground">
            Select your commitment level
          </p>
        </div>

        {/* Day Selector */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-10">
          {days.map((day) => (
            <Button
              key={day}
              onClick={() => onDaysChange(day)}
              variant="ghost"
              size="sm"
              className={`
                h-16 flex items-center justify-center text-xl font-bold rounded-lg
                transition-all duration-150 normal-case tracking-normal
                ${trainingDays === day
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                }
              `}
              aria-pressed={trainingDays === day}
            >
              {day}
            </Button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="lg"
              className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-lg"
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
            className="flex-1 bg-foreground text-background"
          >
            Continue
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
