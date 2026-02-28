'use client'

import { useState } from 'react'
import { SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { SportIcon } from '@/components/ui/sport-icons'

interface OnboardingSportProps {
  sport: SportType | null
  onSportChange: (sport: SportType) => void
  onContinue: () => void
}

export function OnboardingSport({
  sport,
  onSportChange,
  onContinue
}: OnboardingSportProps) {
  const [selectedAnimating, setSelectedAnimating] = useState<SportType | null>(null)

  const options: { value: SportType; label: string; description: string }[] = [
    {
      value: 'wrestling',
      label: 'Wrestling',
      description: 'Dagestani-style explosive power & circuits'
    },
    {
      value: 'judo',
      label: 'Judo',
      description: 'Olympic lifting & throwing power'
    },
    {
      value: 'bjj',
      label: 'Jiu-Jitsu',
      description: 'Grip endurance & functional strength'
    },
  ]

  const handleSelect = (value: SportType) => {
    haptics.light()
    setSelectedAnimating(value)
    onSportChange(value)
    setTimeout(() => setSelectedAnimating(null), 300)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={1} totalSteps={7} />
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
            Choose your combat sport
          </p>
          <p className="text-sm text-muted-foreground">
            Training programs designed by champions
          </p>
        </div>

        {/* Sport Options */}
        <div className="flex flex-col gap-3 mb-10 onboarding-stagger">
          {options.map((option) => {
            const isSelected = sport === option.value
            const isAnimating = selectedAnimating === option.value

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
                {/* Sport Icon */}
                <div className={`
                  flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/50 text-muted-foreground'
                  }
                  ${isAnimating ? 'icon-bounce' : ''}
                `}>
                  <SportIcon sport={option.value} size={36} />
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

        {/* CTA */}
        <div className="onboarding-fade-up" style={{ animationDelay: '0.3s' }}>
          <Button
            onClick={() => {
              haptics.medium()
              onContinue()
            }}
            disabled={!sport}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className={`
              transition-all duration-200
              ${sport
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-muted-foreground'
              }
            `}
          >
            Continue
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
