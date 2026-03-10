'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import {
  EnhancedAthleteExerciseGroup,
  EnhancedExerciseData,
  ExerciseCategory,
  Screen,
  SportType,
} from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  X,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Video,
  Filter,
  Trophy,
  ArrowUpDown,
  Tag,
  Plus,
  Check,
} from '@/components/ui/icons'

const categoryLabels: Record<ExerciseCategory, { title: string; description: string }> = {
  'full-body': {
    title: 'Full Body',
    description: 'Total-body power and conditioning from elite athletes'
  },
  'legs': {
    title: 'Legs & Power',
    description: 'Explosive lower-body strength for takedowns and throws'
  },
  'chest': {
    title: 'Chest & Push',
    description: 'Pressing strength to control distance and pressure'
  },
  'shoulders': {
    title: 'Shoulders & Overhead',
    description: 'Overhead strength and stability for clinch work'
  },
  'back': {
    title: 'Back & Pull',
    description: 'Upper-back strength for lifting, pulling, and control'
  },
  'arms': {
    title: 'Arms & Grip',
    description: 'Biceps, triceps, and grip endurance for control'
  },
  'core': {
    title: 'Core & Rotation',
    description: 'Trunk stability and rotational power for scrambles'
  },
  'neck': {
    title: 'Neck',
    description: 'Neck strength and prehab for grappling demands'
  }
}

type ExerciseResultSortOption = 'priority' | 'name' | 'equipment'

interface ExerciseResultAthlete {
  athleteId: string
  athleteName: string
  achievements: string[]
  imageUrl?: string
  priority: number
}

interface ExerciseResult {
  exercise: EnhancedExerciseData
  athletes: ExerciseResultAthlete[]
  bestPriority: number
}

interface ExerciseDisplayResult extends ExerciseResult {
  matchedAthleteCount: number
}

interface SportCategoryExercisesProps {
  sport?: SportType
  category: ExerciseCategory
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onExerciseSelect?: (exercise: EnhancedExerciseData) => void
  onAddToToday?: (exercise: EnhancedExerciseData) => void
  todayExerciseIds?: Set<string>
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

const DEBOUNCE_DELAY = 300

const sortOptions: { value: ExerciseResultSortOption; label: string }[] = [
  { value: 'priority', label: 'Recommended' },
  { value: 'name', label: 'A–Z' },
  { value: 'equipment', label: 'Equipment' }
]

function getEquipmentFromResults(results: ExerciseResult[]): string[] {
  const equipmentSet = new Set<string>()

  results.forEach((result) => {
    result.exercise.equipment.forEach((equipmentItem) => {
      const normalized = equipmentItem.trim()
      if (normalized) {
        equipmentSet.add(normalized)
      }
    })
  })

  return Array.from(equipmentSet).sort((a, b) => a.localeCompare(b))
}

function buildExerciseResults(groups: EnhancedAthleteExerciseGroup[]): ExerciseResult[] {
  const resultMap = new Map<string, ExerciseResult>()

  groups.forEach((group) => {
    group.exercises.forEach((exercise) => {
      const existing = resultMap.get(exercise.id)
      const athleteEntry: ExerciseResultAthlete = {
        athleteId: group.athleteId,
        athleteName: group.athleteName,
        achievements: group.achievements,
        imageUrl: group.imageUrl,
        priority: exercise.priority,
      }

      if (!existing) {
        resultMap.set(exercise.id, {
          exercise: {
            ...exercise,
            athleteId: group.athleteId,
            athleteName: group.athleteName,
            athleteAchievements: group.achievements,
          },
          athletes: [athleteEntry],
          bestPriority: exercise.priority,
        })
        return
      }

      const athleteAlreadyIncluded = existing.athletes.some((athlete) => athlete.athleteId === group.athleteId)
      if (!athleteAlreadyIncluded) {
        existing.athletes.push(athleteEntry)
      }

      if (exercise.priority > existing.bestPriority) {
        existing.exercise = {
          ...exercise,
          athleteId: group.athleteId,
          athleteName: group.athleteName,
          athleteAchievements: group.achievements,
        }
        existing.bestPriority = exercise.priority
      }
    })
  })

  return Array.from(resultMap.values()).map((result) => ({
    ...result,
    athletes: [...result.athletes].sort((a, b) => b.priority - a.priority),
  }))
}

function formatExerciseName(name: string): string {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatPrescription(exercise: EnhancedExerciseData): string | null {
  const parts: string[] = []

  if (exercise.sets || exercise.reps) {
    parts.push(`${exercise.sets || 1}×${exercise.reps || 10}`)
  }

  if (exercise.weight) {
    parts.push(exercise.weight)
  }

  if (exercise.duration) {
    parts.push(exercise.duration)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

function ExerciseResultSkeleton() {
  return (
    <div className="card-elevated rounded-xl p-4 bg-card border border-border animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-3 w-3/4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

const exerciseLibraryTheme = {
  gradient: 'from-primary/25 via-background/95 to-background',
  color: 'text-primary',
  bg: 'bg-primary',
  textColor: 'text-primary/90',
  borderColor: 'border-primary/20'
} as const

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

export function SportCategoryExercises({
  category,
  dataVersion = 0,
  onNavigate,
  onBack,
  onExerciseSelect,
  onAddToToday,
  todayExerciseIds,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: SportCategoryExercisesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawExerciseResults, setRawExerciseResults] = useState<ExerciseResult[]>([])
  const [sortBy, setSortBy] = useState<ExerciseResultSortOption>('priority')
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null)
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase())
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchQuery])

  // Fetch data from Supabase with enhanced data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true)
    }

    setError(null)

    try {
      const groups = await athletesService.getEnhancedExercisesByCategory(category)
      const results = buildExerciseResults(groups)
      setRawExerciseResults(results)
      setAvailableEquipment(getEquipmentFromResults(results))
    } catch (err) {
      console.error('[SportCategoryExercises] Error fetching data:', err)
      setError('Failed to load exercises. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => {
    if (equipmentFilter && !availableEquipment.includes(equipmentFilter)) {
      setEquipmentFilter(null)
    }
  }, [availableEquipment, equipmentFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData, dataVersion])

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Pull to refresh hook with visual feedback
  const {
    isRefreshing: isPulling,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPull: 120
  })

  const trimmedQuery = debouncedQuery

  const exerciseResults = useMemo(() => {
    const includesQuery = (value?: string | null) => {
      if (!trimmedQuery || !value) {
        return false
      }

      return value.toLowerCase().includes(trimmedQuery)
    }

    let results: ExerciseDisplayResult[] = rawExerciseResults
      .map((result) => {
        const matchedAthleteCount = trimmedQuery
          ? result.athletes.filter((athlete) => (
              includesQuery(athlete.athleteName) ||
              athlete.achievements.some((achievement) => includesQuery(achievement))
            )).length
          : 0

        return {
          ...result,
          matchedAthleteCount,
        }
      })
      .filter((result) => {
        const exercise = result.exercise
        const matchesSearch = !trimmedQuery ||
          includesQuery(exercise.name) ||
          includesQuery(exercise.description) ||
          exercise.equipment.some((equipmentItem) => includesQuery(equipmentItem)) ||
          exercise.muscleGroups.some((muscleGroup) => includesQuery(muscleGroup)) ||
          result.matchedAthleteCount > 0

        const matchesEquipment = !equipmentFilter || exercise.equipment.includes(equipmentFilter)

        return matchesSearch && matchesEquipment
      })

    if (sortBy === 'name') {
      results = [...results].sort((a, b) => a.exercise.name.localeCompare(b.exercise.name))
    } else if (sortBy === 'equipment') {
      results = [...results].sort((a, b) =>
        (a.exercise.equipment[0] || 'zzz').localeCompare(b.exercise.equipment[0] || 'zzz')
      )
    } else {
      results = [...results].sort((a, b) => {
        if (b.bestPriority !== a.bestPriority) {
          return b.bestPriority - a.bestPriority
        }

        return a.exercise.name.localeCompare(b.exercise.name)
      })
    }

    return results
  }, [rawExerciseResults, trimmedQuery, equipmentFilter, sortBy])

  const totalExercises = exerciseResults.length
  const activeSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? 'Recommended'

  const clearSearch = () => {
    setSearchQuery('')
    setDebouncedQuery('')
  }

  const clearFilters = () => {
    setEquipmentFilter(null)
    setSortBy('priority')
  }

  const handleExerciseTap = (exercise: EnhancedExerciseData) => {
    haptics.light()
    if (onExerciseSelect) {
      onExerciseSelect(exercise)
    }
  }

  const theme = exerciseLibraryTheme

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div
          className="pb-[calc(9rem+env(safe-area-inset-bottom))]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Hero Header */}
          <div className={`relative safe-area-top pb-8 px-6 overflow-hidden`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Exercises" styleVariant="glass" />
                {!isLoading && !error && (
                  <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    {totalExercises} Exercises
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: 'Exercises', onClick: onBack },
                    { label: categoryLabels[category].title }
                  ]}
                  variant="glass"
                />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-foreground mt-2 uppercase">
                {categoryLabels[category].title}
              </h1>
              <p className="text-white/60 text-xs mt-2 max-w-[320px] leading-relaxed font-medium">
                Find the right {categoryLabels[category].title.toLowerCase()} exercise fast from the combined library, then use athlete sources as optional proof.
              </p>
            </div>
          </div>

          {/* Search and Filters - Compact Floating Design */}
          {!isLoading && !error && (
            <div className="px-6 -mt-6 relative z-30 space-y-3">
              <div className="card-glass p-1.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1 pr-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-xl ${sortBy !== 'priority' ? 'text-primary bg-primary/10' : 'text-white/60'}`}
                    onClick={() => {
                      haptics.light()
                      setShowSortOptions(!showSortOptions)
                      setShowFilterOptions(false)
                    }}
                  >
                    <ArrowUpDown size={18} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-xl ${equipmentFilter ? 'text-primary bg-primary/10' : 'text-white/60'}`}
                    onClick={() => {
                      haptics.light()
                      setShowFilterOptions(!showFilterOptions)
                      setShowSortOptions(false)
                    }}
                  >
                    <Filter size={18} />
                  </Button>
                </div>
              </div>

              {/* Dropdowns */}
              {showSortOptions && (
                <div className="card-glass absolute left-6 right-6 top-full mt-2 z-40 p-2 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] font-bold text-white/40 px-3 py-1 uppercase tracking-wider">Sort by</p>
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        haptics.light()
                        setSortBy(option.value)
                        setShowSortOptions(false)
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${sortBy === option.value ? 'bg-primary/20 text-primary font-bold' : 'text-white/70 hover:bg-white/5'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {showFilterOptions && (
                <div className="card-glass absolute left-6 right-6 top-full mt-2 z-40 p-2 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[240px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-white/40 px-3 py-1 uppercase tracking-wider">Equipment</p>
                  <button
                    onClick={() => {
                      haptics.light()
                      setEquipmentFilter(null)
                      setShowFilterOptions(false)
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${!equipmentFilter ? 'bg-primary/20 text-primary font-bold' : 'text-white/70 hover:bg-white/5'}`}
                  >
                    All Equipment
                  </button>
                  {availableEquipment.map(eq => (
                    <button
                      key={eq}
                      onClick={() => {
                        haptics.light()
                        setEquipmentFilter(eq)
                        setShowFilterOptions(false)
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${equipmentFilter === eq ? 'bg-primary/20 text-primary font-bold' : 'text-white/70 hover:bg-white/5'}`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh Indicator (Overlay style) */}
          {isPulling && (
            <div className="flex justify-center py-4 animate-in fade-in">
              <RefreshCw size={20} className="animate-spin text-primary" />
            </div>
          )}

          {/* Content Area */}
          <div className="px-6 py-6 pt-8">
            {!isLoading && !error && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {totalExercises} deduped results
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                  Sort: {activeSortLabel}
                </span>
                {equipmentFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light()
                      setEquipmentFilter(null)
                    }}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"
                  >
                    {equipmentFilter} · Clear
                  </button>
                )}
                {(equipmentFilter || sortBy !== 'priority') && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light()
                      clearFilters()
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {[1, 2, 3].map(i => (
                  <ExerciseResultSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="card-elevated rounded-xl p-6 border-destructive/20 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Failed to load exercises</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check your connection and try again
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => {
                    haptics.medium()
                    fetchData()
                  }}
                >
                  <RefreshCw size={14} />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && exerciseResults.length === 0 && (
              <EmptyState
                title={searchQuery ? 'No matches' : 'No exercises yet'}
                message={
                  searchQuery
                    ? `No results for "${searchQuery}"`
                    : `No ${categoryLabels[category].title.toLowerCase()} exercises are available yet.`
                }
                actionText={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? clearSearch : undefined}
                variant="compact"
              />
            )}

            {/* Exercise Results */}
            {!isLoading && !error && exerciseResults.length > 0 && (
              <div className="space-y-4">
                {exerciseResults.map((result, index) => {
                  const prescription = formatPrescription(result.exercise)
                  const visibleAthletes = result.athletes.slice(0, 3)
                  const extraAthleteCount = Math.max(0, result.athletes.length - visibleAthletes.length)
                  const topAchievement = result.athletes.find((athlete) => athlete.achievements.length > 0)?.achievements[0]

                  return (
                    <div
                      key={result.exercise.id}
                      className="group/card relative card-elevated rounded-2xl p-4 bg-card/60 backdrop-blur-sm border border-white/5 stagger-item hover:border-white/10 transition-all duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleExerciseTap(result.exercise)}
                          className="flex-1 min-w-0 text-left"
                          aria-label={`Open ${result.exercise.name}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground tracking-tight group-hover/card:text-primary transition-colors">
                              {formatExerciseName(result.exercise.name)}
                            </h3>
                            {result.exercise.videoUrl && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
                                <Video size={10} fill="currentColor" className="opacity-80" />
                                Video
                              </span>
                            )}
                            {result.bestPriority >= 8 && (
                              <span className={`inline-flex items-center gap-1 rounded-full border ${theme.borderColor} ${theme.bg}/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.textColor}`}>
                                <Trophy size={10} />
                                High value
                              </span>
                            )}
                            {trimmedQuery && result.matchedAthleteCount > 0 && (
                              <span className={`inline-flex items-center gap-1 rounded-full border ${theme.borderColor} bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${theme.color}`}>
                                {result.matchedAthleteCount} athlete match{result.matchedAthleteCount > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>

                          {result.exercise.description && (
                            <p className="mt-2 text-sm text-white/65 leading-relaxed line-clamp-2 max-w-[38rem]">
                              {result.exercise.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {prescription && (
                              <span className={`rounded-full border ${theme.borderColor} ${theme.bg}/10 px-3 py-1.5 text-[11px] font-bold ${theme.textColor}`}>
                                {prescription}
                              </span>
                            )}
                            {result.exercise.equipment.slice(0, 2).map((equipmentItem) => (
                              <span
                                key={equipmentItem}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/65"
                              >
                                <Tag size={11} />
                                {equipmentItem}
                              </span>
                            ))}
                            {result.exercise.muscleGroups.slice(0, 2).map((muscleGroup) => (
                              <span
                                key={muscleGroup}
                                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/55"
                              >
                                {muscleGroup}
                              </span>
                            ))}
                          </div>
                        </button>

                        <div className="flex items-center gap-2">
                          {onAddToToday && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={`h-10 w-10 rounded-xl border ${
                                todayExerciseIds?.has(result.exercise.id)
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                              }`}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                if (todayExerciseIds?.has(result.exercise.id)) return
                                haptics.medium()
                                onAddToToday(result.exercise)
                              }}
                              aria-label={todayExerciseIds?.has(result.exercise.id) ? 'Added to today' : 'Add to today'}
                            >
                              {todayExerciseIds?.has(result.exercise.id) ? <Check size={16} /> : <Plus size={16} />}
                            </Button>
                          )}
                          <ChevronRight size={18} className="mt-1 text-white/20 group-hover/card:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme.bg}/10 ${theme.color}`}>
                              <Trophy size={16} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                                Elite proof
                              </p>
                              <p className="text-xs text-white/65">
                                {result.athletes.length} athlete source{result.athletes.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                            Optional context
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {visibleAthletes.map((athlete) => (
                            <span
                              key={athlete.athleteId}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/75"
                            >
                              {athlete.athleteName}
                            </span>
                          ))}
                          {extraAthleteCount > 0 && (
                            <span className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] font-semibold text-white/45">
                              +{extraAthleteCount} more
                            </span>
                          )}
                        </div>

                        {topAchievement && (
                          <p className="mt-3 text-xs leading-relaxed text-white/55">
                            Featured source: {topAchievement}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
