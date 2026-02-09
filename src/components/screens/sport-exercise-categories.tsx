'use client'

import { useEffect, useState } from 'react'
import { ExerciseCategory, ExerciseCounts, Screen, SportType } from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
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

const sportNames: Record<SportType, string> = {
  'wrestling': 'Wrestling',
  'judo': 'Judo',
  'bjj': 'Ju Jitsu'
}

interface SportExerciseCategoriesProps {
  sport: SportType
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onSelectCategory: (sport: SportType, category: ExerciseCategory) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
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

export function SportExerciseCategories({
  sport,
  dataVersion = 0,
  onNavigate,
  onBack,
  onSelectCategory,
  onStartAction,
  hasWorkoutToday = false
}: SportExerciseCategoriesProps) {
  const [exerciseCounts, setExerciseCounts] = useState<ExerciseCounts | null>(null)
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)

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

  // Get exercise count for a specific sport/category
  const getCategoryCount = (category: ExerciseCategory): number | null => {
    if (!exerciseCounts) return null
    const key = `${sport}-${category}`
    return exerciseCounts.bySportAndCategory[key] || 0
  }

  const theme = sportThemes[sport]

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="pb-24">
          {/* Hero Header */}
          <div className={`relative pt-4 pb-8 px-6 overflow-hidden`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Training Hub" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: sportNames[sport] }
                  ]}
                  variant="glass"
                />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-foreground mt-2 uppercase">
                {sportNames[sport]}
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[280px] leading-relaxed">
                Elite physical preparation and technical drills for modern {sportNames[sport]}.
              </p>
            </div>
          </div>

          {/* Category Grid Section */}
          <div className="px-6 -mt-4 relative z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
                Targeted Training
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categories.map((category, index) => {
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
                            {count}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                        Targeted Training
                      </span>
                    </div>
                  </Button>
                )
              })}
            </div>
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
