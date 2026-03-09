import assert from 'node:assert/strict'
import { buildProgressStory } from '@/lib/progress-storytelling'

const momentumStory = buildProgressStory({
  sessionHistory: [
    { id: 'prev-1', date: '2026-02-05T12:00:00.000Z', sessionId: 'a', completed: true, totalTime: 1800, volume: 1200 },
    { id: 'curr-1', date: '2026-03-02T12:00:00.000Z', sessionId: 'b', completed: true, totalTime: 2400, volume: 1800, prs: [{ exerciseId: '1', exerciseName: 'Front Squat', type: 'weight', value: 100, previousBest: 95, improvement: 5, unit: 'kg' }] },
    { id: 'curr-2', date: '2026-03-07T12:00:00.000Z', sessionId: 'c', completed: true, totalTime: 2400, volume: 2200 },
  ],
  activityLogs: [
    { id: 'act-1', date: '2026-03-09T12:00:00.000Z', type: 'drilling', duration: 45, intensity: 6 },
  ],
  currentStreak: 5,
  longestStreak: 9,
  selectedDate: new Date('2026-03-15T12:00:00.000Z'),
  viewMode: 'month',
})

assert.equal(momentumStory.headline, 'You’re carrying real momentum.')
assert.ok(momentumStory.summary.includes('March 2026 includes 3 training sessions'))
assert.equal(momentumStory.insights[1]?.value, '+2 sessions')
assert.equal(momentumStory.insights[2]?.value, '1 PR')

const resetStory = buildProgressStory({
  sessionHistory: [
    { id: 'prev-2', date: '2026-02-12T12:00:00.000Z', sessionId: 'x', completed: true, totalTime: 1800 },
  ],
  activityLogs: [],
  currentStreak: 0,
  longestStreak: 6,
  selectedDate: new Date('2026-03-20T12:00:00.000Z'),
  viewMode: 'month',
})

assert.equal(resetStory.headline, 'This month is ready for a reset.')
assert.ok(resetStory.summary.includes('previous month'))
assert.equal(resetStory.insights[0]?.value, '0 active days')

const yearlyStory = buildProgressStory({
  sessionHistory: [
    { id: 'year-prev', date: '2025-05-12T12:00:00.000Z', sessionId: 'y1', completed: true, totalTime: 1800, volume: 1000 },
    { id: 'year-curr', date: '2026-01-18T12:00:00.000Z', sessionId: 'y2', completed: true, totalTime: 2100, volume: 1600 },
    { id: 'year-curr-2', date: '2026-04-09T12:00:00.000Z', sessionId: 'y3', completed: true, totalTime: 2100, volume: 1700 },
  ],
  activityLogs: [],
  currentStreak: 8,
  longestStreak: 8,
  selectedDate: new Date('2026-08-01T12:00:00.000Z'),
  viewMode: 'year',
})

assert.equal(yearlyStory.headline, 'Consistency is becoming a habit.')
assert.ok(yearlyStory.summary.includes('2026 includes 2 training sessions'))
assert.equal(yearlyStory.insights[0]?.value, '8-day streak')

console.log('Progress storytelling tests passed.')