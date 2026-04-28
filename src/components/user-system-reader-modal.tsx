'use client'

import { ArrowLeft, ArrowRight, BookOpen, GitFork, Link2, MessageCircle, Route, ScanSearch, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { normalizeGraphEdgeKey, SystemGraphCanvas } from '@/components/system-graph-canvas'
import { SystemNodeStudyView } from '@/components/system-node-study-view'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { useModalFocusTrap } from '@/lib/hooks/use-modal-focus-trap'
import type { BjjSystem, BjjTechnique } from '@/lib/bjj-types'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import { cn } from '@/lib/utils'

function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function buildVideoHref(url: string, timestamp: number | null | undefined): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return url
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host.endsWith('youtube.com') || host === 'youtu.be' || host.endsWith('youtube-nocookie.com')) {
      parsed.searchParams.set('t', `${Math.floor(timestamp)}s`)
      return parsed.toString()
    }
    if (host.endsWith('vimeo.com')) {
      parsed.hash = `#t=${Math.floor(timestamp)}s`
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

type StepConnection = { node: BjjSystem['nodes'][number]; label: string | null | undefined; edgeKey: string }
type SystemEdge = BjjSystem['edges'][number]
type PrimaryRoute = { nodes: BjjSystem['nodes']; edgeKeys: string[] }

function buildPrimaryRoute(system: BjjSystem, startNodeId: string | null | undefined): PrimaryRoute {
  const nodeById = new Map(system.nodes.map((node) => [node.id, node]))
  const startId = startNodeId && nodeById.has(startNodeId) ? startNodeId : system.nodes[0]?.id
  if (!startId) return { nodes: [], edgeKeys: [] }

  const outgoingByNode = new Map<string, SystemEdge[]>()
  for (const edge of system.edges) {
    const list = outgoingByNode.get(edge.from) ?? []
    list.push(edge)
    outgoingByNode.set(edge.from, list)
  }

  const routeNodes: BjjSystem['nodes'] = []
  const edgeKeys: string[] = []
  const seen = new Set<string>()
  let current: string | null = startId

  while (current && !seen.has(current) && routeNodes.length < system.nodes.length) {
    const node = nodeById.get(current)
    if (!node) break
    routeNodes.push(node)
    seen.add(current)
    const candidates: SystemEdge[] = outgoingByNode.get(current) ?? []
    const nextEdge: SystemEdge | undefined = candidates.find((edge: SystemEdge) => nodeById.has(edge.to) && !seen.has(edge.to))
    if (!nextEdge) break
    edgeKeys.push(normalizeGraphEdgeKey(nextEdge.from, nextEdge.to))
    current = nextEdge.to
  }

  return { nodes: routeNodes, edgeKeys }
}

export function UserSystemReaderModal({
  system,
  libraryTechniques,
  isOwner,
  forkCount,
  onClose,
  onOpenTechnique,
  onDelete,
  onOpenForkers,
  onOpenComments,
}: {
  system: BjjSystem
  libraryTechniques: BjjTechnique[]
  isOwner: boolean
  forkCount?: number
  onClose: () => void
  onOpenTechnique: (techniqueId: string) => void
  onDelete?: () => void
  onOpenForkers?: () => void
  onOpenComments?: () => void
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(system.nodes[0]?.id ?? null)
  const [readerMode, setReaderMode] = useState<'map' | 'study'>('map')
  const [focusRoute, setFocusRoute] = useState(false)
  const [studyStack, setStudyStack] = useState<string[]>([])
  const reduceMotion = useReducedMotion()
  const modalShellRef = useRef<HTMLDivElement | null>(null)
  useModalFocusTrap(true, modalShellRef)

  const pushStudyNode = useCallback((nodeId: string) => {
    setReaderMode('study')
    setStudyStack((prev) => (prev[prev.length - 1] === nodeId ? prev : [...prev, nodeId]))
  }, [])
  const popStudyNode = useCallback(() => {
    setStudyStack((prev) => prev.slice(0, -1))
  }, [])
  const exitStudy = useCallback(() => {
    setStudyStack([])
    setReaderMode('map')
  }, [])

  const positions = useMemo(() => {
    const base = computeGraphLayout(system.nodes, system.edges)
    const out = { ...base }
    for (const node of system.nodes) {
      if (node.layout) out[node.id] = { x: node.layout.x, y: node.layout.y }
    }
    return out
  }, [system.nodes, system.edges])

  const selectedNode = useMemo(
    () => system.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, system.nodes],
  )

  const selectedIncoming = useMemo(() => {
    if (!selectedNode) return [] as StepConnection[]
    return system.edges
      .filter((edge) => edge.to === selectedNode.id)
      .map((edge) => {
        const node = system.nodes.find((candidate) => candidate.id === edge.from)
        return node ? { node, label: edge.label, edgeKey: normalizeGraphEdgeKey(edge.from, edge.to) } : null
      })
      .filter((entry): entry is StepConnection => entry != null)
  }, [selectedNode, system.edges, system.nodes])

  const selectedOutgoing = useMemo(() => {
    if (!selectedNode) return [] as StepConnection[]
    return system.edges
      .filter((edge) => edge.from === selectedNode.id)
      .map((edge) => {
        const node = system.nodes.find((candidate) => candidate.id === edge.to)
        return node ? { node, label: edge.label, edgeKey: normalizeGraphEdgeKey(edge.from, edge.to) } : null
      })
      .filter((entry): entry is StepConnection => entry != null)
  }, [selectedNode, system.edges, system.nodes])

  const linkedForSelected = useMemo(() => {
    if (!selectedNode) return { mode: 'none' as const, ownerTechniques: [] as BjjTechnique[], viewerTitles: [] as string[] }
    if (isOwner) {
      const ids = selectedNode.linkedTechniqueIds ?? []
      const ownerTechniques = ids
        .map((id) => libraryTechniques.find((technique) => technique.id === id))
        .filter((technique): technique is BjjTechnique => technique != null)
      return { mode: 'owner' as const, ownerTechniques, viewerTitles: [] as string[] }
    }
    const viewerTitles = Array.from(
      new Set(
        (selectedNode.linkedTechniqueTitles ?? [])
          .map((title) => title?.trim())
          .filter((title): title is string => Boolean(title)),
      ),
    )
    return { mode: 'viewer' as const, ownerTechniques: [] as BjjTechnique[], viewerTitles }
  }, [isOwner, libraryTechniques, selectedNode])

  const viewerTitleRollup = useMemo(() => {
    if (isOwner) return []
    const seen = new Set<string>()
    const collected: string[] = []
    for (const node of system.nodes) {
      for (const title of node.linkedTechniqueTitles ?? []) {
        const trimmed = title?.trim()
        if (!trimmed || seen.has(trimmed)) continue
        seen.add(trimmed)
        collected.push(trimmed)
      }
    }
    return collected
  }, [isOwner, system.nodes])

  const techniqueById = useMemo(() => new Map(libraryTechniques.map((technique) => [technique.id, technique])), [libraryTechniques])
  const allLinkedTechniques = useMemo(() => {
    if (!isOwner) return [] as Array<{ technique: BjjTechnique; nodeId: string }>
    return Array.from(
      new Map(
        system.nodes.flatMap((node) =>
          (node.linkedTechniqueIds ?? []).map((tid) => {
            const technique = techniqueById.get(tid)
            if (!technique) return null
            return [technique.id, { technique, nodeId: node.id }] as const
          }),
        ).filter((entry): entry is readonly [string, { technique: BjjTechnique; nodeId: string }] => entry != null),
      ).values(),
    )
  }, [isOwner, system.nodes, techniqueById])

  const highlightedEdgeKeys = useMemo(() => {
    if (!selectedNode) return []
    return system.edges
      .filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
      .map((edge) => normalizeGraphEdgeKey(edge.from, edge.to))
  }, [selectedNode, system.edges])

  const primaryRoute = useMemo(() => buildPrimaryRoute(system, selectedNodeId), [selectedNodeId, system])
  const primaryRouteNodeIds = useMemo(() => primaryRoute.nodes.map((node) => node.id), [primaryRoute.nodes])
  const routePosition = selectedNodeId ? primaryRouteNodeIds.indexOf(selectedNodeId) : -1
  const mapHighlightedNodeIds = focusRoute && primaryRouteNodeIds.length > 0
    ? primaryRouteNodeIds
    : selectedNode
      ? [selectedNode.id]
      : []
  const mapHighlightedEdgeKeys = focusRoute && primaryRoute.edgeKeys.length > 0 ? primaryRoute.edgeKeys : highlightedEdgeKeys

  const launchStudy = useCallback((nodeId?: string | null) => {
    const id = nodeId ?? selectedNodeId ?? system.nodes[0]?.id
    if (!id) return
    pushStudyNode(id)
  }, [pushStudyNode, selectedNodeId, system.nodes])

  return (
    <div
      ref={modalShellRef}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#04060a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`System: ${system.title}`}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        {studyStack.length > 0 || readerMode === 'study' ? (
          studyStack.length > 0 ? (
            <SystemNodeStudyView
              system={system}
              stack={studyStack}
              isOwner={isOwner}
              libraryTechniques={libraryTechniques}
              onPush={pushStudyNode}
              onPop={popStudyNode}
              onExit={exitStudy}
              onOpenTechnique={onOpenTechnique}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <ReaderHeader onClose={exitStudy} label="Map" />
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <button
                  type="button"
                  onClick={() => launchStudy()}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[#4d7cff]/45 bg-[#4d7cff]/18 px-5 text-sm font-black text-[#d9e4ff]"
                >
                  <ScanSearch className="h-4 w-4" />
                  Start study
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            <header className="mb-3 flex shrink-0 items-start justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-base font-semibold text-white/90"
                aria-label="Close"
              >
                <ArrowLeft className="h-5 w-5" />
                System
              </button>
              {isOwner && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm(`Delete “${system.title}”?`)) return
                    onDelete()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200"
                  aria-label={`Delete ${system.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              ) : null}
            </header>

            <div className="shrink-0 space-y-3">
              <div>
                <h1 className="text-[24px] font-black leading-tight tracking-tight text-white">{system.title}</h1>
                <p className="mt-1 text-sm leading-6 text-white/55">{system.summary}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Steps', system.nodes.length],
                  ['Links', system.edges.length],
                  ['Refs', isOwner ? allLinkedTechniques.length : viewerTitleRollup.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[16px] border border-white/8 bg-white/[0.045] px-3 py-2">
                    <p className="text-[18px] font-black leading-none text-white">{value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex rounded-[16px] border border-white/10 bg-black/35 p-1">
                  {(['map', 'study'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => (mode === 'map' ? setReaderMode('map') : launchStudy(selectedNodeId))}
                      className={cn(
                        'rounded-[12px] px-4 py-2 text-xs font-black capitalize transition',
                        mode === 'map' ? 'bg-[#4d7cff]/22 text-[#d9e4ff]' : 'text-white/45 hover:text-white',
                      )}
                      aria-pressed={mode === 'map'}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFocusRoute((previous) => !previous)}
                  disabled={primaryRoute.nodes.length < 2}
                  className={cn(
                    'inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition disabled:opacity-35',
                    focusRoute
                      ? 'border-[#4d7cff]/50 bg-[#4d7cff]/20 text-[#d9e4ff]'
                      : 'border-white/10 bg-white/[0.05] text-white/60 hover:text-white',
                  )}
                  aria-pressed={focusRoute}
                  aria-label={focusRoute ? 'Hide focused route' : 'Focus route'}
                >
                  <Route className="h-3.5 w-3.5" />
                  Route
                </button>
                {system.visibility === 'public' && (onOpenForkers || onOpenComments) ? (
                  <div className="flex items-center gap-1.5">
                    {onOpenForkers ? (
                      <button
                        type="button"
                        onClick={onOpenForkers}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-white/78 hover:bg-white/[0.08]"
                        aria-label={typeof forkCount === 'number' ? `View ${forkCount} forks` : 'View forks'}
                      >
                        <GitFork className="h-3.5 w-3.5" />
                        <span>{typeof forkCount === 'number' ? forkCount : 'Forks'}</span>
                      </button>
                    ) : null}
                    {onOpenComments ? (
                      <button
                        type="button"
                        onClick={onOpenComments}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-white/78 hover:bg-white/[0.08]"
                        aria-label="Open comments"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-2">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#050914] shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
                <div className="aspect-[4/3] w-full">
                  <SystemGraphCanvas
                    variant="reader"
                    nodes={system.nodes}
                    edges={system.edges}
                    positions={positions}
                    className="h-full w-full"
                    viewportGestures
                    reduceMotion={reduceMotion}
                    density="hero"
                    keyboardFocusNodeId={selectedNodeId ?? system.nodes[0]?.id ?? null}
                    selectedNodeId={selectedNodeId}
                    highlightedNodeIds={mapHighlightedNodeIds}
                    highlightedEdgeKeys={mapHighlightedEdgeKeys}
                    dimUnhighlighted={focusRoute}
                    flowAnimation={focusRoute}
                    showNodeIndex
                    onSelectNode={setSelectedNodeId}
                  />
                </div>
              </div>

              {focusRoute && primaryRoute.nodes.length > 0 ? (
                <RouteTimeline
                  route={primaryRoute.nodes}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  onStudy={(nodeId) => launchStudy(nodeId)}
                />
              ) : null}

              <div className="sticky bottom-3 z-10 mt-4 rounded-[24px] border border-white/10 bg-[#070b14]/94 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.52)] backdrop-blur-xl">
                {selectedNode ? (
                  <SelectedStepSheet
                    node={selectedNode}
                    incoming={selectedIncoming}
                    outgoing={selectedOutgoing}
                    routePosition={
                      routePosition >= 0 ? { current: routePosition + 1, total: primaryRoute.nodes.length } : null
                    }
                    linkedForSelected={linkedForSelected}
                    onSelectNode={setSelectedNodeId}
                    onStudy={() => launchStudy(selectedNode.id)}
                    onOpenTechnique={onOpenTechnique}
                  />
                ) : (
                  <p className="py-3 text-center text-sm font-semibold text-white/45">Select a step on the map.</p>
                )}
              </div>

              {allLinkedTechniques.length > 0 ? (
                <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Linked techniques</p>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {allLinkedTechniques.map(({ technique, nodeId }) => (
                      <button
                        key={technique.id}
                        type="button"
                        onClick={() => onOpenTechnique(technique.id)}
                        className={cn(
                          'inline-flex min-h-[36px] max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold',
                          selectedNodeId === nodeId
                            ? 'border-[#4d7cff]/55 bg-[#4d7cff]/20 text-white'
                            : 'border-white/10 bg-black/25 text-white/70',
                        )}
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{technique.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : !isOwner && viewerTitleRollup.length > 0 ? (
                <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Technique titles</p>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {viewerTitleRollup.map((title) => (
                      <span
                        key={title}
                        className="inline-flex min-h-[36px] max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 text-xs font-bold text-white/70"
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReaderHeader({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-2 text-base font-semibold text-white/90"
        aria-label={label}
      >
        <ArrowLeft className="h-5 w-5" />
        {label}
      </button>
    </header>
  )
}

function RouteTimeline({
  route,
  selectedNodeId,
  onSelectNode,
  onStudy,
}: {
  route: BjjSystem['nodes']
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
  onStudy: (nodeId: string) => void
}) {
  return (
    <div className="mt-3 rounded-[20px] border border-[#4d7cff]/18 bg-[#08101f]/74 p-3 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9ab6ff]">Primary route</p>
        <button
          type="button"
          onClick={() => route[0] && onStudy(route[0].id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/16 px-3 text-xs font-black text-[#d9e4ff]"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          Drill
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {route.map((node, index) => {
          const selected = selectedNodeId === node.id
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={cn(
                'inline-flex min-h-[44px] min-w-[120px] max-w-[170px] shrink-0 items-center gap-2 rounded-[14px] border px-3 text-left transition',
                selected
                  ? 'border-[#4d7cff]/58 bg-[#4d7cff]/18 text-white'
                  : 'border-white/10 bg-black/24 text-white/62 hover:text-white',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
                  selected ? 'bg-white text-[#07101f]' : 'bg-white/10 text-white/72',
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{node.label || 'Untitled'}</span>
                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                  {node.linkedTechniqueIds?.length ?? node.linkedTechniqueTitles?.length ?? 0} refs
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SelectedStepSheet({
  node,
  incoming,
  outgoing,
  routePosition,
  linkedForSelected,
  onSelectNode,
  onStudy,
  onOpenTechnique,
}: {
  node: BjjSystem['nodes'][number]
  incoming: StepConnection[]
  outgoing: StepConnection[]
  routePosition: { current: number; total: number } | null
  linkedForSelected:
    | { mode: 'none'; ownerTechniques: BjjTechnique[]; viewerTitles: string[] }
    | { mode: 'owner'; ownerTechniques: BjjTechnique[]; viewerTitles: string[] }
    | { mode: 'viewer'; ownerTechniques: BjjTechnique[]; viewerTitles: string[] }
  onSelectNode: (nodeId: string) => void
  onStudy: () => void
  onOpenTechnique: (techniqueId: string) => void
}) {
  const previous = incoming[0]
  const next = outgoing[0]
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: node.color }} aria-hidden />
            <p className="truncate text-lg font-black text-white">{node.label}</p>
          </div>
          <p className="mt-1 text-xs font-semibold text-white/38">{incoming.length} in · {outgoing.length} out</p>
        </div>
        {routePosition ? (
          <span className="shrink-0 rounded-full border border-[#4d7cff]/28 bg-[#4d7cff]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#b8c9ff]">
            {routePosition.current}/{routePosition.total}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onStudy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 py-2 text-xs font-bold text-[#d9e4ff]"
          aria-label={`Study ${node.label}`}
        >
          <ScanSearch className="h-3.5 w-3.5" />
          Study
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ConnectionButton title="Previous" connection={previous} onSelectNode={onSelectNode} />
        <ConnectionButton title="Next" connection={next} onSelectNode={onSelectNode} align="right" />
      </div>

      {node.trigger ? <StepInfoBlock title="Trigger">{node.trigger}</StepInfoBlock> : null}
      {node.details ? <StepInfoBlock title="Details">{node.details}</StepInfoBlock> : null}
      {node.commonMistake ? (
        <div className="mt-3 rounded-[14px] border border-amber-400/25 bg-amber-400/08 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200/80">Common mistake</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{node.commonMistake}</p>
        </div>
      ) : null}
      {node.videoUrl ? (
        <a
          href={buildVideoHref(node.videoUrl, node.videoTimestampSeconds)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/[0.09]"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Video
            {typeof node.videoTimestampSeconds === 'number' && node.videoTimestampSeconds > 0
              ? ` · ${formatSeconds(node.videoTimestampSeconds)}`
              : ''}
          </span>
        </a>
      ) : null}

      {linkedForSelected.mode === 'owner' && linkedForSelected.ownerTechniques.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {linkedForSelected.ownerTechniques.map((technique) => (
            <button
              key={technique.id}
              type="button"
              onClick={() => onOpenTechnique(technique.id)}
              className="inline-flex min-h-[36px] max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 text-xs font-bold text-[#b8c9ff]"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{technique.title}</span>
            </button>
          ))}
        </div>
      ) : linkedForSelected.mode === 'viewer' && linkedForSelected.viewerTitles.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {linkedForSelected.viewerTitles.map((title) => (
            <span
              key={title}
              className="inline-flex min-h-[36px] max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 text-xs font-bold text-white/75"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">{title}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ConnectionButton({
  title,
  connection,
  onSelectNode,
  align = 'left',
}: {
  title: string
  connection?: StepConnection
  onSelectNode: (nodeId: string) => void
  align?: 'left' | 'right'
}) {
  if (!connection) {
    return (
      <div className="rounded-[14px] border border-white/8 bg-black/20 px-3 py-2 text-xs font-bold text-white/25">
        {title}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onSelectNode(connection.node.id)}
      className={cn(
        'flex min-h-[54px] items-center gap-2 rounded-[14px] border border-white/8 bg-black/30 px-3 py-2 text-left hover:bg-white/[0.06]',
        align === 'right' && 'justify-end text-right',
      )}
    >
      {align === 'left' ? <ArrowLeft className="h-4 w-4 shrink-0 text-white/45" /> : null}
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-black text-white/85">{connection.node.label || 'Untitled'}</span>
      </span>
      {align === 'right' ? <ArrowRight className="h-4 w-4 shrink-0 text-white/45" /> : null}
    </button>
  )
}

function StepInfoBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{children}</p>
    </div>
  )
}
