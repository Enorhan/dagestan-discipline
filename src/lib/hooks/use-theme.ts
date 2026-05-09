'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import {
  type ResolvedTheme,
  type ThemePreference,
  applyTheme,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
} from '@/lib/theme'

interface UseThemeResult {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const THEME_CHANGE_EVENT = 'matflow:theme-changed'

function subscribePreference(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === 'matflow.theme') callback()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(THEME_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(THEME_CHANGE_EVENT, callback)
  }
}

function getPreferenceSnapshot(): ThemePreference {
  return readStoredThemePreference()
}

function getPreferenceServerSnapshot(): ThemePreference {
  return 'dark'
}

export function useTheme(): UseThemeResult {
  const preference = useSyncExternalStore(subscribePreference, getPreferenceSnapshot, getPreferenceServerSnapshot)
  const resolved = resolveTheme(preference)

  useEffect(() => {
    if (preference !== 'system') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (event: MediaQueryListEvent) => {
      applyTheme(event.matches ? 'light' : 'dark')
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    persistThemePreference(next)
    applyTheme(resolveTheme(next))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    }
  }, [])

  return { preference, resolved, setPreference }
}

