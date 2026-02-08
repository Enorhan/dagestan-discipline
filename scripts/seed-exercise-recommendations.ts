/**
 * Seed Exercise Recommendations
 *
 * This script populates the exercise_recommendations table with science-based
 * recommendations for beginner, intermediate, and advanced levels.
 *
 * Research Sources:
 * - NSCA (National Strength and Conditioning Association)
 * - ACSM (American College of Sports Medicine)
 * - Physiopedia Strength Training Guidelines
 *
 * General Principles:
 * - Strength: 3-5 sets, 3-6 reps, 2-5 min rest, 80-90% 1RM
 * - Hypertrophy: 3-6 sets, 6-12 reps, 60-90s rest, 67-85% 1RM
 * - Power: 3-5 sets, 1-5 reps, 2-5 min rest, 75-90% 1RM
 * - Endurance: 2-3 sets, 12-20+ reps, 30-60s rest, <67% 1RM
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
type ExerciseCategory = 'cardio' | 'upper-body' | 'lower-body' | 'core' | 'full-body'

interface RecommendationTemplate {
  beginner: {
    sets: [number, number]
    reps: [number, number]
    rest: [number, number]
    tempo?: string
    progression: string
    regression: string
  }
  intermediate: {
    sets: [number, number]
    reps: [number, number]
    rest: [number, number]
    tempo?: string
    progression: string
    regression: string
  }
  advanced: {
    sets: [number, number]
    reps: [number, number]
    rest: [number, number]
    tempo?: string
    progression: string
    regression: string
  }
}

/**
 * Research-based recommendation templates by exercise type
 */
const recommendationTemplates: Record<string, RecommendationTemplate> = {
  // STRENGTH EXERCISES (Compound movements, heavy loads)
  'strength-compound': {
    beginner: {
      sets: [3, 4],
      reps: [5, 8],
      rest: [120, 180],
      tempo: '3-0-1-0',
      progression: 'Add 2.5-5kg when you can complete 4 sets of 8 reps with good form',
      regression: 'Reduce weight by 10-15% or use assistance (bands, spotter)'
    },
    intermediate: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [150, 240],
      tempo: '3-0-X-0',
      progression: 'Add 5kg or increase reps to 8, then add weight',
      regression: 'Reduce weight by 10% or decrease sets to 3'
    },
    advanced: {
      sets: [5, 6],
      reps: [3, 5],
      rest: [180, 300],
      tempo: '2-0-X-0',
      progression: 'Add 5-10kg or work towards 1RM testing, periodize with deload weeks',
      regression: 'Reduce weight by 15% or switch to hypertrophy rep range (6-8 reps)'
    }
  },

  // HYPERTROPHY EXERCISES (Muscle building focus)
  'hypertrophy': {
    beginner: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      tempo: '2-0-2-0',
      progression: 'Add 2.5kg when you can complete 4 sets of 12 reps',
      regression: 'Reduce weight by 10% or decrease reps to 6-8'
    },
    intermediate: {
      sets: [3, 5],
      reps: [8, 12],
      rest: [60, 90],
      tempo: '3-1-1-0',
      progression: 'Add weight, increase sets, or reduce rest periods',
      regression: 'Reduce weight by 10-15% or increase rest to 120s'
    },
    advanced: {
      sets: [4, 6],
      reps: [6, 12],
      rest: [60, 90],
      tempo: '3-1-X-0',
      progression: 'Use advanced techniques: drop sets, supersets, or increase volume',
      regression: 'Reduce volume by 20% or increase rest to 120s'
    }
  },

  // POWER EXERCISES (Explosive movements)
  'power-explosive': {
    beginner: {
      sets: [3, 4],
      reps: [3, 5],
      rest: [120, 180],
      tempo: 'X-0-X-0',
      progression: 'Focus on speed and technique before adding weight',
      regression: 'Reduce weight by 20% and focus on form'
    },
    intermediate: {
      sets: [4, 5],
      reps: [3, 5],
      rest: [150, 240],
      tempo: 'X-0-X-0',
      progression: 'Add 5kg or increase reps to 6, maintain explosive speed',
      regression: 'Reduce weight by 15% or decrease sets'
    },
    advanced: {
      sets: [5, 6],
      reps: [2, 5],
      rest: [180, 300],
      tempo: 'X-0-X-0',
      progression: 'Add weight, use complex training, or plyometric variations',
      regression: 'Reduce weight by 20% or focus on technique refinement'
    }
  },

  // ENDURANCE/CONDITIONING EXERCISES
  'endurance-conditioning': {
    beginner: {
      sets: [2, 3],
      reps: [12, 15],
      rest: [45, 60],
      tempo: '1-0-1-0',
      progression: 'Increase reps to 20 or add another set',
      regression: 'Reduce reps to 8-10 or increase rest to 90s'
    },
    intermediate: {
      sets: [3, 4],
      reps: [15, 20],
      rest: [30, 60],
      tempo: '1-0-1-0',
      progression: 'Increase reps to 25 or reduce rest periods',
      regression: 'Reduce reps to 12 or increase rest to 90s'
    },
    advanced: {
      sets: [4, 5],
      reps: [20, 30],
      rest: [30, 45],
      tempo: '1-0-1-0',
      progression: 'Add weight, increase reps, or use circuit training',
      regression: 'Reduce volume by 25% or increase rest'
    }
  },

  // BODYWEIGHT EXERCISES
  'bodyweight': {
    beginner: {
      sets: [3, 4],
      reps: [6, 10],
      rest: [60, 90],
      tempo: '2-0-2-0',
      progression: 'Increase reps to 15 or add weight/resistance',
      regression: 'Use assistance (bands) or reduce range of motion'
    },
    intermediate: {
      sets: [4, 5],
      reps: [8, 12],
      rest: [60, 90],
      tempo: '3-0-1-0',
      progression: 'Add weight, increase reps to 15, or use harder variation',
      regression: 'Reduce reps or use easier variation'
    },
    advanced: {
      sets: [5, 6],
      reps: [10, 15],
      rest: [45, 75],
      tempo: '3-1-X-0',
      progression: 'Use advanced variations, add significant weight, or increase volume',
      regression: 'Reduce volume by 20% or use standard variation'
    }
  },

  // CARDIO/INTERVAL TRAINING
  'cardio-intervals': {
    beginner: {
      sets: [5, 8],
      reps: [1, 1], // 1 rep = 1 interval
      rest: [120, 180], // Rest between intervals
      tempo: undefined,
      progression: 'Increase work duration or decrease rest periods',
      regression: 'Decrease work duration or increase rest periods'
    },
    intermediate: {
      sets: [8, 12],
      reps: [1, 1],
      rest: [90, 120],
      tempo: undefined,
      progression: 'Increase intensity, add more intervals, or reduce rest',
      regression: 'Reduce intensity or number of intervals'
    },
    advanced: {
      sets: [12, 20],
      reps: [1, 1],
      rest: [60, 90],
      tempo: undefined,
      progression: 'Increase intensity significantly or use complex protocols (Tabata, EMOM)',
      regression: 'Reduce number of intervals or increase rest'
    }
  },

  // CORE/STABILITY EXERCISES
  'core-stability': {
    beginner: {
      sets: [2, 3],
      reps: [8, 12],
      rest: [45, 60],
      tempo: '2-1-2-0',
      progression: 'Increase reps to 15 or add resistance',
      regression: 'Reduce reps or use easier variation (e.g., knees down for planks)'
    },
    intermediate: {
      sets: [3, 4],
      reps: [12, 15],
      rest: [45, 60],
      tempo: '3-1-1-0',
      progression: 'Add weight, increase reps to 20, or use unstable surface',
      regression: 'Reduce reps or remove added resistance'
    },
    advanced: {
      sets: [4, 5],
      reps: [15, 20],
      rest: [30, 45],
      tempo: '3-2-1-0',
      progression: 'Use advanced variations, add significant resistance, or increase time under tension',
      regression: 'Reduce volume or use standard variations'
    }
  }
}

/**
 * Exercise type mapping - maps exercise names to recommendation templates
 */
const exerciseTypeMapping: Record<string, string> = {
  // Strength Compound
  'Weighted Pull-ups': 'strength-compound',
  'Zercher Deadlift': 'strength-compound',
  'Bench Press': 'strength-compound',
  'Squat': 'strength-compound',
  'Deadlift': 'strength-compound',
  'Front Squat': 'strength-compound',
  'Overhead Press': 'strength-compound',
  'Barbell Row': 'strength-compound',
  'Clean and Jerk': 'power-explosive',
  'Snatch': 'power-explosive',
  'Power Clean': 'power-explosive',

  // Hypertrophy
  'Dumbbell Pummel Curls': 'hypertrophy',
  'Bicep Curls': 'hypertrophy',
  'Tricep Extensions': 'hypertrophy',
  'Lateral Raises': 'hypertrophy',
  'Leg Curls': 'hypertrophy',
  'Leg Extensions': 'hypertrophy',
  'Calf Raises': 'hypertrophy',
  'Chest Flyes': 'hypertrophy',

  // Power/Explosive
  'Box Jumps': 'power-explosive',
  'Medicine Ball Slams': 'power-explosive',
  'Kettlebell Swings': 'power-explosive',
  'Battle Rope': 'power-explosive',
  'Sled Push': 'power-explosive',
  'Prowler Push': 'power-explosive',

  // Bodyweight
  'Pull-ups': 'bodyweight',
  'Push-ups': 'bodyweight',
  'Dips': 'bodyweight',
  'Muscle-ups': 'bodyweight',
  'Hindu Push-ups': 'bodyweight',
  'Hindu Squats': 'bodyweight',
  'Burpees': 'bodyweight',

  // Cardio/Intervals
  'Air Dyne Sprints': 'cardio-intervals',
  'Rowing Machine': 'cardio-intervals',
  'Assault Bike': 'cardio-intervals',
  'Sprint Intervals': 'cardio-intervals',
  'Hill Sprints': 'cardio-intervals',

  // Core
  'Planks': 'core-stability',
  'Ab Wheel': 'core-stability',
  'Hanging Leg Raises': 'core-stability',
  'Russian Twists': 'core-stability',
  'Pallof Press': 'core-stability',

  // Endurance/Conditioning
  'Duck Walks': 'endurance-conditioning',
  'Farmer\'s Carry': 'endurance-conditioning',
  'Sled Drag': 'endurance-conditioning'
}

async function seedRecommendations() {
  console.log('🌱 Starting exercise recommendations seeding...')
  console.log('============================================================')

  try {
    // 1. Fetch all exercises from database
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, name, category')

    if (fetchError) {
      throw new Error(`Failed to fetch exercises: ${fetchError.message}`)
    }

    if (!exercises || exercises.length === 0) {
      console.log('⚠️  No exercises found in database. Please run seed-elite-athletes.ts first.')
      return
    }

    console.log(`📊 Found ${exercises.length} exercises in database`)
    console.log('============================================================')


    // 2. Create recommendations for each exercise
    let createdCount = 0
    let skippedCount = 0

    for (const exercise of exercises) {
      // Determine exercise type from mapping
      const exerciseType = exerciseTypeMapping[exercise.name]

      if (!exerciseType) {
        // Use default based on category
        const defaultType = getDefaultTypeByCategory(exercise.category)
        console.log(`⚠️  No specific mapping for "${exercise.name}", using default: ${defaultType}`)

        const template = recommendationTemplates[defaultType]
        await createRecommendationsForExercise(exercise.id, template)
        createdCount += 3 // beginner, intermediate, advanced
        continue
      }

      const template = recommendationTemplates[exerciseType]
      if (!template) {
        console.log(`⚠️  No template found for type: ${exerciseType}`)
        skippedCount++
        continue
      }

      await createRecommendationsForExercise(exercise.id, template)
      createdCount += 3 // beginner, intermediate, advanced
    }

    console.log('============================================================')
    console.log('✅ Exercise recommendations seeding completed!')
    console.log('============================================================')
    console.log(`📊 Statistics:`)
    console.log(`   Recommendations created: ${createdCount}`)
    console.log(`   Exercises skipped: ${skippedCount}`)
    console.log('============================================================')

  } catch (error) {
    console.error('❌ Error seeding recommendations:', error)
    throw error
  }
}

/**
 * Get default recommendation type based on exercise category
 */
function getDefaultTypeByCategory(category: string): string {
  const categoryDefaults: Record<string, string> = {
    'cardio': 'cardio-intervals',
    'upper-body': 'hypertrophy',
    'lower-body': 'hypertrophy',
    'core': 'core-stability',
    'full-body': 'strength-compound'
  }

  return categoryDefaults[category] || 'hypertrophy'
}

/**
 * Create recommendations for all experience levels for a single exercise
 */
async function createRecommendationsForExercise(
  exerciseId: string,
  template: RecommendationTemplate
) {
  const levels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']

  for (const level of levels) {
    const levelTemplate = template[level]

    const recommendation = {
      exercise_id: exerciseId,
      experience_level: level,
      sets_min: levelTemplate.sets[0],
      sets_max: levelTemplate.sets[1],
      reps_min: levelTemplate.reps[0],
      reps_max: levelTemplate.reps[1],
      rest_seconds_min: levelTemplate.rest[0],
      rest_seconds_max: levelTemplate.rest[1],
      tempo: levelTemplate.tempo,
      progression_notes: levelTemplate.progression,
      regression_notes: levelTemplate.regression
    }

    // Upsert to avoid duplicates
    const { error } = await supabase
      .from('exercise_recommendations')
      .upsert(recommendation, {
        onConflict: 'exercise_id,experience_level'
      })

    if (error) {
      console.error(`❌ Error creating recommendation for exercise ${exerciseId}, level ${level}:`, error)
    }
  }
}

// Run the seeding
seedRecommendations()
  .then(() => {
    console.log('✅ Seeding completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })

