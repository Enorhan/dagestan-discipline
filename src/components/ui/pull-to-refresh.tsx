'use client'

import { type ReactNode } from 'react'

import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh?: (() => Promise<void> | void) | undefined
  className?: string
  threshold?: number
  children: ReactNode
}

export function PullToRefresh({ onRefresh, className, threshold = 80, children }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
    onRefresh: async () => {
      if (!onRefresh) return
      await onRefresh()
    },
    threshold,
  })

  const enabled = typeof onRefresh === 'function'

  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto', className)}
      onTouchStart={enabled ? handleTouchStart : undefined}
      onTouchMove={enabled ? handleTouchMove : undefined}
      onTouchEnd={enabled ? handleTouchEnd : undefined}
    >
      {enabled && (pullDistance > 0 || isRefreshing) ? (
        <div
          className="flex items-center justify-center overflow-hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/55"
          style={{
            height: isRefreshing ? 36 : Math.min(pullDistance, 72),
            transition: pullDistance === 0 ? 'height 160ms ease-out' : undefined,
          }}
          aria-hidden={!isRefreshing}
        >
          {isRefreshing ? 'Refreshing…' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default PullToRefresh

