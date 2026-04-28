export interface RuntimeFlags {
  billingCheckoutEnabled: boolean
  billingPortalEnabled: boolean
  premiumUpsellEnabled: boolean
  socialFeedEnabled: boolean
  socialStoriesEnabled: boolean
  socialReelsEnabled: boolean
  socialExploreEnabled: boolean
  socialCreatorDraftsEnabled: boolean
  socialSchedulingEnabled: boolean
  socialModerationEnabled: boolean
  socialVideoUploadsEnabled: boolean
  socialFeedRankingV2Enabled: boolean
  socialTrustSafetyStrictModeEnabled: boolean
  socialExpandedNotificationsEnabled: boolean
  billingCheckoutDisabledMessage: string
  billingPortalDisabledMessage: string
}

// Bump when cached shape/semantics change so stale values (e.g. socialFeedEnabled stuck false) are not reused.
const STORAGE_KEY = 'matflow.runtimeFlags.v2'
const DEFAULT_BILLING_CHECKOUT_DISABLED_MESSAGE = 'Premium upgrades are temporarily unavailable right now. Use Billing Help in Settings if you need purchase or access support.'
const DEFAULT_BILLING_PORTAL_DISABLED_MESSAGE = 'Subscription management is temporarily unavailable right now. Use Billing Help in Settings for cancellation or billing help.'

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

function sanitizeMessage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, 240)
    : fallback
}

export const DEFAULT_RUNTIME_FLAGS: RuntimeFlags = {
  billingCheckoutEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_BILLING_CHECKOUT_ENABLED, true),
  billingPortalEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_BILLING_PORTAL_ENABLED, true),
  premiumUpsellEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_PREMIUM_UPSELL_ENABLED, true),
  socialFeedEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_FEED_ENABLED, false),
  socialStoriesEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_STORIES_ENABLED, false),
  socialReelsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_REELS_ENABLED, false),
  socialExploreEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_EXPLORE_ENABLED, false),
  socialCreatorDraftsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_CREATOR_DRAFTS_ENABLED, false),
  socialSchedulingEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_SCHEDULING_ENABLED, false),
  socialModerationEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_MODERATION_ENABLED, false),
  socialVideoUploadsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_VIDEO_UPLOADS_ENABLED, false),
  socialFeedRankingV2Enabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_FEED_RANKING_V2_ENABLED, false),
  socialTrustSafetyStrictModeEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_TRUST_SAFETY_STRICT_MODE_ENABLED, false),
  socialExpandedNotificationsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_SOCIAL_EXPANDED_NOTIFICATIONS_ENABLED, false),
  billingCheckoutDisabledMessage: trimEnv(process.env.NEXT_PUBLIC_BILLING_CHECKOUT_DISABLED_MESSAGE) ?? DEFAULT_BILLING_CHECKOUT_DISABLED_MESSAGE,
  billingPortalDisabledMessage: trimEnv(process.env.NEXT_PUBLIC_BILLING_PORTAL_DISABLED_MESSAGE) ?? DEFAULT_BILLING_PORTAL_DISABLED_MESSAGE,
}

export function resolveRuntimeFlags(input: unknown): RuntimeFlags {
  const candidate = typeof input === 'object' && input !== null
    ? input as Record<string, unknown>
    : {}

  return {
    billingCheckoutEnabled: parseBooleanFlag(candidate.billingCheckoutEnabled, DEFAULT_RUNTIME_FLAGS.billingCheckoutEnabled),
    billingPortalEnabled: parseBooleanFlag(candidate.billingPortalEnabled, DEFAULT_RUNTIME_FLAGS.billingPortalEnabled),
    premiumUpsellEnabled: parseBooleanFlag(candidate.premiumUpsellEnabled, DEFAULT_RUNTIME_FLAGS.premiumUpsellEnabled),
    socialFeedEnabled: parseBooleanFlag(candidate.socialFeedEnabled, DEFAULT_RUNTIME_FLAGS.socialFeedEnabled),
    socialStoriesEnabled: parseBooleanFlag(candidate.socialStoriesEnabled, DEFAULT_RUNTIME_FLAGS.socialStoriesEnabled),
    socialReelsEnabled: parseBooleanFlag(candidate.socialReelsEnabled, DEFAULT_RUNTIME_FLAGS.socialReelsEnabled),
    socialExploreEnabled: parseBooleanFlag(candidate.socialExploreEnabled, DEFAULT_RUNTIME_FLAGS.socialExploreEnabled),
    socialCreatorDraftsEnabled: parseBooleanFlag(
      candidate.socialCreatorDraftsEnabled,
      DEFAULT_RUNTIME_FLAGS.socialCreatorDraftsEnabled,
    ),
    socialSchedulingEnabled: parseBooleanFlag(
      candidate.socialSchedulingEnabled,
      DEFAULT_RUNTIME_FLAGS.socialSchedulingEnabled,
    ),
    socialModerationEnabled: parseBooleanFlag(
      candidate.socialModerationEnabled,
      DEFAULT_RUNTIME_FLAGS.socialModerationEnabled,
    ),
    socialVideoUploadsEnabled: parseBooleanFlag(
      candidate.socialVideoUploadsEnabled,
      DEFAULT_RUNTIME_FLAGS.socialVideoUploadsEnabled,
    ),
    socialFeedRankingV2Enabled: parseBooleanFlag(
      candidate.socialFeedRankingV2Enabled,
      DEFAULT_RUNTIME_FLAGS.socialFeedRankingV2Enabled,
    ),
    socialTrustSafetyStrictModeEnabled: parseBooleanFlag(
      candidate.socialTrustSafetyStrictModeEnabled,
      DEFAULT_RUNTIME_FLAGS.socialTrustSafetyStrictModeEnabled,
    ),
    socialExpandedNotificationsEnabled: parseBooleanFlag(
      candidate.socialExpandedNotificationsEnabled,
      DEFAULT_RUNTIME_FLAGS.socialExpandedNotificationsEnabled,
    ),
    billingCheckoutDisabledMessage: sanitizeMessage(
      candidate.billingCheckoutDisabledMessage,
      DEFAULT_RUNTIME_FLAGS.billingCheckoutDisabledMessage
    ),
    billingPortalDisabledMessage: sanitizeMessage(
      candidate.billingPortalDisabledMessage,
      DEFAULT_RUNTIME_FLAGS.billingPortalDisabledMessage
    ),
  }
}

function readCachedRuntimeFlags(): RuntimeFlags | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return stored ? resolveRuntimeFlags(stored) : null
  } catch {
    return null
  }
}

function persistRuntimeFlags(flags: RuntimeFlags) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch {
    // Ignore storage failures. Runtime flags should never break the app.
  }
}

export function getRuntimeFlagsUrl(): string | null {
  return trimEnv(process.env.NEXT_PUBLIC_RUNTIME_FLAGS_URL)
}

export function hasRemoteRuntimeFlags(): boolean {
  return getRuntimeFlagsUrl() !== null
}

export function getRuntimeFlagsSnapshot(): RuntimeFlags {
  return readCachedRuntimeFlags() ?? DEFAULT_RUNTIME_FLAGS
}

export async function refreshRuntimeFlags(): Promise<RuntimeFlags> {
  const runtimeFlagsUrl = getRuntimeFlagsUrl()
  if (!runtimeFlagsUrl || typeof window === 'undefined') {
    return getRuntimeFlagsSnapshot()
  }

  const response = await fetch(runtimeFlagsUrl, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Runtime flags request failed with status ${response.status}`)
  }

  const flags = resolveRuntimeFlags(await response.json())
  persistRuntimeFlags(flags)
  return flags
}

export function getBillingCheckoutAvailability(flags: RuntimeFlags = getRuntimeFlagsSnapshot()) {
  const enabled = flags.billingCheckoutEnabled && flags.premiumUpsellEnabled

  return {
    enabled,
    message: enabled ? null : flags.billingCheckoutDisabledMessage,
  }
}

export function getBillingPortalAvailability(flags: RuntimeFlags = getRuntimeFlagsSnapshot()) {
  const enabled = flags.billingPortalEnabled

  return {
    enabled,
    message: enabled ? null : flags.billingPortalDisabledMessage,
  }
}
