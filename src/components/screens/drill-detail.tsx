'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Drill, DrillCategory, Screen } from '@/lib/types'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { haptics } from '@/lib/haptics'
import { BackButton } from '@/components/ui/back-button'
import { VideoPlayer } from '@/components/ui/video-player'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import {
  Check, X, Shield, Target, Zap, Stretch, Flame, Heart, Activity, Clock, Refresh, Plus, ChevronRight
} from '@/components/ui/icons'

// Category-specific theming
const categoryThemes: Record<DrillCategory, { gradient: string; color: string; textColor: string; iconBg: string; borderColor: string }> = {
  'technique': {
    gradient: 'from-orange-950 via-orange-900 to-background',
    color: 'text-orange-500',
    textColor: 'text-orange-200',
    iconBg: 'bg-orange-500/20',
    borderColor: 'border-orange-500/20'
  },
  'exercise': {
    gradient: 'from-blue-950 via-blue-900 to-background',
    color: 'text-blue-500',
    textColor: 'text-blue-200',
    iconBg: 'bg-blue-500/20',
    borderColor: 'border-blue-500/20'
  },
  'injury-prevention': {
    gradient: 'from-emerald-950 via-emerald-900 to-background',
    color: 'text-emerald-500',
    textColor: 'text-emerald-200',
    iconBg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/20'
  },
  'mobility': {
    gradient: 'from-purple-950 via-purple-900 to-background',
    color: 'text-purple-500',
    textColor: 'text-purple-200',
    iconBg: 'bg-purple-500/20',
    borderColor: 'border-purple-500/20'
  },
  'conditioning': {
    gradient: 'from-red-950 via-red-900 to-background',
    color: 'text-red-500',
    textColor: 'text-red-200',
    iconBg: 'bg-red-500/20',
    borderColor: 'border-red-500/20'
  },
  'warmup': {
    gradient: 'from-yellow-950 via-yellow-900 to-background',
    color: 'text-yellow-500',
    textColor: 'text-yellow-200',
    iconBg: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/20'
  },
  'recovery': {
    gradient: 'from-pink-950 via-pink-900 to-background',
    color: 'text-pink-500',
    textColor: 'text-pink-200',
    iconBg: 'bg-pink-500/20',
    borderColor: 'border-pink-500/20'
  }
}

// Map category to icon component with dynamic colors
const getCategoryIcon = (category: DrillCategory, size: number = 18) => {
  const theme = categoryThemes[category]
  const icons: Record<DrillCategory, React.ReactNode> = {
    'technique': <Target size={size} className={theme.color} />,
    'exercise': <Zap size={size} className={theme.color} />,
    'injury-prevention': <Shield size={size} className={theme.color} />,
    'mobility': <Stretch size={size} className={theme.color} />,
    'conditioning': <Flame size={size} className={theme.color} />,
    'warmup': <Activity size={size} className={theme.color} />,
    'recovery': <Heart size={size} className={theme.color} />
  }
  return icons[category]
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

// Component to fetch and display related drills
function RelatedDrillsSection({ drillIds, dataVersion, onSelect }: { drillIds: string[]; dataVersion: number; onSelect: (id: string) => void }) {
  const [relatedDrills, setRelatedDrills] = useState<Drill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchRelatedDrills = async () => {
      setIsLoading(true)
      const drills: Drill[] = []
      for (const id of drillIds) {
        const drill = await drillsService.getDrillById(id)
        if (drill) drills.push(drill)
      }
      if (isMounted) {
        setRelatedDrills(drills)
        setIsLoading(false)
      }
    }

    fetchRelatedDrills()

    return () => {
      isMounted = false
    }
  }, [drillIds, dataVersion])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Refresh size={16} className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (relatedDrills.length === 0) return null

  return (
    <HorizontalScroll gap={8}>
      {relatedDrills.map(drill => (
        <Button
          key={drill.id}
          onClick={() => onSelect(drill.id)}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 card-glass border border-white/10 rounded-xl px-4 py-3 text-sm hover:bg-white/10 transition-colors min-h-[44px] normal-case tracking-normal h-auto"
        >
          {drill.name}
        </Button>
      ))}
    </HorizontalScroll>
  )
}

interface DrillDetailProps {
  drill?: Drill
  drillId?: string
  dataVersion?: number
  onBack: () => void
  onNavigate?: (screen: Screen) => void
  onSelectRelatedDrill?: (drill: Drill) => void
  onAddToToday?: (drill: Drill) => void
  isInToday?: boolean
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

export function DrillDetail({
  drill: drillProp,
  drillId,
  dataVersion = 0,
  onBack,
  onNavigate,
  onSelectRelatedDrill,
  onAddToToday,
  isInToday = false,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: DrillDetailProps) {
  const [drill, setDrill] = useState<Drill | null>(drillProp ?? null)
  const [isLoading, setIsLoading] = useState(!drillProp && !!drillId)
  const [relatedDrillsCache, setRelatedDrillsCache] = useState<Record<string, Drill>>({})

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Get category theme
  const theme = drill ? categoryThemes[drill.category as DrillCategory] : categoryThemes['technique']

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

  // Fetch drill if not passed as prop
  useEffect(() => {
    let isMounted = true

    const fetchDrill = async () => {
      const resolvedId = drillProp?.id ?? drillId ?? null
      if (!resolvedId) {
        setIsLoading(false)
        return
      }

      // Show the passed drill immediately, then refresh from Supabase in background (realtime-safe).
      if (drillProp) {
        setDrill(drillProp)
      } else if (!drill) {
        setIsLoading(true)
      }

      const fetchedDrill = await drillsService.getDrillById(resolvedId)
      if (!isMounted) return
      if (fetchedDrill) {
        setDrill(fetchedDrill)
      }
      setIsLoading(false)
    }

    fetchDrill()

    return () => {
      isMounted = false
    }
  }, [drillProp, drillId, dataVersion])

  // Track recently viewed when drill is loaded
  useEffect(() => {
    if (drill?.id) {
      drillsService.trackRecentlyViewed(drill.id)
    }
  }, [drill?.id])

  const categoryDisplay = drill ? categoryInfo[drill.category as DrillCategory] : null

  const handleRelatedDrillClick = async (relatedDrillId: string) => {
    // Check cache first
    if (relatedDrillsCache[relatedDrillId]) {
      onSelectRelatedDrill?.(relatedDrillsCache[relatedDrillId])
      return
    }

    // Fetch from service
    const relatedDrill = await drillsService.getDrillById(relatedDrillId)
    if (relatedDrill && onSelectRelatedDrill) {
      setRelatedDrillsCache(prev => ({ ...prev, [relatedDrillId]: relatedDrill }))
      onSelectRelatedDrill(relatedDrill)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <ScreenShell>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background opacity-50" />
            <div className="relative z-10">
              <BackButton onClick={onBack} label="Drills" styleVariant="glass" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Refresh size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading drill...</p>
          </div>
        </div>
        {onNavigate && (
          <ScreenShellFooter>
            <BottomNav active="learn" onNavigate={onNavigate} onStartAction={onStartAction} hasWorkoutToday={hasWorkoutToday} />
          </ScreenShellFooter>
        )}
      </ScreenShell>
    )
  }

  // Not found state
  if (!drill) {
    return (
      <ScreenShell>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background opacity-50" />
            <div className="relative z-10">
              <BackButton onClick={onBack} label="Drills" styleVariant="glass" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Target size={32} className="text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">Drill not found</p>
          </div>
        </div>
        {onNavigate && (
          <ScreenShellFooter>
            <BottomNav active="learn" onNavigate={onNavigate} onStartAction={onStartAction} hasWorkoutToday={hasWorkoutToday} />
          </ScreenShellFooter>
        )}
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div className="pb-32">
          {/* Hero Header with Category Gradient */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Drills" styleVariant="glass" />
              </div>

              {onNavigate && (
                <div className="mt-4">
                  <Breadcrumb
                    items={[
                      { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                      { label: categoryDisplay?.name || 'Drills' },
                      { label: drill.name }
                    ]}
                    variant="glass"
                  />
                </div>
              )}

              {/* Category Badge with Theme Color */}
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className={`w-8 h-8 rounded-lg ${theme.iconBg} flex items-center justify-center`}>
                  {getCategoryIcon(drill.category as DrillCategory, 18)}
                </div>
                <span className={`text-xs font-bold tracking-[0.15em] ${theme.textColor} uppercase`}>
                  {categoryDisplay?.name}
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-foreground">{drill.name}</h1>

              {/* Metadata with better styling */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                  drill.difficulty === 'beginner' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  drill.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {drill.difficulty}
                </span>
                {drill.duration > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground/70">
                    <Clock size={12} />
                    {Math.floor(drill.duration / 60)}:{(drill.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {drill.equipment && drill.equipment.length > 0 && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground/70">
                    {drill.equipment.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-6 -mt-4 relative z-20">
            {/* Video Section */}
            {drill.videoUrl && (
              <div className="py-4 stagger-item">
                <VideoPlayer url={drill.videoUrl} title={drill.name} />
              </div>
            )}

            {/* Description */}
            <div className="py-4 stagger-item" style={{ animationDelay: '50ms' }}>
              <p className="text-foreground leading-relaxed">{drill.description}</p>
            </div>

            {/* Benefits */}
            {drill.benefits && drill.benefits.length > 0 && (
              <div className="py-5 stagger-item" style={{ animationDelay: '100ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
                  Benefits
                </h2>
                <div className={`card-glass rounded-2xl p-5 border ${theme.borderColor}`}>
                  <ul className="space-y-3">
                    {drill.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3 stagger-item" style={{ animationDelay: `${(index + 3) * 50}ms` }}>
                        <div className={`w-6 h-6 rounded-full ${theme.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check size={14} className={theme.color} />
                        </div>
                        <span className="text-sm text-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Muscles Worked */}
            {drill.musclesWorked && drill.musclesWorked.length > 0 && (
              <div className="py-5 stagger-item" style={{ animationDelay: '150ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-4">
                  Muscles Worked
                </h2>
                <div className="flex flex-wrap gap-2">
                  {drill.musclesWorked.map((muscle, index) => (
                    <span
                      key={index}
                      className={`rounded-full px-4 py-2 text-sm font-medium stagger-item ${theme.iconBg} ${theme.color} border ${theme.borderColor}`}
                      style={{ animationDelay: `${(index + 5) * 30}ms` }}
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Injury Prevention Info */}
            {drill.injuryPrevention && (
              <div className="py-4 stagger-item" style={{ animationDelay: '200ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                  Injury Prevention
                </h2>
                <div className={`${theme.iconBg} border ${theme.borderColor} rounded-xl p-4`}>
                  <p className="text-sm text-foreground">{drill.injuryPrevention}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {drill.instructions && drill.instructions.length > 0 && (
              <div className="py-4 stagger-item" style={{ animationDelay: '250ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                  How To Do It
                </h2>
                <ol className="space-y-3">
                  {drill.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start gap-3 stagger-item" style={{ animationDelay: `${(index + 7) * 40}ms` }}>
                      <span className={`flex-shrink-0 w-7 h-7 ${theme.iconBg} border ${theme.borderColor} rounded-full flex items-center justify-center text-xs font-bold ${theme.color}`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-foreground pt-1">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Coaching Cues */}
            {drill.coachingCues && drill.coachingCues.length > 0 && (
              <div className="py-4 stagger-item" style={{ animationDelay: '300ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                  Coaching Cues
                </h2>
                <div className="flex flex-wrap gap-2">
                  {drill.coachingCues.map((cue, index) => (
                    <span key={index} className={`${theme.iconBg} border ${theme.borderColor} rounded-full px-3 py-1.5 text-sm ${theme.color} font-medium`}>
                      {cue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {drill.commonMistakes && drill.commonMistakes.length > 0 && (
              <div className="py-4 stagger-item" style={{ animationDelay: '350ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                  Common Mistakes
                </h2>
                <ul className="space-y-2">
                  {drill.commonMistakes.map((mistake, index) => (
                    <li key={index} className="flex items-start gap-2 stagger-item" style={{ animationDelay: `${(index + 10) * 30}ms` }}>
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X size={12} className="text-red-400" />
                      </div>
                      <span className="text-sm text-foreground">{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Drills */}
            {drill.relatedDrills && drill.relatedDrills.length > 0 && (
              <div className="py-4 stagger-item" style={{ animationDelay: '400ms' }}>
                <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
                  Related Drills
                </h2>
                <RelatedDrillsSection
                  drillIds={drill.relatedDrills}
                  dataVersion={dataVersion}
                  onSelect={handleRelatedDrillClick}
                />
              </div>
            )}

            {/* Add to Today Button */}
            {onAddToToday && (
              <div className="py-6 stagger-item" style={{ animationDelay: '450ms' }}>
                <Button
                  variant={isInToday ? 'secondary' : 'primary'}
                  size="lg"
                  fullWidth
                  disabled={isInToday}
                  className="h-14 rounded-2xl font-black uppercase tracking-wider"
                  onClick={() => {
                    if (!drill) return
                    haptics.medium()
                    onAddToToday(drill)
                  }}
                  withHaptic={false}
                >
                  {isInToday ? (
                    <>
                      <Check size={16} className="mr-2" />
                      Added to Today
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Add to Today
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {onNavigate && (
        <ScreenShellFooter>
          <BottomNav
            active="learn"
            onNavigate={onNavigate}
            onStartAction={onStartAction}
            hasWorkoutToday={hasWorkoutToday}
          />
        </ScreenShellFooter>
      )}
    </ScreenShell>
  )
}
