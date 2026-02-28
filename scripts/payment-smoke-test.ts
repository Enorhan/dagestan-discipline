import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface HttpResult {
  status: number
  text: string
  json: JsonValue | null
}

const CHECKOUT_PATH = '/functions/v1/stripe-checkout'
const WEBHOOK_PATH = '/functions/v1/stripe-webhook'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value.trim()
}

function logStep(step: string): void {
  console.log(`\n[PAYMENT-SMOKE] ${step}`)
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function parseJson(text: string): JsonValue | null {
  try {
    return JSON.parse(text) as JsonValue
  } catch {
    return null
  }
}

function isRecord(value: JsonValue | null): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function postJson(url: string, init: RequestInit): Promise<HttpResult> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  })

  const text = await response.text()
  return {
    status: response.status,
    text,
    json: parseJson(text),
  }
}

function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex')

  return `t=${timestamp},v1=${digest}`
}

function getStringField(obj: Record<string, JsonValue>, key: string): string | null {
  const value = obj[key]
  return typeof value === 'string' ? value : null
}

async function createTempUserToken(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string
): Promise<{ userId: string; accessToken: string; cleanup: () => Promise<void> }> {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `codex.payment.smoke.${Date.now()}@example.com`
  const password = `Codex!${Date.now()}aA1`

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (created.error || !created.data.user?.id) {
    throw new Error(`Unable to create temp user: ${created.error?.message ?? 'unknown error'}`)
  }

  const userId = created.data.user.id

  const signedIn = await anon.auth.signInWithPassword({ email, password })
  if (signedIn.error || !signedIn.data.session?.access_token) {
    await admin.auth.admin.deleteUser(userId)
    throw new Error(`Unable to sign in temp user: ${signedIn.error?.message ?? 'unknown error'}`)
  }

  const accessToken = signedIn.data.session.access_token

  return {
    userId,
    accessToken,
    cleanup: async () => {
      const deleted = await admin.auth.admin.deleteUser(userId)
      if (deleted.error) {
        throw new Error(`Unable to delete temp user ${userId}: ${deleted.error.message}`)
      }
    },
  }
}

async function assertCheckoutAuthGuards(
  checkoutUrl: string,
  anonKey: string,
  successUrl: string,
  cancelUrl: string
): Promise<void> {
  const payload = JSON.stringify({
    mode: 'subscription',
    successUrl,
    cancelUrl,
  })

  logStep('Checkout rejects missing authorization header')
  const noAuth = await postJson(checkoutUrl, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: payload,
  })

  assertCondition(
    noAuth.status === 400 || noAuth.status === 401,
    `Expected checkout no-auth to return 400/401, got ${noAuth.status}: ${noAuth.text}`
  )

  logStep('Checkout rejects malformed bearer token')
  const badToken = await postJson(checkoutUrl, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: 'Bearer invalid-token',
      'content-type': 'application/json',
    },
    body: payload,
  })

  assertCondition(
    badToken.status === 400 || badToken.status === 401,
    `Expected checkout malformed-token to return 400/401, got ${badToken.status}: ${badToken.text}`
  )
}

async function assertCheckoutSuccess(
  checkoutUrl: string,
  anonKey: string,
  accessToken: string,
  successUrl: string,
  cancelUrl: string
): Promise<void> {
  logStep('Checkout creates Stripe session with valid user JWT')

  const response = await postJson(checkoutUrl, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'subscription',
      successUrl,
      cancelUrl,
    }),
  })

  assertCondition(response.status === 200, `Expected checkout success 200, got ${response.status}: ${response.text}`)
  assertCondition(isRecord(response.json), `Expected checkout JSON object, got: ${response.text}`)

  const sessionId = getStringField(response.json, 'sessionId')
  const url = getStringField(response.json, 'url')

  assertCondition(sessionId && sessionId.length > 0, `Missing sessionId in checkout response: ${response.text}`)
  assertCondition(url && url.startsWith('https://'), `Missing/invalid checkout url: ${response.text}`)
}

async function assertWebhookChecks(
  webhookUrl: string,
  webhookSecret: string
): Promise<void> {
  logStep('Webhook rejects unsigned payload')

  const noSignature = await postJson(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: `evt_smoke_nosig_${Date.now()}`,
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_smoke_nosig' } },
    }),
  })

  assertCondition(
    noSignature.status === 400,
    `Expected webhook no-signature to return 400, got ${noSignature.status}: ${noSignature.text}`
  )

  const eventId = `evt_smoke_${Date.now()}`
  const eventPayload = JSON.stringify({
    id: eventId,
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_smoke_event',
        customer: 'cus_smoke_event',
        status: 'active',
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: 'price_smoke_event' },
            },
          ],
        },
      },
    },
  })

  const now = Math.floor(Date.now() / 1000)
  const signature = signStripePayload(eventPayload, webhookSecret, now)

  logStep('Webhook accepts valid Stripe signature')
  const accepted = await postJson(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: eventPayload,
  })

  assertCondition(accepted.status === 200, `Expected signed webhook 200, got ${accepted.status}: ${accepted.text}`)
  assertCondition(isRecord(accepted.json), `Expected signed webhook JSON object, got: ${accepted.text}`)

  const received = accepted.json.received
  assertCondition(received === true, `Expected signed webhook received=true, got: ${accepted.text}`)

  const duplicateSignature = signStripePayload(eventPayload, webhookSecret, now + 1)

  logStep('Webhook duplicate event is idempotent')
  const duplicate = await postJson(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': duplicateSignature,
    },
    body: eventPayload,
  })

  assertCondition(duplicate.status === 200, `Expected duplicate webhook 200, got ${duplicate.status}: ${duplicate.text}`)
  assertCondition(isRecord(duplicate.json), `Expected duplicate webhook JSON object, got: ${duplicate.text}`)
  assertCondition(duplicate.json.duplicate === true, `Expected duplicate webhook duplicate=true, got: ${duplicate.text}`)
}

async function run(): Promise<void> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET')

  const successUrl = process.env.PAYMENT_SMOKE_SUCCESS_URL?.trim()
    || 'https://enorhan.github.io/dagestan-discipline/?checkout=success'
  const cancelUrl = process.env.PAYMENT_SMOKE_CANCEL_URL?.trim()
    || 'https://enorhan.github.io/dagestan-discipline/?checkout=cancel'

  const checkoutUrl = `${supabaseUrl}${CHECKOUT_PATH}`
  const webhookUrl = `${supabaseUrl}${WEBHOOK_PATH}`

  let cleanup: (() => Promise<void>) | null = null

  try {
    await assertCheckoutAuthGuards(checkoutUrl, anonKey, successUrl, cancelUrl)

    const tempUser = await createTempUserToken(supabaseUrl, anonKey, serviceRoleKey)
    cleanup = tempUser.cleanup

    await assertCheckoutSuccess(checkoutUrl, anonKey, tempUser.accessToken, successUrl, cancelUrl)
    await assertWebhookChecks(webhookUrl, webhookSecret)

    console.log('\n[PAYMENT-SMOKE] All checks passed')
  } finally {
    if (cleanup) {
      logStep('Cleaning up temporary user')
      await cleanup()
    }
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n[PAYMENT-SMOKE] FAILED: ${message}`)
  process.exit(1)
})
