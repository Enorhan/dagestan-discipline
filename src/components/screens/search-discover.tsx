'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile, CustomWorkout, WorkoutSearchFilters, focusAreaInfo } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { AnimatedCard } from '@/components/ui/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, ChevronRight, Users } from '@/components/ui/icons'

interface SearchDiscoverProps {
  currentUser: UserProfile | null
  onNavigate: (screen: Screen) => void
  onSelectWorkout: (workout: CustomWorkout) => void
  onSelectUser: (user: UserProfile) => void
  onBack: () => void
}

export function SearchDiscover({ 
  currentUser, 
  onNavigate, 
  onSelectWorkout,
  onSelectUser,
  onBack 
}: SearchDiscoverProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'workouts' | 'users'>('workouts')
  const [workoutResults, setWorkoutResults] = useState<CustomWorkout[]>([])
  const [userResults, setUserResults] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WorkoutSearchFilters>({})

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      setWorkoutResults([])
      setUserResults([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      if (activeTab === 'workouts') {
        const feedItems = await supabaseService.getFeedWorkouts({ ...filters, query: searchQuery })
        setWorkoutResults(feedItems.map(item => item.workout))
      } else {
        const users = await supabaseService.searchUsers(searchQuery)
        setUserResults(users)
      }
    } catch (e) {
      console.error('Search failed:', e)
      setError('Search failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, activeTab, filters])

  useEffect(() => {
    const debounce = setTimeout(performSearch, 300)
    return () => clearTimeout(debounce)
  }, [performSearch])

  // Load popular workouts on mount
  useEffect(() => {
    const loadPopular = async () => {
      setIsLoading(true)
      try {
        const feedItems = await supabaseService.getFeedWorkouts({ sortBy: 'popular' })
        setWorkoutResults(feedItems.map(item => item.workout))
      } catch (e) {
        console.error('Failed to load popular:', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadPopular()
  }, [])

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="px-6 safe-area-top pb-32">
          <BackButton onClick={onBack} label="Back" />

          {/* Search Header */}
          <div className="mt-4 mb-6">
            <h1 className="text-2xl font-black text-foreground mb-4">Discover</h1>
            
            {/* Search Input */}
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'workouts' ? 'Search workouts...' : 'Search users...'}
                leftIcon={<Search size={20} className="text-muted-foreground" />}
                className="h-14 pr-12"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full active:bg-muted-foreground/20"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <X size={14} className="text-foreground" />
                  </div>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
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
              Workouts
            </Button>
            <Button
              onClick={() => setActiveTab('users')}
              variant="ghost"
              size="sm"
              className={`flex-1 h-10 rounded-lg font-medium text-sm flex items-center justify-center gap-1 normal-case tracking-normal ${
                activeTab === 'users'
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'bg-card text-muted-foreground border border-border/60'
              }`}
            >
              <Users size={16} />
              Users
            </Button>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card-elevated rounded-xl p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-card rounded mb-2" />
                  <div className="h-4 w-1/2 bg-card rounded" />
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
              <h3 className="text-lg font-bold text-foreground mb-2">Search failed</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">{error}</p>
              <Button
                onClick={() => {
                  haptics.medium()
                  performSearch()
                }}
                variant="primary"
                size="md"
                withHaptic={false}
                className="px-6 py-3"
              >
                Try Again
              </Button>
            </div>
          ) : activeTab === 'workouts' ? (
            <WorkoutResults
              workouts={workoutResults}
              onSelect={onSelectWorkout}
              searchQuery={searchQuery}
            />
          ) : (
            <UserResults
              users={userResults}
              onSelect={onSelectUser}
              currentUser={currentUser}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}

// Workout Results Component
function WorkoutResults({
  workouts,
  onSelect,
  searchQuery
}: {
  workouts: CustomWorkout[]
  onSelect: (workout: CustomWorkout) => void
  searchQuery: string
}) {
  if (workouts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
          <Search size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          {searchQuery ? 'No workouts found' : 'Search for workouts'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {searchQuery
            ? 'Try different keywords or browse the community feed'
            : 'Find workouts by name, focus area, or sport'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {searchQuery ? `${workouts.length} results` : 'Popular workouts'}
      </p>
      {workouts.map((workout, index) => (
        <AnimatedCard
          key={workout.id}
          variant="elevated"
          staggerIndex={index}
          onClick={() => onSelect(workout)}
          className="w-full p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
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
            </div>
            <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </AnimatedCard>
      ))}
    </div>
  )
}

// User Results Component
function UserResults({
  users,
  onSelect,
  currentUser,
  searchQuery
}: {
  users: UserProfile[]
  onSelect: (user: UserProfile) => void
  currentUser: UserProfile | null
  searchQuery: string
}) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
          <Users size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          {searchQuery ? 'No users found' : 'Search for users'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {searchQuery
            ? 'Try a different username or display name'
            : 'Find athletes to follow and get inspired'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {users.length} {users.length === 1 ? 'user' : 'users'} found
      </p>
      {users.filter(u => u.id !== currentUser?.id).map((user, index) => (
        <AnimatedCard
          key={user.id}
          variant="elevated"
          staggerIndex={index}
          onClick={() => onSelect(user)}
          className="w-full p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-lg">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded capitalize">
                  {user.sport}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.workoutCount} workouts
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
          </div>
        </AnimatedCard>
      ))}
    </div>
  )
}
