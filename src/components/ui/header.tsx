'use client'

import { ReactNode } from 'react'
import { BackButton, CloseButton } from './back-button'

/**
 * Header Component - Design System
 * 
 * Standardized screen header with consistent styling.
 * Features:
 * - Safe area handling for iOS notch
 * - Optional back/close navigation
 * - Title and subtitle support
 * - Right-side action slot
 * - Consistent height and padding
 */

interface HeaderProps {
  /** Main title */
  title: string
  /** Optional subtitle/label above title */
  subtitle?: string
  /** Show back button */
  onBack?: () => void
  /** Back button label */
  backLabel?: string
  /** Show close button instead of back */
  showClose?: boolean
  /** Right side action element */
  rightAction?: ReactNode
  /** Additional className */
  className?: string
  /** Variant for different header styles */
  variant?: 'default' | 'large' | 'transparent'
}

export function Header({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  showClose = false,
  rightAction,
  className = '',
  variant = 'default',
}: HeaderProps) {
  const variantStyles = {
    default: 'bg-background border-b border-border/30',
    large: 'bg-background',
    transparent: 'bg-transparent',
  }

  return (
    <header
      className={[
        // Safe area
        'safe-area-top',
        // Layout
        'px-4 pb-4',
        // Variant styles
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {/* Navigation row */}
      <div className="flex items-center justify-between min-h-[44px]">
        {/* Left: Back/Close button */}
        <div className="flex-1">
          {onBack && (
            showClose ? (
              <CloseButton onClick={onBack} />
            ) : (
              <BackButton onClick={onBack} label={backLabel} />
            )
          )}
        </div>

        {/* Right: Action slot */}
        <div className="flex-1 flex justify-end">
          {rightAction}
        </div>
      </div>

      {/* Title section */}
      <div className={variant === 'large' ? 'mt-4' : 'mt-2'}>
        {subtitle && (
          <p className="text-xs font-semibold tracking-ultra text-muted-foreground uppercase mb-1">
            {subtitle}
          </p>
        )}
        <h1 className={[
          'font-extrabold text-foreground',
          variant === 'large' ? 'type-title' : 'text-xl',
        ].join(' ')}>
          {title}
        </h1>
      </div>
    </header>
  )
}

/**
 * SimpleHeader - Minimal header with just title
 */
interface SimpleHeaderProps {
  title: string
  onBack?: () => void
  rightAction?: ReactNode
}

export function SimpleHeader({ title, onBack, rightAction }: SimpleHeaderProps) {
  return (
    <header className="safe-area-top px-4 pb-2">
      <div className="flex items-center justify-between min-h-[44px]">
        {/* Left */}
        <div className="flex-1">
          {onBack && <BackButton onClick={onBack} iconOnly />}
        </div>
        
        {/* Center title */}
        <h1 className="text-base font-bold text-foreground">
          {title}
        </h1>
        
        {/* Right */}
        <div className="flex-1 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}

