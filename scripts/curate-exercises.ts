#!/usr/bin/env tsx

import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

import {
  assessExerciseName,
  generateExerciseDescription,
  shouldReplaceExerciseDescription,
} from './exercise-quality'

type SportType = 'wrestling' | 'judo' | 'bjj'

interface ExerciseRow {
  id: string
  name: string
  description: string | null
  category: string
  muscle_groups: string[] | null
  equipment: string[] | null
  is_weighted: boolean | null
  sport: SportType | null
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } })

  const { data, error } = await supabase
    .from('exercises')
    .select('id,name,description,category,muscle_groups,equipment,is_weighted,sport')
    .order('name')

  if (error || !data) {
    throw new Error(`Failed to load exercises: ${error?.message ?? 'Unknown error'}`)
  }

  const exercises = data as ExerciseRow[]

  const removals: Array<{ id: string; name: string; reason: string; sport: SportType | null }> = []
  const descriptionUpdates: Array<{ id: string; name: string; oldDescription: string | null; newDescription: string }> = []

  const removalReasons = new Map<string, number>()

  for (const exercise of exercises) {
    const assessment = assessExerciseName(exercise.name)
    if (!assessment.valid) {
      removals.push({
        id: exercise.id,
        name: exercise.name,
        reason: assessment.reason,
        sport: exercise.sport,
      })
      removalReasons.set(assessment.reason, (removalReasons.get(assessment.reason) ?? 0) + 1)
      continue
    }

    if (shouldReplaceExerciseDescription(exercise.description)) {
      const newDescription = generateExerciseDescription({
        name: exercise.name,
        category: exercise.category,
        muscleGroups: exercise.muscle_groups,
        equipment: exercise.equipment,
        isWeighted: exercise.is_weighted,
        sport: exercise.sport,
      })

      if (newDescription !== (exercise.description ?? '')) {
        descriptionUpdates.push({
          id: exercise.id,
          name: exercise.name,
          oldDescription: exercise.description,
          newDescription,
        })
      }
    }
  }

  if (removals.length > 0) {
    for (const batch of chunk(removals.map((item) => item.id), 200)) {
      const { error: deleteError } = await supabase
        .from('exercises')
        .delete()
        .in('id', batch)

      if (deleteError) {
        throw new Error(`Failed deleting exercise batch: ${deleteError.message}`)
      }
    }
  }

  if (descriptionUpdates.length > 0) {
    for (const batch of chunk(descriptionUpdates, 100)) {
      for (const item of batch) {
        const { error: updateError } = await supabase
          .from('exercises')
          .update({ description: item.newDescription })
          .eq('id', item.id)

        if (updateError) {
          throw new Error(`Failed updating exercise description for "${item.name}": ${updateError.message}`)
        }
      }
    }
  }

  const { count: remainingCount, error: remainingError } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })

  if (remainingError) {
    throw new Error(`Failed counting remaining exercises: ${remainingError.message}`)
  }

  const report = {
    timestamp: new Date().toISOString(),
    beforeCount: exercises.length,
    removedCount: removals.length,
    descriptionUpdatedCount: descriptionUpdates.length,
    afterCount: remainingCount ?? 0,
    removalReasons: Object.fromEntries(removalReasons.entries()),
    removedSample: removals.slice(0, 120),
    updatedSample: descriptionUpdates.slice(0, 120).map((row) => ({
      id: row.id,
      name: row.name,
      oldDescription: row.oldDescription,
      newDescription: row.newDescription,
    })),
  }

  const reportPath = path.resolve('tmp/exercise-curation-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('[curate-exercises] completed')
  console.log(`[curate-exercises] before=${report.beforeCount}`)
  console.log(`[curate-exercises] removed=${report.removedCount}`)
  console.log(`[curate-exercises] updatedDescriptions=${report.descriptionUpdatedCount}`)
  console.log(`[curate-exercises] after=${report.afterCount}`)
  console.log(`[curate-exercises] report=${reportPath}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[curate-exercises] FAILED: ${message}`)
  process.exit(1)
})
