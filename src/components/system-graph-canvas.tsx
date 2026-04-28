'use client'

import { Maximize2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SystemGraphEdgeModel = { from: string; to: string; label?: string | null }

export type SystemGraphNodeModel = {
  id: string
  label: string
  color: string
}

export type GraphViewport = { minX: number; minY: number; width: number; height: number }
export type GraphDensity = 'compact' | 'comfortable' | 'hero'
export type GraphLabelMode = 'auto' | 'full' | 'none'

export const GRAPH_VIEWBOX_SIZE = 100
const VB = GRAPH_VIEWBOX_SIZE
const MIN_VIEW_SIZE = 12
const MAX_VIEW_SIZE = 100

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function normalizeGraphEdgeKey(from: string, to: string): string {
  return `${from}->${to}`
}

export function truncateGraphLabel(label: string, max = 16): string {
  const trimmed = label.trim() || 'Step'
  return trimmed.length > max ? `${trimmed.slice(0, Math.max(1, max - 1))}...` : trimmed
}

function truncateEdgeLabel(label: string, max = 28) {
  const trimmed = label.trim()
  return trimmed.length > max ? `${trimmed.slice(0, Math.max(1, max - 1))}...` : trimmed
}

export function fitGraphViewport(
  nodes: SystemGraphNodeModel[],
  positions: Record<string, { x: number; y: number }>,
  padding = 12,
): GraphViewport {
  const points = nodes
    .map((node) => positions[node.id])
    .filter((point): point is { x: number; y: number } => Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y)))
    .map((point) => ({ x: clamp(point.x * VB, 0, VB), y: clamp(point.y * VB, 0, VB) }))

  if (points.length === 0) return resetGraphViewport()

  let minX = Math.min(...points.map((point) => point.x)) - padding
  let maxX = Math.max(...points.map((point) => point.x)) + padding
  let minY = Math.min(...points.map((point) => point.y)) - padding
  let maxY = Math.max(...points.map((point) => point.y)) + padding

  let width = clamp(maxX - minX, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
  let height = clamp(maxY - minY, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
  const side = clamp(Math.max(width, height), MIN_VIEW_SIZE, MAX_VIEW_SIZE)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  width = side
  height = side
  minX = clamp(cx - width / 2, 0, VB - width)
  minY = clamp(cy - height / 2, 0, VB - height)

  return { minX, minY, width, height }
}

function edgePath(ax: number, ay: number, bx: number, by: number): string {
  const dx = bx - ax
  const dy = by - ay
  const cx1 = ax + dx * 0.36
  const cx2 = bx - dx * 0.36
  const lift = clamp(Math.abs(dx) * 0.05, 0, 3) * Math.sign(dy || 1)
  return `M ${ax} ${ay} C ${cx1} ${ay - lift} ${cx2} ${by + lift} ${bx} ${by}`
}

/** Point on cubic curve matching edgePath control points, t in [0,1]. */
function cubicMidpoint(ax: number, ay: number, bx: number, by: number, t = 0.5): { x: number; y: number } {
  const dx = bx - ax
  const dy = by - ay
  const p0x = ax
  const p0y = ay
  const p1x = ax + dx * 0.36
  const p1y = ay - clamp(Math.abs(dx) * 0.05, 0, 3) * Math.sign(dy || 1)
  const p2x = bx - dx * 0.36
  const p2y = by + clamp(Math.abs(dx) * 0.05, 0, 3) * Math.sign(dy || 1)
  const p3x = bx
  const p3y = by
  const mt = 1 - t
  const x = mt ** 3 * p0x + 3 * mt ** 2 * t * p1x + 3 * mt * t ** 2 * p2x + t ** 3 * p3x
  const y = mt ** 3 * p0y + 3 * mt ** 2 * t * p1y + 3 * mt * t ** 2 * p2y + t ** 3 * p3y
  return { x, y }
}

export type SystemGraphCanvasProps = {
  nodes: SystemGraphNodeModel[]
  edges: SystemGraphEdgeModel[]
  /** Normalized 0-1 positions keyed by node id */
  positions: Record<string, { x: number; y: number }>
  className?: string
  variant?: 'preview' | 'reader' | 'editor'
  selectedNodeId?: string | null
  selectedEdgeKey?: string | null
  highlightedNodeIds?: string[]
  highlightedEdgeKeys?: string[]
  linkSourceId?: string | null
  linkPickActive?: boolean
  /** Pinch, wheel zoom, and pan on the background (reader + editor). */
  viewportGestures?: boolean
  /** Softer zoom increments and no glow filter when user prefers reduced motion. */
  reduceMotion?: boolean
  density?: GraphDensity
  labelMode?: GraphLabelMode
  showGrid?: boolean
  showControls?: boolean
  showMiniMap?: boolean
  dimUnhighlighted?: boolean
  flowAnimation?: boolean
  showNodeIndex?: boolean
  fitToViewSignal?: number
  resetViewportSignal?: number
  /** Fires when the user begins dragging a node (editor); use for undo history. */
  onNodeDragStart?: () => void
  /** Single tab stop inside the graph (roving tabindex). Prefer selected node, else first node. */
  keyboardFocusNodeId?: string | null
  onSelectNode?: (id: string | null) => void
  onSelectEdge?: (edgeKey: string | null) => void
  onLinkNodes?: (from: string, to: string) => void
  onNodePosition?: (id: string, pos: { x: number; y: number }) => void
  onBackgroundPointerDown?: () => void
  /** Called when viewport changes (for reset UI) */
  onViewportChange?: (viewport: GraphViewport) => void
}

const DEFAULT_VP: GraphViewport = { minX: 0, minY: 0, width: VB, height: VB }

const NODE_DENSITY: Record<GraphDensity, { minW: number; maxW: number; h: number; font: number; labelMax: number }> = {
  compact: { minW: 18, maxW: 27, h: 8.8, font: 2.7, labelMax: 13 },
  comfortable: { minW: 24, maxW: 38, h: 11.2, font: 3.05, labelMax: 17 },
  hero: { minW: 28, maxW: 46, h: 12.4, font: 3.2, labelMax: 22 },
}

export function SystemGraphCanvas({
  nodes,
  edges,
  positions,
  className,
  variant = 'preview',
  selectedNodeId,
  selectedEdgeKey,
  highlightedNodeIds = [],
  highlightedEdgeKeys = [],
  linkSourceId,
  linkPickActive = false,
  viewportGestures = false,
  reduceMotion = false,
  density = variant === 'preview' ? 'compact' : 'comfortable',
  labelMode = 'auto',
  showGrid = variant !== 'preview',
  showControls = variant !== 'preview',
  showMiniMap = variant !== 'preview',
  dimUnhighlighted = false,
  flowAnimation = false,
  showNodeIndex = false,
  fitToViewSignal,
  resetViewportSignal,
  onNodeDragStart,
  keyboardFocusNodeId = null,
  onSelectNode,
  onSelectEdge,
  onLinkNodes,
  onNodePosition,
  onBackgroundPointerDown,
  onViewportChange,
}: SystemGraphCanvasProps) {
  const interactive = variant === 'editor'
  const readerSelect = variant === 'reader'
  const reactId = useId().replaceAll(':', '')
  const arrowId = `system-graph-arrow-${reactId}`
  const arrowHotId = `system-graph-arrow-hot-${reactId}`
  const glowId = `system-graph-glow-${reactId}`
  const gridId = `system-graph-grid-${reactId}`

  const rovingTabId = useMemo(() => {
    if (!interactive && !readerSelect) return null
    if (keyboardFocusNodeId && nodes.some((n) => n.id === keyboardFocusNodeId)) {
      return keyboardFocusNodeId
    }
    return nodes[0]?.id ?? null
  }, [interactive, readerSelect, keyboardFocusNodeId, nodes])

  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds])
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeKeys), [highlightedEdgeKeys])
  const dimActive = dimUnhighlighted && (highlightedNodeSet.size > 0 || highlightedEdgeSet.size > 0 || selectedNodeId != null || selectedEdgeKey != null)
  const nodeDensity = NODE_DENSITY[density]
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; orig: { x: number; y: number } } | null>(null)
  const panRef = useRef<{ startClientX: number; startClientY: number; startVp: GraphViewport } | null>(null)
  const pinchRef = useRef<{
    distance: number
    viewport: GraphViewport
  } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VP)

  const fitViewport = useCallback(() => {
    setViewport(fitGraphViewport(nodes, positions))
  }, [nodes, positions])

  const resetViewport = useCallback(() => {
    setViewport(DEFAULT_VP)
  }, [])

  useEffect(() => {
    onViewportChange?.(viewport)
  }, [viewport, onViewportChange])

  useEffect(() => {
    if (typeof fitToViewSignal === 'number') fitViewport()
  }, [fitToViewSignal, fitViewport])

  useEffect(() => {
    if (typeof resetViewportSignal === 'number') resetViewport()
  }, [resetViewportSignal, resetViewport])

  useEffect(() => {
    // Reset viewport when the parent disables gestures (e.g. switching graphs).
    if (!viewportGestures) setViewport(DEFAULT_VP)
  }, [viewportGestures])

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0.5, y: 0.5 }
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0.5, y: 0.5 }
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const p = pt.matrixTransform(ctm.inverse())
      return { x: clamp(p.x / VB, 0.02, 0.98), y: clamp(p.y / VB, 0.02, 0.98) }
    },
    [],
  )

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      if (!viewportGestures) return
      event.preventDefault()
      const factor = reduceMotion ? (event.deltaY < 0 ? 0.97 : 1.03) : event.deltaY < 0 ? 0.91 : 1.1
      setViewport((previous) => {
        const cx = previous.minX + previous.width / 2
        const cy = previous.minY + previous.height / 2
        const nextW = clamp(previous.width * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
        const nextH = clamp(previous.height * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
        let minX = cx - nextW / 2
        let minY = cy - nextH / 2
        minX = clamp(minX, 0, VB - nextW)
        minY = clamp(minY, 0, VB - nextH)
        return { minX, minY, width: nextW, height: nextH }
      })
    },
    [viewportGestures, reduceMotion],
  )

  const handleNodePointerDown = useCallback(
    (nodeId: string, event: React.PointerEvent) => {
      if (readerSelect) {
        event.stopPropagation()
        onSelectEdge?.(null)
        onSelectNode?.(nodeId)
        return
      }
      if (!interactive) return
      event.stopPropagation()
      const pos = positions[nodeId]
      if (!pos) return

      if (linkPickActive) {
        if (!linkSourceId) {
          onSelectEdge?.(null)
          onSelectNode?.(nodeId)
          return
        }
        if (linkSourceId === nodeId) {
          onSelectNode?.(null)
          return
        }
        onLinkNodes?.(linkSourceId, nodeId)
        onSelectNode?.(null)
        return
      }

      onSelectEdge?.(null)
      onSelectNode?.(nodeId)
      onNodeDragStart?.()
      ;(event.target as Element).setPointerCapture?.(event.pointerId)
      dragRef.current = {
        id: nodeId,
        startX: event.clientX,
        startY: event.clientY,
        orig: { ...pos },
      }
    },
    [interactive, linkPickActive, linkSourceId, onLinkNodes, onNodeDragStart, onSelectEdge, onSelectNode, positions, readerSelect],
  )

  const handleEdgePointerDown = useCallback(
    (edgeKey: string, event: React.PointerEvent) => {
      if (!onSelectEdge || linkPickActive) return
      event.stopPropagation()
      onSelectNode?.(null)
      onSelectEdge(edgeKey)
    },
    [linkPickActive, onSelectEdge, onSelectNode],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (viewportGestures && pinchRef.current && pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()]
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const base = pinchRef.current
        const ratio = d / base.distance
        if (ratio > 0 && Number.isFinite(ratio)) {
          const pinchClamp = reduceMotion ? { lo: 0.85, hi: 1.18 } : { lo: 0.5, hi: 2 }
          const factor = 1 / clamp(ratio, pinchClamp.lo, pinchClamp.hi)
          setViewport((previous) => {
            const cx = previous.minX + previous.width / 2
            const cy = previous.minY + previous.height / 2
            const nextW = clamp(previous.width * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
            const nextH = clamp(previous.height * factor, MIN_VIEW_SIZE, MAX_VIEW_SIZE)
            let minX = cx - nextW / 2
            let minY = cy - nextH / 2
            minX = clamp(minX, 0, VB - nextW)
            minY = clamp(minY, 0, VB - nextH)
            return { minX, minY, width: nextW, height: nextH }
          })
          pinchRef.current = { ...base, distance: d }
        }
        return
      }

      const pan = panRef.current
      if (viewportGestures && pan && !dragRef.current) {
        const svg = svgRef.current
        if (!svg) return
        const dxPx = event.clientX - pan.startClientX
        const dyPx = event.clientY - pan.startClientY
        const w = svg.clientWidth
        const h = svg.clientHeight
        if (w <= 0 || h <= 0) return
        const dVx = (-dxPx / w) * pan.startVp.width
        const dVy = (-dyPx / h) * pan.startVp.height
        setViewport(() => {
          let minX = pan.startVp.minX + dVx
          let minY = pan.startVp.minY + dVy
          minX = clamp(minX, 0, VB - pan.startVp.width)
          minY = clamp(minY, 0, VB - pan.startVp.height)
          return { ...pan.startVp, minX, minY }
        })
        return
      }

      const drag = dragRef.current
      if (!drag || !interactive) return
      const world = toWorld(event.clientX, event.clientY)
      onNodePosition?.(drag.id, world)
    },
    [interactive, onNodePosition, toWorld, viewportGestures, reduceMotion],
  )

  const handleNodeKeyDown = useCallback(
    (nodeId: string, event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (readerSelect) {
        onSelectEdge?.(null)
        onSelectNode?.(nodeId)
        return
      }
      if (!interactive) return
      if (linkPickActive) {
        if (!linkSourceId) {
          onSelectEdge?.(null)
          onSelectNode?.(nodeId)
          return
        }
        if (linkSourceId === nodeId) {
          onSelectNode?.(null)
          return
        }
        onLinkNodes?.(linkSourceId, nodeId)
        onSelectNode?.(null)
        return
      }
      onSelectEdge?.(null)
      onSelectNode?.(nodeId)
    },
    [interactive, linkPickActive, linkSourceId, onLinkNodes, onSelectEdge, onSelectNode, readerSelect],
  )

  const endPanPinch = useCallback(() => {
    panRef.current = null
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  const handlePanRectDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return

      if (!viewportGestures) {
        onBackgroundPointerDown?.()
        if (readerSelect) onSelectNode?.(null)
        if (interactive && !linkPickActive && !linkSourceId) onSelectNode?.(null)
        onSelectEdge?.(null)
        return
      }

      if (!pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      }

      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()]
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        pinchRef.current = { distance: d, viewport }
        panRef.current = null
      } else if (pointersRef.current.size === 1 && !linkPickActive) {
        panRef.current = { startClientX: event.clientX, startClientY: event.clientY, startVp: { ...viewport } }
        event.preventDefault()
        ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
      }

      onBackgroundPointerDown?.()
      if (readerSelect) onSelectNode?.(null)
      if (interactive && !linkPickActive && !linkSourceId) onSelectNode?.(null)
      onSelectEdge?.(null)
    },
    [viewportGestures, viewport, linkPickActive, linkSourceId, onBackgroundPointerDown, onSelectNode, onSelectEdge, readerSelect, interactive],
  )

  const handlePointerMoveRoot = useCallback(
    (event: React.PointerEvent) => {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      }
      handlePointerMove(event)
    },
    [handlePointerMove],
  )

  const handlePointerUpRoot = useCallback(
    (event: React.PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      if (pointersRef.current.size < 2) {
        pinchRef.current = null
      }
      if (pointersRef.current.size === 0) {
        endPanPinch()
      }
      endDrag()
    },
    [endDrag, endPanPinch],
  )

  const viewBoxStr = `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`

  const graphAriaLabel =
    variant === 'editor'
      ? 'System flow graph editor. Drag steps to move them. Use link mode to connect steps. Pinch or scroll to zoom, drag the background to pan.'
      : variant === 'reader'
        ? 'System flow graph. Select a step for details. Pinch or scroll to zoom, drag the background to pan.'
        : 'System flow preview'

  const renderLabels = labelMode !== 'none'

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        role={interactive || readerSelect ? 'application' : 'img'}
        aria-label={graphAriaLabel}
        className={cn(
          'absolute inset-0 h-full w-full touch-none select-none',
          interactive && !linkPickActive ? 'cursor-grab active:cursor-grabbing' : '',
          readerSelect ? 'cursor-pointer' : '',
          viewportGestures ? 'touch-pan-y' : '',
        )}
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onPointerMove={handlePointerMoveRoot}
        onPointerUp={handlePointerUpRoot}
        onPointerCancel={handlePointerUpRoot}
      >
        <defs>
          <radialGradient id={`system-graph-bg-${reactId}`} cx="50%" cy="18%" r="72%">
            <stop offset="0%" stopColor="rgba(77,124,255,0.24)" />
            <stop offset="46%" stopColor="rgba(12,17,29,0.68)" />
            <stop offset="100%" stopColor="rgba(3,6,12,1)" />
          </radialGradient>
          <pattern id={gridId} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="0.22" />
          </pattern>
          <filter id={glowId} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="1.15" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id={arrowId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 5 2.5 L 0 5 z" fill="rgba(126,164,255,0.58)" />
          </marker>
          <marker id={arrowHotId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 5 2.5 L 0 5 z" fill="rgba(220,232,255,0.96)" />
          </marker>
        </defs>

        <rect width={VB} height={VB} fill={`url(#system-graph-bg-${reactId})`} />
        {showGrid ? <rect width={VB} height={VB} fill={`url(#${gridId})`} opacity={variant === 'preview' ? 0.45 : 1} /> : null}
        <path d="M 6 86 C 26 76 41 94 62 82 C 76 74 83 78 94 68" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.2" />

        <rect
          data-graph-pan
          width={VB}
          height={VB}
          fill="transparent"
          style={{ pointerEvents: viewportGestures || interactive || readerSelect ? 'auto' : 'none' }}
          onPointerDown={handlePanRectDown}
        />

        <g>
          {edges.map((edge) => {
            const a = positions[edge.from]
            const b = positions[edge.to]
            if (!a || !b) return null
            const ax = a.x * VB
            const ay = a.y * VB
            const bx = b.x * VB
            const by = b.y * VB
            const d = edgePath(ax, ay, bx, by)
            const mid = cubicMidpoint(ax, ay, bx, by, 0.52)
            const label = edge.label?.trim()
            const key = normalizeGraphEdgeKey(edge.from, edge.to)
            const selected = selectedEdgeKey === key
            const connected = selectedNodeId != null && (edge.from === selectedNodeId || edge.to === selectedNodeId)
            const highlighted = highlightedEdgeSet.has(key) || highlightedNodeSet.has(edge.from) || highlightedNodeSet.has(edge.to)
            const hot = selected || highlighted || connected
            const dimmed = dimActive && !hot
            return (
              <g key={key} opacity={dimmed ? 0.24 : 1}>
                <path
                  d={d}
                  fill="none"
                  stroke={hot ? 'rgba(205,220,255,0.92)' : 'rgba(126,164,255,0.34)'}
                  strokeWidth={hot ? 1.25 : 0.72}
                  strokeLinecap="round"
                  markerEnd={`url(#${hot ? arrowHotId : arrowId})`}
                  filter={!reduceMotion && hot ? `url(#${glowId})` : undefined}
                  style={{ pointerEvents: 'none' }}
                />
                {flowAnimation && hot && !reduceMotion ? (
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.74)"
                    strokeWidth={0.62}
                    strokeLinecap="round"
                    strokeDasharray="2.4 4.6"
                    markerEnd={`url(#${arrowHotId})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.25s" repeatCount="indefinite" />
                  </path>
                ) : null}
                {onSelectEdge ? (
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={6}
                    strokeLinecap="round"
                    onPointerDown={(event) => handleEdgePointerDown(key, event)}
                    style={{ pointerEvents: linkPickActive ? 'none' : 'auto' }}
                  />
                ) : null}
                {label && renderLabels ? (
                  <g transform={`translate(${mid.x} ${mid.y})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x={-Math.min(20, label.length * 0.9 + 4) / 2}
                      y={-3.3}
                      width={Math.min(20, label.length * 0.9 + 4)}
                      height={6.3}
                      rx={2.7}
                      fill={hot ? 'rgba(40,56,94,0.86)' : 'rgba(8,12,22,0.72)'}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={0.22}
                    />
                    <text
                      y={0.9}
                      fill={hot ? 'rgba(242,246,255,0.95)' : 'rgba(200,214,255,0.78)'}
                      fontSize={2.35}
                      fontWeight={700}
                      fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                      textAnchor="middle"
                    >
                      {truncateEdgeLabel(label)}
                    </text>
                  </g>
                ) : null}
              </g>
            )
          })}
        </g>

        {nodes.map((node, index) => {
          const pos = positions[node.id]
          if (!pos) return null
          const cx = pos.x * VB
          const cy = pos.y * VB
          const labelMax = labelMode === 'full' ? nodeDensity.labelMax + 5 : nodeDensity.labelMax
          const label = truncateGraphLabel(node.label, labelMode === 'none' ? 1 : labelMax)
          const indexPad = showNodeIndex ? 4 : 0
          const w = clamp(12 + indexPad + label.length * 1.18, nodeDensity.minW + indexPad, nodeDensity.maxW + indexPad)
          const h = nodeDensity.h
          const selected = selectedNodeId === node.id
          const linkHot = linkSourceId === node.id
          const highlighted = highlightedNodeSet.has(node.id)
          const hot = selected || linkHot || highlighted
          const dimmed = dimActive && !hot
          const fillRgb = `${node.color}${hot ? '7a' : '58'}`
          const nodeAriaLabel =
            `${node.label?.trim() || 'Step'}${selected ? ', selected' : ''}${linkHot ? ', link source' : ''}`
          return (
            <g
              key={node.id}
              transform={`translate(${cx - w / 2} ${cy - h / 2})`}
              style={{ pointerEvents: 'auto' }}
              opacity={dimmed ? 0.32 : 1}
              role={interactive || readerSelect ? 'button' : undefined}
              tabIndex={rovingTabId != null && node.id === rovingTabId ? 0 : -1}
              aria-label={nodeAriaLabel}
              onKeyDown={(event) => handleNodeKeyDown(node.id, event)}
            >
              <rect
                x={1.1}
                y={1.4}
                width={w - 2.2}
                height={h - 1.2}
                rx={h / 2.6}
                fill="rgba(0,0,0,0.22)"
                opacity={0.7}
              />
              <rect
                width={w}
                height={h}
                rx={h / 2.8}
                fill={fillRgb}
                stroke={
                  linkHot ? 'rgba(255,255,255,0.98)' : selected ? 'rgba(255,255,255,0.68)' : highlighted ? 'rgba(184,201,255,0.75)' : 'rgba(255,255,255,0.2)'
                }
                strokeWidth={linkHot ? 0.6 : selected || highlighted ? 0.5 : 0.28}
                filter={!reduceMotion && hot ? `url(#${glowId})` : undefined}
                onPointerDown={(event) => handleNodePointerDown(node.id, event)}
                style={{ pointerEvents: interactive || readerSelect ? 'auto' : 'none' }}
              />
              {showNodeIndex ? (
                <g transform={`translate(${4.8} ${h / 2})`} aria-hidden>
                  <circle r={2.35} fill={hot ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.74)'} />
                  <text
                    y={0.68}
                    fill="rgba(4,7,13,0.94)"
                    fontSize={2.35}
                    fontWeight={900}
                    fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {Math.min(index + 1, 99)}
                  </text>
                </g>
              ) : (
                <circle cx={4.2} cy={h / 2} r={1.2} fill="rgba(255,255,255,0.76)" opacity={hot ? 1 : 0.62} />
              )}
              {renderLabels ? (
                <text
                  x={showNodeIndex ? w / 2 + 2.4 : w / 2 + 1.2}
                  y={h / 2 + nodeDensity.font * 0.35}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.95)"
                  fontSize={nodeDensity.font}
                  fontWeight={800}
                  fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      {showControls && viewportGestures ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1.5">
          <button
            type="button"
            onClick={fitViewport}
            title="Fit graph"
            aria-label="Fit graph"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#07101f]/86 text-white/78 shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[#132343] hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetViewport}
            title="Reset zoom"
            aria-label="Reset zoom"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#07101f]/86 text-white/78 shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[#132343] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {showMiniMap && viewportGestures && nodes.length > 1 ? (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 h-14 w-20 rounded-[12px] border border-white/10 bg-[#050914]/82 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.38)] backdrop-blur-md">
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
            <rect x="0" y="0" width="100" height="100" rx="12" fill="rgba(255,255,255,0.035)" />
            {edges.map((edge) => {
              const a = positions[edge.from]
              const b = positions[edge.to]
              if (!a || !b) return null
              return (
                <line
                  key={normalizeGraphEdgeKey(edge.from, edge.to)}
                  x1={a.x * 100}
                  y1={a.y * 100}
                  x2={b.x * 100}
                  y2={b.y * 100}
                  stroke="rgba(139,172,255,0.32)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              )
            })}
            {nodes.map((node) => {
              const pos = positions[node.id]
              if (!pos) return null
              return (
                <circle
                  key={node.id}
                  cx={pos.x * 100}
                  cy={pos.y * 100}
                  r={selectedNodeId === node.id ? 4.4 : 3.2}
                  fill={node.color}
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth={selectedNodeId === node.id ? 1.8 : 0.8}
                />
              )
            })}
            <rect
              x={viewport.minX}
              y={viewport.minY}
              width={viewport.width}
              height={viewport.height}
              fill="rgba(77,124,255,0.08)"
              stroke="rgba(210,224,255,0.72)"
              strokeWidth="2"
              rx="3"
            />
          </svg>
        </div>
      ) : null}
    </div>
  )
}

export function resetGraphViewport(): GraphViewport {
  return { ...DEFAULT_VP }
}
