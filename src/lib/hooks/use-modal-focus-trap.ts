'use client'

import { type RefObject, useEffect } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Moves focus into the first focusable control when `active`, traps Tab within `rootRef`,
 * and restores focus to the previously focused element on teardown.
 */
export function useModalFocusTrap(active: boolean, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return
    const root = rootRef.current
    if (!root) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)

    requestAnimationFrame(() => {
      const list = focusables()
      const first = list[0]
      first?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const first = list[0]!
      const last = list[list.length - 1]!
      const current = document.activeElement
      if (event.shiftKey) {
        if (current === first || !root.contains(current)) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (current === last || !root.contains(current)) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      if (previous && document.body.contains(previous)) {
        previous.focus()
      }
    }
  }, [active, rootRef])
}
