'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Equipment } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface OnboardingEquipmentProps {
  equipment: Equipment | null
  onEquipmentChange: (equipment: Equipment) => void
  onStart: () => void
  onBack: () => void
}

export function OnboardingEquipment({
  equipment,
  onEquipmentChange,
  onStart,
  onBack
}: OnboardingEquipmentProps) {
  const [isStarting, setIsStarting] = useState(false)
  const options: { value: Equipment; label: string; description: string }[] = [
    { 
      value: 'bodyweight', 
      label: 'Bodyweight only',
      description: 'No equipment required'
    },
    { 
      value: 'gym', 
      label: 'Basic gym',
      description: 'Barbell, kettlebell, pull-up bar'
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
            Equipment access
          </p>
          <p className="text-sm text-muted-foreground">
            Select your training environment
          </p>
        </div>

        {/* Equipment Options */}
        <div className="flex flex-col gap-3 mb-10">
          {options.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => onEquipmentChange(option.value)}
              stacked
              className={`
                w-full p-5 text-left transition-all duration-150 rounded-lg normal-case tracking-normal h-auto items-start justify-start
                ${equipment === option.value
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-card/50 border border-border/60 hover:bg-card'
                }
              `}
              aria-pressed={equipment === option.value}
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

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button
            loading={isStarting}
            onClick={() => {
              if (!equipment) return
              haptics.medium()
              setIsStarting(true)
              // Small delay to show loading state for UX polish
              setTimeout(() => {
                onStart()
              }, 300)
            }}
            disabled={!equipment}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className={!equipment ? 'bg-muted text-muted-foreground' : ''}
          >
            Start Program
          </Button>
          <Button
            onClick={onBack}
            disabled={isStarting}
            variant="ghost"
            size="md"
            fullWidth
            className="text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground"
          >
            Back
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
