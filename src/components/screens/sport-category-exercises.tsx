'use client'

import { useMemo, useState } from 'react'
import { ExerciseCategory, Screen, SportType } from '@/lib/types'
import { getAthleteExercisesBySport, getExerciseCategory } from '@/lib/athlete-exercises'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Search, X } from '@/components/ui/icons'

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
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onBack: () => void
}

const MAX_VISIBLE_EXERCISES = 6

export function SportCategoryExercises({
  sport,
  category,
  trainingTarget,
  onNavigate,
  onBack
}: SportCategoryExercisesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedAthletes, setExpandedAthletes] = useState<Set<string>>(() => new Set())

  const trimmedQuery = searchQuery.trim().toLowerCase()

  const athleteGroups = useMemo(() => {
    const groups = getAthleteExercisesBySport(sport)

    return groups
      .map(group => {
        const athleteMatch = trimmedQuery
          ? group.athlete.toLowerCase().includes(trimmedQuery)
          : true

        const filteredExercises = group.exercises.filter(exercise => {
          const inCategory = getExerciseCategory(exercise) === category
          if (!inCategory) return false
          if (!trimmedQuery) return true
          return athleteMatch || exercise.toLowerCase().includes(trimmedQuery)
        })

        return {
          ...group,
          exercises: filteredExercises,
          athleteMatch
        }
      })
      .filter(group => group.exercises.length > 0)
  }, [sport, category, trimmedQuery])

  const totalExercises = athleteGroups.reduce((sum, group) => sum + group.exercises.length, 0)

  const toggleExpanded = (athlete: string) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev)
      if (next.has(athlete)) {
        next.delete(athlete)
      } else {
        next.add(athlete)
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
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Header */}
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onBack} label="Back" />
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mt-4">
              {sportLabels[sport]}
            </p>
            <h1 className="text-2xl font-black tracking-tight mt-2">
              {categoryLabels[category].title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {categoryLabels[category].description}
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {totalExercises} exercises · {athleteGroups.length} athletes
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search athlete or exercise..."
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
                  onClick={() => {
                    haptics.light()
                    clearSearch()
                  }}
                  aria-label="Clear search"
                >
                  <X size={18} />
                </Button>
              )}
            </div>
          </div>

          {/* Athlete Cards */}
          <div className="px-6 py-4">
            {athleteGroups.length === 0 ? (
              <EmptyState
                title="No matches"
                message={searchQuery ? `No results for "${searchQuery}"` : 'No exercises found for this category.'}
                actionText={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? clearSearch : undefined}
                variant="compact"
              />
            ) : (
              <div className="space-y-4">
                {athleteGroups.map((group, index) => {
                  const isExpanded = expandedAthletes.has(group.athlete)
                  const visibleExercises = isExpanded
                    ? group.exercises
                    : group.exercises.slice(0, MAX_VISIBLE_EXERCISES)
                  const hiddenCount = Math.max(0, group.exercises.length - visibleExercises.length)

                  return (
                    <div
                      key={`${group.athlete}-${index}`}
                      className="card-elevated rounded-xl p-4 bg-card/70 border border-border/60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{group.athlete}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.exercises.length} exercises
                          </p>
                        </div>
                        {group.athleteMatch && trimmedQuery && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                            Athlete match
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {visibleExercises.map((exercise, exerciseIndex) => (
                          <div
                            key={`${group.athlete}-${exerciseIndex}`}
                            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                          >
                            <span className="text-sm text-foreground">
                              {formatExerciseName(exercise)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {hiddenCount > 0 && (
                        <Button
                          onClick={() => {
                            haptics.light()
                            toggleExpanded(group.athlete)
                          }}
                          variant="ghost"
                          size="sm"
                          className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary hover:text-primary/80 p-0 h-auto min-h-0"
                        >
                          {isExpanded ? 'Show fewer' : `Show all ${hiddenCount} more`}
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
          active="training"
          trainingTarget={trainingTarget}
          onNavigate={onNavigate}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
