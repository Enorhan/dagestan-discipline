'use client'

import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { PrimaryGoal, WeightUnit } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

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
            Personalize your program
          </p>
          <p className="text-sm text-muted-foreground">
            Quick inputs to tailor volume, intensity, and recovery.
          </p>
        </div>

        {/* Bodyweight */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Bodyweight
          </p>
          <div className="flex gap-2 mb-3">
            {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
              <Button
                key={unit}
                onClick={() => onWeightUnitChange(unit)}
                variant="ghost"
                size="sm"
                className={`
                  h-12 flex-1 rounded-lg uppercase normal-case tracking-normal
                  ${weightUnit === unit
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={weightUnit === unit}
              >
                {unit}
              </Button>
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
            className="h-12"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used for better volume and recovery recommendations.
          </p>
        </div>

        {/* Goal */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Primary goal
          </p>
          <div className="flex flex-col gap-2">
            {goalOptions.map((g) => (
              <Button
                key={g.value}
                onClick={() => onPrimaryGoalChange(g.value)}
                variant="ghost"
                size="sm"
                stacked
                className={`
                  w-full p-4 text-left rounded-lg transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start
                  ${primaryGoal === g.value
                    ? 'bg-primary/10 border border-primary'
                    : 'bg-card/50 border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={primaryGoal === g.value}
              >
                <span className="text-base font-semibold text-foreground">{g.label}</span>
                <span className="block text-sm text-muted-foreground mt-1">{g.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Combat load */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Combat sessions / week
          </p>
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {combatOptions.map((n) => (
              <Button
                key={n}
                onClick={() => onCombatSessionsChange(n)}
                variant="ghost"
                size="sm"
                className={`
                  h-12 flex items-center justify-center text-sm font-bold rounded-lg
                  transition-all duration-150 normal-case tracking-normal
                  ${combatSessionsPerWeek === n
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={combatSessionsPerWeek === n}
              >
                {n}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Higher combat load automatically reduces S&C volume.
          </p>
        </div>

        {/* Time cap */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Session time cap
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {sessionOptions.map((m) => (
              <Button
                key={m}
                onClick={() => onSessionMinutesChange(m)}
                variant="ghost"
                size="sm"
                className={`
                  h-12 flex items-center justify-center text-sm font-bold rounded-lg
                  transition-all duration-150 normal-case tracking-normal
                  ${sessionMinutes === m
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                  }
                `}
                aria-pressed={sessionMinutes === m}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {/* Injury notes */}
        <div className="mb-10">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Injuries (optional)
          </p>
          <Textarea
            value={injuryNotes}
            onChange={(e) => onInjuryNotesChange(e.target.value)}
            placeholder="e.g. knee pain, lower back sensitivity"
            className="min-h-[92px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used as a constraint when choosing movements (v1 keeps it informational).
          </p>
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

