// Sentry wiring for the MatFlow client (web + Capacitor iOS).
//
// We initialize lazily so SSR/build never imports the SDK, and we hard-gate
// on the user's analytics-consent flag.  Callers can still send breadcrumbs
// and exceptions through the wrappers below — they no-op when Sentry is off.

import type * as SentryReactType from '@sentry/react'

import { getAnalyticsConsent, subscribeAnalyticsConsent } from './analytics-consent'

type SentryReactModule = typeof SentryReactType

let sentryModule: SentryReactModule | null = null
let initPromise: Promise<SentryReactModule | null> | null = null
let initialized = false

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function resolveDsn(): string | null {
  return trimEnv(process.env.NEXT_PUBLIC_SENTRY_DSN)
}

function resolveEnvironment(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT)
    ?? trimEnv(process.env.NODE_ENV)
    ?? 'production'
}

function resolveRelease(): string | null {
  return trimEnv(process.env.NEXT_PUBLIC_RELEASE_VERSION)
}

async function loadSentry(): Promise<SentryReactModule | null> {
  if (sentryModule) return sentryModule
  if (typeof window === 'undefined') return null

  const dsn = resolveDsn()
  if (!dsn) return null

  if (!getAnalyticsConsent()) return null

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const [{ init: capInit }, sentryReact] = await Promise.all([
          import('@sentry/capacitor'),
          import('@sentry/react'),
        ])

        capInit(
          {
            dsn,
            environment: resolveEnvironment(),
            release: resolveRelease() ?? undefined,
            tracesSampleRate: 0,
            sendDefaultPii: false,
            attachStacktrace: true,
          },
          sentryReact.init,
        )

        sentryModule = sentryReact
        initialized = true
        return sentryReact
      } catch {
        return null
      }
    })()
  }

  return initPromise
}

export function initSentry(): void {
  void loadSentry()
}

export function isSentryReady(): boolean {
  return initialized && sentryModule !== null
}

export async function captureSentryException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const sentry = await loadSentry()
  if (!sentry) return
  try {
    sentry.captureException(error, { extra: context })
  } catch {
    // Never let Sentry failures break the app.
  }
}

export async function addSentryBreadcrumb(breadcrumb: {
  category: string
  message: string
  level?: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}): Promise<void> {
  const sentry = await loadSentry()
  if (!sentry) return
  try {
    sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ?? 'info',
      data: breadcrumb.data,
    })
  } catch {
    // ignore
  }
}

export async function setSentryUser(user: { id: string; email?: string | null } | null): Promise<void> {
  const sentry = await loadSentry()
  if (!sentry) return
  try {
    if (user) {
      sentry.setUser({ id: user.id, email: user.email ?? undefined })
    } else {
      sentry.setUser(null)
    }
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  subscribeAnalyticsConsent((consented) => {
    if (!consented && sentryModule) {
      try {
        sentryModule.getClient()?.close(0)
      } catch {
        // ignore
      }
      sentryModule = null
      initPromise = null
      initialized = false
    }
    if (consented && resolveDsn() && !initialized) {
      void loadSentry()
    }
  })
}

