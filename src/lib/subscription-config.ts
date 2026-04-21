const DEFAULT_FALLBACK_CHECKOUT_REDIRECT_URL = 'https://enorhan.github.io/dagestan-discipline/redirect.html'

export const SUBSCRIPTION_REQUIRED_AFTER_DAYS = 7
export const SUBSCRIPTION_REQUIRED_AFTER_MS = SUBSCRIPTION_REQUIRED_AFTER_DAYS * 24 * 60 * 60 * 1000
export const PREMIUM_SUBSCRIPTION_PRICE_LABEL = '25 SEK/month'

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getConfiguredCheckoutRedirectUrl(): string | null {
  const explicitRedirectUrl = trimEnv(process.env.NEXT_PUBLIC_CHECKOUT_REDIRECT_URL)
  if (explicitRedirectUrl) return explicitRedirectUrl

  const appUrl = trimEnv(process.env.NEXT_PUBLIC_APP_URL)
  if (appUrl) {
    return new URL('redirect.html', appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString()
  }

  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return new URL('redirect.html', window.location.href).toString()
  }

  return null
}

export function getCheckoutRedirectPageUrl(): string {
  return getConfiguredCheckoutRedirectUrl() ?? DEFAULT_FALLBACK_CHECKOUT_REDIRECT_URL
}

export function buildCheckoutRedirectUrl(params: Record<string, string | null | undefined>): string {
  const url = new URL(getCheckoutRedirectPageUrl())

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value.length > 0) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}
