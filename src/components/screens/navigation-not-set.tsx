'use client'

import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'

interface NavigationNotSetProps {
  title?: string
  message: string
  details?: string
  onGoHome: () => void
  onGoBack?: () => void
  backLabel?: string
}

export function NavigationNotSet({
  title = 'Navigation not set',
  message,
  details,
  onGoHome,
  onGoBack,
  backLabel = 'Go back'
}: NavigationNotSetProps) {
  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          <div className="mt-16 card-elevated rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Navigation
            </p>
            <h1 className="text-2xl font-black text-foreground mb-2">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
            {details && (
              <p className="text-xs text-muted-foreground/70 mt-3 break-words">
                {details}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              {onGoBack && (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={onGoBack}
                >
                  {backLabel}
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={onGoHome}
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
