'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Drill, DrillCategory, DrillSubcategory, Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { haptics } from '@/lib/haptics'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search, X, ChevronRight, Clock, Shield, Target, Zap, Stretch, Flame, Heart, Activity, Refresh
} from '@/components/ui/icons'

// Map category to icon component
const categoryIcons: Record<DrillCategory, React.ReactNode> = {
  'technique': <Target size={20} className="text-orange-400" />,
  'exercise': <Zap size={20} className="text-blue-400" />,
  'injury-prevention': <Shield size={20} className="text-emerald-400" />,
  'mobility': <Stretch size={20} className="text-purple-400" />,
  'conditioning': <Flame size={20} className="text-red-400" />,
  'warmup': <Activity size={20} className="text-yellow-400" />,
  'recovery': <Heart size={20} className="text-pink-400" />
}

// Breadcrumb component (matching exercises pages)
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
              <ChevronRight
                size={12}
                className={`${variant === 'glass' ? 'text-white/30' : 'text-muted-foreground/50'} flex-shrink-0`}
              />
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={() => {
                  haptics.light()
                  item.onClick?.()
                }}
                className={`${variant === 'glass' ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground'} transition-colors truncate max-w-[120px]`}
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate max-w-[160px] ${
                  isLast
                    ? (variant === 'glass' ? 'text-white font-bold' : 'text-foreground font-medium')
                    : (variant === 'glass' ? 'text-white/60' : 'text-muted-foreground')
                }`}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

const categoryThemes: Record<DrillCategory, { gradient: string; cardGradient: string; color: string; iconBg: string }> = {
  technique: {
    gradient: 'from-orange-950 via-orange-900 to-background',
    cardGradient: 'from-orange-500/20 via-black/80 to-black/95',
    color: 'text-orange-500',
    iconBg: 'bg-orange-500/20',
  },
  exercise: {
    gradient: 'from-blue-950 via-blue-900 to-background',
    cardGradient: 'from-blue-500/20 via-black/80 to-black/95',
    color: 'text-blue-500',
    iconBg: 'bg-blue-500/20',
  },
  'injury-prevention': {
    gradient: 'from-emerald-950 via-emerald-900 to-background',
    cardGradient: 'from-emerald-500/20 via-black/80 to-black/95',
    color: 'text-emerald-500',
    iconBg: 'bg-emerald-500/20',
  },
  mobility: {
    gradient: 'from-purple-950 via-purple-900 to-background',
    cardGradient: 'from-purple-500/20 via-black/80 to-black/95',
    color: 'text-purple-500',
    iconBg: 'bg-purple-500/20',
  },
  conditioning: {
    gradient: 'from-red-950 via-red-900 to-background',
    cardGradient: 'from-red-500/20 via-black/80 to-black/95',
    color: 'text-red-500',
    iconBg: 'bg-red-500/20',
  },
  warmup: {
    gradient: 'from-yellow-950 via-yellow-900 to-background',
    cardGradient: 'from-yellow-500/20 via-black/80 to-black/95',
    color: 'text-yellow-500',
    iconBg: 'bg-yellow-500/20',
  },
  recovery: {
    gradient: 'from-pink-950 via-pink-900 to-background',
    cardGradient: 'from-pink-500/20 via-black/80 to-black/95',
    color: 'text-pink-500',
    iconBg: 'bg-pink-500/20',
  }
}

interface CategoryListProps {
  category: DrillCategory
  onBack: () => void
  onSelectDrill: (drill: Drill) => void
  initialSubcategory?: DrillSubcategory
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

export function CategoryList({
  category,
  onBack,
  onSelectDrill,
  initialSubcategory,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
}: CategoryListProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<DrillSubcategory | 'all'>(initialSubcategory || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [allDrillsInCategory, setAllDrillsInCategory] = useState<Drill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const categoryDisplay = categoryInfo[category]
  const theme = categoryThemes[category]

  // Fetch drills for this category
  useEffect(() => {
    let isMounted = true

    const fetchDrills = async () => {
      setIsLoading(true)
      const drills = await drillsService.getDrillsByCategory(category)
      if (isMounted) {
        setAllDrillsInCategory(drills)
        setIsLoading(false)
      }
    }

    fetchDrills()

    return () => {
      isMounted = false
    }
  }, [category])

  // Get unique subcategories
  const subcategories = useMemo(() => {
    const subs = new Set<DrillSubcategory>()
    allDrillsInCategory.forEach(drill => subs.add(drill.subcategory))
    return Array.from(subs)
  }, [allDrillsInCategory])

  // Filter drills
  const filteredDrills = useMemo(() => {
    return allDrillsInCategory.filter(drill => {
      const matchesSubcategory = selectedSubcategory === 'all' || drill.subcategory === selectedSubcategory
      const matchesSearch = searchQuery === '' ||
        drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drill.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSubcategory && matchesSearch
    })
  }, [allDrillsInCategory, selectedSubcategory, searchQuery])

  const getSubcategoryLabel = (sub: DrillSubcategory): string => {
    return sub.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSubcategory('all')
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="pb-24">
          {/* Hero Header */}
          <div className="relative pt-4 pb-10 px-6 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Training Hub" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: onBack },
                    { label: categoryDisplay?.name ?? 'Category' }
                  ]}
                  variant="glass"
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center border border-white/10`}>
                  {categoryIcons[category]}
                </div>
                <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">
                  {categoryDisplay?.name}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm mt-2 max-w-[320px] leading-relaxed">
                {categoryDisplay?.description}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 -mt-4 relative z-20">
            <div className="card-elevated rounded-2xl p-3 border border-white/10 bg-card/40 backdrop-blur-xl">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search drills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={18} className="text-muted-foreground" />}
                  className="pr-12"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Subcategory Filter */}
          {subcategories.length > 1 && (
            <div className="px-6 py-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  onClick={() => {
                    haptics.light()
                    setSelectedSubcategory('all')
                  }}
                  variant="ghost"
                  size="sm"
                  className={`flex-shrink-0 rounded-full normal-case tracking-normal px-4 py-2.5 min-h-[44px] ${
                    selectedSubcategory === 'all'
                      ? 'bg-foreground text-background'
                      : 'bg-card/50 border border-border/60 text-foreground hover:bg-card'
                  }`}
                >
                  All
                </Button>
                {subcategories.map(sub => (
                  <Button
                    key={sub}
                    onClick={() => {
                      haptics.light()
                      setSelectedSubcategory(sub)
                    }}
                    variant="ghost"
                    size="sm"
                    className={`flex-shrink-0 rounded-full normal-case tracking-normal px-4 py-2.5 min-h-[44px] ${
                      selectedSubcategory === sub
                        ? 'bg-foreground text-background'
                        : 'bg-card/50 border border-border/60 text-foreground hover:bg-card'
                    }`}
                  >
                    {getSubcategoryLabel(sub)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Drill List */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Refresh size={24} className="animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading drills...</p>
              </div>
            ) : filteredDrills.length === 0 ? (
              <EmptyState
                icon={<Search size={40} className="text-muted-foreground/50" />}
                title="No drills found"
                message={searchQuery ? `No results for "${searchQuery}"` : "Try adjusting your filters"}
                actionText="Clear filters"
                onAction={clearFilters}
                variant="compact"
              />
            ) : (
              <div className="space-y-3">
                {filteredDrills.map((drill, index) => (
                  <Button
                    key={drill.id}
                    onClick={() => onSelectDrill(drill)}
                    variant="secondary"
                    size="sm"
                    className={`w-full rounded-2xl p-5 text-left justify-start items-start normal-case tracking-normal h-auto border border-white/10 bg-gradient-to-br ${theme.cardGradient} card-interactive stagger-item`}
                    style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                  >
                    <div className="relative z-10 flex flex-col gap-3 w-full">
                      <div className="flex items-start justify-between gap-3 w-full">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-xl ${theme.iconBg} flex items-center justify-center border border-white/10 flex-shrink-0`}>
                            {categoryIcons[category]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-white truncate">{drill.name}</h3>
                            <p className="text-xs text-white/65 mt-1 line-clamp-2 leading-relaxed">
                              {drill.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span
                                className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wide ${
                                  drill.difficulty === 'beginner'
                                    ? 'difficulty-beginner'
                                    : drill.difficulty === 'intermediate'
                                      ? 'difficulty-intermediate'
                                      : 'difficulty-advanced'
                                }`}
                              >
                                {drill.difficulty}
                              </span>
                              {drill.duration > 0 && (
                                <span className="text-[11px] text-white/60 flex items-center gap-1">
                                  <Clock size={12} />
                                  {Math.floor(drill.duration / 60)}:{(drill.duration % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                        View Drill
                      </span>
                    </div>
                  </Button>
                ))}
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
