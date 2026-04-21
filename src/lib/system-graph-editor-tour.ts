/** One-time coach flow for the system graph editor (local only). */

export const SYSTEM_GRAPH_EDITOR_TOUR_KEY = 'bjj:system-graph-tour:v1'

/** Current step index while the tour is in progress (session-only; resets when the tab session ends). */
export const SYSTEM_GRAPH_EDITOR_TOUR_SESSION_KEY = 'bjj:system-graph-tour:session-step:v1'

export const SYSTEM_GRAPH_EDITOR_TOUR_STEPS = [
  {
    title: 'Arrange & zoom',
    body: 'Drag steps to position them. Pinch or scroll to zoom, and drag the background to pan the map.',
  },
  {
    title: 'Draw links',
    body: 'Tap Link, then tap two steps in order. Link mode pauses pan and zoom so taps stay precise.',
  },
  {
    title: 'Transition notes',
    body: 'Optional labels on arrows explain the transition. Add them from the list below or when creating a link.',
  },
] as const

export function isSystemGraphTourComplete(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(SYSTEM_GRAPH_EDITOR_TOUR_KEY) === 'done'
}

export function markSystemGraphTourSeen(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SYSTEM_GRAPH_EDITOR_TOUR_KEY, 'done')
  clearSystemGraphTourSessionStep()
}

export function getSystemGraphTourSessionStep(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.sessionStorage.getItem(SYSTEM_GRAPH_EDITOR_TOUR_SESSION_KEY)
  const n = raw == null ? 0 : Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n >= SYSTEM_GRAPH_EDITOR_TOUR_STEPS.length) return SYSTEM_GRAPH_EDITOR_TOUR_STEPS.length - 1
  return n
}

export function setSystemGraphTourSessionStep(step: number): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(SYSTEM_GRAPH_EDITOR_TOUR_SESSION_KEY, String(Math.max(0, step)))
}

export function clearSystemGraphTourSessionStep(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(SYSTEM_GRAPH_EDITOR_TOUR_SESSION_KEY)
}
