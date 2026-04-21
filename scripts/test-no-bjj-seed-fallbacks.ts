import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

async function main() {
  const serviceFile = read('src/lib/bjj-service.ts')
  const appFile = read('src/components/bjj-app.tsx')

  assert.equal(/\bSEED_[A-Z_]+\b/.test(serviceFile), false, 'bjj-service.ts should not use seed fallbacks in live runtime')
  assert.equal(/\bDISCOVER_TECHNIQUES\b/.test(serviceFile), false, 'bjj-service.ts should not fall back to discover seeds')
  assert.equal(/buildFallbackSnapshot/.test(serviceFile), false, 'bjj-service.ts should not ship fallback snapshots')
  assert.equal(/import\s*\{[^}]*SEED_[A-Z_]+/.test(appFile), false, 'bjj-app.tsx should not import runtime seed datasets')
  assert.equal(/import\s*\{[^}]*DISCOVER_TECHNIQUES/.test(appFile), false, 'bjj-app.tsx should not import discover seed datasets')

  console.log('No live BJJ seed fallback regressions detected.')
}

void main()
