import { Session, WeekDay, SportProgram, SessionTemplate, SportType } from './types'

export const mockSession: Session = {
  id: '1',
  day: 'Day 3',
  focus: 'Strength + Conditioning',
  duration: 50,
  exercises: [
    {
      id: '1',
      name: 'Barbell Deadlift',
      sets: 5,
      reps: 5,
      restTime: 180,
      notes: 'Control the descent'
    },
    {
      id: '2',
      name: 'Weighted Pull-ups',
      sets: 4,
      reps: 8,
      restTime: 120,
    },
    {
      id: '3',
      name: 'Barbell Front Squat',
      sets: 4,
      reps: 6,
      restTime: 120,
      notes: 'Keep elbows high'
    },
    {
      id: '4',
      name: 'Kettlebell Swings',
      sets: 4,
      reps: 20,
      restTime: 60,
    },
    {
      id: '5',
      name: 'Plank Hold',
      sets: 3,
      duration: 60,
      restTime: 45,
    },
    {
      id: '6',
      name: 'Burpees',
      sets: 3,
      reps: 15,
      restTime: 60,
    },
  ]
}

// Helper to get current day of week (0 = Sunday, 1 = Monday, etc.)
const getCurrentDayIndex = () => {
  const today = new Date().getDay()
  // Convert to Monday = 0 format
  return today === 0 ? 6 : today - 1
}

// Week progress with realistic completion pattern
// For demo: showing Monday and Wednesday completed, Friday is today (pending)
export const mockWeekProgress: WeekDay[] = [
  { day: 'Monday', shortDay: 'M', planned: true, completed: true },
  { day: 'Tuesday', shortDay: 'T', planned: false, completed: false },
  { day: 'Wednesday', shortDay: 'W', planned: true, completed: true },
  { day: 'Thursday', shortDay: 'T', planned: false, completed: false },
  { day: 'Friday', shortDay: 'F', planned: true, completed: false }, // Today for demo
  { day: 'Saturday', shortDay: 'S', planned: true, completed: false },
  { day: 'Sunday', shortDay: 'S', planned: false, completed: false },
]

export const bodyweightSession: Session = {
  id: '2',
  day: 'Day 3',
  focus: 'Strength + Conditioning',
  duration: 45,
  exercises: [
    {
      id: '1',
      name: 'Push-ups',
      sets: 5,
      reps: 20,
      restTime: 60,
    },
    {
      id: '2',
      name: 'Pull-ups',
      sets: 4,
      reps: 10,
      restTime: 90,
    },
    {
      id: '3',
      name: 'Pistol Squats',
      sets: 4,
      reps: 8,
      restTime: 60,
      notes: 'Each leg'
    },
    {
      id: '4',
      name: 'Handstand Hold',
      sets: 3,
      duration: 30,
      restTime: 60,
      notes: 'Against wall if needed'
    },
    {
      id: '5',
      name: 'Plank Hold',
      sets: 3,
      duration: 60,
      restTime: 45,
    },
    {
      id: '6',
      name: 'Burpees',
      sets: 3,
      reps: 15,
      restTime: 60,
    },
  ]
}

export const upperBodySession: Session = {
  id: '3',
  day: 'Day 1',
  focus: 'Upper Body Strength',
  duration: 50,
  exercises: [
    {
      id: '1',
      name: 'Bench Press',
      sets: 5,
      reps: 5,
      restTime: 180,
      notes: 'Heavy weight, full range'
    },
    {
      id: '2',
      name: 'Barbell Row',
      sets: 4,
      reps: 8,
      restTime: 120,
    },
    {
      id: '3',
      name: 'Overhead Press',
      sets: 4,
      reps: 6,
      restTime: 120,
    },
    {
      id: '4',
      name: 'Dips',
      sets: 3,
      reps: 12,
      restTime: 90,
    },
    {
      id: '5',
      name: 'Face Pulls',
      sets: 3,
      reps: 15,
      restTime: 60,
    },
  ]
}

export const lowerBodySession: Session = {
  id: '4',
  day: 'Day 2',
  focus: 'Lower Body Power',
  duration: 55,
  exercises: [
    {
      id: '1',
      name: 'Back Squat',
      sets: 5,
      reps: 5,
      restTime: 180,
      notes: 'Depth below parallel'
    },
    {
      id: '2',
      name: 'Romanian Deadlift',
      sets: 4,
      reps: 8,
      restTime: 120,
    },
    {
      id: '3',
      name: 'Bulgarian Split Squat',
      sets: 3,
      reps: 10,
      restTime: 90,
      notes: 'Each leg'
    },
    {
      id: '4',
      name: 'Leg Raises',
      sets: 3,
      reps: 15,
      restTime: 60,
    },
  ]
}

export const conditioningSession: Session = {
  id: '5',
  day: 'Day 4',
  focus: 'Conditioning',
  duration: 35,
  exercises: [
    {
      id: '1',
      name: 'Assault Bike',
      sets: 5,
      duration: 30,
      restTime: 90,
      notes: 'Max effort'
    },
    {
      id: '2',
      name: 'Kettlebell Swings',
      sets: 5,
      reps: 25,
      restTime: 60,
    },
    {
      id: '3',
      name: 'Burpees',
      sets: 4,
      reps: 20,
      restTime: 60,
    },
    {
      id: '4',
      name: 'Farmer Carry',
      sets: 3,
      duration: 45,
      restTime: 90,
      notes: 'Heavy weight'
    },
  ]
}



// ============================================
// SPORT-SPECIFIC PROGRAMS
// ============================================

// Wrestling Program - Dagestani-style training
// Inspired by Khabib Nurmagomedov, Islam Makhachev, and Dagestani wrestling camps
export const wrestlingProgram: SportProgram = {
  sport: 'wrestling',
  name: 'Dagestani Wrestling Strength',
  description: 'Explosive power and endurance training inspired by Dagestani wrestling champions',
  templates: [
    {
      id: 'wrestling-1',
      dayNumber: 1,
      focus: 'Explosive Power',
      duration: 55,
      exercises: [
        { id: 'w1-1', name: 'Power Clean', sets: 5, reps: 3, restTime: 120, notes: 'Explosive from floor' },
        { id: 'w1-2', name: 'Sandbag Shouldering', sets: 4, reps: 8, restTime: 90, notes: 'Alternate shoulders' },
        { id: 'w1-3', name: 'Dumbbell Thrusters', sets: 4, reps: 10, restTime: 90 },
        { id: 'w1-4', name: 'Sprawls', sets: 5, reps: 15, restTime: 60 },
        { id: 'w1-5', name: 'Medicine Ball Slams', sets: 3, reps: 12, restTime: 60 },
      ]
    },
    {
      id: 'wrestling-2',
      dayNumber: 2,
      focus: 'Grip & Carry Strength',
      duration: 50,
      exercises: [
        { id: 'w2-1', name: 'Deadlift', sets: 5, reps: 5, restTime: 180, notes: 'Heavy, controlled', videoUrl: 'https://www.youtube.com/embed/r4MzxtBKyNE' },
        { id: 'w2-2', name: 'Farmer Carry', sets: 4, duration: 45, restTime: 90, notes: 'Heavy dumbbells' },
        { id: 'w2-3', name: 'Rope Climbs', sets: 4, reps: 2, restTime: 120, notes: 'Legless if possible' },
        { id: 'w2-4', name: 'Fireman Carry Walk', sets: 3, duration: 30, restTime: 90, notes: 'Partner or sandbag' },
        { id: 'w2-5', name: 'Plate Pinch Hold', sets: 3, duration: 30, restTime: 60 },
      ]
    },
    {
      id: 'wrestling-3',
      dayNumber: 3,
      focus: 'Wrestling Circuit',
      duration: 45,
      exercises: [
        { id: 'w3-1', name: 'Kettlebell Swings', sets: 5, reps: 20, restTime: 45 },
        { id: 'w3-2', name: 'Burpee to Sprawl', sets: 4, reps: 12, restTime: 60 },
        { id: 'w3-3', name: 'Sandbag Ground to Overhead', sets: 4, reps: 8, restTime: 75 },
        { id: 'w3-4', name: 'Bear Crawl', sets: 4, duration: 30, restTime: 45 },
        { id: 'w3-5', name: 'Turkish Get-up', sets: 3, reps: 3, restTime: 60, notes: 'Each side', videoUrl: 'https://www.youtube.com/embed/5kb9Blkrj2w' },
      ]
    },
    {
      id: 'wrestling-4',
      dayNumber: 4,
      focus: 'Lower Body Power',
      duration: 55,
      exercises: [
        { id: 'w4-1', name: 'Front Squat', sets: 5, reps: 5, restTime: 150 },
        { id: 'w4-2', name: 'Box Jumps', sets: 4, reps: 8, restTime: 90, notes: 'Step down, jump up' },
        { id: 'w4-3', name: 'Walking Lunges', sets: 4, reps: 12, restTime: 75, notes: 'Each leg' },
        { id: 'w4-4', name: 'Hip Thrusts', sets: 4, reps: 10, restTime: 90, notes: 'Heavy barbell' },
        { id: 'w4-5', name: 'Calf Raises', sets: 3, reps: 20, restTime: 45 },
      ]
    },
    {
      id: 'wrestling-5',
      dayNumber: 5,
      focus: 'Upper Body & Core',
      duration: 50,
      exercises: [
        { id: 'w5-1', name: 'Weighted Pull-ups', sets: 5, reps: 6, restTime: 120 },
        { id: 'w5-2', name: 'Push Press', sets: 4, reps: 6, restTime: 90 },
        { id: 'w5-3', name: 'Ring Rows', sets: 4, reps: 12, restTime: 60 },
        { id: 'w5-4', name: 'Ab Wheel Rollout', sets: 4, reps: 10, restTime: 60 },
        { id: 'w5-5', name: 'Russian Twists', sets: 3, reps: 20, restTime: 45, notes: 'With medicine ball' },
      ]
    },
    {
      id: 'wrestling-6',
      dayNumber: 6,
      focus: 'Conditioning & Endurance',
      duration: 40,
      exercises: [
        { id: 'w6-1', name: 'Assault Bike Intervals', sets: 8, duration: 20, restTime: 40, notes: 'Max effort' },
        { id: 'w6-2', name: 'Sled Push', sets: 4, duration: 30, restTime: 60, notes: 'Heavy load' },
        { id: 'w6-3', name: 'Battle Ropes', sets: 4, duration: 30, restTime: 45 },
        { id: 'w6-4', name: 'Tire Flips', sets: 4, reps: 6, restTime: 90 },
      ]
    },
  ]
}


// Judo Program - Olympic lifting + plyometrics
// Inspired by Teddy Riner, Shohei Ono, and Olympic judo champions
export const judoProgram: SportProgram = {
  sport: 'judo',
  name: 'Olympic Judo Strength',
  description: 'Explosive power and throwing strength for judo athletes',
  templates: [
    {
      id: 'judo-1',
      dayNumber: 1,
      focus: 'Explosive Pulls',
      duration: 55,
      exercises: [
        { id: 'j1-1', name: 'Hang Clean', sets: 5, reps: 3, restTime: 120, notes: 'Explosive hip drive', videoUrl: 'https://www.youtube.com/embed/WCdhjfg7fv4' },
        { id: 'j1-2', name: 'Bent Over Row', sets: 4, reps: 8, restTime: 90, notes: 'Explosive pull' },
        { id: 'j1-3', name: 'Romanian Deadlift', sets: 4, reps: 8, restTime: 90 },
        { id: 'j1-4', name: 'Lat Pulldown', sets: 4, reps: 10, restTime: 60 },
        { id: 'j1-5', name: 'Face Pulls', sets: 3, reps: 15, restTime: 45 },
      ]
    },
    {
      id: 'judo-2',
      dayNumber: 2,
      focus: 'Lower Body Power',
      duration: 50,
      exercises: [
        { id: 'j2-1', name: 'Back Squat', sets: 5, reps: 5, restTime: 180 },
        { id: 'j2-2', name: 'Jump Squats', sets: 4, reps: 8, restTime: 90, notes: 'Explosive' },
        { id: 'j2-3', name: 'Single Leg RDL', sets: 3, reps: 8, restTime: 75, notes: 'Each leg' },
        { id: 'j2-4', name: 'Lateral Lunges', sets: 3, reps: 10, restTime: 60, notes: 'Each side' },
        { id: 'j2-5', name: 'Calf Raises', sets: 3, reps: 15, restTime: 45 },
      ]
    },
    {
      id: 'judo-3',
      dayNumber: 3,
      focus: 'Grip & Throwing Power',
      duration: 50,
      exercises: [
        { id: 'j3-1', name: 'Gi Pull-ups', sets: 4, reps: 8, restTime: 90, notes: 'Use towel if no gi' },
        { id: 'j3-2', name: 'Medicine Ball Rotational Throw', sets: 4, reps: 8, restTime: 75, notes: 'Each side' },
        { id: 'j3-3', name: 'Cable Wood Chops', sets: 3, reps: 12, restTime: 60, notes: 'Each side' },
        { id: 'j3-4', name: 'Wrist Curls', sets: 3, reps: 15, restTime: 45 },
        { id: 'j3-5', name: 'Dead Hang', sets: 3, duration: 45, restTime: 60 },
      ]
    },
    {
      id: 'judo-4',
      dayNumber: 4,
      focus: 'Plyometrics',
      duration: 45,
      exercises: [
        { id: 'j4-1', name: 'Box Jumps', sets: 5, reps: 5, restTime: 90, notes: 'Max height' },
        { id: 'j4-2', name: 'Broad Jumps', sets: 4, reps: 6, restTime: 75 },
        { id: 'j4-3', name: 'Tuck Jumps', sets: 4, reps: 8, restTime: 60 },
        { id: 'j4-4', name: 'Lateral Bounds', sets: 3, reps: 10, restTime: 60, notes: 'Each side' },
        { id: 'j4-5', name: 'Depth Jumps', sets: 3, reps: 6, restTime: 90 },
      ]
    },
    {
      id: 'judo-5',
      dayNumber: 5,
      focus: 'Push & Core',
      duration: 50,
      exercises: [
        { id: 'j5-1', name: 'Push Press', sets: 5, reps: 5, restTime: 120 },
        { id: 'j5-2', name: 'Dumbbell Bench Press', sets: 4, reps: 8, restTime: 90 },
        { id: 'j5-3', name: 'Dips', sets: 4, reps: 10, restTime: 75 },
        { id: 'j5-4', name: 'Pallof Press', sets: 3, reps: 12, restTime: 60, notes: 'Each side' },
        { id: 'j5-5', name: 'Hanging Leg Raise', sets: 3, reps: 12, restTime: 60 },
      ]
    },
    {
      id: 'judo-6',
      dayNumber: 6,
      focus: 'Full Body Circuit',
      duration: 40,
      exercises: [
        { id: 'j6-1', name: 'Clean and Jerk', sets: 5, reps: 3, restTime: 120 },
        { id: 'j6-2', name: 'Kettlebell Snatch', sets: 4, reps: 8, restTime: 75, notes: 'Each arm' },
        { id: 'j6-3', name: 'Burpees', sets: 4, reps: 10, restTime: 60 },
        { id: 'j6-4', name: 'V-ups', sets: 3, reps: 15, restTime: 45 },
      ]
    },
  ]
}


// BJJ Program - Grip work and functional strength
// Inspired by Gordon Ryan, Roger Gracie, and elite BJJ competitors
export const bjjProgram: SportProgram = {
  sport: 'bjj',
  name: 'BJJ Functional Strength',
  description: 'Grip endurance and functional strength for jiu-jitsu',
  templates: [
    {
      id: 'bjj-1',
      dayNumber: 1,
      focus: 'Posterior Chain',
      duration: 55,
      exercises: [
        { id: 'b1-1', name: 'Deadlift', sets: 5, reps: 5, restTime: 180, videoUrl: 'https://www.youtube.com/embed/r4MzxtBKyNE' },
        { id: 'b1-2', name: 'Romanian Deadlift', sets: 4, reps: 8, restTime: 90 },
        { id: 'b1-3', name: 'Barbell Row', sets: 4, reps: 8, restTime: 90 },
        { id: 'b1-4', name: 'Hip Bridge', sets: 3, reps: 12, restTime: 60, notes: 'Explosive hip drive' },
        { id: 'b1-5', name: 'Kettlebell Swing', sets: 3, reps: 15, restTime: 60 },
      ]
    },
    {
      id: 'bjj-2',
      dayNumber: 2,
      focus: 'Grip & Pulling',
      duration: 50,
      exercises: [
        { id: 'b2-1', name: 'Towel Pull-ups', sets: 4, reps: 6, restTime: 120, notes: 'Grip the towel ends' },
        { id: 'b2-2', name: 'Gi Pull-ups', sets: 4, reps: 8, restTime: 90, notes: 'Use towel if no gi' },
        { id: 'b2-3', name: 'Rope Climb', sets: 3, reps: 2, restTime: 120 },
        { id: 'b2-4', name: 'Dead Hang', sets: 3, duration: 45, restTime: 60 },
        { id: 'b2-5', name: 'Wrist Roller', sets: 3, reps: 3, restTime: 60, notes: 'Up and down = 1 rep' },
      ]
    },
    {
      id: 'bjj-3',
      dayNumber: 3,
      focus: 'Legs & Hips',
      duration: 50,
      exercises: [
        { id: 'b3-1', name: 'Front Squat', sets: 5, reps: 5, restTime: 150 },
        { id: 'b3-2', name: 'Bulgarian Split Squat', sets: 3, reps: 8, restTime: 90, notes: 'Each leg' },
        { id: 'b3-3', name: 'Hip Thrusts', sets: 4, reps: 10, restTime: 75 },
        { id: 'b3-4', name: 'Cossack Squat', sets: 3, reps: 8, restTime: 60, notes: 'Each side' },
        { id: 'b3-5', name: 'Glute Ham Raise', sets: 3, reps: 8, restTime: 75 },
      ]
    },
    {
      id: 'bjj-4',
      dayNumber: 4,
      focus: 'Push & Core',
      duration: 50,
      exercises: [
        { id: 'b4-1', name: 'Overhead Press', sets: 5, reps: 5, restTime: 120 },
        { id: 'b4-2', name: 'Dumbbell Bench Press', sets: 4, reps: 8, restTime: 90 },
        { id: 'b4-3', name: 'Dips', sets: 4, reps: 10, restTime: 75 },
        { id: 'b4-4', name: 'Ab Wheel Rollout', sets: 4, reps: 10, restTime: 60 },
        { id: 'b4-5', name: 'Pallof Press', sets: 3, reps: 12, restTime: 45, notes: 'Each side' },
      ]
    },
    {
      id: 'bjj-5',
      dayNumber: 5,
      focus: 'Movement & Mobility',
      duration: 45,
      exercises: [
        { id: 'b5-1', name: 'Turkish Get-up', sets: 4, reps: 3, restTime: 90, notes: 'Each side', videoUrl: 'https://www.youtube.com/embed/5kb9Blkrj2w' },
        { id: 'b5-2', name: 'Bear Crawl', sets: 4, duration: 30, restTime: 60 },
        { id: 'b5-3', name: 'Crab Walk', sets: 3, duration: 30, restTime: 45 },
        { id: 'b5-4', name: 'Inchworm', sets: 3, reps: 8, restTime: 45 },
        { id: 'b5-5', name: 'Shrimp Walk', sets: 3, duration: 30, restTime: 45, notes: 'Both directions' },
      ]
    },
    {
      id: 'bjj-6',
      dayNumber: 6,
      focus: 'Kettlebell Circuit',
      duration: 40,
      exercises: [
        { id: 'b6-1', name: 'Kettlebell Clean and Press', sets: 4, reps: 6, restTime: 75, notes: 'Each arm' },
        { id: 'b6-2', name: 'Kettlebell Goblet Squat', sets: 4, reps: 12, restTime: 60 },
        { id: 'b6-3', name: 'Kettlebell Row', sets: 4, reps: 10, restTime: 60, notes: 'Each arm' },
        { id: 'b6-4', name: 'Kettlebell Swing', sets: 4, reps: 20, restTime: 45 },
      ]
    },
  ]
}

// Export all sport programs
export const sportPrograms: Record<SportType, SportProgram> = {
  wrestling: wrestlingProgram,
  judo: judoProgram,
  bjj: bjjProgram,
}

// Generate weekly program based on sport and training days
export function generateWeeklyProgram(sport: SportType, daysPerWeek: number): Session[] {
  const program = sportPrograms[sport]
  const clampedDays = Math.max(2, Math.min(6, daysPerWeek))
  const selectedTemplates = program.templates.slice(0, clampedDays)

  return selectedTemplates.map(template => ({
    id: template.id,
    day: `Day ${template.dayNumber}`,
    focus: template.focus,
    duration: template.duration,
    exercises: template.exercises,
  }))
}