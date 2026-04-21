'use client'

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { haptics } from '@/lib/haptics'

/**
 * Button Component - Design System
 *
 * Standardized button with consistent sizing, variants, and haptic feedback.
 * All buttons exceed the 48px minimum touch target requirement.
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
    'border border-primary/80 bg-primary text-primary-foreground',
    'hover:bg-primary/90 active:scale-[0.99]',
    'shadow-[0_12px_28px_rgba(139,0,0,0.18)] hover:shadow-[0_16px_32px_rgba(139,0,0,0.22)]',
    'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-0',
  ].join(' '),
  secondary: [
    'border border-white/[0.08] bg-card/90 text-foreground',
    'hover:bg-card hover:border-white/15 active:scale-[0.99]',
    'shadow-[0_8px_20px_rgba(0,0,0,0.18)]',
    'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0',
  ].join(' '),
  destructive: [
    'border border-destructive/70 bg-destructive text-destructive-foreground',
    'hover:bg-destructive/90 active:scale-[0.99]',
    'shadow-[0_10px_24px_rgba(127,29,29,0.22)]',
    'focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:ring-offset-0',
  ].join(' '),
  ghost: [
    'border border-transparent bg-transparent text-muted-foreground',
    'hover:text-foreground hover:bg-white/[0.04] active:bg-white/[0.06]',
    'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0',
  ].join(' '),
  outline: [
    'border border-white/12 bg-transparent text-foreground',
    'hover:bg-white/[0.03] hover:border-white/20 active:scale-[0.99]',
    'focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-0',
  ].join(' '),
  link: [
    'bg-transparent text-primary underline-offset-4',
    'hover:underline hover:text-primary/80',
    'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0',
  ].join(' '),
}

// Size styles - all exceed 48px minimum touch target
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[48px] h-12 px-4 text-sm gap-1.5',
  md: 'min-h-[52px] h-[52px] px-5 text-base gap-2',
  lg: 'min-h-[60px] h-[60px] px-6 text-lg gap-2.5',
  xl: 'min-h-[68px] h-[68px] px-8 text-[1.125rem] gap-3',
  icon: 'min-h-[48px] min-w-[48px] h-12 w-12 p-0',
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
        type={props.type ?? 'button'}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={loading}
        className={[
          'relative inline-flex shrink-0 select-none',
          stacked ? 'items-start justify-start text-left' : 'items-center justify-center',
          'font-bold normal-case tracking-normal',
          'rounded-2xl transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-150 ease-out motion-reduce:transition-none',
          'outline-none disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? 'w-full' : '',
          isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
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
            <span className="sr-only">Loading</span>
          </span>
        )}

        {/* Content */}
        <span
          className={[
            'inline-flex',
            stacked ? 'w-full flex-col items-start gap-1.5 whitespace-normal text-left' : 'items-center gap-2',
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
