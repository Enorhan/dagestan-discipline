'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastVariant } from '@/components/ui/toast'
import { presentableErrorText } from '@/lib/toast-messages'

interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const MAX_VISIBLE_TOASTS = 3

function newToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isUserCancellationToast(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  const compact = normalized.replace(/\s+/g, ' ')
  if (!normalized) return false
  if (normalized.includes('cancel') && (normalized.includes('photo') || normalized.includes('camera'))) return true
  if (compact.includes('user') && compact.includes('cancel') && compact.includes('photos')) return true
  if (compact === 'user cancelled photos app' || compact === 'user canceled photos app') return true
  return false
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((entry) => entry.id !== id))
  }, [])

  const showToast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration = 3000,
  ) => {
    if (variant === 'error' && isUserCancellationToast(message)) {
      return
    }
    const entry: ToastMessage = {
      id: newToastId(),
      message,
      variant,
      duration,
    }
    setToasts((previous) => [entry, ...previous].slice(0, MAX_VISIBLE_TOASTS))
  }, [])

  const showError = useCallback((message: string, duration = 4200) => {
    if (isUserCancellationToast(message)) return
    const safe = presentableErrorText(message)
    showToast(safe, 'error', duration)
  }, [showToast])

  const showSuccess = useCallback((message: string, duration = 3200) => {
    showToast(message, 'success', duration)
  }, [showToast])

  const showWarning = useCallback((message: string, duration = 3800) => {
    showToast(message, 'warning', duration)
  }, [showToast])

  const showInfo = useCallback((message: string, duration = 3200) => {
    showToast(message, 'info', duration)
  }, [showToast])

  const hideToast = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextType = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed left-1/2 top-[max(0.75rem,calc(env(safe-area-inset-top)+10px))] z-toast flex w-[min(100%-2rem,26rem)] -translate-x-1/2 flex-col gap-2.5 px-4"
          aria-label="Notifications"
        >
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="pointer-events-auto animate-[slide-down_260ms_cubic-bezier(0.16,1,0.3,1)_both]"
            >
              <Toast
                message={toast.message}
                variant={toast.variant}
                isOpen
                onClose={() => dismissToast(toast.id)}
                duration={toast.duration}
                playHaptic={index === 0}
                announce={index === 0}
              />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function useErrorHandler() {
  const { showError } = useToast()

  const handleError = useCallback((error: unknown, fallbackMessage = 'Something went wrong') => {
    const message = error instanceof Error ? error.message : fallbackMessage
    showError(message)
  }, [showError])

  return handleError
}
