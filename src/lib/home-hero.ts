import { Session, SessionAdjustmentMode, WeekDay } from '@/lib/types'

export interface HomeHeroHighlight {
  label: string
  value: string
}

export interface HomeHeroSummary {
  badge: string
  headline: string
  body: string
  primaryActionLabel: string
  highlights: HomeHeroHighlight[]
}

interface BuildHomeHeroSummaryInput {
  session: Session | null
  weekProgress: WeekDay[]
  currentStreak: number
  longestStreak: number
  sessionAdjustmentMode: SessionAdjustmentMode | null
  carryOverSessionDayLabel?: string | null
  missedPlannedSessionCount?: number
}

const getModeValue = (mode: SessionAdjustmentMode | null) => {
  switch (mode) {
    case 'short': return 'Short'
    case 'recovery': return 'Recovery'
    case 'technique': return 'Technique'
    case 'full':
    default:
      return 'Full'
  }
}

export function buildHomeHeroSummary({
  session,
  weekProgress,
  currentStreak,
  longestStreak,
  sessionAdjustmentMode,
  carryOverSessionDayLabel = null,
  missedPlannedSessionCount = 0,
}: BuildHomeHeroSummaryInput): HomeHeroSummary {
  const plannedSessions = weekProgress.filter((day) => day.planned).length
  const completedSessions = weekProgress.filter((day) => day.planned && day.completed).length
  const remainingSessions = Math.max(plannedSessions - completedSessions, 0)
  const streakValue = currentStreak > 0
    ? longestStreak > currentStreak
      ? `${currentStreak}/${longestStreak} best`
      : `${currentStreak} days`
    : longestStreak > 0
      ? `Best ${longestStreak}d`
      : 'Start today'

  if (!session) {
    return {
      badge: 'Build your plan',
      headline: 'Set up a plan you can start today',
      body: longestStreak > 0
        ? `Your best streak is ${longestStreak} days. Build today’s plan and start that rhythm again.`
        : 'Generate a personalized program so the app can tell you exactly what to do next.',
      primaryActionLabel: 'Generate My Program',
      highlights: [
        { label: 'Setup', value: '~2 min' },
        { label: 'Outcome', value: 'Daily plan' },
        { label: 'Streak', value: streakValue },
      ],
    }
  }

  const highlights: HomeHeroHighlight[] = [
    { label: 'Today', value: `${session.duration} min` },
    {
      label: carryOverSessionDayLabel ? 'Catch-up' : 'Week',
      value: carryOverSessionDayLabel ? `${Math.max(1, missedPlannedSessionCount)} overdue` : `${completedSessions}/${plannedSessions || 0}`,
    },
    { label: 'Mode', value: getModeValue(sessionAdjustmentMode) },
    { label: 'Streak', value: streakValue },
  ]

  if (carryOverSessionDayLabel) {
    const missedCountLabel = missedPlannedSessionCount > 1
      ? `${missedPlannedSessionCount} missed planned sessions are waiting.`
      : `${carryOverSessionDayLabel} still needs to be completed.`

    return {
      badge: 'Catch-up day',
      headline: `Start with ${session.focus} and get back in rhythm`,
      body: `${missedCountLabel} Finishing this first keeps the rest of the week in order.`,
      primaryActionLabel: 'Start catch-up session',
      highlights,
    }
  }

  if (currentStreak > 0) {
    return {
      badge: 'Protect momentum',
      headline: `Keep your ${currentStreak}-day streak alive with ${session.focus}`,
      body: remainingSessions > 1
        ? `${remainingSessions} planned sessions are still on the board this week. Today keeps the run moving.`
        : 'One more planned win keeps your training habit feeling automatic.',
      primaryActionLabel: 'Start workout',
      highlights,
    }
  }

  if (completedSessions === 0) {
    return {
      badge: 'Start strong',
      headline: `Open the week with ${session.focus}`,
      body: 'A strong first session makes the rest of the week easier to follow.',
      primaryActionLabel: 'Start workout',
      highlights,
    }
  }

  if (plannedSessions > 0 && remainingSessions <= 1) {
    return {
      badge: 'Finish the week',
      headline: `Finish strong with ${session.focus}`,
      body: 'You are one session away from closing the planned week on schedule.',
      primaryActionLabel: 'Start workout',
      highlights,
    }
  }

  return {
    badge: 'Today’s best move',
    headline: `${session.focus} is the right session today`,
    body: remainingSessions > 0
      ? `${remainingSessions} planned sessions remain after today, so this is the cleanest next win.`
      : 'Stay on schedule and keep your training momentum visible.',
    primaryActionLabel: 'Start workout',
    highlights,
  }
}