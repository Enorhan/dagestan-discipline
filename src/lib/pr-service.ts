import { PersonalRecord, SessionLog } from './types'

const PR_STORAGE_KEY = 'dagestaniDiscipline.prRecords'

interface ExercisePRRecord {
  exerciseId: string
  exerciseName: string
  maxWeight: number // in lbs
  maxReps: number
  maxVolume: number // per session
  history: {
    date: string
    weight: number
    reps: number
    sets: number
    volume: number
  }[]
}

// Get all PR records from local storage
function getPRRecords(): Record<string, ExercisePRRecord> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(PR_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save PR records to local storage
function savePRRecords(records: Record<string, ExercisePRRecord>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PR_STORAGE_KEY, JSON.stringify(records))
  } catch (e) {
    console.error('Failed to save PR records:', e)
  }
}

// Check for new PRs after completing a set
export function checkForPR(
  exerciseId: string,
  exerciseName: string,
  weightLbs: number,
  reps: number,
  sets: number
): PersonalRecord | null {
  const records = getPRRecords()
  const existing = records[exerciseId]

  let newPR: PersonalRecord | null = null

  if (!existing) {
    // First time doing this exercise - it's a PR!
    newPR = {
      exerciseId,
      exerciseName,
      type: 'weight',
      value: weightLbs,
      previousBest: 0,
      improvement: 100,
      unit: 'lbs',
    }
  } else {
    // Check weight PR
    if (weightLbs > existing.maxWeight) {
      const improvement = existing.maxWeight > 0
        ? ((weightLbs - existing.maxWeight) / existing.maxWeight) * 100
        : 100
      newPR = {
        exerciseId,
        exerciseName,
        type: 'weight',
        value: weightLbs,
        previousBest: existing.maxWeight,
        improvement: Math.round(improvement),
        unit: 'lbs',
      }
    }
  }

  // Update the record
  const currentVolume = weightLbs * reps * sets
  records[exerciseId] = {
    exerciseId,
    exerciseName,
    maxWeight: Math.max(weightLbs, existing?.maxWeight || 0),
    maxReps: Math.max(reps, existing?.maxReps || 0),
    maxVolume: Math.max(currentVolume, existing?.maxVolume || 0),
    history: [
      ...(existing?.history || []),
      {
        date: new Date().toISOString(),
        weight: weightLbs,
        reps,
        sets,
        volume: currentVolume,
      },
    ].slice(-20), // Keep last 20 entries
  }

  savePRRecords(records)
  return newPR
}

// Get PR history for an exercise
export function getExercisePRHistory(exerciseId: string): ExercisePRRecord | null {
  const records = getPRRecords()
  return records[exerciseId] || null
}

// Get the PR record for display
export function getCurrentPR(exerciseId: string): { weight: number; reps: number } | null {
  const record = getExercisePRHistory(exerciseId)
  if (!record) return null
  return {
    weight: record.maxWeight,
    reps: record.maxReps,
  }
}

// Clear all PR records (for testing)
export function clearPRRecords() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PR_STORAGE_KEY)
}

// Get all PRs for a session (when finishing workout)
export function getSessionPRs(
  exerciseWeights: Record<string, number[]>,
  exerciseReps: Record<string, number>,
  exerciseNames: Record<string, string>
): PersonalRecord[] {
  const prs: PersonalRecord[] = []

  Object.entries(exerciseWeights).forEach(([exerciseId, weights]) => {
    const maxWeight = Math.max(...weights.filter(w => w > 0))
    const reps = exerciseReps[exerciseId] || 0
    const name = exerciseNames[exerciseId] || 'Unknown Exercise'

    if (maxWeight > 0) {
      const pr = checkForPR(exerciseId, name, maxWeight, reps, weights.filter(w => w > 0).length)
      if (pr) {
        prs.push(pr)
      }
    }
  })

  return prs
}
