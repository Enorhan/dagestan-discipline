'use client'

import React from 'react'
import { Drill, DrillCategory } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { categoryInfo, getDrillById } from '@/lib/drills-data'
import { BackButton } from '@/components/ui/back-button'
import { VideoPlayer } from '@/components/ui/video-player'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Button } from '@/components/ui/button'
import {
  Check, X, Shield, Target, Zap, Stretch, Flame, Heart, Activity, Clock
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

interface DrillDetailProps {
  drill: Drill
  onBack: () => void
  onSelectRelatedDrill?: (drill: Drill) => void
}

export function DrillDetail({ drill, onBack, onSelectRelatedDrill }: DrillDetailProps) {
  const categoryDisplay = categoryInfo[drill.category as DrillCategory]

  const handleRelatedDrillClick = (drillId: string) => {
    const relatedDrill = getDrillById(drillId)
    if (relatedDrill && onSelectRelatedDrill) {
      onSelectRelatedDrill(relatedDrill)
    }
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
          <div className="px-4 sm:px-6 py-4 pb-8">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Related Drills
            </h2>
            <HorizontalScroll gap={8}>
              {drill.relatedDrills.map(drillId => {
                const relatedDrill = getDrillById(drillId)
                if (!relatedDrill) return null
                return (
                  <Button
                    key={drillId}
                    onClick={() => handleRelatedDrillClick(drillId)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 bg-card border border-border rounded-lg px-4 py-3 text-sm hover:bg-card/80 transition-colors min-h-[44px] normal-case tracking-normal h-auto"
                  >
                    {relatedDrill.name}
                  </Button>
                )
              })}
            </HorizontalScroll>
          </div>
        )}
      </ScreenShellContent>
    </ScreenShell>
  )
}
