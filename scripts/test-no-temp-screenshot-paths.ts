import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const targets = [
  path.join(repoRoot, 'package.json'),
  path.join(repoRoot, 'docs'),
  path.join(repoRoot, 'scripts'),
]

const blockedPatterns: Array<{ label: string; expression: RegExp }> = [
  { label: 'macOS temp simulator screenshots', expression: /\/var\/folders\/.+simulator_screenshot_/ },
  { label: 'tmp simulator screenshots', expression: /\/tmp\/.+simulator_screenshot_/ },
  { label: 'temp simctl screenshot target', expression: /simctl\s+io.+screenshot.+(?:\/var\/folders|\/tmp|TMPDIR)/ },
]

const allowList = new Set([
  path.join(repoRoot, 'scripts', 'test-no-temp-screenshot-paths.ts'),
])

function listFiles(entry: string): string[] {
  const stats = statSync(entry)
  if (stats.isFile()) return [entry]

  return readdirSync(entry, { withFileTypes: true }).flatMap((dirent) => {
    const next = path.join(entry, dirent.name)
    if (dirent.isDirectory()) return listFiles(next)
    return [next]
  })
}

const failures: string[] = []

for (const target of targets) {
  for (const file of listFiles(target)) {
    if (allowList.has(file)) continue

    const content = readFileSync(file, 'utf8')
    for (const blockedPattern of blockedPatterns) {
      if (blockedPattern.expression.test(content)) {
        failures.push(`${path.relative(repoRoot, file)}: ${blockedPattern.label}`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Found forbidden temp screenshot references:\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('No temp screenshot references found.')
