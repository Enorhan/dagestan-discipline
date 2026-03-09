'use client'

import { useMemo, useState } from 'react'
import { Equipment, PrimaryGoal, Session, SportType, WeekDay } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { OnboardingProgress } from '@/components/ui/onboarding-progress'
import { haptics } from '@/lib/haptics'

interface OnboardingProgramExplainerProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  primaryGoal: PrimaryGoal
  combatSessionsPerWeek: number
  sessionMinutes: number
  weekProgress: WeekDay[]
  program: Session[] | null
  onBack: () => void
  onContinue: () => void
}

const SPORT_LABELS: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu',
}

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  balanced: 'Balanced strength and conditioning',
  strength: 'Strength progression',
  power: 'Explosive power output',
  conditioning: 'Conditioning and engine work',
}

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: 'Bodyweight setup',
  gym: 'Basic gym setup',
}

const SPORT_PERSPECTIVES: Record<SportType, { athlete: string; insight: string; quote: string }> = {
  wrestling: {
    athlete: 'Jordan Burroughs',
    insight: 'Explosive lower-body and pull power supports level changes, finishes, and repeated scrambles.',
    quote: 'Work hard in practice so matches feel slower and easier.',
  },
  judo: {
    athlete: 'Teddy Riner',
    insight: 'Strong legs, hips, and trunk let you control grips and project force through throws without leaking energy.',
    quote: 'Discipline in preparation creates confidence under pressure.',
  },
  bjj: {
    athlete: 'Roger Gracie',
    insight: 'Consistent pulling strength and positional endurance keep technique sharp deep into hard rounds.',
    quote: 'Simple fundamentals win when your conditioning holds up.',
  },
}

export function OnboardingProgramExplainer({
  sport,
  trainingDays,
  equipment,
  primaryGoal,
  combatSessionsPerWeek,
  sessionMinutes,
  weekProgress,
  program,
  onBack,
  onContinue,
}: OnboardingProgramExplainerProps) {
  const [step, setStep] = useState(0)

  const plannedDays = useMemo(
    () => weekProgress.filter((d) => d.planned).map((d) => d.day),
    [weekProgress]
  )

  const sampleExercises = useMemo(() => {
    if (!program) return []
    const names = new Set<string>()
    for (const session of program) {
      for (const exercise of session.exercises ?? []) {
        names.add(exercise.name)
        if (names.size >= 3) return Array.from(names)
      }
    }
    return Array.from(names)
  }, [program])

  const perspective = SPORT_PERSPECTIVES[sport]
  const equipmentLabel = equipment ? EQUIPMENT_LABELS[equipment] : 'Flexible setup'
  const lastStep = 2

  const cards = [
    {
      eyebrow: 'Program fit',
      title: 'Why this plan matches your week',
      body: `Your ${SPORT_LABELS[sport]} plan is built for ${trainingDays} S&C days with a ${sessionMinutes}-minute cap and ${GOAL_LABELS[primaryGoal].toLowerCase()}.`,
      points: [
        `Combat load set to ${combatSessionsPerWeek} sessions per week to manage fatigue.`,
        `Equipment profile: ${equipmentLabel}.`,
        plannedDays.length > 0 ? `Planned training days: ${plannedDays.join(', ')}.` : 'Training days are spaced for repeatable consistency.',
      ],
    },
    {
      eyebrow: 'Elite perspective',
      title: `How top ${SPORT_LABELS[sport]} athletes use this`,
      body: `${perspective.athlete} style prep prioritizes transfer, not random fatigue.`,
      points: [
        perspective.insight,
        sampleExercises.length > 0 ? `Early session anchors include: ${sampleExercises.join(', ')}.` : 'Session anchors are selected to transfer to real combat demands.',
        `"${perspective.quote}"`,
      ],
    },
    {
      eyebrow: 'Execution',
      title: 'How results happen in this app',
      body: 'Progress comes from consistent execution, controlled overload, and clear tracking.',
      points: [
        'Hit planned sessions before adding extra volume.',
        'Use Edit Today when recovery or schedule changes.',
        'Log sessions and review weekly completion to keep momentum.',
      ],
    },
  ] as const

  const active = cards[step]
  const isLast = step >= lastStep

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-start pt-8 sm:justify-center sm:pt-0" alwaysScroll>
        {/* Progress Indicator */}
        <div className="mb-6 onboarding-fade-up">
          <OnboardingProgress currentStep={6} totalSteps={7} />
        </div>

        <div className="mb-8 onboarding-fade-up" style={{ animationDelay: '0.05s' }}>
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            Program briefing
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-2">
            Why this works for you
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">
            A quick walkthrough of how your plan fits your week and how to get the most from it.
          </p>
        </div>

        <div
          key={`card-${step}`}
          className="rounded-2xl border border-border/70 bg-card/50 p-5 mb-6 min-h-[300px] onboarding-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-3">
            {active.eyebrow}
          </p>
          <h2 className="text-2xl font-black text-foreground tracking-tight mb-3">
            {active.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {active.body}
          </p>
          <div className="space-y-3 onboarding-stagger">
            {active.points.map((point) => (
              <div key={point} className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8 onboarding-fade-up" style={{ animationDelay: '0.15s' }}>
          {cards.map((_, index) => (
            <button
              key={`onboarding-program-step-${index}`}
              onClick={() => {
                haptics.light()
                setStep(index)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === step
                  ? 'w-8 bg-primary shadow-[0_0_8px_rgba(139,0,0,0.4)]'
                  : 'w-2 bg-muted hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3 onboarding-fade-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={() => {
              haptics.light()
              if (step > 0) {
                setStep((prev) => prev - 1)
                return
              }
              onBack()
            }}
            variant="ghost"
            size="lg"
            className="h-14 px-6 bg-card/50 text-foreground font-semibold text-base tracking-wide uppercase transition-colors hover:bg-card rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={() => {
              haptics.medium()
              if (isLast) {
                onContinue()
                return
              }
              setStep((prev) => prev + 1)
            }}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-xl"
          >
            {isLast ? 'Continue' : 'Next'}
          </Button>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
