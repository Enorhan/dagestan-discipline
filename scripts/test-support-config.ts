import assert from 'node:assert/strict'
import {
  ACCOUNT_DELETION_MAILTO,
  BILLING_SUPPORT_MAILTO,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_SERVICE_URL,
  buildSupportMailtoLink,
} from '@/lib/app-support'

assert.equal(SUPPORT_EMAIL, 'support@matflow.app')
assert.equal(PRIVACY_POLICY_URL, '/legal/privacy-policy.html')
assert.equal(TERMS_OF_SERVICE_URL, '/legal/terms-of-service.html')
assert.match(BILLING_SUPPORT_MAILTO, /^mailto:support@matflow\.app\?subject=/)
assert.match(ACCOUNT_DELETION_MAILTO, /^mailto:support@matflow\.app\?subject=/)
assert.equal(
  buildSupportMailtoLink('help@example.com', 'Need billing help'),
  'mailto:help@example.com?subject=Need%20billing%20help'
)
assert.equal(
  buildSupportMailtoLink('help@example.com', 'Need billing help', 'Line 1\nLine 2'),
  'mailto:help@example.com?subject=Need%20billing%20help&body=Line%201%0ALine%202'
)

console.log('Support config tests passed.')
