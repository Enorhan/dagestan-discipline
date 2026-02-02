'use client'

import { useEffect } from 'react'
import { WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { audio } from '@/lib/audio'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'

interface SessionCompleteProps {
  totalTime: number // in seconds
  completedSessions: number
  plannedSessions: number
  totalVolume?: number
  weightUnit: WeightUnit
  bestSet?: { weight: number; exerciseName: string } | null
  currentStreak: number
  longestStreak: number
  onClose: () => void
  onViewWeek: () => void
}

export function SessionComplete({
  totalTime,
  completedSessions,
  plannedSessions,
  totalVolume,
  weightUnit,
  bestSet,
  currentStreak,
  longestStreak,
  onClose,
  onViewWeek
}: SessionCompleteProps) {
  // Trigger success haptic and audio on mount
  useEffect(() => {
    haptics.success()
    audio.sessionComplete()
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const LBS_PER_KG = 2.20462
  const formatWeight = (value: number) => {
    if (weightUnit === 'kg') {
      return Number((value / LBS_PER_KG).toFixed(1)).toLocaleString()
    }
    return Math.round(value).toLocaleString()
  }

  return (
    <ScreenShell className="pt-safe-top">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full overflow-y-auto">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start pt-8 sm:justify-center sm:pt-0 px-6">
          {/* Checkmark */}
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Title */}
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-2">
            Complete
          </p>
          <h1 className="type-title text-foreground tracking-tight">
            Session done
          </h1>

          {/* Highlights */}
          <div className="mt-8 w-full max-w-sm grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-lg bg-card/50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Highlight
              </p>
              <p className="mt-2 text-base font-bold text-foreground">
                {bestSet ? `${formatWeight(bestSet.weight)} ${weightUnit}` : `${currentStreak} day streak`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {bestSet ? bestSet.exerciseName : 'Consistency'}
              </p>
            </div>
            <div className="rounded-lg bg-card/50 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Volume
              </p>
              <p className="mt-2 text-base font-bold text-foreground">
                {totalVolume !== undefined && totalVolume > 0 ? `${formatWeight(totalVolume)} ${weightUnit}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total load
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 w-full max-w-sm bg-card/50 rounded-lg p-4">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Total time
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {formatTime(totalTime)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-border/50">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                This week
              </span>
              <span className="text-lg font-bold text-foreground">
                {completedSessions} / {plannedSessions}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-border/50">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Streak
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {currentStreak} <span className="text-muted-foreground text-sm">best {longestStreak}</span>
              </span>
            </div>
            {bestSet && (
              <div className="flex justify-between items-center py-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">
                  Best set
                </span>
                <span className="text-lg font-bold text-foreground text-right">
                  {formatWeight(bestSet.weight)} {weightUnit}
                  <span className="block text-xs text-muted-foreground font-medium">
                    {bestSet.exerciseName}
                  </span>
                </span>
              </div>
            )}
            {totalVolume !== undefined && totalVolume > 0 && (
              <div className="flex justify-between items-center py-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">
                  Total volume
                </span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {formatWeight(totalVolume)} {weightUnit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <ScreenShellFooter className="px-6">
        <Button
          onClick={onClose}
          variant="primary"
          size="lg"
          fullWidth
          className="bg-foreground text-background mb-3"
        >
          Close
        </Button>
        <Button
          onClick={onViewWeek}
          variant="ghost"
          size="md"
          fullWidth
          className="text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground"
        >
          View Week
        </Button>
      </ScreenShellFooter>
    </ScreenShell>
  )
}
