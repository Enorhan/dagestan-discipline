import assert from 'node:assert/strict'

import {
  normalizeSubscriptionReturnStatus,
  shouldPollSubscriptionStatusAfterReturn,
} from '../src/lib/subscription-return'

assert.equal(normalizeSubscriptionReturnStatus('success'), 'success')
assert.equal(normalizeSubscriptionReturnStatus('canceled'), 'canceled')
assert.equal(normalizeSubscriptionReturnStatus('portal'), 'portal')
assert.equal(normalizeSubscriptionReturnStatus('unknown'), null)
assert.equal(normalizeSubscriptionReturnStatus(null), null)

assert.equal(shouldPollSubscriptionStatusAfterReturn('success'), true)
assert.equal(shouldPollSubscriptionStatusAfterReturn('canceled'), false)
assert.equal(shouldPollSubscriptionStatusAfterReturn('portal'), false)

console.log('subscription-return tests passed')