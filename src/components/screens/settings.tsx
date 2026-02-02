'use client'

import { useState } from 'react'
import { Equipment, Screen, SportType, WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Card } from '@/components/ui/card'

interface SettingsProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  weightUnit: WeightUnit
  onSportChange: (sport: SportType) => void
  onDaysChange: (days: number) => void
  onEquipmentChange: (equipment: Equipment) => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onSave: () => void
  onLogout: () => void
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
}

export function Settings({
  sport,
  trainingDays,
  equipment,
  weightUnit,
  onSportChange,
  onDaysChange,
  onEquipmentChange,
  onWeightUnitChange,
  onSave,
  onLogout,
  trainingTarget,
  onNavigate
}: SettingsProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const sportOptions: { value: SportType; label: string }[] = [
    { value: 'wrestling', label: 'Wrestling' },
    { value: 'judo', label: 'Judo' },
    { value: 'bjj', label: 'Jiu-Jitsu' },
  ]

  const days = [3, 4, 5, 6]

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
              Save & Regenerate Program
            </Button>
          </div>
        </ScreenShellContent>
      </div>

      <BottomNav
        active="profile"
        trainingTarget={trainingTarget}
        onNavigate={onNavigate}
      />

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
        title="Regenerate Program?"
        message="This will create a new training program and reset your current week progress. Your streak and history will be preserved."
        confirmText="Regenerate"
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
