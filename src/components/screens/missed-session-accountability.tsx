'use client'

import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { useState } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'

interface MissedSessionAccountabilityProps {
  currentStreak: number
  longestStreak: number
  onSubmit: (excuse: string) => void
  onDismiss: () => void
}

export function MissedSessionAccountability({
  currentStreak,
  longestStreak,
  onSubmit,
  onDismiss
}: MissedSessionAccountabilityProps) {
  const [excuse, setExcuse] = useState('')

  const handleSubmit = () => {
    haptics.warning()
    onSubmit(excuse)
  }

  const handleDismiss = () => {
    haptics.light()
    onDismiss()
  }

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Accountability
          </p>
          <h1 className="type-title text-foreground mt-2">
            Missed Session
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Record what happened. Move forward.
          </p>
        </header>

        {/* Main Content */}
        <ScreenShellContent className="px-6 py-4 pb-24">
          {/* Streak Lost */}
          <div className="mb-8 p-5 bg-card/50 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Streak broken
              </span>
              <span className="text-3xl font-black text-foreground tabular-nums">
                {currentStreak}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Longest streak
              </span>
              <span className="text-lg font-bold text-muted-foreground tabular-nums">
                {longestStreak}
              </span>
            </div>
          </div>

          {/* Accountability Question */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              What happened?
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Note it for yourself. No judgment.
            </p>
            <Textarea
              value={excuse}
              onChange={(e) => setExcuse(e.target.value)}
              placeholder="Injury, schedule conflict, rest day needed..."
              className="bg-card/50 text-sm min-h-[128px]"
              maxLength={200}
              showCount
            />
          </div>

          {/* Harsh Truth */}
          <div className="p-5 bg-card/50 rounded-lg">
            <p className="text-sm text-foreground italic leading-relaxed">
              "Discipline is doing what you hate to do, but doing it like you love it."
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              — Khabib Nurmagomedov
            </p>
          </div>
        </ScreenShellContent>
      </div>

      {/* Action Buttons */}
      <ScreenShellFooter className="px-6">
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          fullWidth
          withHaptic={false}
          className="bg-foreground text-background mb-3"
        >
          Log and Continue
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="md"
          fullWidth
          withHaptic={false}
          className="text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground"
        >
          Dismiss
        </Button>
      </ScreenShellFooter>
    </ScreenShell>
  )
}
