'use client'

import React, { useCallback } from 'react'
import { Screen, SportType, DrillCategory, Drill, Routine, LearningPath } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import {
  categoryInfo,
  routines,
  learningPaths,
  allDrills,
  getDrillsByCategory
} from '@/lib/drills-data'
import { BackButton } from '@/components/ui/back-button'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import {
  Shield, Stretch, Target, Flame, Heart, Zap, Activity, Book,
  ChevronRight, Refresh
} from '@/components/ui/icons'

// Map category to icon component
const categoryIcons: Record<DrillCategory, React.ReactNode> = {
  'technique': <Target size={24} className="text-primary" />,
  'exercise': <Zap size={24} className="text-primary" />,
  'injury-prevention': <Shield size={24} className="text-primary" />,
  'mobility': <Stretch size={24} className="text-primary" />,
  'conditioning': <Flame size={24} className="text-primary" />,
  'warmup': <Activity size={24} className="text-primary" />,
  'recovery': <Heart size={24} className="text-primary" />
}

interface TrainingHubProps {
  sport: SportType
  currentWorkoutFocus?: string
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onSelectDrill: (drill: Drill) => void
  onSelectCategory: (category: DrillCategory) => void
  onSelectRoutine: (routine: Routine) => void
  onSelectLearningPath: (path: LearningPath) => void
  onSelectBodyPart: () => void
  learningPathProgress?: Record<string, number>
  recentlyViewed?: string[]
}

export function TrainingHub({
  sport,
  currentWorkoutFocus,
  trainingTarget,
  onNavigate,
  onSelectDrill,
  onSelectCategory,
  onSelectRoutine,
  onSelectLearningPath,
  onSelectBodyPart,
  learningPathProgress = {},
  recentlyViewed = []
}: TrainingHubProps) {
  const { isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
    onRefresh: () => {}
  })

  // Get recommended warmup/recovery based on current workout
  const getRecommendedRoutines = useCallback(() => {
    const warmups = routines.filter(r =>
      r.type === 'warmup' &&
      (r.forSport?.includes(sport) || r.forWorkoutFocus?.some(f => currentWorkoutFocus?.includes(f)))
    )
    const recoveries = routines.filter(r =>
      r.type === 'recovery' &&
      r.forWorkoutFocus?.some(f => currentWorkoutFocus?.includes(f))
    )
    return { warmups: warmups.slice(0, 1), recoveries: recoveries.slice(0, 1) }
  }, [sport, currentWorkoutFocus])

  const { warmups, recoveries } = getRecommendedRoutines()

  // Get learning paths for current sport
  const sportPaths = learningPaths.filter(p => p.sport === sport)

  // Get recently viewed drills
  const recentDrills = recentlyViewed
    .map(id => allDrills.find(d => d.id === id))
    .filter((d): d is Drill => d !== undefined)
    .slice(0, 5)

  const handleCategoryClick = (category: DrillCategory) => {
    if (category === 'injury-prevention') {
      onSelectBodyPart()
    } else {
      onSelectCategory(category)
    }
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto pb-32"
        >
          {/* Pull to refresh indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-4">
              <Refresh size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Header */}
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={() => onNavigate('home')} label="Back" />
            <h1 className="text-3xl font-black tracking-tight mt-4">Learn</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Drills, techniques, and injury prevention
            </p>
          </div>

        {/* For You Today */}
        {(warmups.length > 0 || recoveries.length > 0) && (
          <div className="px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              For You Today
            </h2>
            <div className="space-y-2">
              {warmups.map(routine => (
                <Button
                  key={routine.id}
                  onClick={() => onSelectRoutine(routine)}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-card border border-primary/30 rounded-lg p-4 text-left hover:bg-card/80 transition-colors normal-case tracking-normal h-auto items-start justify-start"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Shield size={20} className="text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold">Pre-Workout Warmup</span>
                        <p className="text-sm text-muted-foreground">{routine.name} · {routine.duration} min</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </Button>
              ))}
              {recoveries.map(routine => (
                <Button
                  key={routine.id}
                  onClick={() => onSelectRoutine(routine)}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-card border border-primary/30 rounded-lg p-4 text-left hover:bg-card/80 transition-colors normal-case tracking-normal h-auto items-start justify-start"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Heart size={20} className="text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold">Post-Workout Recovery</span>
                        <p className="text-sm text-muted-foreground">{routine.name} · {routine.duration} min</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Browse Library */}
        <div className="px-6 py-4">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            Browse Library
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(categoryInfo) as [DrillCategory, typeof categoryInfo[DrillCategory]][]).map(([category, info]) => {
              const drillCount = getDrillsByCategory(category).length
              if (drillCount === 0 && category !== 'injury-prevention' && category !== 'conditioning' && category !== 'recovery') return null

              return (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  variant="secondary"
                  size="sm"
                  stacked
                  className="card-elevated rounded-xl p-4 text-left min-h-[110px] card-interactive normal-case tracking-normal h-auto items-start justify-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    {categoryIcons[category]}
                  </div>
                  <h3 className="font-semibold">{info.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category === 'injury-prevention' ? 'By body part' : `${drillCount} drills`}
                  </p>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Learning Paths */}
        {sportPaths.length > 0 && (
          <div className="px-6 py-6">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
              Learning Paths
            </h2>
            <div className="space-y-3">
              {sportPaths.map((path, index) => {
                const progress = learningPathProgress[path.id] || 0
                const progressPercent = Math.round((progress / path.drills.length) * 100)

                return (
                  <Button
                    key={path.id}
                    onClick={() => onSelectLearningPath(path)}
                    variant="ghost"
                    size="sm"
                    stacked
                    className="w-full card-elevated rounded-xl p-4 text-left card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Book size={16} className="text-primary" />
                        </div>
                        <span className="font-semibold">{path.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{path.estimatedWeeks} weeks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          boxShadow: progressPercent > 0 ? '0 0 10px rgba(139, 0, 0, 0.5)' : 'none'
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progress}/{path.drills.length} completed · {path.difficulty}
                    </p>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {recentDrills.length > 0 && (
          <div className="px-6 py-4 pb-8">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Recently Viewed
            </h2>
            <HorizontalScroll gap={8}>
              {recentDrills.map(drill => (
                <Button
                  key={drill.id}
                  onClick={() => onSelectDrill(drill)}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-3 text-sm hover:bg-card/80 transition-colors min-h-[44px] normal-case tracking-normal h-auto"
                >
                  {drill.name}
                </Button>
              ))}
            </HorizontalScroll>
          </div>
        )}
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav
          active="training"
          trainingTarget={trainingTarget}
          onNavigate={onNavigate}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
