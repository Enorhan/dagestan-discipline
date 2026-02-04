'use client'

import { Screen, Session, SportType } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { ChevronRight, Dumbbell, Clock } from '@/components/ui/icons'

interface ExercisesMainProps {
  session: Session | null
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  onSelectSport: (sport: SportType) => void
  currentSport: SportType
}

export function ExercisesMain({
  session,
  trainingTarget,
  onNavigate,
  onSelectSport,
  currentSport
}: ExercisesMainProps) {

  const handleSportClick = (sport: SportType) => {
    haptics.light()
    onSelectSport(sport)
    onNavigate('sport-exercise-categories')
  }

  const handleMyWorkoutClick = () => {
    haptics.light()
    onNavigate('exercise-list')
  }

  // Get today's workout info
  const todayWorkout = session ? {
    day: session.day,
    focus: session.focus,
    exerciseCount: session.exercises.length,
    duration: session.duration
  } : null

  return (
    <ScreenShell>
      <ScreenShellContent>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Header */}
          <div className="px-6 safe-area-top pb-4 pt-4">
            <h1 className="text-3xl font-black tracking-tight">Exercises</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse exercises by martial art or view today's workout
            </p>
          </div>

          {/* My Workout Card */}
          <div className="px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Today's Workout
            </h2>
            <Button
              onClick={handleMyWorkoutClick}
              variant="secondary"
              size="sm"
              className="w-full card-elevated rounded-xl p-6 text-left hover:bg-card/80 transition-all card-interactive normal-case tracking-normal h-auto items-start justify-start"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Clock size={28} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">My Workout</h3>
                    {todayWorkout ? (
                      <>
                        <p className="text-sm text-foreground font-medium">{todayWorkout.day}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {todayWorkout.focus} · {todayWorkout.exerciseCount} exercises · {todayWorkout.duration} min
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No workout scheduled for today</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={24} className="text-muted-foreground flex-shrink-0" />
              </div>
            </Button>
          </div>

          {/* Martial Arts Cards */}
          <div className="px-6 py-4">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              Browse by Martial Art
            </h2>
            <div className="space-y-3">
              {/* Wrestling Card */}
              <Button
                onClick={() => handleSportClick('wrestling')}
                variant="secondary"
                size="sm"
                className="w-full card-elevated rounded-xl p-6 text-left hover:bg-card/80 transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start"
                style={{ animationDelay: '0ms' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                      <Dumbbell size={28} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Wrestling</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Athlete exercises from world-class wrestlers
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-muted-foreground flex-shrink-0" />
                </div>
              </Button>

              {/* Judo Card */}
              <Button
                onClick={() => handleSportClick('judo')}
                variant="secondary"
                size="sm"
                className="w-full card-elevated rounded-xl p-6 text-left hover:bg-card/80 transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start"
                style={{ animationDelay: '50ms' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                      <Dumbbell size={28} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Judo</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Olympic champions' strength and throw prep
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-muted-foreground flex-shrink-0" />
                </div>
              </Button>

              {/* Ju Jitsu Card */}
              <Button
                onClick={() => handleSportClick('bjj')}
                variant="secondary"
                size="sm"
                className="w-full card-elevated rounded-xl p-6 text-left hover:bg-card/80 transition-all card-interactive stagger-item normal-case tracking-normal h-auto items-start justify-start"
                style={{ animationDelay: '100ms' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                      <Dumbbell size={28} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Ju Jitsu</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Elite grapplers' strength and conditioning
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
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
