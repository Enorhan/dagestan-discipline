'use client'

import { useState } from 'react'
import { haptics } from '@/lib/haptics'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ExerciseDraft {
  name: string
  sets: number
  reps?: number
  duration?: number
  restTime: number
  notes?: string
}

interface ExerciseModalProps {
  onAdd: (exercise: ExerciseDraft) => void
  onClose: () => void
  title?: string
}

const COMMON_EXERCISES = [
  'Deadlift', 'Squat', 'Bench Press', 'Barbell Row', 'Overhead Press',
  'Pull-ups', 'Push-ups', 'Lunges', 'Romanian Deadlift', 'Hip Thrust',
  'Farmers Walk', 'Kettlebell Swing', 'Turkish Get-up', 'Plank', 'Burpees'
]

export function ExerciseModal({ onAdd, onClose, title = 'Add Exercise' }: ExerciseModalProps) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [duration, setDuration] = useState<number | ''>('')
  const [restTime, setRestTime] = useState(60)
  const [notes, setNotes] = useState('')

  const handleAdd = () => {
    if (!name.trim()) {
      haptics.error()
      return
    }
    const draft: ExerciseDraft = {
      name: name.trim(),
      sets,
      reps: duration ? undefined : reps,
      duration: duration ? Number(duration) : undefined,
      restTime,
      notes: notes || undefined,
    }
    onAdd(draft)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm safe-area-inset">
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 pb-4 flex items-center justify-between">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted-foreground normal-case tracking-normal"
          >
            Cancel
          </Button>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <Button
            onClick={handleAdd}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className="text-primary font-semibold normal-case tracking-normal"
          >
            Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Exercise Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter exercise name"
              className="h-14"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EXERCISES.map((ex) => (
                <Button
                  key={ex}
                  variant="ghost"
                  size="sm"
                  onClick={() => setName(ex)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all normal-case tracking-normal ${
                    name === ex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  {ex}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Sets
              </label>
              <Input
                type="number"
                value={sets}
                onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                className="h-14 text-center text-lg font-bold"
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Reps
              </label>
              <Input
                type="number"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 1)}
                className="h-14 text-center text-lg font-bold"
                min={1}
                disabled={duration !== ''}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Rest (s)
              </label>
              <Input
                type="number"
                value={restTime}
                onChange={(e) => setRestTime(parseInt(e.target.value) || 0)}
                className="h-14 text-center text-lg font-bold"
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Duration (seconds)
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => {
                const value = e.target.value
                setDuration(value === '' ? '' : parseInt(value) || 0)
              }}
              className="h-14 text-center text-lg font-bold"
              min={0}
              placeholder="Optional"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to use reps instead.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Notes (Optional)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Explosive on the way up"
              className="h-14"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
