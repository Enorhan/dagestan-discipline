'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SystemGraphEdgeModel = { from: string; to: string; label?: string | null }

export type SystemGraphNodeModel = {
  id: string
  label: string
  color: string
}

export type GraphViewport = { minX: number; minY: number; width: number; height: number }

const VB = 100
const MIN_VIEW_SIZE = 12
const MAX_VIEW_SIZE = 100

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function truncateLabel(label: string, max = 16) {
  const trimmed = label.trim() || 'Step'
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

function truncateEdgeLabel(label: string, max = 28) {
  const trimmed = label.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

function edgePath(ax: number, ay: number, bx: number, by: number): string {
  const dx = bx - ax
  const cx1 = ax + dx * 0.35
  const cx2 = bx - dx * 0.35
  return `M ${ax} ${ay} C ${cx1} ${ay} ${cx2} ${by} ${bx} ${by}`
}

/** Point on cubic curve matching edgePath control points, t ∈ [0,1]. */
function cubicMidpoint(ax: number, ay: number, bx: number, by: number, t = 0.5): { x: number; y: number } {
  const dx = bx - ax
  const p0x = ax
  const p0y = ay
  const p1x = ax + dx * 0.35
  const p1y = ay
  const p2x = bx - dx * 0.35
  const p2y = by
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
  /** Normalized 0–1 positions keyed by node id */
  positions: Record<string, { x: number; y: number }>
  className?: string
  variant?: 'preview' | 'reader' | 'editor'
  selectedNodeId?: string | null
  linkSourceId?: string | null
  linkPickActive?: boolean
  /** Pinch, wheel zoom, and pan on the background (reader + editor). */
  viewportGestures?: boolean
  /** Softer zoom increments and no glow filter when user prefers reduced motion. */
  reduceMotion?: boolean
  /** Fires when the user begins dragging a node (editor); use for undo history. */
  onNodeDragStart?: () => void
  /** Single tab stop inside the graph (roving tabindex). Prefer selected node, else first node. */
  keyboardFocusNodeId?: string | null
  onSelectNode?: (id: string | null) => void
  onLinkNodes?: (from: string, to: string) => void
  onNodePosition?: (id: string, pos: { x: number; y: number }) => void
  onBackgroundPointerDown?: () => void
  /** Called when viewport changes (for reset UI) */
  onViewportChange?: (viewport: GraphViewport) => void
}

const DEFAULT_VP: GraphViewport = { minX: 0, minY: 0, width: VB, height: VB }

export function SystemGraphCanvas({
  nodes,
  edges,
  positions,
  className,
  variant = 'preview',
  selectedNodeId,
  linkSourceId,
  linkPickActive = false,
  viewportGestures = false,
  reduceMotion = false,
  onNodeDragStart,
  keyboardFocusNodeId = null,
  onSelectNode,
  onLinkNodes,
  onNodePosition,
  onBackgroundPointerDown,
  onViewportChange,
}: SystemGraphCanvasProps) {
  const interactive = variant === 'editor'
  const readerSelect = variant === 'reader'
  const rovingTabId = useMemo(() => {
    if (!interactive && !readerSelect) return null
    if (keyboardFocusNodeId && nodes.some((n) => n.id === keyboardFocusNodeId)) {
      return keyboardFocusNodeId
    }
    return nodes[0]?.id ?? null
  }, [interactive, readerSelect, keyboardFocusNodeId, nodes])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; orig: { x: number; y: number } } | null>(null)
  const panRef = useRef<{ startClientX: number; startClientY: number; startVp: GraphViewport } | null>(null)
  const pinchRef = useRef<{
    distance: number
    viewport: GraphViewport
  } | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const [viewport, setViewport] = useState<GraphViewport>(DEFAULT_VP)

  useEffect(() => {
    onViewportChange?.(viewport)
  }, [viewport, onViewportChange])

  useEffect(() => {
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
        onSelectNode?.(nodeId)
        return
      }
      if (!interactive) return
      event.stopPropagation()
      const pos = positions[nodeId]
      if (!pos) return

      if (linkPickActive) {
        if (!linkSourceId) {
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
    [interactive, linkPickActive, linkSourceId, onLinkNodes, onNodeDragStart, onSelectNode, positions, readerSelect],
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
        const ctm = svg.getScreenCTM()
        if (!ctm) return
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
        onSelectNode?.(nodeId)
        return
      }
      if (!interactive) return
      if (linkPickActive) {
        if (!linkSourceId) {
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
      onSelectNode?.(nodeId)
    },
    [interactive, linkPickActive, linkSourceId, onLinkNodes, onSelectNode, readerSelect],
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
    },
    [viewportGestures, viewport, linkPickActive, linkSourceId, onBackgroundPointerDown, onSelectNode, readerSelect, interactive],
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

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxStr}
      role={interactive || readerSelect ? 'application' : 'img'}
      aria-label={graphAriaLabel}
      className={cn(
        'touch-none select-none',
        interactive && !linkPickActive ? 'cursor-grab active:cursor-grabbing' : '',
        readerSelect ? 'cursor-pointer' : '',
        viewportGestures ? 'touch-pan-y' : '',
        className,
      )}
      preserveAspectRatio="xMidYMid meet"
      onWheel={handleWheel}
      onPointerMove={handlePointerMoveRoot}
      onPointerUp={handlePointerUpRoot}
      onPointerCancel={handlePointerUpRoot}
    >
      <defs>
        <filter id="system-graph-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Hit layer for pan / deselect (below edges & nodes in hit-test order via pointer-events) */}
      <rect
        data-graph-pan
        width={VB}
        height={VB}
        fill="transparent"
        style={{ pointerEvents: viewportGestures || interactive || readerSelect ? 'auto' : 'none' }}
        onPointerDown={handlePanRectDown}
      />

      <g style={{ pointerEvents: 'none' }}>
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
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={d}
                fill="none"
                stroke="rgba(126,164,255,0.42)"
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              {label ? (
                <text
                  x={mid.x}
                  y={mid.y}
                  fill="rgba(200,214,255,0.78)"
                  fontSize={2.4}
                  fontWeight={600}
                  fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {truncateEdgeLabel(label)}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>

      {nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        const cx = pos.x * VB
        const cy = pos.y * VB
        const w = 26
        const h = 10
        const selected = selectedNodeId === node.id
        const linkHot = linkSourceId === node.id
        const fillRgb = `${node.color}55`
        const nodeAriaLabel =
          `${node.label?.trim() || 'Step'}${selected ? ', selected' : ''}${linkHot ? ', link source' : ''}`
        return (
          <g
            key={node.id}
            transform={`translate(${cx - w / 2} ${cy - h / 2})`}
            style={{ pointerEvents: 'auto' }}
            role={interactive || readerSelect ? 'button' : undefined}
            tabIndex={rovingTabId != null && node.id === rovingTabId ? 0 : -1}
            aria-label={nodeAriaLabel}
            onKeyDown={(event) => handleNodeKeyDown(node.id, event)}
          >
            <rect
              width={w}
              height={h}
              rx={3.2}
              fill={fillRgb}
              stroke={
                linkHot ? 'rgba(255,255,255,0.95)' : selected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'
              }
              strokeWidth={linkHot ? 0.55 : selected ? 0.45 : 0.28}
              filter={!reduceMotion && (selected || linkHot) ? 'url(#system-graph-glow)' : undefined}
              onPointerDown={(event) => handleNodePointerDown(node.id, event)}
              style={{ pointerEvents: interactive || readerSelect ? 'auto' : 'none' }}
            />
            <text
              x={w / 2}
              y={h / 2 + 1.1}
              textAnchor="middle"
              fill="rgba(255,255,255,0.95)"
              fontSize={3.15}
              fontWeight={700}
              fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {truncateLabel(node.label)}
            </text>
          </g>
        )
      })}

    </svg>
  )
}

export function resetGraphViewport(): GraphViewport {
  return { ...DEFAULT_VP }
}
