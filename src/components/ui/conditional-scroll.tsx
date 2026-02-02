'use client'

import { ReactNode, useRef, useEffect, useState, HTMLAttributes } from 'react'

interface ConditionalScrollProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Additional className for the wrapper */
  className?: string
  /** Additional className applied only when scrolling is active */
  scrollClassName?: string
  /** Debounce delay for resize observer (ms) */
  resizeDebounce?: number
  /** Callback when scroll state changes */
  onScrollStateChange?: (isScrollable: boolean) => void
}

/**
 * ConditionalScroll - A performance-optimized scroll container that only enables
 * scrolling when content actually overflows the available viewport space.
 *
 * This prevents unnecessary scroll behavior and improves UX by:
 * - Avoiding scroll bounce on non-overflowing content
 * - Reducing layout thrashing
 * - Providing better mobile experience
 *
 * Uses ResizeObserver for efficient overflow detection.
 */
export function ConditionalScroll({
  children,
  className = '',
  scrollClassName = '',
  resizeDebounce = 50,
  onScrollStateChange,
  ...props
}: ConditionalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isScrollable, setIsScrollable] = useState(false)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current

    if (!container || !content) return

    const checkOverflow = () => {
      // Clear any pending timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      // Debounce the check to avoid excessive calculations during rapid resizes
      resizeTimeoutRef.current = setTimeout(() => {
        const containerHeight = container.clientHeight
        // Get the natural height of content without flex stretching
        const contentHeight = content.scrollHeight

        // Add small buffer (2px) to prevent edge cases
        const needsScroll = contentHeight > containerHeight + 2

        if (needsScroll !== isScrollable) {
          setIsScrollable(needsScroll)
          onScrollStateChange?.(needsScroll)
        }
      }, resizeDebounce)
    }

    // Initial check after a brief delay to let layout settle
    const initialTimeout = setTimeout(checkOverflow, 10)

    // Use ResizeObserver for efficient overflow detection
    const resizeObserver = new ResizeObserver(checkOverflow)

    // Observe both container and content for size changes
    resizeObserver.observe(container)
    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
      clearTimeout(initialTimeout)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [isScrollable, resizeDebounce, onScrollStateChange])

  // When scrollable: scroll container - content flows from top naturally
  // When not scrollable: flex container that allows children to use flex-1, justify-between, etc.

  if (isScrollable) {
    // Scrollable mode: use absolute positioning to ensure content starts at top
    // The container fills the flex space, content is positioned absolutely at top
    return (
      <div
        ref={containerRef}
        className={[
          `flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain relative`,
          scrollClassName,
          className
        ].filter(Boolean).join(' ')}
        {...props}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    )
  }

  // Non-scrollable mode: flex container for layout utilities
  return (
    <div
      ref={containerRef}
      className={['flex-1 min-h-0 flex flex-col overflow-hidden', className].filter(Boolean).join(' ')}
      {...props}
    >
      <div ref={contentRef} className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}

