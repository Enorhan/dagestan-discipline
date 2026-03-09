'use client'

import { Settings } from '@/components/screens/settings'
import { Equipment, ExperienceLevel, PrimaryGoal, Screen, SportType, WeightUnit } from '@/lib/types'

interface SettingsRoutesProps {
  currentScreen: Screen
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
  hasWorkoutToday: boolean
  hasUnsavedProgramChanges: boolean
  isPremium: boolean
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
  customWorkoutUsage: number
  learningPathUsage: number
  settingsScrollTop?: number
  navigateTo: (screen: Screen) => void
  onStartAction: () => void
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
  onSave: () => Promise<void> | void
  onLogout: () => void
  onSaveProgramChanges: () => Promise<void> | void
  onRevertProgramChanges: () => void
  onResetProgram: () => Promise<void> | void
  onStartSubscription: () => Promise<void>
  onManageSubscription: () => Promise<void>
  onSettingsScrollChange: (scrollTop: number) => void
}

export function SettingsRoutes({
  currentScreen,
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
  hasWorkoutToday,
  hasUnsavedProgramChanges,
  isPremium,
  subscriptionStatus,
  subscriptionPeriodEnd,
  customWorkoutUsage,
  learningPathUsage,
  settingsScrollTop,
  navigateTo,
  onStartAction,
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
  onSaveProgramChanges,
  onRevertProgramChanges,
  onResetProgram,
  onStartSubscription,
  onManageSubscription,
  onSettingsScrollChange,
}: SettingsRoutesProps) {
  switch (currentScreen) {
    case 'settings':
      return (
        <Settings
          sport={sport}
          trainingDays={trainingDays}
          equipment={equipment}
          weightUnit={weightUnit}
          experienceLevel={experienceLevel}
          bodyweightKg={bodyweightKg}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          injuryNotes={injuryNotes}
          onSportChange={onSportChange}
          onDaysChange={onDaysChange}
          onEquipmentChange={onEquipmentChange}
          onWeightUnitChange={onWeightUnitChange}
          onExperienceLevelChange={onExperienceLevelChange}
          onBodyweightKgChange={onBodyweightKgChange}
          onPrimaryGoalChange={onPrimaryGoalChange}
          onCombatSessionsChange={onCombatSessionsChange}
          onSessionMinutesChange={onSessionMinutesChange}
          onInjuryNotesChange={onInjuryNotesChange}
          onSave={onSave}
          onLogout={onLogout}
          onNavigate={navigateTo}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
          hasUnsavedProgramChanges={hasUnsavedProgramChanges}
          onSaveProgramChanges={onSaveProgramChanges}
          onRevertProgramChanges={onRevertProgramChanges}
          onResetProgram={onResetProgram}
          onStartSubscription={onStartSubscription}
          onManageSubscription={onManageSubscription}
          isPremium={isPremium}
          subscriptionStatus={subscriptionStatus}
          subscriptionPeriodEnd={subscriptionPeriodEnd}
          customWorkoutUsage={customWorkoutUsage}
          learningPathUsage={learningPathUsage}
          initialScrollTop={settingsScrollTop}
          onScrollChange={onSettingsScrollChange}
        />
      )

    default:
      return null
  }
}