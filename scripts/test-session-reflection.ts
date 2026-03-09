import assert from 'node:assert/strict'
import { buildReflectionPrompts, getEffortRatingLabel, mergeReflectionNote } from '@/lib/session-reflection'

assert.equal(getEffortRatingLabel(2), 'Weak')
assert.equal(getEffortRatingLabel(6), 'Good')
assert.equal(getEffortRatingLabel(10), 'Warrior')

const defaultPrompts = buildReflectionPrompts(null)
assert.ok(defaultPrompts.some((prompt) => prompt.label === 'Technique clicked'))

const carryForwardPrompts = buildReflectionPrompts({
  effortRating: 9,
  notes: 'Need to stay tighter in scrambles.',
})
assert.ok(carryForwardPrompts.some((prompt) => prompt.label === 'Carry forward'))
assert.ok(carryForwardPrompts.some((prompt) => prompt.label === 'Need recovery'))

assert.equal(
  mergeReflectionNote('Technique felt clean', 'Shoulder felt tight.'),
  'Technique felt clean. Shoulder felt tight.'
)
assert.equal(
  mergeReflectionNote('Shoulder felt tight.', 'Shoulder felt tight.'),
  'Shoulder felt tight.'
)

console.log('Session reflection tests passed.')