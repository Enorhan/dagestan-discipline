'use client'

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { Screen, Session, SessionAdjustmentMode, WeekDay, Equipment, TimerMode, SessionLog, ActivityLog, SportType } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { buildHomeHeroSummary } from '@/lib/home-hero'
import { SESSION_ADJUSTMENT_MODES, SessionReadinessEnergy, SessionReadinessTime, getSessionAdjustmentDescription, getSessionAdjustmentLabel, recommendSessionAdjustmentMode } from '@/lib/session-adjustment'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import {
  ChevronRight, Dumbbell, Flame, Play, Zap,
  Heart, Edit, Target
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface HomeProps {
  session: Session | null
  weekProgress: WeekDay[]
  sessionHistory?: SessionLog[]
  activityLogs?: ActivityLog[]
  selectedSport?: SportType | null
  currentStreak: number
  longestStreak: number
  equipment: Equipment | null
  onStartSession: () => void
  onNavigate: (screen: Screen) => void
  undoLabel?: string | null
  onUndo: () => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  userName?: string
  onStartRoundTimer?: (mode: TimerMode) => void
  onQuickWarmup?: () => void
  onQuickRecovery?: () => void
  sessionAdjustmentMode?: SessionAdjustmentMode | null
  onSetSessionAdjustmentMode?: (mode: SessionAdjustmentMode) => void
  carryOverSessionDayLabel?: string | null
  missedPlannedSessionCount?: number
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

const READINESS_ENERGY_OPTIONS: { value: SessionReadinessEnergy; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'okay', label: 'Okay' },
  { value: 'low', label: 'Low' },
]

const READINESS_TIME_OPTIONS: { value: SessionReadinessTime; label: string }[] = [
  { value: 'full', label: 'Full time' },
  { value: '30', label: '30 min' },
  { value: '20', label: '20 min' },
]

// Focus-based theming for session cards
const focusThemes: Record<string, { gradient: string; textColor: string; iconBg: string; accentColor: string; borderColor: string }> = {
  'Push': {
    gradient: 'from-blue-500/20 via-black/70 to-black/90',
    textColor: 'text-blue-200',
    iconBg: 'bg-blue-500/20',
    accentColor: 'text-blue-400',
    borderColor: 'border-blue-500/20'
  },
  'Pull': {
    gradient: 'from-green-500/20 via-black/70 to-black/90',
    textColor: 'text-green-200',
    iconBg: 'bg-green-500/20',
    accentColor: 'text-green-400',
    borderColor: 'border-green-500/20'
  },
  'Legs': {
    gradient: 'from-orange-500/20 via-black/70 to-black/90',
    textColor: 'text-orange-200',
    iconBg: 'bg-orange-500/20',
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/20'
  },
  'Upper': {
    gradient: 'from-indigo-500/20 via-black/70 to-black/90',
    textColor: 'text-indigo-200',
    iconBg: 'bg-indigo-500/20',
    accentColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/20'
  },
  'Lower': {
    gradient: 'from-amber-500/20 via-black/70 to-black/90',
    textColor: 'text-amber-200',
    iconBg: 'bg-amber-500/20',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/20'
  },
  'Full Body': {
    gradient: 'from-purple-500/20 via-black/70 to-black/90',
    textColor: 'text-purple-200',
    iconBg: 'bg-purple-500/20',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/20'
  },
  'Core': {
    gradient: 'from-red-500/20 via-black/70 to-black/90',
    textColor: 'text-red-200',
    iconBg: 'bg-red-500/20',
    accentColor: 'text-red-400',
    borderColor: 'border-red-500/20'
  },
  'Cardio': {
    gradient: 'from-pink-500/20 via-black/70 to-black/90',
    textColor: 'text-pink-200',
    iconBg: 'bg-pink-500/20',
    accentColor: 'text-pink-400',
    borderColor: 'border-pink-500/20'
  },
  'Rest': {
    gradient: 'from-slate-500/20 via-black/70 to-black/90',
    textColor: 'text-slate-200',
    iconBg: 'bg-slate-500/20',
    accentColor: 'text-slate-400',
    borderColor: 'border-slate-500/20'
  },
  'default': {
    gradient: 'from-primary/20 via-black/70 to-black/90',
    textColor: 'text-primary',
    iconBg: 'bg-primary/20',
    accentColor: 'text-primary',
    borderColor: 'border-primary/20'
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getSmartMessage(session: Session | null, currentStreak: number, weekProgress: WeekDay[]): string {
  const completedThisWeek = weekProgress.filter(d => d.planned && d.completed).length
  const hour = new Date().getHours()

  if (!session) return 'Set up your program to get started'

  if (currentStreak >= 7 && currentStreak % 7 === 0) {
    return `🔥 ${currentStreak} day streak! You're on fire!`
  }

  if (completedThisWeek === 0) {
    return "Let's start the week strong!"
  }

  if (hour < 10) {
    return 'Early bird gets the gains 💪'
  }

  if (currentStreak > 0) {
    return `Day ${currentStreak + 1} - Keep the momentum!`
  }

  return 'Ready when you are'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Greeting Header Component
function GreetingHeader({
  userName,
  currentStreak,
  onNavigate
}: {
  userName?: string
  currentStreak: number
  onNavigate: (screen: Screen) => void
}) {
  const greeting = getGreeting()
  const displayName = userName || 'Athlete'

  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <div>
        <p className="text-white/50 text-sm">{greeting}</p>
        <h1 className="text-2xl font-black text-foreground">{displayName}</h1>
      </div>
          <button
            onClick={() => {
              haptics.light()
              onNavigate('user-profile')
            }}
            className={[
              'flex items-center gap-2 rounded-full px-3 py-1.5 transition-all border',
              currentStreak >= 30
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                : currentStreak >= 7
                  ? 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/10',
            ].join(' ')}
            aria-label="View profile and streak"
          >
            <Flame
              size={16}
              className={[
                currentStreak >= 30
                  ? 'text-amber-400'
                  : currentStreak >= 7
                    ? 'text-orange-400'
                    : 'text-white/60',
              ].join(' ')}
            />
            <span
              className={[
                'text-sm font-bold',
                currentStreak >= 30
                  ? 'text-amber-400'
                  : currentStreak >= 7
                    ? 'text-orange-300'
                    : 'text-white/70',
              ].join(' ')}
            >
              {currentStreak}
            </span>
          </button>
    </div>
  )
}

// Week Progress Component
function WeekProgress({
  weekProgress,
  onNavigate
}: {
  weekProgress: WeekDay[]
  onNavigate: (screen: Screen) => void
}) {
  const completed = weekProgress.filter(d => d.planned && d.completed).length
  const total = weekProgress.length
  const progressPercent = total > 0 ? (completed / total) * 100 : 0

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="mx-6 mb-5">
      <button
        onClick={() => {
          haptics.light()
          onNavigate('week-view')
        }}
        className="w-full rounded-2xl p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
        aria-label="View full week schedule"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
            This Week
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{completed}/{total}</span>
            <ChevronRight size={14} className="text-white/30 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Day Indicators */}
        <div className="flex justify-between">
          {weekProgress.map((day, index) => {
            const isToday = day.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
            return (
              <div key={day.day} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-white/40'}`}>
                  {dayLabels[index]}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    day.completed
                      ? 'bg-primary/20 text-primary'
                      : isToday
                        ? 'bg-white/10 text-white/60 ring-2 ring-primary/50'
                        : 'bg-white/5 text-white/30'
                  }`}
                >
                  {day.completed ? '✓' : '·'}
                </div>
              </div>
            )
          })}
        </div>
      </button>
    </div>
  )
}

// Quick Actions Component
function QuickActions({
  onNavigate,
  onStartSession,
  hasSession,
  onStartRoundTimer,
  onQuickWarmup,
  onQuickRecovery,
}: {
  onNavigate: (screen: Screen) => void
  onStartSession: () => void
  hasSession: boolean
  onStartRoundTimer?: (mode: TimerMode) => void
  onQuickWarmup?: () => void
  onQuickRecovery?: () => void
}) {
  const actions = [
    {
      icon: hasSession ? Play : Target,
      label: hasSession ? 'Start Today' : 'Build Plan',
      color: hasSession ? 'text-primary' : 'text-primary',
      bg: hasSession ? 'bg-primary/15' : 'bg-primary/10',
      onClick: () => {
        if (hasSession) {
          haptics.medium()
          onStartSession()
          return
        }

        haptics.light()
        onNavigate('onboarding-sport')
      }
    },
    {
      icon: Zap,
      label: 'Warmup',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      onClick: () => {
        haptics.light()
        if (onQuickWarmup) {
          onQuickWarmup()
          return
        }
        if (onStartRoundTimer) {
          onStartRoundTimer('hiit')
          return
        }
        onNavigate('training-hub')
      }
    },
    {
      icon: Heart,
      label: 'Recovery',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      onClick: () => {
        haptics.light()
        if (onQuickRecovery) {
          onQuickRecovery()
          return
        }
        onNavigate('training-hub')
      }
    },
    {
      icon: Edit,
      label: 'Log Session',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      onClick: () => {
        haptics.light()
        onNavigate('log-activity')
      }
    }
  ]

  return (
    <div className="px-6 mb-6">
      <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
        Quick Actions
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
            aria-label={action.label}
          >
            <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              <action.icon size={20} className={action.color} />
            </div>
            <span className="text-[10px] font-medium text-white/60 text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgressPulse({
  sessionHistory,
  activityLogs,
  now,
  onNavigate,
}: {
  sessionHistory: SessionLog[]
  activityLogs: ActivityLog[]
  now: number
  onNavigate: (screen: Screen) => void
}) {
  const DAY_MS = 24 * 60 * 60 * 1000
  const windowStart = now - 28 * DAY_MS
  const previousWindowStart = now - 56 * DAY_MS

  const inWindow = (dateString: string, start: number, end: number) => {
    const timestamp = new Date(dateString).getTime()
    return timestamp >= start && timestamp < end
  }

  const recentSessions = sessionHistory.filter((log) => inWindow(log.date, windowStart, now))
  const previousSessions = sessionHistory.filter((log) => inWindow(log.date, previousWindowStart, windowStart))
  const recentVolume = recentSessions.reduce((sum, log) => sum + (log.volume ?? 0), 0)
  const previousVolume = previousSessions.reduce((sum, log) => sum + (log.volume ?? 0), 0)
  const recentPRs = recentSessions.reduce((sum, log) => sum + (log.prs?.length ?? 0), 0)
  const recentCombatMinutes = activityLogs
    .filter((log) => new Date(log.date).getTime() >= now - (14 * DAY_MS))
    .reduce((sum, log) => sum + log.duration, 0)

  const volumeDeltaPercent = previousVolume > 0
    ? Math.round(((recentVolume - previousVolume) / previousVolume) * 100)
    : (recentVolume > 0 ? 100 : 0)

  if (sessionHistory.length === 0 && activityLogs.length === 0) {
    return (
      <div className="px-6 mb-6">
        <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
          Progress Pulse
        </h2>
        <button
          onClick={() => {
            haptics.light()
            onNavigate('training-stats')
          }}
          className="w-full rounded-2xl p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left"
        >
          <p className="text-sm font-bold text-foreground">No performance baseline yet</p>
          <p className="text-xs text-white/60 mt-1">
            Complete your first session or log activity to unlock trend tracking.
          </p>
        </button>
      </div>
    )
  }

  return (
    <div className="px-6 mb-6">
      <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
        Progress Pulse
      </h2>
      <button
        onClick={() => {
          haptics.light()
          onNavigate('training-stats')
        }}
        className="w-full rounded-2xl p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
      >
        <div className="grid grid-cols-3 gap-2 text-left">
          <div>
            <p className="text-2xl font-black text-foreground tabular-nums">{recentSessions.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">28d sessions</p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary tabular-nums">{recentPRs}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">PRs</p>
          </div>
          <div>
            <p className={`text-2xl font-black tabular-nums ${volumeDeltaPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {volumeDeltaPercent >= 0 ? '+' : ''}{volumeDeltaPercent}%
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">Load trend</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-white/60">
            Last 14d combat work: <span className="font-bold text-white/80">{recentCombatMinutes} min</span>
          </p>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Details
          </span>
        </div>
      </button>
    </div>
  )
}

function ForYou({
  sessionHistory,
  currentStreak,
  selectedSport,
  now,
  onNavigate,
}: {
  sessionHistory: SessionLog[]
  currentStreak: number
  selectedSport: SportType | null
  now: number
  onNavigate: (screen: Screen) => void
}) {
  const lastSessionAt = sessionHistory
    .map((log) => new Date(log.date).getTime())
    .sort((a, b) => b - a)[0]

  const daysSinceLastSession = typeof lastSessionAt === 'number'
    ? Math.max(0, Math.floor((now - lastSessionAt) / (24 * 60 * 60 * 1000)))
    : null

  const sportLabel = selectedSport === 'wrestling'
    ? 'Wrestling'
    : selectedSport === 'judo'
      ? 'Judo'
      : selectedSport === 'bjj'
        ? 'BJJ'
        : 'Combat'

  const cards = [
    {
      key: 'stats',
      title: 'Review performance trend',
      subtitle: currentStreak > 0
        ? `${currentStreak}-day streak active. Keep momentum visible.`
        : 'No streak active. Rebuild consistency with measurable wins.',
      icon: Flame,
      iconColor: 'text-orange-400',
      bg: 'from-orange-500/15 via-black/80 to-black/95',
      onClick: () => onNavigate('training-stats'),
    },
    {
      key: 'prehab',
      title: `${sportLabel} injury prevention`,
      subtitle: 'Neck, shoulders, knees, hips. Build durability before fatigue hits.',
      icon: Heart,
      iconColor: 'text-red-400',
      bg: 'from-red-500/15 via-black/80 to-black/95',
      onClick: () => onNavigate('body-part-selector'),
    },
    {
      key: 'learn',
      title: 'Load technical content',
      subtitle: daysSinceLastSession !== null && daysSinceLastSession > 2
        ? `You have been off ${daysSinceLastSession} days. Start with targeted drills.`
        : 'Use Training Hub to sharpen technique between strength sessions.',
      icon: Target,
      iconColor: 'text-primary',
      bg: 'from-primary/20 via-black/80 to-black/95',
      onClick: () => onNavigate('training-hub'),
    },
  ]

  return (
    <div className="px-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
          For You
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => {
              haptics.light()
              card.onClick()
            }}
            className={`min-w-[240px] text-left rounded-2xl p-4 border border-white/10 bg-gradient-to-br ${card.bg} hover:border-white/20 transition-all`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              <card.icon size={18} className={card.iconColor} />
            </div>
            <p className="text-sm font-black text-foreground">{card.title}</p>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">{card.subtitle}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mt-3">
              Open
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Home({
  session,
  weekProgress,
  sessionHistory = [],
  activityLogs = [],
  selectedSport = null,
  currentStreak,
  longestStreak,
  equipment,
  onStartSession,
  onNavigate,
  undoLabel,
  onUndo,
  onStartAction,
  hasWorkoutToday,
  userName,
  onStartRoundTimer,
  onQuickWarmup,
  onQuickRecovery,
  sessionAdjustmentMode = null,
  onSetSessionAdjustmentMode,
  carryOverSessionDayLabel = null,
  missedPlannedSessionCount = 0,
  initialScrollTop,
  onScrollChange
}: HomeProps) {
  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position on mount
  useEffect(() => {
    if (initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollTop
            hasRestoredScroll.current = true
          }
        })
      })
    }
  }, [initialScrollTop])

  // Handle scroll to save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

  // eslint-disable-next-line react-hooks/purity -- snapshot current time once per screen mount for relative trend messaging
  const statsReferenceNow = useMemo(() => Date.now(), [])
  const [readinessEnergy, setReadinessEnergy] = useState<SessionReadinessEnergy>('ready')
  const [readinessTime, setReadinessTime] = useState<SessionReadinessTime>('full')

  const equipmentLabel = equipment === 'bodyweight'
    ? 'Bodyweight'
    : equipment === 'gym'
      ? 'Gym Equipment'
      : 'Any Equipment'

  // Get theme based on session focus
  const sessionTheme = session?.focus
    ? (focusThemes[session.focus] || focusThemes.default)
    : focusThemes.default

  // Smart contextual message
  const smartMessage = getSmartMessage(session, currentStreak, weekProgress)
  const recommendedAdjustmentMode = useMemo(
    () => recommendSessionAdjustmentMode(readinessEnergy, readinessTime),
    [readinessEnergy, readinessTime]
  )
  const activeAdjustmentMode = sessionAdjustmentMode ?? 'full'
  const carryOverSummary = carryOverSessionDayLabel
    ? missedPlannedSessionCount > 1
      ? `You have ${missedPlannedSessionCount} missed planned sessions. Start with ${carryOverSessionDayLabel} to get back in order.`
      : `You missed ${carryOverSessionDayLabel}. Do it today and the rest of the week stays in order.`
    : null
  const homeHeroSummary = useMemo(() => buildHomeHeroSummary({
    session,
    weekProgress,
    currentStreak,
    longestStreak,
    sessionAdjustmentMode,
    carryOverSessionDayLabel,
    missedPlannedSessionCount,
  }), [
    session,
    weekProgress,
    currentStreak,
    longestStreak,
    sessionAdjustmentMode,
    carryOverSessionDayLabel,
    missedPlannedSessionCount,
  ])

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain safe-area-top"
      >
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pb-28">

          {/* ================================================================
              GREETING HEADER
          ================================================================ */}
          <GreetingHeader
            userName={userName}
            currentStreak={currentStreak}
            onNavigate={onNavigate}
          />

          {/* ================================================================
              WEEK PROGRESS
          ================================================================ */}
          <WeekProgress
            weekProgress={weekProgress}
            onNavigate={onNavigate}
          />

          {/* ================================================================
              TODAY'S SESSION CARD
          ================================================================ */}
          <div className="px-6 mb-6">
            {session ? (
              <div className={`rounded-2xl p-5 border ${sessionTheme.borderColor} bg-gradient-to-br ${sessionTheme.gradient} backdrop-blur-sm relative overflow-hidden`}>
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${sessionTheme.iconBg} flex items-center justify-center`}>
                        <Dumbbell size={24} className={sessionTheme.accentColor} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
                          {session.day}
                        </p>
                        <h3 className={`text-2xl font-black ${sessionTheme.textColor}`}>
                          {session.focus}
                        </h3>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${sessionTheme.iconBg} ${sessionTheme.textColor}`}>
                      {homeHeroSummary.badge}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-3 text-sm text-white/50 mb-4">
                    <span>{session.duration} min</span>
                    <span className="text-white/20">•</span>
                    <span>{session.exercises?.length || 8} exercises</span>
                    <span className="text-white/20">•</span>
                    <span>{equipmentLabel}</span>
                  </div>

                  <div className="mb-4 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm space-y-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/45">
                        Coach note
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {smartMessage}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className={`text-xl font-black ${sessionTheme.textColor}`}>
                        {homeHeroSummary.headline}
                      </h4>
                      <p className="text-xs leading-relaxed text-white/70">
                        {homeHeroSummary.body}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {homeHeroSummary.highlights.map((highlight) => (
                        <div key={highlight.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">
                            {highlight.label}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1">
                            {highlight.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {carryOverSummary && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 mb-4">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-200">
                        Catch-up session
                      </p>
                      <p className="text-xs text-amber-50/85 mt-1 leading-relaxed">
                        {carryOverSummary}
                      </p>
                    </div>
                  )}

                  {onSetSessionAdjustmentMode && (
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 mb-4 backdrop-blur-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
                            Readiness check
                          </p>
                          <p className="text-xs text-white/60 mt-1">
                            Adjust today based on energy and the time you actually have.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] rounded-full px-2 py-1 bg-white/10 text-white/70">
                          {getSessionAdjustmentLabel(activeAdjustmentMode)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">Energy</p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {READINESS_ENERGY_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                haptics.light()
                                setReadinessEnergy(option.value)
                              }}
                              className={`h-10 rounded-xl border text-xs font-semibold transition-all ${
                                readinessEnergy === option.value
                                  ? 'border-primary bg-primary/15 text-primary'
                                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
                              }`}
                              aria-pressed={readinessEnergy === option.value}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">Time today</p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {READINESS_TIME_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                haptics.light()
                                setReadinessTime(option.value)
                              }}
                              className={`h-10 rounded-xl border text-xs font-semibold transition-all ${
                                readinessTime === option.value
                                  ? 'border-primary bg-primary/15 text-primary'
                                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
                              }`}
                              aria-pressed={readinessTime === option.value}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40">Recommended</p>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {getSessionAdjustmentLabel(recommendedAdjustmentMode)}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          {getSessionAdjustmentDescription(recommendedAdjustmentMode)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {SESSION_ADJUSTMENT_MODES.map((mode) => {
                          const isActive = activeAdjustmentMode === mode
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                haptics.light()
                                onSetSessionAdjustmentMode?.(mode)
                              }}
                              className={`rounded-xl border px-3 py-3 text-left transition-all ${
                                isActive
                                  ? 'border-primary bg-primary/15 text-primary'
                                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
                              }`}
                              aria-pressed={isActive}
                            >
                              <span className="block text-sm font-semibold">
                                {getSessionAdjustmentLabel(mode)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Start Button - Embedded */}
                  <Button
                    onClick={() => {
                      haptics.medium()
                      onStartSession()
                    }}
                    variant="primary"
                    size="lg"
                    fullWidth
                    withHaptic={false}
                    className="h-14 font-black text-base tracking-wide uppercase rounded-xl glow-primary-subtle"
                  >
                    <Play size={20} className="mr-2 fill-current" />
                    {homeHeroSummary.primaryActionLabel}
                  </Button>

                  <Button
                    onClick={() => {
                      haptics.light()
                      onNavigate('today-editor')
                    }}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    className="h-12 font-bold rounded-xl mt-3"
                  >
                    Edit Today
                  </Button>
                </div>
              </div>
            ) : (
              /* No Program State */
              <div className="rounded-2xl p-5 border border-primary/20 bg-gradient-to-br from-primary/10 via-black/70 to-black/90 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Dumbbell size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/70">
                      {homeHeroSummary.badge}
                    </p>
                    <h3 className="text-2xl font-black text-foreground">
                      {homeHeroSummary.headline}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {homeHeroSummary.body}
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {homeHeroSummary.highlights.map((highlight) => (
                    <div key={highlight.label} className="rounded-xl border border-primary/15 bg-black/20 px-3 py-2">
                      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary/50">
                        {highlight.label}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {highlight.value}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    haptics.medium()
                    onNavigate('onboarding-sport')
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="h-14 font-bold"
                >
                  {homeHeroSummary.primaryActionLabel}
                </Button>
              </div>
            )}
          </div>

          {/* ================================================================
              QUICK ACTIONS
          ================================================================ */}
          <QuickActions
            onNavigate={onNavigate}
            onStartSession={onStartSession}
            hasSession={!!session}
            onStartRoundTimer={onStartRoundTimer}
            onQuickWarmup={onQuickWarmup}
            onQuickRecovery={onQuickRecovery}
          />

          {/* ================================================================
              RETENTION: PROGRESS + RECOMMENDATIONS
          ================================================================ */}
          <ProgressPulse
            sessionHistory={sessionHistory}
            activityLogs={activityLogs}
            now={statsReferenceNow}
            onNavigate={onNavigate}
          />

          <ForYou
            sessionHistory={sessionHistory}
            currentStreak={currentStreak}
            selectedSport={selectedSport}
            now={statsReferenceNow}
            onNavigate={onNavigate}
          />

        </div>
      </div>

      {/* ================================================================
          UNDO TOAST
      ================================================================ */}
      {undoLabel && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4">
          <div className="flex items-center gap-3 card-glass px-4 py-2 rounded-full shadow-lg border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {undoLabel}
            </span>
            <Button
              onClick={onUndo}
              variant="link"
              size="sm"
              className="text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 p-0 h-auto min-h-0"
            >
              Undo
            </Button>
          </div>
        </div>
      )}

      <ScreenShellFooter>
        <BottomNav
          active="home"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
