export type Screen =
  | 'onboarding-sport'
  | 'onboarding-schedule'
  | 'onboarding-equipment'
  | 'home'
  | 'week-view'
  | 'workout-session'
  | 'rest-timer'
  | 'session-complete'
  | 'exercise-list'
  | 'post-workout-reflection'
  | 'missed-session-accountability'
  | 'round-timer'
  | 'settings'
  | 'log-activity'
  | 'training-stats'
  | 'training-hub'
  | 'drill-detail'
  | 'category-list'
  | 'routine-player'
  | 'learning-path'
  | 'body-part-selector'
  // Exercise screens
  | 'exercises-main'
  | 'sport-exercise-categories'
  | 'sport-category-exercises'
  // Social screens
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
  | 'loading'

// Exercise categories for sport-specific exercises
export type ExerciseCategory =
  | 'full-body'
  | 'legs'
  | 'chest'
  | 'shoulders'
  | 'back'
  | 'arms'
  | 'core'
  | 'neck'

// Activity types for external training logging
export type ActivityType =
  | 'bjj-session'
  | 'wrestling-practice'
  | 'judo-class'
  | 'open-mat'
  | 'competition'
  | 'sparring'
  | 'drilling'
  | 'conditioning'

// Log for external training activities
export interface ActivityLog {
  id: string
  date: string // ISO date string
  type: ActivityType
  duration: number // in minutes
  intensity: number // 1-10
  notes?: string
}

export type TimerMode = 'mma' | 'hiit' | 'tabata'

export type Equipment = 'bodyweight' | 'gym'

export type SportType = 'wrestling' | 'judo' | 'bjj'
export type WeightUnit = 'lbs' | 'kg'

// Template for generating sessions based on training days
export interface SessionTemplate {
  id: string
  dayNumber: number // 1-6
  focus: string
  duration: number
  exercises: Exercise[]
}

// Sport-specific program with templates for different training frequencies
export interface SportProgram {
  sport: SportType
  name: string
  description: string
  templates: SessionTemplate[] // Up to 6 templates for 6-day programs
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps?: number
  duration?: number // in seconds
  restTime: number // in seconds
  notes?: string
  videoUrl?: string // YouTube embed URL for exercise demo
}

export interface AthleteExerciseGroup {
  athlete: string
  sport: SportType
  exercises: string[]
}

export interface Session {
  id: string
  day: string
  focus: string
  duration: number // estimated minutes
  exercises: Exercise[]
}

export interface WeekDay {
  day: string
  shortDay: string
  planned: boolean
  completed: boolean
}

export interface SessionLog {
  id: string
  date: string // ISO date string
  sessionId: string
  completed: boolean
  effortRating?: number // 1-10
  totalTime?: number // in seconds
  notes?: string
  weight?: Record<string, number[]> // exerciseId -> array of weights per set
  volume?: number // total volume (sets × reps × weight)
}

export interface AppState {
  selectedSport: SportType | null
  trainingDays: number
  equipment: Equipment | null
  weightUnit: WeightUnit
  currentScreen: Screen
  currentSession: Session | null
  currentExerciseIndex: number
  currentSet: number
  completedSessions: number
  plannedSessions: number
  restTimeRemaining: number
  sessionStartTime: number | null
  weekProgress: WeekDay[]
  // Streak & Accountability
  currentStreak: number
  longestStreak: number
  lastWorkoutDate: string | null // ISO date string
  sessionHistory: SessionLog[]
  missedSessionExcuse: string | null
}

// ============================================
// TRAINING HUB TYPES
// ============================================

export type DrillCategory =
  | 'technique'        // Wrestling/BJJ/Judo techniques
  | 'exercise'         // Strength training exercises
  | 'injury-prevention'// Prehab and injury prevention
  | 'mobility'         // Stretches and mobility work
  | 'conditioning'     // Cardio and conditioning drills
  | 'warmup'           // Pre-workout warmup drills
  | 'recovery'         // Post-workout recovery

export type DrillSubcategory =
  // Technique subcategories
  | 'takedowns' | 'defense' | 'ground-work' | 'submissions' | 'escapes'
  // Exercise subcategories
  | 'upper-body' | 'lower-body' | 'core' | 'full-body' | 'grip'
  // Injury prevention subcategories (by body part)
  | 'neck' | 'shoulders' | 'knees' | 'hips' | 'back' | 'fingers'
  // Mobility subcategories
  | 'hip-mobility' | 'shoulder-mobility' | 'spine-mobility' | 'ankle-mobility'
  // General
  | 'general'

export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Drill {
  id: string
  name: string
  category: DrillCategory
  subcategory: DrillSubcategory

  // Media
  videoUrl: string
  thumbnailUrl?: string

  // Metadata
  duration: number              // seconds
  difficulty: DrillDifficulty
  sportRelevance: SportType[]   // ['wrestling', 'bjj', 'judo']
  equipment?: string[]          // ['kettlebell', 'barbell', 'none']

  // Educational Content
  description: string
  benefits: string[]
  musclesWorked?: string[]
  injuryPrevention?: string

  // Instructions
  instructions: string[]
  commonMistakes?: string[]
  coachingCues?: string[]       // Quick tips during execution

  // Relationships
  relatedDrills?: string[]      // IDs of related drills
  prerequisiteDrills?: string[] // What to learn first
  progressions?: string[]       // Harder versions
}

// Learning paths for technique mastery
export interface LearningPath {
  id: string
  name: string
  description: string
  sport: SportType
  difficulty: DrillDifficulty
  drills: string[]              // Ordered list of drill IDs
  estimatedWeeks: number
}

// Pre-built routines (warmup, recovery)
export interface Routine {
  id: string
  name: string
  type: 'warmup' | 'recovery' | 'mobility'
  duration: number              // minutes
  description: string
  forWorkoutFocus?: string[]    // ['Explosive Power', 'Grip & Carry']
  forSport?: SportType[]
  drills: RoutineDrill[]
}

export interface RoutineDrill {
  drillId: string
  duration: number              // seconds for this drill in the routine
  reps?: number                 // optional rep count instead of duration
}
