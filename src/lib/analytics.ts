import { track as trackVercelEvent } from '@vercel/analytics'

type AnalyticsPropertyValue = string | number | boolean | null

export type AnalyticsEvent =
  | 'app_opened'
  | 'app_error_captured'
  | 'subscription_checkout_started'
  | 'subscription_checkout_returned'
  | 'subscription_checkout_completed'
  | 'subscription_checkout_canceled'
  | 'subscription_checkout_failed'
  | 'subscription_portal_opened'
  | 'subscription_portal_returned'
  | 'subscription_portal_failed'
  | 'subscription_status_refresh_failed'
  | 'workout_started'
  | 'session_adjustment_selected'
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
  | 'navigation_blocked'
  | 'analytics_preview_opened'
  | 'premium_upsell_viewed'
  | 'premium_upsell_clicked'
  | 'support_contact_opened'
  | 'billing_help_opened'
  | 'legal_document_opened'
  | 'account_deletion_requested'
  | 'social_feed_impression'
  | 'social_post_created'
  | 'social_post_liked'
  | 'social_post_saved'
  | 'social_comment_created'
  | 'social_story_created'
  | 'social_follow_request_sent'
  | 'social_followed'
  | 'social_follow_request_responded'
  | 'social_video_upload_intent_created'
  | 'social_reel_watch_started'
  | 'social_reel_watch_progress'
  | 'social_reel_watch_completed'
  | 'social_reel_impression'
  | 'social_reel_view_2s'
  | 'social_reel_quartile'
  | 'social_reel_skipped'
  | 'social_reel_replayed'
  | 'social_negative_feedback'

export interface AnalyticsPayload {
  [key: string]: AnalyticsPropertyValue | undefined
}

export interface AnalyticsEntry {
  event: AnalyticsEvent
  payload: Record<string, AnalyticsPropertyValue>
  ts: string
}

const STORAGE_KEY = 'dagestaniDiscipline.analytics'
const MAX_BUFFERED_ENTRIES = 200

function readBufferedAnalyticsEntries(): AnalyticsEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored as AnalyticsEntry[] : []
  } catch (error) {
    console.debug('Analytics storage unavailable:', error)
    return []
  }
}

function sanitizePayload(payload: AnalyticsPayload): Record<string, AnalyticsPropertyValue> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Record<string, AnalyticsPropertyValue>
}

export function getBufferedAnalyticsEntries() {
  return readBufferedAnalyticsEntries()
}

export const analytics = {
  track: (event: AnalyticsEvent, payload: AnalyticsPayload = {}) => {
    const sanitizedPayload = sanitizePayload(payload)
    const entry: AnalyticsEntry = {
      event,
      payload: sanitizedPayload,
      ts: new Date().toISOString()
    }

    try {
      if (typeof window !== 'undefined') {
        const existing = readBufferedAnalyticsEntries()
        existing.push(entry)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-MAX_BUFFERED_ENTRIES)))
        trackVercelEvent(event, sanitizedPayload)
      }
    } catch (error) {
      console.debug('Analytics tracking unavailable:', error)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics]', entry)
    }
  }
}
