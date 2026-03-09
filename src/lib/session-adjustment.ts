import { Exercise, Session, SessionAdjustmentMode, SportType } from '@/lib/types'

export type SessionReadinessEnergy = 'ready' | 'okay' | 'low'
export type SessionReadinessTime = 'full' | '30' | '20'

export const SESSION_ADJUSTMENT_MODES: SessionAdjustmentMode[] = ['full', 'short', 'recovery', 'technique']

export const estimateDurationMinutes = (exercises: Exercise[]) => {
  if (!Array.isArray(exercises) || exercises.length === 0) return 0
  let totalSeconds = 0
  for (const ex of exercises) {
    const exerciseTime = ex.duration ?? (ex.reps ?? 10) * 3
    totalSeconds += (exerciseTime * ex.sets) + (ex.restTime * Math.max(0, ex.sets - 1))
  }
  return Math.max(1, Math.ceil(totalSeconds / 60))
}

export const normalizeSessionAdjustmentMode = (value: unknown): SessionAdjustmentMode | null => {
  return typeof value === 'string' && SESSION_ADJUSTMENT_MODES.includes(value as SessionAdjustmentMode)
    ? value as SessionAdjustmentMode
    : null
}

export const getSessionAdjustmentLabel = (mode: SessionAdjustmentMode) => {
  switch (mode) {
    case 'full': return 'Full session'
    case 'short': return 'Short session'
    case 'recovery': return 'Recovery session'
    case 'technique': return 'Technique focus'
    default: return 'Full session'
  }
}

export const getSessionAdjustmentDescription = (mode: SessionAdjustmentMode) => {
  switch (mode) {
    case 'full': return 'Keep the full plan when energy and time are both there.'
    case 'short': return 'Trim the workload so you can keep momentum on a tight schedule.'
    case 'recovery': return 'Swap in low-stress movement to keep the habit without digging a deeper hole.'
    case 'technique': return 'Use a lighter technical session when you want quality work over loading.'
    default: return 'Keep the full plan when energy and time are both there.'
  }
}

export const recommendSessionAdjustmentMode = (
  energy: SessionReadinessEnergy,
  availableTime: SessionReadinessTime
): SessionAdjustmentMode => {
  if (energy === 'low') return 'recovery'
  if (availableTime === '20') return energy === 'okay' ? 'technique' : 'short'
  if (availableTime === '30') return 'short'
  return 'full'
}

const buildShortSession = (session: Session): Session => {
  const exerciseLimit = session.exercises.length <= 4 ? session.exercises.length : 4
  const exercises = session.exercises.slice(0, exerciseLimit).map((exercise, index) => ({
    ...exercise,
    sets: Math.max(1, Math.min(exercise.sets, index < 2 ? 3 : 2)),
    restTime: Math.min(exercise.restTime, 60),
  }))

  return {
    ...session,
    id: `${session.id}::short`,
    focus: `${session.focus} • Short`,
    exercises,
    duration: estimateDurationMinutes(exercises),
  }
}

const buildRecoverySession = (session: Session): Session => {
  const exercises: Exercise[] = [
    { id: `${session.id}::recovery-breathing`, name: 'Breathing Reset', sets: 2, duration: 90, restTime: 30, notes: 'Nasal breathing, long exhales.' },
    { id: `${session.id}::recovery-mobility`, name: 'Mobility Flow', sets: 2, duration: 180, restTime: 45, notes: 'Move with control. Stay pain-free.' },
    { id: `${session.id}::recovery-core`, name: 'Core Stability Circuit', sets: 2, duration: 120, restTime: 45, notes: 'Keep the effort easy and crisp.' },
  ]

  return {
    id: `${session.id}::recovery`,
    day: session.day,
    focus: 'Recovery + Movement',
    exercises,
    duration: estimateDurationMinutes(exercises),
  }
}

const buildTechniqueSession = (session: Session, sport: SportType): Session => {
  const sportLabel = sport === 'wrestling' ? 'Wrestling' : sport === 'judo' ? 'Judo' : 'BJJ'
  const blocksBySport: Record<SportType, Exercise[]> = {
    wrestling: [
      { id: `${session.id}::tech-stance`, name: 'Stance & Motion Block', sets: 3, duration: 120, restTime: 30, notes: 'Stay light on your feet and own your level changes.' },
      { id: `${session.id}::tech-entries`, name: 'Shot Entry Reps', sets: 3, duration: 90, restTime: 45, notes: 'Clean entries only. Stop before speed breaks down.' },
      { id: `${session.id}::tech-handfight`, name: 'Hand Fighting Flow', sets: 3, duration: 120, restTime: 45, notes: 'Focus on position, ties, and first contact.' },
    ],
    judo: [
      { id: `${session.id}::tech-grips`, name: 'Grip Fighting Flow', sets: 3, duration: 120, restTime: 30, notes: 'Win first contact and posture.' },
      { id: `${session.id}::tech-uchikomi`, name: 'Uchikomi Entries', sets: 3, duration: 90, restTime: 45, notes: 'Smooth feet, clean timing, no forcing.' },
      { id: `${session.id}::tech-balance`, name: 'Kuzushi Mechanics', sets: 3, duration: 120, restTime: 45, notes: 'Prioritize balance breaking and clean direction.' },
    ],
    bjj: [
      { id: `${session.id}::tech-hips`, name: 'Hip Escape + Stand-Up Flow', sets: 3, duration: 120, restTime: 30, notes: 'Move cleanly, not fast.' },
      { id: `${session.id}::tech-guard`, name: 'Guard Retention Reps', sets: 3, duration: 90, restTime: 45, notes: 'Own frames and hip angle before speed.' },
      { id: `${session.id}::tech-chain`, name: 'Technique Chain Reps', sets: 3, duration: 120, restTime: 45, notes: 'Pick one sequence and make it sharp.' },
    ],
  }

  const exercises = blocksBySport[sport]

  return {
    id: `${session.id}::technique`,
    day: session.day,
    focus: `${sportLabel} Technique`,
    exercises,
    duration: estimateDurationMinutes(exercises),
  }
}

export const adjustSessionForReadiness = (params: {
  session: Session | null
  mode: SessionAdjustmentMode | null
  sport: SportType
}): Session | null => {
  const { session, mode, sport } = params
  if (!session || !mode || mode === 'full') return session

  switch (mode) {
    case 'short':
      return buildShortSession(session)
    case 'recovery':
      return buildRecoverySession(session)
    case 'technique':
      return buildTechniqueSession(session, sport)
    default:
      return session
  }
}