'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { haptics } from '@/lib/haptics'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card border border-border/50',
  elevated: 'bg-card shadow-elevated',
  outlined: 'bg-transparent border border-border',
  ghost: 'bg-card/50',
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, padding = 'md', className = '', onClick, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactive) haptics.light()
      onClick?.(e)
    }

    return (
      <div
        ref={ref}
        onClick={interactive ? handleClick : onClick}
        className={[
          'rounded-xl',
          variantStyles[variant],
          paddingStyles[padding],
          interactive ? 'cursor-pointer transition-all duration-normal active:scale-[0.98] hover:border-border' : '',
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
        <h3 className="text-base font-bold text-foreground truncate">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardContent({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-3 ${className}`} {...props}>{children}</div>
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 pt-3 border-t border-border/50 flex items-center gap-3 ${className}`} {...props}>{children}</div>
}

