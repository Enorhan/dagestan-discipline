'use client'

import { useEffect } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from './button'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariant
  isOpen: boolean
  onClose: () => void
  duration?: number
}

export function Toast({
  message,
  variant = 'info',
  isOpen,
  onClose,
  duration = 3000
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return

    // Trigger haptic based on variant
    if (variant === 'success') {
      haptics.success()
    } else if (variant === 'error') {
      haptics.error()
    } else if (variant === 'warning') {
      haptics.warning()
    } else {
      haptics.light()
    }

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, variant, duration, onClose])

  if (!isOpen) return null

  const variantStyles = {
    success: 'bg-green-600 text-white',
    error: 'bg-destructive text-destructive-foreground',
    warning: 'bg-primary text-primary-foreground',
    info: 'bg-foreground text-background'
  }

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+16px)] left-1/2 -translate-x-1/2 z-toast px-4 animate-slide-down">
      <div className={`flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl shadow-elevated ${variantStyles[variant]}`}>
        <span className="text-lg font-bold flex-shrink-0" aria-hidden="true">
          {iconMap[variant]}
        </span>
        <span className="text-sm font-semibold flex-1">
          {message}
        </span>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          withHaptic={false}
          className="min-w-[32px] min-h-[32px] h-8 w-8 text-lg opacity-70 hover:opacity-100 transition-opacity rounded-full active:bg-white/10"
          aria-label="Close notification"
        >
          ×
        </Button>
      </div>
    </div>
  )
}
