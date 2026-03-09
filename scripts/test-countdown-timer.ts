import assert from 'node:assert/strict'
import { getCountdownRemainingSeconds, getNextCountdownTickDelay } from '@/lib/countdown-timer'

assert.equal(getCountdownRemainingSeconds(null, 1_000), 0)
assert.equal(getCountdownRemainingSeconds(5_250, 1_000), 5)
assert.equal(getCountdownRemainingSeconds(5_000, 1_000), 4)
assert.equal(getCountdownRemainingSeconds(900, 1_000), 0)

assert.equal(getNextCountdownTickDelay(5_250, 1_000), 250)
assert.equal(getNextCountdownTickDelay(5_000, 1_000), 1000)
assert.equal(getNextCountdownTickDelay(1_010, 1_000), 16)
assert.equal(getNextCountdownTickDelay(900, 1_000), 0)

console.log('Countdown timer tests passed.')