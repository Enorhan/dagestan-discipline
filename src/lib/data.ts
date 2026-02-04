import { Session, SportProgram, SportType } from './types'

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
      exercises: []
    },
    {
      id: 'wrestling-2',
      dayNumber: 2,
      focus: 'Grip & Carry Strength',
      duration: 50,
      exercises: []
    },
    {
      id: 'wrestling-3',
      dayNumber: 3,
      focus: 'Wrestling Circuit',
      duration: 45,
      exercises: []
    },
    {
      id: 'wrestling-4',
      dayNumber: 4,
      focus: 'Lower Body Power',
      duration: 55,
      exercises: []
    },
    {
      id: 'wrestling-5',
      dayNumber: 5,
      focus: 'Upper Body & Core',
      duration: 50,
      exercises: []
    },
    {
      id: 'wrestling-6',
      dayNumber: 6,
      focus: 'Conditioning & Endurance',
      duration: 40,
      exercises: []
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
      exercises: []
    },
    {
      id: 'judo-2',
      dayNumber: 2,
      focus: 'Lower Body Power',
      duration: 50,
      exercises: []
    },
    {
      id: 'judo-3',
      dayNumber: 3,
      focus: 'Grip & Throwing Power',
      duration: 50,
      exercises: []
    },
    {
      id: 'judo-4',
      dayNumber: 4,
      focus: 'Plyometrics',
      duration: 45,
      exercises: []
    },
    {
      id: 'judo-5',
      dayNumber: 5,
      focus: 'Push & Core',
      duration: 50,
      exercises: []
    },
    {
      id: 'judo-6',
      dayNumber: 6,
      focus: 'Full Body Circuit',
      duration: 40,
      exercises: []
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
      exercises: []
    },
    {
      id: 'bjj-2',
      dayNumber: 2,
      focus: 'Grip & Pulling',
      duration: 50,
      exercises: []
    },
    {
      id: 'bjj-3',
      dayNumber: 3,
      focus: 'Legs & Hips',
      duration: 50,
      exercises: []
    },
    {
      id: 'bjj-4',
      dayNumber: 4,
      focus: 'Push & Core',
      duration: 50,
      exercises: []
    },
    {
      id: 'bjj-5',
      dayNumber: 5,
      focus: 'Movement & Mobility',
      duration: 45,
      exercises: []
    },
    {
      id: 'bjj-6',
      dayNumber: 6,
      focus: 'Kettlebell Circuit',
      duration: 40,
      exercises: []
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