'use client'

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { haptics } from '@/lib/haptics'

/**
 * Button Component - Design System
 *
 * Standardized button with consistent sizing, variants, and haptic feedback.
 * All buttons meet iOS 44pt minimum touch target requirement.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  withHaptic?: boolean
  /** Loading state - shows spinner and disables button */
  loading?: boolean
  /** Stack content vertically (for title + description buttons) */
  stacked?: boolean
  /** Icon to show before text */
  leftIcon?: ReactNode
  /** Icon to show after text */
  rightIcon?: ReactNode
}

// Variant styles - consistent visual hierarchy
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary text-primary-foreground',
    'hover:opacity-90 active:scale-[0.98]',
    'shadow-sm hover:shadow-md',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  secondary: [
    'bg-secondary text-secondary-foreground',
    'hover:bg-secondary/80 active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  destructive: [
    'bg-destructive text-destructive-foreground',
    'hover:bg-destructive/90 active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  ghost: [
    'bg-transparent text-muted-foreground',
    'hover:text-foreground hover:bg-card/50 active:bg-card/70',
    'focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  outline: [
    'bg-transparent border border-border text-foreground',
    'hover:bg-card/50 hover:border-border/80 active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  link: [
    'bg-transparent text-primary underline-offset-4',
    'hover:underline hover:text-primary/80',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
}

// Size styles - all meet 44pt minimum touch target
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] h-11 px-4 text-xs gap-1.5',      // 44px - minimum touch
  md: 'min-h-[44px] h-12 px-6 text-sm gap-2',        // 48px - comfortable
  lg: 'min-h-[44px] h-14 px-8 text-base gap-2.5',    // 56px - prominent
  xl: 'min-h-[44px] h-16 px-10 text-lg gap-3',       // 64px - hero CTA
  icon: 'min-h-[44px] min-w-[44px] h-11 w-11 p-0',   // Square icon button
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      withHaptic = true,
      loading = false,
      stacked = false,
      leftIcon,
      rightIcon,
      className = '',
      onClick,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (withHaptic && !isDisabled) {
        haptics.light()
      }
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={isDisabled}
        className={[
          // Base styles
          'inline-flex',
          stacked ? 'items-start justify-start' : 'items-center justify-center',
          'font-semibold normal-case tracking-normal',
          'rounded-xl transition-all duration-normal',
          'outline-none',
          // Variant & size
          variantStyles[variant],
          sizeStyles[size],
          // Width
          fullWidth ? 'w-full' : '',
          // Disabled state
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
          // Custom classes
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}

        {/* Content */}
        <span
          className={[
            'inline-flex',
            stacked ? 'flex-col items-start text-left w-full gap-1.5' : 'items-center gap-2',
            loading ? 'opacity-0' : '',
          ].filter(Boolean).join(' ')}
        >
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

/**
 * IconButton - Convenience wrapper for icon-only buttons
 */
interface IconButtonProps extends Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon'> {
  icon: ReactNode
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        variant="ghost"
        className={`rounded-full ${className}`}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'
