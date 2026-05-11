#!/usr/bin/env node
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const APPLE_AUDIENCE = 'appstoreconnect-v1'
const SANDBOX_BASE_URL = 'https://api.storekit-sandbox.apple.com'
const PRODUCTION_BASE_URL = 'https://api.storekit.apple.com'

function usage() {
  return [
    'Usage:',
    '  npm run appstore:test-notification',
    '  npm run appstore:test-notification -- --production',
    '  npm run appstore:test-notification -- --status <testNotificationToken>',
    '',
    'Required env:',
    '  APPSTORE_SERVER_API_ISSUER_ID',
    '  APPSTORE_SERVER_API_KEY_ID',
    '  APPSTORE_SERVER_API_PRIVATE_KEY or APPSTORE_SERVER_API_PRIVATE_KEY_PATH',
    '  APPSTORE_BUNDLE_ID',
  ].join('\n')
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

function hasArg(name) {
  return process.argv.includes(name)
}

function readEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

function requiredEnv(names) {
  const value = readEnv(names)
  if (!value) {
    throw new Error(`Missing env: ${names.join(' or ')}`)
  }
  return value
}

function loadPrivateKey() {
  const inline = readEnv([
    'APPSTORE_SERVER_API_PRIVATE_KEY',
    'APP_STORE_CONNECT_PRIVATE_KEY',
    'ASC_PRIVATE_KEY',
  ])
  if (inline) return inline.replace(/\\n/g, '\n')

  const path = requiredEnv([
    'APPSTORE_SERVER_API_PRIVATE_KEY_PATH',
    'APP_STORE_CONNECT_PRIVATE_KEY_PATH',
    'ASC_PRIVATE_KEY_PATH',
  ])
  return readFileSync(path, 'utf8')
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function createJwt() {
  const issuerId = requiredEnv([
    'APPSTORE_SERVER_API_ISSUER_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'ASC_ISSUER_ID',
  ])
  const keyId = requiredEnv([
    'APPSTORE_SERVER_API_KEY_ID',
    'APP_STORE_CONNECT_KEY_ID',
    'ASC_KEY_ID',
  ])
  const bundleId = requiredEnv(['APPSTORE_BUNDLE_ID'])
  const privateKey = loadPrivateKey()
  const now = Math.floor(Date.now() / 1000)

  const header = {
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  }
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 10 * 60,
    aud: APPLE_AUDIENCE,
    bid: bundleId,
  }

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`
  const signer = createSign('SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return `${signingInput}.${signature}`
}

async function appleRequest(method, path) {
  const useProduction = hasArg('--production') || readEnv(['APPSTORE_SERVER_API_ENV']) === 'production'
  const baseUrl = useProduction ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${createJwt()}`,
      'Content-Type': 'application/json',
    },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(`Apple API ${response.status}: ${JSON.stringify(body)}`)
  }
  return { environment: useProduction ? 'production' : 'sandbox', body }
}

async function main() {
  if (hasArg('--help') || hasArg('-h')) {
    console.log(usage())
    return
  }

  const statusToken = argValue('--status')
  const result = statusToken
    ? await appleRequest('GET', `/inApps/v1/notifications/test/${encodeURIComponent(statusToken)}`)
    : await appleRequest('POST', '/inApps/v1/notifications/test')

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  console.error('')
  console.error(usage())
  process.exit(1)
})
