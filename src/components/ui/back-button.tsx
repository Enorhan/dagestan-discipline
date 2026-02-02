'use client'

import { haptics } from '@/lib/haptics'
import { ChevronLeft, X } from './icons'

/**
 * BackButton Component - Design System
 *
 * Consistent back/close navigation button.
 * Features:
 * - Meets 44pt minimum touch target
 * - Haptic feedback
 * - Two variants: back (chevron) and close (X)
 * - Accessible with proper ARIA labels
 */

interface BackButtonProps {
  onClick: () => void
  label?: string
  variant?: 'back' | 'close'
  className?: string
  /** Hide the text label, show only icon */
  iconOnly?: boolean
}

export function BackButton({
  onClick,
  label = 'Back',
  variant = 'back',
  className = '',
  iconOnly = false,
}: BackButtonProps) {
  const handleClick = () => {
    haptics.light()
    onClick()
  }

  const Icon = variant === 'close' ? X : ChevronLeft
  const ariaLabel = variant === 'close' ? 'Close' : `Go back${label !== 'Back' ? `: ${label}` : ''}`

  return (
    <button
      onClick={handleClick}
      className={[
        // Touch target
        'min-h-[44px] min-w-[44px]',
        // Layout
        '-ml-2 px-2 flex items-center gap-1',
        // Typography
        'text-sm font-medium',
        // Colors & transitions
        'text-muted-foreground hover:text-foreground',
        'transition-colors duration-normal',
        // Interactive states
        'rounded-xl active:bg-card/50',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      <Icon size={20} strokeWidth={2.5} />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}

/**
 * CloseButton - Convenience wrapper for close variant
 */
interface CloseButtonProps {
  onClick: () => void
  className?: string
}

export function CloseButton({ onClick, className = '' }: CloseButtonProps) {
  return (
    <BackButton
      onClick={onClick}
      variant="close"
      iconOnly
      className={className}
    />
  )
}

