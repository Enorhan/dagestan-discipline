'use client'

import { useEffect, useState } from 'react'
import { EnhancedExerciseData, ExerciseRecommendation, ExperienceLevel, Screen } from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/ui/video-player'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Trophy, Dumbbell, Tag, Clock, RefreshCw, ChevronRight, Info, Video,
  Heart, Check, Share, Star
} from '@/components/ui/icons'

interface ExerciseDetailProps {
  exercise: EnhancedExerciseData
  onNavigate: (screen: Screen) => void
  onBack: () => void
  isFavorite?: boolean
  isCompleted?: boolean
  onToggleFavorite?: (exerciseId: string) => void
  onMarkComplete?: (exerciseId: string) => void
  onShare?: (exercise: EnhancedExerciseData) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
}

const sportThemes: Record<string, { gradient: string; color: string; bg: string }> = {
  wrestling: {
    gradient: 'from-red-950 via-red-900 to-background',
    color: 'text-red-500',
    bg: 'bg-red-500'
  },
  judo: {
    gradient: 'from-blue-950 via-blue-900 to-background',
    color: 'text-blue-500',
    bg: 'bg-blue-500'
  },
  bjj: {
    gradient: 'from-purple-950 via-purple-900 to-background',
    color: 'text-purple-500',
    bg: 'bg-purple-500'
  }
}

export function ExerciseDetail({
  exercise,
  onNavigate,
  onBack,
  isFavorite = false,
  isCompleted = false,
  onToggleFavorite,
  onMarkComplete,
  onShare,
  onStartAction,
  hasWorkoutToday = false
}: ExerciseDetailProps) {
  const [recommendation, setRecommendation] = useState<ExerciseRecommendation | null>(null)
  const [isLoadingRec, setIsLoadingRec] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('intermediate')

  useEffect(() => {
    const fetchRecommendation = async () => {
      setIsLoadingRec(true)
      try {
        const exerciseWithGuidance = await athletesService.getExerciseWithGuidance(
          exercise.id,
          selectedLevel
        )
        if (exerciseWithGuidance?.recommendations) {
          setRecommendation(exerciseWithGuidance.recommendations)
        }
      } catch (error) {
        console.error('[ExerciseDetail] Error fetching recommendation:', error)
      } finally {
        setIsLoadingRec(false)
      }
    }
    fetchRecommendation()
  }, [exercise.id, selectedLevel])

  const levelButtons: { value: ExperienceLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const theme = sportThemes[exercise.sport] || sportThemes.bjj

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="pb-24">
          {/* Hero Header */}
          <div className={`relative pt-4 pb-12 px-6 overflow-hidden`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-50`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <BackButton onClick={onBack} label="Exercises" styleVariant="glass" />
                <div className="flex items-center gap-2">
                  {onShare && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white"
                      onClick={() => {
                        haptics.light()
                        onShare(exercise)
                      }}
                    >
                      <Share size={18} />
                    </Button>
                  )}
                  {onToggleFavorite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 ${isFavorite ? 'text-amber-400' : 'text-white'}`}
                      onClick={() => {
                        haptics.light()
                        onToggleFavorite(exercise.id)
                      }}
                    >
                      <Star size={18} className={isFavorite ? 'fill-current' : ''} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black tracking-[0.2em] ${theme.color} uppercase bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md border border-white/5`}>
                    {exercise.category.replace('-', ' ')}
                  </span>
                  {exercise.isWeighted && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-[0.2em] px-2 py-1 rounded-lg backdrop-blur-md border border-white/5 uppercase">
                      Weighted
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-none">
                  {exercise.name}
                </h1>
                {exercise.description && (
                  <p className="text-white/60 text-sm mt-4 max-w-[300px] leading-relaxed font-medium">
                    {exercise.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Video Section - Premium Card */}
          {exercise.videoUrl && (
            <div className="px-6 -mt-6 relative z-20">
              <div className="card-glass p-2 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <VideoPlayer url={exercise.videoUrl} title={exercise.name} />
              </div>
            </div>
          )}

          {/* Signature Athlete Card - Redesigned */}
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase">
                Signature Athlete Data
              </h2>
              <Trophy size={14} className={theme.color} />
            </div>
            
            <div className="relative group overflow-hidden">
              {/* Card Background with Glow */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${theme.gradient} opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500`} />
              
              <div className="relative card-elevated rounded-3xl p-6 bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center border border-white/10 shadow-lg`}>
                    <Trophy size={28} className="text-white/90" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">{exercise.athleteName}</h3>
                    {exercise.athleteAchievements && exercise.athleteAchievements.length > 0 && (
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.color}`}>
                        {exercise.athleteAchievements[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {exercise.sets && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Sets</span>
                      <p className="text-xl font-black text-white">{exercise.sets}</p>
                    </div>
                  )}
                  {exercise.reps && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Reps</span>
                      <p className="text-xl font-black text-white">{exercise.reps}</p>
                    </div>
                  )}
                  {exercise.weight && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Weight</span>
                      <p className="text-xl font-black text-white">{exercise.weight}</p>
                    </div>
                  )}
                  {exercise.duration && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Time</span>
                      <p className="text-xl font-black text-white">{exercise.duration}</p>
                    </div>
                  )}
                </div>

                {exercise.notes && (
                  <div className="mt-6 flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <Info size={16} className="text-white/20 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/50 leading-relaxed italic">{exercise.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Recommendations Section */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase">
                Your Protocol
              </h2>
              <div className="flex gap-1">
                {levelButtons.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      haptics.light()
                      setSelectedLevel(value)
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      selectedLevel === value 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation Card */}
            <div className="card-elevated rounded-3xl p-6 bg-white/[0.03] border border-white/5">
              {isLoadingRec ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                  </div>
                  <Skeleton className="h-12 rounded-2xl" />
                </div>
              ) : recommendation ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest block mb-1">Sets</span>
                      <p className="text-xl font-black text-primary">
                        {recommendation.setsRange.min}-{recommendation.setsRange.max}
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest block mb-1">Reps</span>
                      <p className="text-xl font-black text-primary">
                        {recommendation.repsRange.min}-{recommendation.repsRange.max}
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-2xl p-4 text-center border border-primary/10">
                      <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest block mb-1">Rest</span>
                      <p className="text-xl font-black text-primary">
                        {recommendation.restRange.min}s
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {recommendation.tempo && (
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <p className="text-xs text-foreground/70 font-medium">
                          <span className="text-foreground font-bold">Tempo:</span> {recommendation.tempo}
                        </p>
                      </div>
                    )}
                    {recommendation.progressionNotes && (
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                        <p className="text-xs text-foreground/70 font-medium leading-relaxed">
                          <span className="text-foreground font-bold uppercase text-[10px] tracking-wider">Advance:</span> {recommendation.progressionNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Standard protocol for this drill.</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipment & Muscles Section */}
          <div className="px-6 py-4 space-y-8">
            {exercise.equipment && exercise.equipment.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Dumbbell size={16} className="text-muted-foreground" />
                  <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                    Equipment
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map((eq, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-white/5 text-white/70 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/5"
                    >
                      <Tag size={12} />
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
              <div className="pb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                    Muscles Worked
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscleGroups.map((muscle, i) => (
                    <span
                      key={i}
                      className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold border border-primary/10"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          {!isCompleted && onMarkComplete && (
            <div className="px-6 py-6 pb-12">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                className="h-16 rounded-2xl font-black text-lg uppercase tracking-wider glow-primary-subtle"
                onClick={() => {
                  haptics.success()
                  onMarkComplete(exercise.id)
                }}
              >
                Complete Drill
              </Button>
            </div>
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
