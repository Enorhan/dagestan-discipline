import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const configPath = resolve(process.cwd(), 'ios/App/App/capacitor.config.json')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const packageClassList = Array.isArray(config.packageClassList) ? config.packageClassList : []

if (!packageClassList.includes('MatFlowIAPPlugin')) {
  packageClassList.push('MatFlowIAPPlugin')
}

config.packageClassList = packageClassList
writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`)
