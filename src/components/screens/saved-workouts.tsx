'use client'

import React, { useState, useEffect } from 'react'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { CustomWorkout, focusAreaInfo } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Bookmark, ChevronRight, Copy, Trash } from '@/components/ui/icons'

interface SavedWorkoutsProps {
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onBack: () => void
}

export function SavedWorkouts({
  trainingTarget,
  onNavigate,
  onSelectWorkout,
  onBack
}: SavedWorkoutsProps) {
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workoutToUnsave, setWorkoutToUnsave] = useState<CustomWorkout | null>(null)

  useEffect(() => {
    loadSavedWorkouts()
  }, [])

  const loadSavedWorkouts = async () => {
    setIsLoading(true)
    try {
      const saved = await supabaseService.getSavedWorkouts()
      const workoutsWithDetails = saved
        .map(s => s.workout)
        .filter(Boolean) as CustomWorkout[]
      setSavedWorkouts(workoutsWithDetails)
    } catch (e) {
      console.error('Failed to load saved workouts:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsave = async (workout: CustomWorkout) => {
    setWorkoutToUnsave(workout)
  }

  const confirmUnsave = async () => {
    if (!workoutToUnsave) return
    haptics.medium()
    try {
      await supabaseService.unsaveWorkout(workoutToUnsave.id)
      setSavedWorkouts(prev => prev.filter(w => w.id !== workoutToUnsave.id))
    } catch (e) {
      console.error('Failed to unsave workout:', e)
    } finally {
      setWorkoutToUnsave(null)
    }
  }

  const handleCopy = async (workout: CustomWorkout) => {
    haptics.success()
    // Navigate to workout builder with the workout data for copying
    // The workout-builder will handle copying the workout
    onNavigate('workout-builder')
  }

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          <BackButton onClick={onBack} label="Back" />

          {/* Header */}
          <div className="mt-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-foreground">Saved Workouts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Workouts you've saved from the community
            </p>
          </div>

          {/* Workouts List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-elevated rounded-xl p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-card rounded mb-2" />
                  <div className="h-4 w-1/2 bg-card rounded" />
                </div>
              ))}
            </div>
          ) : savedWorkouts.length === 0 ? (
            <EmptySaved onBrowse={() => onNavigate('community-feed')} />
          ) : (
            <div className="space-y-3">
              {savedWorkouts.map(workout => (
                <SavedWorkoutCard
                  key={workout.id}
                  workout={workout}
                  onTap={() => onSelectWorkout(workout)}
                  onUnsave={() => handleUnsave(workout)}
                  onCopy={() => handleCopy(workout)}
                />
              ))}
            </div>
          )}
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav active="community" trainingTarget={trainingTarget} onNavigate={onNavigate} />
      </ScreenShellFooter>

      {/* Unsave Confirmation Modal */}
      <ConfirmationModal
        isOpen={workoutToUnsave !== null}
        title="Remove from Saved?"
        message={workoutToUnsave ? `Remove "${workoutToUnsave.name}" from your saved workouts?` : ''}
        confirmText="Remove"
        cancelText="Keep"
        variant="destructive"
        onConfirm={confirmUnsave}
        onClose={() => setWorkoutToUnsave(null)}
      />
    </ScreenShell>
  )
}

// Saved Workout Card Component
function SavedWorkoutCard({ 
  workout, 
  onTap, 
  onUnsave, 
  onCopy 
}: { 
  workout: CustomWorkout
  onTap: () => void
  onUnsave: () => void
  onCopy: () => void
}) {
  return (
    <div className="card-elevated rounded-xl overflow-hidden stagger-item">
      <Button
        onClick={onTap}
        variant="ghost"
        size="sm"
        stacked
        className="w-full p-4 text-left normal-case tracking-normal h-auto items-start justify-start"
      >
        <h3 className="font-semibold text-foreground truncate mb-1">{workout.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
          {workout.description || 'No description'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ 
              backgroundColor: `${focusAreaInfo[workout.focus].color}20`, 
              color: focusAreaInfo[workout.focus].color 
            }}
          >
            {focusAreaInfo[workout.focus].name}
          </span>
          <span className="text-xs text-muted-foreground">
            {workout.estimatedDuration} min • {workout.exercises.length} exercises
          </span>
        </div>
      </Button>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Button
          onClick={onCopy}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="flex-1 h-10 bg-primary/10 text-primary rounded-lg font-medium text-sm gap-2 normal-case tracking-normal"
        >
          <Copy size={16} />
          Copy & Customize
        </Button>
        <Button
          onClick={onUnsave}
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-red-500/10 text-red-400 rounded-lg"
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  )
}

// Empty Saved Component
function EmptySaved({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
        <Bookmark size={40} className="text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">No saved workouts</h3>
      <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
        Browse the community to find workouts you love and save them here
      </p>
      <Button
        onClick={() => {
          haptics.medium()
          onBrowse()
        }}
        variant="primary"
        size="md"
        withHaptic={false}
        className="px-6 py-3"
      >
        Browse Community
      </Button>
    </div>
  )
}
