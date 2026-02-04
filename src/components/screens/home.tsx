'use client'

import { Screen, Session, WeekDay, Equipment } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Book, ChevronRight } from '@/components/ui/icons'
import { StreakRing } from '@/components/ui/streak-ring'
import { Button } from '@/components/ui/button'

interface HomeProps {
  session: Session | null
  weekProgress: WeekDay[]
  currentStreak: number
  longestStreak: number
  equipment: Equipment | null
  onStartSession: () => void
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  undoLabel?: string | null
  onUndo: () => void
}

export function Home({
  session,
  weekProgress,
  currentStreak,
  longestStreak,
  equipment,
  onStartSession,
  trainingTarget,
  onNavigate,
  undoLabel,
  onUndo
}: HomeProps) {
  const equipmentLabel = equipment === 'bodyweight'
    ? 'Bodyweight only'
    : equipment === 'gym'
      ? 'Weighted / Gym'
      : 'Select training mode'

  return (
    <ScreenShell>
      <ScreenShellContent className="safe-area-top">
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pb-28">
          {/* SECTION 1: HERO - Streak Ring */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4">
        <StreakRing 
          currentStreak={currentStreak} 
          longestStreak={longestStreak}
          weekProgress={weekProgress}
        />
        {currentStreak === 0 && (
          <p className="text-sm text-muted-foreground mt-6 text-center max-w-xs animate-in fade-in">
            Complete your first session to begin your streak
          </p>
        )}
      </div>

      {/* SECTION 2: PRIMARY - Session Card + Start Button */}
      <div className="px-6 pb-6">
        {/* Session Card - Elevated */}
        <div className="card-elevated rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Today
            </p>
            <Button
              onClick={() => onNavigate('week-view')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 -mr-2 normal-case tracking-normal"
              aria-label="View week schedule"
            >
              <span>Week</span>
              <ChevronRight size={14} />
            </Button>
          </div>
          {session ? (
            <>
              <h2 className="type-title text-foreground">
                {session.day}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {session.focus} · {session.duration} min
              </p>
              <p className="mt-3 text-xs font-medium text-muted-foreground/70">
                {equipmentLabel}
              </p>
            </>
          ) : (
            <>
              <h2 className="type-title text-foreground">
                No Program
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a workout program to get started
              </p>
            </>
          )}
        </div>

        {/* Primary CTA - with glow */}
        <Button
          onClick={() => {
            haptics.medium()
            onStartSession()
          }}
          variant="primary"
          size="xl"
          fullWidth
          withHaptic={false}
          disabled={!session}
          className="h-16 font-black text-lg tracking-wide uppercase rounded-xl glow-primary-subtle animate-breathe"
        >
          {session ? 'Start Session' : 'No Program Available'}
        </Button>
      </div>

      {/* SECTION 3: LEARN */}
      <div className="px-6 pb-10">
        <Button
          onClick={() => onNavigate('training-hub')}
          variant="ghost"
          size="md"
          fullWidth
          className="h-12 bg-primary/20 border border-primary/30 rounded-lg text-sm font-semibold text-primary hover:bg-primary/30 transition-colors gap-2 card-interactive normal-case tracking-normal"
          aria-label="Open training hub with drills and techniques"
        >
          <Book size={18} />
          Learn: Drills & Injury Prevention
        </Button>
        </div>
        </div>
      </ScreenShellContent>

      {undoLabel && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4">
          <div className="flex items-center gap-3 card-glass px-4 py-2 rounded-full shadow-lg border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {undoLabel}
            </span>
            <Button
              onClick={onUndo}
              variant="link"
              size="sm"
              className="text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 p-0 h-auto min-h-0 normal-case tracking-normal"
              aria-label="Undo last action"
            >
              Undo
            </Button>
          </div>
        </div>
      )}

      <BottomNav
        active="home"
        trainingTarget={trainingTarget}
        onNavigate={onNavigate}
      />
    </ScreenShell>
  )
}
