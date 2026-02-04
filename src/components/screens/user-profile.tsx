'use client'

import React, { useState, useEffect } from 'react'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile as UserProfileType, CustomWorkout, focusAreaInfo } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Settings, Plus, ChevronRight, Edit, Bookmark, BarChart } from '@/components/ui/icons'

interface UserProfileProps {
  user: UserProfileType
  isOwnProfile: boolean
  currentUser: UserProfileType | null
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onBack?: () => void
}

export function UserProfileScreen({ 
  user, 
  isOwnProfile, 
  currentUser,
  trainingTarget, 
  onNavigate,
  onSelectWorkout,
  onBack
}: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<'workouts' | 'saved'>('workouts')
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([])
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (isOwnProfile) {
        const myWorkouts = await supabaseService.getUserWorkouts(user.id)
        setWorkouts(myWorkouts)

        const saved = await supabaseService.getSavedWorkouts()
        const savedWithDetails = saved.map(s => s.workout).filter(Boolean) as CustomWorkout[]
        setSavedWorkouts(savedWithDetails)
      } else {
        // For other users, show only their public workouts
        const userWorkouts = await supabaseService.getUserWorkouts(user.id)
        // Filter to only public workouts for non-own profiles
        setWorkouts(userWorkouts.filter(w => w.visibility === 'public'))

        // Check if following
        const isFollowingUser = await supabaseService.isFollowing(user.id)
        setIsFollowing(isFollowingUser)
      }
    } catch (e) {
      console.error('Failed to load profile data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser) {
      onNavigate('auth-login')
      return
    }

    // Show confirmation for unfollow
    if (isFollowing) {
      setShowUnfollowConfirm(true)
      return
    }

    haptics.medium()
    try {
      await supabaseService.followUser(user.id)
      setIsFollowing(true)
    } catch (e) {
      console.error('Failed to follow:', e)
    }
  }

  const confirmUnfollow = async () => {
    haptics.medium()
    try {
      await supabaseService.unfollowUser(user.id)
      setIsFollowing(false)
    } catch (e) {
      console.error('Failed to unfollow:', e)
    } finally {
      setShowUnfollowConfirm(false)
    }
  }

  const displayWorkouts = activeTab === 'workouts' ? workouts : savedWorkouts

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          {/* Header */}
          {!isOwnProfile && onBack && (
            <BackButton onClick={onBack} label="Back" />
          )}

          {/* Profile Header */}
          <div className="flex items-start gap-4 mt-4 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-primary font-black text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground truncate">{user.displayName}</h1>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-foreground mt-2 line-clamp-2">{user.bio}</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded capitalize">
                  {user.sport}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isOwnProfile ? (
              <Button
                onClick={() => onNavigate('settings')}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-card text-foreground"
              >
                <Settings size={20} className="text-foreground" />
              </Button>
            ) : null}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4">
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-foreground">{user.workoutCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Workouts</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-foreground">{user.followerCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Followers</p>
            </div>
            <div className="card-elevated rounded-xl p-3 sm:p-4 text-center">
              <p className="text-2xl font-black text-foreground">{user.followingCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Following</p>
            </div>
          </div>

          {/* View Statistics - Own Profile Only */}
          {isOwnProfile && (
            <Button
              onClick={() => {
                haptics.light()
                onNavigate('training-stats')
              }}
              variant="ghost"
              size="md"
              fullWidth
              withHaptic={false}
              className="mb-4 h-14 card-elevated rounded-xl font-semibold text-foreground hover:bg-card/80 transition-colors normal-case tracking-normal"
            >
              <div className="flex items-center justify-between w-full px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <BarChart size={20} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Training Statistics</p>
                    <p className="text-xs text-muted-foreground">View your progress & insights</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </div>
            </Button>
          )}

          {/* Follow/Edit Button */}
          {isOwnProfile ? (
            <Button
              onClick={() => onNavigate('edit-profile')}
              variant="outline"
              size="md"
              fullWidth
              className="rounded-xl font-semibold gap-2 mb-6 normal-case tracking-normal"
            >
              <Edit size={18} />
              Edit Profile
            </Button>
          ) : (
            <Button
              onClick={handleFollow}
              variant={isFollowing ? 'outline' : 'primary'}
              size="md"
              fullWidth
              withHaptic={false}
              className="rounded-xl font-semibold mb-6 normal-case tracking-normal"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}

          {/* Tabs */}
          {isOwnProfile && (
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setActiveTab('workouts')}
                variant="ghost"
                size="sm"
                className={`flex-1 h-10 rounded-lg font-medium text-sm normal-case tracking-normal ${
                  activeTab === 'workouts'
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card text-muted-foreground border border-border/60'
                }`}
              >
                My Workouts
              </Button>
              <Button
                onClick={() => setActiveTab('saved')}
                variant="ghost"
                size="sm"
                className={`flex-1 h-10 rounded-lg font-medium text-sm flex items-center justify-center gap-1 normal-case tracking-normal ${
                  activeTab === 'saved'
                    ? 'bg-primary text-primary-foreground border border-primary'
                    : 'bg-card text-muted-foreground border border-border/60'
                }`}
              >
                <Bookmark size={16} />
                Saved
              </Button>
            </div>
          )}

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
          ) : displayWorkouts.length === 0 ? (
            <EmptyWorkouts 
              isOwnProfile={isOwnProfile} 
              isSavedTab={activeTab === 'saved'}
              onCreateWorkout={() => onNavigate('workout-builder')}
              onBrowse={() => onNavigate('community-feed')}
            />
          ) : (
            <div className="space-y-3">
              {displayWorkouts.map(workout => (
                <WorkoutListItem
                  key={workout.id}
                  workout={workout}
                  onTap={() => onSelectWorkout(workout)}
                  showVisibility={isOwnProfile && activeTab === 'workouts'}
                />
              ))}
            </div>
          )}

          {/* Create Workout Button */}
          {isOwnProfile && activeTab === 'workouts' && displayWorkouts.length > 0 && (
            <Button
              onClick={() => {
                haptics.medium()
                onNavigate('workout-builder')
              }}
              variant="ghost"
              size="lg"
              fullWidth
              withHaptic={false}
              className="mt-4 border-2 border-dashed border-border rounded-xl gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors normal-case tracking-normal"
            >
              <Plus size={20} />
              Create New Workout
            </Button>
          )}
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav active="profile" trainingTarget={trainingTarget} onNavigate={onNavigate} />
      </ScreenShellFooter>

      {/* Unfollow Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnfollowConfirm}
        title="Unfollow User?"
        message={`Stop following ${user.displayName}? You won't see their workouts in your feed.`}
        confirmText="Unfollow"
        cancelText="Keep Following"
        variant="destructive"
        onConfirm={confirmUnfollow}
        onClose={() => setShowUnfollowConfirm(false)}
      />
    </ScreenShell>
  )
}

// Workout List Item Component
function WorkoutListItem({
  workout,
  onTap,
  showVisibility
}: {
  workout: CustomWorkout
  onTap: () => void
  showVisibility: boolean
}) {
  return (
    <Button
      onClick={onTap}
      variant="ghost"
      size="sm"
      className="w-full card-elevated rounded-xl p-4 text-left stagger-item normal-case tracking-normal h-auto items-start justify-start"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{workout.name}</h3>
            {showVisibility && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                workout.visibility === 'public'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-card text-muted-foreground'
              }`}>
                {workout.visibility === 'public' ? '🌐' : '🔒'}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
            {workout.description || 'No description'}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{workout.estimatedDuration} min</span>
            <span>•</span>
            <span>{workout.exercises.length} exercises</span>
            <span>•</span>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${focusAreaInfo[workout.focus].color}20`,
                color: focusAreaInfo[workout.focus].color
              }}
            >
              {focusAreaInfo[workout.focus].name}
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </Button>
  )
}

// Empty Workouts Component
function EmptyWorkouts({
  isOwnProfile,
  isSavedTab,
  onCreateWorkout,
  onBrowse
}: {
  isOwnProfile: boolean
  isSavedTab: boolean
  onCreateWorkout: () => void
  onBrowse: () => void
}) {
  if (isSavedTab) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
          <Bookmark size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No saved workouts</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          Browse the community to find workouts you love
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

  if (isOwnProfile) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
          <Plus size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No workouts yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          Create your first workout and share it with the community
        </p>
        <Button
          onClick={() => {
            haptics.medium()
            onCreateWorkout()
          }}
          variant="primary"
          size="md"
          withHaptic={false}
          className="px-6 py-3"
        >
          Create Workout
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">No public workouts</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        This user hasn't shared any workouts yet
      </p>
    </div>
  )
}
