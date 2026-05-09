'use client'

import { useSyncExternalStore } from 'react'
import {
  getOfflineQueueState,
  subscribeOfflineQueue,
} from '@/lib/offline-queue'

interface OfflineQueueSnapshot {
  pending: number
  flushing: boolean
}

const SERVER_SNAPSHOT: OfflineQueueSnapshot = { pending: 0, flushing: false }

function subscribe(callback: () => void): () => void {
  return subscribeOfflineQueue(() => callback())
}

function getSnapshot(): OfflineQueueSnapshot {
  return getOfflineQueueState()
}

function getServerSnapshot(): OfflineQueueSnapshot {
  return SERVER_SNAPSHOT
}

export function useOfflineQueue(): OfflineQueueSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

