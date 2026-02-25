'use client'

import { useState } from 'react'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { PrimaryGoal, WeightUnit } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { GoalIcon } from '@/components/ui/sport-icons'

interface OnboardingIntakeProps {
  bodyweightKg: number | null
  weightUnit: WeightUnit
  primaryGoal: PrimaryGoal
  combatSessionsPerWeek: number
  sessionMinutes: number
  injuryNotes: string
  onBodyweightKgChange: (kg: number | null) => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onPrimaryGoalChange: (goal: PrimaryGoal) => void
  onCombatSessionsChange: (count: number) => void
  onSessionMinutesChange: (minutes: number) => void
  onInjuryNotesChange: (notes: string) => void
  onContinue: () => void
  onBack: () => void
}

const LBS_PER_KG = 2.20462

export function OnboardingIntake({
  bodyweightKg,
  weightUnit,
  primaryGoal,
  combatSessionsPerWeek,
  sessionMinutes,
  injuryNotes,
  onBodyweightKgChange,
  onWeightUnitChange,
  onPrimaryGoalChange,
  onCombatSessionsChange,
  onSessionMinutesChange,
  onInjuryNotesChange,
  onContinue,
  onBack,
}: OnboardingIntakeProps) {
  const [animatingGoal, setAnimatingGoal] = useState<PrimaryGoal | null>(null)

  const displayWeight = bodyweightKg
    ? (weightUnit === 'kg' ? bodyweightKg : bodyweightKg * LBS_PER_KG)
    : null

  const displayValue = displayWeight !== null
    ? (weightUnit === 'kg' ? displayWeight.toFixed(1) : displayWeight.toFixed(0))
    : ''

  const goalOptions: { value: PrimaryGoal; label: string; description: string }[] = [
    { value: 'balanced', label: 'Balanced', description: 'Strength + conditioning' },
    { value: 'strength', label: 'Strength', description: 'Heavier, lower reps' },
    { value: 'power', label: 'Power', description: 'Explosive output' },
    { value: 'conditioning', label: 'Conditioning', description: 'Higher density work' },
  ]

  const sessionOptions = [30, 45, 60, 75, 90]
  const combatOptions = [0, 1, 2, 3, 4, 5, 6, 7]

  const handleGoalSelect = (goal: PrimaryGoal) => {
    haptics.light()
    setAnimatingGoal(goal)
    onPrimaryGoalChange(goal)
    setTimeout(() => setAnimatingGoal(null), 300)
  }

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={3} totalSteps={6} />
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
            Personalize your program
          </p>
          <p className="text-sm text-muted-foreground">
            Quick inputs to tailor volume, intensity, and recovery.
          </p>
        </div>

        {/* Bodyweight */}
        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Bodyweight
          </p>
          <div className="flex gap-2 mb-3">
            {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                onClick={() => {
                  haptics.light()
                  onWeightUnitChange(unit)
                }}
                className={`
                  h-12 flex-1 rounded-xl uppercase font-semibold text-sm
                  transition-all duration-200
                  ${weightUnit === unit
                    ? 'bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_12px_rgba(139,0,0,0.3)]'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={weightUnit === unit}
              >
                {unit.toUpperCase()}
              </button>
            ))}
          </div>
          <Input
            type="number"
            inputMode="decimal"
            placeholder={weightUnit === 'kg' ? 'e.g. 78.5' : 'e.g. 173'}
            value={displayValue}
            onChange={(e) => {
              const raw = e.target.value
              const parsed = raw === '' ? NaN : Number(raw)
              if (Number.isNaN(parsed)) {
                onBodyweightKgChange(null)
                return
              }
              const kg = weightUnit === 'kg' ? parsed : parsed / LBS_PER_KG
              onBodyweightKgChange(Math.max(0, kg))
            }}
            className="h-12 rounded-xl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used for better volume and recovery recommendations.
          </p>
        </div>

        {/* Goal */}
        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Primary goal
          </p>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((g) => {
              const isSelected = primaryGoal === g.value
              const isAnimating = animatingGoal === g.value

              return (
                <button
                  key={g.value}
                  onClick={() => handleGoalSelect(g.value)}
                  className={`
                    p-4 text-left rounded-xl transition-all duration-200
                    flex flex-col items-start gap-2
                    ${isSelected
                      ? 'bg-primary/10 border-2 border-primary shadow-[0_0_16px_rgba(139,0,0,0.2)]'
                      : 'bg-card/50 border border-border/60 hover:bg-card hover:border-border'
                    }
                    ${isAnimating ? 'selection-pop' : ''}
                  `}
                  aria-pressed={isSelected}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    transition-all duration-200
                    ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}
                    ${isAnimating ? 'icon-bounce' : ''}
                  `}>
                    <GoalIcon goal={g.value} size={24} />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground">{g.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{g.description}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Combat load */}
        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.25s' }}>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Combat sessions / week
          </p>
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {combatOptions.map((n) => (
              <button
                key={n}
                onClick={() => {
                  haptics.light()
                  onCombatSessionsChange(n)
                }}
                className={`
                  h-12 flex items-center justify-center text-sm font-bold rounded-xl
                  transition-all duration-200
                  ${combatSessionsPerWeek === n
                    ? 'bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_12px_rgba(139,0,0,0.3)]'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={combatSessionsPerWeek === n}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Higher combat load automatically reduces S&C volume.
          </p>
        </div>

        {/* Time cap */}
        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Session time cap
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {sessionOptions.map((m) => (
              <button
                key={m}
                onClick={() => {
                  haptics.light()
                  onSessionMinutesChange(m)
                }}
                className={`
                  h-14 flex flex-col items-center justify-center rounded-xl
                  transition-all duration-200
                  ${sessionMinutes === m
                    ? 'bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_12px_rgba(139,0,0,0.3)]'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={sessionMinutes === m}
              >
                <span className="text-base font-bold">{m}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">min</span>
              </button>
            ))}
          </div>
        </div>

        {/* Injury notes */}
        <div className="mb-10 onboarding-fade-up" style={{ animationDelay: '0.35s' }}>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Injuries (optional)
          </p>
          <Textarea
            value={injuryNotes}
            onChange={(e) => onInjuryNotesChange(e.target.value)}
            placeholder="e.g. knee pain, lower back sensitivity"
            className="min-h-[92px] rounded-xl"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used as a constraint when choosing movements (v1 keeps it informational).
          </p>
        </div>

        <div className="flex gap-3 onboarding-fade-up" style={{ animationDelay: '0.4s' }}>
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

