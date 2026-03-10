'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { ExerciseCategory, ExerciseCounts, Screen, SportType } from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight } from '@/components/ui/icons'

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

interface CategoryInfo {
  name: string
  description: string
  gradient: string
  textColor: string
  glow: string
}

const categoryInfo: Record<ExerciseCategory, CategoryInfo> = {
  'full-body': {
    name: 'Full Body',
    description: 'Total-body power and conditioning for every phase.',
    gradient: 'from-amber-500/25 via-black/80 to-black/95',
    textColor: 'text-amber-200',
    glow: 'shadow-amber-500/20'
  },
  'legs': {
    name: 'Legs',
    description: 'Explosive lower-body strength for takedowns and throws.',
    gradient: 'from-orange-500/25 via-black/80 to-black/95',
    textColor: 'text-orange-200',
    glow: 'shadow-orange-500/20'
  },
  'chest': {
    name: 'Chest',
    description: 'Pressing strength to control distance and pressure.',
    gradient: 'from-blue-500/25 via-black/80 to-black/95',
    textColor: 'text-blue-200',
    glow: 'shadow-blue-500/20'
  },
  'shoulders': {
    name: 'Shoulders',
    description: 'Overhead stability and clinch power under fatigue.',
    gradient: 'from-purple-500/25 via-black/80 to-black/95',
    textColor: 'text-purple-200',
    glow: 'shadow-purple-500/20'
  },
  'back': {
    name: 'Back',
    description: 'Upper-back strength for pulls, lifts, and control.',
    gradient: 'from-slate-400/25 via-black/80 to-black/95',
    textColor: 'text-slate-200',
    glow: 'shadow-slate-500/20'
  },
  'arms': {
    name: 'Arms',
    description: 'Grip endurance and arm strength for hand fighting.',
    gradient: 'from-rose-500/25 via-black/80 to-black/95',
    textColor: 'text-rose-200',
    glow: 'shadow-rose-500/20'
  },
  'core': {
    name: 'Core',
    description: 'Rotation, bracing, and scramble stability.',
    gradient: 'from-pink-500/25 via-black/80 to-black/95',
    textColor: 'text-pink-200',
    glow: 'shadow-pink-500/20'
  },
  'neck': {
    name: 'Neck',
    description: 'Neck strength and prehab for safer grappling.',
    gradient: 'from-emerald-500/25 via-black/80 to-black/95',
    textColor: 'text-emerald-200',
    glow: 'shadow-emerald-500/20'
  }
}

interface SportExerciseCategoriesProps {
  sport?: SportType
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onSelectCategory: (sport: SportType, category: ExerciseCategory) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

export function SportExerciseCategories({
  sport = 'wrestling',
  dataVersion = 0,
  onNavigate,
  onBack,
  onSelectCategory,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: SportExerciseCategoriesProps) {
  const [exerciseCounts, setExerciseCounts] = useState<ExerciseCounts | null>(null)
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position after loading completes
  useEffect(() => {
    if (!isLoadingCounts && initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollTop
            hasRestoredScroll.current = true
          }
        })
      })
    }
  }, [isLoadingCounts, initialScrollTop])

  // Handle scroll to save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

  // Fetch exercise counts on mount
  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoadingCounts(true)
      try {
        const counts = await athletesService.getExerciseCounts()
        setExerciseCounts(counts)
      } catch (error) {
        console.error('[SportExerciseCategories] Error fetching counts:', error)
      } finally {
        setIsLoadingCounts(false)
      }
    }
    fetchCounts()
  }, [dataVersion])

  const handleCategoryClick = (category: ExerciseCategory) => {
    haptics.light()
    onSelectCategory(sport, category)
  }

  const categories: ExerciseCategory[] = [
    'full-body',
    'legs',
    'chest',
    'shoulders',
    'back',
    'arms',
    'core',
    'neck'
  ]

  const visibleCategories = isLoadingCounts || !exerciseCounts
    ? categories
    : categories.filter((category) => (exerciseCounts.byCategory[category] || 0) > 0)

  // Get global exercise count for a specific category
  const getCategoryCount = (category: ExerciseCategory): number | null => {
    if (!exerciseCounts) return null
    return exerciseCounts.byCategory[category] || 0
  }

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div className="pb-[calc(9rem+env(safe-area-inset-bottom))]">
          {/* Hero Header */}
          <div className={`relative safe-area-top pb-8 px-6 overflow-hidden`}>
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-background/95 to-background opacity-90" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Training Hub" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: 'Exercises' }
                  ]}
                  variant="glass"
                />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-foreground mt-2 uppercase">
                Exercises
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[280px] leading-relaxed">
                One combined exercise library across all sports, broken into muscle groups so it is easy to browse and track.
              </p>
            </div>
          </div>

          {/* Category Grid Section */}
          <div className="px-6 -mt-4 relative z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
                By Muscle Group
              </h2>
            </div>
            <p className="text-xs text-muted-foreground/80 mb-4">
              Choose a body area to open all-sports exercise results. Drill browsing stays on the sport-specific drill pages.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleCategories.map((category, index) => {
                const info = categoryInfo[category]
                const count = getCategoryCount(category)
                return (
                  <Button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    variant="secondary"
                    size="sm"
                    className={`group relative w-full text-left h-auto items-start justify-start rounded-2xl p-5 border border-white/10 bg-gradient-to-br ${info.gradient} backdrop-blur-sm card-interactive stagger-item overflow-hidden normal-case tracking-normal transition-all duration-300 shadow-lg ${info.glow}`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="relative z-10 flex flex-col gap-3 w-full">
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div>
                          <h3 className={`font-bold text-base tracking-tight ${info.textColor}`}>
                            {info.name}
                          </h3>
                          <p className="text-xs text-white/65 mt-1 leading-relaxed">
                            {info.description}
                          </p>
                        </div>
                        {isLoadingCounts ? (
                          <Skeleton className="h-5 w-8 rounded-full opacity-40" />
                        ) : count !== null && count > 0 ? (
                          <span className="text-[11px] font-semibold text-white/70 border border-white/15 rounded-full px-2.5 py-1">
                            {count.toLocaleString()} ex
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
            {!isLoadingCounts && visibleCategories.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-card/40 px-5 py-6 text-sm text-muted-foreground">
                No exercise categories with athlete-linked content are available yet.
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
