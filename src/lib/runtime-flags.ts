export interface RuntimeFlags {
  billingCheckoutEnabled: boolean
  billingPortalEnabled: boolean
  premiumUpsellEnabled: boolean
  billingCheckoutDisabledMessage: string
  billingPortalDisabledMessage: string
}

const STORAGE_KEY = 'dagestaniDiscipline.runtimeFlags'
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