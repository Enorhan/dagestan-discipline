import { WeekDay } from '@/lib/types'

export type MissedSessionRecoveryState = {
  nextSessionDayIndex: number
  overdueDayIndexes: number[]
  carryOverDayIndex: number | null
  daysSinceLastWorkout: number | null
  shouldPromptAccountability: boolean
}

const getStartOfDayTime = (value: Date) => new Date(value.toDateString()).getTime()

export const getOverduePlannedDayIndexes = (weekProgress: WeekDay[], todayIndex: number): number[] => {
  if (!Array.isArray(weekProgress) || weekProgress.length === 0) return []
  const clampedTodayIndex = Math.max(0, Math.min(todayIndex, weekProgress.length - 1))
  return weekProgress.flatMap((day, index) => {
    return day.planned && !day.completed && index < clampedTodayIndex ? [index] : []
  })
}

export const getNextRecoverySessionIndex = (weekProgress: WeekDay[], todayIndex: number): number => {
  const overdue = getOverduePlannedDayIndexes(weekProgress, todayIndex)
  if (overdue.length > 0) return overdue[0] ?? -1
  const nextOpen = weekProgress.findIndex((day) => day.planned && !day.completed)
  if (nextOpen !== -1) return nextOpen
  return weekProgress.findIndex((day) => day.planned)
}

export const getMissedSessionRecoveryState = (params: {
  weekProgress: WeekDay[]
  todayIndex: number
  lastWorkoutDate?: string | null
  currentStreak: number
  now?: Date
}): MissedSessionRecoveryState => {
  const { weekProgress, todayIndex, lastWorkoutDate = null, currentStreak, now = new Date() } = params
  const overdueDayIndexes = getOverduePlannedDayIndexes(weekProgress, todayIndex)
  const carryOverDayIndex = overdueDayIndexes[0] ?? null
  const nextSessionDayIndex = getNextRecoverySessionIndex(weekProgress, todayIndex)
  const lastWorkoutMs = lastWorkoutDate ? Date.parse(lastWorkoutDate) : Number.NaN
  const daysSinceLastWorkout = Number.isFinite(lastWorkoutMs)
    ? Math.floor((getStartOfDayTime(now) - getStartOfDayTime(new Date(lastWorkoutMs))) / (1000 * 60 * 60 * 24))
    : null

  return {
    nextSessionDayIndex,
    overdueDayIndexes,
    carryOverDayIndex,
    daysSinceLastWorkout,
    shouldPromptAccountability: overdueDayIndexes.length > 0 && currentStreak > 0 && (daysSinceLastWorkout ?? 0) > 1,
  }
}