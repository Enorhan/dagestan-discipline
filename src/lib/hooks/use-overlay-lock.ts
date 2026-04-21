import { useEffect, useRef } from 'react'

type OverlayLockOptions = {
  enabled: boolean
  onEscape?: () => void
  /** When false, Escape still works but body scroll is not locked (avoids iOS scroll bugs in fixed modals). */
  lockBodyScroll?: boolean
  /** When false, skip restoring focus on teardown (avoids WKWebView opener re-focus jank). */
  restoreFocus?: boolean
}

let bodyScrollLockDepth = 0
let bodyScrollLockStoredOverflow: string | null = null

function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return
  if (bodyScrollLockDepth === 0) {
    bodyScrollLockStoredOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLockDepth += 1
}

function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return
  bodyScrollLockDepth = Math.max(0, bodyScrollLockDepth - 1)
  if (bodyScrollLockDepth === 0) {
    document.body.style.overflow = bodyScrollLockStoredOverflow ?? ''
    bodyScrollLockStoredOverflow = null
  }
}

/**
 * Locks body scroll while `enabled` and wires Escape → `onEscape`.
 *
 * Important: `onEscape` is kept in a ref so this hook does **not** tear down and
 * re-subscribe on every parent render. Unstable inline callbacks previously
 * caused repeated focus-restore + scroll-lock churn (felt like freezes on iOS).
 *
 * Body scroll uses a **ref-count** so nested overlays do not fight over
 * `document.body.style.overflow` (WKWebView can freeze inner scroll surfaces).
 */
export function useOverlayLock({ enabled, onEscape, lockBodyScroll = true, restoreFocus = true }: OverlayLockOptions) {
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  const previousActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    previousActiveRef.current =
      (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null) ?? null

    let lockedBody = false
    if (lockBodyScroll) {
      acquireBodyScrollLock()
      lockedBody = true
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscapeRef.current?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (lockedBody) {
        releaseBodyScrollLock()
      }
      if (restoreFocus) {
        previousActiveRef.current?.focus?.()
      }
    }
    // Intentionally omit `onEscape`: stored in `onEscapeRef` to avoid effect churn.
  }, [enabled, lockBodyScroll, restoreFocus])
}
