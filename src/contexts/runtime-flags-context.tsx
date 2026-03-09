'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { captureException } from '@/lib/monitoring'
import {
  DEFAULT_RUNTIME_FLAGS,
  getRuntimeFlagsSnapshot,
  hasRemoteRuntimeFlags,
  refreshRuntimeFlags,
  type RuntimeFlags,
} from '@/lib/runtime-flags'

interface RuntimeFlagsContextType {
  flags: RuntimeFlags
  isLoading: boolean
  refresh: () => Promise<RuntimeFlags>
}

const RuntimeFlagsContext = createContext<RuntimeFlagsContextType | undefined>(undefined)

export function RuntimeFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<RuntimeFlags>(() => getRuntimeFlagsSnapshot())
  const [isLoading, setIsLoading] = useState(hasRemoteRuntimeFlags())

  const refresh = useCallback(async (): Promise<RuntimeFlags> => {
    if (!hasRemoteRuntimeFlags()) {
      const currentFlags = getRuntimeFlagsSnapshot()
      setFlags(currentFlags)
      setIsLoading(false)
      return currentFlags
    }

    setIsLoading(true)

    try {
      const nextFlags = await refreshRuntimeFlags()
      setFlags(nextFlags)
      return nextFlags
    } catch (error) {
      captureException('runtime-flags', error, {
        step: 'refresh',
      }, 'warning')
      const fallbackFlags = getRuntimeFlagsSnapshot() ?? DEFAULT_RUNTIME_FLAGS
      setFlags(fallbackFlags)
      return fallbackFlags
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasRemoteRuntimeFlags()) {
      setFlags(getRuntimeFlagsSnapshot())
      setIsLoading(false)
      return
    }

    void refresh()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  return (
    <RuntimeFlagsContext.Provider value={{ flags, isLoading, refresh }}>
      {children}
    </RuntimeFlagsContext.Provider>
  )
}

export function useRuntimeFlags(): RuntimeFlagsContextType {
  const context = useContext(RuntimeFlagsContext)

  if (context === undefined) {
    throw new Error('useRuntimeFlags must be used within a RuntimeFlagsProvider')
  }

  return context
}