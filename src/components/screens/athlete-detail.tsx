'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Athlete, ExerciseWithGuidance, ExperienceLevel, Screen, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { ExerciseCardWithGuidance } from '@/components/ui/exercise-card-with-guidance'
import { EmptyState } from '@/components/ui/empty-state'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { Trophy, Refresh, Target, ChevronRight } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

// Sport-specific theming matching other screens
const sportThemes: Record<SportType, { gradient: string; color: string; bg: string; textColor: string; borderColor: string }> = {
  wrestling: {
    gradient: 'from-red-950 via-red-900 to-background',
    color: 'text-red-500',
    bg: 'bg-red-500',
    textColor: 'text-red-200',
    borderColor: 'border-red-500/20'
  },
  judo: {
    gradient: 'from-blue-950 via-blue-900 to-background',
    color: 'text-blue-500',
    bg: 'bg-blue-500',
    textColor: 'text-blue-200',
    borderColor: 'border-blue-500/20'
  },
  bjj: {
    gradient: 'from-purple-950 via-purple-900 to-background',
    color: 'text-purple-500',
    bg: 'bg-purple-500',
    textColor: 'text-purple-200',
    borderColor: 'border-purple-500/20'
  }
}

const sportNames: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu'
}

// Breadcrumb component matching other screens
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

interface AthleteDetailProps {
  athlete: Athlete
  userLevel: ExperienceLevel
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

export function AthleteDetail({
  athlete,
  userLevel,
  dataVersion = 0,
  onNavigate,
  onBack,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: AthleteDetailProps) {
  const [exercises, setExercises] = useState<ExerciseWithGuidance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(userLevel)

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Get sport theme
  const theme = sportThemes[athlete.sport] || sportThemes.wrestling

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
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

  useEffect(() => {
    let isMounted = true

    const fetchExercises = async () => {
      setIsLoading(true)
      try {
        const athleteExercises = await athletesService.getAthleteExercises(athlete.id, selectedLevel)
        if (isMounted) {
          setExercises(athleteExercises)
        }
      } catch (error) {
        console.error('[AthleteDetail] Error fetching exercises:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchExercises()

    return () => {
      isMounted = false
    }
  }, [athlete.id, selectedLevel, dataVersion])

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div className="pb-32">
          {/* Hero Header with Sport Gradient */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Athletes" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: 'Athletes' },
                    { label: athlete.name }
                  ]}
                  variant="glass"
                />
              </div>

              {/* Athlete Info with Avatar */}
              <div className="flex items-start gap-4 mt-4">
                {/* Athlete Avatar with Glow */}
                <div className="relative flex-shrink-0">
                  <div className={`absolute -inset-1 bg-gradient-to-br ${theme.gradient} opacity-40 rounded-full blur-md`} />
                  {athlete.imageUrl ? (
                    <img
                      src={athlete.imageUrl}
                      alt={athlete.name}
                      className="relative w-20 h-20 rounded-full object-cover border-2 border-white/20"
                    />
                  ) : (
                    <div className={`relative w-20 h-20 rounded-full ${theme.bg}/20 flex items-center justify-center border-2 border-white/20`}>
                      <Trophy size={36} className={theme.color} />
                    </div>
                  )}
                  {/* Sport Badge */}
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full ${theme.bg}/30 backdrop-blur-sm flex items-center justify-center border border-white/20`}>
                    <Trophy size={14} className="text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h1 className="text-3xl font-black tracking-tight text-foreground">
                    {athlete.name}
                  </h1>
                  <p className={`text-sm font-semibold ${theme.textColor} mt-1`}>
                    {sportNames[athlete.sport]} Athlete
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-6 -mt-4 relative z-20">
            {/* Achievements Card - Glass Style */}
            {athlete.achievements && athlete.achievements.length > 0 && (
              <div className={`card-glass rounded-2xl p-5 mb-6 border ${theme.borderColor} stagger-item`}>
                <h3 className={`text-xs font-bold ${theme.color} uppercase tracking-[0.2em] mb-3 flex items-center gap-2`}>
                  <Trophy size={14} />
                  Achievements
                </h3>
                <ul className="space-y-2">
                  {athlete.achievements.map((achievement, index) => (
                    <li
                      key={index}
                      className="text-sm text-foreground flex items-start gap-3 stagger-item"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-5 h-5 rounded-full ${theme.bg}/20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Trophy size={10} className={theme.color} />
                      </div>
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bio */}
            {athlete.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 stagger-item" style={{ animationDelay: '100ms' }}>
                {athlete.bio}
              </p>
            )}

            {/* Experience Level Selector - Sport Themed */}
            <div className="mb-6 stagger-item" style={{ animationDelay: '150ms' }}>
              <h3 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                Your Level
              </h3>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(level => (
                  <Button
                    key={level}
                    onClick={() => {
                      haptics.light()
                      setSelectedLevel(level)
                    }}
                    variant={selectedLevel === level ? 'primary' : 'secondary'}
                    size="sm"
                    className={`flex-1 capitalize rounded-xl ${
                      selectedLevel === level
                        ? `${theme.bg} border-transparent`
                        : 'bg-white/5 border-white/10'
                    }`}
                    withHaptic={false}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Exercises Section */}
            <div className="stagger-item" style={{ animationDelay: '200ms' }}>
              <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
                Training Program ({exercises.length} exercises)
              </h2>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 card-elevated rounded-2xl">
                  <Refresh size={24} className={`animate-spin ${theme.color}`} />
                  <p className="text-sm text-muted-foreground mt-2">Loading exercises...</p>
                </div>
              ) : exercises.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<Target size={24} className="text-muted-foreground/50" />}
                  title="No exercises yet"
                  message="No athlete-linked exercises are available for this profile right now."
                />
              ) : (
                <div className="space-y-4">
                  {exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="stagger-item"
                      style={{ animationDelay: `${(index + 5) * 50}ms` }}
                    >
                      <ExerciseCardWithGuidance
                        exercise={exercise}
                        userLevel={selectedLevel}
                        showAthleteData={true}
                        showRecommendations={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
