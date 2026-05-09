import type { BjjSession } from '@/lib/bjj-types'

export type SessionBucketKey = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'older'

export const SESSION_BUCKET_LABELS: Record<SessionBucketKey, string> = {
  'today': 'Today',
  'yesterday': 'Yesterday',
  'this-week': 'This week',
  'this-month': 'This month',
  'older': 'Earlier',
}

export const SESSION_BUCKET_ORDER: SessionBucketKey[] = ['today', 'yesterday', 'this-week', 'this-month', 'older']

export function formatPrettyDate(date: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
  } catch {
    return date
  }
}

export function formatPrettyDateTime(date: string, time: string): string {
  return `${formatPrettyDate(date)} · ${time}`
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function bucketForSessionDate(sessionDate: string, now: Date = new Date()): SessionBucketKey {
  const parsed = new Date(sessionDate)
  if (Number.isNaN(parsed.getTime())) return 'older'
  const target = startOfDay(parsed).getTime()
  const todayStart = startOfDay(now).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const dayOfWeek = now.getDay()
  const weekStart = todayStart - dayOfWeek * 24 * 60 * 60 * 1000
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  if (target === todayStart) return 'today'
  if (target === yesterdayStart) return 'yesterday'
  if (target >= weekStart) return 'this-week'
  if (target >= monthStart) return 'this-month'
  return 'older'
}

export function computeWeekStart(now: Date = new Date()): number {
  const todayStart = startOfDay(now).getTime()
  return todayStart - now.getDay() * 24 * 60 * 60 * 1000
}

export function computeTrainingStreakDays(sessions: readonly BjjSession[], now: Date = new Date()): number {
  if (sessions.length === 0) return 0
  const dayMs = 24 * 60 * 60 * 1000
  const days = new Set<number>()
  for (const session of sessions) {
    const parsed = new Date(session.date)
    if (Number.isNaN(parsed.getTime())) continue
    days.add(startOfDay(parsed).getTime())
  }
  const todayStart = startOfDay(now).getTime()
  let cursor = days.has(todayStart) ? todayStart : todayStart - dayMs
  if (!days.has(cursor)) return 0
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= dayMs
  }
  return streak
}

export function formatDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDayKey(key: string): Date | null {
  const parts = key.split('-')
  if (parts.length !== 3) return null
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getMonthAnchor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(anchor: Date, delta: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
}

export function getMonthMatrix(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const startOffset = first.getDay()
  const cells: Date[] = []
  for (let i = 0; i < 42; i += 1) {
    cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), 1 - startOffset + i))
  }
  return cells
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function formatSelectedDayTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function computeStreakDayKeys(sessions: readonly BjjSession[], now: Date = new Date()): Set<string> {
  const result = new Set<string>()
  if (sessions.length === 0) return result
  const dayMs = 24 * 60 * 60 * 1000
  const keys = new Set<string>()
  for (const session of sessions) {
    if (session.date) keys.add(session.date.slice(0, 10))
  }
  const todayKey = formatDayKey(now)
  const yesterdayKey = formatDayKey(new Date(now.getTime() - dayMs))
  let cursorKey = keys.has(todayKey) ? todayKey : yesterdayKey
  if (!keys.has(cursorKey)) return result
  const cursorStart = parseDayKey(cursorKey)
  if (!cursorStart) return result
  let cursorMs = cursorStart.getTime()
  while (keys.has(formatDayKey(new Date(cursorMs)))) {
    result.add(formatDayKey(new Date(cursorMs)))
    cursorMs -= dayMs
  }
  return result
}

