'use client'

import { SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'

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
            Choose your combat sport
          </p>
          <p className="text-sm text-muted-foreground">
            Training programs designed by champions
          </p>
        </div>

        {/* Sport Options */}
        <div className="flex flex-col gap-3 mb-10">
          {options.map((option) => (
            <Button
              key={option.value}
              onClick={() => onSportChange(option.value)}
              variant="ghost"
              size="sm"
              stacked
              className={`
                w-full p-5 text-left transition-all duration-150 rounded-lg normal-case tracking-normal h-auto items-start justify-start
                ${sport === option.value
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-card/50 border border-border/60 hover:bg-card'
                }
              `}
              aria-pressed={sport === option.value}
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

        {/* CTA */}
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
          className={sport ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}
        >
          Continue
        </Button>
      </ScreenShellContent>
    </ScreenShell>
  )
}
