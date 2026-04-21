import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function usage(): never {
  console.error('Usage: npx tsx scripts/capture-simulator-screenshot.ts --udid <device-udid|booted> --flow <flow> --step <step>')
  process.exit(1)
}

function parseArgs(argv: string[]) {
  const values = new Map<string, string>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) usage()
    values.set(key, value)
    index += 1
  }

  const udid = values.get('udid') ?? 'booted'
  const flow = values.get('flow')
  const step = values.get('step')

  if (!flow || !step) usage()

  return { udid, flow, step }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `Command failed: ${command} ${args.join(' ')}`
    throw new Error(message)
  }
  return result.stdout
}

function resolveDeviceName(udid: string) {
  const output = run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])
  const parsed = JSON.parse(output) as { devices?: Record<string, Array<{ udid: string; name: string }>> }
  const devices = Object.values(parsed.devices ?? {}).flat()
  const match = devices.find((device) => device.udid === udid)

  if (!match) {
    throw new Error(`Unable to resolve simulator device name for ${udid}`)
  }

  return match.name
}

function resolveBootedUdid() {
  const output = run('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'])
  const parsed = JSON.parse(output) as { devices?: Record<string, Array<{ udid: string }>> }
  const device = Object.values(parsed.devices ?? {}).flat()[0]

  if (!device?.udid) {
    throw new Error('No booted simulator found')
  }

  return device.udid
}

function main() {
  const { udid: rawUdid, flow, step } = parseArgs(process.argv.slice(2))
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const outputDir = path.join(repoRoot, 'screenshots', 'runtime')
  mkdirSync(outputDir, { recursive: true })

  const udid = rawUdid === 'booted' ? resolveBootedUdid() : rawUdid
  const deviceName = resolveDeviceName(udid)
  const filename = `${slugify(deviceName)}-${slugify(flow)}-${slugify(step)}.png`
  const outputPath = path.join(outputDir, filename)

  run('xcrun', ['simctl', 'io', udid, 'screenshot', outputPath])
  console.log(outputPath)
}

main()
