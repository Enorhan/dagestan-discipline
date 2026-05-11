// JWS chain verification for App Store Server Notifications v2.
//
// Apple signs each notification with a JWS (ES256) whose `x5c` header contains
// a 3-cert chain ending at "Apple Root CA - G3".  We verify:
//   1) signature algorithm is ES256
//   2) the leaf cert chains up to a trusted Apple root (DER equality)
//   3) every cert in the chain is currently within its notBefore/notAfter window
//   4) the JWS signature itself verifies under the leaf cert's public key
// Decoded payloads (notification, transaction, renewal info) are returned as
// plain JSON.  Apple's app-store-server-library is incompatible with Deno's
// crypto polyfill (missing X509Certificate.publicKey/verify), so we rely on
// @peculiar/x509 + Web Crypto directly.

import * as x509 from 'https://esm.sh/@peculiar/x509@1.12.3?bundle&target=deno'

x509.cryptoProvider.set(crypto)

// Apple Root CA - G3 (https://www.apple.com/certificateauthority/AppleRootCA-G3.cer)
// SHA-256 fingerprint:
//   63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`

function loadTrustedRoots(): x509.X509Certificate[] {
  const overrides = (Deno.env.get('APPLE_ROOT_CA_PEM') ?? '').trim()
  const pems: string[] = []
  if (overrides) pems.push(overrides)
  pems.push(APPLE_ROOT_CA_G3_PEM)
  return pems.map((pem) => new x509.X509Certificate(pem))
}

let cachedRoots: x509.X509Certificate[] | null = null
function trustedRoots(): x509.X509Certificate[] {
  if (!cachedRoots) cachedRoots = loadTrustedRoots()
  return cachedRoots
}

function base64UrlDecode(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - value.length % 4) % 4), '=')
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
}

function base64Decode(value: string): ArrayBuffer {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
}

function bytesEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false
  const av = new Uint8Array(a)
  const bv = new Uint8Array(b)
  for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false
  return true
}

interface JwsHeader {
  alg: string
  x5c?: string[]
}

async function verifyJws<T>(token: string, now: Date = new Date()): Promise<T> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWS')
  const [headerB64, payloadB64, signatureB64] = parts

  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(headerB64)))) as JwsHeader
  if (header.alg !== 'ES256') throw new Error(`Unsupported JWS alg: ${header.alg}`)
  if (!Array.isArray(header.x5c) || header.x5c.length < 2) {
    throw new Error('JWS x5c chain missing or too short')
  }

  const certChain = header.x5c.map((b64) => new x509.X509Certificate(base64Decode(b64)))
  const leaf = certChain[0]
  for (const cert of certChain) {
    if (cert.notBefore > now) throw new Error(`Certificate not yet valid: ${cert.subject}`)
    if (cert.notAfter < now) throw new Error(`Certificate expired: ${cert.subject}`)
  }

  for (let i = 0; i < certChain.length - 1; i++) {
    const child = certChain[i]
    const parent = certChain[i + 1]
    const ok = await child.verify({ publicKey: parent.publicKey, signatureOnly: true })
    if (!ok) throw new Error('JWS x5c chain signature failed')
  }

  const tail = certChain[certChain.length - 1]
  const trusted = trustedRoots().some((root) => bytesEqual(root.rawData, tail.rawData))
  if (!trusted) throw new Error('JWS x5c chain does not terminate at a trusted Apple root')

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(signatureB64)
  const leafKey = await leaf.publicKey.export(
    { name: 'ECDSA', namedCurve: 'P-256' },
    ['verify'],
  )
  const sigOk = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    leafKey,
    signature,
    signingInput,
  )
  if (!sigOk) throw new Error('JWS signature verification failed')

  return JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(payloadB64)))) as T
}

export interface DecodedNotificationPayload {
  notificationType?: string
  subtype?: string | null
  notificationUUID?: string
  data?: {
    appAppleId?: number
    bundleId?: string
    bundleVersion?: string
    environment?: string
    signedTransactionInfo?: string
    signedRenewalInfo?: string
  }
  version?: string
  signedDate?: number
}

export interface DecodedTransactionPayload {
  transactionId?: string
  originalTransactionId?: string
  webOrderLineItemId?: string
  bundleId?: string
  productId?: string
  subscriptionGroupIdentifier?: string
  purchaseDate?: number
  originalPurchaseDate?: number
  expiresDate?: number
  revocationDate?: number
  type?: string
  appAccountToken?: string
  inAppOwnershipType?: string
  signedDate?: number
  environment?: string
  transactionReason?: string
  storefront?: string
  storefrontId?: string
  price?: number
  currency?: string
}

export async function verifyNotification(signedPayload: string): Promise<DecodedNotificationPayload> {
  return verifyJws<DecodedNotificationPayload>(signedPayload)
}

export async function verifyTransaction(signedTransactionInfo: string): Promise<DecodedTransactionPayload> {
  return verifyJws<DecodedTransactionPayload>(signedTransactionInfo)
}
