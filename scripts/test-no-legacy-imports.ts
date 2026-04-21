import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..')

const forbiddenPaths = [
  'src/components/app',
  'src/components/screens',
  'src/lib/types.ts',
  'src/lib/social-types.ts',
  'src/lib/navigation-machine.ts',
  'src/lib/navigation-restore.ts',
  'src/lib/hydration-restore.ts',
  'src/lib/session-runtime.ts',
]

const forbiddenImportPatterns = [
  '@/components/app/',
  '@/components/screens/',
  '../src/components/app/',
  '../src/components/screens/',
  '@/lib/types',
  '../src/lib/types',
  '@/lib/social-types',
  '../src/lib/social-types',
  '@/lib/navigation-machine',
  '../src/lib/navigation-machine',
  '@/lib/navigation-restore',
  '../src/lib/navigation-restore',
  '@/lib/hydration-restore',
  '../src/lib/hydration-restore',
  '@/lib/session-runtime',
  '../src/lib/session-runtime',
]

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walk(absolutePath)
    }
    return [absolutePath]
  })
}

for (const relativePath of forbiddenPaths) {
  assert.equal(
    fs.existsSync(path.join(repoRoot, relativePath)),
    false,
    `Legacy path still exists: ${relativePath}`,
  )
}

const filesToScan = [
  ...walk(path.join(repoRoot, 'src')),
  ...walk(path.join(repoRoot, 'scripts')),
  ...walk(path.join(repoRoot, 'docs')),
].filter((filePath) => (
  /\.(cjs|cts|js|jsx|md|mjs|mts|sh|ts|tsx)$/.test(filePath)
  && path.relative(repoRoot, filePath) !== 'scripts/test-no-legacy-imports.ts'
))

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf8')
  for (const pattern of forbiddenImportPatterns) {
    assert.equal(
      content.includes(pattern),
      false,
      `Legacy import reference "${pattern}" still exists in ${path.relative(repoRoot, filePath)}`,
    )
  }
}

console.log('Legacy import guardrail passed.')
