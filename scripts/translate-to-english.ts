/**
 * Translation Script - Convert Swedish content to English
 * 
 * This script translates all Swedish content in the database to English:
 * - exercises table (name, description)
 * - athlete_exercises table (notes)
 * - exercise_recommendations table (progression_notes, regression_notes)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Swedish to English translations for common exercise terms
const translations: Record<string, string> = {
  // Exercise names
  'Marklyft': 'Deadlift',
  'Knäböj': 'Squat',
  'Bänkpress': 'Bench Press',
  'Axelpress': 'Shoulder Press',
  'Chins': 'Chin-ups',
  'Pullups': 'Pull-ups',
  'Dips': 'Dips',
  'Armhävningar': 'Push-ups',
  'Plankan': 'Plank',
  'Rygglyft': 'Back Extension',
  'Rodd': 'Row',
  'Utfall': 'Lunges',
  'Benspark': 'Leg Kicks',
  'Burpees': 'Burpees',
  'Sprints': 'Sprints',
  'Löpning': 'Running',
  'Cykling': 'Cycling',
  'Simning': 'Swimming',
  'Boxning': 'Boxing',
  'Skuggboxning': 'Shadow Boxing',
  'Säckträning': 'Heavy Bag Work',
  'Hopprep': 'Jump Rope',
  'Kettlebell Swings': 'Kettlebell Swings',
  'Turkish Get-ups': 'Turkish Get-ups',
  'Farmers Walk': 'Farmers Walk',
  'Sled Push': 'Sled Push',
  'Sled Pull': 'Sled Pull',
  'Battle Ropes': 'Battle Ropes',
  'Box Jumps': 'Box Jumps',
  'Wall Balls': 'Wall Balls',
  'Thrusters': 'Thrusters',
  'Clean and Jerk': 'Clean and Jerk',
  'Snatch': 'Snatch',
  'Muscle-ups': 'Muscle-ups',
  'Handstand Push-ups': 'Handstand Push-ups',
  'L-sits': 'L-sits',
  'Hollow Holds': 'Hollow Holds',
  'Arch Holds': 'Arch Holds',
  
  // Common Swedish words in descriptions
  'vecka': 'week',
  'dag': 'day',
  'gånger': 'times',
  'minuter': 'minutes',
  'sekunder': 'seconds',
  'repetitioner': 'repetitions',
  'set': 'sets',
  'kg': 'kg',
  'lbs': 'lbs',
  'meter': 'meters',
  'kilometer': 'kilometers',
  'timme': 'hour',
  'timmar': 'hours',
  'vila': 'rest',
  'uppvärmning': 'warm-up',
  'nedvarvning': 'cool-down',
  'stretching': 'stretching',
  'mobilitet': 'mobility',
  'styrka': 'strength',
  'kondition': 'conditioning',
  'explosivitet': 'explosiveness',
  'uthållighet': 'endurance',
  'snabbhet': 'speed',
  'smidighet': 'agility',
  'balans': 'balance',
  'koordination': 'coordination',
  'teknik': 'technique',
  'taktik': 'tactics',
  'strategi': 'strategy',
  'mental träning': 'mental training',
  'visualisering': 'visualization',
  'andning': 'breathing',
  'återhämtning': 'recovery',
  'nutrition': 'nutrition',
  'kost': 'diet',
  'sömn': 'sleep',
  'hydration': 'hydration',
  'skadeförebyggande': 'injury prevention',
  'rehabilitering': 'rehabilitation',
  'flexibilitet': 'flexibility',
  'rörlighet': 'mobility',
  'stabilitet': 'stability',
  'core': 'core',
  'bål': 'core',
  'ben': 'legs',
  'armar': 'arms',
  'axlar': 'shoulders',
  'rygg': 'back',
  'bröst': 'chest',
  'mage': 'abs',
  'rumpa': 'glutes',
  'vader': 'calves',
  'lår': 'thighs',
  'höfter': 'hips',
  'handled': 'wrist',
  'handleder': 'wrists',
  'fotled': 'ankle',
  'fotleder': 'ankles',
  'knä': 'knee',
  'knän': 'knees',
  'armbåge': 'elbow',
  'armbågar': 'elbows',
  'nacke': 'neck',
}

function translateText(text: string | null): string | null {
  if (!text) return null
  
  let translated = text
  
  // Replace Swedish words with English equivalents
  for (const [swedish, english] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${swedish}\\b`, 'gi')
    translated = translated.replace(regex, english)
  }
  
  return translated
}

async function main() {
  console.log('🌍 Starting translation process...\n')
  
  // 1. Translate exercises table
  console.log('📝 Translating exercises table...')
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, description')
  
  if (exercisesError) {
    console.error('Error fetching exercises:', exercisesError)
  } else if (exercises) {
    console.log(`Found ${exercises.length} exercises to check`)

    let exercisesUpdated = 0
    for (const exercise of exercises) {
      const translatedName = translateText(exercise.name)
      const translatedDescription = translateText(exercise.description)

      if (translatedName !== exercise.name || translatedDescription !== exercise.description) {
        const { error: updateError } = await supabase
          .from('exercises')
          .update({
            name: translatedName,
            description: translatedDescription
          })
          .eq('id', exercise.id)

        if (updateError) {
          console.error(`Error updating exercise ${exercise.id}:`, updateError)
        } else {
          exercisesUpdated++
          console.log(`  ✅ Updated: ${exercise.name} → ${translatedName}`)
        }
      }
    }
    console.log(`✅ Updated ${exercisesUpdated} exercises\n`)
  }

  // 2. Translate athlete_exercises table
  console.log('📝 Translating athlete_exercises table...')
  const { data: athleteExercises, error: aeError } = await supabase
    .from('athlete_exercises')
    .select('athlete_id, exercise_id, notes')

  if (aeError) {
    console.error('Error fetching athlete_exercises:', aeError)
  } else if (athleteExercises) {
    console.log(`Found ${athleteExercises.length} athlete-exercise links to check`)

    let aeUpdated = 0
    for (const ae of athleteExercises) {
      const translatedNotes = translateText(ae.notes)

      if (translatedNotes !== ae.notes) {
        const { error: updateError } = await supabase
          .from('athlete_exercises')
          .update({ notes: translatedNotes })
          .eq('athlete_id', ae.athlete_id)
          .eq('exercise_id', ae.exercise_id)

        if (updateError) {
          console.error(`Error updating athlete_exercise:`, updateError)
        } else {
          aeUpdated++
          console.log(`  ✅ Updated notes`)
        }
      }
    }
    console.log(`✅ Updated ${aeUpdated} athlete-exercise notes\n`)
  }

  // 3. Translate exercise_recommendations table
  console.log('📝 Translating exercise_recommendations table...')
  const { data: recommendations, error: recError } = await supabase
    .from('exercise_recommendations')
    .select('id, progression_notes, regression_notes')

  if (recError) {
    console.error('Error fetching recommendations:', recError)
  } else if (recommendations) {
    console.log(`Found ${recommendations.length} recommendations to check`)

    let recUpdated = 0
    for (const rec of recommendations) {
      const translatedProgression = translateText(rec.progression_notes)
      const translatedRegression = translateText(rec.regression_notes)

      if (translatedProgression !== rec.progression_notes || translatedRegression !== rec.regression_notes) {
        const { error: updateError } = await supabase
          .from('exercise_recommendations')
          .update({
            progression_notes: translatedProgression,
            regression_notes: translatedRegression
          })
          .eq('id', rec.id)

        if (updateError) {
          console.error(`Error updating recommendation ${rec.id}:`, updateError)
        } else {
          recUpdated++
          console.log(`  ✅ Updated recommendation notes`)
        }
      }
    }
    console.log(`✅ Updated ${recUpdated} recommendations\n`)
  }

  console.log('🎉 Translation complete!')
}

main().catch(console.error)

