'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { Screen, SportType, DrillCategory, Drill, Routine, LearningPath, Athlete, ExerciseCounts } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { athletesService } from '@/lib/athletes-service'
import { BackButton } from '@/components/ui/back-button'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { haptics } from '@/lib/haptics'
import {
  Shield, Stretch, Target, Flame, Heart, Zap, Activity, Book,
  ChevronRight, Refresh, Trophy, User, Clock
} from '@/components/ui/icons'

// Breadcrumb component (matching sport-exercise-categories.tsx)
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

interface TrainingHubProps {
  sport: SportType
  currentWorkoutFocus?: string
  onNavigate: (screen: Screen) => void
  onSelectDrill: (drill: Drill) => void
  onSelectCategory: (category: DrillCategory) => void
  onSelectRoutine: (routine: Routine) => void
  onSelectLearningPath: (path: LearningPath) => void
  onSelectBodyPart: () => void
  onSelectAthlete?: (athlete: Athlete) => void
  onSelectSport?: (sport: SportType) => void
  learningPathProgress?: Record<string, number>
  backScreen?: Screen
  session?: any // Today's workout session
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

export function TrainingHub({
  sport,
  currentWorkoutFocus,
  onNavigate,
  onSelectDrill,
  onSelectCategory,
  onSelectRoutine,
  onSelectLearningPath,
  onSelectBodyPart,
  onSelectAthlete,
  onSelectSport,
  learningPathProgress = {},
  backScreen = 'home',
  session,
  onStartAction,
  hasWorkoutToday = false
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
  }, [])

  const handleRefresh = useCallback(async () => {
    drillsService.clearCache()
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
          className="pb-24"
        >
          {/* Pull to refresh indicator */}
          {isRefreshing && (
            <div className="flex justify-center py-4">
              <Refresh size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Hero Header - matching sport pages */}
          <div className="relative pt-4 pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background to-background opacity-50" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10 pt-2">
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                Training Hub
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[280px] leading-relaxed">
                Elite athletes, exercises, drills, and learning paths for combat sports.
              </p>
            </div>
          </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Refresh size={24} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading training content...</p>
          </div>
        ) : (
          <>
        {/* For You Today */}
        {(warmups.length > 0 || recoveries.length > 0) && (
          <div className="px-6 py-4 -mt-4 relative z-20">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
              For You Today
            </h2>
            <div className="space-y-3">
              {warmups.map((routine, index) => (
                <Button
                  key={routine.id}
                  onClick={() => onSelectRoutine(routine)}
                  variant="secondary"
                  size="sm"
                  className="w-full rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-emerald-500/20 via-black/80 to-black/95"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-3 w-full">
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Shield size={20} className="text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-emerald-200">Pre-Workout Warmup</h3>
                          <p className="text-xs text-white/65 mt-1 leading-relaxed">{routine.name} · {routine.duration} min</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Recommended
                    </span>
                  </div>
                </Button>
              ))}
              {recoveries.map((routine, index) => (
                <Button
                  key={routine.id}
                  onClick={() => onSelectRoutine(routine)}
                  variant="secondary"
                  size="sm"
                  className="w-full rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-rose-500/20 via-black/80 to-black/95"
                  style={{ animationDelay: `${(warmups.length + index) * 50}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-3 w-full">
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                          <Heart size={20} className="text-rose-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-rose-200">Post-Workout Recovery</h3>
                          <p className="text-xs text-white/65 mt-1 leading-relaxed">{routine.name} · {routine.duration} min</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Recommended
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Elite Athletes */}
        {athletesData.length > 0 && (
          <div className="px-6 py-4">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
              Elite Athletes
            </h2>
            <HorizontalScroll gap={12}>
              {athletesData.map((athlete, index) => (
                <Button
                  key={athlete.id}
                  onClick={() => onSelectAthlete?.(athlete)}
                  variant="ghost"
                  className="flex-shrink-0 rounded-2xl p-5 text-left transition-all card-interactive min-w-[180px] normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-amber-500/20 via-black/80 to-black/95"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Trophy size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-amber-200">{athlete.name}</h3>
                      <p className="text-xs text-white/65 mt-1 leading-relaxed line-clamp-2">
                        {athlete.achievements?.[0] || athlete.sport}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      View Profile
                    </span>
                  </div>
                </Button>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {/* General Exercises Library */}
        <div className="px-6 py-4">
          <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
            Exercise Library
          </h2>

          {/* My Workout Card */}
          <Button
            onClick={() => onNavigate('today-editor')}
            variant="secondary"
            size="sm"
            className="w-full rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start mb-4 border border-white/10 bg-gradient-to-br from-cyan-500/20 via-black/80 to-black/95"
            style={{ animationDelay: '0ms' }}
          >
            <div className="relative z-10 flex flex-col gap-3 w-full">
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Clock size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-cyan-200">My Workout</h3>
                    {session ? (
                      <>
                        <p className="text-xs text-white/65 mt-1 leading-relaxed">{session.day}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {session.focus} · {session.exercises.length} exercises · {session.duration} min
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-white/65 mt-1 leading-relaxed">No workout scheduled for today</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Edit Today
              </span>
            </div>
          </Button>

          {/* Browse by Martial Art */}
          <div className="space-y-3">
            {/* Wrestling Card */}
            <Button
              onClick={() => {
                onSelectSport?.('wrestling')
                onNavigate('sport-exercise-categories')
              }}
              variant="secondary"
              size="sm"
              className="w-full card-elevated rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-red-500/20 via-black/80 to-black/95"
              style={{ animationDelay: '0ms' }}
            >
              <div className="relative z-10 flex flex-col gap-3 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div>
                    <h3 className="font-bold text-base text-red-200">Wrestling</h3>
                    <p className="text-xs text-white/65 mt-1 leading-relaxed">
                      Athlete exercises from world-class wrestlers
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                </div>
                {exerciseCounts && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.athletesBySport.wrestling} athletes
                    </span>
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.bySport.wrestling} exercises
                    </span>
                  </div>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Browse Training
                </span>
              </div>
            </Button>

            {/* Judo Card */}
            <Button
              onClick={() => {
                onSelectSport?.('judo')
                onNavigate('sport-exercise-categories')
              }}
              variant="secondary"
              size="sm"
              className="w-full card-elevated rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-blue-500/20 via-black/80 to-black/95"
              style={{ animationDelay: '50ms' }}
            >
              <div className="relative z-10 flex flex-col gap-3 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div>
                    <h3 className="font-bold text-base text-blue-200">Judo</h3>
                    <p className="text-xs text-white/65 mt-1 leading-relaxed">
                      Olympic champions' strength and throw prep
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                </div>
                {exerciseCounts && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.athletesBySport.judo} athletes
                    </span>
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.bySport.judo} exercises
                    </span>
                  </div>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Browse Training
                </span>
              </div>
            </Button>

            {/* Ju Jitsu Card */}
            <Button
              onClick={() => {
                onSelectSport?.('bjj')
                onNavigate('sport-exercise-categories')
              }}
              variant="secondary"
              size="sm"
              className="w-full card-elevated rounded-2xl p-5 text-left transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-purple-500/20 via-black/80 to-black/95"
              style={{ animationDelay: '100ms' }}
            >
              <div className="relative z-10 flex flex-col gap-3 w-full">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div>
                    <h3 className="font-bold text-base text-purple-200">Ju Jitsu</h3>
                    <p className="text-xs text-white/65 mt-1 leading-relaxed">
                      Elite grapplers' strength and conditioning
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                </div>
                {exerciseCounts && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.athletesBySport.bjj} athletes
                    </span>
                    <span className="border border-white/15 rounded-full px-2.5 py-1">
                      {exerciseCounts.bySport.bjj} exercises
                    </span>
                  </div>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Browse Training
                </span>
              </div>
            </Button>
          </div>
        </div>

        {/* Browse Library */}
        <div className="px-6 py-4">
          <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
            Browse Library
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(categoryInfo) as [DrillCategory, typeof categoryInfo[DrillCategory]][]).map(([category, info], index) => {
              const drillCount = drillCounts[category]
              if (drillCount === 0 && category !== 'injury-prevention' && category !== 'conditioning' && category !== 'recovery') return null

              // Category-specific gradients matching sport page styling
              const categoryGradients: Record<DrillCategory, { gradient: string; textColor: string; iconBg: string }> = {
                'technique': { gradient: 'from-orange-500/20 via-black/80 to-black/95', textColor: 'text-orange-200', iconBg: 'bg-orange-500/20' },
                'exercise': { gradient: 'from-blue-500/20 via-black/80 to-black/95', textColor: 'text-blue-200', iconBg: 'bg-blue-500/20' },
                'injury-prevention': { gradient: 'from-emerald-500/20 via-black/80 to-black/95', textColor: 'text-emerald-200', iconBg: 'bg-emerald-500/20' },
                'mobility': { gradient: 'from-purple-500/20 via-black/80 to-black/95', textColor: 'text-purple-200', iconBg: 'bg-purple-500/20' },
                'conditioning': { gradient: 'from-red-500/20 via-black/80 to-black/95', textColor: 'text-red-200', iconBg: 'bg-red-500/20' },
                'warmup': { gradient: 'from-yellow-500/20 via-black/80 to-black/95', textColor: 'text-yellow-200', iconBg: 'bg-yellow-500/20' },
                'recovery': { gradient: 'from-pink-500/20 via-black/80 to-black/95', textColor: 'text-pink-200', iconBg: 'bg-pink-500/20' }
              }
              const catStyle = categoryGradients[category]

              return (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  variant="secondary"
                  size="sm"
                  stacked
                  className={`rounded-2xl p-5 text-left min-h-[130px] card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br ${catStyle.gradient}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="relative z-10 flex flex-col gap-2 w-full h-full">
                    <div className={`w-10 h-10 rounded-xl ${catStyle.iconBg} flex items-center justify-center`}>
                      {categoryIcons[category]}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${catStyle.textColor}`}>{info.name}</h3>
                      <p className="text-xs text-white/65 mt-1 leading-relaxed">
                        {category === 'injury-prevention' ? 'By body part' : `${drillCount} drills`}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Browse
                    </span>
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
                    className="w-full rounded-2xl p-5 text-left card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start border border-white/10 bg-gradient-to-br from-indigo-500/20 via-black/80 to-black/95"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative z-10 flex flex-col gap-3 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Book size={18} className="text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-indigo-200">{path.name}</h3>
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
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                          Continue
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
          </>
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
