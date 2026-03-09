export interface ParsedExerciseCoachingContent {
  summary: string | null
  executionPoints: string[]
  commonMistakes: string[]
  progression: string | null
}

const COMMON_MISTAKES_MARKER = 'Common mistakes:'
const PROGRESSION_MARKER = 'Progression:'

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[.!?\s]+$/g, '').trim()
}

function toSentenceCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function splitSentences(value: string): string[] {
  const normalized = normalizeText(value)
  if (!normalized) return []

  return (normalized.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean)
}

function splitCommonMistakes(value: string): string[] {
  const normalized = trimTrailingPunctuation(normalizeText(value))
    .replace(/;\s*/g, ', ')
    .replace(/,\s+and\s+/gi, ', ')
    .replace(/\sand\s/gi, ', ')

  return normalized
    .split(',')
    .map((item) => trimTrailingPunctuation(item))
    .filter(Boolean)
    .map((item) => toSentenceCase(item))
}

export function parseExerciseCoachingContent(description?: string | null): ParsedExerciseCoachingContent {
  const normalized = normalizeText(description ?? '')
  if (!normalized) {
    return {
      summary: null,
      executionPoints: [],
      commonMistakes: [],
      progression: null,
    }
  }

  const commonMistakesIndex = normalized.indexOf(COMMON_MISTAKES_MARKER)
  const progressionIndex = normalized.indexOf(PROGRESSION_MARKER)
  const sectionIndexes = [commonMistakesIndex, progressionIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)

  const summary = normalizeText(normalized.slice(0, sectionIndexes[0] ?? normalized.length)) || null

  const commonMistakes = commonMistakesIndex >= 0
    ? splitCommonMistakes(
        normalized.slice(
          commonMistakesIndex + COMMON_MISTAKES_MARKER.length,
          progressionIndex > commonMistakesIndex ? progressionIndex : normalized.length
        )
      )
    : []

  const progression = progressionIndex >= 0
    ? toSentenceCase(normalizeText(normalized.slice(progressionIndex + PROGRESSION_MARKER.length))) || null
    : null

  return {
    summary,
    executionPoints: summary ? splitSentences(summary) : [],
    commonMistakes,
    progression,
  }
}