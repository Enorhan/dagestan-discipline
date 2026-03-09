'use client'

import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useMemo, useState } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { SessionLog } from '@/lib/types'
import { buildReflectionPrompts, getEffortRatingLabel, mergeReflectionNote, REFLECTION_QUICK_PICKS } from '@/lib/session-reflection'

interface PostWorkoutReflectionProps {
  totalTime: number
  onComplete: (effortRating: number, notes: string) => void
  onSkip?: () => void
  mode?: 'create' | 'edit'
  initialEffortRating?: number | null
  initialNotes?: string
  previousSession?: Pick<SessionLog, 'effortRating' | 'notes'> | null
  undoLabel?: string | null
  onUndo: () => void
}

export function PostWorkoutReflection({
  totalTime,
  onComplete,
  onSkip,
  mode = 'create',
  initialEffortRating = null,
  initialNotes = '',
  previousSession = null,
  undoLabel,
  onUndo
}: PostWorkoutReflectionProps) {
  const [effortRating, setEffortRating] = useState<number | null>(initialEffortRating)
  const [notes, setNotes] = useState(initialNotes)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRatingSelect = (rating: number) => setEffortRating(rating)
  const promptSuggestions = useMemo(() => buildReflectionPrompts(previousSession), [previousSession])

  const handleSubmit = () => {
    if (effortRating === null) return
    haptics.medium()
    onComplete(effortRating, notes.trim())
  }

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {mode === 'edit' ? 'Update session log' : 'Session Complete'}
            </p>
            <h1 className="type-title text-foreground mt-2">
              {mode === 'edit' ? 'Edit your reflection' : 'Reflect on your work'}
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
              aria-label={mode === 'edit' ? 'Cancel editing reflection' : 'Skip reflection'}
            >
              {mode === 'edit' ? 'Cancel' : 'Skip'}
            </Button>
          )}
        </header>

        {/* Main Content */}
        <ScreenShellContent className="px-6 py-4 pb-24">
          {/* Effort Rating */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              How hard did it feel? (RPE)
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Be honest. This helps keep your progress and recovery honest.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {REFLECTION_QUICK_PICKS.map((pick) => (
                <Button
                  key={pick.label}
                  type="button"
                  onClick={() => handleRatingSelect(pick.rating)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className={`rounded-xl border px-3 py-3 min-h-[72px] ${
                    effortRating === pick.rating
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-white/10 bg-card/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-sm font-bold text-foreground">{pick.label} · {pick.rating}</span>
                  <span className="text-[11px] leading-relaxed">{pick.description}</span>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <Button
                  key={rating}
                  type="button"
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
                  {getEffortRatingLabel(effortRating)}
                </p>
              </div>
            )}
          </div>

          {(previousSession?.effortRating !== undefined || previousSession?.notes) && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-card/40 p-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                Carry forward
              </p>
              {previousSession?.effortRating !== undefined && (
                <p className="mt-3 text-sm text-foreground">
                  Last logged effort: <span className="font-semibold">{previousSession.effortRating}/10 · {getEffortRatingLabel(previousSession.effortRating)}</span>
                </p>
              )}
              {previousSession?.notes && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  “{previousSession.notes}”
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              What did you learn?
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {promptSuggestions.map((prompt) => (
                <Button
                  key={prompt.label}
                  type="button"
                  onClick={() => setNotes((prev) => mergeReflectionNote(prev, prompt.text))}
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 bg-card/40 px-3 text-xs text-foreground hover:bg-card/70"
                >
                  {prompt.label}
                </Button>
              ))}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What felt strong, what felt off, and what should you remember next time?"
              className="bg-card/50 text-sm min-h-[128px]"
              maxLength={280}
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
          {mode === 'edit' ? 'Save changes' : 'Save reflection'}
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
        title={mode === 'edit' ? 'Discard changes?' : 'Skip reflection?'}
        message={mode === 'edit'
          ? 'Go back to the completion screen without changing this session log.'
          : 'Your session will still be logged. You can add the reflection afterward from the completion screen.'}
        confirmText={mode === 'edit' ? 'Discard changes' : 'Skip'}
        cancelText={mode === 'edit' ? 'Keep editing' : 'Reflect'}
        variant="default"
      />
    </ScreenShell>
  )
}
