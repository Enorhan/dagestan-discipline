/**
 * Normalized graph coordinates in 0–1 space (padding applied by renderer).
 */

export type GraphPoint = { x: number; y: number }

export type GraphNodeInput = { id: string; layout?: GraphPoint | null }
export type GraphEdgeInput = { from: string; to: string }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function hasValidLayout(layout: GraphPoint | null | undefined): layout is GraphPoint {
  if (!layout) return false
  return (
    Number.isFinite(layout.x) &&
    Number.isFinite(layout.y) &&
    layout.x >= 0 &&
    layout.x <= 1 &&
    layout.y >= 0 &&
    layout.y <= 1
  )
}

/** Longest-path layering from sources (DAG-friendly); falls back to circle. */
export function computeGraphLayout(nodes: GraphNodeInput[], edges: GraphEdgeInput[]): Record<string, GraphPoint> {
  const ids = nodes.map((node) => node.id)
  if (ids.length === 0) return {}

  const stored: Record<string, GraphPoint> = {}
  let allStored = true
  for (const node of nodes) {
    if (hasValidLayout(node.layout)) {
      stored[node.id] = {
        x: clamp(node.layout!.x, 0.06, 0.94),
        y: clamp(node.layout!.y, 0.06, 0.94),
      }
    } else {
      allStored = false
    }
  }
  if (allStored && ids.length > 0) return stored

  const idSet = new Set(ids)
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  for (const id of ids) {
    incoming.set(id, [])
    outgoing.set(id, [])
  }
  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue
    incoming.get(edge.to)!.push(edge.from)
    outgoing.get(edge.from)!.push(edge.to)
  }

  const layer = new Map<string, number>()
  const indegree = new Map<string, number>()
  for (const id of ids) {
    indegree.set(id, incoming.get(id)!.filter((from) => idSet.has(from)).length)
  }

  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0)
  if (queue.length === 0) queue.push(ids[0])

  const topo: string[] = []
  const indegCopy = new Map(indegree)
  const outCopy = new Map<string, string[]>(ids.map((id) => [id, [...(outgoing.get(id) ?? [])]]))

  while (queue.length > 0) {
    const id = queue.shift()!
    if (!idSet.has(id)) continue
    topo.push(id)
    for (const next of outCopy.get(id) ?? []) {
      indegCopy.set(next, (indegCopy.get(next) ?? 0) - 1)
      if ((indegCopy.get(next) ?? 0) === 0) queue.push(next)
    }
  }

  if (topo.length < ids.length) {
    return circularLayout(ids)
  }

  for (const id of topo) {
    const preds = incoming.get(id)!.filter((from) => idSet.has(from))
    const base = preds.length === 0 ? 0 : Math.max(...preds.map((from) => (layer.get(from) ?? 0) + 1))
    layer.set(id, base)
  }

  const maxLayer = Math.max(0, ...[...layer.values()])
  const byLayer = new Map<number, string[]>()
  for (const id of ids) {
    const L = layer.get(id) ?? 0
    if (!byLayer.has(L)) byLayer.set(L, [])
    byLayer.get(L)!.push(id)
  }

  const out: Record<string, GraphPoint> = {}
  const maxL = Math.max(maxLayer, 1)
  for (let L = 0; L <= maxLayer; L += 1) {
    const row = byLayer.get(L) ?? []
    const n = row.length
    row.forEach((id, index) => {
      const x = n === 1 ? 0.5 : 0.1 + (index / Math.max(n - 1, 1)) * 0.8
      const y = 0.1 + (L / maxL) * 0.8
      out[id] = { x: clamp(x, 0.06, 0.94), y: clamp(y, 0.06, 0.94) }
    })
  }
  return out
}

function circularLayout(ids: string[]): Record<string, GraphPoint> {
  const out: Record<string, GraphPoint> = {}
  const count = ids.length
  ids.forEach((id, index) => {
    const angle = (2 * Math.PI * index) / Math.max(count, 1) - Math.PI / 2
    out[id] = {
      x: clamp(0.5 + 0.36 * Math.cos(angle), 0.06, 0.94),
      y: clamp(0.5 + 0.36 * Math.sin(angle), 0.06, 0.94),
    }
  })
  return out
}
