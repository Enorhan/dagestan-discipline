'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { haptics } from '@/lib/haptics'

interface ListItemProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  rightText?: string
  onPress?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightText,
  onPress,
  variant = 'default',
  disabled = false,
  className = '',
  ...props
}: ListItemProps) {
  const handleClick = () => {
    if (disabled) return
    haptics.light()
    onPress?.()
  }

  const isInteractive = !!onPress && !disabled

  return (
    <div
      onClick={isInteractive ? handleClick : undefined}
      className={[
        'min-h-[52px] px-4 py-3 flex items-center gap-3',
        'border-b border-border/30 last:border-b-0',
        isInteractive ? 'cursor-pointer active:bg-card/50 transition-colors' : '',
        disabled ? 'opacity-50' : '',
        className,
      ].filter(Boolean).join(' ')}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      {...props}
    >
      {leftIcon && (
        <span className={`flex-shrink-0 ${variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {leftIcon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium truncate ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}>
          {title}
        </p>
        {subtitle && <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>}
      </div>
      {rightText && <span className="text-sm text-muted-foreground flex-shrink-0">{rightText}</span>}
      {rightIcon && <span className="flex-shrink-0 text-muted-foreground/60">{rightIcon}</span>}
    </div>
  )
}

interface ListGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  children: ReactNode
}

export function ListGroup({ title, children, className = '', ...props }: ListGroupProps) {
  return (
    <div className={`mb-6 ${className}`} {...props}>
      {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-4">{title}</h3>}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">{children}</div>
    </div>
  )
}

