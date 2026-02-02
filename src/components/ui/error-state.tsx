'use client'

import { haptics } from '@/lib/haptics'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryText?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again'
}: ErrorStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl text-destructive">✕</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-8">
          {message}
        </p>

        {/* Retry Button */}
        {onRetry && (
          <Button
            onClick={() => {
              haptics.medium()
              onRetry()
            }}
            variant="primary"
            size="md"
            fullWidth
            withHaptic={false}
            className="bg-foreground text-background"
          >
            {retryText}
          </Button>
        )}
      </div>
    </div>
  )
}
