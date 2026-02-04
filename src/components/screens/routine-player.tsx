'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Routine, Drill } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { drillsService } from '@/lib/drills-service'
import { haptics } from '@/lib/haptics'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, SkipBack, Check, Clock, Flame, Trophy, Refresh } from '@/components/ui/icons'

interface RoutinePlayerProps {
  routine: Routine
  onComplete: () => void
  onClose: () => void
}

export function RoutinePlayer({ routine, onComplete, onClose }: RoutinePlayerProps) {
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(routine.drills[0]?.duration || 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [drillsCache, setDrillsCache] = useState<Record<string, Drill>>({})
  const [isLoadingDrills, setIsLoadingDrills] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Fetch all drills for the routine on mount
  useEffect(() => {
    let isMounted = true

    const fetchDrills = async () => {
      setIsLoadingDrills(true)
      const drillIds = routine.drills.map(rd => rd.drillId)
      const cache: Record<string, Drill> = {}

      for (const drillId of drillIds) {
        const drill = await drillsService.getDrillById(drillId)
        if (drill) {
          cache[drillId] = drill
        }
      }

      if (isMounted) {
        setDrillsCache(cache)
        setIsLoadingDrills(false)
      }
    }

    fetchDrills()

    return () => {
      isMounted = false
    }
  }, [routine.drills])

  const currentRoutineDrill = routine.drills[currentDrillIndex]
  const currentDrill = currentRoutineDrill ? drillsCache[currentRoutineDrill.drillId] ?? null : null
  const totalDrills = routine.drills.length
  const progress = ((currentDrillIndex) / totalDrills) * 100

  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      if (!startTimeRef.current) startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            haptics.success()
            return 0
          }
          return prev - 1
        })
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else if (timeRemaining === 0 && isPlaying) {
      if (currentDrillIndex < totalDrills - 1) {
        const nextDrill = routine.drills[currentDrillIndex + 1]
        setCurrentDrillIndex(prev => prev + 1)
        setTimeRemaining(nextDrill.duration)
      } else {
        setIsComplete(true)
        setIsPlaying(false)
        haptics.success()
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, timeRemaining, currentDrillIndex, totalDrills, routine.drills])

  const handlePlayPause = useCallback(() => {
    haptics.medium()
    setIsPlaying(prev => !prev)
  }, [])

  const handleSkip = useCallback(() => {
    haptics.light()
    if (currentDrillIndex < totalDrills - 1) {
      const nextDrill = routine.drills[currentDrillIndex + 1]
      setCurrentDrillIndex(prev => prev + 1)
      setTimeRemaining(nextDrill.duration)
    } else {
      setIsComplete(true)
      setIsPlaying(false)
      haptics.success()
    }
  }, [currentDrillIndex, totalDrills, routine.drills])

  const handlePrevious = useCallback(() => {
    haptics.light()
    if (currentDrillIndex > 0) {
      const prevDrill = routine.drills[currentDrillIndex - 1]
      setCurrentDrillIndex(prev => prev - 1)
      setTimeRemaining(prevDrill.duration)
    } else {
      setTimeRemaining(routine.drills[0]?.duration || 0)
    }
  }, [currentDrillIndex, routine.drills])

  const handleClose = useCallback(() => {
    if (isPlaying || currentDrillIndex > 0) {
      haptics.warning()
    } else {
      haptics.light()
    }
    onClose()
  }, [isPlaying, currentDrillIndex, onClose])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (isLoadingDrills) {
    return (
      <ScreenShell>
        <ScreenShellContent>
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onClose} label="Close" variant="close" />
          </div>
          <div className="flex flex-col items-center justify-center flex-1 px-6">
            <Refresh size={24} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading routine...</p>
          </div>
        </ScreenShellContent>
      </ScreenShell>
    )
  }

  if (isComplete) {
    const totalRoutineTime = routine.drills.reduce((acc, d) => acc + d.duration, 0)
    return (
      <ScreenShell>
        <ScreenShellContent>
          <div className="flex flex-col items-center justify-center flex-1 px-6">
            {/* Success Animation */}
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-celebration">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check size={40} className="text-primary" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8962e] flex items-center justify-center shadow-lg glow-gold animate-float">
                <Trophy size={20} className="text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-black tracking-tight mb-2 stagger-item">Routine Complete!</h1>
            <p className="text-muted-foreground text-center mb-8 stagger-item" style={{ animationDelay: '50ms' }}>
              Great work finishing {routine.name}
            </p>
            
            {/* Stats Card */}
            <div className="w-full max-w-xs card-elevated rounded-xl p-5 mb-8 stagger-item" style={{ animationDelay: '100ms' }}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Flame size={18} className="text-primary" />
                  </div>
                  <span className="text-sm">Drills completed</span>
                </div>
                <span className="font-bold text-lg">{totalDrills}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <span className="text-sm">Total time</span>
                </div>
                <span className="font-bold text-lg">{formatTime(elapsedTime || totalRoutineTime)}</span>
              </div>
            </div>
            
            <Button
              onClick={() => { haptics.success(); onComplete() }}
              variant="primary"
              size="lg"
              fullWidth
              withHaptic={false}
              className="max-w-xs bg-foreground text-background rounded-xl active:scale-[0.98] transition-all stagger-item glow-primary-subtle"
              style={{ animationDelay: '150ms' }}
            >
              Done
            </Button>
          </div>
        </ScreenShellContent>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="px-6 safe-area-top pb-4">
          <div className="flex items-center justify-between mb-4">
            <BackButton onClick={handleClose} label="Close" variant="close" />
            <span className="text-sm text-muted-foreground">{currentDrillIndex + 1} / {totalDrills}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mb-6 overflow-hidden">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
              style={{ 
                width: `${progress}%`,
                boxShadow: '0 0 10px rgba(139, 0, 0, 0.5)'
              }} 
            />
          </div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-2">{routine.name}</p>
          <h1 className="text-3xl font-black tracking-tight">{currentDrill?.name || 'Loading...'}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-6xl sm:text-8xl font-black tracking-tight mb-4 tabular-nums">{formatTime(timeRemaining)}</div>
          {currentDrill?.coachingCues?.[0] && <p className="text-muted-foreground text-center">{currentDrill.coachingCues[0]}</p>}
        </div>
        <div className="px-6 pb-12">
          <div className="flex items-center justify-center gap-6">
            <Button
              onClick={handlePrevious}
              variant="ghost"
              size="icon"
              withHaptic={false}
              className="w-14 h-14 rounded-full bg-card border border-border active:scale-95 transition-transform card-interactive"
              aria-label="Previous drill"
            >
              <SkipBack size={22} />
            </Button>
            <Button
              onClick={handlePlayPause}
              variant="ghost"
              size="icon"
              withHaptic={false}
              className="w-20 h-20 rounded-full bg-foreground text-background active:scale-95 transition-transform shadow-lg"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </Button>
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="icon"
              withHaptic={false}
              className="w-14 h-14 rounded-full bg-card border border-border active:scale-95 transition-transform card-interactive"
              aria-label="Next drill"
            >
              <SkipForward size={22} />
            </Button>
          </div>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
