type SportType = 'wrestling' | 'judo' | 'bjj'

interface ExerciseTextContext {
  name: string
  category?: string | null
  muscleGroups?: string[] | null
  equipment?: string[] | null
  isWeighted?: boolean | null
  sport?: SportType | null
}

interface ExerciseNameAssessment {
  valid: boolean
  reason: string
}

const PLACEHOLDER_DESCRIPTIONS = new Set([
  '',
  'imported from dagestan discipline workbook',
  'n/a',
  'na',
  'unknown',
  'none',
  'placeholder',
])

const DISALLOWED_NAME_FRAGMENTS = [
  'http://',
  'https://',
  'www.',
  'subscribe',
  'follow',
  'link in bio',
  'click',
  'thumbnail',
  'svg',
]

const NON_EXERCISE_EXACT = new Set([
  'calisthenics',
  'cardio',
  'conditioning',
  'strength training',
  'resistance training',
  'weight training',
  'functional training',
  'circuit training',
  'endurance training',
  'mobility',
  'flexibility',
  'stretching',
  'warm ups',
  'warm up',
  'yoga',
  'gymnastics',
  'sparring',
])

const MOVEMENT_STEMS = [
  'squat',
  'deadlift',
  'lunge',
  'hinge',
  'press',
  'bench',
  'dip',
  'pull-up',
  'pull up',
  'chin-up',
  'chin up',
  'row',
  'clean',
  'jerk',
  'snatch',
  'thruster',
  'windmill',
  'get-up',
  'get up',
  'curl',
  'extension',
  'raise',
  'fly',
  'shrug',
  'swing',
  'carry',
  'farmer',
  'walk',
  'crawl',
  'step-up',
  'step up',
  'leg lift',
  'rollout',
  'push-up',
  'push up',
  'sit-up',
  'sit up',
  'v-up',
  'v up',
  'crunch',
  'plank',
  'bridge',
  'neck',
  'jump',
  'hop',
  'bound',
  'sprint',
  'run',
  'jog',
  'bike',
  'airdyne',
  'rowing',
  'rower',
  'swim',
  'skip',
  'rope',
  'slam',
  'throw',
  'twist',
  'rotation',
  'med ball',
  'medicine ball',
  'handstand',
  'cartwheel',
  'burpee',
  'ab wheel',
  'sprawl',
  'snap down',
  'sit-through',
  'sit through',
  'shrimp',
  'uchi-komi',
  'uchikomi',
  'takedown',
  'pummel',
]

const GENERIC_BUCKET_WORDS = [
  'drills',
  'exercises',
  'training',
  'sessions',
  'session',
  'program',
  'routine',
  'conditioning',
  'cardio',
  'mobility',
  'flexibility',
  'structure',
  'approach',
]

const GENERIC_INTENT_WORDS = [
  'consistency',
  'mental',
  'focus',
  'growth',
  'execution',
  'tools',
  'style',
]

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9+&/().,\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasMovementToken(lowered: string): boolean {
  return MOVEMENT_STEMS.some((stem) => lowered.includes(stem))
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeMuscleLabel(value: string): string {
  const lower = normalize(value)
  if (!lower) return ''
  if (lower.includes('quad') || lower.includes('hamstring') || lower.includes('glute') || lower.includes('calf')) {
    return 'legs'
  }
  if (lower.includes('lat') || lower.includes('upper back') || lower === 'back') {
    return 'back'
  }
  if (lower.includes('pec') || lower.includes('chest')) {
    return 'chest'
  }
  if (lower.includes('shoulder') || lower.includes('deltoid')) {
    return 'shoulders'
  }
  if (lower.includes('bicep') || lower.includes('tricep') || lower.includes('forearm') || lower.includes('arm')) {
    return 'arms'
  }
  if (lower.includes('neck')) {
    return 'neck'
  }
  if (lower.includes('core') || lower.includes('ab') || lower.includes('oblique') || lower.includes('trunk')) {
    return 'core'
  }
  if (lower.includes('full')) {
    return 'full body'
  }
  return lower
}

function deriveTargetArea(context: ExerciseTextContext): string {
  const normalizedMuscles = (context.muscleGroups ?? [])
    .map((group) => normalizeMuscleLabel(group))
    .filter(Boolean)

  if (normalizedMuscles.length > 0) {
    const unique = Array.from(new Set(normalizedMuscles))
    return unique.slice(0, 2).join(' and ')
  }

  const normalizedCategory = normalize(context.category ?? '')
  if (normalizedCategory === 'full-body') return 'full body power'
  if (normalizedCategory === 'lower-body' || normalizedCategory === 'legs') return 'leg drive and hip power'
  if (normalizedCategory === 'upper-body' || normalizedCategory === 'back') return 'upper-back and pulling strength'
  if (normalizedCategory === 'chest') return 'pressing strength'
  if (normalizedCategory === 'shoulders') return 'overhead stability and shoulder power'
  if (normalizedCategory === 'arms') return 'arm and grip endurance'
  if (normalizedCategory === 'core') return 'trunk stiffness and rotation control'
  if (normalizedCategory === 'neck') return 'neck durability'
  return 'combat-sport strength'
}

function deriveSportTransfer(sport?: SportType | null): string {
  if (sport === 'wrestling') return 'shots, sprawls, and mat pressure'
  if (sport === 'judo') return 'throws, grips, and posture control'
  if (sport === 'bjj') return 'scrambles, guard exchanges, and top pressure'
  return 'hard rounds and repeated high-output efforts'
}

function derivePrimaryCue(name: string): string {
  const lowered = normalize(name)

  if (lowered.includes('deadlift') || lowered.includes('hinge')) {
    return 'Set your back neutral, push your hips back, and drive through the floor while keeping the load close to your body.'
  }
  if (lowered.includes('squat') || lowered.includes('lunge')) {
    return 'Brace your trunk, sit into full controlled depth, then stand up explosively without losing knee or hip alignment.'
  }
  if (
    lowered.includes('bench') ||
    lowered.includes('press') ||
    lowered.includes('push-up') ||
    lowered.includes('push up') ||
    lowered.includes('dip')
  ) {
    return 'Create full-body tension, move the weight with control, and finish each rep with stable shoulder position.'
  }
  if (
    lowered.includes('row') ||
    lowered.includes('pull-up') ||
    lowered.includes('pull up') ||
    lowered.includes('chin-up') ||
    lowered.includes('chin up')
  ) {
    return 'Start from a strong brace, pull with your elbows and upper back, and control the lowering phase completely.'
  }
  if (lowered.includes('jump') || lowered.includes('hop') || lowered.includes('bound')) {
    return 'Load through hips and ankles, explode fast, and land softly in an athletic stance before the next rep.'
  }
  if (lowered.includes('carry') || lowered.includes('walk')) {
    return 'Hold posture tall, keep ribs stacked over hips, and take controlled steps without letting the load sway your trunk.'
  }
  if (
    lowered.includes('plank') ||
    lowered.includes('sit-up') ||
    lowered.includes('sit up') ||
    lowered.includes('v-up') ||
    lowered.includes('crunch') ||
    lowered.includes('bridge')
  ) {
    return 'Lock your ribs and pelvis together, move with strict control, and keep tension through the full set.'
  }
  if (lowered.includes('neck')) {
    return 'Use slow controlled reps and maintain neutral alignment so neck tissues adapt safely without jerking.'
  }
  if (lowered.includes('sprint') || lowered.includes('run') || lowered.includes('bike') || lowered.includes('rowing')) {
    return 'Work in hard intervals with crisp mechanics, and recover just enough to keep quality output on every repetition.'
  }
  if (lowered.includes('slam') || lowered.includes('throw') || lowered.includes('rotation')) {
    return 'Generate power from the floor through hips and trunk, then finish forcefully while keeping your core braced.'
  }

  return 'Set up with stable posture, use a controlled range of motion, and keep each rep technically clean from start to finish.'
}

function deriveLoadCue(context: ExerciseTextContext): string {
  const loweredName = normalize(context.name)
  const equipment = (context.equipment ?? []).map((item) => normalize(item))
  const weighted = Boolean(context.isWeighted) || equipment.some((item) =>
    ['weights', 'barbell', 'dumbbell', 'kettlebell', 'sandbag', 'medicine ball', 'club', 'trap bar'].includes(item)
  )

  if (weighted || /(barbell|dumbbell|kettlebell|sandbag|trap bar|med ball|medicine ball|club)/.test(loweredName)) {
    return 'Choose a load that allows strict reps; stop the set when speed or position breaks down.'
  }

  return 'Use tempo and full range to keep the movement challenging even without added load.'
}

export function assessExerciseName(value: string): ExerciseNameAssessment {
  const normalized = normalize(value)

  if (!normalized || normalized.length < 3 || normalized.length > 90) {
    return { valid: false, reason: 'name_length' }
  }

  if (DISALLOWED_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return { valid: false, reason: 'name_disallowed_fragment' }
  }

  if (/[<>{}[\]|]/.test(normalized)) {
    return { valid: false, reason: 'name_invalid_chars' }
  }

  if (NON_EXERCISE_EXACT.has(normalized)) {
    return { valid: false, reason: 'name_generic_exact' }
  }

  const hasBucketWord = GENERIC_BUCKET_WORDS.some((word) => normalized.includes(word))
  const hasIntentWord = GENERIC_INTENT_WORDS.some((word) => normalized.includes(word))
  const hasMovement = hasMovementToken(normalized)

  if ((hasIntentWord || hasBucketWord) && !hasMovement) {
    return { valid: false, reason: 'name_generic_bucket' }
  }

  // Even with movement terms, these are usually collections/program buckets, not single executable exercises.
  if (/\b(sessions?|drills|training|exercises)\b/.test(normalized)) {
    return { valid: false, reason: 'name_collection_not_single_exercise' }
  }

  if (/\b(per session|\/session|high volume)\b/.test(normalized)) {
    return { valid: false, reason: 'name_program_not_single_exercise' }
  }

  if (/\b(drills|exercises|sessions|training)\b/.test(normalized) && !hasMovement) {
    return { valid: false, reason: 'name_broad_collection' }
  }

  if (/\b\d+\s*-\s*\d+x\s*\/?\s*week\b|\b\d+x\s*week\b|\bweekly\b|\bdaily\b/.test(normalized)) {
    return { valid: false, reason: 'name_schedule_not_exercise' }
  }

  if (/\b(for adcc|for bjj|for judo|for wrestling)\b/.test(normalized) && !hasMovement) {
    return { valid: false, reason: 'name_goal_not_exercise' }
  }

  return { valid: true, reason: 'ok' }
}

export function isLikelyExerciseName(value: string): boolean {
  return assessExerciseName(value).valid
}

export function shouldReplaceExerciseDescription(value: string | null | undefined): boolean {
  const normalized = normalize(value ?? '')
  const raw = String(value ?? '').trim()
  if (PLACEHOLDER_DESCRIPTIONS.has(normalized)) {
    return true
  }

  if (normalized.length < 45) {
    return true
  }

  const overlyGenericPatterns = [
    /<[^>]+>/i,
    /&#x?[0-9a-f]+;/i,
    /\b(12-week|weekly split|workout includes|training routine|conditioning program|structured training cycles)\b/i,
    /\b(i recommend|i usually suggest|you can, of course|for more of a strength focus)\b/i,
    /\b(article outlines|importance of grip strength|focus:|sets and reps|goal:)\b/i,
    /\b(for example tuesday|successful wrestling season|ufc performance institute)\b/i,
    /\b(great exercise|improves fitness|various muscles|general strength|overall conditioning)\b/,
    /\b(training focused on|exercise for athletes)\b/,
  ]

  if (overlyGenericPatterns.some((pattern) => pattern.test(raw))) {
    return true
  }

  if (raw.length > 320) {
    return true
  }

  return false
}

export function generateExerciseDescription(context: ExerciseTextContext): string {
  const cue = derivePrimaryCue(context.name)
  const targetArea = deriveTargetArea(context)
  const sportTransfer = deriveSportTransfer(context.sport ?? null)
  const loadCue = deriveLoadCue(context)
  return `${cue} This movement targets ${targetArea} for better ${sportTransfer}. ${loadCue}`
}

export function normalizeExerciseNameForDisplay(value: string): string {
  return toTitleCase(normalize(value))
}
