'use client'

import type { ReactNode, HTMLAttributes } from 'react'
import { ConditionalScroll } from '@/components/ui/conditional-scroll'

interface ScreenShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function ScreenShell({ children, className = '', ...props }: ScreenShellProps) {
  return (
    <div
      className={`h-dvh bg-background flex flex-col overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface ScreenShellContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Add max-width constraint for larger screens (iPad, etc.) */
  maxWidth?: boolean
  /** Force always-on scrolling (legacy behavior). Default: false (conditional scrolling) */
  alwaysScroll?: boolean
}

export function ScreenShellContent({ 
  children, 
  className = '', 
  maxWidth = false,
  alwaysScroll = false,
  ...props 
}: ScreenShellContentProps) {
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
      <div className={`flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain ${className}`} {...props}>
        {content}
      </div>
    )
  }

  // Modern behavior: conditional scrolling
  return (
    <ConditionalScroll className={className} {...props}>
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

