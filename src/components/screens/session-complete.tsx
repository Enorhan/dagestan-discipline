'use client'

import { useEffect, useState } from 'react'
import { WeightUnit, PersonalRecord } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { audio } from '@/lib/audio'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { Achievement, recordWorkout } from '@/lib/achievements'
import { AchievementCelebration } from '@/components/ui/achievement-celebration'
import { Trophy, Flame } from '@/components/ui/icons'
import { getEffortRatingLabel } from '@/lib/session-reflection'

interface SessionCompleteProps {
  totalTime: number // in seconds
  completedSessions: number
  plannedSessions: number
  totalVolume?: number
  currentSessionWeights?: Record<string, number[]>
  lastSessionWeights?: Record<string, number[]>
  weightUnit: WeightUnit
  bestSet?: { weight: number; exerciseName: string } | null
  currentStreak: number
  longestStreak: number
  prs?: PersonalRecord[]
  reflectionEffortRating?: number
  reflectionNotes?: string
  onEditReflection?: () => void
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
  prs = [],
  reflectionEffortRating,
  reflectionNotes,
  onEditReflection,
  onClose,
  onViewWeek
}: SessionCompleteProps) {
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])

  // Trigger success haptic and check achievements on mount
  useEffect(() => {
    haptics.success()
    audio.sessionComplete()

    // Check for new achievements
    const volumeKg = totalVolume ? (weightUnit === 'lbs' ? totalVolume / 2.20462 : totalVolume) : 0
    const unlocked = recordWorkout(volumeKg, currentStreak, prs)
    if (unlocked.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time session completion side effect
      setNewAchievements(unlocked)
    }
  }, [totalVolume, weightUnit, currentStreak, prs])

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

            {/* PRs Section */}
            {prs.length > 0 && (
              <div className="py-3 border-t border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {prs.length} PR{prs.length > 1 ? 's' : ''} Achieved
                  </span>
                </div>
                <div className="space-y-1">
                  {prs.slice(0, 3).map((pr, i) => (
                    <p key={i} className="text-xs text-white/70">
                      {pr.exerciseName}: {pr.value} {pr.unit}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-card/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Session log
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {reflectionEffortRating !== undefined
                    ? `${reflectionEffortRating}/10 · ${getEffortRatingLabel(reflectionEffortRating)}`
                    : 'No reflection added yet'}
                </p>
              </div>
              {onEditReflection && (
                <Button
                  type="button"
                  onClick={onEditReflection}
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 px-3 text-xs text-foreground"
                >
                  {reflectionEffortRating !== undefined || reflectionNotes ? 'Edit' : 'Add'}
                </Button>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {reflectionNotes?.trim()
                ? `“${reflectionNotes.trim()}”`
                : 'Add a quick note about pain, energy, or what clicked so the next session starts smarter.'}
            </p>
          </div>

          {/* Motivational Message */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground italic">
              {currentStreak >= 7
                ? `🔥 ${currentStreak}-day streak! You're on fire!`
                : prs.length > 0
                  ? 'New records set! Keep pushing your limits.'
                  : 'Consistency is the key to greatness.'}
            </p>
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

      {/* Achievement Celebration */}
      {newAchievements.length > 0 && (
        <AchievementCelebration
          achievements={newAchievements}
          onComplete={() => setNewAchievements([])}
        />
      )}
    </ScreenShell>
  )
}
