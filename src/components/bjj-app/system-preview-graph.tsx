import { useMemo } from 'react'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import type { BjjSystem } from '@/lib/bjj-types'

export function SystemPreviewGraph({ system }: { system: BjjSystem }) {
  const positions = useMemo(() => {
    const base = computeGraphLayout(system.nodes, system.edges)
    const out = { ...base }
    for (const node of system.nodes) {
      if (node.layout) out[node.id] = { x: node.layout.x, y: node.layout.y }
    }
    return out
  }, [system])

  return (
    <div className="relative h-48 overflow-hidden rounded-[24px] border border-white/10 bg-[#050914] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <SystemGraphCanvas
        variant="preview"
        nodes={system.nodes}
        edges={system.edges}
        positions={positions}
        density="hero"
        labelMode="auto"
        showGrid
        showControls={false}
        showMiniMap={false}
        className="absolute inset-0 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(3,6,12,0.82))]" />
    </div>
  )
}

