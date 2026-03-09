import { ActivityLog, SessionLog } from '@/lib/types'

export type ProgressStorytellingViewMode = 'month' | 'year'
export type ProgressStoryInsightTone = 'positive' | 'neutral' | 'attention'

export interface ProgressStoryInsight {
  label: string
  value: string
  detail: string
  tone: ProgressStoryInsightTone
}

export interface ProgressStory {
  headline: string
  summary: string
  insights: ProgressStoryInsight[]
}

interface BuildProgressStoryInput {
  sessionHistory: SessionLog[]
  activityLogs: ActivityLog[]
  currentStreak: number
  longestStreak: number
  selectedDate: Date
  viewMode: ProgressStorytellingViewMode
}

interface PeriodMetrics {
  totalSessions: number
  totalHours: number
  totalPRs: number
  totalVolume: number
  activeDays: number
  combatMinutes: number
}

const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

const getPeriodLabel = (date: Date, viewMode: ProgressStorytellingViewMode) => (
  viewMode === 'month'
    ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : date.getFullYear().toString()
)

const getPeriodStart = (date: Date, viewMode: ProgressStorytellingViewMode) => (
  viewMode === 'month'
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), 0, 1)
)

const shiftPeriod = (date: Date, viewMode: ProgressStorytellingViewMode, amount: number) => {
  const shifted = new Date(date)
  if (viewMode === 'month') {
    shifted.setMonth(shifted.getMonth() + amount)
  } else {
    shifted.setFullYear(shifted.getFullYear() + amount)
  }
  return shifted
}

const isInRange = (dateString: string, start: Date, end: Date) => {
  const timestamp = new Date(dateString).getTime()
  return timestamp >= start.getTime() && timestamp < end.getTime()
}

const getMetrics = (
  sessionHistory: SessionLog[],
  activityLogs: ActivityLog[],
  start: Date,
  end: Date,
): PeriodMetrics => {
  const filteredSessions = sessionHistory.filter((session) => isInRange(session.date, start, end))
  const filteredActivities = activityLogs.filter((activity) => isInRange(activity.date, start, end))
  const activeDayKeys = new Set([
    ...filteredSessions.map((session) => session.date.slice(0, 10)),
    ...filteredActivities.map((activity) => activity.date.slice(0, 10)),
  ])

  return {
    totalSessions: filteredSessions.length + filteredActivities.length,
    totalHours: (
      filteredSessions.reduce((sum, session) => sum + (session.totalTime ?? 0), 0) / 3600 +
      filteredActivities.reduce((sum, activity) => sum + activity.duration, 0) / 60
    ),
    totalPRs: filteredSessions.reduce((sum, session) => sum + (session.prs?.length ?? 0), 0),
    totalVolume: filteredSessions.reduce((sum, session) => sum + (session.volume ?? 0), 0),
    activeDays: activeDayKeys.size,
    combatMinutes: filteredActivities.reduce((sum, activity) => sum + activity.duration, 0),
  }
}

export function buildProgressStory({
  sessionHistory,
  activityLogs,
  currentStreak,
  longestStreak,
  selectedDate,
  viewMode,
}: BuildProgressStoryInput): ProgressStory {
  const periodLabel = getPeriodLabel(selectedDate, viewMode)
  const periodName = viewMode === 'month' ? 'month' : 'year'
  const currentStart = getPeriodStart(selectedDate, viewMode)
  const currentEnd = shiftPeriod(currentStart, viewMode, 1)
  const previousStart = shiftPeriod(currentStart, viewMode, -1)
  const previousEnd = currentStart
  const current = getMetrics(sessionHistory, activityLogs, currentStart, currentEnd)
  const previous = getMetrics(sessionHistory, activityLogs, previousStart, previousEnd)
  const sessionDelta = current.totalSessions - previous.totalSessions
  const volumeDeltaPercent = previous.totalVolume > 0
    ? Math.round(((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100)
    : null

  let headline = 'You put real work on the board.'
  if (current.totalSessions === 0) {
    headline = previous.totalSessions > 0
      ? `This ${periodName} is ready for a reset.`
      : 'Your progress story starts with session one.'
  } else if (currentStreak >= 7 || current.activeDays >= (viewMode === 'month' ? 4 : 24)) {
    headline = 'Consistency is becoming a habit.'
  } else if (sessionDelta > 0 || (volumeDeltaPercent !== null && volumeDeltaPercent >= 10)) {
    headline = 'You’re carrying real momentum.'
  } else if (current.totalPRs > 0) {
    headline = 'Performance is showing up in the numbers.'
  } else if (sessionDelta < 0 && currentStreak === 0) {
    headline = 'This period was lighter, but not empty.'
  }

  let summary = ''
  if (current.totalSessions === 0) {
    summary = previous.totalSessions > 0
      ? `You logged ${pluralize(previous.totalSessions, 'training session')} in the previous ${periodName}. One completed session starts the trend again.`
      : `Log your first workout or activity and ${viewMode === 'month' ? 'monthly' : 'yearly'} recaps will start explaining what is improving.`
  } else {
    summary = `${periodLabel} includes ${pluralize(current.totalSessions, 'training session')} across ${pluralize(current.activeDays, 'active day')}`
    if (current.totalPRs > 0) {
      summary += ` and ${pluralize(current.totalPRs, 'PR')}`
    }
    summary += '.'

    if (previous.totalSessions > 0 && sessionDelta !== 0) {
      summary += ` That is ${Math.abs(sessionDelta)} ${sessionDelta > 0 ? 'more' : 'fewer'} than the previous ${periodName}.`
    } else if (previous.totalSessions === 0) {
      summary += ` This is your first comparison-ready ${periodName} of logged training.`
    }

    if (volumeDeltaPercent !== null && Math.abs(volumeDeltaPercent) >= 10) {
      summary += ` Load is ${volumeDeltaPercent > 0 ? '+' : ''}${volumeDeltaPercent}% versus the previous ${periodName}.`
    }
  }

  const consistencyDetail = currentStreak > 0
    ? longestStreak > currentStreak
      ? `${pluralize(current.activeDays, 'active day')} logged in ${periodLabel}. You are ${pluralize(longestStreak - currentStreak, 'day')} from your best streak of ${longestStreak}.`
      : `${pluralize(current.activeDays, 'active day')} logged in ${periodLabel}. You are matching your best streak right now.`
    : current.activeDays > 0
      ? `${pluralize(current.activeDays, 'active day')} logged in ${periodLabel}. One more session is enough to start a fresh streak.`
      : `No active days logged in ${periodLabel} yet.`

  const momentumInsight: ProgressStoryInsight = previous.totalSessions === 0
    ? {
        label: 'Momentum',
        value: current.totalSessions > 0 ? 'New baseline' : 'No comparison yet',
        detail: current.totalSessions > 0
          ? `This is the first ${periodName} with enough data to compare going forward.`
          : `Log a session in this ${periodName} to unlock trend comparisons.`,
        tone: current.totalSessions > 0 ? 'positive' : 'neutral',
      }
    : sessionDelta > 0
      ? {
          label: 'Momentum',
          value: `+${sessionDelta} sessions`,
          detail: `${current.totalSessions} total sessions versus ${previous.totalSessions} in the previous ${periodName}.`,
          tone: 'positive',
        }
      : sessionDelta < 0
        ? {
            label: 'Momentum',
            value: `${sessionDelta} sessions`,
            detail: `${current.totalSessions} total sessions versus ${previous.totalSessions} in the previous ${periodName}.`,
            tone: 'attention',
          }
        : {
            label: 'Momentum',
            value: `Even vs last ${periodName}`,
            detail: `You matched the same number of sessions as the previous ${periodName}.`,
            tone: 'neutral',
          }

  const performanceInsight: ProgressStoryInsight = current.totalPRs > 0
    ? {
        label: 'Breakthroughs',
        value: `${current.totalPRs} PR${current.totalPRs === 1 ? '' : 's'}`,
        detail: previous.totalPRs > 0
          ? `${pluralize(previous.totalPRs, 'PR')} landed in the previous ${periodName}. Keep repeating what is clicking.`
          : 'First measurable breakthrough logged in this comparison cycle.',
        tone: 'positive',
      }
    : volumeDeltaPercent !== null
      ? {
          label: 'Load trend',
          value: `${volumeDeltaPercent > 0 ? '+' : ''}${volumeDeltaPercent}%`,
          detail: 'Based on logged lifting volume across completed gym sessions.',
          tone: volumeDeltaPercent > 0 ? 'positive' : volumeDeltaPercent < 0 ? 'attention' : 'neutral',
        }
      : current.combatMinutes > 0
        ? {
            label: 'Combat work',
            value: `${current.combatMinutes} min`,
            detail: `Skill, mat, or conditioning time logged during ${periodLabel}.`,
            tone: 'neutral',
          }
        : {
            label: 'Training time',
            value: `${current.totalHours.toFixed(1)} hrs`,
            detail: `Total logged training time during ${periodLabel}.`,
            tone: 'neutral',
          }

  return {
    headline,
    summary,
    insights: [
      {
        label: 'Consistency',
        value: currentStreak > 0 ? `${currentStreak}-day streak` : pluralize(current.activeDays, 'active day'),
        detail: consistencyDetail,
        tone: currentStreak >= 7 ? 'positive' : current.activeDays === 0 ? 'attention' : 'neutral',
      },
      momentumInsight,
      performanceInsight,
    ],
  }
}