export type Screen =
  | 'onboarding-sport'
  | 'onboarding-schedule'
  | 'onboarding-level'
  | 'onboarding-intake'
  | 'onboarding-equipment'
  | 'home'
  | 'today-editor'
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
  | 'athlete-detail'
  | 'program-session-editor'
  // Exercise screens
  | 'sport-exercise-categories'
  | 'sport-category-exercises'
  | 'exercise-detail'
  // Social screens
  | 'auth-login'
  | 'auth-signup'
  | 'workout-builder'
  | 'user-profile'
  | 'workout-detail'
  | 'edit-profile'
  | 'loading'
  | 'navigation-not-set'

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
  athleteId?: string
  sport: SportType
  achievements?: string[]
  exercises: string[]
}

// Enhanced exercise data for display in lists
export interface EnhancedExerciseData {
  id: string
  name: string
  category: string
  muscleGroups: string[]
  equipment: string[]
  description?: string
  videoUrl?: string
  isWeighted: boolean
  sport: SportType
  // Athlete-specific data
  athleteId: string
  athleteName: string
  athleteAchievements: string[]
  reps?: string
  sets?: string
  weight?: string
  duration?: string
  frequency?: string
  priority: number
  notes?: string
}

// Enhanced athlete group with full exercise data
export interface EnhancedAthleteExerciseGroup {
  athleteId: string
  athleteName: string
  sport: SportType
  achievements: string[]
  exercises: EnhancedExerciseData[]
  imageUrl?: string
}

// Exercise counts by category
export interface ExerciseCounts {
  bySport: Record<SportType, number>
  byCategory: Record<ExerciseCategory, number>
  bySportAndCategory: Record<string, number> // "wrestling-legs" -> count
  athletesBySport: Record<SportType, number>
}

// Sort options for exercise lists
export type ExerciseSortOption = 'athlete' | 'name' | 'priority' | 'equipment'

// Filter options for exercise lists
export interface ExerciseFilters {
  equipment?: string[]
  hasVideo?: boolean
  hasAthleteData?: boolean
}

// Experience levels for exercise recommendations
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

// Primary training goal used for program generation (MVP)
export type PrimaryGoal = 'balanced' | 'strength' | 'power' | 'conditioning'

// Elite athlete's ACTUAL workout data (from research)
export interface AthleteExerciseData {
  athleteId: string
  athleteName: string
  athleteSport: SportType
  athleteAchievements: string[]

  // Raw data from research (optional fields - only when specified in sources)
  reps?: string          // "42 reps", "1000 reps", "10 reps at 200kg"
  sets?: string          // Rarely specified
  weight?: string        // "180kg", "50-60kg", "200kg"
  duration?: string      // "20s sprint / 40s rest"
  frequency?: string     // "Daily", "3x per week"
  priority: number       // 1-10 importance for this athlete
  notes?: string         // Context from sources

  // Metadata
  source: 'research'     // Always 'research' for athlete data
  verified: boolean      // True if from verified sources
}

// Science-based recommendations for users
export interface ExerciseRecommendation {
  experienceLevel: ExperienceLevel

  // Recommended ranges
  setsRange: { min: number; max: number }
  repsRange: { min: number; max: number }
  restRange: { min: number; max: number } // in seconds

  // Guidance
  tempo?: string                    // "3-1-1-0" (eccentric-pause-concentric-pause)
  progressionNotes?: string         // How to make it harder
  regressionNotes?: string          // How to make it easier

  // Metadata
  source: 'recommendation'          // Always 'recommendation'
  basedOn: 'exercise-science'       // Methodology
}

// Combined view for UI - exercise with both athlete data and recommendations
export interface ExerciseWithGuidance {
  // Base exercise info
  id: string
  name: string
  category: string
  muscleGroups: string[]
  description?: string
  equipment?: string[]
  isWeighted: boolean
  sport?: SportType
  athleteSpecific: boolean
  videoUrl?: string

  // Elite athlete data (if available) - can have multiple athletes
  athleteData?: AthleteExerciseData[]

  // User recommendations (based on their level)
  recommendations?: ExerciseRecommendation
}

// Athlete profile
export interface Athlete {
  id: string
  name: string
  sport: SportType
  nationality?: string
  achievements?: string[]
  bio?: string
  imageUrl?: string
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
