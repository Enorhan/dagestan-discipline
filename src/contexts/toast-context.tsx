'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastVariant } from '@/components/ui/toast'

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration = 3000
  ) => {
    setToast({
      id: Date.now().toString(),
      message,
      variant,
      duration,
    })
  }, [])

  const showError = useCallback((message: string, duration = 4000) => {
    showToast(message, 'error', duration)
  }, [showToast])

  const showSuccess = useCallback((message: string, duration = 3000) => {
    showToast(message, 'success', duration)
  }, [showToast])

  const showWarning = useCallback((message: string, duration = 3500) => {
    showToast(message, 'warning', duration)
  }, [showToast])

  const showInfo = useCallback((message: string, duration = 3000) => {
    showToast(message, 'info', duration)
  }, [showToast])

  const hideToast = useCallback(() => {
    setToast(null)
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
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          isOpen={true}
          onClose={hideToast}
          duration={toast.duration}
        />
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

// Convenience hook for error handling
export function useErrorHandler() {
  const { showError } = useToast()
  
  const handleError = useCallback((error: unknown, fallbackMessage = 'Something went wrong') => {
    const message = error instanceof Error ? error.message : fallbackMessage
    showError(message)
  }, [showError])
  
  return handleError
}

