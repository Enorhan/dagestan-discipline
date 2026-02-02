'use client'

import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useState } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'

interface PostWorkoutReflectionProps {
  totalTime: number
  onComplete: (effortRating: number, notes: string) => void
  onSkip?: () => void
  undoLabel?: string | null
  onUndo: () => void
}

export function PostWorkoutReflection({
  totalTime,
  onComplete,
  onSkip,
  undoLabel,
  onUndo
}: PostWorkoutReflectionProps) {
  const [effortRating, setEffortRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRatingSelect = (rating: number) => {
    setEffortRating(rating)
  }

  const handleSubmit = () => {
    if (effortRating === null) return
    haptics.medium()
    onComplete(effortRating, notes)
  }

  const getRatingLabel = (rating: number) => {
    if (rating <= 3) return 'Weak'
    if (rating <= 5) return 'Acceptable'
    if (rating <= 7) return 'Good'
    if (rating <= 9) return 'Strong'
    return 'Warrior'
  }

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Session Complete
            </p>
            <h1 className="type-title text-foreground mt-2">
              Reflect on your work
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Total time: {formatTime(totalTime)}
            </p>
          </div>
          {onSkip && (
            <Button
              onClick={() => {
                setShowSkipConfirm(true)
              }}
              variant="ghost"
              size="sm"
              className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-card/40"
              aria-label="Skip reflection"
            >
              Skip
            </Button>
          )}
        </header>

        {/* Main Content */}
        <ScreenShellContent className="px-6 py-4 pb-24">
          {/* Effort Rating */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              How hard did you push?
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Be honest. Your mind quits before your body.
            </p>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <Button
                  key={rating}
                  onClick={() => handleRatingSelect(rating)}
                  variant="ghost"
                  size="sm"
                  className={`min-h-[44px] text-sm font-bold rounded-lg transition-all normal-case tracking-normal ${
                    effortRating === rating
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                  aria-label={`Rate effort ${rating} out of 10`}
                  aria-pressed={effortRating === rating}
                >
                  {rating}
                </Button>
              ))}
            </div>

            {effortRating !== null && (
              <div className="mt-4 p-3 bg-card/50 rounded-lg">
                <p className="text-sm font-semibold text-foreground">
                  {getRatingLabel(effortRating)}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              What did you learn?
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Did you quit early? Did you push through pain? What would your coach say?"
              className="bg-card/50 text-sm min-h-[128px]"
              maxLength={200}
              showCount
            />
          </div>
        </ScreenShellContent>
      </div>

      {/* Submit Button */}
      <ScreenShellFooter className="px-6">
        <Button
          onClick={handleSubmit}
          disabled={effortRating === null}
          variant="primary"
          size="lg"
          fullWidth
          withHaptic={false}
          className={effortRating === null ? 'bg-border text-muted-foreground' : 'bg-foreground text-background'}
        >
          Complete
        </Button>
      </ScreenShellFooter>

      {undoLabel && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4">
          <div className="flex items-center gap-3 bg-foreground text-background px-4 py-2 rounded-full shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {undoLabel}
            </span>
            <Button
              onClick={onUndo}
              variant="link"
              size="sm"
              className="text-xs font-bold uppercase tracking-wide text-background/90 hover:text-background p-0 h-auto min-h-0"
              aria-label="Undo last action"
            >
              Undo
            </Button>
          </div>
        </div>
      )}

      {/* Skip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={() => {
          setShowSkipConfirm(false)
          if (onSkip) onSkip()
        }}
        title="Skip Reflection?"
        message="Your choice. The work is done either way."
        confirmText="Skip"
        cancelText="Reflect"
        variant="default"
      />
    </ScreenShell>
  )
}
