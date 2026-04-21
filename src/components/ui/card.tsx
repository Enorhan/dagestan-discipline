'use client'

import { type HTMLAttributes, forwardRef, type KeyboardEvent, type MouseEvent } from 'react'
import { haptics } from '@/lib/haptics'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-white/[0.08] bg-card/90 shadow-[0_12px_30px_rgba(0,0,0,0.18)]',
  elevated: 'border border-white/[0.08] bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_18px_40px_rgba(0,0,0,0.26)]',
  outlined: 'border border-white/12 bg-transparent',
  ghost: 'border border-white/[0.04] bg-white/[0.03]',
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, padding = 'md', className = '', onClick, onKeyDown, children, ...props }, ref) => {
    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
      if (interactive) haptics.light()
      onClick?.(e)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e)

      if (!interactive || e.defaultPrevented) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.currentTarget.click()
      }
    }

    return (
      <div
        ref={ref}
        onClick={interactive ? handleClick : onClick}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        className={[
          'rounded-2xl transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out',
          variantStyles[variant],
          paddingStyles[padding],
          interactive ? 'card-interactive cursor-pointer hover:border-white/15 focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-0 active:scale-[0.99]' : '',
          className,
        ].filter(Boolean).join(' ')}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-black text-foreground truncate">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardContent({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-3 ${className}`} {...props}>{children}</div>
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-3 ${className}`} {...props}>{children}</div>
}
