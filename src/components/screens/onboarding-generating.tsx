'use client'

import { Equipment, PrimaryGoal, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { haptics } from '@/lib/haptics'

interface OnboardingGeneratingProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  primaryGoal: PrimaryGoal
  sessionMinutes: number
  error?: string | null
  onRetry?: () => void
  onGoBack?: () => void
}

const SPORT_LABELS: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu',
}

const EQUIPMENT_LABELS: Record<Exclude<Equipment, null>, string> = {
  bodyweight: 'Bodyweight only',
  gym: 'Basic gym',
}

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  balanced: 'Balanced',
  strength: 'Strength',
  power: 'Power',
  conditioning: 'Conditioning',
}

export function OnboardingGenerating({
  sport,
  trainingDays,
  equipment,
  primaryGoal,
  sessionMinutes,
  error,
  onRetry,
  onGoBack,
}: OnboardingGeneratingProps) {
  const equipmentLabel = equipment ? EQUIPMENT_LABELS[equipment] : 'Not selected'
  const hasError = !!error

  return (
    <ScreenShell className="px-6 pb-safe-bottom pt-safe-top">
      <ScreenShellContent className="flex flex-col max-w-md mx-auto w-full justify-center h-full">
        <div className="w-full text-center">
          {hasError ? (
            <>
              {/* Error state */}
              <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6">
                <span className="text-2xl text-red-500">!</span>
              </div>
              <p className="text-xs font-semibold tracking-[0.3em] text-red-400 uppercase mb-3">
                Generation Failed
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                {error || 'We couldn\'t generate your program. Please try again.'}
              </p>
            </>
          ) : (
            <>
              {/* Loading state */}
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-primary/25 border-t-primary animate-spin mb-6" />
              <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-3">
                Building your plan
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                Tailoring your program
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                We are matching your training profile to a week that balances intensity, recovery, and sport carryover.
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/50 p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            Your inputs
          </p>
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Sport:</span> {SPORT_LABELS[sport]}
            </p>
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Days/week:</span> {trainingDays}
            </p>
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Goal:</span> {GOAL_LABELS[primaryGoal]}
            </p>
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Session cap:</span> {sessionMinutes} min
            </p>
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Equipment:</span> {equipmentLabel}
            </p>
          </div>
        </div>

        {hasError ? (
          <div className="mt-6 space-y-3">
            {onRetry && (
              <Button
                onClick={() => {
                  haptics.medium()
                  onRetry()
                }}
                variant="primary"
                size="lg"
                fullWidth
              >
                Try Again
              </Button>
            )}
            {onGoBack && (
              <Button
                onClick={() => {
                  haptics.light()
                  onGoBack()
                }}
                variant="ghost"
                size="sm"
                fullWidth
              >
                Go Back and Change Settings
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground mt-6">
            This usually takes a few seconds.
          </p>
        )}
      </ScreenShellContent>
    </ScreenShell>
  )
}
