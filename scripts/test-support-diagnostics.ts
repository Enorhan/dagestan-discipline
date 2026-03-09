import assert from 'node:assert/strict'
import { resolveRuntimeFlags } from '@/lib/runtime-flags'
import { buildSupportDiagnosticsSnapshot } from '@/lib/support-diagnostics'

const snapshot = buildSupportDiagnosticsSnapshot({
  environment: 'production',
  releaseVersion: '2026.03.08',
  isOnline: false,
  wasOffline: true,
  runtimeFlags: resolveRuntimeFlags({
    billingCheckoutEnabled: true,
    billingPortalEnabled: false,
    premiumUpsellEnabled: false,
    billingCheckoutDisabledMessage: 'Checkout paused for maintenance.',
    billingPortalDisabledMessage: 'Portal temporarily unavailable.',
  }),
  remoteRuntimeFlagsConfigured: true,
  runtimeFlagsLoading: false,
  analyticsBufferCount: 7,
  errorReportCount: 2,
  isPremium: true,
  subscriptionStatus: 'canceling',
  subscriptionPeriodEnd: '2026-04-01T00:00:00.000Z',
  origin: 'https://app.example.com',
  userAgent: 'TestAgent/1.0',
  generatedAt: '2026-03-08T12:00:00.000Z',
})

assert.match(snapshot, /^Dagestani Disciple diagnostics/m)
assert.match(snapshot, /^Generated at: 2026-03-08T12:00:00.000Z$/m)
assert.match(snapshot, /^Release: 2026.03.08$/m)
assert.match(snapshot, /^Connection: offline$/m)
assert.match(snapshot, /^Recently offline: yes$/m)
assert.match(snapshot, /^Runtime config source: remote flags configured$/m)
assert.match(snapshot, /^Runtime flag premium upsell enabled: no$/m)
assert.match(snapshot, /^Premium access: enabled$/m)
assert.match(snapshot, /^Subscription status: canceling$/m)
assert.match(snapshot, /^Billing checkout available: no$/m)
assert.match(snapshot, /^Billing checkout message: Checkout paused for maintenance\.$/m)
assert.match(snapshot, /^Billing portal available: no$/m)
assert.match(snapshot, /^Billing portal message: Portal temporarily unavailable\.$/m)
assert.match(snapshot, /^Buffered analytics entries: 7$/m)
assert.match(snapshot, /^Buffered error reports: 2$/m)
assert.match(snapshot, /^Origin: https:\/\/app\.example\.com$/m)
assert.match(snapshot, /^User agent: TestAgent\/1\.0$/m)

console.log('Support diagnostics tests passed.')