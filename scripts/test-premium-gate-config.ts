import assert from 'node:assert/strict'
import {
  PREMIUM_CORE_HIGHLIGHTS,
  PREMIUM_FEATURES,
  PREMIUM_POSITIONING_COPY,
  canAccessFeature,
} from '@/lib/premium-gate'

assert.equal(PREMIUM_CORE_HIGHLIGHTS.length, 3)
assert.ok(PREMIUM_POSITIONING_COPY.toLowerCase().includes('coaching layer'))
assert.equal(PREMIUM_FEATURES.analytics.highlights.length, 3)
assert.ok(PREMIUM_FEATURES.analytics.highlights[0]?.toLowerCase().includes('year view'))
assert.ok(PREMIUM_FEATURES['learning-paths'].highlights[1]?.toLowerCase().includes('structured'))

const freeLearningPathAccess = canAccessFeature(null, 'learning-paths', 0)
assert.equal(freeLearningPathAccess.canAccess, true)

const lockedAnalyticsAccess = canAccessFeature(null, 'analytics')
assert.equal(lockedAnalyticsAccess.canAccess, false)
assert.ok(lockedAnalyticsAccess.upgradePrompt?.includes('Performance Analytics'))

console.log('Premium gate config tests passed.')