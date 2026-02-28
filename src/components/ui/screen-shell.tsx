'use client'

import type { ReactNode, HTMLAttributes, RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { ConditionalScroll } from '@/components/ui/conditional-scroll'

interface ScreenShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function ScreenShell({ children, className = '', ...props }: ScreenShellProps) {
  return (
    <div
      className={`ui-tokenized h-dvh bg-background flex flex-col overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface ScreenShellContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onScroll'> {
  children: ReactNode
  /** Add max-width constraint for larger screens (iPad, etc.) */
  maxWidth?: boolean
  /** Force always-on scrolling (legacy behavior). Default: false (conditional scrolling) */
  alwaysScroll?: boolean
  /** Optional ref to get access to the scroll container */
  scrollRef?: RefObject<HTMLDivElement | null>
  /** Initial scroll position to restore */
  initialScrollTop?: number
  /** Callback when scroll position changes (scrollTop value) */
  onScrollPositionChange?: (scrollTop: number) => void
}

export function ScreenShellContent({
  children,
  className = '',
  maxWidth = false,
  alwaysScroll = false,
  scrollRef,
  initialScrollTop,
  onScrollPositionChange,
  ...props
}: ScreenShellContentProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const containerRef = scrollRef || internalRef
  const hasRestoredScroll = useRef(false)

  // Restore scroll position when mounting
  useEffect(() => {
    if (initialScrollTop !== undefined && containerRef.current && !hasRestoredScroll.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = initialScrollTop
          hasRestoredScroll.current = true
        }
      })
    }
  }, [initialScrollTop, containerRef])

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollPositionChange) {
      onScrollPositionChange((e.target as HTMLDivElement).scrollTop)
    }
  }

  const content = maxWidth ? (
    <div className="max-w-lg mx-auto w-full">
      {children}
    </div>
  ) : (
    children
  )

  // Legacy behavior: always scroll
  // Content flows naturally from top - no wrapper needed
  if (alwaysScroll) {
    return (
      <div
        ref={containerRef as RefObject<HTMLDivElement>}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain ${className}`}
        {...props}
      >
        {content}
      </div>
    )
  }

  // Modern behavior: conditional scrolling
  return (
    <ConditionalScroll
      className={className}
      scrollRef={containerRef}
      initialScrollTop={initialScrollTop}
      onScrollPositionChange={onScrollPositionChange}
      {...props}
    >
      {content}
    </ConditionalScroll>
  )
}

export function ScreenShellFooter({ children, className = '' }: ScreenShellProps) {
  return (
    <div className={`pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] sticky bottom-0 bg-background/95 backdrop-blur border-t border-border ${className}`}>
      {children}
    </div>
  )
}
