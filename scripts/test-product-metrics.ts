import assert from 'node:assert/strict'
import type { AnalyticsEntry } from '@/lib/analytics'
import { buildProductMetricsSummary } from '@/lib/product-metrics'

const entries: AnalyticsEntry[] = [
  { event: 'app_opened', payload: {}, ts: '2026-02-20T10:00:00.000Z' },
  { event: 'subscription_status_refresh_failed', payload: { flow: 'portal' }, ts: '2026-03-04T09:00:00.000Z' },
  { event: 'subscription_checkout_started', payload: { source: 'settings' }, ts: '2026-03-05T09:00:00.000Z' },
  { event: 'subscription_checkout_completed', payload: { source: 'settings' }, ts: '2026-03-05T09:03:00.000Z' },
  { event: 'workout_started', payload: {}, ts: '2026-03-06T10:00:00.000Z' },
  { event: 'session_completed', payload: {}, ts: '2026-03-06T10:45:00.000Z' },
  { event: 'app_opened', payload: {}, ts: '2026-03-07T10:00:00.000Z' },
  { event: 'onboarding_started', payload: { source: 'schedule' }, ts: '2026-03-07T10:01:00.000Z' },
  { event: 'onboarding_completed', payload: { source: 'schedule' }, ts: '2026-03-07T10:05:00.000Z' },
]

const summary = buildProductMetricsSummary(entries, Date.parse('2026-03-07T12:00:00.000Z'))

assert.equal(summary.bufferedEvents, 9)
assert.equal(summary.activeDaysLast7, 4)
assert.equal(summary.activeDaysLast28, 5)
assert.equal(summary.onboardingCompletionRate, 100)
assert.equal(summary.workoutCompletionRate, 100)
assert.equal(summary.checkoutConversionRate, 100)
assert.equal(summary.refreshFailures, 1)
assert.equal(summary.lastEventAt, '2026-03-07T10:05:00.000Z')

console.log('Product metrics tests passed.')