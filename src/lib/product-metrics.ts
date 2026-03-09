import type { AnalyticsEntry, AnalyticsEvent } from '@/lib/analytics'

const DAY_MS = 24 * 60 * 60 * 1000

export interface ProductMetricsSummary {
  bufferedEvents: number
  lastEventAt: string | null
  activeDaysLast7: number
  activeDaysLast28: number
  onboardingStarts: number
  onboardingCompletions: number
  onboardingFailures: number
  onboardingCompletionRate: number | null
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
  const onboardingStarts = countEvents(entries, 'onboarding_started')
  const onboardingCompletions = countEvents(entries, 'onboarding_completed')
  const onboardingFailures = countEvents(entries, 'onboarding_generation_failed')
  const workoutStarts = countEvents(entries, 'workout_started')
  const workoutCompletions = countEvents(entries, 'session_completed')
  const checkoutStarts = countEvents(entries, 'subscription_checkout_started')
  const checkoutCompleted = countEvents(entries, 'subscription_checkout_completed')
  const checkoutCanceled = countEvents(entries, 'subscription_checkout_canceled')
  const checkoutFailures = countEvents(entries, 'subscription_checkout_failed')
  const portalOpens = countEvents(entries, 'subscription_portal_opened')
  const portalFailures = countEvents(entries, 'subscription_portal_failed')
  const refreshFailures = countEvents(entries, 'subscription_status_refresh_failed')

  return {
    bufferedEvents: entries.length,
    lastEventAt: getLastEventAt(entries),
    activeDaysLast7: countActiveDays(entries, now, 7),
    activeDaysLast28: countActiveDays(entries, now, 28),
    onboardingStarts,
    onboardingCompletions,
    onboardingFailures,
    onboardingCompletionRate: toRate(onboardingCompletions, onboardingStarts),
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
  }
}