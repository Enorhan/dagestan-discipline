'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Drill, DrillCategory, DrillSubcategory } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search, X, ChevronRight, Clock, Shield, Target, Zap, Stretch, Flame, Heart, Activity, Refresh
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

interface CategoryListProps {
  category: DrillCategory
  onBack: () => void
  onSelectDrill: (drill: Drill) => void
  initialSubcategory?: DrillSubcategory
}

export function CategoryList({ category, onBack, onSelectDrill, initialSubcategory }: CategoryListProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<DrillSubcategory | 'all'>(initialSubcategory || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [allDrillsInCategory, setAllDrillsInCategory] = useState<Drill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const categoryDisplay = categoryInfo[category]

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
        {/* Header */}
        <div className="px-6 safe-area-top pb-4">
          <BackButton onClick={onBack} label="Back" />

          <div className="flex items-center gap-3 mb-2 mt-4">
            {categoryIcons[category]}
            <h1 className="text-2xl font-black tracking-tight">{categoryDisplay?.name}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{categoryDisplay?.description}</p>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 py-2">
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

        {/* Subcategory Filter */}
        {subcategories.length > 1 && (
          <div className="px-4 sm:px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                onClick={() => {
                  setSelectedSubcategory('all')
                }}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 rounded-full normal-case tracking-normal px-4 py-2.5 min-h-[44px] ${
                  selectedSubcategory === 'all'
                    ? 'bg-foreground text-background'
                    : 'bg-card border border-border text-foreground hover:bg-card/80'
                }`}
              >
                All
              </Button>
              {subcategories.map(sub => (
                <Button
                  key={sub}
                  onClick={() => {
                    setSelectedSubcategory(sub)
                  }}
                  variant="ghost"
                  size="sm"
                  className={`flex-shrink-0 rounded-full normal-case tracking-normal px-4 py-2.5 min-h-[44px] ${
                    selectedSubcategory === sub
                      ? 'bg-foreground text-background'
                      : 'bg-card border border-border text-foreground hover:bg-card/80'
                  }`}
                >
                  {getSubcategoryLabel(sub)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Drill List */}
        <div className="px-4 sm:px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
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
              {filteredDrills.map(drill => (
                <Button
                  key={drill.id}
                  onClick={() => onSelectDrill(drill)}
                  variant="ghost"
                  size="sm"
                  className="w-full bg-card border border-border rounded-lg p-4 text-left justify-start items-start normal-case tracking-normal h-auto hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{drill.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{drill.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          drill.difficulty === 'beginner' ? 'difficulty-beginner' :
                          drill.difficulty === 'intermediate' ? 'difficulty-intermediate' :
                          'difficulty-advanced'
                        }`}>
                          {drill.difficulty}
                        </span>
                        {drill.duration > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={12} />
                            {Math.floor(drill.duration / 60)}:{(drill.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground ml-2 mt-1" />
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
