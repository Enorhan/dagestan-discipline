'use client'

import { useEffect, useMemo, useState } from 'react'
import { Drill, Exercise, Screen, Session, SportType } from '@/lib/types'
import { drillsService } from '@/lib/drills-service'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ExerciseLibraryModal } from '@/components/ui/exercise-library-modal'
import { Input } from '@/components/ui/input'
import { Check, ChevronRight, ChevronUp, ChevronDown, Plus, Refresh, Trash, GripVertical, Edit } from '@/components/ui/icons'

type ExercisePickerItem = { id: string; name: string; videoUrl?: string | null }

interface TodayEditorProps {
  sport: SportType
  baseSession: Session | null
  session: Session | null
  removedExercises: Exercise[]

  activeDrillIds: string[]
  removedDrillIds: string[]
  drillDoneIds: Set<string>
  drillsLoggedAt: string | null

  hasOverrides: boolean
  hasBaseChanged: boolean
  canEditProgram: boolean

  onBack: () => void
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean

  onStartWorkout: () => void
  onResetToday: () => void
  onEditProgram: () => void

  onAddExercise: (picked: ExercisePickerItem) => void
  onReplaceExercise: (targetExerciseId: string, picked: ExercisePickerItem) => void
  onSetExerciseOrder: (orderIds: string[]) => void
  onUpdateExercise: (exerciseId: string, patch: { sets?: number; reps?: number | null; duration?: number | null; restTime?: number; notes?: string | null }) => void
  onResetExerciseEdits: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onRestoreExercise: (exerciseId: string) => void

  onRemoveDrill: (drillId: string) => void
  onRestoreDrill: (drillId: string) => void
  onToggleDrillDone: (drillId: string, done: boolean) => void
  onLogDrills: (params: { drillIds: string[]; durationMinutes: number; notes: string }) => void
  onOpenDrill: (drill: Drill) => void
}

const formatPrescription = (exercise: Exercise) => {
  if (exercise.duration) return `${exercise.duration}s`
  if (typeof exercise.reps === 'number') return `${exercise.reps} reps`
  return 'Reps'
}

export function TodayEditor({
  sport,
  baseSession,
  session,
  removedExercises,
  activeDrillIds,
  removedDrillIds,
  drillDoneIds,
  drillsLoggedAt,
  hasOverrides,
  hasBaseChanged,
  canEditProgram,
  onBack,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
  onStartWorkout,
  onResetToday,
  onEditProgram,
  onAddExercise,
  onReplaceExercise,
  onSetExerciseOrder,
  onUpdateExercise,
  onResetExerciseEdits,
  onRemoveExercise,
  onRestoreExercise,
  onRemoveDrill,
  onRestoreDrill,
  onToggleDrillDone,
  onLogDrills,
  onOpenDrill,
}: TodayEditorProps) {
  const [libraryMode, setLibraryMode] = useState<'add' | 'replace' | null>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [expandedEdits, setExpandedEdits] = useState<Set<string>>(() => new Set())
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null)
  const [dismissedBaseWarning, setDismissedBaseWarning] = useState(false)
  const [activeDrills, setActiveDrills] = useState<Drill[]>([])
  const [removedDrills, setRemovedDrills] = useState<Drill[]>([])
  const [isLoadingDrills, setIsLoadingDrills] = useState(false)

  const baseExerciseIds = useMemo(() => {
    return new Set((baseSession?.exercises ?? []).map((e) => e.id))
  }, [baseSession])

  const activeDrillsKey = useMemo(() => activeDrillIds.join('|'), [activeDrillIds])
  const removedDrillsKey = useMemo(() => removedDrillIds.join('|'), [removedDrillIds])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (activeDrillIds.length === 0 && removedDrillIds.length === 0) {
        setActiveDrills([])
        setRemovedDrills([])
        return
      }

      setIsLoadingDrills(true)
      try {
        const [active, removed] = await Promise.all([
          Promise.all(activeDrillIds.map((id) => drillsService.getDrillById(id))),
          Promise.all(removedDrillIds.map((id) => drillsService.getDrillById(id))),
        ])
        if (!mounted) return
        setActiveDrills(active.filter(Boolean) as Drill[])
        setRemovedDrills(removed.filter(Boolean) as Drill[])
      } finally {
        if (mounted) setIsLoadingDrills(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [activeDrillsKey, removedDrillsKey, activeDrillIds, removedDrillIds])

  useEffect(() => {
    if (!undoToast) return
    const t = setTimeout(() => setUndoToast(null), 6000)
    return () => clearTimeout(t)
  }, [undoToast])

  const title = session?.focus || baseSession?.focus || 'Today'
  const subtitle = baseSession?.day || 'Today'
  const sessionExerciseIds = useMemo(() => (session?.exercises ?? []).map((e) => e.id), [session])

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="pb-24">
          {/* Hero */}
          <div className="relative pt-4 pb-10 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background to-background opacity-60" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Back" styleVariant="glass" />
                {hasOverrides && (
                  <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    Edited
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-2">
                {subtitle}
              </p>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase mt-2 leading-none">
                {title}
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[320px] leading-relaxed">
                Adjust today without breaking your program template. Reset anytime.
              </p>

              {hasBaseChanged && !dismissedBaseWarning && (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-200">
                    Plan Updated
                  </p>
                  <p className="text-sm text-foreground/80 mt-2">
                    Your program template changed since you edited today. You can keep your edits or reset to the new plan.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => {
                        haptics.medium()
                        onResetToday()
                        setDismissedBaseWarning(true)
                      }}
                      variant="secondary"
                      size="sm"
                      className="h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 hover:bg-amber-500/15 normal-case tracking-normal"
                      withHaptic={false}
                    >
                      Reset to New Plan
                    </Button>
                    <Button
                      onClick={() => {
                        haptics.light()
                        setDismissedBaseWarning(true)
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                      withHaptic={false}
                    >
                      Keep My Edits
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => {
                    haptics.medium()
                    onStartWorkout()
                  }}
                  variant="primary"
                  size="lg"
                  className="flex-1 h-12 rounded-2xl font-black uppercase tracking-wider"
                  disabled={!session || session.exercises.length === 0}
                  withHaptic={false}
                >
                  Start Workout
                </Button>
                <Button
                  onClick={() => {
                    haptics.light()
                    onResetToday()
                  }}
                  variant="secondary"
                  size="lg"
                  className="h-12 px-4 rounded-2xl"
                  disabled={!hasOverrides}
                  withHaptic={false}
                >
                  <Refresh size={18} />
                </Button>
              </div>

              {canEditProgram && (
                <Button
                  onClick={() => {
                    haptics.light()
                    onEditProgram()
                  }}
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                >
                  Edit program template
                  <ChevronRight size={16} className="ml-1 text-white/40" />
                </Button>
              )}
            </div>
          </div>

          {/* Strength */}
          <div className="px-6 -mt-4 relative z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
                Strength Workout
              </h2>
              <Button
                onClick={() => {
                  haptics.light()
                  setReplaceTargetId(null)
                  setLibraryMode('add')
                }}
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
              >
                <Plus size={16} className="mr-2" />
                Add
              </Button>
            </div>

            {!session || session.exercises.length === 0 ? (
              <div className="card-elevated rounded-2xl p-5 border border-white/10 bg-card/40 backdrop-blur-xl">
                <EmptyState
                  title="No workout loaded"
                  message="Generate a program or pick exercises from the library to build today."
                  actionText="Browse Training Hub"
                  onAction={() => onNavigate('training-hub')}
                  variant="compact"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {session.exercises.map((exercise, index) => {
                  const isAdded = !baseExerciseIds.has(exercise.id)
                  const isEditing = expandedEdits.has(exercise.id)
                  const canMoveUp = index > 0
                  const canMoveDown = index < session.exercises.length - 1
                  return (
                    <div
                      key={`${exercise.id}-${index}`}
                      className="card-elevated rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-slate-500/15 via-black/70 to-black/90"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="pt-1 text-white/20">
                          <GripVertical size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground truncate">
                              {exercise.name}
                            </h3>
                            {isAdded && (
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                Added
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/60 mt-2">
                            {exercise.sets} sets · {formatPrescription(exercise)} · {exercise.restTime}s rest
                          </p>
                          {exercise.notes && (
                            <p className="text-xs text-white/40 mt-2 line-clamp-2">
                              {exercise.notes}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              onClick={() => {
                                haptics.light()
                                setReplaceTargetId(exercise.id)
                                setLibraryMode('replace')
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                              withHaptic={false}
                            >
                              Replace
                            </Button>
                            <Button
                              onClick={() => {
                                haptics.light()
                                setExpandedEdits((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(exercise.id)) next.delete(exercise.id)
                                  else next.add(exercise.id)
                                  return next
                                })
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                              withHaptic={false}
                            >
                              <Edit size={14} className="mr-2" />
                              {isEditing ? 'Close' : 'Edit'}
                            </Button>

                            <Button
                              onClick={() => {
                                if (!canMoveUp) return
                                haptics.light()
                                const ids = [...sessionExerciseIds]
                                const tmp = ids[index - 1]
                                ids[index - 1] = ids[index]
                                ids[index] = tmp
                                onSetExerciseOrder(ids)
                              }}
                              disabled={!canMoveUp}
                              variant="ghost"
                              size="sm"
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-40 normal-case tracking-normal"
                              withHaptic={false}
                            >
                              <ChevronUp size={16} className="mr-2" />
                              Up
                            </Button>
                            <Button
                              onClick={() => {
                                if (!canMoveDown) return
                                haptics.light()
                                const ids = [...sessionExerciseIds]
                                const tmp = ids[index + 1]
                                ids[index + 1] = ids[index]
                                ids[index] = tmp
                                onSetExerciseOrder(ids)
                              }}
                              disabled={!canMoveDown}
                              variant="ghost"
                              size="sm"
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-40 normal-case tracking-normal"
                              withHaptic={false}
                            >
                              <ChevronDown size={16} className="mr-2" />
                              Down
                            </Button>
                          </div>

                          {/* Inline Edit Panel */}
                          {isEditing && (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                                    Sets
                                  </label>
                                  <Input
                                    type="number"
                                    value={exercise.sets}
                                    min={1}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value, 10)
                                      const sets = Number.isFinite(value) && value > 0 ? value : 1
                                      onUpdateExercise(exercise.id, { sets })
                                    }}
                                    className="h-12 text-center font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                                    Rest (s)
                                  </label>
                                  <Input
                                    type="number"
                                    value={exercise.restTime}
                                    min={0}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value, 10)
                                      const restTime = Number.isFinite(value) && value >= 0 ? value : 0
                                      onUpdateExercise(exercise.id, { restTime })
                                    }}
                                    className="h-12 text-center font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                                    Reps
                                  </label>
                                  <Input
                                    type="number"
                                    value={exercise.reps ?? ''}
                                    min={0}
                                    onChange={(e) => {
                                      const raw = e.target.value
                                      if (raw === '') {
                                        onUpdateExercise(exercise.id, { reps: null })
                                        return
                                      }
                                      const value = parseInt(raw, 10)
                                      const reps = Number.isFinite(value) && value > 0 ? value : 0
                                      onUpdateExercise(exercise.id, { reps, duration: null })
                                    }}
                                    className="h-12 text-center font-bold"
                                    disabled={exercise.duration !== undefined}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                                    Time (s)
                                  </label>
                                  <Input
                                    type="number"
                                    value={exercise.duration ?? ''}
                                    min={0}
                                    onChange={(e) => {
                                      const raw = e.target.value
                                      if (raw === '') {
                                        onUpdateExercise(exercise.id, { duration: null })
                                        return
                                      }
                                      const value = parseInt(raw, 10)
                                      const duration = Number.isFinite(value) && value > 0 ? value : 0
                                      onUpdateExercise(exercise.id, { duration, reps: null })
                                    }}
                                    className="h-12 text-center font-bold"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">
                                  Notes
                                </label>
                                <Input
                                  type="text"
                                  value={exercise.notes ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    onUpdateExercise(exercise.id, { notes: value.trim() ? value : null })
                                  }}
                                  className="h-12"
                                  placeholder="Optional"
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    haptics.light()
                                    onResetExerciseEdits(exercise.id)
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="h-10 rounded-xl normal-case tracking-normal"
                                  withHaptic={false}
                                >
                                  Reset
                                </Button>
                                <Button
                                  onClick={() => {
                                    haptics.light()
                                    setExpandedEdits((prev) => {
                                      const next = new Set(prev)
                                      next.delete(exercise.id)
                                      return next
                                    })
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                                  withHaptic={false}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            haptics.light()
                            onRemoveExercise(exercise.id)
                            setUndoToast({
                              message: `Removed ${exercise.name}`,
                              onUndo: () => onRestoreExercise(exercise.id),
                            })
                          }}
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
                          aria-label={`Remove ${exercise.name} for today`}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {removedExercises.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold tracking-[0.2em] text-foreground/60 uppercase mb-3">
                  Removed
                </h3>
                <div className="space-y-2">
                  {removedExercises.map((exercise, index) => (
                    <div
                      key={`${exercise.id}-${index}`}
                      className="rounded-2xl p-4 border border-white/10 bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{exercise.name}</p>
                          <p className="text-xs text-white/50 mt-1">
                            {exercise.sets} sets · {formatPrescription(exercise)}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            haptics.light()
                            onRestoreExercise(exercise.id)
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                        >
                          <Check size={16} className="mr-2" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drills */}
          <div className="px-6 py-8">
            {(() => {
              const doneCount = activeDrills.filter(d => drillDoneIds.has(d.id)).length
              const total = activeDrills.length
              const hasDone = doneCount > 0
              const loggedLabel = drillsLoggedAt ? `Logged ${new Date(drillsLoggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : null

              return (
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
                      Drills Checklist
                    </h2>
                    {total > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {doneCount}/{total} done{loggedLabel ? ` · ${loggedLabel}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasDone && (
                      <Button
                        onClick={() => {
                          const doneDrills = activeDrills.filter(d => drillDoneIds.has(d.id))
                          if (doneDrills.length === 0) return
                          const totalSeconds = doneDrills.reduce((sum, d) => sum + (d.duration || 0), 0)
                          const durationMinutes = Math.max(1, Math.ceil(totalSeconds / 60))
                          const notes = `Drills: ${doneDrills.map(d => d.name).join(', ')}`
                          haptics.medium()
                          onLogDrills({ drillIds: doneDrills.map(d => d.id), durationMinutes, notes })
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                        withHaptic={false}
                      >
                        Log
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        haptics.light()
                        onNavigate('training-hub')
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                    >
                      Browse
                      <ChevronRight size={16} className="ml-1 text-white/40" />
                    </Button>
                  </div>
                </div>
              )
            })()}

            {isLoadingDrills ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Refresh size={16} className="animate-spin" />
                Loading drills...
              </div>
            ) : (
              <>
                {activeDrills.length === 0 ? (
                  <div className="rounded-2xl p-5 border border-white/10 bg-card/40 backdrop-blur-xl">
                    <p className="text-sm text-muted-foreground">
                      No drills added for today. Add drills from Training Hub to build a checklist.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDrills.map((drill) => {
                      const isDone = drillDoneIds.has(drill.id)
                      return (
                      <div
                        key={drill.id}
                        className={`card-elevated rounded-2xl p-4 border border-white/10 ${
                          isDone
                            ? 'bg-gradient-to-br from-emerald-500/15 via-black/70 to-black/90'
                            : 'bg-gradient-to-br from-indigo-500/15 via-black/70 to-black/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            onClick={() => {
                              haptics.light()
                              onToggleDrillDone(drill.id, !isDone)
                            }}
                            className={`h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                              isDone
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                            }`}
                            aria-pressed={isDone}
                            aria-label={isDone ? `Mark ${drill.name} not done` : `Mark ${drill.name} done`}
                          >
                            {isDone ? <Check size={16} /> : <span className="w-4 h-4 rounded-full border border-white/30" />}
                          </button>
                          <button
                            onClick={() => {
                              haptics.light()
                              onOpenDrill(drill)
                            }}
                            className="min-w-0 flex-1 text-left"
                            aria-label={`Open ${drill.name}`}
                          >
                            <h3 className="font-bold text-base text-foreground truncate">{drill.name}</h3>
                            <p className="text-xs text-white/60 mt-2 line-clamp-2">{drill.description}</p>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                haptics.light()
                                onRemoveDrill(drill.id)
                                setUndoToast({
                                  message: `Removed ${drill.name}`,
                                  onUndo: () => onRestoreDrill(drill.id),
                                })
                              }}
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
                              aria-label={`Remove ${drill.name} for today`}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}

                {removedDrills.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground/60 uppercase mb-3">
                      Removed Drills
                    </h3>
                    <div className="space-y-2">
                      {removedDrills.map((drill) => (
                        <div key={drill.id} className="rounded-2xl p-4 border border-white/10 bg-white/[0.02]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground truncate">{drill.name}</p>
                              <p className="text-xs text-white/50 mt-1 line-clamp-1">{drill.description}</p>
                            </div>
                            <Button
                              onClick={() => {
                                haptics.light()
                                onRestoreDrill(drill.id)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white normal-case tracking-normal"
                            >
                              <Check size={16} className="mr-2" />
                              Restore
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav
          active="home"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>

      {undoToast && (
        <div className="fixed left-0 right-0 bottom-24 z-50 px-6">
          <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-white/80 truncate">{undoToast.message}</p>
            <Button
              onClick={() => {
                haptics.light()
                undoToast.onUndo()
                setUndoToast(null)
              }}
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white normal-case tracking-normal flex-shrink-0"
              withHaptic={false}
            >
              Undo
            </Button>
          </div>
        </div>
      )}

      {libraryMode && (
        <ExerciseLibraryModal
          sport={sport}
          title={libraryMode === 'replace' ? 'Replace Exercise' : 'Add to Today'}
          onClose={() => {
            setLibraryMode(null)
            setReplaceTargetId(null)
          }}
          onPick={(picked) => {
            if (libraryMode === 'replace') {
              const targetId = replaceTargetId
              if (targetId) onReplaceExercise(targetId, picked)
            } else {
              onAddExercise(picked)
            }
            setLibraryMode(null)
            setReplaceTargetId(null)
            haptics.medium()
          }}
        />
      )}
    </ScreenShell>
  )
}
