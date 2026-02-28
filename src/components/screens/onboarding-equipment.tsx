'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { Equipment } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { EquipmentIcon } from '@/components/ui/sport-icons'

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
  const [animatingEquipment, setAnimatingEquipment] = useState<Equipment | null>(null)

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

  const handleSelect = (value: Equipment) => {
    haptics.light()
    setAnimatingEquipment(value)
    onEquipmentChange(value)
    setTimeout(() => setAnimatingEquipment(null), 300)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={4} totalSteps={6} />
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
            Equipment access
          </p>
          <p className="text-sm text-muted-foreground">
            Select your training environment
          </p>
        </div>

        {/* Equipment Options */}
        <div className="flex flex-col gap-3 mb-10 onboarding-stagger">
          {options.map((option) => {
            const isSelected = equipment === option.value
            const isAnimating = animatingEquipment === option.value

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
                {/* Equipment Icon */}
                <div className={`
                  flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/50 text-muted-foreground'
                  }
                  ${isAnimating ? 'icon-bounce' : ''}
                `}>
                  <EquipmentIcon type={option.value} size={36} />
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

        {/* CTAs */}
        <div className="flex flex-col gap-3 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
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
            className={`rounded-xl transition-all duration-200 ${!equipment ? 'bg-muted text-muted-foreground' : ''}`}
          >
            Generate Program
          </Button>
          <Button
            onClick={onBack}
            disabled={isStarting}
            variant="ghost"
            size="md"
            fullWidth
            className="text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground rounded-xl"
          >
            Back
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
