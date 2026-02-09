'use client'

import { useMemo, useState } from 'react'
import { Exercise, Session, SportType } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExerciseModal, ExerciseDraft } from '@/components/ui/exercise-modal'
import { ExerciseLibraryModal } from '@/components/ui/exercise-library-modal'
import { Trash } from '@/components/ui/icons'

interface ProgramSessionEditorProps {
  sport: SportType
  session: Session
  dayLabel: string
  onSave: (session: Session) => void
  onClose: () => void
}

const estimateDurationMinutes = (exercises: Exercise[]) => {
  if (exercises.length === 0) return 0
  let totalSeconds = 0
  for (const ex of exercises) {
    const exerciseTime = ex.duration ?? (ex.reps ?? 10) * 3
    totalSeconds += (exerciseTime * ex.sets) + (ex.restTime * Math.max(0, ex.sets - 1))
  }
  return Math.max(1, Math.ceil(totalSeconds / 60))
}

export function ProgramSessionEditor({ sport, session, dayLabel, onSave, onClose }: ProgramSessionEditorProps) {
  const [focus, setFocus] = useState(session.focus)
  const [exercises, setExercises] = useState<Exercise[]>(() => session.exercises.map(ex => ({ ...ex })))
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)

  const duration = useMemo(() => estimateDurationMinutes(exercises), [exercises])

  const handleAddExercise = (draft: ExerciseDraft) => {
    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: draft.name,
      sets: draft.sets,
      reps: draft.reps,
      duration: draft.duration,
      restTime: draft.restTime,
      notes: draft.notes,
    }
    setExercises(prev => [...prev, newExercise])
    setShowCustomModal(false)
    haptics.medium()
  }

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId))
    haptics.light()
  }

  const updateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      return { ...ex, ...updates }
    }))
  }

  const handleSave = () => {
    const updatedSession: Session = {
      ...session,
      focus: focus.trim() || session.focus,
      exercises,
      duration,
    }
    haptics.success()
    onSave(updatedSession)
  }

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-28">
          <BackButton onClick={onClose} label="Back" />

          <div className="mt-4 mb-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {dayLabel}
            </p>
            <h1 className="text-2xl font-black text-foreground mt-2">
              Edit Session
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update exercises and save changes to your program.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Focus
            </label>
            <Input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="flex items-center justify-between bg-card/50 rounded-lg p-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Estimated time</p>
              <p className="text-lg font-semibold text-foreground mt-1">{duration} min</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowLibraryModal(true)}
                variant="primary"
                size="sm"
                className="h-10 px-4"
                withHaptic={false}
              >
                Add From Library
              </Button>
              <Button
                onClick={() => setShowCustomModal(true)}
                variant="outline"
                size="sm"
                className="h-10 px-4"
              >
                Custom
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {exercises.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                No exercises yet. Add your first exercise.
              </div>
            ) : (
              exercises.map((exercise, index) => (
                <div key={exercise.id} className="card-elevated rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <Input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      onClick={() => handleRemoveExercise(exercise.id)}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Sets
                      </label>
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(exercise.id, { sets: parseInt(e.target.value) || 1 })}
                        className="h-10 text-center"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Reps
                      </label>
                      <Input
                        type="number"
                        value={exercise.reps ?? ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          updateExercise(exercise.id, { reps: value || undefined, duration: undefined })
                        }}
                        className="h-10 text-center"
                        min={0}
                        disabled={exercise.duration !== undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Time (s)
                      </label>
                      <Input
                        type="number"
                        value={exercise.duration ?? ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          updateExercise(exercise.id, { duration: value || undefined, reps: undefined })
                        }}
                        className="h-10 text-center"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Rest
                      </label>
                      <Input
                        type="number"
                        value={exercise.restTime}
                        onChange={(e) => updateExercise(exercise.id, { restTime: parseInt(e.target.value) || 0 })}
                        className="h-10 text-center"
                        min={0}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Notes
                    </label>
                    <Input
                      type="text"
                      value={exercise.notes ?? ''}
                      onChange={(e) => updateExercise(exercise.id, { notes: e.target.value || undefined })}
                      className="h-10"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <div className="px-6 py-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            size="lg"
            className="flex-1"
            withHaptic={false}
          >
            Save Session
          </Button>
        </div>
      </ScreenShellFooter>

      {showCustomModal && (
        <ExerciseModal
          onAdd={handleAddExercise}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      {showLibraryModal && (
        <ExerciseLibraryModal
          sport={sport}
          title="Add Exercise"
          onClose={() => setShowLibraryModal(false)}
          onPick={(picked) => {
            const newExercise: Exercise = {
              id: picked.id,
              name: picked.name,
              sets: 4,
              reps: 8,
              restTime: 90,
              videoUrl: picked.videoUrl ?? undefined,
            }
            setExercises((prev) => [...prev, newExercise])
            setShowLibraryModal(false)
            haptics.medium()
          }}
        />
      )}
    </ScreenShell>
  )
}
