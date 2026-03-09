import assert from 'node:assert/strict'
import { getRoundTimerAriaLabel, getRoundTimerLiveAnnouncement, getRoundTimerPhaseLabel } from '@/lib/round-timer-accessibility'

assert.equal(getRoundTimerPhaseLabel(true), 'Work')
assert.equal(getRoundTimerPhaseLabel(false), 'Rest')

assert.equal(getRoundTimerLiveAnnouncement({ isPaused: false, isWorking: true, currentRound: 2, totalRounds: 5 }), 'Work phase, round 2 of 5.')
assert.equal(getRoundTimerLiveAnnouncement({ isPaused: true, isWorking: false, currentRound: 3, totalRounds: 8 }), 'Timer paused during rest phase, round 3 of 8.')

assert.equal(getRoundTimerAriaLabel({ isPaused: false, isWorking: true, currentRound: 1, totalRounds: 5, timeRemaining: 125 }), '2:05 remaining in work phase, round 1 of 5.')
assert.equal(getRoundTimerAriaLabel({ isPaused: true, isWorking: false, currentRound: 4, totalRounds: 8, timeRemaining: 9 }), '0:09 remaining. Timer paused during rest phase, round 4 of 8.')

console.log('Round timer accessibility tests passed.')