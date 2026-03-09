import { PersonalRecord } from './types'

const ACHIEVEMENT_STORAGE_KEY = 'dagestaniDiscipline.achievements'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'elite'

export interface Achievement {
  id: string
  title: string
  description: string
  tier: AchievementTier
  icon: string
  unlockedAt?: string
  progress: number
  target: number
}

export type AchievementType =
  // Volume milestones
  | 'volume-10k' | 'volume-50k' | 'volume-100k' | 'volume-500k' | 'volume-1m'
  // Consistency streaks
  | 'streak-7' | 'streak-30' | 'streak-90' | 'streak-180' | 'streak-365'
  // Workout frequency
  | 'workouts-10' | 'workouts-50' | 'workouts-100' | 'workouts-250' | 'workouts-500'
  // PR milestones
  | 'prs-5' | 'prs-25' | 'prs-50' | 'prs-100'
  // Exercise mastery (weighted exercises only)
  | 'squat-100kg' | 'squat-150kg' | 'squat-200kg'
  | 'bench-100kg' | 'bench-150kg'
  | 'deadlift-150kg' | 'deadlift-200kg' | 'deadlift-250kg'
  // Early adopter / special
  | 'early-bird' | 'beta-tester'

interface AchievementDefinition {
  id: AchievementType
  title: string
  description: string
  tier: AchievementTier
  target: number
  icon: string
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementDefinition> = {
  // Volume milestones (kg)
  'volume-10k': { id: 'volume-10k', title: 'First Load', description: 'Lift 10,000 kg total volume', tier: 'bronze', target: 10000, icon: 'Dumbbell' },
  'volume-50k': { id: 'volume-50k', title: 'Getting Heavy', description: 'Lift 50,000 kg total volume', tier: 'bronze', target: 50000, icon: 'Dumbbell' },
  'volume-100k': { id: 'volume-100k', title: 'Century Club', description: 'Lift 100,000 kg total volume', tier: 'silver', target: 100000, icon: 'Trophy' },
  'volume-500k': { id: 'volume-500k', title: 'Half Million', description: 'Lift 500,000 kg total volume', tier: 'gold', target: 500000, icon: 'Crown' },
  'volume-1m': { id: 'volume-1m', title: 'Millionaire', description: 'Lift 1,000,000 kg total volume', tier: 'elite', target: 1000000, icon: 'Crown' },

  // Streak milestones (days)
  'streak-7': { id: 'streak-7', title: 'Week Warrior', description: '7-day workout streak', tier: 'bronze', target: 7, icon: 'Flame' },
  'streak-30': { id: 'streak-30', title: 'Month Master', description: '30-day workout streak', tier: 'silver', target: 30, icon: 'Flame' },
  'streak-90': { id: 'streak-90', title: 'Quarter Crusher', description: '90-day workout streak', tier: 'gold', target: 90, icon: 'Flame' },
  'streak-180': { id: 'streak-180', title: 'Half-Year Hero', description: '180-day workout streak', tier: 'gold', target: 180, icon: 'Flame' },
  'streak-365': { id: 'streak-365', title: 'Iron Discipline', description: '365-day workout streak', tier: 'elite', target: 365, icon: 'Flame' },

  // Workout count milestones
  'workouts-10': { id: 'workouts-10', title: 'Getting Started', description: 'Complete 10 workouts', tier: 'bronze', target: 10, icon: 'Activity' },
  'workouts-50': { id: 'workouts-50', title: 'Building Habit', description: 'Complete 50 workouts', tier: 'bronze', target: 50, icon: 'Activity' },
  'workouts-100': { id: 'workouts-100', title: 'Century Sessions', description: 'Complete 100 workouts', tier: 'silver', target: 100, icon: 'Award' },
  'workouts-250': { id: 'workouts-250', title: 'Quarter Grand', description: 'Complete 250 workouts', tier: 'gold', target: 250, icon: 'Medal' },
  'workouts-500': { id: 'workouts-500', title: 'Veteran', description: 'Complete 500 workouts', tier: 'elite', target: 500, icon: 'Crown' },

  // PR milestones
  'prs-5': { id: 'prs-5', title: 'Breaking Records', description: 'Set 5 personal records', tier: 'bronze', target: 5, icon: 'TrendingUp' },
  'prs-25': { id: 'prs-25', title: 'PR Machine', description: 'Set 25 personal records', tier: 'silver', target: 25, icon: 'TrendingUp' },
  'prs-50': { id: 'prs-50', title: 'Limit Breaker', description: 'Set 50 personal records', tier: 'gold', target: 50, icon: 'TrendingUp' },
  'prs-100': { id: 'prs-100', title: 'PR Legend', description: 'Set 100 personal records', tier: 'elite', target: 100, icon: 'Star' },

  // Strength milestones (kg)
  'squat-100kg': { id: 'squat-100kg', title: 'Century Squat', description: 'Squat 100 kg', tier: 'bronze', target: 100, icon: 'Zap' },
  'squat-150kg': { id: 'squat-150kg', title: 'Strong Squatter', description: 'Squat 150 kg', tier: 'silver', target: 150, icon: 'Zap' },
  'squat-200kg': { id: 'squat-200kg', title: 'Elite Squatter', description: 'Squat 200 kg', tier: 'gold', target: 200, icon: 'Zap' },

  'bench-100kg': { id: 'bench-100kg', title: 'Plate Bench', description: 'Bench press 100 kg', tier: 'bronze', target: 100, icon: 'Zap' },
  'bench-150kg': { id: 'bench-150kg', title: 'Strong Presser', description: 'Bench press 150 kg', tier: 'silver', target: 150, icon: 'Zap' },

  'deadlift-150kg': { id: 'deadlift-150kg', title: 'Getting Heavy', description: 'Deadlift 150 kg', tier: 'bronze', target: 150, icon: 'Zap' },
  'deadlift-200kg': { id: 'deadlift-200kg', title: 'Double Century', description: 'Deadlift 200 kg', tier: 'silver', target: 200, icon: 'Zap' },
  'deadlift-250kg': { id: 'deadlift-250kg', title: 'Beast Mode', description: 'Deadlift 250 kg', tier: 'gold', target: 250, icon: 'Zap' },

  // Special achievements
  'early-bird': { id: 'early-bird', title: 'Early Bird', description: 'Joined during early access', tier: 'gold', target: 1, icon: 'Sun' },
  'beta-tester': { id: 'beta-tester', title: 'Beta Tester', description: 'Helped shape the app in beta', tier: 'elite', target: 1, icon: 'Code' },
}

interface AchievementState {
  unlocked: AchievementType[]
  totalVolume: number // in kg
  totalWorkouts: number
  currentStreak: number
  longestStreak: number
  totalPRs: number
  exerciseMaxes: Record<string, number> // exercise name -> max weight
}

function getStoredState(): Partial<AchievementState> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveState(state: AchievementState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save achievements:', e)
  }
}

export function getAchievementState(): AchievementState {
  const defaults: AchievementState = {
    unlocked: [],
    totalVolume: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPRs: 0,
    exerciseMaxes: {},
  }
  return { ...defaults, ...getStoredState() }
}

export function checkAchievements(
  updates: Partial<AchievementState>
): Achievement[] {
  const current = getAchievementState()
  const next: AchievementState = { ...current, ...updates }

  const newlyUnlocked: Achievement[] = []

  // Check each achievement
  Object.values(ACHIEVEMENTS).forEach(def => {
    // Skip already unlocked
    if (current.unlocked.includes(def.id)) return

    let achieved = false

    switch (def.id) {
      // Volume achievements
      case 'volume-10k':
      case 'volume-50k':
      case 'volume-100k':
      case 'volume-500k':
      case 'volume-1m':
        achieved = next.totalVolume >= def.target
        break

      // Streak achievements
      case 'streak-7':
      case 'streak-30':
      case 'streak-90':
      case 'streak-180':
      case 'streak-365':
        achieved = next.currentStreak >= def.target
        break

      // Workout count achievements
      case 'workouts-10':
      case 'workouts-50':
      case 'workouts-100':
      case 'workouts-250':
      case 'workouts-500':
        achieved = next.totalWorkouts >= def.target
        break

      // PR achievements
      case 'prs-5':
      case 'prs-25':
      case 'prs-50':
      case 'prs-100':
        achieved = next.totalPRs >= def.target
        break

      // Strength achievements
      case 'squat-100kg':
        achieved = (next.exerciseMaxes['Back Squat'] || next.exerciseMaxes['Front Squat'] || 0) >= def.target
        break
      case 'squat-150kg':
        achieved = (next.exerciseMaxes['Back Squat'] || next.exerciseMaxes['Front Squat'] || 0) >= def.target
        break
      case 'squat-200kg':
        achieved = (next.exerciseMaxes['Back Squat'] || next.exerciseMaxes['Front Squat'] || 0) >= def.target
        break

      case 'bench-100kg':
        achieved = (next.exerciseMaxes['Bench Press'] || 0) >= def.target
        break
      case 'bench-150kg':
        achieved = (next.exerciseMaxes['Bench Press'] || 0) >= def.target
        break

      case 'deadlift-150kg':
        achieved = (next.exerciseMaxes['Deadlift'] || next.exerciseMaxes['Romanian Deadlift'] || 0) >= def.target
        break
      case 'deadlift-200kg':
        achieved = (next.exerciseMaxes['Deadlift'] || next.exerciseMaxes['Romanian Deadlift'] || 0) >= def.target
        break
      case 'deadlift-250kg':
        achieved = (next.exerciseMaxes['Deadlift'] || 0) >= def.target
        break
    }

    if (achieved) {
      next.unlocked.push(def.id)
      newlyUnlocked.push({
        ...def,
        unlockedAt: new Date().toISOString(),
        progress: def.target,
        target: def.target,
      })
    }
  })

  // Save updated state
  saveState(next)

  return newlyUnlocked
}

export function recordWorkout(
  volumeKg: number,
  streakDays: number,
  prs: PersonalRecord[]
): Achievement[] {
  const current = getAchievementState()

  // Update exercise maxes from PRs
  const exerciseMaxes = { ...current.exerciseMaxes }
  prs.forEach(pr => {
    if (pr.type === 'weight') {
      const currentMax = exerciseMaxes[pr.exerciseName] || 0
      if (pr.value > currentMax) {
        exerciseMaxes[pr.exerciseName] = pr.value
      }
    }
  })

  return checkAchievements({
    totalVolume: current.totalVolume + volumeKg,
    totalWorkouts: current.totalWorkouts + 1,
    currentStreak: streakDays,
    longestStreak: Math.max(current.longestStreak, streakDays),
    totalPRs: current.totalPRs + prs.length,
    exerciseMaxes,
  })
}

export function getAchievementProgress(type: AchievementType): { current: number; target: number; percentage: number } {
  const state = getAchievementState()
  const def = ACHIEVEMENTS[type]

  let current = 0

  switch (type) {
    case 'volume-10k':
    case 'volume-50k':
    case 'volume-100k':
    case 'volume-500k':
    case 'volume-1m':
      current = state.totalVolume
      break

    case 'streak-7':
    case 'streak-30':
    case 'streak-90':
    case 'streak-180':
    case 'streak-365':
      current = state.currentStreak
      break

    case 'workouts-10':
    case 'workouts-50':
    case 'workouts-100':
    case 'workouts-250':
    case 'workouts-500':
      current = state.totalWorkouts
      break

    case 'prs-5':
    case 'prs-25':
    case 'prs-50':
    case 'prs-100':
      current = state.totalPRs
      break
  }

  return {
    current,
    target: def.target,
    percentage: Math.min(100, (current / def.target) * 100),
  }
}

export function isUnlocked(type: AchievementType): boolean {
  const state = getAchievementState()
  return state.unlocked.includes(type)
}

export function getTierColor(tier: AchievementTier): string {
  switch (tier) {
    case 'bronze': return '#cd7f32'
    case 'silver': return '#c0c0c0'
    case 'gold': return '#ffd700'
    case 'elite': return '#ff6b6b'
    default: return '#888'
  }
}
