'use client'

import React, { useState, useEffect } from 'react'
import { Drill, DrillCategory } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { categoryInfo } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { haptics } from '@/lib/haptics'
import { BackButton } from '@/components/ui/back-button'
import { VideoPlayer } from '@/components/ui/video-player'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import {
  Check, X, Shield, Target, Zap, Stretch, Flame, Heart, Activity, Clock, Refresh, Plus
} from '@/components/ui/icons'

// Map category to icon component
const categoryIcons: Record<DrillCategory, React.ReactNode> = {
  'technique': <Target size={18} className="text-primary" />,
  'exercise': <Zap size={18} className="text-primary" />,
  'injury-prevention': <Shield size={18} className="text-primary" />,
  'mobility': <Stretch size={18} className="text-primary" />,
  'conditioning': <Flame size={18} className="text-primary" />,
  'warmup': <Activity size={18} className="text-primary" />,
  'recovery': <Heart size={18} className="text-primary" />
}

// Component to fetch and display related drills
function RelatedDrillsSection({ drillIds, onSelect }: { drillIds: string[]; onSelect: (id: string) => void }) {
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
  }, [drillIds])

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-4 pb-8">
        <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
          Related Drills
        </h2>
        <div className="flex items-center gap-2">
          <Refresh size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (relatedDrills.length === 0) return null

  return (
    <div className="px-4 sm:px-6 py-4 pb-8">
      <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
        Related Drills
      </h2>
      <HorizontalScroll gap={8}>
        {relatedDrills.map(drill => (
          <Button
            key={drill.id}
            onClick={() => onSelect(drill.id)}
            variant="ghost"
            size="sm"
            className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-3 text-sm hover:bg-card/80 transition-colors min-h-[44px] normal-case tracking-normal h-auto"
          >
            {drill.name}
          </Button>
        ))}
      </HorizontalScroll>
    </div>
  )
}

interface DrillDetailProps {
  drill?: Drill
  drillId?: string
  onBack: () => void
  onSelectRelatedDrill?: (drill: Drill) => void
  onAddToToday?: (drill: Drill) => void
  isInToday?: boolean
}

export function DrillDetail({
  drill: drillProp,
  drillId,
  onBack,
  onSelectRelatedDrill,
  onAddToToday,
  isInToday = false,
}: DrillDetailProps) {
  const [drill, setDrill] = useState<Drill | null>(drillProp ?? null)
  const [isLoading, setIsLoading] = useState(!drillProp && !!drillId)
  const [relatedDrillsCache, setRelatedDrillsCache] = useState<Record<string, Drill>>({})

  // Fetch drill if not passed as prop
  useEffect(() => {
    let isMounted = true

    const fetchDrill = async () => {
      if (drillProp) {
        setDrill(drillProp)
        setIsLoading(false)
        return
      }

      if (!drillId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const fetchedDrill = await drillsService.getDrillById(drillId)
      if (isMounted) {
        setDrill(fetchedDrill)
        setIsLoading(false)
      }
    }

    fetchDrill()

    return () => {
      isMounted = false
    }
  }, [drillProp, drillId])

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
        <ScreenShellContent>
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onBack} label="Back" />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Refresh size={24} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading drill...</p>
          </div>
        </ScreenShellContent>
      </ScreenShell>
    )
  }

  // Not found state
  if (!drill) {
    return (
      <ScreenShell>
        <ScreenShellContent>
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onBack} label="Back" />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Drill not found</p>
          </div>
        </ScreenShellContent>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        {/* Header */}
        <div className="px-6 safe-area-top pb-4">
          <BackButton onClick={onBack} label="Back" />

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-2 mt-4">
            {categoryIcons[drill.category as DrillCategory]}
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              {categoryDisplay?.name}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight">{drill.name}</h1>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              drill.difficulty === 'beginner' ? 'difficulty-beginner' :
              drill.difficulty === 'intermediate' ? 'difficulty-intermediate' :
              'difficulty-advanced'
            }`}>
              {drill.difficulty}
            </span>
            {drill.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {Math.floor(drill.duration / 60)}:{(drill.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
            {drill.equipment && drill.equipment.length > 0 && (
              <span>{drill.equipment.join(', ')}</span>
            )}
          </div>
        </div>

        {/* Video Section */}
        {drill.videoUrl && (
          <div className="px-4 sm:px-6 py-4">
            <VideoPlayer url={drill.videoUrl} title={drill.name} />
          </div>
        )}

        {/* Description */}
        <div className="px-4 sm:px-6 py-4">
          <p className="text-foreground leading-relaxed">{drill.description}</p>
        </div>

        {/* Benefits */}
        {drill.benefits && drill.benefits.length > 0 && (
          <div className="px-4 sm:px-6 py-5">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
              Benefits
            </h2>
            <div className="card-elevated rounded-xl p-4">
              <ul className="space-y-3">
                {drill.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3 stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-primary" />
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
          <div className="px-4 sm:px-6 py-5">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
              Muscles Worked
            </h2>
            <div className="flex flex-wrap gap-2">
              {drill.musclesWorked.map((muscle, index) => (
                <span
                  key={index}
                  className="card-elevated rounded-full px-4 py-2 text-sm font-medium stagger-item"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Injury Prevention Info */}
        {drill.injuryPrevention && (
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Injury Prevention
            </h2>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground">{drill.injuryPrevention}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {drill.instructions && drill.instructions.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              How To Do It
            </h2>
            <ol className="space-y-3">
              {drill.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground pt-0.5">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Coaching Cues */}
        {drill.coachingCues && drill.coachingCues.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Coaching Cues
            </h2>
            <div className="flex flex-wrap gap-2">
              {drill.coachingCues.map((cue, index) => (
                <span key={index} className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-sm text-primary">
                  {cue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Common Mistakes */}
        {drill.commonMistakes && drill.commonMistakes.length > 0 && (
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Common Mistakes
            </h2>
            <ul className="space-y-2">
              {drill.commonMistakes.map((mistake, index) => (
                <li key={index} className="flex items-start gap-2">
                  <X size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Drills */}
        {drill.relatedDrills && drill.relatedDrills.length > 0 && (
          <RelatedDrillsSection
            drillIds={drill.relatedDrills}
            onSelect={handleRelatedDrillClick}
          />
        )}

        {onAddToToday && (
          <div className="px-4 sm:px-6 py-6 pb-10">
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
      </ScreenShellContent>
    </ScreenShell>
  )
}
