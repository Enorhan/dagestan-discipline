/**
 * Seed script for Supabase database
 * Run with: npx tsx scripts/seed-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { allDrills, routines, learningPaths } from '../src/lib/drills-data'

// Supabase connection
const supabaseUrl = 'https://ftwtxslonvjgvbaexkwn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required')
  console.log('Get it from: https://supabase.com/dashboard/project/ftwtxslonvjgvbaexkwn/settings/api')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedDrills() {
  console.log('Seeding drills...')
  
  // Transform drills to database format
  const drillsData = allDrills.map(drill => ({
    id: drill.id,
    name: drill.name,
    category: drill.category,
    subcategory: drill.subcategory || null,
    video_url: drill.videoUrl || null,
    duration: drill.duration || null,
    difficulty: drill.difficulty || null,
    sport_relevance: drill.sportRelevance || null,
    description: drill.description || null,
    benefits: drill.benefits || null,
    muscles_worked: drill.musclesWorked || null,
    injury_prevention: drill.injuryPrevention || null,
    instructions: drill.instructions || null,
    common_mistakes: drill.commonMistakes || null,
    coaching_cues: drill.coachingCues || null,
    equipment: drill.equipment || null,
    related_drills: drill.relatedDrills || null,
    is_premium: false
  }))

  const { error } = await supabase.from('drills').upsert(drillsData, { onConflict: 'id' })
  if (error) throw error
  console.log(`✓ Seeded ${drillsData.length} drills`)
}

async function seedRoutines() {
  console.log('Seeding routines...')
  
  // First, insert routines
  const routinesData = routines.map(routine => ({
    id: routine.id,
    name: routine.name,
    type: routine.type,
    duration: routine.duration || null,
    description: routine.description || null,
    for_sport: routine.forSport || null,
    for_workout_focus: routine.forWorkoutFocus || null,
    is_premium: false
  }))

  const { error: routineError } = await supabase.from('routines').upsert(routinesData, { onConflict: 'id' })
  if (routineError) throw routineError
  console.log(`✓ Seeded ${routinesData.length} routines`)

  // Then, insert routine_drills
  console.log('Seeding routine drills...')
  let totalRoutineDrills = 0
  
  for (const routine of routines) {
    if (routine.drills && routine.drills.length > 0) {
      const routineDrillsData = routine.drills.map((rd, index) => ({
        routine_id: routine.id,
        drill_id: rd.drillId,
        duration: rd.duration || null,
        order_index: index
      }))

      const { error } = await supabase.from('routine_drills').upsert(routineDrillsData)
      if (error) {
        console.warn(`Warning: Could not seed drills for routine ${routine.id}:`, error.message)
      } else {
        totalRoutineDrills += routineDrillsData.length
      }
    }
  }
  console.log(`✓ Seeded ${totalRoutineDrills} routine drills`)
}

async function seedLearningPaths() {
  console.log('Seeding learning paths...')
  
  // First, insert learning paths
  const pathsData = learningPaths.map(path => ({
    id: path.id,
    name: path.name,
    description: path.description || null,
    sport: path.sport,
    difficulty: path.difficulty || null,
    estimated_weeks: path.estimatedWeeks || null,
    is_premium: false
  }))

  const { error: pathError } = await supabase.from('learning_paths').upsert(pathsData, { onConflict: 'id' })
  if (pathError) throw pathError
  console.log(`✓ Seeded ${pathsData.length} learning paths`)

  // Then, insert learning_path_drills
  console.log('Seeding learning path drills...')
  let totalPathDrills = 0

  for (const path of learningPaths) {
    if (path.drills && path.drills.length > 0) {
      const pathDrillsData = path.drills.map((drillId, index) => ({
        learning_path_id: path.id,
        drill_id: drillId,
        order_index: index
      }))

      const { error } = await supabase.from('learning_path_drills').upsert(pathDrillsData)
      if (error) {
        console.warn(`Warning: Could not seed drills for path ${path.id}:`, error.message)
      } else {
        totalPathDrills += pathDrillsData.length
      }
    }
  }
  console.log(`✓ Seeded ${totalPathDrills} learning path drills`)
}

async function main() {
  console.log('Starting Supabase seed...\n')
  
  try {
    await seedDrills()
    await seedRoutines()
    await seedLearningPaths()
    
    console.log('\n✅ Seed completed successfully!')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()

