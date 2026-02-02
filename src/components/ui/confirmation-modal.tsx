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
      className="fixed inset-0 z-modal flex items-center justify-center p-6"
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
      <div className="relative z-10 w-full max-w-sm bg-card border border-border/50 rounded-2xl p-6 shadow-elevated animate-scale-in">
        <h2 id="modal-title" className="text-lg font-bold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            fullWidth
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

