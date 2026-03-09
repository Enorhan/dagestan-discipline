import type { Screen } from './types'

export interface SessionRuntimeSnapshot {
  screen: Screen
  sessionStartTime: number | null
  pausedTime: number
  sessionPaused: boolean
  pauseStartedAt: number | null
  restTimerEndsAt: number | null
  restTimerDuration: number
}

export interface SessionRuntimeNormalizationResult extends SessionRuntimeSnapshot {
  reason?: string
}

const ACTIVE_SESSION_SCREENS = new Set<Screen>(['workout-session', 'rest-timer'])

const normalizeTimestamp = (value: number | null | undefined): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
)

const normalizeDuration = (value: number | null | undefined): number => (
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
)

export function normalizeSessionRuntimeState(
  snapshot: SessionRuntimeSnapshot,
  now: number = Date.now(),
): SessionRuntimeNormalizationResult {
  let screen = snapshot.screen
  let sessionStartTime = normalizeTimestamp(snapshot.sessionStartTime)
  let pausedTime = normalizeDuration(snapshot.pausedTime)
  let sessionPaused = snapshot.sessionPaused === true
  let pauseStartedAt = normalizeTimestamp(snapshot.pauseStartedAt)
  let restTimerEndsAt = normalizeTimestamp(snapshot.restTimerEndsAt)
  let restTimerDuration = normalizeDuration(snapshot.restTimerDuration)
  let reason: string | undefined

  if (!sessionStartTime) {
    pausedTime = 0
    sessionPaused = false
    pauseStartedAt = null
    restTimerEndsAt = null
    restTimerDuration = 0
    if (ACTIVE_SESSION_SCREENS.has(screen)) {
      screen = 'home'
      reason = 'missing-session-start'
    } else if (snapshot.pausedTime > 0 || snapshot.sessionPaused || snapshot.restTimerEndsAt || snapshot.restTimerDuration > 0) {
      reason = 'cleared-orphaned-session-runtime'
    }

    return {
      screen,
      sessionStartTime,
      pausedTime,
      sessionPaused,
      pauseStartedAt,
      restTimerEndsAt,
      restTimerDuration,
      reason,
    }
  }

  if (sessionPaused) {
    if (!pauseStartedAt) {
      pauseStartedAt = now
      reason = 'restored-missing-pause-start'
    }
  } else if (pauseStartedAt) {
    pauseStartedAt = null
    reason = 'cleared-stale-pause-start'
  }

  const hasRestTimer = restTimerEndsAt !== null && restTimerDuration > 0
  if (!hasRestTimer) {
    restTimerEndsAt = null
    restTimerDuration = 0
    if (screen === 'rest-timer') {
      screen = 'workout-session'
      reason = reason ?? 'missing-rest-timer'
    }
  } else if (!sessionPaused && restTimerEndsAt !== null && restTimerEndsAt <= now) {
    restTimerEndsAt = null
    restTimerDuration = 0
    if (screen === 'rest-timer') {
      screen = 'workout-session'
    }
    reason = reason ?? 'expired-rest-timer'
  }

  return {
    screen,
    sessionStartTime,
    pausedTime,
    sessionPaused,
    pauseStartedAt,
    restTimerEndsAt,
    restTimerDuration,
    reason,
  }
}