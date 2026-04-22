'use client'

import { useSyncExternalStore } from 'react'
import { useNetworkStatus } from '@/lib/hooks/use-network-status'

interface OfflineBannerProps {
  className?: string
}

const EMPTY_SUBSCRIBE = () => () => undefined

export function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { isOnline, wasOffline } = useNetworkStatus()
  // Suppress render until hydration completes. Server snapshot returns false so the
  // banner never renders on the server, avoiding mismatch with navigator.onLine.
  const isHydrated = useSyncExternalStore(EMPTY_SUBSCRIBE, () => true, () => false)

  if (!isHydrated) {
    return null
  }

  // Show nothing if online and wasn't recently offline
  if (isOnline && !wasOffline) {
    return null
  }

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-semibold
        transition-all duration-300 ease-out
        ${isOnline 
          ? 'bg-green-900/90 text-green-100 animate-[slide-down_300ms_ease-out]' 
          : 'bg-yellow-900/90 text-yellow-100'
        }
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Back online
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
          </svg>
          You&apos;re offline — some features may be limited
        </span>
      )}
    </div>
  )
}

