'use client'

import { useEffect, useMemo, useState } from 'react'

function extractAuthPayload(): { query: string; fragment: string } {
  if (typeof window === 'undefined') return { query: '', fragment: '' }
  const query = window.location.search || ''
  const hash = window.location.hash
  const fragment = hash.startsWith('#') ? hash.slice(1) : ''
  return { query, fragment }
}

function buildDeepLink(query: string, fragment: string): string {
  const queryParams = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
  const fragmentParams = new URLSearchParams(fragment)

  const code = queryParams.get('code')
  const error = queryParams.get('error') ?? fragmentParams.get('error')
  const errorDescription = queryParams.get('error_description') ?? fragmentParams.get('error_description')
  const type = queryParams.get('type') ?? fragmentParams.get('type')

  // Prefer short PKCE callback payloads (code + type + optional error fields).
  // This avoids opening very long custom-scheme URLs that Safari may reject.
  const outbound = new URLSearchParams()
  if (code) outbound.set('code', code)
  if (type) outbound.set('type', type)
  if (error) outbound.set('error', error)
  if (errorDescription) outbound.set('error_description', errorDescription)

  if (outbound.toString()) {
    return `dagestanidiscipline://auth/callback?${outbound.toString()}`
  }

  // Fallback for legacy token flows.
  const queryPart = query && query !== '?' ? query : ''
  const fragmentPart = fragment ? `#${fragment}` : ''
  return `dagestanidiscipline://auth/callback${queryPart}${fragmentPart}`
}

function shouldAutoOpenDeepLink(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent || ''
  const isIos = /iPhone|iPad|iPod/i.test(userAgent)
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)

  // iOS Safari frequently blocks auto custom-scheme navigation and shows
  // "address is invalid". Require explicit user gesture there.
  return !(isIos && isSafari)
}

export default function OAuthCallbackPage() {
  const [payload, setPayload] = useState<{ query: string; fragment: string }>({ query: '', fragment: '' })

  useEffect(() => {
    // Read window.location post-mount to avoid SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(extractAuthPayload())
  }, [])

  const hasPayload = Boolean(payload.query || payload.fragment)
  const deepLink = useMemo(() => (hasPayload ? buildDeepLink(payload.query, payload.fragment) : ''), [hasPayload, payload.fragment, payload.query])

  useEffect(() => {
    if (!deepLink) return
    if (!shouldAutoOpenDeepLink()) return

    window.location.assign(deepLink)
  }, [deepLink])

  return (
    <main className="min-h-dvh bg-[#0a0a0a] px-6 pb-10 pt-14 text-white">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-black tracking-tight">Return to Dagestani Disciple</h1>
        <p className="mt-3 text-sm font-medium text-white/65">
          Tap the button below to finish sign-in and return to the app.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Status</div>
          <div className="mt-2 text-sm font-semibold text-white/80">
            {hasPayload ? 'Session received. Opening app…' : 'Waiting for session…'}
          </div>
        </div>

        <a
          href={deepLink || 'dagestanidiscipline://auth/callback'}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-base font-black text-black"
        >
          Open app
        </a>

        <p className="mt-4 text-xs font-medium text-white/45">
          You can close this page after you&apos;re back in the app.
        </p>
      </div>
    </main>
  )
}

