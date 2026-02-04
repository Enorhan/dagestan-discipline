'use client'

import React, { useState, useEffect } from 'react'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { CustomWorkout, UserProfile, focusAreaInfo } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Bookmark, Copy, Play, Users, Clock, Dumbbell, ChevronRight } from '@/components/ui/icons'

interface WorkoutDetailProps {
  workout: CustomWorkout
  currentUser: UserProfile | null
  onNavigate: (screen: Screen) => void
  onSelectUser: (user: UserProfile) => void
  onStartWorkout: (workout: CustomWorkout) => void
  onCopyWorkout: (workout: CustomWorkout) => void
  onBack: () => void
}

export function WorkoutDetail({ 
  workout, 
  currentUser,
  onNavigate, 
  onSelectUser,
  onStartWorkout,
  onCopyWorkout,
  onBack 
}: WorkoutDetailProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isOwnWorkout = currentUser?.id === workout.creatorId

  useEffect(() => {
    loadData()
  }, [workout.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Check if saved
      const saved = await supabaseService.getSavedWorkouts()
      setIsSaved(saved.some(s => s.workoutId === workout.id))

      // Get creator info
      const creatorProfile = await supabaseService.getProfile(workout.creatorId)
      setCreator(creatorProfile)
    } catch (e) {
      console.error('Failed to load workout data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser) {
      onNavigate('auth-login')
      return
    }

    haptics.medium()
    try {
      if (isSaved) {
        await supabaseService.unsaveWorkout(workout.id)
      } else {
        await supabaseService.saveWorkout(workout.id)
      }
      setIsSaved(!isSaved)
    } catch (e) {
      console.error('Failed to save workout:', e)
    }
  }

  const handleCopy = () => {
    haptics.success()
    onCopyWorkout(workout)
  }

  const handleStart = () => {
    haptics.heavy()
    onStartWorkout(workout)
  }

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-40">
          <BackButton onClick={onBack} label="Back" />

          {/* Header */}
          <div className="mt-4 mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-black text-foreground flex-1">{workout.name}</h1>
              {!isOwnWorkout && (
                <Button
                  onClick={handleSave}
                  variant="ghost"
                  size="icon"
                  withHaptic={false}
                  className={`w-10 h-10 rounded-full ${
                    isSaved ? 'bg-primary' : 'bg-card'
                  }`}
                >
                  <Bookmark 
                    size={20} 
                    className={isSaved ? 'text-primary-foreground fill-primary-foreground' : 'text-foreground'} 
                  />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">{workout.description || 'No description'}</p>
          </div>

          {/* Creator */}
          {creator && !isOwnWorkout && (
            <Button
              onClick={() => onSelectUser(creator)}
              variant="ghost"
              size="sm"
              className="w-full card-elevated rounded-xl p-4 flex items-center gap-3 mb-6 normal-case tracking-normal h-auto items-start justify-start"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">{creator.displayName}</p>
                <p className="text-xs text-muted-foreground">@{creator.username}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </Button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-6">
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <Clock size={18} className="mx-auto mb-1.5 sm:mb-2 text-primary" />
              <p className="text-lg font-black text-foreground">{workout.estimatedDuration}</p>
              <p className="text-xs text-muted-foreground uppercase">Minutes</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <Dumbbell size={18} className="mx-auto mb-1.5 sm:mb-2 text-primary" />
              <p className="text-lg font-black text-foreground">{workout.exercises.length}</p>
              <p className="text-xs text-muted-foreground uppercase">Exercises</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <Bookmark size={18} className="mx-auto mb-1.5 sm:mb-2 text-primary" />
              <p className="text-lg font-black text-foreground">{workout.saveCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Saves</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: `${focusAreaInfo[workout.focus].color}20`,
                color: focusAreaInfo[workout.focus].color
              }}
            >
              {focusAreaInfo[workout.focus].name}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              workout.difficulty === 'beginner'
                ? 'difficulty-beginner'
                : workout.difficulty === 'intermediate'
                  ? 'difficulty-intermediate'
                  : 'difficulty-advanced'
            }`}>
              {workout.difficulty.charAt(0).toUpperCase() + workout.difficulty.slice(1)}
            </span>
            {workout.sportRelevance.map(sport => (
              <span key={sport} className="px-3 py-1.5 bg-card rounded-lg text-sm text-muted-foreground capitalize">
                {sport}
              </span>
            ))}
          </div>

          {/* Exercises */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Exercises ({workout.exercises.length})
            </h2>
            <div className="space-y-2">
              {workout.exercises.map((exercise, index) => (
                <div key={exercise.id} className="card-elevated rounded-xl p-4 stagger-item">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps || `${exercise.duration}s`} • {exercise.restTime}s rest
                      </p>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScreenShellContent>

      {/* Footer Actions */}
      <ScreenShellFooter>
        <div className="px-6 py-4 flex gap-3">
          {!isOwnWorkout && (
            <Button
              onClick={handleCopy}
              variant="outline"
              size="lg"
              fullWidth
              withHaptic={false}
              className="flex-1 font-bold gap-2 normal-case tracking-normal"
            >
              <Copy size={18} />
              Copy
            </Button>
          )}
          <Button
            onClick={handleStart}
            variant="primary"
            size="lg"
            fullWidth
            withHaptic={false}
            className="flex-1 font-bold uppercase tracking-wide gap-2 card-interactive"
          >
            <Play size={18} />
            Start Workout
          </Button>
        </div>
      </ScreenShellFooter>
    </ScreenShell>
  )
}
