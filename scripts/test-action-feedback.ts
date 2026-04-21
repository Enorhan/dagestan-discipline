import assert from 'node:assert/strict'
import {
  getActivitySaveFeedback,
  getActivitySyncFallbackFeedback,
  getProgramDraftSaveFeedback,
  getProgramSessionSaveFeedback,
  getSettingsSaveFeedback,
  getTodayExerciseSaveFeedback,
  getWorkoutSaveFeedback,
} from '@/lib/action-feedback'

const settingsSuccess = getSettingsSaveFeedback({
  shouldRegenerate: true,
  profileSyncFailed: false,
  programSyncFailed: false,
})

assert.equal(settingsSuccess.variant, 'success')
assert.equal(settingsSuccess.message, 'Preferences saved and your program was refreshed.')

const settingsWarning = getSettingsSaveFeedback({
  shouldRegenerate: false,
  profileSyncFailed: true,
  programSyncFailed: false,
})

assert.equal(settingsWarning.variant, 'warning')
assert.equal(settingsWarning.message, 'Preferences updated on this device, but cloud sync had issues.')

assert.equal(getActivitySaveFeedback(false).message, 'Activity logged.')
assert.equal(getActivitySyncFallbackFeedback(true).variant, 'warning')
assert.equal(getWorkoutSaveFeedback(true).message, 'Template updated.')
assert.equal(getProgramDraftSaveFeedback(false).variant, 'error')
assert.equal(getProgramSessionSaveFeedback().message, 'Session changes saved to your draft.')
assert.equal(getTodayExerciseSaveFeedback('Armbar chain').message, 'Armbar chain updated for today.')

console.log('Action feedback tests passed.')