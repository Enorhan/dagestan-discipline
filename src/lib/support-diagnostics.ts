import {
  getBillingCheckoutAvailability,
  getBillingPortalAvailability,
  type RuntimeFlags,
} from '@/lib/runtime-flags'

export interface SupportDiagnosticsSnapshotInput {
  environment: string
  releaseVersion: string | null
  isOnline: boolean
  wasOffline: boolean
  runtimeFlags: RuntimeFlags
  remoteRuntimeFlagsConfigured: boolean
  runtimeFlagsLoading: boolean
  analyticsBufferCount: number
  errorReportCount: number
  isPremium: boolean
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
  origin?: string | null
  userAgent?: string | null
  generatedAt?: string
}

function formatNullable(value: string | null | undefined, fallback = 'not-set') {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export function buildSupportDiagnosticsSnapshot(input: SupportDiagnosticsSnapshotInput): string {
  const checkoutAvailability = getBillingCheckoutAvailability(input.runtimeFlags)
  const portalAvailability = getBillingPortalAvailability(input.runtimeFlags)

  return [
    'MatFlow diagnostics',
    `Generated at: ${input.generatedAt ?? new Date().toISOString()}`,
    `Environment: ${formatNullable(input.environment, 'unknown')}`,
    `Release: ${formatNullable(input.releaseVersion)}`,
    `Connection: ${input.isOnline ? 'online' : 'offline'}`,
    `Recently offline: ${input.wasOffline ? 'yes' : 'no'}`,
    `Runtime config source: ${input.remoteRuntimeFlagsConfigured ? 'remote flags configured' : 'bundled defaults only'}`,
    `Runtime config loading: ${input.runtimeFlagsLoading ? 'yes' : 'no'}`,
    `Runtime flag checkout enabled: ${input.runtimeFlags.billingCheckoutEnabled ? 'yes' : 'no'}`,
    `Runtime flag portal enabled: ${input.runtimeFlags.billingPortalEnabled ? 'yes' : 'no'}`,
    `Runtime flag premium upsell enabled: ${input.runtimeFlags.premiumUpsellEnabled ? 'yes' : 'no'}`,
    `Premium access: ${input.isPremium ? 'enabled' : 'not enabled'}`,
    `Subscription status: ${formatNullable(input.subscriptionStatus, 'unknown')}`,
    `Subscription period end: ${formatNullable(input.subscriptionPeriodEnd)}`,
    `Billing checkout available: ${checkoutAvailability.enabled ? 'yes' : 'no'}`,
    !checkoutAvailability.enabled && checkoutAvailability.message
      ? `Billing checkout message: ${checkoutAvailability.message}`
      : null,
    `Billing portal available: ${portalAvailability.enabled ? 'yes' : 'no'}`,
    !portalAvailability.enabled && portalAvailability.message
      ? `Billing portal message: ${portalAvailability.message}`
      : null,
    `Buffered analytics entries: ${Math.max(0, input.analyticsBufferCount)}`,
    `Buffered error reports: ${Math.max(0, input.errorReportCount)}`,
    `Origin: ${formatNullable(input.origin)}`,
    `User agent: ${formatNullable(input.userAgent)}`,
  ].filter(Boolean).join('\n')
}