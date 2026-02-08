'use client'

import React from 'react'
import { Card, CardHeader, CardContent } from './card'
import { ExerciseWithGuidance, ExperienceLevel } from '@/lib/types'
import { Trophy, Target, Info } from './icons'

interface ExerciseCardProps {
  exercise: ExerciseWithGuidance
  userLevel: ExperienceLevel
  showAthleteData?: boolean
  showRecommendations?: boolean
  onClick?: () => void
}

export function ExerciseCardWithGuidance({
  exercise,
  userLevel,
  showAthleteData = true,
  showRecommendations = true,
  onClick
}: ExerciseCardProps) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      interactive={!!onClick}
      onClick={onClick}
      className="mb-4"
    >
      {/* Exercise Header */}
      <CardHeader
        title={exercise.name}
        subtitle={exercise.muscleGroups.join(', ')}
      />

      <CardContent>
        {/* Description */}
        {exercise.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {exercise.description}
          </p>
        )}

        {/* Equipment */}
        {exercise.equipment && exercise.equipment.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Equipment:</p>
            <p className="text-sm text-foreground">{exercise.equipment.join(', ')}</p>
          </div>
        )}

        {/* SECTION 1: Elite Athlete Data */}
        {showAthleteData && exercise.athleteData && exercise.athleteData.length > 0 && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            {/* Clear visual distinction with amber/gold color */}
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-500" />
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Elite Athlete Data
              </h4>
            </div>

            {exercise.athleteData.map((athleteData, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                {/* Athlete name and achievements */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {athleteData.athleteName}
                    </p>
                    {athleteData.athleteAchievements && athleteData.athleteAchievements.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {athleteData.athleteAchievements[0]}
                      </p>
                    )}
                  </div>
                  <div className="px-2 py-0.5 bg-amber-500/20 rounded text-xs font-semibold text-amber-700">
                    Priority {athleteData.priority}/10
                  </div>
                </div>

                {/* Actual data from research */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {athleteData.reps && (
                    <DataPoint label="Reps" value={athleteData.reps} />
                  )}
                  {athleteData.sets && (
                    <DataPoint label="Sets" value={athleteData.sets} />
                  )}
                  {athleteData.weight && (
                    <DataPoint label="Weight" value={athleteData.weight} />
                  )}
                  {athleteData.duration && (
                    <DataPoint label="Duration" value={athleteData.duration} />
                  )}
                  {athleteData.frequency && (
                    <DataPoint label="Frequency" value={athleteData.frequency} />
                  )}
                </div>

                {athleteData.notes && (
                  <p className="text-xs text-muted-foreground italic mt-2 pl-2 border-l-2 border-amber-500/30">
                    "{athleteData.notes}"
                  </p>
                )}
              </div>
            ))}

            {/* Source attribution */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-amber-500/20">
              <Info size={12} className="text-amber-500/60" />
              <p className="text-xs text-amber-500/60">
                From verified training research
              </p>
            </div>
          </div>
        )}

        {/* SECTION 2: Your Recommended Ranges */}
        {showRecommendations && exercise.recommendations && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            {/* Clear visual distinction with primary color */}
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Recommended for You ({userLevel})
              </h4>
            </div>

            {/* Recommended ranges */}
            <div className="grid grid-cols-3 gap-2">
              <RangeCard
                label="Sets"
                range={exercise.recommendations.setsRange}
              />
              <RangeCard
                label="Reps"
                range={exercise.recommendations.repsRange}
              />
              <RangeCard
                label="Rest"
                range={exercise.recommendations.restRange}
                unit="s"
              />
            </div>



            {/* Tempo */}
            {exercise.recommendations.tempo && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-foreground mb-1">
                  ⏱️ Tempo: <span className="font-mono text-primary">{exercise.recommendations.tempo}</span>
                </p>
              </div>
            )}

            {/* Progression/Regression guidance */}
            {exercise.recommendations.progressionNotes && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-xs font-semibold text-foreground mb-1">
                  💪 To Progress:
                </p>
                <p className="text-xs text-muted-foreground">
                  {exercise.recommendations.progressionNotes}
                </p>
              </div>
            )}

            {exercise.recommendations.regressionNotes && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-foreground mb-1">
                  🎯 To Regress:
                </p>
                <p className="text-xs text-muted-foreground">
                  {exercise.recommendations.regressionNotes}
                </p>
              </div>
            )}

            {/* Source attribution */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-primary/20">
              <Info size={12} className="text-primary/60" />
              <p className="text-xs text-primary/60">
                Based on exercise science & your level
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper component for displaying athlete data points
function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 rounded px-2 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

// Helper component for displaying recommendation ranges
function RangeCard({
  label,
  range,
  unit = ''
}: {
  label: string
  range: { min: number; max: number }
  unit?: string
}) {
  return (
    <div className="bg-background/50 rounded px-2 py-1.5 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {range.min}-{range.max}{unit}
      </p>
    </div>
  )
}