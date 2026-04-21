'use client'

import { useEffect, useCallback } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from './button'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default' | 'destructive'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  const handleConfirm = useCallback(() => {
    if (variant === 'danger' || variant === 'destructive') {
      haptics.warning()
    } else {
      haptics.medium()
    }
    onConfirm()
  }, [variant, onConfirm])

  const handleCancel = useCallback(() => {
    haptics.light()
    onClose()
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const confirmVariant = variant === 'danger' || variant === 'destructive' ? 'destructive' : 'primary'

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-card p-5 shadow-elevated animate-scale-in sm:p-6">
        <h2 id="modal-title" className="mb-2 text-[1.6rem] font-black tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mb-6 text-base leading-relaxed text-muted-foreground">
          {message}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={handleCancel}
            fullWidth
            className="min-w-0"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            fullWidth
            className="min-w-0"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
