'use client'

import { useEffect, useState } from 'react'
import { EnhancedExerciseData, ExerciseRecommendation, ExperienceLevel, Screen, SportType } from '@/lib/types'
import { athletesService } from '@/lib/athletes-service'
import { parseExerciseCoachingContent } from '@/lib/exercise-coaching'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/ui/video-player'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Trophy, Dumbbell, Tag, RefreshCw, Info, Video,
  Check, Share, Star, Plus, AlertCircle, Target, TrendingUp
} from '@/components/ui/icons'

interface ExerciseDetailProps {
  exercise: EnhancedExerciseData & { athleteData?: Array<{ athleteName: string; athleteAchievements?: string[] }> }
  dataVersion?: number
  onNavigate: (screen: Screen) => void
  onBack: () => void
  isFavorite?: boolean
  isCompleted?: boolean
  isInToday?: boolean
  isInWorkoutBuilder?: boolean
  onToggleFavorite?: (exerciseId: string) => void
  onMarkComplete?: (exerciseId: string) => void
  onAddToWorkout?: (exercise: EnhancedExerciseData) => void
  onAddToToday?: (exercise: EnhancedExerciseData) => void
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

function formatDisplayLabel(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function ExerciseDetail({
  exercise,
  dataVersion = 0,
  onNavigate,
  onBack,
  isFavorite = false,
  isCompleted = false,
  isInToday = false,
  isInWorkoutBuilder = false,
  onToggleFavorite,
  onMarkComplete,
  onAddToWorkout,
  onAddToToday,
  onShare,
  onStartAction,
  hasWorkoutToday = false
}: ExerciseDetailProps) {
  const [recommendation, setRecommendation] = useState<ExerciseRecommendation | null>(null)
  const [isLoadingRec, setIsLoadingRec] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>('intermediate')
  const [benefitTab, setBenefitTab] = useState<SportType>(exercise.sport)

  useEffect(() => {
    const fetchRecommendation = async () => {
      setIsLoadingRec(true)
      try {
        const exerciseWithGuidance = await athletesService.getExerciseWithGuidance(
          exercise.id,
          selectedLevel
        )
        setRecommendation(exerciseWithGuidance?.recommendations ?? null)
      } catch (error) {
        console.error('[ExerciseDetail] Error fetching recommendation:', error)
        setRecommendation(null)
      } finally {
        setIsLoadingRec(false)
      }
    }
    fetchRecommendation()
  }, [exercise.id, selectedLevel, dataVersion])

  const levelButtons: { value: ExperienceLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const theme = sportThemes[exercise.sport] || sportThemes.bjj
  const athleteName = exercise.athleteName ?? (exercise as { athleteData?: Array<{ athleteName: string }> }).athleteData?.[0]?.athleteName
  const athleteAchievements = exercise.athleteAchievements ?? (exercise as { athleteData?: Array<{ athleteAchievements?: string[] }> }).athleteData?.[0]?.athleteAchievements
  const showAddWorkoutAction = Boolean(onAddToWorkout)
  const showAddAction = Boolean(onAddToToday)
  const showCompleteAction = !isCompleted && Boolean(onMarkComplete)
  const hasFooterActions = showAddWorkoutAction || showAddAction || showCompleteAction
  const hasAthleteMetrics = Boolean(exercise.sets || exercise.reps || exercise.weight || exercise.duration)
  const coachingContent = parseExerciseCoachingContent(exercise.description)
  const performanceTags = exercise.eliteStandard?.tags ?? []
  const loggableMetrics = exercise.eliteStandard?.loggable_metrics ?? exercise.loggableMetrics ?? []
  const benefitTabs: { id: SportType; label: string }[] = [
    { id: 'judo', label: 'Judo' },
    { id: 'wrestling', label: 'Wrestling' },
    { id: 'bjj', label: 'BJJ' },
  ]
  const benefitsBySport: Record<SportType, string | undefined> = {
    judo: exercise.eliteStandard?.benefits_judo ?? exercise.benefitsJudo,
    wrestling: exercise.eliteStandard?.benefits_wrestling ?? exercise.benefitsWrestling,
    bjj: exercise.eliteStandard?.benefits_bjj ?? exercise.benefitsBjj,
  }
  const availableBenefitTabs = benefitTabs.filter(({ id }) => Boolean(benefitsBySport[id]))
  const activeBenefit = benefitsBySport[benefitTab] ?? benefitsBySport[availableBenefitTabs[0]?.id ?? 'bjj']
  const progressionGuidance = recommendation?.progressionNotes ?? coachingContent.progression
  const regressionGuidance = recommendation?.regressionNotes ?? null

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="pb-24">
          {/* Hero Header */}
          <div className={`relative safe-area-top pb-12 px-6 overflow-hidden`}>
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
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-black tracking-[0.2em] ${theme.color} uppercase bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md border border-white/5`}>
                    {exercise.category.replace('-', ' ')}
                  </span>
                  {exercise.isWeighted && (
                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-[0.2em] px-2 py-1 rounded-lg backdrop-blur-md border border-white/5 uppercase">
                      Weighted
                    </span>
                  )}
                  {exercise.difficultyLevel && (
                    <span className="text-[10px] font-bold tracking-wider text-white/70 uppercase bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      {exercise.difficultyLevel}
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

          {/* Video / Demo Placeholder - Premium Card */}
          {exercise.videoUrl ? (
            <div className="px-6 -mt-6 relative z-20">
              <div className="card-glass p-2 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <VideoPlayer url={exercise.videoUrl} title={exercise.name} />
              </div>
            </div>
          ) : (
            <div className="px-6 -mt-6 relative z-20">
              <div className="rounded-3xl border border-white/10 bg-white/5 aspect-video flex items-center justify-center overflow-hidden">
                <div className="flex flex-col items-center gap-3 text-white/30">
                  <Video size={48} />
                  <span className="text-xs font-bold uppercase tracking-wider">Demo Coming Soon</span>
                </div>
              </div>
            </div>
          )}

          {(exercise.difficultyLevel || performanceTags.length > 0 || loggableMetrics.length > 0) && (
            <div className="px-6 py-6">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-4">
                Performance Profile
              </h2>
              <div className="card-elevated rounded-3xl p-5 bg-white/[0.03] border border-white/5 space-y-4">
                {performanceTags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-2">
                      Focus Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {performanceTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75"
                        >
                          <Tag size={11} />
                          {formatDisplayLabel(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {exercise.difficultyLevel && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-1">
                        Difficulty
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatDisplayLabel(exercise.difficultyLevel)}
                      </p>
                    </div>
                  )}
                  {loggableMetrics.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/40 mb-1">
                        Track Progress With
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {loggableMetrics.map((metric) => formatDisplayLabel(metric)).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sport-Specific Benefits - Tabbed */}
          {availableBenefitTabs.length > 0 && activeBenefit && (
            <div className="px-6 py-6">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase mb-4">
                Grappling Transfer
              </h2>
              {availableBenefitTabs.length > 1 ? (
                <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
                  {availableBenefitTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBenefitTab(tab.id)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        benefitTab === tab.id
                          ? 'bg-white text-black shadow-lg'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                  {availableBenefitTabs[0]?.label}
                </div>
              )}
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                {activeBenefit}
              </p>
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
                <div className={`flex items-center gap-4 ${hasAthleteMetrics ? 'mb-6' : 'mb-3'}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center border border-white/10 shadow-lg`}>
                    <Trophy size={28} className="text-white/90" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">{athleteName ?? 'Elite Athlete'}</h3>
                    {athleteAchievements && athleteAchievements.length > 0 && (
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.color}`}>
                        {athleteAchievements[0]}
                      </p>
                    )}
                  </div>
                </div>

                {hasAthleteMetrics ? (
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
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs text-white/65 leading-relaxed">
                      Elite athletes include this movement to build transferable fight performance. Use the protocol below to scale it to your level.
                    </p>
                  </div>
                )}

                {exercise.notes && (
                  <div className="mt-6 flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <Info size={16} className="text-white/20 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/50 leading-relaxed italic">{exercise.notes}</p>
                  </div>
                )}

                {exercise.frequency && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/50">
                      Frequency: {exercise.frequency}
                    </p>
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
                        {recommendation.restRange.min === recommendation.restRange.max
                          ? `${recommendation.restRange.min}s`
                          : `${recommendation.restRange.min}-${recommendation.restRange.max}s`}
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
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Standard protocol for this exercise.</p>
                </div>
              )}
            </div>
          </div>

          {(coachingContent.executionPoints.length > 0 || coachingContent.commonMistakes.length > 0 || progressionGuidance || regressionGuidance) && (
            <div className="px-6 py-4 space-y-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-foreground/40 uppercase">
                Coaching Notes
              </h2>

              {coachingContent.executionPoints.length > 0 && (
                <div className="card-elevated rounded-3xl p-5 bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/70">
                      Execution Focus
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {coachingContent.executionPoints.map((point, index) => (
                      <li key={`${point}-${index}`} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p className="text-sm text-foreground/80 leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {coachingContent.commonMistakes.length > 0 && (
                <div className="card-elevated rounded-3xl p-5 bg-red-500/[0.06] border border-red-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-red-200/80">
                      Watch For
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {coachingContent.commonMistakes.map((mistake, index) => (
                      <li key={`${mistake}-${index}`} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
                        <p className="text-sm text-foreground/80 leading-relaxed">{mistake}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(progressionGuidance || regressionGuidance) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {progressionGuidance && (
                    <div className="card-elevated rounded-3xl p-5 bg-emerald-500/[0.06] border border-emerald-500/15">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200/80">
                          Scale Up
                        </h3>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{progressionGuidance}</p>
                    </div>
                  )}

                  {regressionGuidance && (
                    <div className="card-elevated rounded-3xl p-5 bg-amber-500/[0.06] border border-amber-500/15">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw size={16} className="text-amber-400" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100/80">
                          Scale Back
                        </h3>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{regressionGuidance}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

        </div>
      </ScreenShellContent>

      <ScreenShellFooter className={hasFooterActions ? 'pt-0' : ''}>
        <div className="max-w-lg mx-auto w-full">
          {hasFooterActions && (
            <div className="px-6 pt-3 pb-2 space-y-3 border-b border-white/5">
              {showAddWorkoutAction && onAddToWorkout && (
                <Button
                  variant={isInWorkoutBuilder ? 'secondary' : 'primary'}
                  size="lg"
                  fullWidth
                  className="h-14 rounded-2xl font-black text-base uppercase tracking-[0.14em]"
                  disabled={isInWorkoutBuilder}
                  onClick={() => {
                    haptics.medium()
                    onAddToWorkout(exercise)
                  }}
                >
                  {isInWorkoutBuilder ? (
                    <>
                      <Check size={18} className="mr-2" />
                      Added to Workout
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Add to Workout
                    </>
                  )}
                </Button>
              )}

              {showAddAction && onAddToToday && (
                <Button
                  variant={isInToday ? 'secondary' : 'primary'}
                  size="lg"
                  fullWidth
                  className="h-14 rounded-2xl font-black text-base uppercase tracking-[0.14em]"
                  disabled={isInToday}
                  onClick={() => {
                    haptics.medium()
                    onAddToToday(exercise)
                  }}
                >
                  {isInToday ? (
                    <>
                      <Check size={18} className="mr-2" />
                      Added to Today
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Add to Today
                    </>
                  )}
                </Button>
              )}

              {showCompleteAction && onMarkComplete && (
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="h-14 rounded-2xl font-black text-base uppercase tracking-[0.14em] border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => {
                    haptics.success()
                    onMarkComplete(exercise.id)
                  }}
                >
                  Complete Exercise
                </Button>
              )}
            </div>
          )}

          <BottomNav
            active="learn"
            onNavigate={onNavigate}
            onStartAction={onStartAction}
            hasWorkoutToday={hasWorkoutToday}
          />
        </div>
      </ScreenShellFooter>
    </ScreenShell>
  )
}
