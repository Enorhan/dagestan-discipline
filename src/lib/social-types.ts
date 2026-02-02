// ============================================
// SOCIAL WORKOUT SYSTEM TYPES
// ============================================

import { SportType, Exercise, DrillDifficulty } from './types'

// User profile for social features
export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  sport: SportType
  createdAt: string
  // Stats
  workoutCount: number
  followerCount: number
  followingCount: number
  totalSaves: number // How many times their workouts have been saved
}

// Visibility options for workouts
export type WorkoutVisibility = 'private' | 'public'

// Focus areas for custom workouts
export type WorkoutFocus =
  | 'upper-body'
  | 'lower-body'
  | 'full-body'
  | 'core'
  | 'conditioning'
  | 'grip-strength'
  | 'explosive-power'
  | 'endurance'
  | 'mobility'
  | 'recovery'

// Custom workout created by users
export interface CustomWorkout {
  id: string
  creatorId: string
  creator?: UserProfile // Populated when fetching
  
  // Metadata
  name: string
  description: string
  focus: WorkoutFocus
  difficulty: DrillDifficulty
  estimatedDuration: number // minutes
  sportRelevance: SportType[]
  
  // Content
  exercises: CustomWorkoutExercise[]
  
  // Visibility & Social
  visibility: WorkoutVisibility
  saveCount: number
  createdAt: string
  updatedAt: string
  
  // For saved workouts
  isSaved?: boolean
  originalWorkoutId?: string // If this is a copy
}

// Exercise within a custom workout
export interface CustomWorkoutExercise {
  id: string
  name: string
  sets: number
  reps?: number
  duration?: number // seconds
  restTime: number // seconds
  notes?: string
  videoUrl?: string
  order: number
}

// Follow relationship
export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

// Saved workout reference
export interface SavedWorkout {
  id: string
  userId: string
  workoutId: string
  workout?: CustomWorkout // Populated when fetching
  savedAt: string
}

// Feed item for community feed
export interface FeedItem {
  workout: CustomWorkout
  creator: UserProfile
  isSaved: boolean
  isFollowing: boolean
}

// Search filters
export interface WorkoutSearchFilters {
  query?: string
  focus?: WorkoutFocus
  difficulty?: DrillDifficulty
  sport?: SportType
  sortBy?: 'recent' | 'popular' | 'saves'
}

export interface UserSearchFilters {
  query?: string
  sport?: SportType
}

// New screen types for social features
export type SocialScreen =
  | 'auth-login'
  | 'auth-signup'
  | 'workout-builder'
  | 'community-feed'
  | 'user-profile'
  | 'user-profile-other'
  | 'search-discover'
  | 'saved-workouts'
  | 'workout-detail'
  | 'edit-profile'

// Exercise library item for workout builder
export interface ExerciseLibraryItem {
  id: string
  name: string
  category: string
  videoUrl?: string
  defaultSets: number
  defaultReps?: number
  defaultDuration?: number
  defaultRestTime: number
}

// Workout builder state
export interface WorkoutBuilderState {
  name: string
  description: string
  focus: WorkoutFocus
  difficulty: DrillDifficulty
  sportRelevance: SportType[]
  visibility: WorkoutVisibility
  exercises: CustomWorkoutExercise[]
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  isLoading: boolean
  error: string | null
}

// Social state for the app
export interface SocialState {
  auth: AuthState
  myWorkouts: CustomWorkout[]
  savedWorkouts: SavedWorkout[]
  following: string[] // User IDs
  followers: string[] // User IDs
  feedCache: FeedItem[]
}

// Focus area display info
export const focusAreaInfo: Record<WorkoutFocus, { name: string; color: string }> = {
  'upper-body': { name: 'Upper Body', color: '#8b0000' },
  'lower-body': { name: 'Lower Body', color: '#9a1a1a' },
  'full-body': { name: 'Full Body', color: '#b02222' },
  'core': { name: 'Core', color: '#7a0b0b' },
  'conditioning': { name: 'Conditioning', color: '#a11212' },
  'grip-strength': { name: 'Grip Strength', color: '#6b0b0b' },
  'explosive-power': { name: 'Explosive Power', color: '#c41e3a' },
  'endurance': { name: 'Endurance', color: '#8f1d1d' },
  'mobility': { name: 'Mobility', color: '#7f2a2a' },
  'recovery': { name: 'Recovery', color: '#d4af37' }
}
