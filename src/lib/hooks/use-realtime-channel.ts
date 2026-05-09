'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { captureException } from '@/lib/monitoring'

export type RealtimeChannelStatus =
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED'

export interface UseRealtimeChannelOptions {
  /**
   * Channel name. Must be unique per active subscription.
   * Pass `null` to disable the subscription (e.g. while signed out).
   */
  channel: string | null
  /**
   * Configures the channel before `.subscribe()` is invoked.
   * Use this to attach `.on(...)` listeners (postgres_changes, broadcast, presence).
   * Returning the same channel reference is required.
   */
  configure: (channel: RealtimeChannel) => RealtimeChannel
  /** Optional status callback for diagnostics. */
  onStatus?: (status: RealtimeChannelStatus, error?: Error) => void
  /** Disable the subscription without changing `channel`. Defaults to `true`. */
  enabled?: boolean
}

/**
 * Standardized lifecycle wrapper for Supabase Realtime channels.
 *
 * Guarantees:
 *  - Each effect run opens at most one channel.
 *  - The channel is removed via `supabase.removeChannel(...)` on unmount,
 *    dependency change, or `enabled` toggling false. This implicitly
 *    unsubscribes and frees the websocket binding.
 *  - Re-renders that do not change `channel` / `enabled` do not re-subscribe.
 *
 * Usage:
 *   useRealtimeChannel({
 *     channel: user ? `notifications:${user.id}` : null,
 *     configure: (channel) =>
 *       channel.on(
 *         'postgres_changes',
 *         { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user!.id}` },
 *         (payload) => { ... },
 *       ),
 *   })
 */
export function useRealtimeChannel({
  channel,
  configure,
  onStatus,
  enabled = true,
}: UseRealtimeChannelOptions): void {
  // Hold the latest configure/onStatus callbacks in refs so the effect does
  // not re-subscribe when callers pass inline functions.
  const configureRef = useRef(configure)
  const onStatusRef = useRef(onStatus)

  useEffect(() => {
    configureRef.current = configure
    onStatusRef.current = onStatus
  }, [configure, onStatus])

  useEffect(() => {
    if (!enabled || !channel) return

    let realtimeChannel: RealtimeChannel | null = null
    let removed = false

    try {
      const baseChannel = supabase.channel(channel)
      realtimeChannel = configureRef.current(baseChannel)
    } catch (error) {
      captureException('use-realtime-channel-configure', error, { channel }, 'warning')
      return
    }

    realtimeChannel.subscribe((status, err) => {
      if (removed) return
      onStatusRef.current?.(status as RealtimeChannelStatus, err)
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        captureException(
          'use-realtime-channel-status',
          err ?? new Error(`Realtime channel ${channel} entered ${status}`),
          { channel, status },
          'warning',
        )
      }
    })

    return () => {
      removed = true
      const handle = realtimeChannel
      realtimeChannel = null
      if (!handle) return
      void supabase.removeChannel(handle).catch((error) => {
        captureException('use-realtime-channel-cleanup', error, { channel }, 'warning')
      })
    }
  }, [channel, enabled])
}

