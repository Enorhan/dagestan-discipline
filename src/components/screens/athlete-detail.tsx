'use client'

import React, { useState, useEffect } from 'react'
import { Athlete, ExerciseWithGuidance, ExperienceLevel, Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { ExerciseCardWithGuidance } from '@/components/ui/exercise-card-with-guidance'
import { athletesService } from '@/lib/athletes-service'
import { Trophy, Refresh, Target } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface AthleteDetailProps {
  athlete: Athlete
  userLevel: ExperienceLevel
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

export function AthleteDetail({
  athlete,
  userLevel,
  dataVersion = 0,
  onNavigate,
  onBack,
  onStartAction,
  hasWorkoutToday = false
}: AthleteDetailProps) {
  const [exercises, setExercises] = useState<ExerciseWithGuidance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(userLevel)

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
      <ScreenShellContent>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Header */}
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onBack} label="Back" />
            
            {/* Athlete Info */}
            <div className="mt-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Trophy size={32} className="text-amber-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">{athlete.name}</h1>
                  <p className="text-muted-foreground text-sm capitalize">{athlete.sport}</p>
                </div>
              </div>
              
              {/* Achievements */}
              {athlete.achievements && athlete.achievements.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                    Achievements
                  </h3>
                  <ul className="space-y-1">
                    {athlete.achievements.map((achievement, index) => (
                      <li key={index} className="text-sm text-foreground flex items-start gap-2">
                        <Trophy size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Bio */}
              {athlete.bio && (
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                  {athlete.bio}
                </p>
              )}
            </div>

            {/* Experience Level Selector */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-2">
                Your Level
              </h3>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(level => (
                  <Button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    variant={selectedLevel === level ? 'primary' : 'secondary'}
                    size="sm"
                    className="flex-1 capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Refresh size={24} className="animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading exercises...</p>
            </div>
          ) : (
            <>
              {/* Exercises */}
              <div className="px-6">
                <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
                  Training Program ({exercises.length} exercises)
                </h2>
                <div className="space-y-4">
                  {exercises.map(exercise => (
                    <ExerciseCardWithGuidance
                      key={exercise.id}
                      exercise={exercise}
                      userLevel={selectedLevel}
                      showAthleteData={true}
                      showRecommendations={true}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
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
