#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

type SportType = 'wrestling' | 'judo' | 'bjj'

interface ExerciseRow {
  id: string
  name: string
  sport: SportType | null
  category: string
  description: string | null
  equipment: string[] | null
  is_weighted: boolean | null
}

interface AthleteExerciseRow {
  athlete_id: string
  exercise_id: string
  priority: number | null
  notes: string | null
  reps: string | null
  sets: string | null
  weight: string | null
  duration: string | null
  frequency: string | null
}

interface Replacement {
  canonicalName: string
  category: string
  description: string
  equipment: string[]
  isWeighted: boolean
}

const REPLACEMENTS: Record<string, Replacement> = {
  'dancing agility': {
    canonicalName: 'Reaction Step Mirror Drill',
    category: 'full-body',
    description:
      'Start in a low grappling stance and mirror a partner or visual cue with fast lateral steps. React for 20 seconds, reset for 40 seconds, and complete 5 rounds. Avoid crossing your feet, rising out of stance, or waiting flat-footed before reacting.',
    equipment: ['None'],
    isWeighted: false,
  },
  conditioning: {
    canonicalName: 'Assault Bike Sprint Intervals',
    category: 'full-body',
    description:
      'Sprint hard for 15-20 seconds on an Assault Bike, then pedal easy for 40-45 seconds. Complete 8-12 rounds while maintaining repeatable output. Avoid blowing out the first rounds or losing posture through the sprint.',
    equipment: ['Assault Bike'],
    isWeighted: false,
  },
  stretching: {
    canonicalName: '90/90 Hip Switch Flow',
    category: 'core',
    description:
      'Sit in a 90/90 position and switch sides under control while maintaining upright posture. Perform 3-4 sets of 8-12 switches each side. Avoid collapsing the torso or forcing painful end range.',
    equipment: ['None'],
    isWeighted: false,
  },
  'grip work': {
    canonicalName: 'Gi Towel Pull-Up Holds',
    category: 'arms',
    description:
      'Loop two towels over a pull-up bar and grip each like a gi sleeve. Hold top pull-up position for 10-30 seconds per rep and complete 4-6 sets. Avoid shoulder shrugging, loose core, and grip slippage.',
    equipment: ['Pull-up Bar', 'Towels or Gi'],
    isWeighted: false,
  },
  'dynamic warm ups': {
    canonicalName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'full-body',
    description:
      'Cycle through stance shuffles, deep squat pries, and hip openers for 4-6 continuous minutes. Keep posture low and movement smooth before increasing speed. Avoid short range reps and upright stance.',
    equipment: ['None'],
    isWeighted: false,
  },
  'warm ups': {
    canonicalName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'full-body',
    description:
      'Cycle through stance shuffles, deep squat pries, and hip openers for 4-6 continuous minutes. Keep posture low and movement smooth before increasing speed. Avoid short range reps and upright stance.',
    equipment: ['None'],
    isWeighted: false,
  },
  'warm up': {
    canonicalName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'full-body',
    description:
      'Cycle through stance shuffles, deep squat pries, and hip openers for 4-6 continuous minutes. Keep posture low and movement smooth before increasing speed. Avoid short range reps and upright stance.',
    equipment: ['None'],
    isWeighted: false,
  },
  'general warm ups rotation side bending': {
    canonicalName: 'Standing Trunk Rotation and Side-Bend Mobility Circuit',
    category: 'core',
    description:
      'Alternate controlled trunk rotations and side bends in fight stance for 30-45 seconds each direction. Perform 3 rounds with steady breathing. Avoid forcing lumbar extension or rushing transitions.',
    equipment: ['None'],
    isWeighted: false,
  },
  'judo specific movements': {
    canonicalName: 'Band-Resisted Uchi-komi Repetition Drill',
    category: 'full-body',
    description:
      'Anchor a resistance band behind you and perform explosive uchi-komi entries while maintaining posture and hip turn. Complete 5-8 sets of 8-12 reps each side. Avoid arm-dominant pulls and slow resets.',
    equipment: ['Resistance Band'],
    isWeighted: false,
  },
  weightlifting: {
    canonicalName: 'Power Clean Pull Complex',
    category: 'full-body',
    description:
      'Use controlled clean pulls from hang or floor, extending through hips and finishing tall. Perform 4-6 sets of 3-5 reps with full rest between sets. Avoid early arm bend and drifting bar path.',
    equipment: ['Barbell', 'Bumper Plates'],
    isWeighted: true,
  },
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function keyFor(sport: SportType | null, name: string): string {
  return `${sport ?? 'none'}::${normalizeName(name)}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

async function relinkExercise(
  supabase: any,
  fromExerciseId: string,
  toExerciseId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('athlete_exercises')
    .select('athlete_id,exercise_id,priority,notes,reps,sets,weight,duration,frequency')
    .eq('exercise_id', fromExerciseId)

  if (error) {
    throw new Error(`Failed loading athlete links for ${fromExerciseId}: ${error.message}`)
  }

  const links = (data ?? []) as AthleteExerciseRow[]
  if (links.length === 0) {
    return 0
  }

  const upsertRows = links.map((row) => ({
    athlete_id: row.athlete_id,
    exercise_id: toExerciseId,
    priority: row.priority ?? 5,
    notes: row.notes,
    reps: row.reps,
    sets: row.sets,
    weight: row.weight,
    duration: row.duration,
    frequency: row.frequency,
  }))

  for (const batch of chunk(upsertRows, 500)) {
    const { error: upsertError } = await supabase
      .from('athlete_exercises')
      .upsert(batch, { onConflict: 'athlete_id,exercise_id' })
    if (upsertError) {
      throw new Error(`Failed upserting athlete links to ${toExerciseId}: ${upsertError.message}`)
    }
  }

  const { error: deleteLinksError } = await supabase
    .from('athlete_exercises')
    .delete()
    .eq('exercise_id', fromExerciseId)

  if (deleteLinksError) {
    throw new Error(`Failed deleting old athlete links for ${fromExerciseId}: ${deleteLinksError.message}`)
  }

  return links.length
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } }) as any

  const { data, error } = await supabase
    .from('exercises')
    .select('id,name,sport,category,description,equipment,is_weighted')
    .order('name')

  if (error || !data) {
    throw new Error(`Failed to load exercises: ${error?.message ?? 'Unknown error'}`)
  }

  const exercises = data as ExerciseRow[]
  const bySportName = new Map<string, ExerciseRow>()
  for (const row of exercises) {
    bySportName.set(keyFor(row.sport, row.name), row)
  }

  let updated = 0
  let deduplicated = 0
  let relinkedLinks = 0
  const touched: Array<{ action: 'updated' | 'deduplicated'; from: string; to: string; sport: SportType | null }> = []

  for (const exercise of exercises) {
    const normalized = normalizeName(exercise.name)
    const replacement = REPLACEMENTS[normalized]
    if (!replacement) continue

    const targetKey = keyFor(exercise.sport, replacement.canonicalName)
    const existingTarget = bySportName.get(targetKey)

    if (existingTarget && existingTarget.id !== exercise.id) {
      const relinked = await relinkExercise(supabase, exercise.id, existingTarget.id)
      relinkedLinks += relinked

      const { error: deleteExerciseError } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exercise.id)
      if (deleteExerciseError) {
        throw new Error(`Failed deleting duplicate exercise "${exercise.name}": ${deleteExerciseError.message}`)
      }

      deduplicated += 1
      touched.push({
        action: 'deduplicated',
        from: exercise.name,
        to: existingTarget.name,
        sport: exercise.sport,
      })
      continue
    }

    const { error: updateError } = await supabase
      .from('exercises')
      .update({
        name: replacement.canonicalName,
        category: replacement.category,
        description: replacement.description,
        equipment: replacement.equipment,
        is_weighted: replacement.isWeighted,
      })
      .eq('id', exercise.id)

    if (updateError) {
      throw new Error(`Failed updating "${exercise.name}": ${updateError.message}`)
    }

    bySportName.delete(keyFor(exercise.sport, exercise.name))
    bySportName.set(targetKey, {
      ...exercise,
      name: replacement.canonicalName,
      category: replacement.category,
      description: replacement.description,
      equipment: replacement.equipment,
      is_weighted: replacement.isWeighted,
    })

    updated += 1
    touched.push({
      action: 'updated',
      from: exercise.name,
      to: replacement.canonicalName,
      sport: exercise.sport,
    })
  }

  console.log('[standardize-elite-exercises] completed')
  console.log(`[standardize-elite-exercises] updated=${updated}`)
  console.log(`[standardize-elite-exercises] deduplicated=${deduplicated}`)
  console.log(`[standardize-elite-exercises] relinkedAthleteLinks=${relinkedLinks}`)
  console.log('[standardize-elite-exercises] touched sample=', touched.slice(0, 40))
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[standardize-elite-exercises] FAILED: ${message}`)
  process.exit(1)
})
