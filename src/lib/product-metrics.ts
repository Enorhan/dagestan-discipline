import type { AnalyticsEntry, AnalyticsEvent } from '@/lib/analytics'

const DAY_MS = 24 * 60 * 60 * 1000

export interface ProductMetricsSummary {
  bufferedEvents: number
  lastEventAt: string | null
  activeDaysLast7: number
  activeDaysLast28: number
  workoutStarts: number
  workoutCompletions: number
  workoutCompletionRate: number | null
  checkoutStarts: number
  checkoutCompleted: number
  checkoutCanceled: number
  checkoutFailures: number
  checkoutConversionRate: number | null
  portalOpens: number
  portalFailures: number
  refreshFailures: number
  socialUploadIntents: number
  socialReelStarts: number
  socialReelCompletions: number
  socialReelCompletionRate: number | null
  socialNegativeFeedback: number
}

function countEvents(entries: AnalyticsEntry[], event: AnalyticsEvent) {
  return entries.filter((entry) => entry.event === event).length
}

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100)
}

function countActiveDays(entries: AnalyticsEntry[], now: number, days: number) {
  const threshold = now - days * DAY_MS

  return new Set(
    entries
      .filter((entry) => Date.parse(entry.ts) >= threshold)
      .map((entry) => entry.ts.slice(0, 10))
  ).size
}

function getLastEventAt(entries: AnalyticsEntry[]) {
  let lastEventAt: string | null = null
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const entry of entries) {
    const timestamp = Date.parse(entry.ts)
    if (Number.isNaN(timestamp) || timestamp < latestTimestamp) continue
    latestTimestamp = timestamp
    lastEventAt = entry.ts
  }

  return lastEventAt
}

export function buildProductMetricsSummary(entries: AnalyticsEntry[], now = Date.now()): ProductMetricsSummary {
  const workoutStarts = countEvents(entries, 'workout_started')
  const workoutCompletions = countEvents(entries, 'session_completed')
  const checkoutStarts = countEvents(entries, 'subscription_checkout_started')
  const checkoutCompleted = countEvents(entries, 'subscription_checkout_completed')
  const checkoutCanceled = countEvents(entries, 'subscription_checkout_canceled')
  const checkoutFailures = countEvents(entries, 'subscription_checkout_failed')
  const portalOpens = countEvents(entries, 'subscription_portal_opened')
  const portalFailures = countEvents(entries, 'subscription_portal_failed')
  const refreshFailures = countEvents(entries, 'subscription_status_refresh_failed')
  const socialUploadIntents = countEvents(entries, 'social_video_upload_intent_created')
  const socialReelStarts = countEvents(entries, 'social_reel_watch_started')
  const socialReelCompletions = countEvents(entries, 'social_reel_watch_completed')
  const socialNegativeFeedback = countEvents(entries, 'social_negative_feedback')

  return {
    bufferedEvents: entries.length,
    lastEventAt: getLastEventAt(entries),
    activeDaysLast7: countActiveDays(entries, now, 7),
    activeDaysLast28: countActiveDays(entries, now, 28),
    workoutStarts,
    workoutCompletions,
    workoutCompletionRate: toRate(workoutCompletions, workoutStarts),
    checkoutStarts,
    checkoutCompleted,
    checkoutCanceled,
    checkoutFailures,
    checkoutConversionRate: toRate(checkoutCompleted, checkoutStarts),
    portalOpens,
    portalFailures,
    refreshFailures,
    socialUploadIntents,
    socialReelStarts,
    socialReelCompletions,
    socialReelCompletionRate: toRate(socialReelCompletions, socialReelStarts),
    socialNegativeFeedback,
  }
}
