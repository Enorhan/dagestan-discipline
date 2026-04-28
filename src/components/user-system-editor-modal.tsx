'use client'

import {
  ArrowLeft,
  ClipboardCopy,
  GitBranch,
  LayoutTemplate,
  Link2,
  Network,
  Plus,
  Route,
  Redo2,
  Sparkles,
  Target,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeGraphEdgeKey, SystemGraphCanvas } from '@/components/system-graph-canvas'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { haptics } from '@/lib/haptics'
import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjPrivacy, BjjSystem, BjjTechnique } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import { useModalFocusTrap } from '@/lib/hooks/use-modal-focus-trap'
import {
  getSystemGraphTourSessionStep,
  isSystemGraphTourComplete,
  markSystemGraphTourSeen,
  setSystemGraphTourSessionStep,
  SYSTEM_GRAPH_EDITOR_TOUR_STEPS,
} from '@/lib/system-graph-editor-tour'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import { instantiateUserSystemTemplate, newDraftNodeId, USER_SYSTEM_TEMPLATES } from '@/lib/user-system-draft'
import { cn } from '@/lib/utils'

const NODE_COLORS = ['#4c6fff', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444'] as const

const MAX_EDGE_LABEL_LEN = 200
const MAX_NODE_DETAILS_LEN = 2000
const MAX_NODE_TRIGGER_LEN = 300
const MAX_NODE_MISTAKE_LEN = 500
const MAX_NODE_VIDEO_URL_LEN = 512
const MAX_GRAPH_UNDO = 35

function userSystemDraftStorageKey(userId: string) {
  return `bjj:user-system-draft:v1:${userId}`
}

function trimEdgeLabel(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  return trimmed.length > MAX_EDGE_LABEL_LEN ? trimmed.slice(0, MAX_EDGE_LABEL_LEN) : trimmed
}

type DraftEdge = { from: string; to: string; label?: string }

type DraftNode = {
  id: string
  label: string
  color: string
  layout: { x: number; y: number } | null
  linkedTechniqueIds: string[]
  details: string | null
  trigger: string | null
  commonMistake: string | null
  videoUrl: string | null
  videoTimestampSeconds: number | null
}

function trimToMax(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function normalizeTimestamp(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.min(Math.floor(value), 100000)
}

type EditorTab = 'basics' | 'graph' | 'publish'

type EditorSnapshot = {
  title: string
  summary: string
  visibility: BjjPrivacy
  nodes: DraftNode[]
  edges: DraftEdge[]
}

function cloneEditorState(
  title: string,
  summary: string,
  visibility: BjjPrivacy,
  nodes: DraftNode[],
  edges: DraftEdge[],
): EditorSnapshot {
  return {
    title,
    summary,
    visibility,
    nodes: nodes.map((n) => ({
      ...n,
      linkedTechniqueIds: [...n.linkedTechniqueIds],
      layout: n.layout ? { ...n.layout } : null,
      details: n.details,
      trigger: n.trigger,
      commonMistake: n.commonMistake,
      videoUrl: n.videoUrl,
      videoTimestampSeconds: n.videoTimestampSeconds,
    })),
    edges: edges.map((e) => ({ ...e })),
  }
}

function formatRelativeDraftTime(timestamp: number): string {
  const s = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function formatAccountSavedAt(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return 'Unknown'
  const d = new Date(ms)
  const diff = Date.now() - ms
  if (diff < 1000 * 60 * 60 * 24) {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function defaultDraftNodes(): DraftNode[] {
  return [
    {
      id: newDraftNodeId(),
      label: 'Start',
      color: NODE_COLORS[0],
      layout: { x: 0.22, y: 0.42 },
      linkedTechniqueIds: [],
      details: null,
      trigger: null,
      commonMistake: null,
      videoUrl: null,
      videoTimestampSeconds: null,
    },
  ]
}

function systemToDraft(system: BjjSystem): {
  title: string
  summary: string
  visibility: BjjPrivacy
  nodes: DraftNode[]
  edges: DraftEdge[]
} {
  return {
    title: system.title,
    summary: system.summary,
    visibility: system.visibility ?? 'private',
    nodes: system.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      color: node.color,
      layout: node.layout ? { x: node.layout.x, y: node.layout.y } : null,
      linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
      details: trimToMax(node.details, MAX_NODE_DETAILS_LEN),
      trigger: trimToMax(node.trigger, MAX_NODE_TRIGGER_LEN),
      commonMistake: trimToMax(node.commonMistake, MAX_NODE_MISTAKE_LEN),
      videoUrl: trimToMax(node.videoUrl, MAX_NODE_VIDEO_URL_LEN),
      videoTimestampSeconds: normalizeTimestamp(node.videoTimestampSeconds),
    })),
    edges: system.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      label: trimEdgeLabel(edge.label),
    })),
  }
}

function seedToDraft(seed: SaveUserSystemInput): {
  title: string
  summary: string
  visibility: BjjPrivacy
  nodes: DraftNode[]
  edges: DraftEdge[]
} {
  return {
    title: seed.title,
    summary: seed.summary,
    visibility: seed.visibility,
    nodes: seed.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      color: node.color,
      layout: node.layout ? { x: node.layout.x, y: node.layout.y } : null,
      linkedTechniqueIds: [...(node.linkedTechniqueIds ?? [])],
      details: trimToMax(node.details, MAX_NODE_DETAILS_LEN),
      trigger: trimToMax(node.trigger, MAX_NODE_TRIGGER_LEN),
      commonMistake: trimToMax(node.commonMistake, MAX_NODE_MISTAKE_LEN),
      videoUrl: trimToMax(node.videoUrl, MAX_NODE_VIDEO_URL_LEN),
      videoTimestampSeconds: normalizeTimestamp(node.videoTimestampSeconds),
    })),
    edges: seed.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      label: trimEdgeLabel(edge.label),
    })),
  }
}

export function UserSystemEditorModal({
  initial,
  seedDraft,
  branch,
  libraryTechniques,
  onClose,
  onSave,
  onDelete,
  fetchServerUpdatedAt,
  fetchFullSystem,
  onReplaceInitial,
}: {
  initial: BjjSystem | null
  /** Prefill from duplicate or template (no id = create) */
  seedDraft?: SaveUserSystemInput | null
  branch: MartialArtsBranchId
  libraryTechniques: BjjTechnique[]
  onClose: () => void
  onSave: (payload: SaveUserSystemInput) => Promise<void>
  onDelete?: (systemId: string) => Promise<void>
  /** When editing, fetch latest `updated_at` from the server to detect concurrent edits. */
  fetchServerUpdatedAt?: () => Promise<string | null>
  /** Load fresh system row + graph for “reload server copy” in the conflict dialog. */
  fetchFullSystem?: () => Promise<BjjSystem | null>
  /** Replace editor `initial` after reload (parent should bump nonce / session). */
  onReplaceInitial?: (system: BjjSystem) => void
}) {
  const isEdit = initial != null
  const baseDraft = useMemo(() => {
    if (initial) return systemToDraft(initial)
    if (seedDraft) return seedToDraft(seedDraft)
    return {
      title: '',
      summary: '',
      visibility: 'private' as BjjPrivacy,
      nodes: defaultDraftNodes(),
      edges: [] as DraftEdge[],
    }
  }, [initial, seedDraft])

  const { user } = useAuth()
  const { showInfo, showError } = useToast()
  const modalShellRef = useRef<HTMLDivElement | null>(null)
  useModalFocusTrap(true, modalShellRef)

  const [tab, setTab] = useState<EditorTab>('graph')
  const [title, setTitle] = useState(baseDraft.title)
  const [summary, setSummary] = useState(baseDraft.summary)
  const [visibility, setVisibility] = useState<BjjPrivacy>(baseDraft.visibility)
  const [nodes, setNodes] = useState<DraftNode[]>(baseDraft.nodes)
  const [edges, setEdges] = useState<DraftEdge[]>(baseDraft.edges)
  const [hasStoredDraft, setHasStoredDraft] = useState(false)
  const [persistenceReady, setPersistenceReady] = useState(Boolean(initial) || Boolean(seedDraft))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null)
  const [linkPickActive, setLinkPickActive] = useState(false)
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [concurrentSave, setConcurrentSave] = useState<{ serverUpdatedAt: string } | null>(null)
  const [reloadBusy, setReloadBusy] = useState(false)

  const [linkFrom, setLinkFrom] = useState('')
  const [linkTo, setLinkTo] = useState('')
  const [linkEdgeLabel, setLinkEdgeLabel] = useState('')

  const reduceMotion = useReducedMotion()
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const titleRef = useRef(title)
  const summaryRef = useRef(summary)
  const visibilityRef = useRef(visibility)
  const pastRef = useRef<EditorSnapshot[]>([])
  const futureRef = useRef<EditorSnapshot[]>([])
  const [historyTick, setHistoryTick] = useState(0)
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null)
  const [graphTourOpen, setGraphTourOpen] = useState(false)
  const [graphTourStep, setGraphTourStep] = useState(0)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
    titleRef.current = title
    summaryRef.current = summary
    visibilityRef.current = visibility
  }, [nodes, edges, title, summary, visibility])

  const pushEditorHistory = useCallback(() => {
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_GRAPH_UNDO - 1)),
      cloneEditorState(
        titleRef.current,
        summaryRef.current,
        visibilityRef.current,
        nodesRef.current,
        edgesRef.current,
      ),
    ]
    futureRef.current = []
    setHistoryTick((t) => t + 1)
  }, [])

  const undoGraph = useCallback(() => {
    const past = pastRef.current
    if (past.length === 0) return
    const prevSnap = past[past.length - 1]!
    pastRef.current = past.slice(0, -1)
    futureRef.current = [
      ...futureRef.current,
      cloneEditorState(
        titleRef.current,
        summaryRef.current,
        visibilityRef.current,
        nodesRef.current,
        edgesRef.current,
      ),
    ]
    setTitle(prevSnap.title)
    setSummary(prevSnap.summary)
    setVisibility(prevSnap.visibility)
    setNodes(prevSnap.nodes)
    setEdges(prevSnap.edges)
    setHistoryTick((t) => t + 1)
    void haptics.light()
  }, [])

  const redoGraph = useCallback(() => {
    const future = futureRef.current
    if (future.length === 0) return
    const nextSnap = future[future.length - 1]!
    futureRef.current = future.slice(0, -1)
    pastRef.current = [
      ...pastRef.current,
      cloneEditorState(
        titleRef.current,
        summaryRef.current,
        visibilityRef.current,
        nodesRef.current,
        edgesRef.current,
      ),
    ]
    setTitle(nextSnap.title)
    setSummary(nextSnap.summary)
    setVisibility(nextSnap.visibility)
    setNodes(nextSnap.nodes)
    setEdges(nextSnap.edges)
    setHistoryTick((t) => t + 1)
    void haptics.light()
  }, [])

  useEffect(() => {
    if (tab !== 'graph' || typeof window === 'undefined') return
    if (isSystemGraphTourComplete()) {
      setGraphTourOpen(false)
      return
    }
    setGraphTourOpen(true)
    setGraphTourStep(getSystemGraphTourSessionStep())
  }, [tab])

  useEffect(() => {
    if (initial || typeof window === 'undefined' || !user?.id) {
      setHasStoredDraft(false)
      setPersistenceReady(true)
      return
    }
    if (seedDraft) {
      setHasStoredDraft(false)
      setPersistenceReady(true)
      return
    }
    const key = userSystemDraftStorageKey(user.id)
    const raw = localStorage.getItem(key)
    if (!raw) {
      setHasStoredDraft(false)
      setPersistenceReady(true)
      return
    }
    try {
      const parsed = JSON.parse(raw) as {
        v?: number
        title?: string
        summary?: string
        visibility?: BjjPrivacy
        nodes?: DraftNode[]
        edges?: DraftEdge[]
      }
      if (parsed.v !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        setHasStoredDraft(true)
        setPersistenceReady(true)
        return
      }
      setTitle(parsed.title ?? '')
      setSummary(parsed.summary ?? '')
      if (parsed.visibility === 'private' || parsed.visibility === 'public') setVisibility(parsed.visibility)
      setNodes(parsed.nodes)
      setEdges(parsed.edges)
      setHasStoredDraft(true)
      showInfo('Restored your unsaved draft from this device.')
    } catch {
      setHasStoredDraft(true)
    } finally {
      setPersistenceReady(true)
    }
  }, [initial, seedDraft, user?.id, showInfo])

  useEffect(() => {
    if (initial || !persistenceReady || typeof window === 'undefined' || !user?.id) return
    const timeout = window.setTimeout(() => {
      try {
        const payload = {
          v: 1 as const,
          title,
          summary,
          visibility,
          nodes,
          edges,
        }
        localStorage.setItem(userSystemDraftStorageKey(user.id), JSON.stringify(payload))
        setHasStoredDraft(true)
        setLastDraftSavedAt(Date.now())
      } catch {
        // Quota / private mode
      }
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [title, summary, visibility, nodes, edges, initial, user?.id, persistenceReady])

  const discardLocalDraft = useCallback(() => {
    if (!user?.id) return
    if (typeof window !== 'undefined') localStorage.removeItem(userSystemDraftStorageKey(user.id))
    setHasStoredDraft(false)
    setTitle('')
    setSummary('')
    setVisibility('private')
    setNodes(defaultDraftNodes())
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeKey(null)
    setLinkPickActive(false)
    setLinkSourceId(null)
    setLinkFrom('')
    setLinkTo('')
    setLinkEdgeLabel('')
    showInfo('Draft discarded')
  }, [user?.id, showInfo])

  const nodeOptions = useMemo(() => nodes.map((node) => ({ id: node.id, label: node.label || 'Untitled step' })), [nodes])

  const canUndo = historyTick >= 0 && pastRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  const copyDraftJson = useCallback(async () => {
    const payload = { v: 1 as const, title, summary, visibility, nodes, edges }
    const text = JSON.stringify(payload, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      showInfo('Draft JSON copied')
      void haptics.light()
    } catch {
      showInfo('Could not copy. Try again.')
    }
  }, [title, summary, visibility, nodes, edges, showInfo])

  const performSave = useCallback(
    async (forceOverwrite: boolean) => {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) return

      if (isEdit && initial?.id && fetchServerUpdatedAt && initial.updatedAt && !forceOverwrite) {
        try {
          const latest = await fetchServerUpdatedAt()
          if (latest && latest !== initial.updatedAt) {
            setConcurrentSave({ serverUpdatedAt: latest })
            return
          }
        } catch {
          // Offline or transient — continue with save
        }
      }

      await onSave({
        id: initial?.userId ? initial.id : undefined,
        branch: initial?.branch ?? seedDraft?.branch ?? branch,
        title: trimmedTitle,
        summary: summary.trim(),
        visibility,
        sortOrder: initial?.sortOrder,
        expectedUpdatedAt: forceOverwrite ? null : (initial?.updatedAt ?? null),
        nodes: nodes.map((node) => ({
          id: node.id,
          label: node.label,
          color: node.color,
          layout: node.layout,
          linkedTechniqueIds: node.linkedTechniqueIds,
          details: trimToMax(node.details, MAX_NODE_DETAILS_LEN),
          trigger: trimToMax(node.trigger, MAX_NODE_TRIGGER_LEN),
          commonMistake: trimToMax(node.commonMistake, MAX_NODE_MISTAKE_LEN),
          videoUrl: trimToMax(node.videoUrl, MAX_NODE_VIDEO_URL_LEN),
          videoTimestampSeconds: normalizeTimestamp(node.videoTimestampSeconds),
        })),
        edges: edges.map((edge) => ({ from: edge.from, to: edge.to, label: edge.label ?? null })),
      })
      if (!initial && user?.id && typeof window !== 'undefined') {
        localStorage.removeItem(userSystemDraftStorageKey(user.id))
        setHasStoredDraft(false)
        setLastDraftSavedAt(null)
      }
    },
    [branch, edges, fetchServerUpdatedAt, initial, isEdit, nodes, onSave, seedDraft?.branch, summary, title, user?.id, visibility],
  )

  const handleReloadServerCopy = useCallback(async () => {
    if (!fetchFullSystem || !onReplaceInitial) {
      showError('Reload is not available.')
      return
    }
    setReloadBusy(true)
    try {
      const fresh = await fetchFullSystem()
      if (!fresh) {
        showError('Could not load the latest version. Check your connection and try again.')
        return
      }
      onReplaceInitial(fresh)
      setConcurrentSave(null)
      showInfo('Loaded the latest saved version from your account.')
    } catch {
      showError('Could not reload. Try again in a moment.')
    } finally {
      setReloadBusy(false)
    }
  }, [fetchFullSystem, onReplaceInitial, showError, showInfo])

  const positions = useMemo(() => {
    const base = computeGraphLayout(nodes, edges)
    const out = { ...base }
    for (const node of nodes) {
      if (node.layout) out[node.id] = { x: node.layout.x, y: node.layout.y }
    }
    return out
  }, [nodes, edges])

  const addNode = useCallback(() => {
    pushEditorHistory()
    setNodes((previous) => {
      const offset = (previous.length % 5) * 0.04
      return [
        ...previous,
        {
          id: newDraftNodeId(),
          label: `Step ${previous.length + 1}`,
          color: NODE_COLORS[previous.length % NODE_COLORS.length],
          layout: { x: clamp01(0.5 + offset * 0.5), y: clamp01(0.48 + offset) },
          linkedTechniqueIds: [],
          details: null,
          trigger: null,
          commonMistake: null,
          videoUrl: null,
          videoTimestampSeconds: null,
        },
      ]
    })
    void haptics.light()
  }, [pushEditorHistory])

  const removeNode = useCallback(
    (id: string) => {
      if (nodesRef.current.length <= 1) return
      pushEditorHistory()
      setNodes((previous) => {
        if (previous.length <= 1) return previous
        return previous.filter((node) => node.id !== id)
      })
      setEdges((previous) => previous.filter((edge) => edge.from !== id && edge.to !== id))
      setSelectedNodeId((current) => (current === id ? null : current))
      setSelectedEdgeKey((current) => {
        if (!current) return current
        return current.startsWith(`${id}->`) || current.endsWith(`->${id}`) ? null : current
      })
      setLinkSourceId((current) => (current === id ? null : current))
      void haptics.light()
    },
    [pushEditorHistory],
  )

  const addEdge = useCallback(() => {
    if (!linkFrom || !linkTo || linkFrom === linkTo) return
    const cur = edgesRef.current
    if (cur.some((edge) => edge.from === linkFrom && edge.to === linkTo)) return
    pushEditorHistory()
    const label = trimEdgeLabel(linkEdgeLabel)
    setEdges([...cur, { from: linkFrom, to: linkTo, label }])
    setSelectedNodeId(null)
    setSelectedEdgeKey(normalizeGraphEdgeKey(linkFrom, linkTo))
    setLinkEdgeLabel('')
    void haptics.light()
  }, [linkFrom, linkTo, linkEdgeLabel, pushEditorHistory])

  const addGraphLink = useCallback(
    (from: string, to: string) => {
      if (from === to) return
      const cur = edgesRef.current
      if (cur.some((edge) => edge.from === from && edge.to === to)) return
      pushEditorHistory()
      setEdges([...cur, { from, to }])
      setSelectedEdgeKey(normalizeGraphEdgeKey(from, to))
      void haptics.light()
      setLinkPickActive(false)
      setLinkSourceId(null)
    },
    [pushEditorHistory],
  )

  const removeEdge = useCallback(
    (from: string, to: string) => {
      pushEditorHistory()
      setEdges((previous) => previous.filter((entry) => !(entry.from === from && entry.to === to)))
      setSelectedEdgeKey((current) => (current === normalizeGraphEdgeKey(from, to) ? null : current))
      void haptics.light()
    },
    [pushEditorHistory],
  )

  const updateEdgeLabel = useCallback((from: string, to: string, raw: string) => {
    const label = trimEdgeLabel(raw)
    setEdges((previous) =>
      previous.map((edge) => (edge.from === from && edge.to === to ? { ...edge, label } : edge)),
    )
  }, [])

  const handleNodePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setNodes((previous) => previous.map((node) => (node.id === id ? { ...node, layout: { x: pos.x, y: pos.y } } : node)))
  }, [])

  const autoLayoutGraph = useCallback(() => {
    pushEditorHistory()
    const layout = computeGraphLayout(nodesRef.current, edgesRef.current)
    setNodes((previous) => previous.map((node) => ({ ...node, layout: layout[node.id] ? { ...layout[node.id]! } : node.layout })))
    void haptics.light()
  }, [pushEditorHistory])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await performSave(false)
    } finally {
      setSaving(false)
    }
  }

  const handleOverwriteConcurrent = async () => {
    setConcurrentSave(null)
    setSaving(true)
    try {
      await performSave(true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initial?.id || !onDelete) return
    if (!window.confirm('Delete this system permanently?')) return
    setDeleting(true)
    try {
      await onDelete(initial.id)
    } finally {
      setDeleting(false)
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = USER_SYSTEM_TEMPLATES.find((entry) => entry.id === templateId)
    if (!template) return
    pushEditorHistory()
    const draft = instantiateUserSystemTemplate(template, branch)
    const next = seedToDraft(draft)
    setTitle(next.title)
    setSummary(next.summary)
    setVisibility(next.visibility)
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedNodeId(null)
    setSelectedEdgeKey(null)
    setLinkPickActive(false)
    setLinkSourceId(null)
    setTab('graph')
    void haptics.light()
  }

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = edges.find((edge) => normalizeGraphEdgeKey(edge.from, edge.to) === selectedEdgeKey) ?? null
  const selectedEdgeFrom = selectedEdge ? nodeOptions.find((option) => option.id === selectedEdge.from)?.label ?? 'Step' : ''
  const selectedEdgeTo = selectedEdge ? nodeOptions.find((option) => option.id === selectedEdge.to)?.label ?? 'Step' : ''
  const incomingCountByNode = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, 0]))
    for (const edge of edges) map.set(edge.to, (map.get(edge.to) ?? 0) + 1)
    return map
  }, [edges, nodes])
  const outgoingCountByNode = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, 0]))
    for (const edge of edges) map.set(edge.from, (map.get(edge.from) ?? 0) + 1)
    return map
  }, [edges, nodes])
  const graphStarts = useMemo(() => nodes.filter((node) => (incomingCountByNode.get(node.id) ?? 0) === 0), [incomingCountByNode, nodes])
  const graphExits = useMemo(() => nodes.filter((node) => (outgoingCountByNode.get(node.id) ?? 0) === 0), [nodes, outgoingCountByNode])
  const orphanNodes = useMemo(() => graphStarts.slice(1), [graphStarts])
  const selectedIncomingEdges = selectedNode ? edges.filter((edge) => edge.to === selectedNode.id) : []
  const selectedOutgoingEdges = selectedNode ? edges.filter((edge) => edge.from === selectedNode.id) : []
  const selectedNeighborNodeIds = selectedNode
    ? Array.from(new Set([...selectedIncomingEdges.map((edge) => edge.from), ...selectedOutgoingEdges.map((edge) => edge.to)]))
    : []
  const linkedTechniqueCount = new Set(nodes.flatMap((node) => node.linkedTechniqueIds)).size
  const referencedNodeCount = nodes.filter((node) => node.linkedTechniqueIds.length > 0).length
  const notedNodeCount = nodes.filter((node) => Boolean(node.trigger || node.details || node.commonMistake || node.videoUrl)).length
  const graphPulse = [
    { label: 'Starts', value: graphStarts.length, nodeId: graphStarts[0]?.id ?? null },
    { label: 'Exits', value: graphExits.length, nodeId: graphExits[0]?.id ?? null },
    { label: 'Orphans', value: orphanNodes.length, nodeId: orphanNodes[0]?.id ?? null },
    { label: 'Refs', value: referencedNodeCount, nodeId: nodes.find((node) => node.linkedTechniqueIds.length > 0)?.id ?? null },
  ] as const
  const publishReady = title.trim().length > 0 && nodes.length > 0

  const toggleTechniqueOnNode = (nodeId: string, techniqueId: string) => {
    pushEditorHistory()
    setNodes((previous) =>
      previous.map((node) => {
        if (node.id !== nodeId) return node
        const set = new Set(node.linkedTechniqueIds)
        if (set.has(techniqueId)) set.delete(techniqueId)
        else set.add(techniqueId)
        return { ...node, linkedTechniqueIds: [...set] }
      }),
    )
  }

  const updateSelectedNodeField = useCallback(
    <K extends keyof DraftNode>(nodeId: string, key: K, value: DraftNode[K]) => {
      setNodes((previous) => previous.map((node) => (node.id === nodeId ? { ...node, [key]: value } : node)))
    },
    [],
  )

  return (
    <div
      ref={modalShellRef}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#04060a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit training system' : 'New training system'}
    >
      <a
        href="#system-editor-main"
        className="fixed left-4 top-[-120px] z-[70] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black opacity-0 shadow-lg transition-[top,opacity] focus:top-4 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#4d7cff] focus:ring-offset-2 focus:ring-offset-[#04060a]"
      >
        Skip to editor content
      </a>
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-0 items-center gap-2 text-base font-semibold text-white/90"
            aria-label="Close editor"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">{isEdit ? 'Edit system' : 'New system'}</span>
          </button>
          {initial?.userId && onDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/35 bg-red-500/12 px-3 py-1.5 text-xs font-bold text-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : (
            <span className="w-10 shrink-0" />
          )}
        </header>

        <div className="mb-4 flex shrink-0 gap-1 rounded-[16px] border border-white/10 bg-black/35 p-1">
          {(
            [
              ['basics', 'Basics', Sparkles],
              ['graph', 'Graph', GitBranch],
              ['publish', 'Publish', Network],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
                onClick={() => {
                  setTab(key)
                  setLinkPickActive(false)
                  setLinkSourceId(null)
                  setSelectedEdgeKey(null)
                }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-bold transition',
                tab === key ? 'bg-[#4d7cff]/22 text-[#b8c9ff]' : 'text-white/45',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div id="system-editor-main" className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4" tabIndex={-1}>
          {tab === 'basics' && (
            <>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">Basics</p>
                {!isEdit && user?.id && lastDraftSavedAt ? (
                  <p className="mt-2 text-xs text-white/45">Autosaved on this device · {formatRelativeDraftTime(lastDraftSavedAt)}</p>
                ) : null}
                {isEdit && initial?.updatedAt ? (
                  <p className="mt-2 text-xs text-white/45">Last saved to account · {formatAccountSavedAt(initial.updatedAt)}</p>
                ) : null}
                <label className="mt-3 block text-sm font-semibold text-white/70" htmlFor="system-title">
                  Title
                </label>
                <input
                  id="system-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => pushEditorHistory()}
                  placeholder="e.g. Closed guard chain"
                  className="mt-1.5 w-full rounded-[14px] border border-white/12 bg-black/40 px-4 py-3 text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/55"
                />
                <label className="mt-4 block text-sm font-semibold text-white/70" htmlFor="system-summary">
                  Summary
                </label>
                <textarea
                  id="system-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  onBlur={() => pushEditorHistory()}
                  rows={3}
                  placeholder="What is this system trying to solve?"
                  className="mt-1.5 w-full resize-none rounded-[14px] border border-white/12 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/55"
                />
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-[#8cabff]" />
                  <p className="text-sm font-bold text-white">Templates</p>
                </div>
                <p className="mt-1 text-xs text-white/45">Start from a structured graph, then tune on the Graph tab.</p>
	                <div className="mt-3 flex flex-col gap-2">
	                  {USER_SYSTEM_TEMPLATES.map((template) => {
	                    const preview = instantiateUserSystemTemplate(template, branch)
	                    const previewPositions = computeGraphLayout(preview.nodes, preview.edges)
	                    return (
	                      <button
	                        key={template.id}
	                        type="button"
	                        onClick={() => applyTemplate(template.id)}
	                        className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[16px] border border-white/10 bg-black/30 p-2 text-left transition hover:border-[#4d7cff]/35 hover:bg-[#4d7cff]/10"
	                      >
	                        <div className="h-20 overflow-hidden rounded-[12px] border border-white/8 bg-[#050914]">
	                          <SystemGraphCanvas
	                            variant="preview"
	                            nodes={preview.nodes}
	                            edges={preview.edges}
	                            positions={previewPositions}
	                            density="compact"
	                            labelMode="none"
	                            showControls={false}
	                            showMiniMap={false}
	                            className="h-full w-full"
	                          />
	                        </div>
	                        <span className="min-w-0 self-center">
	                          <span className="block font-bold text-white">{template.title}</span>
	                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/50">{template.summary}</span>
	                        </span>
	                      </button>
	                    )
	                  })}
	                </div>
              </div>

              {!isEdit ? (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-white/38">Use Duplicate on your system card to clone a saved graph.</p>
                  {user?.id ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => void copyDraftJson()}
                      leftIcon={<ClipboardCopy className="h-3.5 w-3.5" />}
                    >
                      Copy draft as JSON
                    </Button>
                  ) : null}
                  {user?.id && hasStoredDraft ? (
                    <button
                      type="button"
                      onClick={() => discardLocalDraft()}
                      className="text-xs font-bold text-red-300/90 underline-offset-4 hover:underline"
                    >
                      Discard autosaved draft on this device
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {tab === 'graph' && (
            <>
              <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#050914] shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cabff]">Graph builder</p>
                    <p className="mt-1 text-xs font-semibold text-white/42">{nodes.length} steps · {edges.length} transitions · {linkedTechniqueCount} refs · {notedNodeCount} notes</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={undoGraph}
                      disabled={!canUndo}
                      title="Undo"
                      aria-label="Undo graph change"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 disabled:opacity-35"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={redoGraph}
                      disabled={!canRedo}
                      title="Redo"
                      aria-label="Redo graph change"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 disabled:opacity-35"
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={autoLayoutGraph}
                      title="Auto layout"
                      aria-label="Auto layout graph"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70"
                    >
                      <LayoutTemplate className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkPickActive((previous) => !previous)
                        setLinkSourceId(null)
                        setSelectedEdgeKey(null)
                      }}
                      title="Link steps"
                      aria-label="Link steps"
                      className={cn(
                        'inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-xs font-black',
                        linkPickActive
                          ? 'border-[#4d7cff]/55 bg-[#4d7cff]/24 text-white'
                          : 'border-white/10 bg-white/[0.06] text-white/70',
                      )}
                    >
                      <Link2 className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">{linkPickActive ? 'On' : 'Link'}</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 border-b border-white/8 px-3 py-2">
                  {graphPulse.map((metric) => {
                    const needsAttention = metric.label === 'Orphans' && metric.value > 0
                    return (
                      <button
                        key={metric.label}
                        type="button"
                        disabled={!metric.nodeId}
                        onClick={() => {
                          if (!metric.nodeId) return
                          setSelectedNodeId(metric.nodeId)
                          setSelectedEdgeKey(null)
                          setLinkPickActive(false)
                          setLinkSourceId(null)
                        }}
                        className={cn(
                          'min-h-[52px] rounded-[14px] border px-2 py-2 text-left transition disabled:opacity-50',
                          needsAttention
                            ? 'border-amber-300/28 bg-amber-300/10 text-amber-100'
                            : 'border-white/8 bg-black/24 text-white/72 hover:bg-white/[0.06]',
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          {metric.label === 'Orphans' ? <Target className="h-3 w-3" /> : <Route className="h-3 w-3" />}
                          {metric.label}
                        </span>
                        <span className="mt-1 block text-lg font-black leading-none text-white">{metric.value}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="relative aspect-[4/3] w-full">
                  <SystemGraphCanvas
                    variant="editor"
                    nodes={nodes}
                    edges={edges}
                    positions={positions}
                    className="h-full w-full"
                    viewportGestures={!linkPickActive}
                    reduceMotion={reduceMotion}
                    keyboardFocusNodeId={selectedNodeId ?? nodes[0]?.id ?? null}
                    onNodeDragStart={pushEditorHistory}
                    selectedNodeId={selectedNodeId}
                    selectedEdgeKey={selectedEdgeKey}
                    highlightedNodeIds={selectedEdge ? [selectedEdge.from, selectedEdge.to] : selectedNode ? [selectedNode.id, ...selectedNeighborNodeIds] : []}
                    highlightedEdgeKeys={selectedNode ? edges
                      .filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
                      .map((edge) => normalizeGraphEdgeKey(edge.from, edge.to)) : []}
                    dimUnhighlighted={Boolean(selectedNode || selectedEdge)}
                    flowAnimation={Boolean(selectedNode || selectedEdge)}
                    linkPickActive={linkPickActive}
                    linkSourceId={linkSourceId}
                    density="hero"
                    labelMode="auto"
                    showNodeIndex
                    showControls={!linkPickActive}
                    showMiniMap={!linkPickActive}
                    onSelectNode={(id) => {
                      if (linkPickActive) {
                        if (id === null) {
                          setLinkSourceId(null)
                          return
                        }
                        if (!linkSourceId) {
                          setLinkSourceId(id)
                          setSelectedNodeId(id)
                          setSelectedEdgeKey(null)
                          return
                        }
                        return
                      }
                      setSelectedNodeId(id)
                      setSelectedEdgeKey(null)
                    }}
                    onSelectEdge={(key) => {
                      setSelectedEdgeKey(key)
                      if (key) setSelectedNodeId(null)
                    }}
                    onLinkNodes={addGraphLink}
                    onNodePosition={handleNodePosition}
                    onBackgroundPointerDown={() => {
                      setSelectedNodeId(null)
                      setSelectedEdgeKey(null)
                      if (linkPickActive) setLinkSourceId(null)
                    }}
                  />
                  {linkPickActive ? (
                    <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-[#4d7cff]/40 bg-[#07101f]/86 px-3 py-2 text-xs font-black text-[#d9e4ff] shadow-[0_12px_34px_rgba(0,0,0,0.42)] backdrop-blur-md">
                      {linkSourceId ? `Source: ${nodeOptions.find((option) => option.id === linkSourceId)?.label ?? 'Step'}` : 'Pick source'}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={addNode}
                    className="absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] text-white shadow-[0_14px_32px_rgba(47,88,255,0.4)]"
                    aria-label="Add step"
                    title="Add step"
                  >
                    <Plus className="h-7 w-7" />
                  </button>
                  {graphTourOpen ? (
                    <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 rounded-[18px] border border-[#4d7cff]/35 bg-[#070b14]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9ab6ff]">
                        System builder · Step {graphTourStep + 1} of {SYSTEM_GRAPH_EDITOR_TOUR_STEPS.length}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">{SYSTEM_GRAPH_EDITOR_TOUR_STEPS[graphTourStep]?.title}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{SYSTEM_GRAPH_EDITOR_TOUR_STEPS[graphTourStep]?.body}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            markSystemGraphTourSeen()
                            setGraphTourOpen(false)
                          }}
                        >
                          Skip tour
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (graphTourStep >= SYSTEM_GRAPH_EDITOR_TOUR_STEPS.length - 1) {
                              markSystemGraphTourSeen()
                              setGraphTourOpen(false)
                              return
                            }
                            const next = graphTourStep + 1
                            setGraphTourStep(next)
                            setSystemGraphTourSessionStep(next)
                          }}
                        >
                          {graphTourStep >= SYSTEM_GRAPH_EDITOR_TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">System details</p>
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                    publishReady ? 'bg-emerald-500/12 text-emerald-200' : 'bg-amber-400/12 text-amber-100',
                  )}>
                    {publishReady ? 'Ready' : 'Draft'}
                  </span>
                </div>
                <label className="mt-3 block text-sm font-semibold text-white/70" htmlFor="system-title-graph">
                  Title
                </label>
                <input
                  id="system-title-graph"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => pushEditorHistory()}
                  placeholder="e.g. Closed guard chain"
                  className="mt-1.5 w-full rounded-[14px] border border-white/12 bg-black/40 px-4 py-3 text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/55"
                />
                <label className="mt-4 block text-sm font-semibold text-white/70" htmlFor="system-summary-graph">
                  Summary
                </label>
                <textarea
                  id="system-summary-graph"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  onBlur={() => pushEditorHistory()}
                  rows={2}
                  placeholder="What problem does this map solve?"
                  className="mt-1.5 w-full resize-none rounded-[14px] border border-white/12 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/55"
                />
                {!isEdit && user?.id && lastDraftSavedAt ? (
                  <p className="mt-2 text-xs text-white/40">Autosaved · {formatRelativeDraftTime(lastDraftSavedAt)}</p>
                ) : isEdit && initial?.updatedAt ? (
                  <p className="mt-2 text-xs text-white/40">Saved · {formatAccountSavedAt(initial.updatedAt)}</p>
                ) : null}
              </div>

              {selectedNode ? (
                <div className="rounded-[22px] border border-[#4d7cff]/25 bg-[#4d7cff]/08 p-4 shadow-[0_16px_44px_rgba(77,124,255,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ab6ff]">Step inspector</p>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                      {selectedNode.linkedTechniqueIds.length} refs
                    </span>
                  </div>
                  <input
                    value={selectedNode.label}
                    onChange={(event) => {
                      const value = event.target.value
                      setNodes((previous) =>
                        previous.map((node) => (node.id === selectedNode.id ? { ...node, label: value } : node)),
                      )
                    }}
                    onBlur={() => pushEditorHistory()}
                    className="mt-2 w-full rounded-[12px] border border-white/12 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#4d7cff]/45"
                  />
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[
                      ['In', selectedIncomingEdges.length],
                      ['Out', selectedOutgoingEdges.length],
                      ['Refs', selectedNode.linkedTechniqueIds.length],
                      ['Notes', selectedNode.trigger || selectedNode.details || selectedNode.commonMistake || selectedNode.videoUrl ? 1 : 0],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-[12px] border border-white/8 bg-black/25 px-2 py-2 text-center">
                        <p className="text-base font-black leading-none text-white">{value}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/34">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { title: 'Coming from', nodeId: selectedIncomingEdges[0]?.from },
                      { title: 'Leads to', nodeId: selectedOutgoingEdges[0]?.to },
                    ].map((entry) => {
                      const nodeId = entry.nodeId
                      const targetLabel = nodeId ? nodeOptions.find((option) => option.id === nodeId)?.label ?? 'Step' : 'None'
                      return nodeId ? (
                        <button
                          key={entry.title}
                          type="button"
                          onClick={() => {
                            setSelectedNodeId(nodeId)
                            setSelectedEdgeKey(null)
                          }}
                          className="min-h-[50px] rounded-[12px] border border-white/8 bg-black/24 px-3 py-2 text-left transition hover:bg-white/[0.06]"
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-white/34">{entry.title}</span>
                          <span className="mt-0.5 block truncate text-xs font-black text-white/82">{targetLabel}</span>
                        </button>
                      ) : (
                        <div key={entry.title} className="min-h-[50px] rounded-[12px] border border-white/8 bg-black/16 px-3 py-2">
                          <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-white/28">{entry.title}</span>
                          <span className="mt-0.5 block text-xs font-black text-white/25">None</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/35">Color</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Color ${color}`}
                        onClick={() => {
                          pushEditorHistory()
                          setNodes((previous) =>
                            previous.map((node) => (node.id === selectedNode.id ? { ...node, color } : node)),
                          )
                        }}
                        className={cn(
                          'h-9 w-9 rounded-full border-2 transition',
                          selectedNode.color === color ? 'border-white' : 'border-transparent opacity-80',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-white/35">Library techniques</p>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-[12px] border border-white/8 bg-black/30 p-2">
                    {libraryTechniques.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-white/45">Add techniques in My Library first.</p>
                    ) : (
                      libraryTechniques.map((technique) => {
                        const on = selectedNode.linkedTechniqueIds.includes(technique.id)
                        return (
                          <button
                            key={technique.id}
                            type="button"
                            onClick={() => toggleTechniqueOnNode(selectedNode.id, technique.id)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-[10px] px-2 py-2 text-left text-xs font-semibold',
                              on ? 'bg-[#4d7cff]/22 text-white' : 'text-white/65 hover:bg-white/6',
                            )}
                          >
                            <span className="truncate">{technique.title}</span>
                            {on ? <span className="shrink-0 text-[#8cabff]">✓</span> : null}
                          </button>
                        )
                      })
                    )}
                  </div>

                  <details className="mt-4 rounded-[14px] border border-white/10 bg-black/30 [&[open]]:bg-black/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      <span>Study details</span>
                      <span aria-hidden className="text-white/35 transition group-open:rotate-180">▾</span>
                    </summary>
                    <div className="space-y-3 px-3 pb-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Trigger</label>
                        <input
                          value={selectedNode.trigger ?? ''}
                          onChange={(event) =>
                            updateSelectedNodeField(selectedNode.id, 'trigger', event.target.value === '' ? null : event.target.value)
                          }
                          onBlur={() => pushEditorHistory()}
                          placeholder="When to use this step"
                          maxLength={MAX_NODE_TRIGGER_LEN}
                          className="mt-1 w-full rounded-[10px] border border-white/12 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#4d7cff]/45"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Details</label>
                        <textarea
                          value={selectedNode.details ?? ''}
                          onChange={(event) =>
                            updateSelectedNodeField(selectedNode.id, 'details', event.target.value === '' ? null : event.target.value)
                          }
                          onBlur={() => pushEditorHistory()}
                          placeholder="Key concepts, grips, frames, timing…"
                          rows={4}
                          maxLength={MAX_NODE_DETAILS_LEN}
                          className="mt-1 w-full resize-y rounded-[10px] border border-white/12 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#4d7cff]/45"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Common mistake</label>
                        <textarea
                          value={selectedNode.commonMistake ?? ''}
                          onChange={(event) =>
                            updateSelectedNodeField(selectedNode.id, 'commonMistake', event.target.value === '' ? null : event.target.value)
                          }
                          onBlur={() => pushEditorHistory()}
                          placeholder="What students get wrong here"
                          rows={2}
                          maxLength={MAX_NODE_MISTAKE_LEN}
                          className="mt-1 w-full resize-y rounded-[10px] border border-white/12 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#4d7cff]/45"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Video URL</label>
                          <input
                            type="url"
                            inputMode="url"
                            value={selectedNode.videoUrl ?? ''}
                            onChange={(event) =>
                              updateSelectedNodeField(selectedNode.id, 'videoUrl', event.target.value === '' ? null : event.target.value)
                            }
                            onBlur={() => pushEditorHistory()}
                            placeholder="https://…"
                            maxLength={MAX_NODE_VIDEO_URL_LEN}
                            className="mt-1 w-full rounded-[10px] border border-white/12 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#4d7cff]/45"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">At (s)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={100000}
                            value={selectedNode.videoTimestampSeconds ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value
                              const parsed = raw === '' ? null : Number.parseInt(raw, 10)
                              updateSelectedNodeField(
                                selectedNode.id,
                                'videoTimestampSeconds',
                                normalizeTimestamp(parsed ?? null),
                              )
                            }}
                            onBlur={() => pushEditorHistory()}
                            placeholder="0"
                            className="mt-1 w-full rounded-[10px] border border-white/12 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#4d7cff]/45"
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              ) : selectedEdge ? (
                <div className="rounded-[22px] border border-[#4d7cff]/25 bg-[#4d7cff]/08 p-4 shadow-[0_16px_44px_rgba(77,124,255,0.08)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ab6ff]">Transition inspector</p>
                  <div className="mt-3 rounded-[16px] border border-white/10 bg-black/30 p-3">
                    <p className="truncate text-sm font-black text-white">{selectedEdgeFrom}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/35">to</p>
                    <p className="mt-1 truncate text-sm font-black text-white">{selectedEdgeTo}</p>
                  </div>
                  <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Transition note</label>
                  <input
                    value={selectedEdge.label ?? ''}
                    onChange={(event) => updateEdgeLabel(selectedEdge.from, selectedEdge.to, event.target.value)}
                    onBlur={() => pushEditorHistory()}
                    placeholder="e.g. underhook, posture break, frame wins"
                    className="mt-1 w-full rounded-[12px] border border-white/12 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/45"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => removeEdge(selectedEdge.from, selectedEdge.to)}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Remove transition
                  </Button>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.025] p-4 text-center">
                  <p className="text-sm font-bold text-white/70">Select a step or transition</p>
                </div>
              )}

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">All steps</p>
                <div id="system-editor-steps-list" className="mt-3 space-y-2">
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex flex-wrap items-center gap-2 rounded-[14px] border border-white/8 bg-black/30 px-3 py-2"
                    >
	                      <button
	                        type="button"
	                        onClick={() => {
	                          setSelectedNodeId(node.id)
	                          setSelectedEdgeKey(null)
	                        }}
                        className={cn(
                          'min-w-0 flex-1 truncate text-left text-sm font-bold',
                          selectedNodeId === node.id ? 'text-[#9ab6ff]' : 'text-white/80',
                        )}
                      >
                        {node.label || 'Untitled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNode(node.id)}
                        disabled={nodes.length <= 1}
                        className="rounded-full p-2 text-white/45 disabled:opacity-30"
                        aria-label="Remove step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
	                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">Precision links</p>
                <div className="mt-4 flex flex-col gap-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Transition note</label>
                    <input
                      value={linkEdgeLabel}
                      onChange={(event) => setLinkEdgeLabel(event.target.value.slice(0, MAX_EDGE_LABEL_LEN))}
                      placeholder="Optional label on the arrow (e.g. “underhook”)"
                      className="mt-1 w-full rounded-[12px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/28 focus:border-[#4d7cff]/45"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">From</label>
                    <select
                      value={linkFrom}
                      onChange={(event) => setLinkFrom(event.target.value)}
                      className="mt-1 w-full rounded-[12px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#4d7cff]/45"
                    >
                      <option value="">Select step</option>
                      {nodeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">To</label>
                    <select
                      value={linkTo}
                      onChange={(event) => setLinkTo(event.target.value)}
                      className="mt-1 w-full rounded-[12px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#4d7cff]/45"
                    >
                      <option value="">Select step</option>
                      {nodeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="secondary" size="md" onClick={addEdge} leftIcon={<Link2 className="h-4 w-4" />}>
                    Add link
                  </Button>
                </div>
                {edges.length === 0 ? (
                  <p className="mt-4 text-sm text-white/40">No links yet — optional transitions between steps.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {edges.map((edge) => {
                      const fromLabel = nodeOptions.find((option) => option.id === edge.from)?.label ?? edge.from
                      const toLabel = nodeOptions.find((option) => option.id === edge.to)?.label ?? edge.to
	                      return (
	                        <li
	                          key={`${edge.from}-${edge.to}`}
	                          className={cn(
	                            'rounded-[14px] border bg-black/30 p-3 text-sm font-semibold text-white/75',
	                            selectedEdgeKey === normalizeGraphEdgeKey(edge.from, edge.to) ? 'border-[#4d7cff]/45 bg-[#4d7cff]/10' : 'border-white/8',
	                          )}
	                        >
	                          <div className="flex items-start justify-between gap-3">
	                            <button
	                              type="button"
	                              onClick={() => {
	                                setSelectedNodeId(null)
	                                setSelectedEdgeKey(normalizeGraphEdgeKey(edge.from, edge.to))
	                              }}
	                              className="min-w-0 flex-1 truncate text-left"
	                            >
	                              {fromLabel} → {toLabel}
	                            </button>
                            <button
                              type="button"
                              onClick={() => removeEdge(edge.from, edge.to)}
                              className="shrink-0 rounded-full p-2 text-white/45 hover:text-white"
                              aria-label="Remove link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                            Label
                          </label>
                          <input
                            value={edge.label ?? ''}
                            onChange={(event) => updateEdgeLabel(edge.from, edge.to, event.target.value)}
                            onBlur={() => pushEditorHistory()}
                            placeholder="Shown on the graph"
                            className="mt-1 w-full rounded-[10px] border border-white/10 bg-black/35 px-2.5 py-2 text-xs font-semibold text-white/90 outline-none placeholder:text-white/28 focus:border-[#4d7cff]/40"
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          )}

          {tab === 'publish' && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#8cabff]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">Readiness</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {[
                    ['Title', title.trim().length > 0],
                    ['Graph steps', nodes.length > 0],
                    ['Transitions', edges.length > 0],
                    ['Technique refs', linkedTechniqueCount > 0],
                  ].map(([label, ready]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-[14px] border border-white/8 bg-black/30 px-3 py-2.5">
                      <span className="text-sm font-bold text-white/78">{label}</span>
                      <span className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        ready ? 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.45)]' : 'bg-white/18',
                      )} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">Visibility</p>
                <div className="mt-3 flex gap-2">
                  {(['private', 'public'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (value === visibility) return
                        pushEditorHistory()
                        setVisibility(value)
                      }}
                      className={cn(
                        'flex-1 rounded-[14px] border px-3 py-2.5 text-sm font-bold transition',
                        visibility === value
                          ? 'border-[#4d7cff]/55 bg-[#4d7cff]/18 text-[#8cabff]'
                          : 'border-white/10 bg-white/[0.04] text-white/55',
                      )}
                    >
                      {value === 'private' ? 'Private' : 'Public'}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-6 text-white/50">
                  Public systems share graph labels and saved technique titles. Private library entries stay private.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex shrink-0 gap-3 border-t border-white/10 pt-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            loading={saving}
            disabled={!title.trim() || nodes.length === 0}
            onClick={() => void handleSave()}
          >
            Save system
          </Button>
        </div>
      </div>

      {concurrentSave ? (
        <div
          className="absolute inset-0 z-[60] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="system-save-conflict-title"
          aria-describedby="system-save-conflict-body"
        >
          <div className="w-full max-w-[400px] rounded-[22px] border border-white/12 bg-[#0a0e18] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <p id="system-save-conflict-title" className="text-lg font-black text-white">
              This system changed elsewhere
            </p>
            <p id="system-save-conflict-body" className="mt-2 text-sm leading-6 text-white/60">
              A newer version was saved from another tab or device (last update{' '}
              {formatAccountSavedAt(concurrentSave.serverUpdatedAt)}). You can load that version, keep editing and overwrite it, or
              cancel and continue without saving.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                loading={reloadBusy}
                disabled={reloadBusy}
                onClick={() => void handleReloadServerCopy()}
              >
                Load latest from account
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={saving}
                disabled={saving || reloadBusy}
                onClick={() => void handleOverwriteConcurrent()}
              >
                Overwrite with my edits
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={reloadBusy || saving}
                onClick={() => setConcurrentSave(null)}
              >
                Cancel save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function clamp01(value: number) {
  return Math.min(0.94, Math.max(0.06, value))
}
