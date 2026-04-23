'use client'

import { ArrowLeft, BookOpen, GitFork, Link2, MessageCircle, ScanSearch, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [studyStack, setStudyStack] = useState<string[]>([])
  const reduceMotion = useReducedMotion()
  const modalShellRef = useRef<HTMLDivElement | null>(null)
  useModalFocusTrap(true, modalShellRef)

  const pushStudyNode = useCallback((nodeId: string) => {
    setStudyStack((prev) => (prev[prev.length - 1] === nodeId ? prev : [...prev, nodeId]))
  }, [])
  const popStudyNode = useCallback(() => {
    setStudyStack((prev) => prev.slice(0, -1))
  }, [])
  const exitStudy = useCallback(() => setStudyStack([]), [])

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

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#04060a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`System: ${system.title}`}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        {studyStack.length > 0 ? (
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

        <div className="shrink-0 space-y-1">
          <h1 className="text-[22px] font-black leading-tight tracking-tight text-white">{system.title}</h1>
          <p className="text-sm leading-6 text-white/55">{system.summary}</p>
          <p className="text-xs font-semibold text-white/38">
            {system.nodes.length} steps · {system.edges.length} links
            {system.visibility === 'public' ? ' · Public' : ' · Private'}
          </p>
          {system.visibility === 'public' && (onOpenForkers || onOpenComments) ? (
            <div className="!mt-2.5 flex flex-wrap items-center gap-1.5">
              {onOpenForkers ? (
                <button
                  type="button"
                  onClick={onOpenForkers}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/78 hover:bg-white/[0.08]"
                  aria-label={typeof forkCount === 'number' ? `View ${forkCount} forks` : 'View forks'}
                >
                  <GitFork className="h-3.5 w-3.5" />
                  <span>{typeof forkCount === 'number' ? `${forkCount} ${forkCount === 1 ? 'fork' : 'forks'}` : 'Forks'}</span>
                </button>
              ) : null}
              {onOpenComments ? (
                <button
                  type="button"
                  onClick={onOpenComments}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/78 hover:bg-white/[0.08]"
                  aria-label="Open comments"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Comments</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0a0e18] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="aspect-[4/3] w-full">
              <SystemGraphCanvas
                variant="reader"
                nodes={system.nodes}
                edges={system.edges}
                positions={positions}
                className="h-full w-full"
                viewportGestures
                reduceMotion={reduceMotion}
                keyboardFocusNodeId={selectedNodeId ?? system.nodes[0]?.id ?? null}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>
            <p className="border-t border-white/8 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Tap a step · pinch to zoom · drag to pan · details below
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#8cabff]" />
              <p className="text-sm font-bold text-white/80">Selected step</p>
            </div>
            {selectedNode ? (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-black text-white">{selectedNode.label}</p>
                  <button
                    type="button"
                    onClick={() => pushStudyNode(selectedNode.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 py-1.5 text-xs font-bold text-[#b8c9ff]"
                    aria-label={`Study ${selectedNode.label}`}
                  >
                    <ScanSearch className="h-3.5 w-3.5" />
                    Study
                  </button>
                </div>
                {selectedNode.trigger ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Trigger</p>
                    <p className="mt-1 text-sm leading-6 text-white/85">{selectedNode.trigger}</p>
                  </div>
                ) : null}
                {selectedNode.details ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Details</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{selectedNode.details}</p>
                  </div>
                ) : null}
                {selectedNode.commonMistake ? (
                  <div className="mt-3 rounded-[14px] border border-amber-400/25 bg-amber-400/08 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200/80">Common mistake</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{selectedNode.commonMistake}</p>
                  </div>
                ) : null}
                {selectedNode.videoUrl ? (
                  <div className="mt-3">
                    <a
                      href={buildVideoHref(selectedNode.videoUrl, selectedNode.videoTimestampSeconds)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/[0.09]"
                    >
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        Video
                        {typeof selectedNode.videoTimestampSeconds === 'number' && selectedNode.videoTimestampSeconds > 0
                          ? ` · ${formatSeconds(selectedNode.videoTimestampSeconds)}`
                          : ''}
                      </span>
                    </a>
                  </div>
                ) : null}
                {linkedForSelected.mode === 'owner' && linkedForSelected.ownerTechniques.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Linked from your library</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {linkedForSelected.ownerTechniques.map((technique) => (
                        <button
                          key={technique.id}
                          type="button"
                          onClick={() => onOpenTechnique(technique.id)}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 py-1.5 text-xs font-bold text-[#b8c9ff]"
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{technique.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : linkedForSelected.mode === 'owner' ? (
                  <p className="mt-2 text-sm text-white/45">No techniques linked to this step yet. Edit the system to attach some.</p>
                ) : linkedForSelected.viewerTitles.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Techniques referenced (titles)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {linkedForSelected.viewerTitles.map((title) => (
                        <span
                          key={title}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/75"
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/45">No technique titles saved for this step.</p>
                )}
              </div>
            ) : (
              <p className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
                Tap a node on the map to see details here.
              </p>
            )}

            {isOwner && system.nodes.length > 0 ? (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">All linked techniques</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(
                    new Map(
                      system.nodes.flatMap((node) =>
                        (node.linkedTechniqueIds ?? []).map((tid) => {
                          const technique = techniqueById.get(tid)
                          if (!technique) return null
                          return [technique.id, { technique, nodeId: node.id }] as const
                        }),
                      ).filter((entry): entry is readonly [string, { technique: BjjTechnique; nodeId: string }] => entry != null),
                    ).values(),
                  ).map(({ technique, nodeId }) => (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => onOpenTechnique(technique.id)}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
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
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Technique titles in this system</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewerTitleRollup.map((title) => (
                    <span
                      key={title}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-white/70"
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{title}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
