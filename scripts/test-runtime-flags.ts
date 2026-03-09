import assert from 'node:assert/strict'
import {
  DEFAULT_RUNTIME_FLAGS,
  getBillingCheckoutAvailability,
  getBillingPortalAvailability,
  resolveRuntimeFlags,
} from '@/lib/runtime-flags'

const checkoutDisabled = resolveRuntimeFlags({
  billingCheckoutEnabled: false,
  billingCheckoutDisabledMessage: 'Checkout paused for maintenance.',
})

assert.equal(getBillingCheckoutAvailability(checkoutDisabled).enabled, false)
assert.equal(getBillingCheckoutAvailability(checkoutDisabled).message, 'Checkout paused for maintenance.')

const upsellDisabled = resolveRuntimeFlags({
  billingCheckoutEnabled: true,
  premiumUpsellEnabled: false,
  billingCheckoutDisabledMessage: 'Premium upgrades paused.',
})

assert.equal(getBillingCheckoutAvailability(upsellDisabled).enabled, false)
assert.equal(getBillingCheckoutAvailability(upsellDisabled).message, 'Premium upgrades paused.')

const portalDisabled = resolveRuntimeFlags({
  billingPortalEnabled: false,
  billingPortalDisabledMessage: 'Portal temporarily unavailable.',
})

assert.equal(getBillingPortalAvailability(portalDisabled).enabled, false)
assert.equal(getBillingPortalAvailability(portalDisabled).message, 'Portal temporarily unavailable.')
assert.equal(typeof DEFAULT_RUNTIME_FLAGS.billingCheckoutEnabled, 'boolean')
assert.equal(typeof DEFAULT_RUNTIME_FLAGS.billingPortalEnabled, 'boolean')

console.log('Runtime flag tests passed.')