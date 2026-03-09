'use client'

import { OnboardingAppTour } from '@/components/screens/onboarding-app-tour'
import { OnboardingEquipment } from '@/components/screens/onboarding-equipment'
import { OnboardingGenerating } from '@/components/screens/onboarding-generating'
import { OnboardingIntake } from '@/components/screens/onboarding-intake'
import { OnboardingLevel } from '@/components/screens/onboarding-level'
import { OnboardingProgramExplainer } from '@/components/screens/onboarding-program-explainer'
import { OnboardingSchedule } from '@/components/screens/onboarding-schedule'
import { OnboardingSport } from '@/components/screens/onboarding-sport'
import { Equipment, ExperienceLevel, PrimaryGoal, Screen, Session, SportType, WeightUnit, WeekDay } from '@/lib/types'

interface OnboardingRoutesProps {
  currentScreen: Screen
  selectedSport: SportType
  trainingDays: number
  equipment: Equipment | null
  weightUnit: WeightUnit
  bodyweightKg: number | null
  primaryGoal: PrimaryGoal
  combatSessionsPerWeek: number
  sessionMinutes: number
  injuryNotes: string
  userExperienceLevel: ExperienceLevel
  generatedProgram: Session[] | null
  weekProgress: WeekDay[]
  onboardingGenerationError?: string | null
  navigateTo: (screen: Screen) => void
  onSportChange: (sport: SportType) => void
  onTrainingDaysChange: (days: number) => void
  onContinueFromSchedule: () => void
  onLevelChange: (level: ExperienceLevel) => void
  onBodyweightKgChange: (kg: number | null) => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onPrimaryGoalChange: (goal: PrimaryGoal) => void
  onCombatSessionsChange: (count: number) => void
  onSessionMinutesChange: (minutes: number) => void
  onInjuryNotesChange: (notes: string) => void
  onEquipmentChange: (equipment: Equipment) => void
  onStartFromEquipment: () => Promise<void> | void
  onRetryGenerating: () => void
  onFinishAppTour: () => Promise<void> | void
}

export function OnboardingRoutes({
  currentScreen,
  selectedSport,
  trainingDays,
  equipment,
  weightUnit,
  bodyweightKg,
  primaryGoal,
  combatSessionsPerWeek,
  sessionMinutes,
  injuryNotes,
  userExperienceLevel,
  generatedProgram,
  weekProgress,
  onboardingGenerationError,
  navigateTo,
  onSportChange,
  onTrainingDaysChange,
  onContinueFromSchedule,
  onLevelChange,
  onBodyweightKgChange,
  onWeightUnitChange,
  onPrimaryGoalChange,
  onCombatSessionsChange,
  onSessionMinutesChange,
  onInjuryNotesChange,
  onEquipmentChange,
  onStartFromEquipment,
  onRetryGenerating,
  onFinishAppTour,
}: OnboardingRoutesProps) {
  switch (currentScreen) {
    case 'onboarding-sport':
      return (
        <OnboardingSport
          sport={selectedSport}
          onSportChange={onSportChange}
          onContinue={() => navigateTo('onboarding-schedule')}
        />
      )

    case 'onboarding-schedule':
      return (
        <OnboardingSchedule
          trainingDays={trainingDays}
          onDaysChange={onTrainingDaysChange}
          onContinue={onContinueFromSchedule}
          onBack={() => navigateTo('onboarding-sport')}
        />
      )

    case 'onboarding-level':
      return (
        <OnboardingLevel
          level={userExperienceLevel}
          onLevelChange={onLevelChange}
          onContinue={() => navigateTo('onboarding-intake')}
          onBack={() => navigateTo('onboarding-schedule')}
        />
      )

    case 'onboarding-intake':
      return (
        <OnboardingIntake
          bodyweightKg={bodyweightKg}
          weightUnit={weightUnit}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          injuryNotes={injuryNotes}
          onBodyweightKgChange={onBodyweightKgChange}
          onWeightUnitChange={onWeightUnitChange}
          onPrimaryGoalChange={onPrimaryGoalChange}
          onCombatSessionsChange={onCombatSessionsChange}
          onSessionMinutesChange={onSessionMinutesChange}
          onInjuryNotesChange={onInjuryNotesChange}
          onContinue={() => navigateTo('onboarding-equipment')}
          onBack={() => navigateTo('onboarding-level')}
        />
      )

    case 'onboarding-equipment':
      return (
        <OnboardingEquipment
          equipment={equipment}
          onEquipmentChange={onEquipmentChange}
          onStart={onStartFromEquipment}
          onBack={() => navigateTo('onboarding-intake')}
        />
      )

    case 'onboarding-generating':
      return (
        <OnboardingGenerating
          sport={selectedSport}
          trainingDays={trainingDays}
          equipment={equipment}
          primaryGoal={primaryGoal}
          experienceLevel={userExperienceLevel || 'intermediate'}
          sessionMinutes={sessionMinutes || 45}
          error={onboardingGenerationError}
          onRetry={onRetryGenerating}
          onGoBack={onRetryGenerating}
        />
      )

    case 'onboarding-program-explainer':
      return (
        <OnboardingProgramExplainer
          sport={selectedSport}
          trainingDays={trainingDays}
          equipment={equipment}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          weekProgress={weekProgress}
          program={generatedProgram}
          onBack={() => navigateTo('onboarding-equipment')}
          onContinue={() => navigateTo('onboarding-app-tour')}
        />
      )

    case 'onboarding-app-tour':
      return (
        <OnboardingAppTour
          onBack={() => navigateTo('onboarding-program-explainer')}
          onFinish={onFinishAppTour}
        />
      )

    default:
      return null
  }
}