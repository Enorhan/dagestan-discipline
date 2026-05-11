import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import { supabase } from '@/lib/supabase'
import { generateSystemFromText } from '@/lib/system-text-generator'
import { newDraftNodeId } from '@/lib/user-system-draft'

const NODE_COLORS = ['#4c6fff', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444'] as const

type AiNode = {
  id?: unknown
  label?: unknown
  details?: unknown
  trigger?: unknown
  commonMistake?: unknown
  videoUrl?: unknown
  videoTimestampSeconds?: unknown
}

type AiEdge = {
  from?: unknown
  to?: unknown
  label?: unknown
}

type AiSystem = {
  title?: unknown
  summary?: unknown
  nodes?: unknown
  edges?: unknown
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function nodeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9åäö]+/gi, '')
}

function normalizeAiSystem(
  raw: unknown,
  params: { branch: MartialArtsBranchId; text: string; initial?: BjjSystem | null },
  fallback: SaveUserSystemInput,
): SaveUserSystemInput {
  const source = (raw && typeof raw === 'object' && 'system' in raw ? (raw as { system?: unknown }).system : raw) as AiSystem | null
  if (!source || typeof source !== 'object') return fallback
  const rawNodes = Array.isArray(source.nodes) ? source.nodes as AiNode[] : []
  const initialByKey = new Map((params.initial?.nodes ?? []).map((node) => [nodeKey(node.label), node.id]))
  const fallbackByKey = new Map(fallback.nodes.map((node) => [nodeKey(node.label), node.id]))
  const nodes: SaveUserSystemInput['nodes'] = []
  const nodeByRef = new Map<string, SaveUserSystemInput['nodes'][number]>()

  for (const rawNode of rawNodes.slice(0, 24)) {
    const label = cleanText(rawNode.label, 80)
    if (!label) continue
    const key = nodeKey(label)
    if (nodeByRef.has(key)) continue
    const explicitId = typeof rawNode.id === 'string' && rawNode.id.trim() ? rawNode.id.trim() : null
    const node = {
      id: initialByKey.get(key) ?? fallbackByKey.get(key) ?? newDraftNodeId(),
      label,
      color: NODE_COLORS[nodes.length % NODE_COLORS.length],
      layout: null,
      linkedTechniqueIds: [],
      details: cleanText(rawNode.details, 2000),
      trigger: cleanText(rawNode.trigger, 300),
      commonMistake: cleanText(rawNode.commonMistake, 500),
      videoUrl: cleanText(rawNode.videoUrl, 512),
      videoTimestampSeconds: typeof rawNode.videoTimestampSeconds === 'number' && Number.isFinite(rawNode.videoTimestampSeconds)
        ? Math.max(0, Math.floor(rawNode.videoTimestampSeconds))
        : null,
    }
    nodes.push(node)
    nodeByRef.set(key, node)
    if (explicitId) nodeByRef.set(explicitId, node)
  }

  if (nodes.length === 0) return fallback

  const edges: SaveUserSystemInput['edges'] = []
  const edgeKeys = new Set<string>()
  const rawEdges = Array.isArray(source.edges) ? source.edges as AiEdge[] : []
  for (const rawEdge of rawEdges.slice(0, 48)) {
    const fromRef = cleanText(rawEdge.from, 120)
    const toRef = cleanText(rawEdge.to, 120)
    if (!fromRef || !toRef) continue
    const from = nodeByRef.get(fromRef) ?? nodeByRef.get(nodeKey(fromRef))
    const to = nodeByRef.get(toRef) ?? nodeByRef.get(nodeKey(toRef))
    if (!from || !to || from.id === to.id) continue
    const edgeKey = `${from.id}->${to.id}`
    if (edgeKeys.has(edgeKey)) continue
    edgeKeys.add(edgeKey)
    edges.push({ from: from.id, to: to.id, label: cleanText(rawEdge.label, 200) })
  }

  return {
    ...fallback,
    title: cleanText(source.title, 90) ?? fallback.title,
    summary: cleanText(source.summary, 260) ?? fallback.summary,
    branch: params.branch,
    visibility: 'public',
    status: 'active',
    nodes,
    edges,
  }
}

export class SystemAiQuotaExceededError extends Error {
  constructor(message = 'Daily AI generation limit reached. Try again tomorrow.') {
    super(message)
    this.name = 'SystemAiQuotaExceededError'
  }
}

async function readContextStatus(error: unknown): Promise<number | null> {
  const ctx = (error as { context?: { status?: number } } | null | undefined)?.context
  if (ctx && typeof ctx.status === 'number') return ctx.status
  const res = (error as { context?: Response } | null | undefined)?.context
  if (res && typeof (res as Response).status === 'number') return (res as Response).status
  return null
}

export async function generateSystemFromTextWithAi(params: {
  branch: MartialArtsBranchId
  text: string
  initial?: BjjSystem | null
}): Promise<SaveUserSystemInput> {
  const fallback = generateSystemFromText(params)
  const text = params.text.trim()
  if (!text || text.length < 3) return fallback

  try {
    const { data, error } = await supabase.functions.invoke('system-text-generator', {
      body: {
        branch: params.branch,
        text,
        initial: params.initial
          ? {
              id: params.initial.id,
              title: params.initial.title,
              summary: params.initial.summary,
              nodes: params.initial.nodes.map((node) => ({ id: node.id, label: node.label })),
              edges: params.initial.edges,
            }
          : null,
      },
    })
    if (error) {
      const status = await readContextStatus(error)
      if (status === 429) throw new SystemAiQuotaExceededError()
      return fallback
    }
    return normalizeAiSystem(data, params, fallback)
  } catch (err) {
    if (err instanceof SystemAiQuotaExceededError) throw err
    return fallback
  }
}
