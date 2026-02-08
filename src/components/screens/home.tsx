'use client'

import React from 'react'
import { Screen, Session, WeekDay, Equipment } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
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
}

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
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-all"
        aria-label="View profile and streak"
      >
        <Flame size={16} className="text-orange-400" />
        <span className="text-sm font-bold text-orange-300">{currentStreak}</span>
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
  hasSession
}: {
  onNavigate: (screen: Screen) => void
  onStartSession: () => void
  hasSession: boolean
}) {
  const actions = [
    {
      icon: Zap,
      label: 'Quick Warmup',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      onClick: () => {
        haptics.light()
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
    },
    {
      icon: Target,
      label: 'Drills',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      onClick: () => {
        haptics.light()
        onNavigate('training-hub')
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Home({
  session,
  weekProgress,
  currentStreak,
  longestStreak,
  equipment,
  onStartSession,
  onNavigate,
  undoLabel,
  onUndo,
  onStartAction,
  hasWorkoutToday,
  userName
}: HomeProps) {
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

  return (
    <ScreenShell>
      <ScreenShellContent className="safe-area-top">
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
                      Ready
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

                  {/* Smart Message */}
                  <p className="text-xs text-white/40 mb-4">
                    {smartMessage}
                  </p>

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
                    Start Workout
                  </Button>
                </div>
              </div>
            ) : (
              /* No Program State */
              <div className="rounded-2xl p-5 border border-white/10 bg-gradient-to-br from-white/5 via-black/70 to-black/90 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Dumbbell size={24} className="text-white/30" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                      No Program
                    </p>
                    <h3 className="text-2xl font-black text-white/50">
                      Get Started
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-white/40 mb-4">
                  Generate a personalized workout program to begin your training journey
                </p>
                <Button
                  onClick={() => {
                    haptics.medium()
                    onNavigate('onboarding-sport')
                  }}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="h-14 font-bold"
                >
                  Create Program
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
          />

        </div>
      </ScreenShellContent>

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
