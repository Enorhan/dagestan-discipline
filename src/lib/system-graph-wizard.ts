import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjPrivacy, BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import { newDraftNodeId } from '@/lib/user-system-draft'

export type WizardGraphNode = SaveUserSystemInput['nodes'][number]
export type WizardGraphEdge = SaveUserSystemInput['edges'][number]

export type GraphWizardState = {
  id: string | null
  branch: MartialArtsBranchId
  title: string
  titleEdited: boolean
  summary: string
  visibility: BjjPrivacy
  activeNodeId: string
  nodes: WizardGraphNode[]
  edges: WizardGraphEdge[]
}

export type GraphWizardAction =
  | { type: 'set-draft-id'; id: string }
  | { type: 'set-title'; title: string }
  | { type: 'set-summary'; summary: string }
  | { type: 'set-visibility'; visibility: BjjPrivacy }
  | { type: 'select-step'; id: string }
  | { type: 'rename-step'; id: string; label: string }
  | { type: 'add-outcome'; fromId: string; nodeId: string; label?: string }
  | { type: 'connect-existing'; fromId: string; toId: string }
  | { type: 'remove-outcome'; fromId: string; toId: string }
  | { type: 'set-transition-label'; fromId: string; toId: string; label: string }

const NODE_COLORS = ['#4c6fff', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444'] as const

function makeNode(index: number, label = ''): WizardGraphNode {
  return {
    id: newDraftNodeId(),
    label,
    color: NODE_COLORS[index % NODE_COLORS.length],
    layout: null,
    linkedTechniqueIds: [],
  }
}

function normalizeTitleFromFirstStep(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''
  return trimmed.length > 42 ? trimmed : `${trimmed} system`
}

export function createGraphWizardState(branch: MartialArtsBranchId, initial?: BjjSystem | null): GraphWizardState {
  if (initial) {
    const nodes = initial.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      color: node.color,
      layout: node.layout ? { x: node.layout.x, y: node.layout.y } : null,
      linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
      details: node.details ?? null,
      trigger: node.trigger ?? null,
      commonMistake: node.commonMistake ?? null,
      videoUrl: node.videoUrl ?? null,
      videoTimestampSeconds: node.videoTimestampSeconds ?? null,
    }))
    const first = nodes[0] ?? makeNode(0)
    return {
      id: initial.id,
      branch: initial.branch ?? branch,
      title: initial.title,
      titleEdited: true,
      summary: initial.summary,
      visibility: initial.visibility ?? 'private',
      activeNodeId: first.id,
      nodes: nodes.length > 0 ? nodes : [first],
      edges: initial.edges.map((edge) => ({ from: edge.from, to: edge.to, label: edge.label ?? null })),
    }
  }

  const first = makeNode(0)
  return {
    id: null,
    branch,
    title: '',
    titleEdited: false,
    summary: '',
    visibility: 'private',
    activeNodeId: first.id,
    nodes: [first],
    edges: [],
  }
}

export function graphWizardReducer(state: GraphWizardState, action: GraphWizardAction): GraphWizardState {
  switch (action.type) {
    case 'set-draft-id':
      return { ...state, id: action.id }
    case 'set-title':
      return { ...state, title: action.title, titleEdited: true }
    case 'set-summary':
      return { ...state, summary: action.summary }
    case 'set-visibility':
      return { ...state, visibility: action.visibility }
    case 'select-step':
      return state.nodes.some((node) => node.id === action.id) ? { ...state, activeNodeId: action.id } : state
    case 'rename-step': {
      const nodes = state.nodes.map((node) => (node.id === action.id ? { ...node, label: action.label } : node))
      const firstId = nodes[0]?.id
      return {
        ...state,
        nodes,
        title: !state.titleEdited && action.id === firstId ? normalizeTitleFromFirstStep(action.label) : state.title,
      }
    }
    case 'add-outcome': {
      if (!state.nodes.some((node) => node.id === action.fromId)) return state
      const node: WizardGraphNode = {
        ...makeNode(state.nodes.length, action.label ?? ''),
        id: action.nodeId,
      }
      return {
        ...state,
        nodes: [...state.nodes, node],
        edges: dedupeEdges([...state.edges, { from: action.fromId, to: node.id }]),
      }
    }
    case 'connect-existing':
      if (action.fromId === action.toId) return state
      if (!state.nodes.some((node) => node.id === action.fromId) || !state.nodes.some((node) => node.id === action.toId)) return state
      return { ...state, edges: dedupeEdges([...state.edges, { from: action.fromId, to: action.toId }]) }
    case 'remove-outcome':
      return {
        ...state,
        edges: state.edges.filter((edge) => !(edge.from === action.fromId && edge.to === action.toId)),
      }
    case 'set-transition-label':
      return {
        ...state,
        edges: state.edges.map((edge) =>
          edge.from === action.fromId && edge.to === action.toId
            ? { ...edge, label: action.label.trim() ? action.label : null }
            : edge,
        ),
      }
    default:
      return state
  }
}

function dedupeEdges(edges: WizardGraphEdge[]): WizardGraphEdge[] {
  const seen = new Set<string>()
  const out: WizardGraphEdge[] = []
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(edge)
  }
  return out
}

export function computeWizardGraphLayout(nodes: WizardGraphNode[], edges: WizardGraphEdge[]): Record<string, { x: number; y: number }> {
  if (nodes.length === 0) return {}
  const ids = new Set(nodes.map((node) => node.id))
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const node of nodes) {
    incoming.set(node.id, 0)
    outgoing.set(node.id, [])
  }
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue
    outgoing.get(edge.from)?.push(edge.to)
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
  }

  const layers = new Map<string, number>()
  const queue = [nodes[0]!.id]
  layers.set(nodes[0]!.id, 0)
  while (queue.length > 0) {
    const id = queue.shift()!
    const nextLayer = (layers.get(id) ?? 0) + 1
    for (const next of outgoing.get(id) ?? []) {
      if ((layers.get(next) ?? Number.POSITIVE_INFINITY) <= nextLayer) continue
      layers.set(next, nextLayer)
      queue.push(next)
    }
  }

  let disconnectedLayer = Math.max(0, ...layers.values()) + 1
  for (const node of nodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, disconnectedLayer)
      disconnectedLayer += 1
    }
  }

  const byLayer = new Map<number, string[]>()
  for (const node of nodes) {
    const layer = layers.get(node.id) ?? 0
    const row = byLayer.get(layer) ?? []
    row.push(node.id)
    byLayer.set(layer, row)
  }

  const maxLayer = Math.max(1, ...byLayer.keys())
  const positions: Record<string, { x: number; y: number }> = {}
  for (const [layer, row] of byLayer.entries()) {
    row.forEach((id, index) => {
      const x = row.length === 1 ? 0.5 : 0.12 + (index / Math.max(1, row.length - 1)) * 0.76
      const y = 0.1 + (layer / maxLayer) * 0.78
      positions[id] = { x: clamp(x, 0.06, 0.94), y: clamp(y, 0.06, 0.94) }
    })
  }
  return positions
}

export function graphWizardToSaveInput(state: GraphWizardState, status: 'draft' | 'active'): SaveUserSystemInput {
  const nodes = state.nodes.map((node) => ({
    ...node,
    label: node.label.trim() || 'Step',
    layout: computeWizardGraphLayout(state.nodes, state.edges)[node.id] ?? node.layout ?? null,
    linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
  }))
  return {
    id: state.id ?? undefined,
    branch: state.branch,
    title: state.title.trim() || normalizeTitleFromFirstStep(nodes[0]?.label ?? '') || 'Training graph',
    summary: state.summary.trim(),
    visibility: status === 'draft' ? 'private' : state.visibility,
    status,
    nodes,
    edges: state.edges.map((edge) => ({ ...edge, label: edge.label?.trim() ? edge.label.trim() : null })),
  }
}

export function graphWizardCanSave(state: GraphWizardState): boolean {
  return Boolean(state.nodes[0]?.label.trim())
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
