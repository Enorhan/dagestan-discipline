'use client'

import { ReactNode } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from './button'
import { Search } from './icons'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message: string
  actionText?: string
  onAction?: () => void
  secondaryActionText?: string
  onSecondaryAction?: () => void
  variant?: 'default' | 'search' | 'compact'
}

export function EmptyState({
  icon,
  title,
  message,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  variant = 'default'
}: EmptyStateProps) {
  const defaultIcon = <Search size={48} className="text-muted-foreground/50" />
  const displayIcon = icon ?? defaultIcon

  if (variant === 'compact') {
    return (
      <div className="text-center py-8">
        <div className="mb-3 flex justify-center">
          {typeof displayIcon === 'string' ? (
            <span className="text-4xl" role="img" aria-hidden="true">{displayIcon}</span>
          ) : displayIcon}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {actionText && onAction && (
          <Button
            onClick={() => { haptics.light(); onAction() }}
            variant="link"
            size="sm"
            withHaptic={false}
            className="mt-3 text-sm text-primary font-medium p-0 h-auto min-h-0 normal-case tracking-normal"
          >
            {actionText}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          {typeof displayIcon === 'string' ? (
            <span className="text-6xl" role="img" aria-hidden="true">{displayIcon}</span>
          ) : (
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center">
              {displayIcon}
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        {actionText && onAction && (
          <Button
            onClick={() => { haptics.medium(); onAction() }}
            variant="primary"
            size="md"
            fullWidth
            withHaptic={false}
            className="bg-foreground text-background"
          >
            {actionText}
          </Button>
        )}

        {secondaryActionText && onSecondaryAction && (
          <Button
            onClick={() => { haptics.light(); onSecondaryAction() }}
            variant="link"
            size="sm"
            withHaptic={false}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors p-0 h-auto min-h-0 normal-case tracking-normal"
          >
            {secondaryActionText}
          </Button>
        )}
      </div>
    </div>
  )
}
