'use client'

import { useState, type ReactNode } from 'react'
import { ActivityType, ActivityLog } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Gi, Wrestling, Stretch, Trophy, Boxing, Drill, Flame } from '@/components/ui/icons'

interface LogActivityProps {
  onLogActivity: (log: Omit<ActivityLog, 'id'>) => void
  onUpdateActivity?: (log: Omit<ActivityLog, 'id'>, activityId: string) => void
  editingActivity?: ActivityLog | null
  onClose: () => void
}

// Get the days of the current week (Monday to Sunday)
function getWeekDays(): { date: Date; label: string; shortLabel: string; isToday: boolean }[] {
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay // Adjust to get Monday

  const days: { date: Date; label: string; shortLabel: string; isToday: boolean }[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + i)
    date.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues

    const isToday = date.toDateString() === today.toDateString()
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const shortDay = date.toLocaleDateString('en-US', { weekday: 'short' })

    days.push({
      date,
      label: isToday ? 'Today' : dayName,
      shortLabel: shortDay,
      isToday
    })
  }

  return days
}

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: ReactNode }[] = [
  { type: 'bjj-session', label: 'BJJ Session', icon: <Gi size={22} className="text-primary" /> },
  { type: 'wrestling-practice', label: 'Wrestling Practice', icon: <Wrestling size={22} className="text-primary" /> },
  { type: 'judo-class', label: 'Judo Class', icon: <Gi size={22} className="text-primary" /> },
  { type: 'open-mat', label: 'Open Mat', icon: <Stretch size={22} className="text-primary" /> },
  { type: 'competition', label: 'Competition', icon: <Trophy size={22} className="text-primary" /> },
  { type: 'sparring', label: 'Sparring', icon: <Boxing size={22} className="text-primary" /> },
  { type: 'drilling', label: 'Drilling', icon: <Drill size={22} className="text-primary" /> },
  { type: 'conditioning', label: 'Conditioning', icon: <Flame size={22} className="text-primary" /> },
]

export function LogActivity({
  onLogActivity,
  onUpdateActivity,
  editingActivity,
  onClose
}: LogActivityProps) {
  const weekDays = getWeekDays()
  const todayIndex = weekDays.findIndex(d => d.isToday)

  // Find the day index for editing activity
  const getInitialDayIndex = () => {
    if (editingActivity) {
      const editDate = new Date(editingActivity.date)
      const index = weekDays.findIndex(d => d.date.toDateString() === editDate.toDateString())
      return index >= 0 ? index : todayIndex >= 0 ? todayIndex : 0
    }
    return todayIndex >= 0 ? todayIndex : 0
  }

  const [selectedType, setSelectedType] = useState<ActivityType | null>(editingActivity?.type ?? null)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(getInitialDayIndex())
  const [duration, setDuration] = useState<string>(editingActivity?.duration?.toString() ?? '60')
  const [intensity, setIntensity] = useState<number>(editingActivity?.intensity ?? 7)
  const [notes, setNotes] = useState<string>(editingActivity?.notes ?? '')

  const isEditing = !!editingActivity

  const handleSubmit = () => {
    if (!selectedType) return

    haptics.success()

    const activityData = {
      date: weekDays[selectedDayIndex].date.toISOString(),
      type: selectedType,
      duration: parseInt(duration) || 60,
      intensity,
      notes: notes.trim() || undefined
    }

    if (isEditing && onUpdateActivity && editingActivity) {
      onUpdateActivity(activityData, editingActivity.id)
    } else {
      onLogActivity(activityData)
    }
  }

  const isValid = selectedType !== null && parseInt(duration) > 0

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0 pb-28">
        <ScreenShellContent>
          {/* Header */}
          <header className="px-6 safe-area-top pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {isEditing ? 'Edit Activity' : 'Log Activity'}
              </p>
              <h1 className="type-title text-foreground mt-1">
                External Training
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground px-3"
              onClick={onClose}
              aria-label="Close"
            >
              Cancel
            </Button>
          </header>

          {/* Day Selection */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Which Day?
            </p>
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scroll-fade-x">
              {weekDays.map((day, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDayIndex(index)}
                  stacked
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-lg text-center transition-all min-w-[52px] normal-case tracking-normal border
                    ${selectedDayIndex === index
                      ? 'bg-primary text-primary-foreground border-primary'
                      : day.isToday
                        ? 'bg-primary/10 text-foreground border-primary/40'
                        : 'bg-card/50 text-muted-foreground border-border/50 hover:bg-card/70'
                    }
                  `}
                  aria-pressed={selectedDayIndex === index}
                >
                  <p className="text-xs font-semibold">{day.shortLabel}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">
                    {day.date.getDate()}
                  </p>
                </Button>
              ))}
            </div>
            {weekDays[selectedDayIndex] && (
              <p className="text-xs text-muted-foreground mt-2">
                Logging for: <span className="text-foreground font-medium">{weekDays[selectedDayIndex].label}</span>
              </p>
            )}
          </div>

          {/* Activity Type Selection */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Activity Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map(({ type, label, icon }) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  stacked
                  className={`
                    w-full p-4 rounded-lg text-left transition-all normal-case tracking-normal h-auto items-start justify-start border min-h-[110px] gap-2
                    ${selectedType === type
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/50 border-border/60 hover:bg-card/70'
                    }
                  `}
                  aria-pressed={selectedType === type}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {icon}
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    {label}
                  </p>
                </Button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Duration (minutes)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-3">
              {[30, 45, 60, 90, 120].map((mins) => (
                <Button
                  key={mins}
                  variant="ghost"
                  size="sm"
                  onClick={() => setDuration(mins.toString())}
                  className={`
                    min-h-[44px] py-3 rounded-lg text-sm font-semibold transition-all normal-case tracking-normal
                    ${duration === mins.toString()
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/50 text-muted-foreground hover:bg-card/70'
                    }
                  `}
                >
                  {mins}
                </Button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Intensity: {intensity}/10
            </p>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <Button
                  key={level}
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntensity(level)}
                  className={`
                    min-h-[44px] py-2 rounded text-xs font-bold transition-all normal-case tracking-normal
                    ${intensity >= level
                      ? level <= 3 ? 'bg-primary/30 text-foreground'
                        : level <= 6 ? 'bg-primary/60 text-foreground'
                        : level <= 8 ? 'bg-primary/80 text-primary-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-card/30 text-muted-foreground'
                    }
                  `}
                  aria-label={`Intensity ${level}`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Notes (optional)
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go? Any techniques you worked on?"
              className="bg-card/50 text-sm min-h-[96px]"
            />
          </div>
        </ScreenShellContent>

        {/* Submit Button */}
        <ScreenShellFooter className="px-6">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            variant="primary"
            size="xl"
            fullWidth
            withHaptic={false}
            className={!isValid ? 'bg-card/50 text-muted-foreground' : ''}
          >
            {isEditing ? 'Update Activity' : 'Log Activity'}
          </Button>
        </ScreenShellFooter>
      </div>

    </ScreenShell>
  )
}
