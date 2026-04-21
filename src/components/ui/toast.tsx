'use client'

import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { Button } from './button'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariant
  isOpen: boolean
  onClose: () => void
  duration?: number
  /** Only the top toast should trigger haptic (avoids buzz when several appear). */
  playHaptic?: boolean
  /** Only the top item should be exposed to assistive tech as a live region. */
  announce?: boolean
}

const variantSurface: Record<ToastVariant, string> = {
  success: cn(
    'border-[color:var(--color-success)]/35',
    'bg-[color:color-mix(in_oklab,var(--color-card-elevated)_88%,var(--color-success-muted))]',
    'shadow-[0_12px_40px_-12px_rgba(34,197,94,0.35)]',
  ),
  error: cn(
    'border-[color:var(--color-destructive)]/45',
    'bg-[color:color-mix(in_oklab,var(--color-card-elevated)_82%,rgba(127,29,29,0.55))]',
    'shadow-[0_12px_40px_-12px_rgba(127,29,29,0.45)]',
  ),
  warning: cn(
    'border-[color:var(--color-warning)]/40',
    'bg-[color:color-mix(in_oklab,var(--color-card-elevated)_88%,var(--color-warning-muted))]',
    'shadow-[0_12px_40px_-12px_rgba(234,179,8,0.25)]',
  ),
  info: cn(
    'border-[color:var(--color-info)]/40',
    'bg-[color:color-mix(in_oklab,var(--color-card-elevated)_88%,var(--color-info-muted))]',
    'shadow-[0_12px_40px_-12px_rgba(59,130,246,0.22)]',
  ),
}

const variantIcon: Record<ToastVariant, string> = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-destructive-foreground)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const className = cn('h-5 w-5 shrink-0', variantIcon[variant])
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={className} strokeWidth={2.25} aria-hidden />
    case 'error':
      return <XCircle className={className} strokeWidth={2.25} aria-hidden />
    case 'warning':
      return <AlertTriangle className={className} strokeWidth={2.25} aria-hidden />
    default:
      return <Info className={className} strokeWidth={2.25} aria-hidden />
  }
}

export function Toast({
  message,
  variant = 'info',
  isOpen,
  onClose,
  duration = 3000,
  playHaptic = true,
  announce = true,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return

    if (playHaptic) {
      if (variant === 'success') {
        haptics.success()
      } else if (variant === 'error') {
        haptics.error()
      } else if (variant === 'warning') {
        haptics.warning()
      } else {
        haptics.light()
      }
    }

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, variant, duration, onClose, playHaptic])

  if (!isOpen) return null

  const live = announce ? (variant === 'error' ? ('assertive' as const) : ('polite' as const)) : undefined

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={live}
      aria-atomic="true"
      {...(!announce ? { 'aria-hidden': true as const } : {})}
      className={cn(
        'flex w-full min-h-12 items-center gap-3 rounded-2xl border px-3.5 py-3 backdrop-blur-xl',
        'text-[15px] font-semibold leading-snug tracking-tight text-foreground',
        variantSurface[variant],
      )}
    >
      <ToastIcon variant={variant} />
      <p className="min-w-0 flex-1">{message}</p>
      <Button
        type="button"
        onClick={onClose}
        variant="ghost"
        size="icon"
        withHaptic={false}
        className="h-11 w-11 shrink-0 rounded-full text-foreground/70 hover:bg-white/10 hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </Button>
    </div>
  )
}
