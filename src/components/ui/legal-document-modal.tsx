'use client'

import { useEffect } from 'react'
import { Button } from './button'

interface LegalDocumentModalProps {
  isOpen: boolean
  title: string
  url: string
  onClose: () => void
}

export function LegalDocumentModal({ isOpen, title, url, onClose }: LegalDocumentModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="legal-document-title">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex h-[min(88vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-card shadow-elevated animate-scale-in">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-5">
          <div>
            <h2 id="legal-document-title" className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
            <p className="text-xs text-muted-foreground">Review this document without leaving the app.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
        <iframe title={title} src={url} className="h-full w-full bg-background" />
      </div>
    </div>
  )
}