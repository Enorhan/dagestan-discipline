'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DrillSubcategory, Screen } from '@/lib/types'
import { ScreenShell, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { bodyPartInfo, getDrillsBySubcategory } from '@/lib/drills-data'
import { drillsService } from '@/lib/drills-service'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { haptics } from '@/lib/haptics'
import { Shield, Neck, Shoulder, Back, Hip, Knee, Hand, ChevronRight, AlertTriangle, Info } from '@/components/ui/icons'

// Breadcrumb component
function Breadcrumb({
  items,
  variant = 'default'
}: {
  items: Array<{ label: string; onClick?: () => void }>
  variant?: 'default' | 'glass'
}) {
  return (
    <nav className="flex items-center gap-1.5 text-xs mb-2" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight size={12} className={`${variant === 'glass' ? 'text-white/30' : 'text-muted-foreground/50'} flex-shrink-0`} />
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={() => {
                  haptics.light()
                  item.onClick!()
                }}
                className={`${variant === 'glass' ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground'} transition-colors truncate max-w-[100px]`}
              >
                {item.label}
              </button>
            ) : (
              <span className={`truncate max-w-[120px] ${isLast ? (variant === 'glass' ? 'text-white font-bold' : 'text-foreground font-medium') : (variant === 'glass' ? 'text-white/60' : 'text-muted-foreground')}`}>
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Body part card component with icon
function BodyPartIcon({ bodyPart, size = 28, className = '' }: { bodyPart: string; size?: number; className?: string }) {
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'neck': Neck,
    'shoulders': Shoulder,
    'back': Back,
    'hips': Hip,
    'knees': Knee,
    'fingers': Hand
  }
  const Icon = iconMap[bodyPart] || Shield
  return <Icon size={size} className={className} />
}

interface BodyPartSelectorProps {
  dataVersion?: number
  onBack: () => void
  onSelectBodyPart: (bodyPart: DrillSubcategory) => void
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  initialScrollTop?: number
  onScrollChange?: (scrollTop: number) => void
}

const bodyParts: DrillSubcategory[] = ['neck', 'shoulders', 'back', 'hips', 'knees', 'fingers']

// Emerald/teal theme for injury prevention
const theme = {
  gradient: 'from-emerald-950 via-emerald-900 to-background',
  color: 'text-emerald-500',
  lightColor: 'text-emerald-300',
  bg: 'bg-emerald-500',
  bgSubtle: 'bg-emerald-500/10',
  bgMuted: 'bg-emerald-500/20',
  border: 'border-emerald-500/20',
  borderAccent: 'border-emerald-500/30',
  iconBg: 'bg-emerald-500/20'
}

export function BodyPartSelector({
  dataVersion = 0,
  onBack,
  onSelectBodyPart,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
  initialScrollTop,
  onScrollChange
}: BodyPartSelectorProps) {
  const [countsByBodyPart, setCountsByBodyPart] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    bodyParts.forEach((p) => {
      initial[p] = getDrillsBySubcategory(p).length
    })
    return initial
  })
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position
  useEffect(() => {
    if (initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollTop
            hasRestoredScroll.current = true
          }
        })
      })
    }
  }, [initialScrollTop])

  // Handle scroll to save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])

  useEffect(() => {
    let mounted = true

    const loadCounts = async () => {
      setIsLoadingCounts(true)
      try {
        const drills = await drillsService.getDrills({ category: 'injury-prevention' })
        if (!mounted) return

        const next: Record<string, number> = {}
        bodyParts.forEach((p) => (next[p] = 0))
        drills.forEach((d) => {
          const sub = d.subcategory
          if (sub && sub in next) next[sub] += 1
        })
        setCountsByBodyPart(next)
      } catch {
        // Best-effort: keep local fallback counts.
      } finally {
        if (mounted) setIsLoadingCounts(false)
      }
    }

    loadCounts()

    return () => {
      mounted = false
    }
  }, [dataVersion])

  const totalExercises = Object.values(countsByBodyPart).reduce((sum, count) => sum + count, 0)

  return (
    <ScreenShell>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain"
      >
        <div className="pb-32">
          {/* Hero Header with Emerald Gradient */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-60`} />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <BackButton onClick={onBack} label="Training Hub" styleVariant="glass" />
              </div>

              <div className="mt-4">
                <Breadcrumb
                  items={[
                    { label: 'Training Hub', onClick: () => onNavigate('training-hub') },
                    { label: 'Injury Prevention' }
                  ]}
                  variant="glass"
                />
              </div>

              {/* Category Badge */}
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center`}>
                  <Shield size={20} className={theme.lightColor} />
                </div>
                <span className={`text-xs font-bold tracking-[0.15em] ${theme.lightColor} uppercase`}>
                  Prehab & Recovery
                </span>
              </div>

              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Injury Prevention
              </h1>
              <p className="text-sm text-emerald-100/70 mt-2 leading-relaxed">
                Protect your body with targeted prehab exercises for combat sports
              </p>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg ${theme.bgMuted} ${theme.borderAccent} border`}>
                  <span className={`text-sm font-bold ${theme.lightColor}`}>{totalExercises}</span>
                  <span className="text-xs text-emerald-200/70 ml-1">exercises</span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg ${theme.bgMuted} ${theme.borderAccent} border`}>
                  <span className={`text-sm font-bold ${theme.lightColor}`}>{bodyParts.length}</span>
                  <span className="text-xs text-emerald-200/70 ml-1">body areas</span>
                </div>
                {isLoadingCounts && (
                  <span className="text-xs text-emerald-200/50 animate-pulse">Updating…</span>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-6 -mt-4 relative z-20">
            {/* Body Part Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {bodyParts.map((bodyPart, index) => {
                const info = bodyPartInfo[bodyPart]
                const drillCount = countsByBodyPart[bodyPart] ?? getDrillsBySubcategory(bodyPart).length

                return (
                  <Button
                    key={bodyPart}
                    onClick={() => {
                      haptics.light()
                      onSelectBodyPart(bodyPart)
                    }}
                    variant="ghost"
                    size="sm"
                    stacked
                    className={`card-glass rounded-2xl p-5 text-left transition-all min-h-[140px] normal-case tracking-normal h-auto items-start justify-start border ${theme.border} hover:border-emerald-400/40 stagger-item`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`w-14 h-14 rounded-xl ${theme.bgMuted} flex items-center justify-center mb-3`}>
                      <BodyPartIcon bodyPart={bodyPart} size={28} className={theme.lightColor} />
                    </div>
                    <h3 className="font-bold text-foreground text-base">{info?.name || bodyPart}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <span className={`font-semibold ${theme.color}`}>{drillCount}</span>
                      {drillCount === 1 ? 'exercise' : 'exercises'}
                    </p>
                    <ChevronRight size={16} className={`absolute bottom-4 right-4 ${theme.color} opacity-50`} />
                  </Button>
                )
              })}
            </div>

            {/* Why Injury Prevention Card */}
            <div className={`card-glass rounded-2xl p-5 mb-6 border ${theme.borderAccent} stagger-item`} style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${theme.bgMuted} flex items-center justify-center`}>
                  <Info size={18} className={theme.lightColor} />
                </div>
                <h3 className="font-bold text-foreground">Why Injury Prevention?</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Grapplers face unique injury risks. Regular prehab work on these key areas
                can significantly reduce your risk of common injuries like neck strains,
                shoulder impingement, and knee problems.
              </p>
            </div>

            {/* Common Injuries Section */}
            <div className="stagger-item" style={{ animationDelay: '350ms' }}>
              <h2 className={`text-xs font-bold tracking-[0.2em] ${theme.color} uppercase mb-4 flex items-center gap-2`}>
                <AlertTriangle size={14} />
                Common Grappling Injuries
              </h2>
              <div className="space-y-3">
                {[
                  { part: 'neck', icon: Neck, name: 'Neck', desc: 'Strains from throws, stacks, and neck cranks' },
                  { part: 'shoulders', icon: Shoulder, name: 'Shoulders', desc: 'Rotator cuff injuries from kimuras and americanas' },
                  { part: 'knees', icon: Knee, name: 'Knees', desc: 'ACL/MCL injuries from leg locks and takedowns' },
                  { part: 'fingers', icon: Hand, name: 'Fingers', desc: 'Chronic injuries from gi grips' }
                ].map((injury, index) => (
                  <button
                    key={injury.part}
                    onClick={() => {
                      haptics.light()
                      onSelectBodyPart(injury.part as DrillSubcategory)
                    }}
                    className={`w-full card-glass rounded-xl p-4 border ${theme.border} hover:border-emerald-400/40 transition-all text-left stagger-item flex items-center gap-4`}
                    style={{ animationDelay: `${400 + index * 50}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${theme.bgSubtle} flex items-center justify-center flex-shrink-0`}>
                      <injury.icon size={20} className={theme.lightColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-foreground">{injury.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{injury.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScreenShellFooter>
        <BottomNav
          active="learn"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
