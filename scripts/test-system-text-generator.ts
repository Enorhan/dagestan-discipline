import assert from 'node:assert/strict'
import { generateSystemFromText } from '../src/lib/system-text-generator'

const system = generateSystemFromText({
  branch: 'bjj',
  text: "From foot lock to armbar to D'ARS. From D'ARS you can go short darce or full darce.",
})

assert.equal(system.visibility, 'public')
assert.equal(system.status, 'active')
assert.ok(system.nodes.some((node) => node.label === 'Foot Lock'))
assert.ok(system.nodes.some((node) => node.label === 'Armbar'))
assert.ok(system.nodes.some((node) => node.label.includes("D'")))
assert.ok(system.nodes.some((node) => node.label === 'Short Darce'))
assert.ok(system.nodes.some((node) => node.label === 'Full Darce'))
assert.ok(system.edges.length >= 4)

console.log('system text generator tests passed')
