'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Screen, SportType, DrillCategory, Drill, Routine, LearningPath, Athlete, ExerciseCounts } from '@/lib/types'
import { PREMIUM_FEATURES } from '@/lib/premium-gate'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { athletesService } from '@/lib/athletes-service'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { haptics } from '@/lib/haptics'
import {
  Shield, Stretch, Target, Flame, Heart, Zap, Activity, Book,
  ChevronRight, Refresh, Trophy, Clock, Lock
} from '@/components/ui/icons'

// Map category to icon component with matching colors
const categoryIcons: Record<DrillCategory, React.ReactNode> = {
  'technique': <Target size={20} className="text-orange-400" />,
  'exercise': <Zap size={20} className="text-blue-400" />,
  'injury-prevention': <Shield size={20} className="text-emerald-400" />,
  'mobility': <Stretch size={20} className="text-purple-400" />,
  'conditioning': <Flame size={20} className="text-red-400" />,
  'warmup': <Activity size={20} className="text-yellow-400" />,
  'recovery': <Heart size={20} className="text-pink-400" />
}

const sportNames: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu'
}

const sportCardThemes: Record<SportType, { gradient: string; iconBg: string; iconColor: string }> = {
  wrestling: {
    gradient: 'from-red-500/20 via-black/80 to-black/95',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-200'
  },
  judo: {
    gradient: 'from-blue-500/20 via-black/80 to-black/95',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-200'
  },
  bjj: {
    gradient: 'from-purple-500/20 via-black/80 to-black/95',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-200'
  }
}

interface TrainingHubProps {
  sport: SportType
  dataVersion?: number
  currentWorkoutFocus?: string
  onNavigate: (screen: Screen) => void
  onSelectDrill: (drill: Drill) => void
  onSelectCategory: (category: DrillCategory) => void
  onOpenSportDrills?: (sport: SportType) => void
  onSelectRoutine: (routine: Routine) => void
  onSelectLearningPath: (path: LearningPath) => void
  onSelectBodyPart: () => void
  onSelectAthlete?: (athlete: Athlete) => void
  onSelectSport?: (sport: SportType) => void
  learningPathProgress?: Record<string, number>
  isPremium?: boolean
  learningPathUsage?: number
  session?: any // Today's workout session
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

export function TrainingHub({
  sport,
  dataVersion = 0,
  currentWorkoutFocus,
  onNavigate,
  onSelectDrill,
  onSelectCategory,
  onOpenSportDrills,
  onSelectRoutine,
  onSelectLearningPath,
  onSelectBodyPart,
  onSelectAthlete,
  onSelectSport,
  learningPathProgress = {},
  isPremium = false,
  learningPathUsage = 0,
  session,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: TrainingHubProps) {
  // Loading and data states
  const [isLoading, setIsLoading] = useState(true)
  const [routinesData, setRoutinesData] = useState<Routine[]>([])
  const [learningPathsData, setLearningPathsData] = useState<LearningPath[]>([])
  const [drillsData, setDrillsData] = useState<Drill[]>([])
  const [recentDrills, setRecentDrills] = useState<Drill[]>([])
  const [athletesData, setAthletesData] = useState<Athlete[]>([])
  const [drillCounts, setDrillCounts] = useState<Record<DrillCategory, number>>({
    'technique': 0,
    'exercise': 0,
    'injury-prevention': 0,
    'mobility': 0,
    'conditioning': 0,
    'warmup': 0,
    'recovery': 0
  })
  const [exerciseCounts, setExerciseCounts] = useState<ExerciseCounts | null>(null)

  // Scroll container ref for position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position AFTER loading completes
  useEffect(() => {
    if (!isLoading && initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      // Use multiple RAF to ensure DOM is fully painted
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

  // Fetch data on mount
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [drills, routines, paths, recent, athletes, exCounts] = await Promise.all([
          drillsService.getDrills(),
          drillsService.getRoutines(),
          drillsService.getLearningPaths(),
          drillsService.getRecentlyViewedDrills(5),
          athletesService.getAthletes(sport),
          athletesService.getExerciseCounts()
        ])

        if (isMounted) {
          setDrillsData(drills)
          setRoutinesData(routines)
          setLearningPathsData(paths)
          setRecentDrills(recent)
          setAthletesData(athletes)
          setExerciseCounts(exCounts)

          // Calculate drill counts per category
          const counts: Record<DrillCategory, number> = {
            'technique': 0,
            'exercise': 0,
            'injury-prevention': 0,
            'mobility': 0,
            'conditioning': 0,
            'warmup': 0,
            'recovery': 0
          }
          drills.forEach(d => {
            if (d.category in counts) {
              counts[d.category as DrillCategory]++
            }
          })
          setDrillCounts(counts)
        }
      } catch (error) {
        console.error('Error fetching training hub data:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [sport, dataVersion])

  const handleRefresh = useCallback(async () => {
    drillsService.clearCache()
    athletesService.clearCache()
    const [drills, routines, paths, recent, athletes] = await Promise.all([
      drillsService.getDrills(),
      drillsService.getRoutines(),
      drillsService.getLearningPaths(),
      drillsService.getRecentlyViewedDrills(5),
      athletesService.getAthletes(sport)
    ])
    setDrillsData(drills)
    setRoutinesData(routines)
    setLearningPathsData(paths)
    setRecentDrills(recent)
    setAthletesData(athletes)
    setExerciseCounts(await athletesService.getExerciseCounts())

    // Recalculate drill counts
    const counts: Record<DrillCategory, number> = {
      'technique': 0,
      'exercise': 0,
      'injury-prevention': 0,
      'mobility': 0,
      'conditioning': 0,
      'warmup': 0,
      'recovery': 0
    }
    drills.forEach(d => {
      if (d.category in counts) {
        counts[d.category as DrillCategory]++
      }
    })
    setDrillCounts(counts)
  }, [sport])

  const { isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
    onRefresh: handleRefresh
  })

  // Get recommended warmup/recovery based on current workout
  const getRecommendedRoutines = useCallback(() => {
    const warmups = routinesData.filter(r =>
      r.type === 'warmup' &&
      (r.forSport?.includes(sport) || r.forWorkoutFocus?.some(f => currentWorkoutFocus?.includes(f)))
    )
    const recoveries = routinesData.filter(r =>
      r.type === 'recovery' &&
      r.forWorkoutFocus?.some(f => currentWorkoutFocus?.includes(f))
    )
    return { warmups: warmups.slice(0, 1), recoveries: recoveries.slice(0, 1) }
  }, [sport, currentWorkoutFocus, routinesData])

  const { warmups, recoveries } = getRecommendedRoutines()

  // Get learning paths for current sport
  const sportPaths = learningPathsData.filter(p => p.sport === sport)
  const learningPathFreeLimit = PREMIUM_FEATURES['learning-paths'].freeLimit ?? 0

  const totalExerciseCount = useMemo(() => {
    if (!exerciseCounts) {
      return null
    }
    return Object.values(exerciseCounts.byCategory).reduce((sum, count) => sum + count, 0)
  }, [exerciseCounts])

  const drillSports = (['wrestling', 'judo', 'bjj'] as SportType[])
  const prepBrowseCategories = (['mobility', 'injury-prevention', 'conditioning'] as DrillCategory[])

  const handleExerciseBrowse = useCallback(() => {
    haptics.light()
    onSelectSport?.(sport)
    onNavigate('sport-exercise-categories')
  }, [onNavigate, onSelectSport, sport])

  const handleSportDrillBrowse = useCallback((targetSport: SportType) => {
    haptics.light()
    onOpenSportDrills?.(targetSport)
  }, [onOpenSportDrills])

  const handleCategoryClick = (category: DrillCategory) => {
    if (category === 'injury-prevention') {
      onSelectBodyPart()
    } else {
      onSelectCategory(category)
    }
  }

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pb-24"
        >
          {/* Pull to refresh indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-4">
              <Refresh size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Hero Header - matching sport pages */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background to-background opacity-50" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                Training Hub
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[280px] leading-relaxed">
                Split your library cleanly: open sport-specific drills when you want technique, or jump into global exercises by muscle group when you want training.
              </p>
            </div>
          </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="px-6 py-4 space-y-6">
            {/* Skeleton: For You section */}
            <div>
              <div className="h-3 w-24 bg-card/80 rounded animate-pulse mb-4" />
              <div className="rounded-2xl border border-white/10 bg-card/30 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-card/80" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-card/80 rounded mb-2" />
                    <div className="h-3 w-24 bg-card/80 rounded" />
                  </div>
                </div>
              </div>
            </div>
            {/* Skeleton: Athletes */}
            <div>
              <div className="h-3 w-20 bg-card/80 rounded animate-pulse mb-4" />
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-shrink-0 w-[180px] rounded-2xl border border-white/10 bg-card/30 p-5 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-card/80 mb-3" />
                    <div className="h-4 w-24 bg-card/80 rounded mb-2" />
                    <div className="h-3 w-32 bg-card/80 rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Skeleton: Exercise Library */}
            <div>
              <div className="h-3 w-28 bg-card/80 rounded animate-pulse mb-4" />
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-white/10 bg-card/30 p-5 mb-3 animate-pulse">
                  <div className="h-4 w-28 bg-card/80 rounded mb-2" />
                  <div className="h-3 w-48 bg-card/80 rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-card/80 rounded-full" />
                    <div className="h-5 w-24 bg-card/80 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            {/* Skeleton: Browse Library grid */}
            <div>
              <div className="h-3 w-24 bg-card/80 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-card/30 p-5 min-h-[130px] animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-card/80 mb-3" />
                    <div className="h-4 w-20 bg-card/80 rounded mb-2" />
                    <div className="h-3 w-16 bg-card/80 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
        <div className="px-6 py-4 -mt-4 relative z-20 space-y-4">
          <div>
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-2">
              Browse Library
            </h2>
            <p className="text-sm text-muted-foreground max-w-[32rem]">
              Open the new split fast: sport-specific drills on one side, global exercises by muscle group on the other.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {drillSports.map((targetSport) => {
              const theme = sportCardThemes[targetSport]
              return (
                <Button
                  key={targetSport}
                  onClick={() => handleSportDrillBrowse(targetSport)}
                  variant="secondary"
                  size="sm"
                  stacked
                  className={`rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-gradient-to-br ${theme.gradient}`}
                >
                  <div className="flex items-start justify-between w-full gap-3">
                    <div>
                      <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center mb-3`}>
                        <Target size={20} className={theme.iconColor} />
                      </div>
                      <h3 className={`font-bold text-sm ${theme.iconColor}`}>{sportNames[targetSport]} Drills</h3>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">
                        Technical drills only — no exercises mixed in.
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
                  </div>
                </Button>
              )
            })}

            <Button
              onClick={handleExerciseBrowse}
              variant="secondary"
              size="sm"
              stacked
              className="rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-primary/20 via-black/80 to-black/95"
            >
              <div className="flex items-start justify-between w-full gap-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
                    <Zap size={20} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-primary/95">Exercises</h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {totalExerciseCount !== null ? `${totalExerciseCount} global results across 8 muscle groups` : 'Browse all exercises by muscle group'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
              </div>
            </Button>
          </div>

          {session && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Today at a glance</p>
              <p className="text-sm text-foreground mt-1 font-semibold">{session.day}</p>
              <p className="text-xs text-white/60 mt-1">{session.focus} · {session.exercises.length} exercises · {session.duration} min</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-1">
                Today & Recovery
              </h2>
              <p className="text-xs text-muted-foreground">
                Keep the daily workflow one tap away: continue, warm up, or recover without leaving the hub.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => onNavigate('today-editor')}
              variant="secondary"
              size="sm"
              stacked
              className="rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-cyan-500/20 via-black/80 to-black/95"
            >
              <div className="flex items-start justify-between w-full gap-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
                    <Clock size={20} className="text-cyan-300" />
                  </div>
                  <h3 className="font-bold text-sm text-cyan-100">Continue Today</h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {session
                      ? `${session.focus} · ${session.exercises.length} exercises`
                      : 'Open today and build your session'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
              </div>
            </Button>

            <Button
              onClick={() => (warmups[0] ? onSelectRoutine(warmups[0]) : handleCategoryClick('warmup'))}
              variant="secondary"
              size="sm"
              stacked
              className="rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-amber-500/15 via-black/80 to-black/95"
            >
              <div className="flex items-start justify-between w-full gap-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
                    <Activity size={20} className="text-amber-300" />
                  </div>
                  <h3 className="font-bold text-sm text-amber-100">Warm Up</h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {warmups[0] ? `${warmups[0].name} · ${warmups[0].duration} min` : `${drillCounts.warmup} warmup drills`}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
              </div>
            </Button>

            <Button
              onClick={() => (recoveries[0] ? onSelectRoutine(recoveries[0]) : handleCategoryClick('recovery'))}
              variant="secondary"
              size="sm"
              stacked
              className="rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-slate-500/20 via-black/80 to-black/95"
            >
              <div className="flex items-start justify-between w-full gap-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center mb-3">
                    <Heart size={20} className="text-slate-300" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">Recover</h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {recoveries[0] ? `${recoveries[0].name} · ${recoveries[0].duration} min` : `${drillCounts.recovery} recovery options`}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
              </div>
            </Button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-1">
                Prep & Support
              </h2>
              <p className="text-xs text-muted-foreground">
                Supporting drill collections that still matter around the main sport-drills-plus-exercises split.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {prepBrowseCategories.map((category) => {
              const info = categoryInfo[category]
              const drillCount = drillCounts[category]
              return (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  variant="secondary"
                  size="sm"
                  stacked
                  className="rounded-2xl p-4 text-left h-auto items-start justify-start border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                        {categoryIcons[category]}
                      </div>
                      <h3 className="font-bold text-sm text-foreground">{info.name}</h3>
                      <p className="text-xs text-white/55 mt-1 leading-relaxed">
                        {category === 'injury-prevention' ? 'By body part' : `${drillCount} drills`}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-white/25 flex-shrink-0" />
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Learning Paths */}
        {sportPaths.length > 0 && (
          <div className="px-6 py-4">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
              Continue Learning
            </h2>
            <div className="space-y-3">
              {sportPaths.map((path, index) => {
                const progress = learningPathProgress[path.id] || 0
                const progressPercent = Math.round((progress / path.drills.length) * 100)
                const isLocked = (
                  !isPremium &&
                  learningPathFreeLimit > 0 &&
                  learningPathUsage >= learningPathFreeLimit &&
                  progress <= 0
                )

                return (
                  <Button
                    key={path.id}
                    onClick={() => onSelectLearningPath(path)}
                    variant="ghost"
                    size="sm"
                    stacked
                    className={[
                      'w-full rounded-2xl p-5 text-left card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border',
                      isLocked
                        ? 'border-amber-500/25 bg-gradient-to-br from-amber-600/10 via-black/85 to-black/95'
                        : 'border-white/10 bg-gradient-to-br from-indigo-500/20 via-black/80 to-black/95',
                    ].join(' ')}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative z-10 flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isLocked ? 'bg-amber-500/20' : 'bg-indigo-500/20'
                          }`}>
                            {isLocked
                              ? <Lock size={18} className="text-amber-400" />
                              : <Book size={18} className="text-indigo-400" />}
                          </div>
                          <div>
                            <h3 className={`font-bold text-base ${isLocked ? 'text-amber-100' : 'text-indigo-200'}`}>
                              {path.name}
                            </h3>
                            <p className="text-xs text-white/65 mt-0.5">{path.estimatedWeeks} weeks · {path.difficulty}</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-white/40 flex-shrink-0" />
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-400 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPercent}%`,
                            boxShadow: progressPercent > 0 ? '0 0 10px rgba(129, 140, 248, 0.5)' : 'none'
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/65">
                          {progress}/{path.drills.length} completed
                        </span>
                        <span className={`text-[10px] uppercase tracking-[0.2em] ${
                          isLocked ? 'text-amber-400/90' : 'text-white/40'
                        }`}>
                          {isLocked ? 'Premium' : 'Continue'}
                        </span>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {recentDrills.length > 0 && (
          <div className="px-6 py-4 pb-8">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
              Recently Viewed
            </h2>
            <HorizontalScroll gap={12}>
              {recentDrills.map((drill, index) => (
                <Button
                  key={drill.id}
                  onClick={() => onSelectDrill(drill)}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 rounded-2xl px-5 py-4 text-left transition-all card-interactive min-h-[44px] normal-case tracking-normal h-auto border border-white/10 bg-gradient-to-br from-slate-500/20 via-black/80 to-black/95"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-1">
                    <span className="font-bold text-sm text-slate-200">{drill.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      View Drill
                    </span>
                  </div>
                </Button>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {athletesData.length > 0 && (
          <div className="px-6 py-4 pb-8">
            <div className="mb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-1">
                Elite Inspiration
              </h2>
              <p className="text-xs text-muted-foreground">
                Optional deep dives when you want ideas and context after you already know what you need.
              </p>
            </div>
            <HorizontalScroll gap={12}>
              {athletesData.map((athlete, index) => (
                <Button
                  key={athlete.id}
                  onClick={() => onSelectAthlete?.(athlete)}
                  variant="ghost"
                  className="flex-shrink-0 rounded-2xl p-5 text-left transition-all card-interactive min-w-[180px] normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-primary/15 via-black/80 to-black/95"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Trophy size={20} className="text-primary/80" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-primary/90">{athlete.name}</h3>
                      <p className="text-xs text-white/65 mt-1 leading-relaxed line-clamp-2">
                        {athlete.achievements?.[0] || athlete.sport}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      View Themes
                    </span>
                  </div>
                </Button>
              ))}
            </HorizontalScroll>
          </div>
        )}
          </>
        )}
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
