import assert from 'node:assert/strict'
import {
  computeWizardGraphLayout,
  createGraphWizardState,
  graphWizardCanSave,
  graphWizardReducer,
  graphWizardToSaveInput,
} from '../src/lib/system-graph-wizard'

let state = createGraphWizardState('bjj')
assert.equal(graphWizardCanSave(state), false, 'blank wizard should not autosave')

const firstId = state.activeNodeId
state = graphWizardReducer(state, { type: 'rename-step', id: firstId, label: 'Triangle choke' })
assert.equal(graphWizardCanSave(state), true, 'first step label enables save')
assert.equal(state.title, 'Triangle choke system', 'first step generates draft title')

state = graphWizardReducer(state, { type: 'add-outcome', fromId: firstId, nodeId: 'node-armbar', label: 'Armbar' })
state = graphWizardReducer(state, { type: 'add-outcome', fromId: firstId, nodeId: 'node-omoplata', label: 'Omoplata' })
assert.equal(state.edges.length, 2, 'one step can branch into two outcomes')
assert.equal(state.edges.every((edge) => edge.from === firstId), true, 'both outcomes start from step one')

state = graphWizardReducer(state, { type: 'set-transition-label', fromId: firstId, toId: 'node-armbar', label: 'arm across' })
assert.equal(state.edges.find((edge) => edge.to === 'node-armbar')?.label, 'arm across', 'transition label is stored')

state = graphWizardReducer(state, { type: 'connect-existing', fromId: 'node-armbar', toId: 'node-omoplata' })
assert.equal(state.edges.some((edge) => edge.from === 'node-armbar' && edge.to === 'node-omoplata'), true, 'can connect to existing step')

state = graphWizardReducer(state, { type: 'remove-outcome', fromId: firstId, toId: 'node-omoplata' })
assert.equal(state.edges.some((edge) => edge.from === firstId && edge.to === 'node-omoplata'), false, 'remove outcome deletes directed link')

const positions = computeWizardGraphLayout(state.nodes, state.edges)
for (const node of state.nodes) {
  const pos = positions[node.id]
  assert.ok(pos, `position exists for ${node.id}`)
  assert.ok(pos.x >= 0.06 && pos.x <= 0.94, `x bounded for ${node.id}`)
  assert.ok(pos.y >= 0.06 && pos.y <= 0.94, `y bounded for ${node.id}`)
}
assert.ok(positions[firstId]!.y < positions['node-armbar']!.y, 'first step is above its outcome')

const draftPayload = graphWizardToSaveInput(state, 'draft')
assert.equal(draftPayload.status, 'draft')
assert.equal(draftPayload.visibility, 'private', 'draft payload forces private visibility')
assert.equal(draftPayload.nodes.length, state.nodes.length)
assert.equal(draftPayload.edges.length, state.edges.length)

state = graphWizardReducer(state, { type: 'set-visibility', visibility: 'public' })
const activePayload = graphWizardToSaveInput(state, 'active')
assert.equal(activePayload.status, 'active')
assert.equal(activePayload.visibility, 'public', 'active payload preserves selected visibility')

console.log('system graph wizard tests passed')
