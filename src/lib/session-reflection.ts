import { SessionLog } from '@/lib/types'

export interface ReflectionQuickPick {
  label: string
  description: string
  rating: number
}

export interface ReflectionPrompt {
  label: string
  text: string
}

export const REFLECTION_QUICK_PICKS: ReflectionQuickPick[] = [
  { label: 'Cruise', description: 'Moved well, never redlined', rating: 6 },
  { label: 'Solid', description: 'Strong work, still composed', rating: 7 },
  { label: 'Hard', description: 'Serious effort, needed focus', rating: 8 },
  { label: 'Limit', description: 'Near the edge today', rating: 9 },
]

export const getEffortRatingLabel = (rating: number): string => {
  if (rating <= 3) return 'Weak'
  if (rating <= 5) return 'Acceptable'
  if (rating <= 7) return 'Good'
  if (rating <= 9) return 'Strong'
  return 'Warrior'
}

const normalizeCarryForwardNote = (note?: string | null): string | null => {
  const trimmed = note?.trim().replace(/\s+/g, ' ') ?? ''
  if (!trimmed) return null
  return trimmed.replace(/[.!?]+$/, '').slice(0, 96)
}

export const buildReflectionPrompts = (
  lastSession?: Pick<SessionLog, 'effortRating' | 'notes'> | null
): ReflectionPrompt[] => {
  const prompts: ReflectionPrompt[] = []
  const carryForwardNote = normalizeCarryForwardNote(lastSession?.notes)

  if (carryForwardNote) {
    prompts.push({
      label: 'Carry forward',
      text: `Carry forward: ${carryForwardNote}.`,
    })
  }

  if ((lastSession?.effortRating ?? 0) >= 8) {
    prompts.push({
      label: 'Need recovery',
      text: 'Still carrying fatigue from the last hard session. Keep the next one sharp, not sloppy.',
    })
  } else if (lastSession?.effortRating !== undefined && lastSession.effortRating <= 5) {
    prompts.push({
      label: 'Had more in the tank',
      text: 'Had more in the tank today. Next time I can push the pace earlier.',
    })
  }

  prompts.push(
    { label: 'Technique clicked', text: 'Technique clicked once I slowed down and stayed disciplined.' },
    { label: 'Shoulder tight', text: 'Shoulder felt tight. Warm up longer and keep every rep clean.' },
    { label: 'Knee sore', text: 'Knee felt sore. Keep the next session controlled and technically sharp.' },
    { label: 'Grip faded', text: 'Grip faded before the rest of me. Build better pacing and hand endurance.' }
  )

  return prompts.slice(0, 6)
}

export const mergeReflectionNote = (current: string, addition: string): string => {
  const base = current.trim()
  const extra = addition.trim()

  if (!extra) return base
  if (!base) return extra
  if (base.toLowerCase().includes(extra.toLowerCase())) return base

  const joiner = /[.!?]$/.test(base) ? ' ' : '. '
  return `${base}${joiner}${extra}`
}