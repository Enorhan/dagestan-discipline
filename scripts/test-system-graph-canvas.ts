import assert from 'node:assert/strict'
import { fitGraphViewport, normalizeGraphEdgeKey, truncateGraphLabel } from '../src/components/system-graph-canvas'
import { computeGraphLayout } from '../src/lib/system-graph-layout'

const nodes = [
  { id: 'a', color: '#4c6fff', label: 'Start' },
  { id: 'b', color: '#22c55e', label: 'Middle' },
  { id: 'c', color: '#ef4444', label: 'Finish' },
]

const edges = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
]

const layout = computeGraphLayout(nodes, edges)
for (const node of nodes) {
  const point = layout[node.id]
  assert.ok(point, `layout includes ${node.id}`)
  assert.ok(point.x >= 0.06 && point.x <= 0.94, `x bound for ${node.id}`)
  assert.ok(point.y >= 0.06 && point.y <= 0.94, `y bound for ${node.id}`)
}

const fitted = fitGraphViewport(nodes, {
  a: { x: 0.1, y: 0.2 },
  b: { x: 0.5, y: 0.5 },
  c: { x: 0.9, y: 0.8 },
})
assert.ok(fitted.width >= 12 && fitted.width <= 100, 'fit width stays in bounds')
assert.ok(fitted.height >= 12 && fitted.height <= 100, 'fit height stays in bounds')
assert.ok(fitted.minX >= 0 && fitted.minX + fitted.width <= 100, 'fit x viewport stays in graph')
assert.ok(fitted.minY >= 0 && fitted.minY + fitted.height <= 100, 'fit y viewport stays in graph')
assert.equal(fitted.width, fitted.height, 'fit viewport preserves square canvas')

const tight = fitGraphViewport(nodes.slice(0, 1), { a: { x: 0.5, y: 0.5 } })
assert.equal(tight.width, 24, 'single-node fit uses padded minimum from default padding')
assert.equal(tight.height, 24, 'single-node fit keeps square padded minimum')

assert.equal(normalizeGraphEdgeKey('source', 'target'), 'source->target')
assert.notEqual(normalizeGraphEdgeKey('target', 'source'), normalizeGraphEdgeKey('source', 'target'))

assert.equal(truncateGraphLabel('  Guard pass  ', 20), 'Guard pass')
assert.equal(truncateGraphLabel('', 20), 'Step')
assert.equal(truncateGraphLabel('Very long graph node label', 10), 'Very long...')

console.log('system graph canvas tests passed')
