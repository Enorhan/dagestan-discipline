'use client'

import { useState } from 'react'
import { Equipment, ExperienceLevel, PrimaryGoal, Screen, SportType, WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'

interface SettingsProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  weightUnit: WeightUnit
  experienceLevel: ExperienceLevel
  bodyweightKg: number | null
  primaryGoal: PrimaryGoal
  combatSessionsPerWeek: number
  sessionMinutes: number
  injuryNotes: string
  onSportChange: (sport: SportType) => void
  onDaysChange: (days: number) => void
  onEquipmentChange: (equipment: Equipment) => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onExperienceLevelChange: (level: ExperienceLevel) => void
  onBodyweightKgChange: (kg: number | null) => void
  onPrimaryGoalChange: (goal: PrimaryGoal) => void
  onCombatSessionsChange: (count: number) => void
  onSessionMinutesChange: (minutes: number) => void
  onInjuryNotesChange: (notes: string) => void
  onSave: () => void
  onLogout: () => void
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  hasUnsavedProgramChanges?: boolean
  onSaveProgramChanges?: () => void
  onRevertProgramChanges?: () => void
  onResetProgram?: () => void
  onStartTrial?: () => Promise<void>
}

export function Settings({
  sport,
  trainingDays,
  equipment,
  weightUnit,
  experienceLevel,
  bodyweightKg,
  primaryGoal,
  combatSessionsPerWeek,
  sessionMinutes,
  injuryNotes,
  onSportChange,
  onDaysChange,
  onEquipmentChange,
  onWeightUnitChange,
  onExperienceLevelChange,
  onBodyweightKgChange,
  onPrimaryGoalChange,
  onCombatSessionsChange,
  onSessionMinutesChange,
  onInjuryNotesChange,
  onSave,
  onLogout,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
  hasUnsavedProgramChanges = false,
  onSaveProgramChanges,
  onRevertProgramChanges,
  onResetProgram,
  onStartTrial
}: SettingsProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isStartingTrial, setIsStartingTrial] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const LBS_PER_KG = 2.20462
  const sportOptions: { value: SportType; label: string }[] = [
    { value: 'wrestling', label: 'Wrestling' },
    { value: 'judo', label: 'Judo' },
    { value: 'bjj', label: 'Jiu-Jitsu' },
  ]

  const days = [3, 4, 5, 6]
  const sessionOptions = [30, 45, 60, 75, 90]
  const combatOptions = [0, 1, 2, 3, 4, 5, 6, 7]
  const goalOptions: { value: PrimaryGoal; label: string }[] = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'strength', label: 'Strength' },
    { value: 'power', label: 'Power' },
    { value: 'conditioning', label: 'Conditioning' },
  ]

  const displayBodyweight = bodyweightKg
    ? (weightUnit === 'kg' ? bodyweightKg : bodyweightKg * LBS_PER_KG)
    : null
  const bodyweightValue = displayBodyweight !== null
    ? (weightUnit === 'kg' ? displayBodyweight.toFixed(1) : displayBodyweight.toFixed(0))
    : ''

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Preferences
          </p>
          <h1 className="type-title text-foreground mt-2">
            Settings
          </h1>
        </header>

        <ScreenShellContent className="px-6 pb-32">
          {/* Sport Selection */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Combat Sport
            </p>
            <div className="flex flex-col gap-2">
              {sportOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => onSportChange(option.value)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className={`
                    w-full p-4 text-left rounded-lg transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start
                    ${sport === option.value
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-card/50 border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={sport === option.value}
                >
                  <span className="text-base font-semibold text-foreground">
                    {option.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Training Days */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Training Days / Week
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {days.map((day) => (
                <Button
                  key={day}
                  onClick={() => onDaysChange(day)}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-14 flex items-center justify-center text-xl font-bold rounded-lg
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
          </div>

          {/* Training Mode */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Training Mode
            </p>
            <div className="flex flex-col gap-2">
              {([
                { value: 'bodyweight', label: 'Bodyweight only', description: 'No external load needed' },
                { value: 'gym', label: 'Weighted / Gym', description: 'Barbell, kettlebell, pull-up bar' },
              ] as { value: Equipment; label: string; description: string }[]).map((option) => (
                <Button
                  key={option.value}
                  onClick={() => onEquipmentChange(option.value)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className={`
                    w-full p-4 text-left rounded-lg transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start
                    ${equipment === option.value
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-card/50 border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={equipment === option.value}
                >
                  <span className="text-base font-semibold text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">
                    {option.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Weight Unit */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Weight Units
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
                <Button
                  key={unit}
                  onClick={() => onWeightUnitChange(unit)}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-14 flex items-center justify-center text-base font-semibold rounded-lg transition-all duration-150 uppercase normal-case tracking-normal
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
          </div>

          {/* Program Personalization */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Program Personalization
            </p>

            {/* Experience */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Experience level
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => (
                  <Button
                    key={lvl}
                    onClick={() => onExperienceLevelChange(lvl)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-12 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${experienceLevel === lvl
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={experienceLevel === lvl}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bodyweight */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Bodyweight ({weightUnit})
              </p>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={weightUnit === 'kg' ? 'e.g. 78.5' : 'e.g. 173'}
                value={bodyweightValue}
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
                Used for better recovery and volume recommendations.
              </p>
            </div>

            {/* Goal */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Primary goal
              </p>
              <div className="grid grid-cols-2 gap-2">
                {goalOptions.map((g) => (
                  <Button
                    key={g.value}
                    onClick={() => onPrimaryGoalChange(g.value)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-12 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${primaryGoal === g.value
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={primaryGoal === g.value}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Combat sessions */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
                      h-11 flex items-center justify-center text-sm font-bold rounded-lg
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
            </div>

            {/* Time cap */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Session time cap (min)
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {sessionOptions.map((m) => (
                  <Button
                    key={m}
                    onClick={() => onSessionMinutesChange(m)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-11 flex items-center justify-center text-sm font-bold rounded-lg
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

            {/* Injuries */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Injuries (optional)
              </p>
              <Textarea
                value={injuryNotes}
                onChange={(e) => onInjuryNotesChange(e.target.value)}
                placeholder="e.g. knee pain, lower back sensitivity"
                className="min-h-[92px]"
              />
            </div>
          </div>

          {/* Subscription */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Subscription
            </p>
            <Card className="p-4 bg-card/50 border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">Monthly Plan</p>
                  <p className="text-sm text-muted-foreground">25 SEK / month</p>
                </div>
                <div className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                  2-week trial
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                All features are currently unlocked. Start a free trial anytime.
              </p>
              {subscriptionError && (
                <p className="text-xs text-red-400 mt-3">{subscriptionError}</p>
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={isStartingTrial}
                className="mt-4 w-full"
                onClick={async () => {
                  haptics.light()
                  setSubscriptionError(null)

                  if (!onStartTrial) {
                    setSubscriptionError('Sign in required to start trial.')
                    return
                  }

                  setIsStartingTrial(true)
                  try {
                    await onStartTrial()
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unable to start checkout right now.'
                    setSubscriptionError(message)
                  } finally {
                    setIsStartingTrial(false)
                  }
                }}
              >
                Start Free Trial
              </Button>
            </Card>
          </div>

          {/* Program Actions */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Program
            </p>
            <div className="flex flex-col gap-2">
              {hasUnsavedProgramChanges && onSaveProgramChanges && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    haptics.medium()
                    onSaveProgramChanges()
                  }}
                >
                  Save Draft
                </Button>
              )}
              {hasUnsavedProgramChanges && onRevertProgramChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    haptics.light()
                    onRevertProgramChanges()
                  }}
                >
                  Revert to Last Saved
                </Button>
              )}
              {onResetProgram && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    haptics.light()
                    onResetProgram()
                  }}
                >
                  Restore Original Generated
                </Button>
              )}
            </div>
          </div>

          {/* Streak Rules */}
          <div className="mb-8 p-4 bg-card/50 rounded-lg">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Streak Rules
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your streak advances if you complete a session within 36 hours of your last workout.
              Miss the window and the streak resets.
            </p>
          </div>

          {/* Account Section */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Account
            </p>
            <Button
              onClick={() => setShowLogoutConfirmation(true)}
              variant="ghost"
              size="sm"
              stacked
              className="w-full p-4 text-left rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start"
            >
              <span className="text-base font-semibold text-red-400">
                Log Out
              </span>
              <span className="block text-sm text-red-400/70 mt-1">
                Sign out of your account
              </span>
            </Button>
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={isSaving}
              onClick={() => {
                haptics.light()
                setShowConfirmation(true)
              }}
            >
              Save Preferences
            </Button>
          </div>
        </ScreenShellContent>
      </div>

      <ScreenShellFooter>
        <BottomNav
          active="profile"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          setShowConfirmation(false)
          setIsSaving(true)
          // Small delay to show loading state for UX polish
          setTimeout(() => {
            onSave()
            setIsSaving(false)
          }, 300)
        }}
        title="Save Preferences?"
        message="Your preferences will be saved. If training days or sport changed, a new program will be generated and week progress reset. Streak and history remain."
        confirmText="Save"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          setShowLogoutConfirmation(false)
          haptics.medium()
          onLogout()
        }}
        title="Log Out?"
        message="You will need to sign in again to access your account and training data."
        confirmText="Log Out"
        cancelText="Cancel"
        variant="destructive"
      />
    </ScreenShell>
  )
}
