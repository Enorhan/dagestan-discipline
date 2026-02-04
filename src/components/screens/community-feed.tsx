'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Screen, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { FeedItem, WorkoutSearchFilters, focusAreaInfo, CustomWorkout, UserProfile } from '@/lib/social-types'
import { Button } from '@/components/ui/button'
import { Search, Heart, Bookmark, Users, Plus, Filter, ChevronRight } from '@/components/ui/icons'

interface CommunityFeedProps {
  currentUser: UserProfile | null
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onSelectUser: (user: UserProfile) => void
}

export function CommunityFeed({ 
  currentUser, 
  trainingTarget, 
  onNavigate, 
  onSelectWorkout,
  onSelectUser 
}: CommunityFeedProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WorkoutSearchFilters>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('community-filters')
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })
  const [showFilters, setShowFilters] = useState(false)

  // Persist filters to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('community-filters', JSON.stringify(filters))
    }
  }, [filters])

  const loadFeed = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await supabaseService.getFeedWorkouts(filters)
      setFeedItems(items)
    } catch (e) {
      console.error('Failed to load feed:', e)
      setError('Failed to load community feed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const handleSave = async (workoutId: string, isSaved: boolean) => {
    if (!currentUser) {
      haptics.error()
      onNavigate('auth-login')
      return
    }

    haptics.medium()
    try {
      if (isSaved) {
        await supabaseService.unsaveWorkout(workoutId)
      } else {
        await supabaseService.saveWorkout(workoutId)
      }
      // Update local state
      setFeedItems(prev => prev.map(item =>
        item.workout.id === workoutId
          ? { ...item, isSaved: !isSaved, workout: { ...item.workout, saveCount: item.workout.saveCount + (isSaved ? -1 : 1) } }
          : item
      ))
    } catch (e) {
      console.error('Failed to save workout:', e)
    }
  }

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!currentUser) {
      haptics.error()
      onNavigate('auth-login')
      return
    }

    haptics.medium()
    try {
      if (isFollowing) {
        await supabaseService.unfollowUser(userId)
      } else {
        await supabaseService.followUser(userId)
      }
      // Update local state
      setFeedItems(prev => prev.map(item =>
        item.creator.id === userId
          ? { ...item, isFollowing: !isFollowing }
          : item
      ))
    } catch (e) {
      console.error('Failed to follow user:', e)
    }
  }

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth alwaysScroll>
        {/* Header */}
        <div className="px-6 safe-area-top pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-black text-foreground">Community</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => onNavigate('search-discover')}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-card"
              >
                <Search size={20} className="text-foreground" />
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="icon"
                className={`w-10 h-10 rounded-full ${
                  showFilters ? 'bg-primary' : 'bg-card'
                }`}
              >
                <Filter size={20} className={showFilters ? 'text-primary-foreground' : 'text-foreground'} />
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          {showFilters && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-fade-x">
              <FilterPill
                label="All"
                active={!filters.sortBy}
                onClick={() => setFilters({})}
              />
              <FilterPill
                label="Popular"
                active={filters.sortBy === 'popular'}
                onClick={() => setFilters({ ...filters, sortBy: 'popular' })}
              />
              <FilterPill
                label="Wrestling"
                active={filters.sport === 'wrestling'}
                onClick={() => setFilters({ ...filters, sport: filters.sport === 'wrestling' ? undefined : 'wrestling' })}
              />
              <FilterPill
                label="BJJ"
                active={filters.sport === 'bjj'}
                onClick={() => setFilters({ ...filters, sport: filters.sport === 'bjj' ? undefined : 'bjj' })}
              />
              <FilterPill
                label="Judo"
                active={filters.sport === 'judo'}
                onClick={() => setFilters({ ...filters, sport: filters.sport === 'judo' ? undefined : 'judo' })}
              />
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="px-6 pb-32 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card-elevated rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-card" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-card rounded mb-1" />
                      <div className="h-3 w-16 bg-card rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-3/4 bg-card rounded mb-2" />
                  <div className="h-4 w-full bg-card rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">{error}</p>
              <Button
                onClick={() => {
                  haptics.medium()
                  loadFeed()
                }}
                variant="primary"
                size="md"
                withHaptic={false}
                className="px-6 py-3"
              >
                Try Again
              </Button>
            </div>
          ) : feedItems.length === 0 ? (
            <EmptyFeed onCreateWorkout={() => onNavigate('workout-builder')} currentUser={currentUser} />
          ) : (
            feedItems.map(item => (
              <WorkoutCard
                key={item.workout.id}
                item={item}
                currentUser={currentUser}
                onTap={() => onSelectWorkout(item.workout)}
                onSave={() => handleSave(item.workout.id, item.isSaved)}
                onFollow={() => handleFollow(item.creator.id, item.isFollowing)}
                onCreatorTap={() => onSelectUser(item.creator)}
              />
            ))
          )}
        </div>

        {/* FAB for creating workout - z-20 = dropdown layer per design-tokens */}
        {currentUser && feedItems.length > 0 && (
          <Button
            onClick={() => {
              haptics.medium()
              onNavigate('workout-builder')
            }}
            variant="primary"
            size="icon"
            withHaptic={false}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+100px)] right-6 w-14 h-14 rounded-full shadow-lg z-20"
          >
            <Plus size={24} className="text-primary-foreground" />
          </Button>
        )}
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav active="community" trainingTarget={trainingTarget} onNavigate={onNavigate} />
      </ScreenShellFooter>
    </ScreenShell>
  )
}

// Filter Pill Component
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap transition-all normal-case tracking-normal ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border border-border text-foreground'
      }`}
    >
      {label}
    </Button>
  )
}

// Workout Card Component
function WorkoutCard({
  item,
  currentUser,
  onTap,
  onSave,
  onFollow,
  onCreatorTap
}: {
  item: FeedItem
  currentUser: UserProfile | null
  onTap: () => void
  onSave: () => void
  onFollow: () => void
  onCreatorTap: () => void
}) {
  const { workout, creator, isSaved, isFollowing } = item
  const isOwnWorkout = currentUser?.id === creator.id

  return (
    <div className="card-elevated rounded-xl overflow-hidden stagger-item">
      {/* Creator Header */}
      <div className="p-4 flex items-center gap-3">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onCreatorTap()
          }}
          variant="ghost"
          size="icon"
          className="w-11 h-11 rounded-full bg-primary/20"
        >
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-primary font-bold text-sm">
              {creator.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <Button
            onClick={onCreatorTap}
            variant="ghost"
            size="sm"
            stacked
            className="text-left p-0 h-auto min-h-0 normal-case tracking-normal items-start justify-start"
          >
            <p className="font-semibold text-foreground text-sm truncate">{creator.displayName}</p>
            <p className="text-xs text-muted-foreground">@{creator.username}</p>
          </Button>
        </div>
        {!isOwnWorkout && (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onFollow()
            }}
            variant="ghost"
            size="sm"
            withHaptic={false}
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold transition-all normal-case tracking-normal ${
              isFollowing
                ? 'bg-card border border-border text-muted-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Workout Content */}
      <Button
        onClick={onTap}
        variant="ghost"
        size="sm"
        stacked
        className="w-full text-left px-4 pb-3 normal-case tracking-normal h-auto items-start justify-start"
      >
        <h3 className="text-lg font-bold text-foreground mb-1">{workout.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{workout.description || 'No description'}</p>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs mb-3">
          <span className="text-foreground font-medium">{workout.estimatedDuration} min</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{workout.exercises.length} exercises</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground capitalize">{workout.difficulty}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: `${focusAreaInfo[workout.focus].color}20`, color: focusAreaInfo[workout.focus].color }}
          >
            {focusAreaInfo[workout.focus].name}
          </span>
          {workout.sportRelevance.slice(0, 2).map(sport => (
            <span key={sport} className="px-2 py-0.5 bg-card rounded text-xs text-muted-foreground capitalize">
              {sport}
            </span>
          ))}
        </div>
      </Button>

      {/* Exercise Preview */}
      <div className="px-4 pb-3">
        <div className="bg-card/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
          {workout.exercises.slice(0, 3).map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className="text-foreground">{ex.name}</span>
              <span className="text-muted-foreground text-xs">
                {ex.sets}×{ex.reps || `${ex.duration}s`}
              </span>
            </div>
          ))}
          {workout.exercises.length > 3 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{workout.exercises.length - 3} more exercises
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-border/50 pt-3">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onSave()
          }}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="flex items-center gap-2 p-0 h-auto min-h-[44px] normal-case tracking-normal"
        >
          <Bookmark
            size={20}
            className={isSaved ? 'text-primary fill-primary' : 'text-muted-foreground'}
          />
          <span className={`text-sm font-medium ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
            {workout.saveCount} {workout.saveCount === 1 ? 'save' : 'saves'}
          </span>
        </Button>
        <Button
          onClick={onTap}
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-muted-foreground p-0 h-auto min-h-[44px] normal-case tracking-normal"
        >
          <span className="text-sm">View workout</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// Empty Feed Component
function EmptyFeed({ onCreateWorkout, currentUser }: { onCreateWorkout: () => void; currentUser: UserProfile | null }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
        <Users size={40} className="text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">No workouts yet</h3>
      <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
        Be the first to share a workout with the community!
      </p>
      {currentUser ? (
        <Button
          onClick={onCreateWorkout}
          variant="primary"
          size="md"
          className="px-6 py-3"
        >
          Create Workout
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to create and share workouts
        </p>
      )}
    </div>
  )
}
