import {
  Equipment,
  ExperienceLevel,
  Exercise,
  PrimaryGoal,
  Session,
  SessionTemplate,
  SportProgram,
  SportType,
} from './types'

// ============================================
// PROGRAM BLUEPRINTS (MVP)
// ============================================
//
// Goals:
// - 3 levels (beginner/intermediate/advanced) per sport.
// - Strength & conditioning only (no drills).
// - Deterministic, editable output (users can tweak sets/reps/rest in-editor).
//
// Notes:
// - These are "blueprints" that we later try to resolve to real Supabase `exercises.id` UUIDs.
// - IDs here are stable, human-readable placeholders.

type ProgramOptions = {
  level?: ExperienceLevel
  equipment?: Equipment | null
  primaryGoal?: PrimaryGoal
  sessionMinutes?: number
  combatSessionsPerWeek?: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)

const ex = (
  id: string,
  name: string,
  sets: number,
  reps: number,
  restTime: number,
  notes?: string
): Exercise => ({ id, name, sets, reps, restTime, notes })

const timed = (
  id: string,
  name: string,
  sets: number,
  duration: number,
  restTime: number,
  notes?: string
): Exercise => ({ id, name, sets, duration, restTime, notes })

const template = (
  id: string,
  dayNumber: number,
  focus: string,
  duration: number,
  exercises: Exercise[]
): SessionTemplate => ({ id, dayNumber, focus, duration, exercises })

// Equipment substitutions for bodyweight-only users.
// Keys are "contains" matches (normalized) for a best-effort swap.
const BODYWEIGHT_SUBSTITUTIONS: Array<{ match: RegExp; replaceWith: string }> = [
  { match: /\b(power\s*clean|clean\s*&\s*jerk|snatch)\b/i, replaceWith: 'Jump Squats' },
  { match: /\b(back\s*squat|front\s*squat|squat)\b/i, replaceWith: 'Bodyweight Squats' },
  { match: /\b(deadlift|romanian deadlift|rdl)\b/i, replaceWith: 'Single-Leg Hip Hinge' },
  { match: /\b(bench\s*press)\b/i, replaceWith: 'Push-Ups' },
  { match: /\b(overhead press|shoulder press|push press)\b/i, replaceWith: 'Pike Push-Ups' },
  { match: /\b(barbell row|row)\b/i, replaceWith: 'Inverted Rows' },
  { match: /\b(kettlebell swing)\b/i, replaceWith: 'Hip Hinge Swings' },
  { match: /\b(farmer carry|farmer carries|carry)\b/i, replaceWith: 'Towel Hangs' },
  { match: /\b(sled push|sled drag)\b/i, replaceWith: 'Sprint Intervals' },
  { match: /\b(assault bike|airdyne|rower|rowing)\b/i, replaceWith: 'Sprint Intervals' },
]

const applyBodyweightSubstitutions = (exerciseName: string): string => {
  for (const rule of BODYWEIGHT_SUBSTITUTIONS) {
    if (rule.match.test(exerciseName)) return rule.replaceWith
  }
  return exerciseName
}

const adjustMainLiftForGoal = (exercise: Exercise, goal: PrimaryGoal | undefined): Exercise => {
  if (!exercise.reps) return exercise
  if (!goal || goal === 'balanced') return exercise

  if (goal === 'strength') {
    return { ...exercise, reps: clamp(exercise.reps, 4, 6), restTime: Math.max(exercise.restTime, 150) }
  }
  if (goal === 'power') {
    return { ...exercise, reps: 3, restTime: Math.max(exercise.restTime, 180) }
  }
  // conditioning: slightly higher reps, shorter rest
  return { ...exercise, reps: clamp(exercise.reps, 8, 12), restTime: Math.min(exercise.restTime, 90) }
}

const scaleSetsForCombatLoad = (sets: number, combatSessionsPerWeek?: number): number => {
  const load = combatSessionsPerWeek ?? 0
  if (load >= 6) return Math.max(2, sets - 2)
  if (load >= 4) return Math.max(2, sets - 1)
  return sets
}

const trimForSessionMinutes = (exercises: Exercise[], sessionMinutes?: number): Exercise[] => {
  if (!sessionMinutes) return exercises
  if (sessionMinutes <= 35) return exercises.slice(0, 4)
  if (sessionMinutes <= 50) return exercises.slice(0, 5)
  return exercises
}

const applyOptionsToTemplate = (
  sport: SportType,
  level: ExperienceLevel,
  t: SessionTemplate,
  options: ProgramOptions
): SessionTemplate => {
  const isBodyweight = options.equipment === 'bodyweight'

  // Clone exercises and apply substitutions/adjustments.
  let exercises = t.exercises.map((e) => {
    const idBase = `bp-${sport}-${level}-${t.dayNumber}-${slug(e.name)}`
    const name = isBodyweight ? applyBodyweightSubstitutions(e.name) : e.name
    const next: Exercise = {
      ...e,
      id: idBase,
      name,
      sets: scaleSetsForCombatLoad(e.sets, options.combatSessionsPerWeek),
    }
    return next
  })

  // Primary goal: adjust first 2 exercises (treated as "main work") when rep-based.
  const goal = options.primaryGoal
  exercises = exercises.map((e, idx) => (idx < 2 ? adjustMainLiftForGoal(e, goal) : e))

  // Time budget: trim to keep sessions realistic.
  exercises = trimForSessionMinutes(exercises, options.sessionMinutes)

  return { ...t, exercises }
}

// ============================================
// PROGRAM DEFINITIONS (6 templates each)
// ============================================

// Wrestling programs
const wrestlingBeginner: SportProgram = {
  sport: 'wrestling',
  name: 'Wrestling Foundations (Beginner)',
  description: 'Base strength, conditioning, and durability for new wrestlers.',
  templates: [
    template('wrestling-beginner-1', 1, 'Foundational Strength', 45, [
      ex('w1', 'Goblet Squat', 3, 10, 90),
      ex('w2', 'Pull-Ups', 3, 6, 120, 'Use assistance if needed'),
      ex('w3', 'Push-Ups', 3, 12, 60),
      ex('w4', 'Plank', 3, 45, 45, 'Seconds'),
      timed('w5', 'Sprint Intervals', 6, 20, 40, '20s hard / 40s easy'),
    ]),
    template('wrestling-beginner-2', 2, 'Grip + Core', 40, [
      ex('w6', 'Inverted Rows', 3, 10, 90),
      timed('w7', 'Farmer Carries', 4, 30, 60, 'Seconds'),
      ex('w8', 'Walking Lunges', 3, 12, 75),
      ex('w9', 'Hanging Knee Raises', 3, 10, 60),
      timed('w10', 'Jump Rope', 6, 60, 30, 'Easy pace'),
    ]),
    template('wrestling-beginner-3', 3, 'Lower Body + Power', 45, [
      ex('w11', 'Front Squat', 3, 8, 120),
      ex('w12', 'Romanian Deadlift', 3, 10, 120),
      ex('w13', 'Box Jumps', 4, 5, 75),
      ex('w14', 'Calf Raises', 3, 15, 45),
      timed('w15', 'Medicine Ball Slams', 6, 20, 40, 'Seconds'),
    ]),
    template('wrestling-beginner-4', 4, 'Upper Body', 45, [
      ex('w16', 'Bench Press', 3, 8, 120),
      ex('w17', 'Overhead Press', 3, 8, 120),
      ex('w18', 'Dips', 3, 8, 90),
      ex('w19', 'Barbell Rows', 3, 10, 90),
      timed('w20', 'Neck Bridge Holds', 3, 20, 60, 'Build slowly'),
    ]),
    template('wrestling-beginner-5', 5, 'Conditioning Circuit', 35, [
      timed('w21', 'Sled Push', 8, 15, 45, 'Seconds'),
      ex('w22', 'Burpees', 5, 10, 45),
      timed('w23', 'Battle Rope Slams', 6, 20, 40, 'Seconds'),
      ex('w24', 'Russian Twists', 3, 20, 45),
      timed('w25', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
    template('wrestling-beginner-6', 6, 'Recovery + Aerobic', 35, [
      timed('w26', 'Zone 2 Cardio', 1, 1200, 0, '20 minutes'),
      timed('w27', 'Couch Stretch', 2, 60, 30, 'Per side'),
      timed('w28', 'Hip Mobility', 1, 300, 0, '5 minutes'),
      timed('w29', 'Thoracic Mobility', 1, 300, 0, '5 minutes'),
    ]),
  ],
}

const wrestlingIntermediate: SportProgram = {
  sport: 'wrestling',
  name: 'Dagestani Wrestling S&C (Intermediate)',
  description: 'Explosive strength, grip endurance, and work capacity for competitive wrestlers.',
  templates: [
    template('wrestling-intermediate-1', 1, 'Explosive Power', 55, [
      ex('wi1', 'Power Clean', 4, 3, 180),
      ex('wi2', 'Front Squat', 4, 5, 180),
      ex('wi3', 'Pull-Ups', 4, 6, 120),
      ex('wi4', 'Box Jumps', 5, 4, 75),
      timed('wi5', 'Medicine Ball Slams', 8, 15, 45, 'Seconds'),
    ]),
    template('wrestling-intermediate-2', 2, 'Grip + Carry Strength', 50, [
      timed('wi6', 'Farmer Carries', 6, 30, 75, 'Seconds'),
      ex('wi7', 'Deadlift', 4, 5, 180),
      ex('wi8', 'Barbell Rows', 4, 8, 120),
      timed('wi9', 'Towel Hangs', 4, 30, 60, 'Seconds'),
      timed('wi10', 'Neck Bridge Holds', 4, 20, 60, 'Build slowly'),
    ]),
    template('wrestling-intermediate-3', 3, 'Conditioning + Core', 45, [
      timed('wi11', 'Sprint Intervals', 10, 20, 40, '20s hard / 40s easy'),
      ex('wi12', 'Burpees', 6, 10, 45),
      timed('wi13', 'Battle Rope Slams', 8, 20, 40, 'Seconds'),
      ex('wi14', 'Hanging Leg Raises', 4, 10, 60),
      timed('wi15', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
    template('wrestling-intermediate-4', 4, 'Lower Body Power', 55, [
      ex('wi16', 'Back Squat', 5, 5, 180),
      ex('wi17', 'Romanian Deadlift', 4, 8, 150),
      ex('wi18', 'Walking Lunges', 4, 12, 90),
      ex('wi19', 'Jump Squats', 5, 5, 90),
      ex('wi20', 'Calf Raises', 3, 15, 45),
    ]),
    template('wrestling-intermediate-5', 5, 'Upper Body + Core', 50, [
      ex('wi21', 'Bench Press', 4, 6, 180),
      ex('wi22', 'Overhead Press', 4, 6, 180),
      ex('wi23', 'Dips', 4, 8, 120),
      ex('wi24', 'Weighted Pull-Ups', 4, 5, 150),
      ex('wi25', 'Russian Twists', 4, 20, 45),
    ]),
    template('wrestling-intermediate-6', 6, 'Endurance + Recovery', 40, [
      timed('wi26', 'Zone 2 Cardio', 1, 1500, 0, '25 minutes'),
      timed('wi27', 'Couch Stretch', 2, 60, 30, 'Per side'),
      timed('wi28', 'Shoulder Mobility', 1, 300, 0, '5 minutes'),
      timed('wi29', 'Breathing Reset', 1, 180, 0, '3 minutes'),
    ]),
  ],
}

const wrestlingAdvanced: SportProgram = {
  sport: 'wrestling',
  name: 'Elite Wrestling Camp (Advanced)',
  description: 'High-output power work and brutal conditioning inspired by elite wrestling camps.',
  templates: [
    template('wrestling-advanced-1', 1, 'Power + Speed', 60, [
      ex('wa1', 'Power Clean', 5, 3, 210),
      ex('wa2', 'Front Squat', 5, 3, 210),
      ex('wa3', 'Weighted Pull-Ups', 5, 4, 150),
      ex('wa4', 'Plyometric Push-Ups', 5, 6, 75),
      timed('wa5', 'Medicine Ball Slams', 10, 15, 45, 'Seconds'),
      timed('wa6', 'Sprint Intervals', 8, 30, 60, 'Hard efforts'),
    ]),
    template('wrestling-advanced-2', 2, 'Grip + Strongman Carries', 55, [
      timed('wa7', 'Farmer Carries', 8, 40, 75, 'Seconds'),
      timed('wa8', 'Sandbag Carries', 6, 40, 75, 'Seconds'),
      ex('wa9', 'Deadlift', 5, 3, 210),
      ex('wa10', 'Barbell Rows', 5, 6, 150),
      timed('wa11', 'Neck Bridge Holds', 5, 25, 60, 'Build slowly'),
    ]),
    template('wrestling-advanced-3', 3, 'Conditioning (Wrestling Rounds)', 50, [
      timed('wa12', 'Assault Bike Sprints', 12, 15, 45, 'Seconds'),
      timed('wa13', 'Sled Push', 10, 15, 45, 'Seconds'),
      ex('wa14', 'Burpees', 8, 12, 45),
      timed('wa15', 'Battle Rope Slams', 10, 20, 40, 'Seconds'),
      ex('wa16', 'Hanging Leg Raises', 5, 12, 60),
    ]),
    template('wrestling-advanced-4', 4, 'Lower Body (Strength)', 60, [
      ex('wa17', 'Back Squat', 5, 3, 210),
      ex('wa18', 'Romanian Deadlift', 5, 6, 180),
      ex('wa19', 'Bulgarian Split Squat', 4, 8, 120),
      ex('wa20', 'Jump Squats', 6, 5, 90),
      timed('wa21', 'Calf Plyo Hops', 4, 25, 45, 'Seconds'),
    ]),
    template('wrestling-advanced-5', 5, 'Upper Body (Strength)', 55, [
      ex('wa22', 'Bench Press', 5, 3, 210),
      ex('wa23', 'Overhead Press', 5, 4, 210),
      ex('wa24', 'Weighted Dips', 4, 6, 150),
      ex('wa25', 'Chest Supported Row', 4, 8, 120),
      timed('wa26', 'Towel Hangs', 5, 35, 60, 'Seconds'),
    ]),
    template('wrestling-advanced-6', 6, 'Aerobic Base + Mobility', 40, [
      timed('wa27', 'Zone 2 Cardio', 1, 1800, 0, '30 minutes'),
      timed('wa28', 'Hip Mobility', 1, 360, 0, '6 minutes'),
      timed('wa29', 'Shoulder Mobility', 1, 360, 0, '6 minutes'),
    ]),
  ],
}

// Judo programs
const judoBeginner: SportProgram = {
  sport: 'judo',
  name: 'Judo Foundations (Beginner)',
  description: 'Basic strength, legs, and pulling power for new judoka.',
  templates: [
    template('judo-beginner-1', 1, 'Pulling Strength', 45, [
      ex('j1', 'Pull-Ups', 3, 6, 120),
      ex('j2', 'Barbell Rows', 3, 10, 90),
      ex('j3', 'Goblet Squat', 3, 10, 90),
      timed('j4', 'Jump Rope', 6, 60, 30),
      timed('j5', 'Plank', 3, 45, 45),
    ]),
    template('judo-beginner-2', 2, 'Lower Body', 45, [
      ex('j6', 'Front Squat', 3, 8, 150),
      ex('j7', 'Walking Lunges', 3, 12, 90),
      ex('j8', 'Step-Ups', 3, 10, 90),
      ex('j9', 'Calf Raises', 3, 15, 45),
      timed('j10', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
    template('judo-beginner-3', 3, 'Grip + Core', 40, [
      timed('j11', 'Rope Climb (or Towel Pull)', 4, 30, 60, 'Seconds'),
      timed('j12', 'Farmer Carries', 4, 30, 60, 'Seconds'),
      ex('j13', 'Push-Ups', 3, 12, 60),
      ex('j14', 'Hanging Knee Raises', 3, 10, 60),
      timed('j15', 'Neck Bridge Holds', 3, 20, 60),
    ]),
    template('judo-beginner-4', 4, 'Plyometrics', 35, [
      ex('j16', 'Box Jumps', 4, 5, 75),
      timed('j17', 'Medicine Ball Slams', 6, 15, 45, 'Seconds'),
      timed('j18', 'Sprint Intervals', 8, 20, 40, '20s hard / 40s easy'),
      timed('j19', 'Hip Mobility', 1, 300, 0, '5 minutes'),
    ]),
    template('judo-beginner-5', 5, 'Upper Body', 45, [
      ex('j20', 'Bench Press', 3, 8, 150),
      ex('j21', 'Overhead Press', 3, 8, 150),
      ex('j22', 'Dips', 3, 8, 90),
      ex('j23', 'Barbell Rows', 3, 10, 90),
      timed('j24', 'Couch Stretch', 2, 60, 30, 'Per side'),
    ]),
    template('judo-beginner-6', 6, 'Recovery + Aerobic', 35, [
      timed('j25', 'Zone 2 Cardio', 1, 1200, 0, '20 minutes'),
      timed('j26', 'Breathing Reset', 1, 180, 0, '3 minutes'),
    ]),
  ],
}

const judoIntermediate: SportProgram = {
  sport: 'judo',
  name: 'Olympic Judo S&C (Intermediate)',
  description: 'Explosive pulls, legs, grip endurance, and throwing power.',
  templates: [
    template('judo-intermediate-1', 1, 'Explosive Pulls', 55, [
      ex('ji1', 'Clean & Jerk', 4, 3, 210),
      ex('ji2', 'Front Squat', 4, 5, 180),
      ex('ji3', 'Pull-Ups', 4, 6, 120),
      ex('ji4', 'Barbell Row', 4, 8, 120),
      timed('ji5', 'Medicine Ball Slams', 8, 15, 45, 'Seconds'),
    ]),
    template('judo-intermediate-2', 2, 'Lower Body Power', 50, [
      ex('ji6', 'Back Squat', 5, 5, 180),
      ex('ji7', 'Jump Squats', 5, 5, 90),
      ex('ji8', 'Weighted Step-Ups', 4, 10, 90),
      timed('ji9', 'Sled Push', 8, 15, 45, 'Seconds'),
      ex('ji10', 'Calf Raises', 3, 15, 45),
    ]),
    template('judo-intermediate-3', 3, 'Grip + Throwing Power', 50, [
      timed('ji11', 'Rope Climb', 6, 25, 75, 'Seconds'),
      timed('ji12', 'Farmer Carries', 6, 30, 75, 'Seconds'),
      ex('ji13', 'Push Press', 4, 5, 180),
      timed('ji14', 'Wrist Roller', 4, 30, 60, 'Seconds'),
      timed('ji15', 'Neck Bridge Holds', 4, 20, 60, 'Build slowly'),
    ]),
    template('judo-intermediate-4', 4, 'Plyometrics', 45, [
      ex('ji16', 'Box Jumps', 6, 4, 75),
      timed('ji17', 'Bounding Drills', 6, 20, 40, 'Seconds'),
      timed('ji18', 'Medicine Ball Slams', 10, 15, 45, 'Seconds'),
      timed('ji19', 'Sprint Intervals', 10, 20, 40, '20s hard / 40s easy'),
    ]),
    template('judo-intermediate-5', 5, 'Push + Core', 50, [
      ex('ji20', 'Bench Press', 4, 6, 180),
      ex('ji21', 'Overhead Press', 4, 6, 180),
      ex('ji22', 'Dips', 4, 8, 120),
      ex('ji23', 'Hanging Leg Raises', 4, 10, 60),
      timed('ji24', 'Side Plank', 3, 40, 30, 'Per side'),
    ]),
    template('judo-intermediate-6', 6, 'Full Body Circuit', 40, [
      timed('ji25', 'Kettlebell Circuit', 6, 60, 30, 'Swings, goblet squats, carries'),
      ex('ji26', 'Burpees', 5, 12, 45),
      timed('ji27', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
  ],
}

const judoAdvanced: SportProgram = {
  sport: 'judo',
  name: 'Elite Judo Power (Advanced)',
  description: 'Olympic-style power work with grip endurance and plyometrics for elite judoka.',
  templates: [
    template('judo-advanced-1', 1, 'Olympic Lifting', 60, [
      ex('ja1', 'Clean & Jerk', 5, 2, 240),
      ex('ja2', 'Snatch', 5, 2, 240),
      ex('ja3', 'Front Squat', 5, 3, 210),
      ex('ja4', 'Pull-Ups', 5, 5, 150),
      timed('ja5', 'Medicine Ball Throws', 10, 12, 45, 'Seconds'),
    ]),
    template('judo-advanced-2', 2, 'Leg Strength + Power', 60, [
      ex('ja6', 'Back Squat', 5, 3, 240),
      ex('ja7', 'Jump Squats', 6, 5, 90),
      ex('ja8', 'Romanian Deadlift', 5, 6, 180),
      ex('ja9', 'Bulgarian Split Squat', 4, 8, 120),
      timed('ja10', 'Sled Push', 10, 15, 45, 'Seconds'),
    ]),
    template('judo-advanced-3', 3, 'Grip Endurance', 55, [
      timed('ja11', 'Rope Climb', 8, 25, 75, 'Seconds'),
      timed('ja12', 'Farmer Carries', 8, 40, 75, 'Seconds'),
      timed('ja13', 'Gi/Towel Pulls', 6, 30, 60, 'Seconds'),
      ex('ja14', 'Barbell Row', 5, 6, 150),
      timed('ja15', 'Neck Bridge Holds', 5, 25, 60),
    ]),
    template('judo-advanced-4', 4, 'Plyo + Speed', 50, [
      ex('ja16', 'Box Jumps', 8, 3, 75),
      timed('ja17', 'Bounding Drills', 8, 20, 40, 'Seconds'),
      timed('ja18', 'Sprint Intervals', 12, 20, 40, '20s hard / 40s easy'),
      timed('ja19', 'Medicine Ball Slams', 12, 15, 45, 'Seconds'),
    ]),
    template('judo-advanced-5', 5, 'Upper Body Strength', 55, [
      ex('ja20', 'Bench Press', 5, 3, 240),
      ex('ja21', 'Overhead Press', 5, 4, 210),
      ex('ja22', 'Weighted Dips', 4, 6, 150),
      ex('ja23', 'Pull-Ups', 5, 5, 150),
      ex('ja24', 'Hanging Leg Raises', 5, 12, 60),
    ]),
    template('judo-advanced-6', 6, 'Aerobic Base + Mobility', 40, [
      timed('ja25', 'Zone 2 Cardio', 1, 1800, 0, '30 minutes'),
      timed('ja26', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
  ],
}

// BJJ programs
const bjjBeginner: SportProgram = {
  sport: 'bjj',
  name: 'BJJ Foundations (Beginner)',
  description: 'Basic strength and durability for jiu-jitsu athletes.',
  templates: [
    template('bjj-beginner-1', 1, 'Posterior Chain', 45, [
      ex('b1', 'Romanian Deadlift', 3, 10, 150),
      ex('b2', 'Glute Bridge', 3, 12, 75),
      ex('b3', 'Pull-Ups', 3, 6, 120),
      timed('b4', 'Farmer Carries', 4, 30, 60, 'Seconds'),
      timed('b5', 'Plank', 3, 45, 45),
    ]),
    template('bjj-beginner-2', 2, 'Grip + Pulling', 45, [
      ex('b6', 'Inverted Rows', 3, 10, 90),
      timed('b7', 'Towel Hangs', 4, 30, 60, 'Seconds'),
      ex('b8', 'Biceps Curls', 3, 12, 60),
      ex('b9', 'Hanging Knee Raises', 3, 10, 60),
      timed('b10', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
    template('bjj-beginner-3', 3, 'Legs + Hips', 45, [
      ex('b11', 'Goblet Squat', 3, 10, 90),
      ex('b12', 'Walking Lunges', 3, 12, 90),
      ex('b13', 'Copenhagen Plank', 3, 20, 45, 'Seconds'),
      timed('b14', 'Neck Bridge Holds', 3, 20, 60),
      timed('b15', 'Jump Rope', 6, 60, 30),
    ]),
    template('bjj-beginner-4', 4, 'Push + Core', 45, [
      ex('b16', 'Push-Ups', 3, 12, 60),
      ex('b17', 'Bench Press', 3, 8, 150),
      ex('b18', 'Overhead Press', 3, 8, 150),
      ex('b19', 'Hollow Body Hold', 3, 30, 30, 'Seconds'),
      timed('b20', 'Side Plank', 3, 30, 30, 'Per side'),
    ]),
    template('bjj-beginner-5', 5, 'Movement + Mobility', 35, [
      timed('b21', 'Mobility Flow', 1, 900, 0, '15 minutes'),
      timed('b22', 'Bear Crawls', 6, 20, 40, 'Seconds'),
      timed('b23', 'Breathing Reset', 1, 180, 0, '3 minutes'),
    ]),
    template('bjj-beginner-6', 6, 'Conditioning', 35, [
      timed('b24', 'Sprint Intervals', 10, 20, 40, '20s hard / 40s easy'),
      ex('b25', 'Burpees', 5, 12, 45),
      timed('b26', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
  ],
}

const bjjIntermediate: SportProgram = {
  sport: 'bjj',
  name: 'BJJ Functional Strength (Intermediate)',
  description: 'Grip endurance and functional strength for competitive jiu-jitsu.',
  templates: [
    template('bjj-intermediate-1', 1, 'Posterior Chain', 55, [
      ex('bi1', 'Deadlift', 4, 5, 210),
      ex('bi2', 'Hip Thrust', 4, 8, 150),
      ex('bi3', 'Kettlebell Swings', 5, 15, 60),
      ex('bi4', 'Pull-Ups', 4, 6, 120),
      ex('bi5', 'Hamstring Curl', 3, 12, 60),
    ]),
    template('bjj-intermediate-2', 2, 'Grip + Pulling', 50, [
      ex('bi6', 'Weighted Pull-Ups', 4, 5, 150),
      ex('bi7', 'Barbell Row', 4, 8, 120),
      timed('bi8', 'Farmer Carries', 6, 30, 75, 'Seconds'),
      timed('bi9', 'Towel Hangs', 5, 30, 60, 'Seconds'),
      ex('bi10', 'Biceps Curls', 3, 12, 60),
    ]),
    template('bjj-intermediate-3', 3, 'Legs + Hips', 50, [
      ex('bi11', 'Front Squat', 4, 6, 180),
      ex('bi12', 'Bulgarian Split Squat', 4, 8, 120),
      ex('bi13', 'Walking Lunges', 4, 12, 90),
      ex('bi14', 'Copenhagen Plank', 4, 25, 45, 'Seconds'),
      timed('bi15', 'Neck Bridge Holds', 4, 20, 60),
    ]),
    template('bjj-intermediate-4', 4, 'Push + Core', 50, [
      ex('bi16', 'Bench Press', 4, 6, 180),
      ex('bi17', 'Overhead Press', 4, 6, 180),
      ex('bi18', 'Dips', 4, 8, 120),
      ex('bi19', 'Hanging Leg Raises', 4, 10, 60),
      timed('bi20', 'Side Plank', 3, 40, 30, 'Per side'),
    ]),
    template('bjj-intermediate-5', 5, 'Movement + Mobility', 45, [
      timed('bi21', 'Mobility Flow', 1, 900, 0, '15 minutes'),
      timed('bi22', 'Bear Crawls', 8, 20, 40, 'Seconds'),
      ex('bi23', 'Turkish Get-Up', 3, 3, 90, 'Per side'),
      ex('bi24', 'Hollow Body Hold', 4, 30, 30, 'Seconds'),
    ]),
    template('bjj-intermediate-6', 6, 'Conditioning Circuit', 40, [
      timed('bi25', 'Assault Bike Sprints', 12, 15, 45, 'Seconds'),
      timed('bi26', 'Kettlebell Circuit', 6, 60, 30, 'Swings, goblet squats, carries'),
      ex('bi27', 'Burpees', 6, 12, 45),
      timed('bi28', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
  ],
}

const bjjAdvanced: SportProgram = {
  sport: 'bjj',
  name: 'Elite BJJ Strength (Advanced)',
  description: 'High-output pulling, hips, and grip endurance for elite grappling.',
  templates: [
    template('bjj-advanced-1', 1, 'Posterior Chain (Strength)', 60, [
      ex('ba1', 'Deadlift', 5, 3, 240),
      ex('ba2', 'Hip Thrust', 5, 6, 180),
      ex('ba3', 'Kettlebell Swings', 6, 20, 60),
      ex('ba4', 'Weighted Pull-Ups', 5, 4, 180),
      ex('ba5', 'Nordic Curl', 4, 6, 90),
      timed('ba6', 'Farmer Carries', 8, 40, 75, 'Seconds'),
    ]),
    template('bjj-advanced-2', 2, 'Grip + Pulling (Endurance)', 55, [
      ex('ba7', 'Barbell Row', 5, 6, 150),
      ex('ba8', 'Pull-Ups', 6, 6, 120),
      timed('ba9', 'Towel Hangs', 6, 40, 60, 'Seconds'),
      timed('ba10', 'Gi/Towel Pulls', 6, 30, 60, 'Seconds'),
      ex('ba11', 'Biceps Curls', 4, 12, 60),
    ]),
    template('bjj-advanced-3', 3, 'Legs + Hips (Strength)', 60, [
      ex('ba12', 'Back Squat', 5, 3, 240),
      ex('ba13', 'Bulgarian Split Squat', 5, 6, 150),
      ex('ba14', 'Romanian Deadlift', 5, 6, 180),
      ex('ba15', 'Copenhagen Plank', 5, 30, 45, 'Seconds'),
      timed('ba16', 'Neck Bridge Holds', 5, 25, 60),
    ]),
    template('bjj-advanced-4', 4, 'Push + Core (Strength)', 55, [
      ex('ba17', 'Bench Press', 5, 3, 240),
      ex('ba18', 'Overhead Press', 5, 4, 210),
      ex('ba19', 'Weighted Dips', 5, 5, 180),
      ex('ba20', 'Hanging Leg Raises', 5, 12, 60),
      timed('ba21', 'Hollow Body Hold', 5, 30, 30, 'Seconds'),
    ]),
    template('bjj-advanced-5', 5, 'Movement + Resilience', 45, [
      timed('ba22', 'Mobility Flow', 1, 1200, 0, '20 minutes'),
      timed('ba23', 'Bear Crawls', 10, 20, 40, 'Seconds'),
      ex('ba24', 'Turkish Get-Up', 4, 2, 120, 'Per side'),
    ]),
    template('bjj-advanced-6', 6, 'Conditioning (Rounds)', 45, [
      timed('ba25', 'Assault Bike Sprints', 15, 15, 45, 'Seconds'),
      timed('ba26', 'Sled Push', 12, 15, 45, 'Seconds'),
      ex('ba27', 'Burpees', 8, 12, 45),
      timed('ba28', 'Mobility Flow', 1, 600, 0, '10 minutes'),
    ]),
  ],
}

export const sportPrograms: Record<SportType, Record<ExperienceLevel, SportProgram>> = {
  wrestling: {
    beginner: wrestlingBeginner,
    intermediate: wrestlingIntermediate,
    advanced: wrestlingAdvanced,
  },
  judo: {
    beginner: judoBeginner,
    intermediate: judoIntermediate,
    advanced: judoAdvanced,
  },
  bjj: {
    beginner: bjjBeginner,
    intermediate: bjjIntermediate,
    advanced: bjjAdvanced,
  },
}

// Generate weekly program sessions (pure, offline-safe).
// This returns a blueprint that is later resolved against Supabase for real exercise UUIDs.
export function generateWeeklyProgram(
  sport: SportType,
  daysPerWeek: number,
  options: ProgramOptions = {}
): Session[] {
  const level: ExperienceLevel = options.level ?? 'beginner'
  const program = sportPrograms[sport]?.[level] ?? sportPrograms[sport].beginner
  const clampedDays = clamp(daysPerWeek, 2, 6)
  const selectedTemplates = program.templates.slice(0, clampedDays)

  return selectedTemplates.map((t) => {
    const tuned = applyOptionsToTemplate(sport, level, t, options)
    return {
      id: tuned.id,
      day: `Day ${tuned.dayNumber}`,
      focus: tuned.focus,
      duration: tuned.duration,
      exercises: tuned.exercises,
    }
  })
}

