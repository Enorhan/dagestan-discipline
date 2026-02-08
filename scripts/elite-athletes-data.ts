// Elite Athletes Data - Extracted from research files
// This file contains structured data for seeding the database

export type SportType = 'wrestling' | 'judo' | 'bjj'

export interface AthleteData {
  name: string
  sport: SportType
  nationality?: string
  achievements?: string[]
  bio?: string
  exercises: ExerciseData[]
}

export interface ExerciseData {
  name: string
  category: string
  muscleGroups: string[]
  description?: string
  reps?: string
  sets?: string
  weight?: string
  duration?: string
  frequency?: string
  priority?: number
  equipment?: string[]
  isWeighted?: boolean
}

export const eliteAthletes: AthleteData[] = [
  // WRESTLING
  {
    name: 'Jordan Burroughs',
    sport: 'wrestling',
    nationality: 'USA',
    achievements: ['Olympic Gold Medalist', '6x World Champion'],
    bio: 'One of the greatest American wrestlers of all time, known for his explosive double-leg takedown.',
    exercises: [
      {
        name: 'Air Dyne Sprints',
        category: 'cardio',
        muscleGroups: ['Legs', 'Cardiovascular'],
        description: '20 second sprint followed by 40 second rest',
        duration: '20s sprint / 40s rest',
        priority: 9,
        equipment: ['Air Dyne Bike'],
        isWeighted: false
      },
      {
        name: 'Weighted Pull-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Upper Back', 'Biceps'],
        priority: 10,
        equipment: ['Pull-up Bar', 'Weight Belt'],
        isWeighted: true
      },
      {
        name: 'Band Step and Press',
        category: 'full-body',
        muscleGroups: ['Shoulders', 'Chest', 'Legs'],
        description: 'Simulates shooting motion with resistance',
        priority: 9,
        equipment: ['Resistance Bands'],
        isWeighted: false
      },
      {
        name: 'Band Snap Downs',
        category: 'full-body',
        muscleGroups: ['Back', 'Core', 'Grip'],
        description: 'Wrestling-specific snap down drill with bands',
        priority: 8,
        equipment: ['Resistance Bands'],
        isWeighted: false
      },
      {
        name: 'Battle Rope',
        category: 'cardio',
        muscleGroups: ['Shoulders', 'Arms', 'Core'],
        description: 'Alternate steps and double slams',
        priority: 7,
        equipment: ['Battle Rope'],
        isWeighted: false
      },
      {
        name: 'Burpee Jumping High Pull',
        category: 'cardio',
        muscleGroups: ['Full Body', 'Explosive Power'],
        priority: 8,
        equipment: ['None'],
        isWeighted: false
      },
      {
        name: 'Plank Driver with Club',
        category: 'core',
        muscleGroups: ['Core', 'Rotational Stability'],
        priority: 7,
        equipment: ['Weck Method Club'],
        isWeighted: false
      },
      {
        name: 'Dumbbell Deadlift',
        category: 'lower-body',
        muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'],
        priority: 8,
        equipment: ['Dumbbells'],
        isWeighted: true
      },
      {
        name: 'Kneeling Bag Jumps',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Explosive Hip Power'],
        description: 'Explosive jumps from kneeling position',
        priority: 9,
        equipment: ['Bulgarian Bag', 'Box'],
        isWeighted: false
      },
      {
        name: 'Sled Drag Lunges',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Hips'],
        description: 'Lunges while dragging sled, mimics drop step',
        priority: 8,
        equipment: ['Sled', 'Weights'],
        isWeighted: true
      },
      {
        name: 'Chest Supported Row',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Upper Back'],
        priority: 7,
        equipment: ['Bench', 'Dumbbells'],
        isWeighted: true
      },
      {
        name: 'Dumbbell Pummel Curls',
        category: 'upper-body',
        muscleGroups: ['Biceps', 'Forearms'],
        description: 'Curls that simulate pummeling motion',
        priority: 6,
        equipment: ['Dumbbells'],
        isWeighted: true
      },
      {
        name: 'L-Sit Pull-up',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Core', 'Hip Flexors'],
        priority: 8,
        equipment: ['Pull-up Bar'],
        isWeighted: false
      },
      {
        name: 'Dumbbell Clean and Press',
        category: 'full-body',
        muscleGroups: ['Shoulders', 'Legs', 'Explosive Power'],
        priority: 9,
        equipment: ['Dumbbells'],
        isWeighted: true
      },
      {
        name: 'Dumbbell Romanian Deadlift',
        category: 'lower-body',
        muscleGroups: ['Hamstrings', 'Glutes'],
        priority: 8,
        equipment: ['Dumbbells'],
        isWeighted: true
      }
    ]
  },
  {
    name: 'Aleksandr Karelin',
    sport: 'wrestling',
    nationality: 'Russia',
    achievements: ['3x Olympic Gold Medalist', '9x World Champion', 'Undefeated for 13 years'],
    bio: 'Considered the greatest Greco-Roman wrestler of all time. Known as "The Experiment" for his incredible strength.',
    exercises: [
      {
        name: 'Back Squat',
        category: 'lower-body',
        muscleGroups: ['Quads', 'Glutes', 'Core'],
        priority: 10,
        equipment: ['Barbell', 'Squat Rack'],
        isWeighted: true
      },
      {
        name: 'Deadlift',
        category: 'lower-body',
        muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back', 'Traps'],
        priority: 10,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Bench Press',
        category: 'upper-body',
        muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
        weight: '204kg+',
        priority: 9,
        equipment: ['Barbell', 'Bench'],
        isWeighted: true
      },
      {
        name: 'Olympic Lifts (Clean & Jerk)',
        category: 'full-body',
        muscleGroups: ['Full Body', 'Explosive Power'],
        priority: 10,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Jump Squats',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Explosive Power'],
        priority: 9,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Zercher Deadlift',
        category: 'lower-body',
        muscleGroups: ['Posterior Chain', 'Core', 'Biceps'],
        reps: '10',
        weight: '200kg',
        priority: 10,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Pull-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Upper Back', 'Biceps'],
        reps: 'Up to 42 reps',
        priority: 9,
        equipment: ['Pull-up Bar'],
        isWeighted: false
      },
      {
        name: 'Bear Crawls',
        category: 'cardio',
        muscleGroups: ['Shoulders', 'Core', 'Full Body'],
        description: 'Performed uphill for added difficulty',
        priority: 8,
        equipment: ['None'],
        isWeighted: false
      },
      {
        name: 'Duck Walks',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Hip Mobility'],
        priority: 7,
        equipment: ['None'],
        isWeighted: false
      },
      {
        name: 'Zercher Carries',
        category: 'core',
        muscleGroups: ['Core', 'Clinch Strength'],
        description: 'Walking with barbell in elbow crooks',
        priority: 9,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Neck Bridging',
        category: 'core',
        muscleGroups: ['Neck'],
        frequency: 'Daily',
        priority: 10,
        equipment: ['None'],
        isWeighted: false
      }
    ]
  },
  {
    name: 'Kyle Snyder',
    sport: 'wrestling',
    nationality: 'USA',
    achievements: ['Olympic Gold Medalist', '3x World Champion'],
    exercises: [
      {
        name: 'Bench Press',
        category: 'upper-body',
        muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
        weight: '180kg',
        priority: 9,
        equipment: ['Barbell', 'Bench'],
        isWeighted: true
      },
      {
        name: 'Weighted Chin-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Biceps', 'Grip'],
        priority: 10,
        equipment: ['Pull-up Bar', 'Weight Belt'],
        isWeighted: true
      },
      {
        name: 'Pin Squats',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Hips'],
        description: 'Squats from dead stop for explosive power',
        priority: 9,
        equipment: ['Barbell', 'Squat Rack'],
        isWeighted: true
      }
    ]
  },
  // JUDO
  {
    name: 'Teddy Riner',
    sport: 'judo',
    nationality: 'France',
    achievements: ['3x Olympic Gold', '11x World Champion'],
    exercises: [
      {
        name: 'Bench Press',
        category: 'upper-body',
        muscleGroups: ['Chest', 'Pressing Power'],
        weight: '160kg',
        priority: 9,
        equipment: ['Barbell', 'Bench'],
        isWeighted: true
      },
      {
        name: 'One-Arm Deadlift',
        category: 'core',
        muscleGroups: ['Core', 'Grip', 'Obliques'],
        weight: '50-60kg',
        priority: 10,
        equipment: ['Dumbbell'],
        isWeighted: true
      },
      {
        name: 'Pull-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Grip'],
        priority: 9,
        equipment: ['Pull-up Bar'],
        isWeighted: false
      }
    ]
  },
  {
    name: 'Shohei Ono',
    sport: 'judo',
    nationality: 'Japan',
    achievements: ['2x Olympic Gold', '3x World Champion'],
    exercises: [
      {
        name: 'Clean and Jerk',
        category: 'full-body',
        muscleGroups: ['Full Body', 'Explosive Power'],
        priority: 10,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Gi Pull-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Grip'],
        description: 'Pull-ups using gi for grip training',
        priority: 10,
        equipment: ['Pull-up Bar', 'Gi'],
        isWeighted: false
      },
      {
        name: 'Farmer Carries',
        category: 'upper-body',
        muscleGroups: ['Grip', 'Core', 'Traps'],
        priority: 9,
        equipment: ['Dumbbells'],
        isWeighted: true
      }
    ]
  },
  // BJJ
  {
    name: 'Gordon Ryan',
    sport: 'bjj',
    nationality: 'USA',
    achievements: ['ADCC Champion', 'Multiple-time No-Gi World Champion'],
    exercises: [
      {
        name: 'Floor Press',
        category: 'upper-body',
        muscleGroups: ['Chest', 'Pressing Power'],
        description: 'For creating frames and distance',
        priority: 9,
        equipment: ['Barbell', 'Dumbbells'],
        isWeighted: true
      },
      {
        name: 'Trap Bar Deadlift',
        category: 'lower-body',
        muscleGroups: ['Posterior Chain', 'Full Body'],
        priority: 10,
        equipment: ['Trap Bar'],
        isWeighted: true
      },
      {
        name: 'Weighted Pull-ups',
        category: 'upper-body',
        muscleGroups: ['Lats', 'Arms'],
        description: 'For chokes and control',
        priority: 10,
        equipment: ['Pull-up Bar', 'Weight Belt'],
        isWeighted: true
      },
      {
        name: 'Hammer Curls',
        category: 'upper-body',
        muscleGroups: ['Biceps', 'Forearms'],
        description: 'Slow eccentric for isometric strength',
        priority: 8,
        equipment: ['Dumbbells'],
        isWeighted: true
      },
      {
        name: 'GHD Sit-ups',
        category: 'core',
        muscleGroups: ['Abs', 'Hip Flexors'],
        description: 'For guard retention',
        priority: 9,
        equipment: ['GHD Machine'],
        isWeighted: false
      }
    ]
  },
  {
    name: 'Roger Gracie',
    sport: 'bjj',
    nationality: 'Brazil',
    achievements: ['10x World Champion', 'Considered greatest BJJ competitor ever'],
    exercises: [
      {
        name: 'Olympic Clean and Press',
        category: 'full-body',
        muscleGroups: ['Full Body', 'Explosive Power'],
        priority: 10,
        equipment: ['Barbell'],
        isWeighted: true
      },
      {
        name: 'Hill Sprints',
        category: 'cardio',
        muscleGroups: ['Legs', 'Cardiovascular'],
        priority: 9,
        equipment: ['None'],
        isWeighted: false
      },
      {
        name: 'Overhead Squat',
        category: 'lower-body',
        muscleGroups: ['Legs', 'Shoulders', 'Mobility'],
        priority: 8,
        equipment: ['Barbell'],
        isWeighted: true
      }
    ]
  }
]
