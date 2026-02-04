'use client'

import { ExerciseCategory, Screen, SportType } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import {
  Dumbbell, Knee, Activity, Shoulder, Back, Hand, Heart, Neck
} from '@/components/ui/icons'

interface CategoryInfo {
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

const categoryInfo: Record<ExerciseCategory, CategoryInfo> = {
  'full-body': {
    name: 'Full Body',
    description: 'Total-body power and conditioning',
    icon: <Dumbbell size={24} />,
    color: 'from-amber-500/20 to-amber-600/20 text-amber-700'
  },
  'legs': {
    name: 'Legs',
    description: 'Lower body strength & power',
    icon: <Knee size={24} />,
    color: 'from-orange-500/20 to-orange-600/20 text-orange-600'
  },
  'chest': {
    name: 'Chest',
    description: 'Pushing power & upper body',
    icon: <Activity size={24} />,
    color: 'from-blue-500/20 to-blue-600/20 text-blue-600'
  },
  'shoulders': {
    name: 'Shoulders',
    description: 'Overhead strength & stability',
    icon: <Shoulder size={24} />,
    color: 'from-purple-500/20 to-purple-600/20 text-purple-600'
  },
  'back': {
    name: 'Back',
    description: 'Pulling power & upper-back control',
    icon: <Back size={24} />,
    color: 'from-slate-500/20 to-slate-600/20 text-slate-600'
  },
  'arms': {
    name: 'Arms & Grip',
    description: 'Biceps, triceps, and grip endurance',
    icon: <Hand size={24} />,
    color: 'from-rose-500/20 to-rose-600/20 text-rose-600'
  },
  'core': {
    name: 'Core',
    description: 'Stability & rotational power',
    icon: <Heart size={24} />,
    color: 'from-pink-500/20 to-pink-600/20 text-pink-600'
  },
  'neck': {
    name: 'Neck',
    description: 'Neck strength and prehab work',
    icon: <Neck size={24} />,
    color: 'from-emerald-500/20 to-emerald-600/20 text-emerald-700'
  }
}

const sportNames: Record<SportType, string> = {
  'wrestling': 'Wrestling',
  'judo': 'Judo',
  'bjj': 'Ju Jitsu'
}

interface SportExerciseCategoriesProps {
  sport: SportType
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onBack: () => void
  onSelectCategory: (sport: SportType, category: ExerciseCategory) => void
}

export function SportExerciseCategories({
  sport,
  trainingTarget,
  onNavigate,
  onBack,
  onSelectCategory
}: SportExerciseCategoriesProps) {
  
  const handleCategoryClick = (category: ExerciseCategory) => {
    haptics.light()
    onSelectCategory(sport, category)
  }

  const categories: ExerciseCategory[] = [
    'full-body',
    'legs',
    'chest',
    'shoulders',
    'back',
    'arms',
    'core',
    'neck'
  ]

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Header */}
          <div className="px-6 safe-area-top pb-4">
            <BackButton onClick={onBack} label="Back" />
            <h1 className="text-3xl font-black tracking-tight mt-4">{sportNames[sport]}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse exercises by muscle group
            </p>
          </div>

          {/* Category Cards */}
          <div className="px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Muscle Groups
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, index) => {
                const info = categoryInfo[category]
                return (
                  <Button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    variant="secondary"
                    size="sm"
                    className="card-elevated rounded-xl p-4 text-left min-h-[130px] card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-3`}>
                      {info.icon}
                    </div>
                    <h3 className="font-bold text-base mb-1">{info.name}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {info.description}
                    </p>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </ScreenShellContent>

      <ScreenShellFooter>
        <BottomNav
          active="training"
          trainingTarget={trainingTarget}
          onNavigate={onNavigate}
        />
      </ScreenShellFooter>
    </ScreenShell>
  )
}
