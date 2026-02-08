#!/usr/bin/env ts-node
/**
 * Elite Athletes Database Seeding Script
 * 
 * This script populates the Supabase database with elite athlete workout data
 * from wrestling, judo, and BJJ champions.
 * 
 * Usage: npx ts-node scripts/seed-elite-athletes.ts
 */

import { createClient } from '@supabase/supabase-js'
import { eliteAthletes, type AthleteData, type ExerciseData } from './elite-athletes-data'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftwtxslonvjgvbaexkwn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SeedStats {
  athletesCreated: number
  exercisesCreated: number
  athleteExercisesLinked: number
  errors: string[]
}

async function seedDatabase(): Promise<SeedStats> {
  const stats: SeedStats = {
    athletesCreated: 0,
    exercisesCreated: 0,
    athleteExercisesLinked: 0,
    errors: []
  }

  console.log('🚀 Starting elite athletes database seeding...\n')

  for (const athleteData of eliteAthletes) {
    try {
      console.log(`\n📍 Processing: ${athleteData.name} (${athleteData.sport})`)

      // 1. Create or get athlete
      const { data: existingAthlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('name', athleteData.name)
        .single()

      let athleteId: string

      if (existingAthlete) {
        athleteId = existingAthlete.id
        console.log(`  ✓ Athlete already exists (ID: ${athleteId})`)
      } else {
        const { data: newAthlete, error: athleteError } = await supabase
          .from('athletes')
          .insert({
            name: athleteData.name,
            sport: athleteData.sport,
            nationality: athleteData.nationality,
            achievements: athleteData.achievements,
            bio: athleteData.bio
          })
          .select('id')
          .single()

        if (athleteError || !newAthlete) {
          stats.errors.push(`Failed to create athlete ${athleteData.name}: ${athleteError?.message}`)
          console.error(`  ❌ Error creating athlete: ${athleteError?.message}`)
          continue
        }

        athleteId = newAthlete.id
        stats.athletesCreated++
        console.log(`  ✓ Created athlete (ID: ${athleteId})`)
      }

      // 2. Process exercises
      for (const exerciseData of athleteData.exercises) {
        try {
          // Check if exercise exists
          const { data: existingExercise } = await supabase
            .from('exercises')
            .select('id')
            .eq('name', exerciseData.name)
            .eq('category', exerciseData.category)
            .single()

          let exerciseId: string

          if (existingExercise) {
            exerciseId = existingExercise.id
          } else {
            // Create new exercise
            const { data: newExercise, error: exerciseError } = await supabase
              .from('exercises')
              .insert({
                name: exerciseData.name,
                category: exerciseData.category,
                muscle_groups: exerciseData.muscleGroups,
                description: exerciseData.description,
                is_weighted: exerciseData.isWeighted,
                sport: athleteData.sport,
                athlete_specific: true,
                equipment: exerciseData.equipment
              })
              .select('id')
              .single()

            if (exerciseError || !newExercise) {
              stats.errors.push(`Failed to create exercise ${exerciseData.name}: ${exerciseError?.message}`)
              continue
            }

            exerciseId = newExercise.id
            stats.exercisesCreated++
            console.log(`    ✓ Created exercise: ${exerciseData.name}`)
          }

          // 3. Link athlete to exercise
          const { error: linkError } = await supabase
            .from('athlete_exercises')
            .upsert({
              athlete_id: athleteId,
              exercise_id: exerciseId,
              notes: exerciseData.description,
              reps: exerciseData.reps,
              sets: exerciseData.sets,
              weight: exerciseData.weight,
              duration: exerciseData.duration,
              frequency: exerciseData.frequency,
              priority: exerciseData.priority || 5
            }, {
              onConflict: 'athlete_id,exercise_id'
            })

          if (linkError) {
            stats.errors.push(`Failed to link ${athleteData.name} to ${exerciseData.name}: ${linkError.message}`)
          } else {
            stats.athleteExercisesLinked++
          }

        } catch (error) {
          stats.errors.push(`Error processing exercise ${exerciseData.name}: ${error}`)
        }
      }

      console.log(`  ✓ Processed ${athleteData.exercises.length} exercises for ${athleteData.name}`)

    } catch (error) {
      stats.errors.push(`Error processing athlete ${athleteData.name}: ${error}`)
      console.error(`  ❌ Error: ${error}`)
    }
  }

  return stats
}

// Run the seeding
seedDatabase()
  .then((stats) => {
    console.log('\n' + '='.repeat(60))
    console.log('✅ Database seeding completed!')
    console.log('='.repeat(60))
    console.log(`📊 Statistics:`)
    console.log(`   Athletes created: ${stats.athletesCreated}`)
    console.log(`   Exercises created: ${stats.exercisesCreated}`)
    console.log(`   Athlete-Exercise links: ${stats.athleteExercisesLinked}`)
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`)
      stats.errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`))
    }
    console.log('='.repeat(60) + '\n')
  })
  .catch((error) => {
    console.error('\n❌ Fatal error during seeding:', error)
    process.exit(1)
  })

