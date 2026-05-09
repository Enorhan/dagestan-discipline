'use client'

import { useEffect } from 'react'

import { Capacitor } from '@capacitor/core'

export function StatusBarBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== 'ios') return

    let cancelled = false
    void (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (cancelled) return
        // Light content (white icons/text) over the dark MatFlow backdrop.
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      } catch {
        // StatusBar is best-effort; never block the app.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

export default StatusBarBootstrap

