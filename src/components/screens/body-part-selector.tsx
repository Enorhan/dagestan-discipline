'use client'

import React from 'react'
import { DrillSubcategory } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { bodyPartInfo, getDrillsBySubcategory } from '@/lib/drills-data'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Shield, Neck, Shoulder, Back, Hip, Knee, Hand } from '@/components/ui/icons'

// Map body parts to icons
const bodyPartIcons: Record<string, React.ReactNode> = {
  'neck': <Neck size={28} className="text-primary" />,
  'shoulders': <Shoulder size={28} className="text-primary" />,
  'back': <Back size={28} className="text-primary" />,
  'hips': <Hip size={28} className="text-primary" />,
  'knees': <Knee size={28} className="text-primary" />,
  'fingers': <Hand size={28} className="text-primary" />
}

interface BodyPartSelectorProps {
  onBack: () => void
  onSelectBodyPart: (bodyPart: DrillSubcategory) => void
}

const bodyParts: DrillSubcategory[] = ['neck', 'shoulders', 'back', 'hips', 'knees', 'fingers']

export function BodyPartSelector({ onBack, onSelectBodyPart }: BodyPartSelectorProps) {
  return (
    <ScreenShell>
      <ScreenShellContent className="pb-32">
        {/* Header */}
        <div className="px-6 safe-area-top pb-4">
          <BackButton onClick={onBack} label="Back" />

          <div className="flex items-center gap-3 mb-2 mt-4">
            <Shield size={24} className="text-primary" />
            <h1 className="text-2xl font-black tracking-tight">Injury Prevention</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Select a body part to see prehab exercises
          </p>
        </div>

        {/* Body Part Grid */}
        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            {bodyParts.map(bodyPart => {
              const info = bodyPartInfo[bodyPart]
              const drillCount = getDrillsBySubcategory(bodyPart).length

              return (
                <Button
                  key={bodyPart}
                  onClick={() => onSelectBodyPart(bodyPart)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className="bg-card border border-border rounded-lg p-5 text-left hover:bg-card/80 transition-colors min-h-[120px] normal-case tracking-normal h-auto items-start justify-start"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    {bodyPartIcons[bodyPart] || <Shield size={28} className="text-primary" />}
                  </div>
                  <h3 className="font-semibold">{info?.name || bodyPart}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {drillCount} {drillCount === 1 ? 'exercise' : 'exercises'}
                  </p>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Info Section */}
        <div className="px-4 sm:px-6 py-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Why Injury Prevention?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Grapplers face unique injury risks. Regular prehab work on these key areas
              can significantly reduce your risk of common injuries like neck strains,
              shoulder impingement, and knee problems.
            </p>
          </div>
        </div>

        {/* Common Injuries Info */}
        <div className="px-4 sm:px-6 py-4 pb-8">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            Common Grappling Injuries
          </h2>
          <div className="space-y-2">
            <div className="bg-card border border-border rounded-lg p-3 min-h-[56px]">
              <div className="flex items-center gap-2">
                <Neck size={18} className="text-muted-foreground" />
                <span className="font-medium text-sm">Neck</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Strains from throws, stacks, and neck cranks</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 min-h-[56px]">
              <div className="flex items-center gap-2">
                <Shoulder size={18} className="text-muted-foreground" />
                <span className="font-medium text-sm">Shoulders</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Rotator cuff injuries from kimuras and americanas</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 min-h-[56px]">
              <div className="flex items-center gap-2">
                <Knee size={18} className="text-muted-foreground" />
                <span className="font-medium text-sm">Knees</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ACL/MCL injuries from leg locks and takedowns</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 min-h-[56px]">
              <div className="flex items-center gap-2">
                <Hand size={18} className="text-muted-foreground" />
                <span className="font-medium text-sm">Fingers</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Chronic injuries from gi grips</p>
            </div>
          </div>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
