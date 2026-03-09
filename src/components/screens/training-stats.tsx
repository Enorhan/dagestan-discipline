'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Screen, ActivityType, ActivityLog, SessionLog } from '@/lib/types'
import { analytics } from '@/lib/analytics'
import { PREMIUM_FEATURES } from '@/lib/premium-gate'
import { buildProgressStory } from '@/lib/progress-storytelling'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { Gi, Wrestling, Trophy, Boxing, Drill, Flame, Stretch, Lock, Sparkles } from '@/components/ui/icons'

interface TrainingStatsProps {
  sessionHistory: SessionLog[]
  activityLogs: ActivityLog[]
  completedExerciseCount?: number
  currentStreak: number
  longestStreak: number
  weightUnit: 'lbs' | 'kg'
  isPremium?: boolean
  onClose: () => void
  onNavigate: (screen: Screen) => void
  onUpgrade?: () => void
  isLoading?: boolean
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

// Activity type labels and icons
const ACTIVITY_META: Record<ActivityType, { label: string; icon: ReactNode }> = {
  'bjj-session': { label: 'BJJ Sessions', icon: <Gi size={18} className="text-primary" /> },
  'wrestling-practice': { label: 'Wrestling', icon: <Wrestling size={18} className="text-primary" /> },
  'judo-class': { label: 'Judo', icon: <Gi size={18} className="text-primary" /> },
  'open-mat': { label: 'Open Mat', icon: <Stretch size={18} className="text-primary" /> },
  'competition': { label: 'Competitions', icon: <Trophy size={18} className="text-primary" /> },
  'sparring': { label: 'Sparring', icon: <Boxing size={18} className="text-primary" /> },
  'drilling': { label: 'Drilling', icon: <Drill size={18} className="text-primary" /> },
  'conditioning': { label: 'Conditioning', icon: <Flame size={18} className="text-primary" /> }
}

type ViewMode = 'month' | 'year'

export function TrainingStats({
  sessionHistory,
  activityLogs,
  completedExerciseCount = 0,
  currentStreak,
  longestStreak,
  weightUnit,
  isPremium = false,
  onClose,
  onNavigate,
  onUpgrade,
  isLoading = false,
  onStartAction,
  hasWorkoutToday = false
}: TrainingStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const hasTrackedPreviewRef = useRef(false)

  // Use real data only - no sample data fallback
  const activities = isLoading ? [] : activityLogs
  const sessions = isLoading ? [] : sessionHistory
  const hasNoData = !isLoading && activityLogs.length === 0 && sessionHistory.length === 0

  // Filter data by selected month/year
  const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
    return items.filter(item => {
      const itemDate = new Date(item.date)
      if (viewMode === 'month') {
        return itemDate.getMonth() === selectedDate.getMonth() &&
               itemDate.getFullYear() === selectedDate.getFullYear()
      } else {
        return itemDate.getFullYear() === selectedDate.getFullYear()
      }
    })
  }

  const filteredActivities = filterByPeriod(activities)
  const filteredSessions = filterByPeriod(sessions)
  const filteredPRs = filteredSessions.flatMap((session) => session.prs ?? [])

  // Calculate statistics
  const totalSessions = filteredSessions.length + filteredActivities.length
  const totalHours = (
    filteredSessions.reduce((sum, s) => sum + (s.totalTime || 0), 0) / 3600 +
    filteredActivities.reduce((sum, a) => sum + a.duration, 0) / 60
  )
  const totalPRs = filteredPRs.length
  const bestPRImprovement = filteredPRs.reduce((max, pr) => Math.max(max, pr.improvement), 0)

  // Activity breakdown by type
  const activityBreakdown = Object.entries(ACTIVITY_META).map(([type, { label, icon }]) => ({
    type: type as ActivityType,
    label,
    icon,
    count: filteredActivities.filter(a => a.type === type).length
  })).filter(item => item.count > 0)

  // Add gym workouts to breakdown
  const gymWorkoutCount = filteredSessions.length

  // Average intensity
  const avgIntensity = filteredActivities.length > 0
    ? filteredActivities.reduce((sum, a) => sum + a.intensity, 0) / filteredActivities.length
    : 0

  // Total volume
  const totalVolume = filteredSessions.reduce((sum, s) => sum + (s.volume || 0), 0)
  const LBS_PER_KG = 2.20462
  const displayVolume = weightUnit === 'kg' ? totalVolume / LBS_PER_KG : totalVolume

  // Month/Year navigation
  const navigatePeriod = (direction: -1 | 1) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction)
    }
    setSelectedDate(newDate)
  }

  const periodLabel = viewMode === 'month'
    ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : selectedDate.getFullYear().toString()
  const progressStory = buildProgressStory({
    sessionHistory: sessions,
    activityLogs: activities,
    currentStreak,
    longestStreak,
    selectedDate,
    viewMode,
  })

  const isAdvancedAnalyticsLocked = !isPremium
  const analyticsFeatureHighlights = PREMIUM_FEATURES.analytics.highlights.slice(0, 2)
  const insightToneClassName = {
    positive: 'text-emerald-400',
    neutral: 'text-foreground',
    attention: 'text-amber-300',
  } as const

  const handleUpgrade = () => {
    analytics.track('premium_upsell_clicked', {
      source: 'training-stats',
      feature: 'analytics',
    })
    if (onUpgrade) {
      onUpgrade()
      return
    }
    onNavigate('settings')
  }

  useEffect(() => {
    if (!isAdvancedAnalyticsLocked || hasTrackedPreviewRef.current) return
    hasTrackedPreviewRef.current = true
    analytics.track('analytics_preview_opened', {
      source: 'training-stats',
    })
    analytics.track('premium_upsell_viewed', {
      source: 'training-stats',
      feature: 'analytics',
    })
  }, [isAdvancedAnalyticsLocked])

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0 pb-28">
        <ScreenShellContent>
          {/* Header */}
          <header className="px-6 safe-area-top pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Training
              </p>
              <h1 className="type-title text-foreground mt-1">Statistics</h1>
              {!isPremium && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400 mt-1">
                  Analytics preview
                </p>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors px-3 rounded-lg"
              aria-label="Close"
            >
              Close
            </Button>
          </header>

          {/* Loading Notice */}
          {isLoading && (
            <div className="mx-6 mb-4 p-3 bg-muted/50 rounded-lg border border-border/60">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading your training data...
              </p>
            </div>
          )}

          {/* No Data Notice */}
          {hasNoData && (
            <div className="mx-6 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground font-medium">
                📊 No training data yet. Complete workouts and log activities to see your stats.
              </p>
            </div>
          )}

          {/* Period Selector */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Month/Year Toggle */}
              <div className="flex bg-card/50 rounded-lg p-1 border border-border/60">
                <Button
                  onClick={() => setViewMode('month')}
                  variant="ghost"
                  size="sm"
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-md transition-all normal-case tracking-normal ${
                    viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Month
                </Button>
                <Button
                  onClick={() => {
                    if (isAdvancedAnalyticsLocked) {
                      handleUpgrade()
                      return
                    }
                    setViewMode('year')
                  }}
                  variant="ghost"
                  size="sm"
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-md transition-all normal-case tracking-normal flex items-center gap-1 ${
                    viewMode === 'year' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Year
                  {isAdvancedAnalyticsLocked && <Lock size={11} />}
                </Button>
              </div>

              {/* Period Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigatePeriod(-1)}
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg bg-card/50 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Previous period"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Button>
                <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
                  {periodLabel}
                </span>
                <Button
                  onClick={() => navigatePeriod(1)}
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg bg-card/50 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Next period"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {!isLoading && !hasNoData && (
            <div className="px-6 pb-3">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                      Progress Story
                    </p>
                    <h2 className="text-lg font-black text-foreground mt-2">
                      {progressStory.headline}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {progressStory.summary}
                    </p>
                  </div>
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Sparkles size={18} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                  {progressStory.insights.map((insight) => (
                    <div
                      key={insight.label}
                      className="rounded-xl border border-border/60 bg-background/70 px-3 py-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {insight.label}
                      </p>
                      <p className={`text-lg font-black mt-1 ${insightToneClassName[insight.tone]}`}>
                        {insight.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {insight.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Training Summary */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Training Summary
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="card-elevated rounded-xl p-5 text-center stagger-item">
                <p className="text-4xl font-black text-foreground tabular-nums">{totalSessions}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">Sessions</p>
              </div>
              <div className="card-elevated rounded-xl p-5 text-center stagger-item" style={{ animationDelay: '50ms' }}>
                <p className="text-4xl font-black text-foreground tabular-nums">{totalHours.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">Hours</p>
              </div>
              <div className="card-elevated rounded-xl p-5 text-center stagger-item" style={{ animationDelay: '100ms' }}>
                <p className="text-4xl font-black text-foreground tabular-nums">{completedExerciseCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">Exercises</p>
              </div>
              <div className="card-elevated rounded-xl p-5 text-center stagger-item" style={{ animationDelay: '150ms' }}>
                <p className="text-4xl font-black text-primary tabular-nums">{totalPRs}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">PRs</p>
              </div>
            </div>
            {totalPRs > 0 && (
              <div className="mt-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Best PR Jump</p>
                <p className="text-sm font-black text-primary tabular-nums">
                  +{bestPRImprovement.toFixed(0)}%
                </p>
              </div>
            )}
          </div>

          {isAdvancedAnalyticsLocked && (
            <div className="px-6 pb-2">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                    Premium analytics
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Month totals are available now. Premium turns analytics into a clearer coaching layer with:
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {analyticsFeatureHighlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleUpgrade}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold normal-case tracking-normal flex items-center gap-1"
                >
                  <Sparkles size={14} />
                  Upgrade
                </Button>
              </div>
            </div>
          )}

          {/* Streak Info */}
          <div className="px-6 py-4">
            <div className="bg-card/50 rounded-xl p-4 flex items-center justify-between gap-4 border border-border/60">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Current Streak
                </p>
                <p className="text-2xl font-black text-primary tabular-nums mt-1">{currentStreak}</p>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Best Streak
                </p>
                <p className="text-2xl font-black text-foreground tabular-nums mt-1">{longestStreak}</p>
              </div>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="px-6 py-5 relative">
            <div className={isAdvancedAnalyticsLocked ? 'opacity-45 select-none pointer-events-none' : ''}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Activity Breakdown
              </p>
              <div className="card-elevated rounded-xl overflow-hidden">
              {/* Gym Workouts */}
              {gymWorkoutCount > 0 && (
                <div className="flex items-center justify-between p-4 border-b border-border/50 stagger-item">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                        <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-foreground">Gym Workouts</span>
                  </div>
                  <span className="text-lg font-black text-foreground tabular-nums">{gymWorkoutCount}</span>
                </div>
              )}

              {/* External Activities */}
              {activityBreakdown.map(({ type, label, count, icon }, index) => (
                <div
                  key={type}
                  className={`flex items-center justify-between p-4 stagger-item ${index < activityBreakdown.length - 1 ? 'border-b border-border/50' : ''}`}
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      {icon}
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                  <span className="text-lg font-black text-foreground tabular-nums">{count}</span>
                </div>
              ))}

              {/* Empty state */}
              {gymWorkoutCount === 0 && activityBreakdown.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No activities logged for this period</p>
                </div>
              )}
              </div>
            </div>
            {isAdvancedAnalyticsLocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={handleUpgrade}
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-lg border border-amber-500/30 bg-black/70 text-amber-400 font-bold normal-case tracking-normal flex items-center gap-2"
                >
                  <Lock size={14} />
                  Unlock full breakdown
                </Button>
              </div>
            )}
          </div>

          {/* Intensity & Volume */}
          <div className="px-6 py-4 relative">
            <div className={isAdvancedAnalyticsLocked ? 'opacity-45 select-none pointer-events-none' : ''}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Performance
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Average Intensity */}
              <div className="bg-card/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Avg Intensity</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-foreground tabular-nums">
                    {avgIntensity > 0 ? avgIntensity.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
                {avgIntensity > 0 && (
                  <div className="mt-2 h-2 bg-card rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        avgIntensity <= 3 ? 'bg-primary/40' :
                        avgIntensity <= 6 ? 'bg-primary/60' :
                        avgIntensity <= 8 ? 'bg-primary' : 'bg-destructive'
                      }`}
                      style={{ width: `${avgIntensity * 10}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Total Volume */}
              <div className="bg-card/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Volume Lifted</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-foreground tabular-nums">
                    {totalVolume > 0 ? Math.round(displayVolume).toLocaleString() : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">{weightUnit}</span>
                </div>
              </div>
            </div>
            </div>
            {isAdvancedAnalyticsLocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={handleUpgrade}
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-lg border border-amber-500/30 bg-black/70 text-amber-400 font-bold normal-case tracking-normal flex items-center gap-2"
                >
                  <Lock size={14} />
                  Unlock full analytics
                </Button>
              </div>
            )}
          </div>

          {/* Spacer for bottom nav */}
          <div className="h-8" />
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
    </ScreenShell>
  )
}
