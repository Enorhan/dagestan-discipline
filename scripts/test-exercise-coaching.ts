import assert from 'node:assert/strict'
import { parseExerciseCoachingContent } from '@/lib/exercise-coaching'

const parsed = parseExerciseCoachingContent(
  'Start in a stable grappling stance with your core braced and posture neutral. Execute the movement with controlled mechanics, then reset each rep before accelerating again. Use 4-5 sets of 4-6 reps with 90-150 seconds rest. Common mistakes: rushing reps, losing hip-knee-shoulder alignment, and shortening range under fatigue. Progression: increase load, speed, or complexity only when movement quality stays consistent.'
)

assert.equal(parsed.executionPoints.length, 3)
assert.equal(parsed.executionPoints[0], 'Start in a stable grappling stance with your core braced and posture neutral.')
assert.deepEqual(parsed.commonMistakes, [
  'Rushing reps',
  'Losing hip-knee-shoulder alignment',
  'Shortening range under fatigue',
])
assert.equal(
  parsed.progression,
  'Increase load, speed, or complexity only when movement quality stays consistent.'
)

const summaryOnly = parseExerciseCoachingContent('Own posture, stay balanced, and reset cleanly between reps.')
assert.equal(summaryOnly.commonMistakes.length, 0)
assert.equal(summaryOnly.progression, null)
assert.equal(summaryOnly.executionPoints.length, 1)

const empty = parseExerciseCoachingContent('')
assert.equal(empty.summary, null)
assert.deepEqual(empty.executionPoints, [])

console.log('Exercise coaching tests passed.')