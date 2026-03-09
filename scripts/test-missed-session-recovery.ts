import assert from 'node:assert/strict'
import { getMissedSessionRecoveryState, getNextRecoverySessionIndex, getOverduePlannedDayIndexes } from '@/lib/missed-session-recovery'
import { WeekDay } from '@/lib/types'

const baseWeek = (): WeekDay[] => [
  { day: 'Monday', shortDay: 'M', planned: true, completed: false },
  { day: 'Tuesday', shortDay: 'T', planned: false, completed: false },
  { day: 'Wednesday', shortDay: 'W', planned: true, completed: false },
  { day: 'Thursday', shortDay: 'T', planned: false, completed: false },
  { day: 'Friday', shortDay: 'F', planned: true, completed: false },
  { day: 'Saturday', shortDay: 'S', planned: false, completed: false },
  { day: 'Sunday', shortDay: 'S', planned: false, completed: false },
]

assert.deepEqual(getOverduePlannedDayIndexes(baseWeek(), 4), [0, 2])
assert.equal(getNextRecoverySessionIndex(baseWeek(), 4), 0)

const caughtUpWeek = baseWeek()
caughtUpWeek[0]!.completed = true
assert.equal(getNextRecoverySessionIndex(caughtUpWeek, 2), 2)

const promptState = getMissedSessionRecoveryState({
  weekProgress: baseWeek(),
  todayIndex: 4,
  lastWorkoutDate: '2026-03-04T12:00:00.000Z',
  currentStreak: 3,
  now: new Date('2026-03-07T12:00:00.000Z'),
})
assert.equal(promptState.carryOverDayIndex, 0)
assert.equal(promptState.shouldPromptAccountability, true)

const noPromptOnRestGap = getMissedSessionRecoveryState({
  weekProgress: caughtUpWeek,
  todayIndex: 2,
  lastWorkoutDate: '2026-03-04T12:00:00.000Z',
  currentStreak: 3,
  now: new Date('2026-03-07T12:00:00.000Z'),
})
assert.equal(noPromptOnRestGap.carryOverDayIndex, null)
assert.equal(noPromptOnRestGap.shouldPromptAccountability, false)

console.log('Missed-session recovery tests passed.')