import type { UserProfile } from '@/lib/user-profile-types'

export const MATFLOW_TRIAL_DAYS = 14
export const MATFLOW_TRIAL_MS = MATFLOW_TRIAL_DAYS * 24 * 60 * 60 * 1000
export const MATFLOW_PRICE_LABEL = '25 kr/month'
export const MATFLOW_IOS_MONTHLY_PRODUCT_ID = process.env.NEXT_PUBLIC_APPLE_IAP_MONTHLY_PRODUCT_ID ?? 'matflow.monthly'

export type MatFlowAccessState = {
  hasPaidAccess: boolean
  hasAccess: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialExpired: boolean
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function hasPaidMatFlowAccess(profile: Partial<Pick<UserProfile, 'isPremium' | 'subscriptionStatus' | 'subscriptionPeriodEnd'>> | null | undefined, now = new Date()): boolean {
  if (!profile) return false
  if (profile.isPremium) return true
  if (profile.subscriptionStatus === 'active' || profile.subscriptionStatus === 'trialing') return true
  const periodEnd = parseTime(profile.subscriptionPeriodEnd)
  return periodEnd != null && periodEnd > now.getTime()
}

export function getMatFlowAccessState(profile: Partial<Pick<UserProfile, 'createdAt' | 'firstActiveAt' | 'matflowTrialStartedAt' | 'isPremium' | 'subscriptionStatus' | 'subscriptionPeriodEnd'>> | null | undefined, now = new Date()): MatFlowAccessState {
  const hasPaidAccess = hasPaidMatFlowAccess(profile, now)
  const startedAtMs = parseTime(profile?.matflowTrialStartedAt) ?? parseTime(profile?.firstActiveAt) ?? parseTime(profile?.createdAt)
  const trialEndsAtMs = startedAtMs == null ? null : startedAtMs + MATFLOW_TRIAL_MS
  const remainingMs = trialEndsAtMs == null ? 0 : Math.max(0, trialEndsAtMs - now.getTime())
  const trialExpired = !hasPaidAccess && trialEndsAtMs != null && trialEndsAtMs <= now.getTime()
  return {
    hasPaidAccess,
    hasAccess: hasPaidAccess || !trialExpired,
    trialStartedAt: startedAtMs == null ? null : new Date(startedAtMs).toISOString(),
    trialEndsAt: trialEndsAtMs == null ? null : new Date(trialEndsAtMs).toISOString(),
    trialDaysRemaining: trialEndsAtMs == null ? MATFLOW_TRIAL_DAYS : Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
    trialExpired,
  }
}
