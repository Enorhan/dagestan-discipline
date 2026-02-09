'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EnhancedAthleteExerciseGroup,
  EnhancedExerciseData,
  ExerciseCategory,
  ExerciseSortOption,
  Screen,
  SportType
} from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, X, ChevronRight, ChevronDown, AlertCircle, RefreshCw,
  Video, Filter, Trophy, Dumbbell, ArrowUpDown, Tag, Plus, Check
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

const sportLabels: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Ju Jitsu'
}

interface SportCategoryExercisesProps {
  sport: SportType
  category: ExerciseCategory
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onExerciseSelect?: (exercise: EnhancedExerciseData) => void
  onAddToToday?: (exercise: EnhancedExerciseData) => void
  todayExerciseIds?: Set<string>
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

const MAX_VISIBLE_EXERCISES = 6
const DEBOUNCE_DELAY = 300

const sortOptions: { value: ExerciseSortOption; label: string }[] = [
  { value: 'athlete', label: 'By Athlete' },
  { value: 'name', label: 'By Name' },
  { value: 'priority', label: 'By Priority' },
  { value: 'equipment', label: 'By Equipment' }
]

// Loading skeleton for athlete cards
function AthleteCardSkeleton() {
  return (
    <div className="card-elevated rounded-xl p-4 bg-card border border-border animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/3 mb-1" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(j => (
          <Skeleton key={j} className="h-10 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

const sportThemes: Record<SportType, { gradient: string; color: string; bg: string }> = {
  wrestling: {
    gradient: 'from-red-950 via-red-900 to-background',
    color: 'text-red-500',
    bg: 'bg-red-500'
  },
  judo: {
    gradient: 'from-blue-950 via-blue-900 to-background',
    color: 'text-blue-500',
    bg: 'bg-blue-500'
  },
  bjj: {
    gradient: 'from-purple-950 via-purple-900 to-background',
    color: 'text-purple-500',
    bg: 'bg-purple-500'
  }
}

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
  sport,
  category,
  dataVersion = 0,
  onNavigate,
  onBack,
  onExerciseSelect,
  onAddToToday,
  todayExerciseIds,
  onStartAction,
  hasWorkoutToday = false
}: SportCategoryExercisesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(() => new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawAthleteGroups, setRawAthleteGroups] = useState<EnhancedAthleteExerciseGroup[]>([])
  const [sortBy, setSortBy] = useState<ExerciseSortOption>('athlete')
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null)
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    try {
      const [groups, equipment] = await Promise.all([
        athletesService.getEnhancedExercisesBySportAndCategory(sport, category),
        athletesService.getEquipmentForSport(sport)
      ])
      setRawAthleteGroups(groups)
      setAvailableEquipment(equipment)
    } catch (err) {
      console.error('[SportCategoryExercises] Error fetching data:', err)
      setError('Failed to load exercises. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [sport, category])

  useEffect(() => {
    fetchData()
  }, [fetchData, dataVersion])

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Pull to refresh hook with visual feedback
  const {
    pullDistance,
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

  // Filter and sort groups based on search query and sort option
  const athleteGroups = useMemo(() => {
    let groups = rawAthleteGroups.map(group => {
      const athleteMatch = trimmedQuery
        ? group.athleteName.toLowerCase().includes(trimmedQuery)
        : true

      const filteredExercises = group.exercises.filter(exercise => {
        // Text search filter
        const matchesSearch = !trimmedQuery || athleteMatch ||
          exercise.name.toLowerCase().includes(trimmedQuery) ||
          exercise.equipment.some(eq => eq.toLowerCase().includes(trimmedQuery)) ||
          exercise.muscleGroups.some(mg => mg.toLowerCase().includes(trimmedQuery))

        // Equipment filter
        const matchesEquipment = !equipmentFilter ||
          exercise.equipment.includes(equipmentFilter)

        return matchesSearch && matchesEquipment
      })

      return {
        ...group,
        exercises: filteredExercises,
        athleteMatch
      }
    }).filter(group => group.exercises.length > 0)

    // Sort exercises within groups and groups themselves
    if (sortBy === 'name') {
      groups = groups.map(g => ({
        ...g,
        exercises: [...g.exercises].sort((a, b) => a.name.localeCompare(b.name))
      }))
    } else if (sortBy === 'priority') {
      groups = groups.map(g => ({
        ...g,
        exercises: [...g.exercises].sort((a, b) => b.priority - a.priority)
      }))
    } else if (sortBy === 'equipment') {
      groups = groups.map(g => ({
        ...g,
        exercises: [...g.exercises].sort((a, b) =>
          (a.equipment[0] || 'zzz').localeCompare(b.equipment[0] || 'zzz')
        )
      }))
    }

    return groups
  }, [rawAthleteGroups, trimmedQuery, equipmentFilter, sortBy])

  const totalExercises = athleteGroups.reduce((sum, group) => sum + group.exercises.length, 0)

  const toggleExpanded = (athleteId: string) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      if (next.has(athleteId)) {
        next.delete(athleteId)
      } else {
        next.add(athleteId)
      }
      return next
    })
  }

  const formatExerciseName = (name: string) => {
    if (!name) return name
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setDebouncedQuery('')
  }

  const clearFilters = () => {
    setEquipmentFilter(null)
    setSortBy('athlete')
  }

  const handleExerciseTap = (exercise: EnhancedExerciseData) => {
    haptics.light()
    if (onExerciseSelect) {
      onExerciseSelect(exercise)
    }
  }

  const theme = sportThemes[sport]

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div
          className="pb-24"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Hero Header */}
          <div className={`relative pt-4 pb-8 px-6 overflow-hidden`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label={sportLabels[sport]} styleVariant="glass" />
                {!isLoading && !error && (
                  <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    {totalExercises} Drills
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: sportLabels[sport], onClick: onBack },
                    { label: categoryLabels[category].title }
                  ]}
                  variant="glass"
                />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-foreground mt-2 uppercase">
                {categoryLabels[category].title}
              </h1>
              <p className="text-white/60 text-xs mt-2 max-w-[300px] leading-relaxed font-medium">
                {categoryLabels[category].description}
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
                    placeholder="Search drills..."
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
                    className={`h-10 w-10 p-0 rounded-xl ${sortBy !== 'athlete' ? 'text-primary bg-primary/10' : 'text-white/60'}`}
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
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {[1, 2, 3].map(i => (
                  <AthleteCardSkeleton key={i} />
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
            {!isLoading && !error && athleteGroups.length === 0 && (
              <EmptyState
                title={searchQuery ? 'No matches' : 'No exercises yet'}
                message={
                  searchQuery
                    ? `No results for "${searchQuery}"`
                    : `No ${categoryLabels[category].title.toLowerCase()} exercises for ${sportLabels[sport]} yet.`
                }
                actionText={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? clearSearch : undefined}
                variant="compact"
              />
            )}

            {/* Athlete Cards */}
            {!isLoading && !error && athleteGroups.length > 0 && (
              <div className="space-y-4">
                {athleteGroups.map((group, index) => {
                  const isExpanded = expandedAthletes.has(group.athleteId)
                  const visibleExercises = isExpanded
                    ? group.exercises
                    : group.exercises.slice(0, MAX_VISIBLE_EXERCISES)
                  const hiddenCount = Math.max(0, group.exercises.length - visibleExercises.length)

                  return (
                    <div
                      key={`${group.athleteId}-${index}`}
                      className="group/card relative card-elevated rounded-2xl p-4 bg-card/60 backdrop-blur-sm border border-white/5 stagger-item hover:border-white/10 transition-all duration-300"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Athlete Header */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Athlete Avatar */}
                        <div className="relative">
                          <div className={`absolute -inset-1 bg-gradient-to-br ${theme.gradient} opacity-20 rounded-full blur-sm group-hover/card:opacity-40 transition-opacity`} />
                          {group.imageUrl ? (
                            <img
                              src={group.imageUrl}
                              alt={group.athleteName}
                              className="relative w-14 h-14 rounded-full object-cover border-2 border-white/10"
                            />
                          ) : (
                            <div className="relative w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border-2 border-white/10">
                              <Trophy size={24} className="text-white/20" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground tracking-tight">{group.athleteName}</h3>
                            {group.imageUrl && <Trophy size={14} className={theme.color} />}
                          </div>
                          {/* Achievements */}
                          {group.achievements && group.achievements.length > 0 && (
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5 line-clamp-1">
                              {group.achievements[0]}
                            </p>
                          )}
                        </div>

                        {group.athleteMatch && trimmedQuery && (
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.color} px-2 py-1 bg-white/5 rounded-lg`}>
                            MATCH
                          </span>
                        )}
                      </div>

                      {/* Exercise List */}
                      <div className="space-y-2">
                        {visibleExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="group/row w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                onClick={() => handleExerciseTap(exercise)}
                                className="flex-1 min-w-0 text-left"
                                aria-label={`Open ${exercise.name}`}
                              >
                                <span className="text-sm font-bold text-foreground group-hover/row:text-primary transition-colors">
                                  {formatExerciseName(exercise.name)}
                                </span>
                                
                                {/* Exercise Metadata Row */}
                                <div className="flex items-center gap-3 mt-1">
                                  {(exercise.reps || exercise.sets || exercise.weight) && (
                                    <div className={`flex items-center gap-1 text-[11px] font-bold ${theme.color}`}>
                                      <span>{exercise.sets || 1}×{exercise.reps || 10}</span>
                                      {exercise.weight && <span className="opacity-60">· {exercise.weight}</span>}
                                    </div>
                                  )}
                                  
                                  {exercise.equipment && exercise.equipment.length > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] text-white/30 font-medium">
                                      <Tag size={10} />
                                      <span className="truncate">{exercise.equipment[0]}</span>
                                    </div>
                                  )}
                                </div>
                              </button>

                              <div className="flex items-center gap-2">
                                {onAddToToday && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`h-9 w-9 rounded-xl border ${
                                      todayExerciseIds?.has(exercise.id)
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      if (todayExerciseIds?.has(exercise.id)) return
                                      haptics.medium()
                                      onAddToToday(exercise)
                                    }}
                                    aria-label={todayExerciseIds?.has(exercise.id) ? 'Added to today' : 'Add to today'}
                                  >
                                    {todayExerciseIds?.has(exercise.id) ? <Check size={16} /> : <Plus size={16} />}
                                  </Button>
                                )}
                                {exercise.videoUrl && (
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Video size={16} fill="currentColor" className="opacity-80" />
                                  </div>
                                )}
                                {exercise.priority >= 8 && (
                                  <div className={`w-8 h-8 rounded-lg ${theme.bg}/10 flex items-center justify-center ${theme.color}`}>
                                    <Trophy size={16} />
                                  </div>
                                )}
                                <ChevronRight size={16} className="text-white/20 group-hover/row:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {hiddenCount > 0 && (
                        <Button
                          onClick={() => {
                            haptics.light()
                            toggleExpanded(group.athleteId)
                          }}
                          variant="ghost"
                          size="sm"
                          className={`w-full mt-3 h-10 text-[11px] font-bold uppercase tracking-widest ${theme.color} bg-white/5 hover:bg-white/10 rounded-xl transition-colors`}
                        >
                          {isExpanded ? 'Show fewer' : `+ ${hiddenCount} more drills`}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
