/**
 * Offline write queue with exponential backoff.
 *
 * Producers call `runWithOfflineQueue(label, runner)` to execute a mutation.
 * If the runner throws and the device is offline (or hits a network-class
 * failure), the runner is captured and replayed once connectivity returns.
 *
 * The queue is in-memory only; it does NOT survive a hard reload. That is a
 * conscious tradeoff for v1 — durable persistence requires careful schema
 * versioning and conflict resolution that we are not chasing yet. For one-tap
 * actions performed while the airplane mode dialog is up this is sufficient.
 */

import { logger } from '@/lib/logger'
import { captureException } from '@/lib/monitoring'

export type OfflineQueueRunner = () => Promise<unknown>

interface OfflineQueueEntry {
  id: number
  label: string
  runner: OfflineQueueRunner
  attempts: number
  enqueuedAt: number
}

interface OfflineQueueState {
  pending: number
  flushing: boolean
}

const BACKOFF_SCHEDULE_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const
const MAX_ATTEMPTS = BACKOFF_SCHEDULE_MS.length

let nextId = 1
const queue: OfflineQueueEntry[] = []
let flushing = false
let flushTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(state: OfflineQueueState) => void>()
let currentState: OfflineQueueState = { pending: 0, flushing: false }

function snapshot(): OfflineQueueState {
  if (currentState.pending === queue.length && currentState.flushing === flushing) {
    return currentState
  }

  currentState = { pending: queue.length, flushing }
  return currentState
}

function emit(): void {
  const state = snapshot()
  listeners.forEach((listener) => listener(state))
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true
  }
  return navigator.onLine
}

function isNetworkError(error: unknown): boolean {
  if (!isOnline()) return true
  if (error instanceof TypeError) return /fetch|network/i.test(error.message)
  if (error instanceof Error) {
    return /networkerror|failed to fetch|load failed|timeout/i.test(error.message)
  }
  return false
}

async function flushQueue(): Promise<void> {
  if (flushing) return
  if (queue.length === 0) return
  if (!isOnline()) return

  flushing = true
  emit()

  while (queue.length > 0 && isOnline()) {
    const entry = queue[0]
    try {
      await entry.runner()
      queue.shift()
      emit()
    } catch (error) {
      entry.attempts += 1
      if (entry.attempts >= MAX_ATTEMPTS || !isNetworkError(error)) {
        captureException('offline-queue-drop', error, {
          label: entry.label,
          attempts: entry.attempts,
        }, 'warning')
        queue.shift()
        emit()
        continue
      }
      const delay = BACKOFF_SCHEDULE_MS[Math.min(entry.attempts, BACKOFF_SCHEDULE_MS.length - 1)]
      logger.debug(`[offline-queue] retry ${entry.label} in ${delay}ms (attempt ${entry.attempts})`)
      flushing = false
      emit()
      scheduleFlush(delay)
      return
    }
  }

  flushing = false
  emit()
}

function scheduleFlush(delayMs: number): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, delayMs)
}

export function subscribeOfflineQueue(listener: (state: OfflineQueueState) => void): () => void {
  listeners.add(listener)
  listener(snapshot())
  return () => {
    listeners.delete(listener)
  }
}

export function getOfflineQueueState(): OfflineQueueState {
  return snapshot()
}

export async function runWithOfflineQueue<T>(label: string, runner: () => Promise<T>): Promise<T | undefined> {
  if (!isOnline()) {
    queue.push({ id: nextId++, label, runner, attempts: 0, enqueuedAt: Date.now() })
    emit()
    return undefined
  }

  try {
    return await runner()
  } catch (error) {
    if (!isNetworkError(error)) throw error
    queue.push({ id: nextId++, label, runner, attempts: 0, enqueuedAt: Date.now() })
    emit()
    return undefined
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushQueue()
  })
}
