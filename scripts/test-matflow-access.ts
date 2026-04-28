import assert from 'node:assert/strict'
import { getMatFlowAccessState, MATFLOW_PRICE_LABEL, MATFLOW_TRIAL_DAYS } from '@/lib/matflow-access'

const now = new Date('2026-04-28T12:00:00.000Z')
const trialStart = '2026-04-20T12:00:00.000Z'

const trialing = getMatFlowAccessState({
  createdAt: trialStart,
  matflowTrialStartedAt: trialStart,
  isPremium: false,
  subscriptionStatus: null,
  subscriptionPeriodEnd: null,
}, now)

assert.equal(MATFLOW_TRIAL_DAYS, 14)
assert.equal(MATFLOW_PRICE_LABEL, '25 kr/month')
assert.equal(trialing.hasAccess, true)
assert.equal(trialing.hasPaidAccess, false)
assert.equal(trialing.trialExpired, false)
assert.equal(trialing.trialDaysRemaining, 6)

const expired = getMatFlowAccessState({
  createdAt: '2026-04-01T12:00:00.000Z',
  matflowTrialStartedAt: '2026-04-01T12:00:00.000Z',
  isPremium: false,
  subscriptionStatus: null,
  subscriptionPeriodEnd: null,
}, now)

assert.equal(expired.hasAccess, false)
assert.equal(expired.trialExpired, true)
assert.equal(expired.trialDaysRemaining, 0)

const paid = getMatFlowAccessState({
  createdAt: '2026-01-01T12:00:00.000Z',
  matflowTrialStartedAt: '2026-01-01T12:00:00.000Z',
  isPremium: false,
  subscriptionStatus: 'active',
  subscriptionPeriodEnd: null,
}, now)

assert.equal(paid.hasAccess, true)
assert.equal(paid.hasPaidAccess, true)
assert.equal(paid.trialExpired, false)

const paidByPeriodEnd = getMatFlowAccessState({
  createdAt: '2026-01-01T12:00:00.000Z',
  matflowTrialStartedAt: '2026-01-01T12:00:00.000Z',
  isPremium: false,
  subscriptionStatus: 'past_due',
  subscriptionPeriodEnd: '2026-05-01T12:00:00.000Z',
}, now)

assert.equal(paidByPeriodEnd.hasAccess, true)
assert.equal(paidByPeriodEnd.hasPaidAccess, true)

console.log('MatFlow access tests passed.')
