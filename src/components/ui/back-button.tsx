'use client'

import { haptics } from '@/lib/haptics'
import { ChevronLeft, X } from './icons'

/**
 * BackButton Component - Design System
 *
 * Consistent back/close navigation button.
 * Features:
 * - Exceeds 48px minimum touch target
 * - Haptic feedback
 * - Two variants: back (chevron) and close (X)
 * - Accessible with proper ARIA labels
 */

interface BackButtonProps {
  onClick: () => void
  label?: string
  variant?: 'back' | 'close'
  styleVariant?: 'default' | 'glass'
  className?: string
  /** Hide the text label, show only icon */
  iconOnly?: boolean
}

export function BackButton({
  onClick,
  label = 'Back',
  variant = 'back',
  styleVariant = 'default',
  className = '',
  iconOnly = false,
}: BackButtonProps) {
  const handleClick = () => {
    haptics.light()
    onClick()
  }

  const Icon = variant === 'close' ? X : ChevronLeft
  const ariaLabel = variant === 'close' ? 'Close' : `Go back${label !== 'Back' ? `: ${label}` : ''}`

  const variantStyles = styleVariant === 'glass'
    ? 'text-white/70 hover:text-white bg-white/10 backdrop-blur-md px-3 border border-white/[0.08] active:bg-white/20'
    : 'text-muted-foreground hover:text-foreground active:bg-card/50'

  return (
    <button
      onClick={handleClick}
      className={[
        // Touch target
        'min-h-[48px]',
        styleVariant === 'default' ? 'min-w-[48px] -ml-2 px-2' : 'px-4 rounded-2xl',
        // Layout
        'flex items-center gap-1',
        // Typography
        'text-base font-bold tracking-tight',
        // Colors & transitions
        variantStyles,
        'transition-all duration-normal',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      <Icon size={18} strokeWidth={3} />
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
