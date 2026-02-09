// ============================================
// SOCIAL WORKOUT SYSTEM TYPES
// ============================================

import { SportType, Exercise, DrillDifficulty, Equipment, WeightUnit, ExperienceLevel, PrimaryGoal } from './types'

// User profile for social features
export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  sport: SportType
  createdAt: string
  trainingDays?: number
  weightUnit?: WeightUnit
  equipment?: Equipment | null
  onboardingCompleted?: boolean | null
  // Intake (program generation)
  experienceLevel?: ExperienceLevel
  bodyweightKg?: number | null
  primaryGoal?: PrimaryGoal
  combatSessionsPerWeek?: number
  sessionMinutes?: number
  injuryNotes?: string | null
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

// New screen types for social features
export type SocialScreen =
  | 'auth-login'
  | 'auth-signup'
  | 'workout-builder'
  | 'user-profile'
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
