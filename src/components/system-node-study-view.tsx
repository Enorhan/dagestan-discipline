'use client'

import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, CornerDownRight, PlayCircle } from 'lucide-react'
import { useMemo } from 'react'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { BjjSystem, BjjTechnique } from '@/lib/bjj-types'
import { computeGraphLayout } from '@/lib/system-graph-layout'

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

export function SystemNodeStudyView({
  system,
  stack,
  isOwner,
  libraryTechniques,
  onPush,
  onPop,
  onExit,
  onOpenTechnique,
}: {
  system: BjjSystem
  stack: string[]
  isOwner: boolean
  libraryTechniques: BjjTechnique[]
  onPush: (nodeId: string) => void
  onPop: () => void
  onExit: () => void
  onOpenTechnique: (techniqueId: string) => void
}) {
  const reduceMotion = useReducedMotion()
  const currentId = stack[stack.length - 1] ?? null
  const current = useMemo(
    () => system.nodes.find((node) => node.id === currentId) ?? null,
    [currentId, system.nodes],
  )

  const incoming = useMemo(() => {
    if (!current) return [] as Array<{ node: BjjSystem['nodes'][number]; label?: string | null }>
    const out: Array<{ node: BjjSystem['nodes'][number]; label?: string | null }> = []
    for (const edge of system.edges) {
      if (edge.to !== current.id) continue
      const n = system.nodes.find((x) => x.id === edge.from)
      if (n) out.push({ node: n, label: edge.label })
    }
    return out
  }, [current, system.edges, system.nodes])

  const outgoing = useMemo(() => {
    if (!current) return [] as Array<{ node: BjjSystem['nodes'][number]; label?: string | null }>
    const out: Array<{ node: BjjSystem['nodes'][number]; label?: string | null }> = []
    for (const edge of system.edges) {
      if (edge.from !== current.id) continue
      const n = system.nodes.find((x) => x.id === edge.to)
      if (n) out.push({ node: n, label: edge.label })
    }
    return out
  }, [current, system.edges, system.nodes])

  const neighborhood = useMemo(() => {
    if (!current) return { nodes: [], edges: [] }
    const ids = new Set<string>([current.id, ...incoming.map((e) => e.node.id), ...outgoing.map((e) => e.node.id)])
    const nodes = system.nodes.filter((n) => ids.has(n.id))
    const edges = system.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
    return { nodes, edges }
  }, [current, incoming, outgoing, system.edges, system.nodes])

  const positions = useMemo(() => {
    const base = computeGraphLayout(neighborhood.nodes, neighborhood.edges)
    const out = { ...base }
    for (const node of neighborhood.nodes) {
      if (node.layout) out[node.id] = { x: node.layout.x, y: node.layout.y }
    }
    return out
  }, [neighborhood.nodes, neighborhood.edges])

  const linkedTechniques = useMemo(() => {
    if (!current || !isOwner) return [] as BjjTechnique[]
    const ids = current.linkedTechniqueIds ?? []
    return ids
      .map((id) => libraryTechniques.find((t) => t.id === id))
      .filter((t): t is BjjTechnique => t != null)
  }, [current, isOwner, libraryTechniques])

  const linkedTitles = useMemo(() => {
    if (!current || isOwner) return [] as string[]
    return Array.from(
      new Set(
        (current.linkedTechniqueTitles ?? [])
          .map((title) => title?.trim())
          .filter((title): title is string => Boolean(title)),
      ),
    )
  }, [current, isOwner])

  if (!current) return null

  const canPop = stack.length > 1

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <button
          type="button"
          onClick={canPop ? onPop : onExit}
          className="inline-flex items-center gap-2 text-base font-semibold text-white/90"
          aria-label={canPop ? 'Back to previous step' : 'Back to system map'}
        >
          {canPop ? <ChevronLeft className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          {canPop ? 'Back' : 'Map'}
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Study · {stack.length}</p>
      </header>

	      <div className="shrink-0 space-y-1">
	        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
	          <div className="flex items-center gap-2">
	            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: current.color }} aria-hidden />
	            <h1 className="text-[22px] font-black leading-tight tracking-tight text-white">{current.label}</h1>
	          </div>
	          <p className="mt-2 text-xs font-semibold text-white/38">{incoming.length} incoming · {outgoing.length} outgoing</p>
	        </div>
	      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <StudyBody
          current={current}
          incoming={incoming}
          outgoing={outgoing}
          neighborhood={neighborhood}
          positions={positions}
          reduceMotion={reduceMotion}
          linkedTechniques={linkedTechniques}
          linkedTitles={linkedTitles}
          onPush={onPush}
          onOpenTechnique={onOpenTechnique}
        />
      </div>
    </div>
  )
}



type StudyBodyNeighborhood = { nodes: BjjSystem['nodes']; edges: BjjSystem['edges'] }

function StudyBody({
  current,
  incoming,
  outgoing,
  neighborhood,
  positions,
  reduceMotion,
  linkedTechniques,
  linkedTitles,
  onPush,
  onOpenTechnique,
}: {
  current: BjjSystem['nodes'][number]
  incoming: Array<{ node: BjjSystem['nodes'][number]; label?: string | null }>
  outgoing: Array<{ node: BjjSystem['nodes'][number]; label?: string | null }>
  neighborhood: StudyBodyNeighborhood
  positions: Record<string, { x: number; y: number }>
  reduceMotion: boolean
  linkedTechniques: BjjTechnique[]
  linkedTitles: string[]
  onPush: (nodeId: string) => void
  onOpenTechnique: (techniqueId: string) => void
}) {
  return (
    <div className="space-y-4 pb-2">
	      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#050914] shadow-[0_20px_58px_rgba(0,0,0,0.42)]">
	        <div className="aspect-[5/4] w-full">
	          <SystemGraphCanvas
	            variant="reader"
	            nodes={neighborhood.nodes}
	            edges={neighborhood.edges}
	            positions={positions}
	            className="h-full w-full"
	            viewportGestures={false}
	            reduceMotion={reduceMotion}
	            density="hero"
	            showControls={false}
	            showMiniMap={false}
	            keyboardFocusNodeId={current.id}
	            selectedNodeId={current.id}
	            onSelectNode={(id) => {
	              if (id && id !== current.id) onPush(id)
	            }}
	          />
	        </div>
	      </div>

	      {(incoming.length > 0 || outgoing.length > 0) ? (
	        <div className="grid gap-3">
	          {incoming.length > 0 ? (
	            <EdgeList title="Coming from" edges={incoming} onPush={onPush} />
	          ) : null}
	          {outgoing.length > 0 ? (
	            <EdgeList title="Leads to" edges={outgoing} onPush={onPush} />
	          ) : null}
	        </div>
	      ) : (
	        <p className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
	          No connections yet.
	        </p>
	      )}

      {current.trigger ? (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Trigger</p>
          <p className="mt-1 text-sm leading-6 text-white/85">{current.trigger}</p>
        </div>
      ) : null}

      {current.details ? (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Details</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{current.details}</p>
        </div>
      ) : null}

      {current.commonMistake ? (
        <div className="rounded-[18px] border border-amber-400/25 bg-amber-400/08 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200/80">Common mistake</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{current.commonMistake}</p>
        </div>
      ) : null}

	      {current.videoUrl ? (
	        <a
          href={buildVideoHref(current.videoUrl, current.videoTimestampSeconds)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white/85 hover:bg-white/[0.09]"
        >
          <PlayCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Watch video
            {typeof current.videoTimestampSeconds === 'number' && current.videoTimestampSeconds > 0
              ? ` · ${formatSeconds(current.videoTimestampSeconds)}`
              : ''}
          </span>
        </a>
	      ) : null}

      {linkedTechniques.length > 0 ? (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Linked techniques</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedTechniques.map((technique) => (
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
      ) : linkedTitles.length > 0 ? (
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">Techniques referenced</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedTitles.map((title) => (
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
      ) : null}

	    </div>
	  )
	}


function EdgeList({
  title,
  edges,
  onPush,
}: {
  title: string
  edges: Array<{ node: BjjSystem['nodes'][number]; label?: string | null }>
  onPush: (nodeId: string) => void
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">{title}</p>
      <div className="mt-2 space-y-2">
        {edges.map((edge, index) => (
          <button
            key={`${edge.node.id}-${index}`}
            type="button"
            onClick={() => onPush(edge.node.id)}
            className="flex w-full items-center gap-3 rounded-[12px] border border-white/8 bg-black/30 px-3 py-2.5 text-left hover:bg-white/[0.06]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: edge.node.color }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white/90">{edge.node.label || 'Untitled'}</p>
              {edge.label ? (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-white/55">
                  <CornerDownRight className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{edge.label}</span>
                </p>
              ) : null}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/45" />
          </button>
        ))}
      </div>
    </div>
  )
}
