'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { Drill, LearningPath, Screen } from '@/lib/types'
import { drillsService } from '@/lib/drills-service'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { haptics } from '@/lib/haptics'
import { Book, Check, ChevronRight, Clock, Refresh, Target, Trophy } from '@/components/ui/icons'

// Breadcrumb component
function Breadcrumb({
  items,
  variant = 'default'
}: {
  items: Array<{ label: string; onClick?: () => void }>
  variant?: 'default' | 'glass'
}) {
  return (
    <nav className="flex items-center gap-1.5 text-xs mb-2" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight size={12} className={`${variant === 'glass' ? 'text-white/30' : 'text-muted-foreground/50'} flex-shrink-0`} />
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={() => {
                  haptics.light()
                  item.onClick!()
                }}
                className={`${variant === 'glass' ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground'} transition-colors truncate max-w-[100px]`}
              >
                {item.label}
              </button>
            ) : (
              <span className={`truncate max-w-[120px] ${isLast ? (variant === 'glass' ? 'text-white font-bold' : 'text-foreground font-medium') : (variant === 'glass' ? 'text-white/60' : 'text-muted-foreground')}`}>
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

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
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
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
  initialScrollTop,
  onScrollChange
}: LearningPathScreenProps) {
  const [drills, setDrills] = useState<Drill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position after loading completes
  useEffect(() => {
    if (!isLoading && initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollTop
            hasRestoredScroll.current = true
          }
        })
      })
    }
  }, [isLoading, initialScrollTop])

  // Handle scroll to save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

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
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div className="pb-32">
          {/* Hero Header with Indigo Gradient */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-indigo-900 to-background opacity-50" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Paths" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: 'Learning Paths' },
                    { label: path.name }
                  ]}
                  variant="glass"
                />
              </div>

              {/* Path Badge */}
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Book size={18} className="text-indigo-300" />
                </div>
                <span className="text-xs font-bold tracking-[0.15em] text-indigo-200 uppercase">
                  Learning Path
                </span>
              </div>

              <h1 className="text-3xl font-black text-foreground tracking-tight">
                {path.name}
              </h1>
              <p className="text-sm text-indigo-100/70 mt-2 leading-relaxed">
                {path.description}
              </p>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 capitalize font-medium">{path.sport}</span>
                <span className={`rounded-lg px-3 py-1.5 font-bold uppercase ${
                  path.difficulty === 'beginner' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  path.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>{path.difficulty}</span>
                <span className="rounded-lg px-3 py-1.5 bg-white/5 border border-white/10 text-foreground/70">{path.estimatedWeeks} weeks</span>
                <span className="rounded-lg px-3 py-1.5 bg-white/5 border border-white/10 text-foreground/70 flex items-center gap-1.5">
                  <Clock size={12} />
                  {totalMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-6 -mt-4 relative z-20">
            {/* Progress Card with Gradient */}
            <div className="card-glass rounded-2xl p-5 mb-6 border border-indigo-500/20 stagger-item">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Trophy size={16} className="text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Target size={16} className="text-indigo-400" />
                    </div>
                  )}
                  <p className="text-sm font-bold text-foreground">
                    {isComplete ? 'Path Complete!' : 'Your Progress'}
                  </p>
                </div>
                <p className="text-xs font-semibold text-indigo-300">{boundedCompletedSteps}/{totalSteps}</p>
              </div>

              {/* Progress Bar with Glow */}
              <div className="relative">
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent > 0 && (
                  <div
                    className="absolute top-0 h-3 bg-indigo-400/30 rounded-full blur-sm transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                )}
              </div>
              <p className="text-xs text-indigo-200/70 mt-2">{progressPercent}% complete</p>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!currentDrill && !isComplete}
                  onClick={handleStartOrContinue}
                  className={`h-14 rounded-xl font-black uppercase tracking-wider ${isComplete ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {isComplete ? '🎉 Path Complete!' : boundedCompletedSteps === 0 ? 'Start Path' : 'Continue Path'}
                </Button>

                {!isComplete && (
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={!currentDrill}
                    onClick={onAdvanceStep}
                    className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10"
                  >
                    <Check size={16} className="mr-2" />
                    Mark Current Step Complete
                  </Button>
                )}

                {boundedCompletedSteps > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={onResetProgress}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Reset Progress
                  </Button>
                )}
              </div>
            </div>

            {/* Drills List */}
            <div className="stagger-item" style={{ animationDelay: '100ms' }}>
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
                Path Steps ({drills.length})
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 card-elevated rounded-2xl">
                  <Refresh size={20} className="animate-spin text-indigo-400" />
                  <span className="text-sm text-muted-foreground ml-2">Loading drills...</span>
                </div>
              ) : drills.length === 0 ? (
                <div className="card-elevated rounded-2xl p-5">
                  <p className="text-sm text-foreground font-semibold">No drills found</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add drill mappings to this learning path in Supabase.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                          'w-full rounded-2xl p-4 text-left h-auto items-start justify-start border transition-all stagger-item',
                          isDone
                            ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                            : isCurrent
                              ? 'border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/15 ring-1 ring-indigo-500/30'
                              : 'border-white/10 bg-white/5 hover:bg-white/10',
                        ].join(' ')}
                        style={{ animationDelay: `${(index + 3) * 40}ms` }}
                        onClick={() => onOpenDrill(drill, index)}
                      >
                        <div className="w-full flex items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Step Number/Icon */}
                            <div className={[
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm',
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isCurrent
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-white/5 text-muted-foreground',
                            ].join(' ')}>
                              {isDone ? <Check size={18} /> : index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground truncate">
                                {drill.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock size={11} />
                                  {Math.max(1, Math.round((drill.duration ?? 0) / 60))} min
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  isDone
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isCurrent
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : 'bg-white/5 text-muted-foreground'
                                }`}>
                                  {isDone ? 'Done' : isCurrent ? 'Current' : 'Up next'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <ChevronRight size={18} className={`flex-shrink-0 ${isCurrent ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                        </div>
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
