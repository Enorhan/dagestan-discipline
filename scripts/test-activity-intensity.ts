import assert from 'node:assert/strict'
import { getActivityIntensityDetail, getActivityIntensityLabel } from '@/lib/activity-intensity'

assert.equal(getActivityIntensityLabel(2), 'Easy')
assert.equal(getActivityIntensityLabel(5), 'Moderate')
assert.equal(getActivityIntensityLabel(8), 'Hard')
assert.equal(getActivityIntensityLabel(10), 'Max Effort')

assert.ok(getActivityIntensityDetail(2).includes('Recovery pace'))
assert.ok(getActivityIntensityDetail(6).includes('rhythm'))
assert.ok(getActivityIntensityDetail(8).includes('meaningful effort'))
assert.ok(getActivityIntensityDetail(10).includes('extra recovery'))

console.log('Activity intensity tests passed.')