import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'

export function newDraftNodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `node-${crypto.randomUUID()}`
  }
  return `node-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

/** Deep copy with fresh node ids and remapped edges (for Duplicate). */
export function duplicateUserSystemDraft(system: BjjSystem): SaveUserSystemInput {
  const idMap = new Map<string, string>()
  const nodes = system.nodes.map((node) => {
    const id = newDraftNodeId()
    idMap.set(node.id, id)
    return {
      id,
      label: node.label,
      color: node.color,
      layout: node.layout ? { ...node.layout } : null,
      linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
      details: node.details ?? null,
      trigger: node.trigger ?? null,
      commonMistake: node.commonMistake ?? null,
      videoUrl: node.videoUrl ?? null,
      videoTimestampSeconds: node.videoTimestampSeconds ?? null,
    }
  })
  const edges: SaveUserSystemInput['edges'] = []
  for (const edge of system.edges) {
    const from = idMap.get(edge.from)
    const to = idMap.get(edge.to)
    if (!from || !to) continue
    const row: SaveUserSystemInput['edges'][number] = { from, to }
    const label = edge.label?.trim()
    if (label) row.label = label
    edges.push(row)
  }

  return {
    branch: system.branch,
    title: `Copy of ${system.title}`,
    summary: system.summary,
    visibility: 'private',
    status: 'active',
    nodes,
    edges,
  }
}

export type UserSystemTemplate = {
  id: string
  title: string
  summary: string
  nodes: SaveUserSystemInput['nodes']
  edges: SaveUserSystemInput['edges']
}

export const USER_SYSTEM_TEMPLATES: UserSystemTemplate[] = [
  {
    id: 'tmpl-guard-retention',
    title: 'Guard retention chain',
    summary: 'Frames for staying underneath: grip, off-balance, re-guard.',
    nodes: [
      { id: 'tpl-gr-a', label: 'Establish grips', color: '#4c6fff', layout: { x: 0.18, y: 0.35 } },
      { id: 'tpl-gr-b', label: 'Off-balance', color: '#22c55e', layout: { x: 0.5, y: 0.28 } },
      { id: 'tpl-gr-c', label: 'Re-guard / recover', color: '#eab308', layout: { x: 0.78, y: 0.42 } },
    ],
    edges: [
      { from: 'tpl-gr-a', to: 'tpl-gr-b' },
      { from: 'tpl-gr-b', to: 'tpl-gr-c' },
    ],
  },
  {
    id: 'tmpl-leg-entry',
    title: 'Leg entanglement entry',
    summary: 'Inside position → ashi → finish options.',
    nodes: [
      { id: 'tpl-le-a', label: 'Inside position', color: '#a855f7', layout: { x: 0.22, y: 0.3 } },
      { id: 'tpl-le-b', label: 'Cross ashi', color: '#4c6fff', layout: { x: 0.52, y: 0.5 } },
      { id: 'tpl-le-c', label: 'Heel hook / sweep', color: '#ef4444', layout: { x: 0.78, y: 0.32 } },
    ],
    edges: [
      { from: 'tpl-le-a', to: 'tpl-le-b' },
      { from: 'tpl-le-b', to: 'tpl-le-c' },
    ],
  },
]

export function instantiateUserSystemTemplate(template: UserSystemTemplate, branch: MartialArtsBranchId = 'bjj'): SaveUserSystemInput {
  const idMap = new Map(template.nodes.map((node) => [node.id, newDraftNodeId()]))
  const nodes = template.nodes.map((node) => ({
    id: idMap.get(node.id)!,
    label: node.label,
    color: node.color,
    layout: node.layout ? { x: node.layout.x, y: node.layout.y } : null,
    linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
  }))
  const edges: SaveUserSystemInput['edges'] = []
  for (const edge of template.edges) {
    const from = idMap.get(edge.from)
    const to = idMap.get(edge.to)
    if (!from || !to) continue
    const row: SaveUserSystemInput['edges'][number] = { from, to }
    const label = edge.label?.trim()
    if (label) row.label = label
    edges.push(row)
  }

  return {
    branch,
    title: template.title,
    summary: template.summary,
    visibility: 'private',
    status: 'active',
    nodes,
    edges,
  }
}
