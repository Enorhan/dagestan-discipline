'use client'

import { useState, useRef, useCallback } from 'react'
import { haptics } from '@/lib/haptics'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number // Pull distance to trigger refresh (default: 80)
  maxPull?: number // Maximum pull distance (default: 120)
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const scrollTop = useRef<number>(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when at top of scroll
    const target = e.currentTarget as HTMLElement
    scrollTop.current = target.scrollTop || 0
    
    if (scrollTop.current <= 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || isRefreshing) return
    if (scrollTop.current > 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    // Only track downward pulls
    if (diff > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = 0.5
      const distance = Math.min(diff * resistance, maxPull)
      setPullDistance(distance)

      // Haptic feedback when crossing threshold
      if (distance >= threshold && pullDistance < threshold) {
        haptics.light()
      }
    }
  }, [isRefreshing, maxPull, threshold, pullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      haptics.medium()
      
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
    startY.current = null
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}

