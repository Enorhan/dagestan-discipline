'use client'

import { Button } from '@/components/ui/button'
import { Play } from '@/components/ui/icons'

interface ActiveSessionBannerProps {
  focus: string
  currentExerciseIndex: number
  totalExercises: number
  currentSet: number
  isResting: boolean
  onResume: () => void
}

export function ActiveSessionBanner({
  focus,
  currentExerciseIndex,
  totalExercises,
  currentSet,
  isResting,
  onResume,
}: ActiveSessionBannerProps) {
  const progressLabel = isResting
    ? `Resting before set ${currentSet}`
    : `Exercise ${Math.min(currentExerciseIndex + 1, Math.max(totalExercises, 1))} of ${Math.max(totalExercises, 1)}`

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+90px)] z-[70] px-4">
      <div className="session-resume-rail mx-auto flex w-full max-w-lg items-center gap-4 rounded-[28px] px-4 py-3.5 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="section-kicker text-primary/80">Active session</p>
          <p className="mt-1 truncate text-lg font-black text-foreground">{focus}</p>
          <p className="mt-1 text-sm font-semibold text-foreground/72">{progressLabel}</p>
        </div>
        <Button
          onClick={onResume}
          size="md"
          className="shrink-0 rounded-2xl px-5"
          leftIcon={<Play size={18} className="fill-current" />}
        >
          Resume
        </Button>
      </div>
    </div>
  )
}
