'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { ExperienceLevel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { LevelIcon } from '@/components/ui/sport-icons'

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
  const [animatingLevel, setAnimatingLevel] = useState<ExperienceLevel | null>(null)

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

  const handleSelect = (value: ExperienceLevel) => {
    haptics.light()
    setAnimatingLevel(value)
    onLevelChange(value)
    setTimeout(() => setAnimatingLevel(null), 300)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={3} totalSteps={7} />
        </div>

        <div className="mb-10 onboarding-fade-up" style={{ animationDelay: '0.05s' }}>
          <h1 className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Dagestan
          </h1>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-1">
            DISCIPLINE
          </h2>
        </div>

        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-lg font-medium text-foreground mb-2">
            Training experience
          </p>
          <p className="text-sm text-muted-foreground">
            This sets your volume and intensity baseline.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-10 onboarding-stagger">
          {options.map((option) => {
            const isSelected = level === option.value
            const isAnimating = animatingLevel === option.value

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full p-5 text-left transition-all duration-200 rounded-xl
                  flex items-center gap-4
                  ${isSelected
                    ? 'bg-primary/10 border-2 border-primary shadow-[0_0_20px_rgba(139,0,0,0.2)]'
                    : 'bg-card/50 border border-border/60 hover:bg-card hover:border-border'
                  }
                  ${isAnimating ? 'selection-pop' : ''}
                `}
                aria-pressed={isSelected}
              >
                {/* Level Icon */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/50 text-muted-foreground'
                  }
                  ${isAnimating ? 'icon-bounce' : ''}
                `}>
                  <LevelIcon level={option.value} size={32} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </span>
                </div>

                {/* Selection indicator */}
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                  transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30 bg-transparent'
                  }
                `}>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white">
                      <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 onboarding-fade-up" style={{ animationDelay: '0.25s' }}>
          <Button
            onClick={onBack}
            variant="ghost"
            size="lg"
            className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-xl"
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
            className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
          >
            Continue
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}

