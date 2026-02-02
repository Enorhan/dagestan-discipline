type AnalyticsEvent =
  | 'workout_started'
  | 'set_confirmed'
  | 'session_paused'
  | 'session_resumed'
  | 'rest_adjusted'
  | 'rest_skipped'
  | 'session_completed'
  | 'session_ended'
  | 'exercise_jumped'
  | 'exercise_skipped'
  | 'activity_logged'
  | 'activity_updated'
  | 'activity_deleted'

interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined
}

const STORAGE_KEY = 'dagestaniDiscipline.analytics'

export const analytics = {
  track: (event: AnalyticsEvent, payload: AnalyticsPayload = {}) => {
    const entry = {
      event,
      payload,
      ts: new Date().toISOString()
    }

    try {
      if (typeof window !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        existing.push(entry)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-200)))
      }
    } catch (error) {
      console.debug('Analytics storage unavailable:', error)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics]', entry)
    }
  }
}
