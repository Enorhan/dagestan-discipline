'use client'

import { useEffect, useState } from 'react'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function OnboardingProgress({ currentStep, totalSteps, className = '' }: OnboardingProgressProps) {
  const [animatedStep, setAnimatedStep] = useState(currentStep)

  useEffect(() => {
    // Small delay to trigger animation
    const timeout = setTimeout(() => {
      setAnimatedStep(currentStep)
    }, 50)
    return () => clearTimeout(timeout)
  }, [currentStep])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Step indicator text */}
      <span className="text-xs font-medium text-muted-foreground tracking-wide">
        {currentStep} / {totalSteps}
      </span>
      
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1
          const isActive = stepNumber === animatedStep
          const isCompleted = stepNumber < animatedStep
          
          return (
            <div
              key={`progress-dot-${i}`}
              className={`
                h-1.5 rounded-full transition-all duration-300 ease-out
                ${isActive 
                  ? 'w-6 bg-primary shadow-[0_0_8px_rgba(139,0,0,0.5)]' 
                  : isCompleted 
                    ? 'w-1.5 bg-primary/60' 
                    : 'w-1.5 bg-muted-foreground/30'
                }
              `}
              style={{
                transitionDelay: isActive ? '0ms' : `${Math.abs(i - currentStep) * 30}ms`
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

