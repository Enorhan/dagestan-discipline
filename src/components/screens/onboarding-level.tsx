'use client'

import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { ExperienceLevel } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface OnboardingLevelProps {
  level: ExperienceLevel
  onLevelChange: (level: ExperienceLevel) => void
  onContinue: () => void
  onBack: () => void
}

export function OnboardingLevel({
  level,
  onLevelChange,
  onContinue,
  onBack,
}: OnboardingLevelProps) {
  const options: { value: ExperienceLevel; label: string; description: string }[] = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: 'New to structured strength training',
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'Consistent training with basic strength base',
    },
    {
      value: 'advanced',
      label: 'Advanced',
      description: 'High training age, heavy and high-output work',
    },
  ]

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        <div className="mb-10">
          <h1 className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Dagestan
          </h1>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-1">
            DISCIPLINE
          </h2>
        </div>

        <div className="mb-8">
          <p className="text-lg font-medium text-foreground mb-2">
            Training experience
          </p>
          <p className="text-sm text-muted-foreground">
            This sets your volume and intensity baseline.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-10">
          {options.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => onLevelChange(option.value)}
              stacked
              className={`
                w-full p-5 text-left transition-all duration-150 rounded-lg normal-case tracking-normal h-auto items-start justify-start
                ${level === option.value
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-card/50 border border-border/60 hover:bg-card'
                }
              `}
              aria-pressed={level === option.value}
            >
              <span className="block text-base font-semibold text-foreground">
                {option.label}
              </span>
              <span className="block text-sm text-muted-foreground mt-1">
                {option.description}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            size="lg"
            className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-lg"
          >
            Back
          </Button>
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

