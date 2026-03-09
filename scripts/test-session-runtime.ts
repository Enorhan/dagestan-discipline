import assert from 'node:assert/strict'
import {
  normalizeSessionRuntimeState,
  type SessionRuntimeSnapshot,
} from '../src/lib/session-runtime'

type SessionRuntimeTestCase = {
  name: string
  now: number
  state: SessionRuntimeSnapshot
  expected: Partial<ReturnType<typeof normalizeSessionRuntimeState>>
}

const cases: SessionRuntimeTestCase[] = [
  {
    name: 'Expired rest timer returns the user to workout-session',
    now: 20_000,
    state: {
      screen: 'rest-timer',
      sessionStartTime: 1_000,
      pausedTime: 0,
      sessionPaused: false,
      pauseStartedAt: null,
      restTimerEndsAt: 19_000,
      restTimerDuration: 60,
    },
    expected: {
      screen: 'workout-session',
      restTimerEndsAt: null,
      restTimerDuration: 0,
      reason: 'expired-rest-timer',
    },
  },
  {
    name: 'Paused sessions backfill a missing pause timestamp without expiring rest',
    now: 20_000,
    state: {
      screen: 'rest-timer',
      sessionStartTime: 1_000,
      pausedTime: 4_000,
      sessionPaused: true,
      pauseStartedAt: null,
      restTimerEndsAt: 10_000,
      restTimerDuration: 45,
    },
    expected: {
      screen: 'rest-timer',
      pauseStartedAt: 20_000,
      restTimerEndsAt: 10_000,
      restTimerDuration: 45,
      reason: 'restored-missing-pause-start',
    },
  },
  {
    name: 'Broken rest-timer screen without a timer falls back to workout-session',
    now: 20_000,
    state: {
      screen: 'rest-timer',
      sessionStartTime: 1_000,
      pausedTime: 0,
      sessionPaused: false,
      pauseStartedAt: null,
      restTimerEndsAt: null,
      restTimerDuration: 0,
    },
    expected: {
      screen: 'workout-session',
      reason: 'missing-rest-timer',
    },
  },
  {
    name: 'Workout-session screen without an active session returns home and clears timing state',
    now: 20_000,
    state: {
      screen: 'workout-session',
      sessionStartTime: null,
      pausedTime: 2_000,
      sessionPaused: true,
      pauseStartedAt: 15_000,
      restTimerEndsAt: 25_000,
      restTimerDuration: 30,
    },
    expected: {
      screen: 'home',
      pausedTime: 0,
      sessionPaused: false,
      pauseStartedAt: null,
      restTimerEndsAt: null,
      restTimerDuration: 0,
      reason: 'missing-session-start',
    },
  },
  {
    name: 'Unpaused sessions clear stale pause timestamps',
    now: 20_000,
    state: {
      screen: 'home',
      sessionStartTime: 1_000,
      pausedTime: 500,
      sessionPaused: false,
      pauseStartedAt: 15_000,
      restTimerEndsAt: null,
      restTimerDuration: 0,
    },
    expected: {
      screen: 'home',
      pauseStartedAt: null,
      reason: 'cleared-stale-pause-start',
    },
  },
]

for (const testCase of cases) {
  const result = normalizeSessionRuntimeState(testCase.state, testCase.now)

  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    assert.deepEqual(
      result[key as keyof typeof result],
      expectedValue,
      `${testCase.name}: expected ${key}=${String(expectedValue)} but got ${String(result[key as keyof typeof result])}`
    )
  }
}

console.log('Session runtime normalization tests passed.')