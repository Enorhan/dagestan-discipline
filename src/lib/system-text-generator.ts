import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import { newDraftNodeId } from '@/lib/user-system-draft'

const NODE_COLORS = ['#4c6fff', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444'] as const

type DraftNode = SaveUserSystemInput['nodes'][number]
type DraftEdge = SaveUserSystemInput['edges'][number]

function cleanLabel(value: string): string {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:du kan|kan du|you can|can you|then|sen|sedan|så|just det|kör|köra|go|do|attack|attacks?|move|moves?|en|ett|a|an|the)\b/gi, ' ')
    .replace(/[.;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function labelKey(value: string): string {
  return cleanLabel(value).toLowerCase().replace(/[^a-z0-9åäö]+/gi, '')
}

function displayLabel(value: string): string {
  const clean = cleanLabel(value)
  if (!clean) return ''
  return clean
    .split(/\s+/)
    .map((word) => {
      if (/[A-ZÅÄÖ]{2,}/.test(word)) return word
      if (word.includes("'")) {
        return word.split("'").map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part).join("'")
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
    })
    .join(' ')
}

function splitAlternatives(value: string): string[] {
  return value
    .split(/\b(?:eller|or|alternatively|alternativt)\b|[,/]/i)
    .map(displayLabel)
    .filter((label) => label.length > 0)
}

function splitSentences(text: string): string[] {
  return text
    .replace(/(?:->|→)/g, ' to ')
    .split(/[\n.]+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseSentence(sentence: string): Array<{ from: string; to: string[] }> {
  const normalized = sentence.replace(/(?:->|→)/g, ' to ')
  const pathParts = normalized
    .split(/\b(?:från|from|till|to|into)\b/i)
    .map(displayLabel)
    .filter(Boolean)

  if (pathParts.length >= 2 && /\b(?:från|from|till|to|into)\b/i.test(normalized)) {
    const steps: Array<{ from: string; to: string[] }> = []
    for (let index = 0; index < pathParts.length - 1; index += 1) {
      const from = pathParts[index]
      const to = splitAlternatives(pathParts[index + 1] ?? '')
      if (from && to.length > 0) steps.push({ from, to })
    }
    return steps
  }

  const branchMatch = normalized.match(/\b(?:från|from)\s+(.+?)\s+(?:kan du|you can|can|kör|köra|go|do|attack|attacks?)\s+(.+)/i)
  if (branchMatch) {
    const from = displayLabel(branchMatch[1] ?? '')
    const to = splitAlternatives(branchMatch[2] ?? '')
    return from && to.length > 0 ? [{ from, to }] : []
  }

  return []
}

function deriveSummary(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 260)
}

function deriveTitle(nodes: DraftNode[]): string {
  const labels = nodes.map((node) => node.label).filter(Boolean)
  if (labels.length === 0) return 'Training system'
  if (labels.length === 1) return `${labels[0]} system`
  return `${labels[0]} to ${labels[Math.min(labels.length - 1, 2)]}`
}

function fallbackSystem(text: string): Array<{ from: string; to: string[] }> {
  const labels = splitAlternatives(text).slice(0, 8)
  const pairs: Array<{ from: string; to: string[] }> = []
  for (let index = 0; index < labels.length - 1; index += 1) {
    pairs.push({ from: labels[index]!, to: [labels[index + 1]!] })
  }
  return pairs
}

export function systemToPrompt(system: BjjSystem | null): string {
  if (!system) return ''
  const edges = system.edges
    .map((edge) => {
      const from = system.nodes.find((node) => node.id === edge.from)?.label
      const to = system.nodes.find((node) => node.id === edge.to)?.label
      if (!from || !to) return null
      return edge.label ? `From ${from} to ${to}: ${edge.label}` : `From ${from} to ${to}`
    })
    .filter(Boolean)
  return [
    system.title,
    system.summary,
    ...edges,
  ].filter(Boolean).join('\n')
}

export function generateSystemFromText(params: {
  branch: MartialArtsBranchId
  text: string
  initial?: BjjSystem | null
}): SaveUserSystemInput {
  const text = params.text.trim()
  const parsed = splitSentences(text).flatMap(parseSentence)
  const pairs = parsed.length > 0 ? parsed : fallbackSystem(text)
  const nodes: DraftNode[] = []
  const nodeByKey = new Map<string, DraftNode>()
  const edges: DraftEdge[] = []
  const edgeKeys = new Set<string>()

  const ensureNode = (label: string): DraftNode => {
    const key = labelKey(label)
    const existing = nodeByKey.get(key)
    if (existing) return existing
    const node: DraftNode = {
      id: params.initial?.nodes.find((entry) => labelKey(entry.label) === key)?.id ?? newDraftNodeId(),
      label,
      color: NODE_COLORS[nodes.length % NODE_COLORS.length],
      layout: null,
      linkedTechniqueIds: [],
    }
    nodes.push(node)
    nodeByKey.set(key, node)
    return node
  }

  for (const pair of pairs) {
    const from = ensureNode(pair.from)
    for (const target of pair.to) {
      const to = ensureNode(target)
      if (from.id === to.id) continue
      const edgeKey = `${from.id}->${to.id}`
      if (edgeKeys.has(edgeKey)) continue
      edgeKeys.add(edgeKey)
      edges.push({ from: from.id, to: to.id, label: null })
    }
  }

  if (nodes.length === 0 && text) ensureNode(displayLabel(text.slice(0, 80)))

  return {
    id: params.initial?.id,
    branch: params.branch,
    title: deriveTitle(nodes),
    summary: deriveSummary(text),
    visibility: 'public',
    status: 'active',
    expectedUpdatedAt: params.initial?.updatedAt ?? undefined,
    nodes,
    edges,
  }
}
