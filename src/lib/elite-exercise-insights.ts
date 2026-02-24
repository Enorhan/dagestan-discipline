import { Exercise } from './types'

type ExerciseLike = {
  name?: string | null
}

export interface EliteExerciseInsight {
  id: string
  athlete: string
  title: string
  detail: string
}

interface InsightPattern {
  id: string
  athlete: string
  title: string
  keywords: string[]
  fallbackDetail: string
  benefitSuffix: string
}

const INSIGHT_PATTERNS: InsightPattern[] = [
  {
    id: 'explosive-power',
    athlete: 'Jordan Burroughs',
    title: 'Explosive Transfer',
    keywords: ['jump', 'clean', 'snatch', 'power', 'sprint', 'box', 'plyo', 'throw'],
    fallbackDetail: 'Jordan Burroughs uses explosive lifts and sprint intervals to sharpen first-step speed and finish power on attacks.',
    benefitSuffix: 'builds fast-twitch explosiveness that carries into penetration, elevation, and finishing speed.',
  },
  {
    id: 'leg-drive',
    athlete: 'Shohei Ono',
    title: 'Leg Drive Foundation',
    keywords: ['squat', 'lunge', 'step', 'zercher', 'split', 'deadlift', 'hinge', 'thrust'],
    fallbackDetail: 'Shohei Ono builds throws from the floor up with heavy lower-body work for stable hips and forceful extension.',
    benefitSuffix: 'improves leg drive and hip extension for stronger shots, throws, and positional pressure.',
  },
  {
    id: 'pulling-grip',
    athlete: 'Aleksandr Karelin',
    title: 'Grip and Pulling Control',
    keywords: ['pull', 'row', 'chin', 'rope', 'grip', 'carry', 'farmer', 'hang'],
    fallbackDetail: 'Aleksandr Karelin was known for relentless pulling and grip training to dominate ties and body control.',
    benefitSuffix: 'raises pulling endurance and grip control for clinch exchanges and finishing strength.',
  },
  {
    id: 'pressing-frame',
    athlete: 'Teddy Riner',
    title: 'Framing Strength',
    keywords: ['press', 'bench', 'push', 'dip', 'shoulder', 'overhead'],
    fallbackDetail: 'Teddy Riner uses pressing volume to keep strong posture, framing power, and control in hand-fighting exchanges.',
    benefitSuffix: 'develops upper-body frame strength for posting, pummeling, and pressure control.',
  },
  {
    id: 'core-stability',
    athlete: 'Gordon Ryan',
    title: 'Core Stability',
    keywords: ['core', 'plank', 'hollow', 'rotation', 'twist', 'sit', 'ab', 'neck', 'bridge'],
    fallbackDetail: 'Gordon Ryan emphasizes trunk control and isometric strength to maintain pressure and position under fatigue.',
    benefitSuffix: 'improves bracing and positional stability so technique stays sharp late in sessions.',
  },
  {
    id: 'conditioning-engine',
    athlete: 'Dan Gable',
    title: 'Repeat-Effort Conditioning',
    keywords: ['condition', 'bike', 'rower', 'burpee', 'run', 'circuit', 'interval', 'airdyne', 'assault'],
    fallbackDetail: 'Dan Gable-style conditioning creates repeat effort capacity so skill execution does not collapse when tired.',
    benefitSuffix: 'improves repeat effort and recovery between bursts so work rate stays high.',
  },
  {
    id: 'mobility-longevity',
    athlete: 'Kyle Dake',
    title: 'Mobility and Longevity',
    keywords: ['mobility', 'stretch', 'recovery', 'flow', 'range', 'prep'],
    fallbackDetail: 'Kyle Dake integrates mobility work to keep quality movement and reduce overuse stress across hard cycles.',
    benefitSuffix: 'protects movement quality and helps you sustain hard training without breakdown.',
  },
]

const FALLBACK_ORDER: string[] = [
  'explosive-power',
  'pulling-grip',
  'conditioning-engine',
]

const normalize = (value: string) => value.trim().toLowerCase()

const collectExerciseNames = (exercises: ExerciseLike[] | Exercise[] | null | undefined): string[] => {
  if (!Array.isArray(exercises)) return []
  return exercises
    .map((exercise) => (exercise?.name ?? '').trim())
    .filter((name): name is string => Boolean(name))
}

const ensurePattern = (id: string): InsightPattern | undefined =>
  INSIGHT_PATTERNS.find((pattern) => pattern.id === id)

export function getEliteExerciseInsights(
  exercises: ExerciseLike[] | Exercise[] | null | undefined,
  focusHint?: string | null,
  maxItems: number = 3
): EliteExerciseInsight[] {
  if (maxItems <= 0) return []

  const names = collectExerciseNames(exercises)
  const normalizedFocus = normalize(focusHint ?? '')

  const scored = new Map<string, { score: number; matches: Set<string> }>()

  for (const pattern of INSIGHT_PATTERNS) {
    scored.set(pattern.id, { score: 0, matches: new Set<string>() })
  }

  for (const originalName of names) {
    const exerciseName = normalize(originalName)
    for (const pattern of INSIGHT_PATTERNS) {
      if (pattern.keywords.some((keyword) => exerciseName.includes(keyword))) {
        const entry = scored.get(pattern.id)
        if (!entry) continue
        entry.score += 2
        entry.matches.add(originalName)
      }
    }
  }

  if (normalizedFocus) {
    for (const pattern of INSIGHT_PATTERNS) {
      if (pattern.keywords.some((keyword) => normalizedFocus.includes(keyword))) {
        const entry = scored.get(pattern.id)
        if (!entry) continue
        entry.score += 1
      }
    }
  }

  const matched = INSIGHT_PATTERNS
    .map((pattern) => ({
      pattern,
      score: scored.get(pattern.id)?.score ?? 0,
      matches: scored.get(pattern.id)?.matches ?? new Set<string>(),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const selected: Array<{ pattern: InsightPattern; matches: Set<string> }> = []

  for (const item of matched) {
    if (selected.length >= maxItems) break
    selected.push({ pattern: item.pattern, matches: item.matches })
  }

  if (selected.length === 0) {
    for (const fallbackId of FALLBACK_ORDER) {
      if (selected.length >= maxItems) break
      const pattern = ensurePattern(fallbackId)
      if (!pattern) continue
      selected.push({ pattern, matches: new Set<string>() })
    }
  }

  return selected.map(({ pattern, matches }) => {
    const examples = Array.from(matches).slice(0, 2)
    const detail = examples.length > 0
      ? `${pattern.athlete} uses ${examples.join(' and ')} work, which ${pattern.benefitSuffix}`
      : pattern.fallbackDetail

    return {
      id: pattern.id,
      athlete: pattern.athlete,
      title: pattern.title,
      detail,
    }
  })
}
