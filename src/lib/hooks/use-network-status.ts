'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean // Track if we were recently offline (for showing "back online" message)
}

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot(): boolean {
  if (typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}

function getOnlineServerSnapshot(): boolean {
  return true
}

export function useNetworkStatus(): NetworkStatus {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot)
  const [wasOffline, setWasOffline] = useState(false)
  const previousOnlineRef = useRef(isOnline)
  const offlineResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const wasOnline = previousOnlineRef.current
    previousOnlineRef.current = isOnline

    if (!wasOnline && isOnline) {
      // Fire the "Back online" confirmation on offline→online transitions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasOffline(true)
      if (offlineResetTimeoutRef.current) clearTimeout(offlineResetTimeoutRef.current)
      offlineResetTimeoutRef.current = setTimeout(() => setWasOffline(false), 3000)
    }

    return () => {
      if (offlineResetTimeoutRef.current) {
        clearTimeout(offlineResetTimeoutRef.current)
      }
    }
  }, [isOnline])

  return { isOnline, wasOffline }
}

