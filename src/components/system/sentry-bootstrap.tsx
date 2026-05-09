'use client'

import { useEffect } from 'react'

import { initSentry } from '@/lib/sentry'

export function SentryBootstrap() {
  useEffect(() => {
    initSentry()
  }, [])
  return null
}

export default SentryBootstrap

