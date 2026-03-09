import { Capacitor } from '@capacitor/core'

const DEFAULT_SUPPORT_EMAIL = 'support@dagestanidisciple.com'
const DEFAULT_PRIVACY_POLICY_URL = '/legal/privacy-policy.html'
const DEFAULT_TERMS_OF_SERVICE_URL = '/legal/terms-of-service.html'

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isMailtoUrl(value: string): boolean {
  return /^mailto:/i.test(value)
}

function normalizeRelativePath(value: string): string {
  return value.startsWith('/') ? value : `/${value}`
}

export const SUPPORT_EMAIL = trimEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ?? DEFAULT_SUPPORT_EMAIL
export const BILLING_SUPPORT_EMAIL = trimEnv(process.env.NEXT_PUBLIC_BILLING_SUPPORT_EMAIL) ?? SUPPORT_EMAIL
export const PRIVACY_POLICY_URL = trimEnv(process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL) ?? DEFAULT_PRIVACY_POLICY_URL
export const TERMS_OF_SERVICE_URL = trimEnv(process.env.NEXT_PUBLIC_TERMS_OF_SERVICE_URL) ?? DEFAULT_TERMS_OF_SERVICE_URL

export function buildSupportMailtoLink(email: string, subject: string, body?: string): string {
  const queryParts = [`subject=${encodeURIComponent(subject)}`]

  if (body?.trim()) {
    queryParts.push(`body=${encodeURIComponent(body.trim())}`)
  }

  return `mailto:${email}?${queryParts.join('&')}`
}

export const BILLING_SUPPORT_MAILTO = buildSupportMailtoLink(
  BILLING_SUPPORT_EMAIL,
  'Dagestani Disciple billing help'
)

export const ACCOUNT_DELETION_MAILTO = buildSupportMailtoLink(
  SUPPORT_EMAIL,
  'Dagestani Disciple account deletion request'
)

export async function openSupportLink(target: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (isMailtoUrl(target)) {
    window.location.href = target
    return
  }

  if (isHttpUrl(target)) {
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: target })
      return
    }

    const popup = window.open(target, '_blank', 'noopener,noreferrer')
    if (!popup) {
      window.location.assign(target)
    }
    return
  }

  window.location.assign(normalizeRelativePath(target))
}