import type {
  EliteExerciseStandard,
  ExerciseDifficultyLevel,
  ExerciseLoggableMetric,
  ExercisePerformanceTag,
  SportType,
} from './types'

type TrainingCategory = 'strength' | 'mobility' | 'agility' | 'conditioning' | 'grip' | 'power'

export interface EliteExerciseStandardInput {
  exerciseId: string
  exerciseName: string
  category?: string | null
  description?: string | null
  equipment?: string[] | null
  sport?: SportType | null
  isWeighted?: boolean | null
  reps?: string | null
  sets?: string | null
  weight?: string | null
  duration?: string | null
  priority?: number | null
}

interface ExerciseReplacement {
  exerciseName: string
  category: TrainingCategory
  description: string
  equipment: string[]
  loggableMetrics: ExerciseLoggableMetric[]
}

export interface EliteExerciseStandardResult {
  canonicalName: string
  canonicalCategory: string
  canonicalDescription: string
  benefits: Record<SportType, string>
  difficultyLevel: ExerciseDifficultyLevel
  equipmentRequired: string[]
  loggableMetrics: ExerciseLoggableMetric[]
  tags: ExercisePerformanceTag[]
  profile: EliteExerciseStandard
}

const VAGUE_EXERCISE_REPLACEMENTS: Record<string, ExerciseReplacement> = {
  'dancing agility': {
    exerciseName: 'Reaction Step Mirror Drill',
    category: 'agility',
    description:
      'Start in a low athletic stance facing a partner or visual cue. React to direction changes with 1-2 explosive steps, then reset to stance without crossing your feet. Work 5 rounds of 20 seconds with 40 seconds rest. Common mistakes: standing too tall, crossing feet, and reacting late. Progression: add level changes before each reaction step.',
    equipment: ['None'],
    loggableMetrics: ['time'],
  },
  conditioning: {
    exerciseName: 'Assault Bike Sprint Intervals',
    category: 'conditioning',
    description:
      'Set bike resistance so you can sprint hard with clean posture. Sprint 15-20 seconds, then pedal easy for 40-45 seconds. Complete 8-12 rounds while maintaining output consistency. Common mistakes: starting too hard and fading, rounded posture, and incomplete recovery. Progression: add rounds or increase sprint duration.',
    equipment: ['Assault Bike'],
    loggableMetrics: ['time', 'distance'],
  },
  stretching: {
    exerciseName: '90/90 Hip Switch Flow',
    category: 'mobility',
    description:
      'Sit tall in a 90/90 position with both knees bent at 90 degrees. Rotate hips side to side without using hands, then add a controlled forward hinge over the front shin. Perform 3-4 sets of 8-12 controlled switches per side. Common mistakes: collapsing posture, forcing end range, and rushing transitions. Progression: add a controlled stand-up between switches.',
    equipment: ['None'],
    loggableMetrics: ['reps', 'time'],
  },
  'grip work': {
    exerciseName: 'Gi Towel Pull-Up Holds',
    category: 'grip',
    description:
      'Loop two towels over a pull-up bar and grip each towel like a gi sleeve. Pull to top position and hold with elbows tight and shoulders packed. Complete 4-6 sets of 10-30 second holds. Common mistakes: shrugging shoulders, loose core, and sliding grip. Progression: add weight or alternate one-arm assisted holds.',
    equipment: ['Pull-up Bar', 'Towels or Gi'],
    loggableMetrics: ['time', 'weight'],
  },
  'warm ups': {
    exerciseName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'mobility',
    description:
      'Begin with hip circles, deep squat pries, and lateral stance shifts. Move continuously for 4-6 minutes, keeping your base low and feet active. Focus on controlled range before speed. Common mistakes: rushing mobility, shallow range, and upright stance. Progression: add penetration-step entries or technical stand-ups between mobility blocks.',
    equipment: ['None'],
    loggableMetrics: ['time'],
  },
  'warm up': {
    exerciseName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'mobility',
    description:
      'Begin with hip circles, deep squat pries, and lateral stance shifts. Move continuously for 4-6 minutes, keeping your base low and feet active. Focus on controlled range before speed. Common mistakes: rushing mobility, shallow range, and upright stance. Progression: add penetration-step entries or technical stand-ups between mobility blocks.',
    equipment: ['None'],
    loggableMetrics: ['time'],
  },
  'dynamic warm ups': {
    exerciseName: 'Dynamic Stance and Hip Mobility Circuit',
    category: 'mobility',
    description:
      'Begin with hip circles, deep squat pries, and lateral stance shifts. Move continuously for 4-6 minutes, keeping your base low and feet active. Focus on controlled range before speed. Common mistakes: rushing mobility, shallow range, and upright stance. Progression: add penetration-step entries or technical stand-ups between mobility blocks.',
    equipment: ['None'],
    loggableMetrics: ['time'],
  },
  'general warm ups rotation side bending': {
    exerciseName: 'Standing Trunk Rotation and Side-Bend Mobility Circuit',
    category: 'mobility',
    description:
      'Stand in fight stance and rotate trunk side to side with hips stable, then add controlled side bends. Perform 2-3 rounds of 45-60 seconds each pattern. Keep breathing steady and range controlled. Common mistakes: rotating from knees instead of trunk, hyperextending low back, and rushing reps. Progression: add medicine-ball anti-rotation holds between rounds.',
    equipment: ['None'],
    loggableMetrics: ['time', 'reps'],
  },
  'judo specific movements': {
    exerciseName: 'Band-Resisted Uchi-komi Repetition Drill',
    category: 'power',
    description:
      'Anchor a resistance band behind you and grip as if holding lapel and sleeve. Step into throw-entry mechanics with full hip turn, then reset fast without losing posture. Perform 5-8 sets of 8-12 entries each side. Common mistakes: arm pulling without hip rotation, upright posture, and slow reset. Progression: increase band tension or add isometric finish holds.',
    equipment: ['Resistance Band'],
    loggableMetrics: ['reps', 'time'],
  },
  weightlifting: {
    exerciseName: 'Power Clean Pull Complex',
    category: 'power',
    description:
      'Start from hang or floor with neutral spine and loaded hips. Perform a clean pull to full extension, control the bar down, then repeat for quality reps. Use 4-6 sets of 3-5 reps with 90-150 seconds rest. Common mistakes: early arm bend, drifting bar path, and slow hip extension. Progression: add load gradually while preserving bar speed.',
    equipment: ['Barbell', 'Bumper Plates'],
    loggableMetrics: ['reps', 'weight'],
  },
  'wrestling drills': {
    exerciseName: 'Penetration Step to Sprawl Reaction Drill',
    category: 'agility',
    description:
      'Start in wrestling stance, execute a fast penetration step on cue, then immediately recover to a sprawl and return to stance. Perform 5 rounds of 30 seconds with 30 seconds rest. Keep chest over lead knee during entries and hips heavy during sprawls. Common mistakes: narrow base, delayed hip drop, and standing between reps. Progression: add directional callouts before each entry.',
    equipment: ['None'],
    loggableMetrics: ['time', 'reps'],
  },
  'stance and movement drills': {
    exerciseName: 'Lateral Shuffle and Level-Change Drill',
    category: 'agility',
    description:
      'Hold grappling stance and shuffle laterally for 2-3 steps, then perform a fast level change and recover. Repeat continuously for 20-30 seconds per round. Complete 4-6 rounds with 30 seconds rest. Common mistakes: crossing feet, upright torso, and slow recoveries. Progression: add sprawl or shot-entry after each level change.',
    equipment: ['None'],
    loggableMetrics: ['time'],
  },
  'movement prep': {
    exerciseName: 'Technical Stand-Up and Hip-Heist Flow',
    category: 'mobility',
    description:
      'From seated base, perform a technical stand-up, return to seated control, then switch to hip-heist on the opposite side. Move with clean mechanics for 3-5 rounds of 30-45 seconds. Keep posting arm active and hips high through transitions. Common mistakes: collapsing base, inactive posting hand, and uncontrolled returns. Progression: add band resistance or partner pressure.',
    equipment: ['None'],
    loggableMetrics: ['time', 'reps'],
  },
}

const CATEGORY_ALIASES: Record<string, string> = {
  'lower-body': 'legs',
  'upper-body': 'back',
  cardio: 'full-body',
}

const METRIC_ORDER: ExerciseLoggableMetric[] = ['reps', 'time', 'weight', 'distance']

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeUiCategory(rawCategory?: string | null): string {
  const normalized = normalizeText(rawCategory ?? '').replace(/\s+/g, '-')
  if (!normalized) return 'full-body'
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized]
  if (
    normalized === 'full-body' ||
    normalized === 'legs' ||
    normalized === 'chest' ||
    normalized === 'shoulders' ||
    normalized === 'back' ||
    normalized === 'arms' ||
    normalized === 'core' ||
    normalized === 'neck'
  ) {
    return normalized
  }
  return 'full-body'
}

function inferTrainingCategory(name: string, rawCategory?: string | null): TrainingCategory {
  const normalized = normalizeText(name)
  const category = normalizeText(rawCategory ?? '')

  if (/(warm|mobility|stretch|flow|prep)/.test(normalized) || /(mobility|recovery)/.test(category)) {
    return 'mobility'
  }
  if (/(agility|shuffle|reaction|footwork|ladder|mirror|hop)/.test(normalized)) {
    return 'agility'
  }
  if (/(grip|gi|towel|wrist|farmer|hang|pinch)/.test(normalized)) {
    return 'grip'
  }
  if (/(sprint|bike|interval|circuit|row|airdyne|assault|conditioning)/.test(normalized) || category === 'cardio') {
    return 'conditioning'
  }
  if (/(clean|snatch|jerk|jump|explosive|power|med ball|slam|throw)/.test(normalized)) {
    return 'power'
  }
  return 'strength'
}

function inferDifficultyLevel(priority?: number | null, isWeighted?: boolean | null): ExerciseDifficultyLevel {
  const score = priority ?? 5
  if (score >= 8 || (isWeighted && score >= 7)) return 'advanced'
  if (score >= 5) return 'intermediate'
  return 'beginner'
}

function inferLoggableMetrics(input: EliteExerciseStandardInput, trainingCategory: TrainingCategory): ExerciseLoggableMetric[] {
  const metrics = new Set<ExerciseLoggableMetric>()
  const normalizedName = normalizeText(input.exerciseName)

  if (input.reps || input.sets || (!input.duration && trainingCategory !== 'conditioning')) {
    metrics.add('reps')
  }
  if (input.duration || /(interval|hold|sprint|round|seconds|min|time)/.test(normalizedName)) {
    metrics.add('time')
  }
  if (input.weight || input.isWeighted || /(barbell|dumbbell|kettlebell|weighted|trap bar|sandbag)/.test(normalizedName)) {
    metrics.add('weight')
  }
  if (/(sprint|run|shuttle|carry|drag|sled|bike|row)/.test(normalizedName)) {
    metrics.add('distance')
  }

  if (metrics.size === 0) {
    metrics.add('reps')
  }

  return METRIC_ORDER.filter((metric) => metrics.has(metric))
}

function inferEquipment(input: EliteExerciseStandardInput): string[] {
  const provided = (input.equipment ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (provided.length > 0) {
    return Array.from(new Set(provided))
  }

  return ['Bodyweight']
}

function buildProtocolHint(metrics: ExerciseLoggableMetric[], difficulty: ExerciseDifficultyLevel): string {
  if (metrics.includes('weight')) {
    if (difficulty === 'advanced') return 'Use 5-6 sets of 3-5 reps with 120-180 seconds rest.'
    if (difficulty === 'intermediate') return 'Use 4-5 sets of 4-6 reps with 90-150 seconds rest.'
    return 'Use 3-4 sets of 5-8 reps with 75-120 seconds rest.'
  }
  if (metrics.includes('time') && !metrics.includes('reps')) {
    if (difficulty === 'advanced') return 'Run 6-10 rounds of 20-40 seconds work with 30-45 seconds rest.'
    if (difficulty === 'intermediate') return 'Run 5-8 rounds of 20-30 seconds work with 40-60 seconds rest.'
    return 'Run 4-6 rounds of 15-25 seconds work with 45-60 seconds rest.'
  }
  if (difficulty === 'advanced') return 'Use 4-6 sets of 6-10 reps with 45-90 seconds rest.'
  if (difficulty === 'intermediate') return 'Use 3-5 sets of 8-12 reps with 45-75 seconds rest.'
  return 'Use 3-4 sets of 8-12 reps with 60-90 seconds rest.'
}

function generateDescription(
  name: string,
  metrics: ExerciseLoggableMetric[],
  difficulty: ExerciseDifficultyLevel,
  existingDescription?: string | null
): string {
  if (existingDescription && existingDescription.trim().length > 90) {
    return existingDescription.trim()
  }

  const protocol = buildProtocolHint(metrics, difficulty)
  return `Start in a stable grappling stance with your core braced and posture neutral. Execute ${name} with controlled mechanics, then reset each rep before accelerating again. ${protocol} Common mistakes: rushing reps, losing hip-knee-shoulder alignment, and shortening range under fatigue. Progression: increase load, speed, or complexity only when movement quality stays consistent.`
}

function getPerformanceTags(trainingCategory: TrainingCategory, name: string): ExercisePerformanceTag[] {
  const normalized = normalizeText(name)
  const tags: ExercisePerformanceTag[] = []
  if (trainingCategory === 'grip') tags.push('grip')
  if (trainingCategory === 'agility') tags.push('agility', 'reaction')
  if (trainingCategory === 'mobility') tags.push('mobility')
  if (trainingCategory === 'conditioning') tags.push('conditioning')
  if (trainingCategory === 'power' || /(jump|clean|snatch|throw|slam|explosive)/.test(normalized)) {
    tags.push('explosive', 'power')
  }
  if (trainingCategory === 'strength' || /(squat|deadlift|press|row|pull)/.test(normalized)) {
    tags.push('strength')
  }
  if (tags.length === 0) tags.push('strength')
  return [...new Set(tags)]
}

function getSportBenefits(trainingCategory: TrainingCategory, name: string): Record<SportType, string> {
  const normalized = normalizeText(name)

  if (trainingCategory === 'agility') {
    return {
      judo: 'Improves angle changes during grip exchanges and faster foot repositioning into throw entries.',
      wrestling: 'Builds quicker penetration-step setup and re-attack movement during scrambles.',
      bjj: 'Sharpens passing footwork, inversion reactions, and transitional movement in open scrambles.',
    }
  }

  if (trainingCategory === 'mobility') {
    return {
      judo: 'Improves hip and thoracic range needed for cleaner kuzushi, entries, and safer landings.',
      wrestling: 'Supports lower stance depth, shot mechanics, and resilient movement through heavy mat volume.',
      bjj: 'Improves guard retention angles, hip escape mechanics, and positional endurance under pressure.',
    }
  }

  if (trainingCategory === 'grip') {
    return {
      judo: 'Builds sleeve-and-lapel control endurance for sustained gripping and throw setup.',
      wrestling: 'Improves hand-fighting control and tie retention without forearm fatigue drop-off.',
      bjj: 'Enhances collar/sleeve control, finishing grip endurance, and submission setup consistency.',
    }
  }

  if (trainingCategory === 'conditioning') {
    return {
      judo: 'Improves repeated high-output exchanges so throw attempts stay explosive late in rounds.',
      wrestling: 'Builds pace durability for hard hand-fighting, chain attacks, and fast recoveries.',
      bjj: 'Supports sustained scramble output and pressure passing without technical breakdown.',
    }
  }

  if (trainingCategory === 'power' || /(jump|clean|snatch|throw|slam)/.test(normalized)) {
    return {
      judo: 'Improves explosive hip extension and turnover speed for throw entry and finish mechanics.',
      wrestling: 'Builds first-step explosion for shots, lifts, and finishing through resistance.',
      bjj: 'Improves bridging, stand-up bursts, and explosive transitions in dynamic exchanges.',
    }
  }

  return {
    judo: 'Builds force production and positional stability for stronger grip fighting and throw execution.',
    wrestling: 'Improves mat-specific strength for control ties, finishes, and defensive re-attacks.',
    bjj: 'Develops force endurance for passing pressure, control retention, and submission finishing.',
  }
}

function resolveReplacement(normalizedName: string): ExerciseReplacement | null {
  if (VAGUE_EXERCISE_REPLACEMENTS[normalizedName]) {
    return VAGUE_EXERCISE_REPLACEMENTS[normalizedName]
  }

  if (/^warm ups?$/.test(normalizedName)) {
    return VAGUE_EXERCISE_REPLACEMENTS['warm ups']
  }

  return null
}

export function buildEliteExerciseStandard(input: EliteExerciseStandardInput): EliteExerciseStandardResult {
  const normalizedName = normalizeText(input.exerciseName)
  const replacement = resolveReplacement(normalizedName)

  const canonicalName = replacement?.exerciseName ?? toTitleCase(input.exerciseName.trim())
  const trainingCategory = replacement?.category ?? inferTrainingCategory(canonicalName, input.category)
  const canonicalCategory = normalizeUiCategory(input.category)
  const difficultyLevel = inferDifficultyLevel(input.priority, input.isWeighted)
  const loggableMetrics = replacement?.loggableMetrics ?? inferLoggableMetrics(input, trainingCategory)
  const equipmentRequired = replacement?.equipment ?? inferEquipment(input)
  const canonicalDescription = replacement?.description ?? generateDescription(
    canonicalName,
    loggableMetrics,
    difficultyLevel,
    input.description
  )
  const benefits = getSportBenefits(trainingCategory, canonicalName)
  const tags = getPerformanceTags(trainingCategory, canonicalName)

  const profile: EliteExerciseStandard = {
    exercise_id: input.exerciseId,
    exercise_name: canonicalName,
    category: trainingCategory,
    description: canonicalDescription,
    benefits_judo: benefits.judo,
    benefits_wrestling: benefits.wrestling,
    benefits_bjj: benefits.bjj,
    difficulty_level: difficultyLevel,
    equipment_required: equipmentRequired,
    loggable_metrics: loggableMetrics,
    tags,
  }

  return {
    canonicalName,
    canonicalCategory,
    canonicalDescription,
    benefits,
    difficultyLevel,
    equipmentRequired,
    loggableMetrics,
    tags,
    profile,
  }
}
