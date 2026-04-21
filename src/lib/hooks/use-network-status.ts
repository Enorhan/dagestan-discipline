'use client'

import { useEffect, useRef, useState } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean // Track if we were recently offline (for showing "back online" message)
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    if (typeof navigator.onLine !== 'boolean') return true
    return navigator.onLine
  })
  const [wasOffline, setWasOffline] = useState(false)
  const offlineResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof navigator.onLine === 'boolean') {
      // Ensure client state is aligned with the real browser network status.
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)

      if (offlineResetTimeoutRef.current) {
        clearTimeout(offlineResetTimeoutRef.current)
      }

      offlineResetTimeoutRef.current = setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (offlineResetTimeoutRef.current) {
        clearTimeout(offlineResetTimeoutRef.current)
      }
    }
  }, [])

  return { isOnline, wasOffline }
}

