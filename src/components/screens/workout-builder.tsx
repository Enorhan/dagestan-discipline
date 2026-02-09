'use client'

import React, { useState, useCallback } from 'react'
import { Screen, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExerciseModal, ExerciseDraft } from '@/components/ui/exercise-modal'
import { ExerciseLibraryModal } from '@/components/ui/exercise-library-modal'
import {
  CustomWorkout,
  CustomWorkoutExercise,
  WorkoutBuilderState,
  WorkoutFocus,
  focusAreaInfo
} from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Plus, Trash, ChevronRight, ChevronDown, GripVertical } from '@/components/ui/icons'

interface WorkoutBuilderProps {
  onSave: (workout: CustomWorkout) => void
  onClose: () => void
  editingWorkout?: CustomWorkout
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

const FOCUS_OPTIONS: WorkoutFocus[] = [
  'upper-body', 'lower-body', 'full-body', 'core', 'conditioning',
  'grip-strength', 'explosive-power', 'endurance', 'mobility', 'recovery'
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', color: 'text-muted-foreground' },
  { value: 'intermediate', label: 'Intermediate', color: 'text-primary' },
  { value: 'advanced', label: 'Advanced', color: 'text-destructive' }
] as const

const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'wrestling', label: 'Wrestling' },
  { value: 'bjj', label: 'BJJ' },
  { value: 'judo', label: 'Judo' }
]

export function WorkoutBuilder({ onSave, onClose, editingWorkout, onNavigate, onStartAction, hasWorkoutToday = false }: WorkoutBuilderProps) {
  const [step, setStep] = useState<'metadata' | 'exercises' | 'review'>('metadata')
  const [state, setState] = useState<WorkoutBuilderState>(() => {
    if (editingWorkout) {
      return {
        name: editingWorkout.name,
        description: editingWorkout.description,
        focus: editingWorkout.focus,
        difficulty: editingWorkout.difficulty,
        sportRelevance: editingWorkout.sportRelevance,
        visibility: 'private',
        exercises: editingWorkout.exercises
      }
    }
    return {
      name: '',
      description: '',
      focus: 'full-body',
      difficulty: 'intermediate',
      sportRelevance: ['wrestling', 'bjj', 'judo'],
      visibility: 'private',
      exercises: []
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState<CustomWorkoutExercise | null>(null)

  const handleSave = async () => {
    if (!state.name.trim()) {
      setError('Please enter a workout name')
      haptics.error()
      return
    }
    if (state.exercises.length === 0) {
      setError('Please add at least one exercise')
      haptics.error()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let workout: CustomWorkout
      if (editingWorkout) {
        workout = await supabaseService.updateWorkout(editingWorkout.id, state)
      } else {
        workout = await supabaseService.createWorkout(state)
      }
      haptics.success()
      onSave(workout)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save workout')
      haptics.error()
    } finally {
      setIsLoading(false)
    }
  }

  const addExercise = (exercise: ExerciseDraft) => {
    const newExercise: CustomWorkoutExercise = {
      ...exercise,
      id: `ex-${Date.now()}`,
      order: state.exercises.length
    }
    setState(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }))
    setShowCustomModal(false)
    haptics.medium()
  }

  const addFromLibrary = (picked: { id: string; name: string; videoUrl?: string | null }) => {
    setState((prev) => {
      const newExercise: CustomWorkoutExercise = {
        id: `ex-${Date.now()}`,
        name: picked.name,
        sets: 3,
        reps: 10,
        restTime: 60,
        notes: '',
        videoUrl: picked.videoUrl ?? undefined,
        order: prev.exercises.length,
      }
      return { ...prev, exercises: [...prev.exercises, newExercise] }
    })
    setShowLibraryModal(false)
    haptics.medium()
  }

  const removeExercise = (exercise: CustomWorkoutExercise) => {
    setExerciseToDelete(exercise)
  }

  const confirmRemoveExercise = () => {
    if (!exerciseToDelete) return
    setState(prev => ({
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== exerciseToDelete.id)
    }))
    haptics.light()
    setExerciseToDelete(null)
  }

  const updateExercise = (id: string, updates: Partial<CustomWorkoutExercise>) => {
    setState(prev => ({
      ...prev,
      exercises: prev.exercises.map(e => e.id === id ? { ...e, ...updates } : e)
    }))
  }

  const estimatedDuration = supabaseService.calculateDuration(state.exercises)

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          <BackButton onClick={onClose} label="Cancel" />

          {/* Header */}
          <div className="mt-4 mb-6">
            <h1 className="text-2xl font-black text-foreground">
              {editingWorkout ? 'Edit Workout' : 'Create Workout'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 'metadata' && 'Set workout details'}
              {step === 'exercises' && 'Add exercises to your workout'}
              {step === 'review' && 'Review and save'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex gap-2 mb-6">
            {['metadata', 'exercises', 'review'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  ['metadata', 'exercises', 'review'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {step === 'metadata' && (
            <MetadataStep state={state} setState={setState} />
          )}
          {step === 'exercises' && (
            <ExercisesStep
              exercises={state.exercises}
              onAdd={() => setShowLibraryModal(true)}
              onRemove={removeExercise}
              onUpdate={updateExercise}
            />
          )}
          {step === 'review' && (
            <ReviewStep state={state} estimatedDuration={estimatedDuration} />
          )}
        </div>
      </ScreenShellContent>

      {/* Footer */}
      <ScreenShellFooter>
        <div className="px-6 py-4 flex gap-3">
          {step !== 'metadata' && (
            <Button
              onClick={() => setStep(step === 'review' ? 'exercises' : 'metadata')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              haptics.medium()
              if (step === 'metadata') setStep('exercises')
              else if (step === 'exercises') setStep('review')
              else handleSave()
            }}
            disabled={isLoading}
            variant="primary"
            size="lg"
            withHaptic={false}
            className="flex-1 card-interactive"
          >
            {step === 'review' ? (isLoading ? 'Saving...' : 'Save Workout') : 'Next'}
          </Button>
        </div>
      </ScreenShellFooter>

      {/* Exercise Modal */}
      {showCustomModal && (
        <ExerciseModal
          onAdd={addExercise}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      {showLibraryModal && (
        <ExerciseLibraryModal
          title="Add Exercise"
          onClose={() => setShowLibraryModal(false)}
          onPick={(picked) => addFromLibrary(picked)}
          onCustom={() => {
            setShowLibraryModal(false)
            setShowCustomModal(true)
          }}
          customLabel="Custom"
        />
      )}

      {/* Delete Exercise Confirmation Modal */}
      <ConfirmationModal
        isOpen={exerciseToDelete !== null}
        title="Remove Exercise?"
        message={exerciseToDelete ? `Remove "${exerciseToDelete.name}" from this workout?` : ''}
        confirmText="Remove"
        cancelText="Keep"
        variant="destructive"
        onConfirm={confirmRemoveExercise}
        onClose={() => setExerciseToDelete(null)}
      />
    </ScreenShell>
  )
}

// Metadata Step Component
function MetadataStep({ state, setState }: {
  state: WorkoutBuilderState
  setState: React.Dispatch<React.SetStateAction<WorkoutBuilderState>>
}) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Workout Name *
        </label>
        <Input
          type="text"
          value={state.name}
          onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Explosive Power Day"
          className="h-14"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Description
        </label>
        <Textarea
          value={state.description}
          onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your workout..."
          className="min-h-[96px]"
        />
      </div>

      {/* Focus Area */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Focus Area
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {FOCUS_OPTIONS.map((focus) => (
            <Button
              key={focus}
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, focus }))}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all normal-case tracking-normal ${
                state.focus === focus
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}
            >
              {focusAreaInfo[focus].name}
            </Button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Difficulty
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((d) => (
            <Button
              key={d.value}
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, difficulty: d.value }))}
              className={`min-h-[48px] rounded-xl text-sm font-medium transition-all normal-case tracking-normal ${
                state.difficulty === d.value
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-card border border-border'
              } ${d.color}`}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sports */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Relevant Sports
        </label>
        <div className="flex gap-2">
          {SPORT_OPTIONS.map((s) => (
            <Button
              key={s.value}
              variant="ghost"
              size="sm"
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  sportRelevance: prev.sportRelevance.includes(s.value)
                    ? prev.sportRelevance.filter(sp => sp !== s.value)
                    : [...prev.sportRelevance, s.value]
                }))
              }}
              className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all normal-case tracking-normal ${
                state.sportRelevance.includes(s.value)
                  ? 'bg-primary/20 border-2 border-primary text-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Exercises Step Component
function ExercisesStep({
  exercises,
  onAdd,
  onRemove,
  onUpdate
}: {
  exercises: CustomWorkoutExercise[]
  onAdd: () => void
  onRemove: (exercise: CustomWorkoutExercise) => void
  onUpdate: (id: string, updates: Partial<CustomWorkoutExercise>) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {exercises.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
            <Plus size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">No exercises added yet</p>
          <Button
            onClick={onAdd}
            variant="primary"
            size="md"
            className="px-6 py-3"
          >
            Add First Exercise
          </Button>
        </div>
      ) : (
        <>
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="card-elevated rounded-xl overflow-hidden"
            >
              <Button
                onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                variant="ghost"
                size="sm"
                className="w-full p-4 flex items-center gap-3 text-left normal-case tracking-normal h-auto items-start justify-start"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {exercise.sets} sets × {exercise.reps || `${exercise.duration}s`}
                  </p>
                </div>
                {expandedId === exercise.id ? (
                  <ChevronDown size={20} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={20} className="text-muted-foreground" />
                )}
              </Button>

              {expandedId === exercise.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Sets</label>
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => onUpdate(exercise.id, { sets: parseInt(e.target.value) || 1 })}
                        className="text-center text-sm"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <Input
                        type="number"
                        value={exercise.reps || ''}
                        onChange={(e) => onUpdate(exercise.id, { reps: parseInt(e.target.value) || undefined })}
                        className="text-center text-sm"
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Rest (s)</label>
                      <Input
                        type="number"
                        value={exercise.restTime}
                        onChange={(e) => onUpdate(exercise.id, { restTime: parseInt(e.target.value) || 60 })}
                        className="text-center text-sm"
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <Input
                      type="text"
                      value={exercise.notes || ''}
                      onChange={(e) => onUpdate(exercise.id, { notes: e.target.value })}
                      placeholder="Optional notes..."
                      className="text-sm"
                    />
                  </div>
                  <Button
                    onClick={() => onRemove(exercise)}
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 bg-red-500/10 text-red-400 rounded-lg font-medium gap-2 normal-case tracking-normal"
                  >
                    <Trash size={16} />
                    Remove Exercise
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button
            onClick={onAdd}
            variant="ghost"
            size="lg"
            fullWidth
            className="border-2 border-dashed border-border rounded-xl gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors normal-case tracking-normal"
          >
            <Plus size={20} />
            Add Exercise
          </Button>
        </>
      )}
    </div>
  )
}

// Review Step Component
function ReviewStep({ state, estimatedDuration }: { state: WorkoutBuilderState; estimatedDuration: number }) {
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="card-elevated rounded-xl p-5">
        <h3 className="text-xl font-bold text-foreground mb-1">{state.name || 'Untitled Workout'}</h3>
        <p className="text-sm text-muted-foreground mb-4">{state.description || 'No description'}</p>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-black text-foreground">{estimatedDuration}</p>
            <p className="text-xs text-muted-foreground uppercase">Minutes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-foreground">{state.exercises.length}</p>
            <p className="text-xs text-muted-foreground uppercase">Exercises</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-foreground capitalize">{state.difficulty.slice(0, 3)}</p>
            <p className="text-xs text-muted-foreground uppercase">Level</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
            {focusAreaInfo[state.focus].name}
          </span>
          {state.sportRelevance.map(sport => (
            <span key={sport} className="px-2 py-1 bg-card text-muted-foreground text-xs font-medium rounded capitalize">
              {sport}
            </span>
          ))}
          <span className="px-2 py-1 text-xs font-medium rounded bg-card text-muted-foreground">
            Private
          </span>
        </div>
      </div>

      {/* Exercise List */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Exercises
        </p>
        <div className="space-y-2">
          {state.exercises.map((exercise, index) => (
            <div key={exercise.id} className="bg-card rounded-lg p-3 flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exercise.sets} sets × {exercise.reps || `${exercise.duration}s`} • {exercise.restTime}s rest
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
