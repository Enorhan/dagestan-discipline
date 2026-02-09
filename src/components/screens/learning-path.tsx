'use client'

import { useMemo, useState, useEffect } from 'react'
import type { Drill, LearningPath, Screen } from '@/lib/types'
import { drillsService } from '@/lib/drills-service'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Book, Check, ChevronRight, Clock, Refresh, Target } from '@/components/ui/icons'

interface LearningPathScreenProps {
  path: LearningPath
  dataVersion?: number
  completedSteps: number
  onBack: () => void
  onNavigate: (screen: Screen) => void
  onOpenDrill: (drill: Drill, drillIndex: number) => void
  onAdvanceStep: () => void
  onResetProgress: () => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

export function LearningPathScreen({
  path,
  dataVersion = 0,
  completedSteps,
  onBack,
  onNavigate,
  onOpenDrill,
  onAdvanceStep,
  onResetProgress,
  onStartAction,
  hasWorkoutToday = false,
}: LearningPathScreenProps) {
  const [drills, setDrills] = useState<Drill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadDrills = async () => {
      setIsLoading(true)
      try {
        const resolved = await Promise.all(
          path.drills.map((drillId) => drillsService.getDrillById(drillId))
        )

        if (!isMounted) return
        setDrills(resolved.filter((drill): drill is Drill => !!drill))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDrills()

    return () => {
      isMounted = false
    }
  }, [path.id, path.drills, dataVersion])

  const totalSteps = drills.length
  const boundedCompletedSteps = Math.min(completedSteps, totalSteps)
  const currentStepIndex = boundedCompletedSteps < totalSteps ? boundedCompletedSteps : -1
  const currentDrill = currentStepIndex >= 0 ? drills[currentStepIndex] : null
  const progressPercent = totalSteps > 0 ? Math.round((boundedCompletedSteps / totalSteps) * 100) : 0
  const isComplete = totalSteps > 0 && boundedCompletedSteps >= totalSteps

  const totalMinutes = useMemo(
    () => Math.round(drills.reduce((sum, drill) => sum + (drill.duration ?? 0), 0) / 60),
    [drills]
  )

  const handleStartOrContinue = () => {
    if (!currentDrill || currentStepIndex < 0) return
    onOpenDrill(currentDrill, currentStepIndex)
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="px-6 safe-area-top pb-28">
          <BackButton onClick={onBack} label="Back" />

          <div className="mt-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Book size={18} className="text-indigo-300" />
              </span>
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Learning Path
              </p>
            </div>

            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {path.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {path.description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full px-2 py-1 bg-card border border-border capitalize">{path.sport}</span>
              <span className="rounded-full px-2 py-1 bg-card border border-border capitalize">{path.difficulty}</span>
              <span className="rounded-full px-2 py-1 bg-card border border-border">{path.estimatedWeeks} weeks</span>
              <span className="rounded-full px-2 py-1 bg-card border border-border">{totalMinutes} min total</span>
            </div>
          </div>

          <div className="card-elevated rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Progress</p>
              <p className="text-xs text-muted-foreground">{boundedCompletedSteps}/{totalSteps} complete</p>
            </div>
            <div className="w-full bg-card rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{progressPercent}% finished</p>

            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={!currentDrill}
                onClick={handleStartOrContinue}
              >
                {isComplete ? 'Path Complete' : boundedCompletedSteps === 0 ? 'Start Path' : 'Continue Path'}
              </Button>

              {!isComplete && (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={!currentDrill}
                  onClick={onAdvanceStep}
                >
                  Mark Current Step Complete
                </Button>
              )}

              {boundedCompletedSteps > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={onResetProgress}
                >
                  Reset Path Progress
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Refresh size={16} className="animate-spin" />
              <span className="text-sm">Loading drills...</span>
            </div>
          ) : drills.length === 0 ? (
            <div className="card-elevated rounded-xl p-4">
              <p className="text-sm text-foreground font-semibold">No drills found for this path</p>
              <p className="text-xs text-muted-foreground mt-2">
                Add drill mappings to this learning path in Supabase and reopen the page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {drills.map((drill, index) => {
                const isDone = index < boundedCompletedSteps
                const isCurrent = index === currentStepIndex

                return (
                  <Button
                    key={drill.id}
                    variant="ghost"
                    size="sm"
                    stacked
                    className={[
                      'w-full rounded-xl p-4 text-left h-auto items-start justify-start border',
                      isDone ? 'border-emerald-500/30 bg-emerald-500/10' : isCurrent ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-border bg-card/40',
                    ].join(' ')}
                    onClick={() => onOpenDrill(drill, index)}
                  >
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={[
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          isDone ? 'bg-emerald-500/20 text-emerald-300' : isCurrent ? 'bg-indigo-500/20 text-indigo-300' : 'bg-card text-muted-foreground',
                        ].join(' ')}>
                          {isDone ? <Check size={16} /> : <Target size={16} />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            Step {index + 1}: {drill.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {Math.max(1, Math.round((drill.duration ?? 0) / 60))} min
                            </span>
                            <span className="capitalize">{drill.difficulty}</span>
                            <span>
                              {isDone ? 'Completed' : isCurrent ? 'Current step' : 'Upcoming'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                    </div>
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav
          active="learn"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
