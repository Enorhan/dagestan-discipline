import assert from 'node:assert/strict'

import { Session } from '@/lib/types'
import {
  adjustSessionForReadiness,
  estimateDurationMinutes,
  normalizeSessionAdjustmentMode,
  recommendSessionAdjustmentMode,
} from '@/lib/session-adjustment'

const baseSession: Session = {
  id: 'session-1',
  day: 'Monday',
  focus: 'Upper Body',
  duration: 48,
  exercises: [
    { id: 'a', name: 'A', sets: 4, reps: 5, restTime: 120 },
    { id: 'b', name: 'B', sets: 4, reps: 8, restTime: 90 },
    { id: 'c', name: 'C', sets: 3, reps: 10, restTime: 75 },
    { id: 'd', name: 'D', sets: 3, reps: 12, restTime: 60 },
    { id: 'e', name: 'E', sets: 2, reps: 15, restTime: 45 },
  ],
}

assert.equal(recommendSessionAdjustmentMode('ready', 'full'), 'full')
assert.equal(recommendSessionAdjustmentMode('ready', '30'), 'short')
assert.equal(recommendSessionAdjustmentMode('okay', '20'), 'technique')
assert.equal(recommendSessionAdjustmentMode('low', 'full'), 'recovery')

assert.equal(normalizeSessionAdjustmentMode('short'), 'short')
assert.equal(normalizeSessionAdjustmentMode('bogus'), null)

const unchanged = adjustSessionForReadiness({ session: baseSession, mode: null, sport: 'wrestling' })
assert.equal(unchanged, baseSession)

const shortSession = adjustSessionForReadiness({ session: baseSession, mode: 'short', sport: 'wrestling' })
assert.ok(shortSession)
assert.equal(shortSession?.focus, 'Upper Body • Short')
assert.equal(shortSession?.exercises.length, 4)
assert.ok((shortSession?.duration ?? 0) < baseSession.duration)

const recoverySession = adjustSessionForReadiness({ session: baseSession, mode: 'recovery', sport: 'wrestling' })
assert.ok(recoverySession)
assert.equal(recoverySession?.focus, 'Recovery + Movement')
assert.equal(recoverySession?.exercises.length, 3)
assert.equal(recoverySession?.duration, estimateDurationMinutes(recoverySession?.exercises ?? []))

const techniqueSession = adjustSessionForReadiness({ session: baseSession, mode: 'technique', sport: 'bjj' })
assert.ok(techniqueSession)
assert.equal(techniqueSession?.focus, 'BJJ Technique')
assert.match(techniqueSession?.exercises[0].name ?? '', /Hip Escape|Stand-Up|Guard/i)

console.log('Session adjustment tests passed.')