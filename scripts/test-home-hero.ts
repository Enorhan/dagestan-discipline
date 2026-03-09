import assert from 'node:assert/strict'
import { buildHomeHeroSummary } from '@/lib/home-hero'

const weekProgress = [
  { day: 'Monday', shortDay: 'Mon', planned: true, completed: true },
  { day: 'Tuesday', shortDay: 'Tue', planned: true, completed: false },
  { day: 'Wednesday', shortDay: 'Wed', planned: true, completed: false },
]

const catchUpSummary = buildHomeHeroSummary({
  session: { id: 's1', day: 'Tuesday', focus: 'Pull', duration: 34, exercises: [] },
  weekProgress,
  currentStreak: 0,
  longestStreak: 4,
  sessionAdjustmentMode: 'short',
  carryOverSessionDayLabel: 'Monday',
  missedPlannedSessionCount: 2,
})

assert.equal(catchUpSummary.badge, 'Catch-up day')
assert.equal(catchUpSummary.primaryActionLabel, 'Start catch-up session')
assert.equal(catchUpSummary.highlights[1]?.value, '2 overdue')
assert.equal(catchUpSummary.highlights[2]?.value, 'Short')

const momentumSummary = buildHomeHeroSummary({
  session: { id: 's2', day: 'Thursday', focus: 'Legs', duration: 48, exercises: [] },
  weekProgress,
  currentStreak: 5,
  longestStreak: 8,
  sessionAdjustmentMode: 'full',
})

assert.equal(momentumSummary.badge, 'Protect momentum')
assert.ok(momentumSummary.headline.includes('5-day streak'))
assert.equal(momentumSummary.highlights[3]?.value, '5/8 best')

const noProgramSummary = buildHomeHeroSummary({
  session: null,
  weekProgress: [],
  currentStreak: 0,
  longestStreak: 6,
  sessionAdjustmentMode: null,
})

assert.equal(noProgramSummary.primaryActionLabel, 'Generate My Program')
assert.equal(noProgramSummary.highlights[0]?.value, '~2 min')
assert.equal(noProgramSummary.highlights[2]?.value, 'Best 6d')

console.log('Home hero tests passed.')