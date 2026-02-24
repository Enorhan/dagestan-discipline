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
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/12 via-black/80 to-black/95 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy size={16} className="text-amber-300" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-amber-200/80 uppercase">
            Why These Exercises Matter
          </p>
          <p className="text-[11px] text-white/55 uppercase tracking-[0.16em] mt-0.5">
            Elite Athlete Perspective
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber-100/80">
              {insight.athlete}
            </p>
            <p className="text-sm font-bold text-foreground mt-1">
              {insight.title}
            </p>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              {insight.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
