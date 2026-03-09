'use client'

import { useCallback, useEffect, useState } from 'react'
import { PersonalRecord } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { Trophy, TrendingUp, Dumbbell, X } from './icons'

interface PRCelebrationProps {
  pr: PersonalRecord | null
  onClose: () => void
  autoCloseDelay?: number
}

export function PRCelebration({ pr, onClose, autoCloseDelay = 4000 }: PRCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (!pr) return

    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true)
      setIsClosing(false)
      haptics.success()
    })

    const timer = window.setTimeout(() => {
      handleClose()
    }, autoCloseDelay)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timer)
    }
  }, [pr, autoCloseDelay, handleClose])

  if (!isVisible || !pr) return null

  const getIcon = () => {
    switch (pr.type) {
      case 'weight':
        return <Dumbbell size={40} className="text-amber-400" />
      case 'reps':
        return <TrendingUp size={40} className="text-green-400" />
      case 'volume':
        return <Trophy size={40} className="text-primary" />
      default:
        return <Trophy size={40} className="text-amber-400" />
    }
  }

  const getMessage = () => {
    switch (pr.type) {
      case 'weight':
        return `New max weight: ${pr.value} ${pr.unit}`
      case 'reps':
        return `New rep record: ${pr.value} reps`
      case 'volume':
        return `New volume record: ${pr.value.toLocaleString()} ${pr.unit}`
      default:
        return 'New personal record!'
    }
  }

  const getSubMessage = () => {
    if (pr.previousBest === 0) {
      return 'First time tracking this exercise!'
    }
    return `Previous best: ${pr.previousBest} ${pr.unit} (+${pr.improvement}%)`
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Celebration Card */}
      <div
        className={`relative w-full max-w-sm transform transition-all duration-300 ${
          isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-primary/30 to-amber-500/30 rounded-3xl blur-xl animate-pulse" />

        <div className="relative bg-card rounded-3xl p-8 border border-amber-500/30 shadow-2xl overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-primary/5" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-white/60" />
          </button>

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Icon with pulse */}
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center border border-amber-500/30">
                {getIcon()}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">
              New PR!
            </h2>

            {/* Exercise name */}
            <p className="text-sm text-muted-foreground mb-4">
              {pr.exerciseName}
            </p>

            {/* Main achievement */}
            <div className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500/20">
              <p className="text-lg font-bold text-amber-400">
                {getMessage()}
              </p>
            </div>

            {/* Comparison */}
            <p className="text-xs text-muted-foreground">
              {getSubMessage()}
            </p>

            {/* Dismiss hint */}
            <p className="text-[10px] text-muted-foreground/60 mt-6 uppercase tracking-wider">
              Tap anywhere to continue
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact PR badge for inline display
interface PRBadgeProps {
  pr: PersonalRecord
  size?: 'sm' | 'md' | 'lg'
}

export function PRBadge({ pr, size = 'sm' }: PRBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 ${sizeClasses[size]}`}
    >
      <Trophy size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
      PR
    </span>
  )
}
