import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const files = [
  'capacitor.config.ts',
  'src/app/layout.tsx',
  'src/app/auth/callback/page.tsx',
  'src/app/reset-password/page.tsx',
  'src/components/bjj-app.tsx',
  'src/lib/app-support.ts',
  'src/lib/support-diagnostics.ts',
  'src/lib/subscription-config.ts',
  'public/manifest.json',
  'public/redirect.html',
  'public/legal/privacy-policy.html',
  'public/legal/terms-of-service.html',
  'ios/App/App/Info.plist',
  'ios/App/App/Info-Debug.plist',
]

const forbidden = [
  'Dagestani Disciple',
  'Dagestan Discipline',
  'dagestanidisciple',
  '25 SEK/month',
  '69,00 kr',
  '399,00 kr',
]

for (const file of files) {
  const source = readFileSync(join(root, file), 'utf8')
  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `${file} still contains ${token}`)
  }
}

const manifest = readFileSync(join(root, 'public/manifest.json'), 'utf8')
assert.ok(manifest.includes('"name": "MatFlow"'))
assert.ok(manifest.includes('"short_name": "MatFlow"'))

const app = readFileSync(join(root, 'src/components/bjj-app.tsx'), 'utf8')
const paywall = readFileSync(join(root, 'src/components/bjj-app/paywall-screen.tsx'), 'utf8')
const access = readFileSync(join(root, 'src/lib/matflow-access.ts'), 'utf8')
assert.ok(app.includes('Sessions'))
assert.ok(app.includes('Techniques'))
assert.ok(app.includes('Systems'))
assert.ok(paywall.includes('14 days free'))
assert.ok(access.includes("MATFLOW_PRICE_LABEL = '25 kr/month'"))

console.log('MatFlow brand tests passed.')
