'use client'

import { useMemo } from 'react'
import { Trophy } from '@/components/ui/icons'
import { getEliteExerciseInsights } from '@/lib/elite-exercise-insights'

type ExerciseLike = {
  name?: string | null
}

interface EliteInsightsPanelProps {
  exercises: ExerciseLike[] | null | undefined
  focusHint?: string | null
  className?: string
  maxItems?: number
}

export function EliteInsightsPanel({
  exercises,
  focusHint,
  className = '',
  maxItems = 3,
}: EliteInsightsPanelProps) {
  const insights = useMemo(() => {
    return getEliteExerciseInsights(exercises, focusHint, maxItems)
  }, [exercises, focusHint, maxItems])

  if (insights.length === 0) return null

  return (
    <div className={`rounded-2xl border border-border/30 bg-gradient-to-br from-gold-muted via-background/80 to-background/95 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gold-muted flex items-center justify-center">
          <Trophy size={16} className="text-gold" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-gold/80 uppercase">
            Why These Exercises Matter
          </p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em] mt-0.5">
            Elite Athlete Perspective
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-xl border border-border/30 bg-card/30 px-3 py-2.5"
          >
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-gold/80">
              {insight.athlete}
            </p>
            <p className="text-sm font-bold text-foreground mt-1">
              {insight.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {insight.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
