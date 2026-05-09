'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { ScreenBackdrop, type ScreenBackdropVariant } from './screen-backdrop'

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

export function ModalShell({
  title,
  onBack,
  children,
  action,
  variant = 'modal',
  headerMode = 'default',
}: {
  title: string
  onBack: () => void
  children: ReactNode
  action?: ReactNode
  variant?: ScreenBackdropVariant
  headerMode?: 'default' | 'instagram'
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const previouslyFocused = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null
    const node = containerRef.current
    if (!node) return

    const focusFirst = () => {
      const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length > 0) focusables[0].focus()
      else node.focus()
    }
    focusFirst()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      )
      if (focusables.length === 0) {
        event.preventDefault()
        node.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', handleKeyDown)
    return () => {
      node.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [onBack])

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-[#04060a] text-white outline-none"
    >
      <ScreenBackdrop variant={variant} />
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        {headerMode === 'instagram' ? (
          <div className="relative mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white"
              aria-label={`Close ${title}`}
            >
              <X className="h-6 w-6" />
            </button>
            <p className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-white">{title}</p>
            <div className="min-w-[56px] text-right">{action}</div>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-base font-semibold text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              {title}
            </button>
            {action}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px)+12px)] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  )
}

