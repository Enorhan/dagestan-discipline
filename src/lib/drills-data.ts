import { Drill, LearningPath, Routine, DrillCategory, DrillSubcategory } from './types'

// ============================================
// INJURY PREVENTION DRILLS
// ============================================

export const injuryPreventionDrills: Drill[] = []

// ============================================
// MOBILITY DRILLS
// ============================================

export const mobilityDrills: Drill[] = []

// ============================================
// WARMUP DRILLS
// ============================================

export const warmupDrills: Drill[] = []

// ============================================
// EXERCISE DEMOS
// ============================================

export const exerciseDemos: Drill[] = []

// ============================================
// TECHNIQUE DRILLS
// ============================================

export const techniqueDrills: Drill[] = []

// ============================================
// COMBINED DRILLS
// ============================================

export const allDrills: Drill[] = []

// ============================================
// ROUTINES
// ============================================

export const routines: Routine[] = []

// ============================================
// LEARNING PATHS
// ============================================

export const learningPaths: LearningPath[] = []

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getDrillById(id: string): Drill | undefined {
  return allDrills.find(drill => drill.id === id)
}

export function getDrillsByCategory(category: DrillCategory): Drill[] {
  return allDrills.filter(drill => drill.category === category)
}

export function getDrillsBySubcategory(subcategory: DrillSubcategory): Drill[] {
  return allDrills.filter(drill => drill.subcategory === subcategory)
}

export function getRoutineById(id: string): Routine | undefined {
  return routines.find(routine => routine.id === id)
}

export function getRoutinesForWorkout(workoutFocus: string, sport?: string): Routine[] {
  return routines.filter(routine => {
    const matchesFocus = routine.forWorkoutFocus?.includes(workoutFocus)
    const matchesSport = !sport || !routine.forSport || routine.forSport.includes(sport as any)
    return matchesFocus && matchesSport
  })
}

export function getLearningPathById(id: string): LearningPath | undefined {
  return learningPaths.find(path => path.id === id)
}

// Category display info
export const categoryInfo: Record<DrillCategory, { name: string; icon: string; description: string }> = {
  'technique': { name: 'Technique', icon: '🤼', description: 'Wrestling, BJJ, and Judo techniques' },
  'exercise': { name: 'Exercise Demos', icon: '💪', description: 'Strength training exercise guides' },
  'injury-prevention': { name: 'Injury Prevention', icon: '🛡️', description: 'Prehab exercises by body part' },
  'mobility': { name: 'Mobility', icon: '🧘', description: 'Stretches and mobility work' },
  'conditioning': { name: 'Conditioning', icon: '🔥', description: 'Cardio and conditioning drills' },
  'warmup': { name: 'Warmup', icon: '🏃', description: 'Pre-workout warmup drills' },
  'recovery': { name: 'Recovery', icon: '💆', description: 'Post-workout recovery' }
}

// Body part display info for injury prevention
export const bodyPartInfo: Record<string, { name: string; icon: string }> = {
  'neck': { name: 'Neck', icon: '🦒' },
  'shoulders': { name: 'Shoulders', icon: '💪' },
  'knees': { name: 'Knees', icon: '🦵' },
  'hips': { name: 'Hips', icon: '🦴' },
  'back': { name: 'Back', icon: '🔙' },
  'fingers': { name: 'Fingers', icon: '🤚' }
}

