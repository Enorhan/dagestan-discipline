'use client'

import { useState, type ReactNode } from 'react'
import { ActivityType, ActivityLog } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import { Gi, Wrestling, Stretch, Trophy, Boxing, Drill, Flame, Clock } from '@/components/ui/icons'

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

const ACTIVITY_TYPES: { type: ActivityType; label: string; description: string; icon: ReactNode }[] = [
  {
    type: 'bjj-session',
    label: 'BJJ Session',
    description: 'Gi or no-gi class and rounds',
    icon: <Gi size={22} className="text-primary" />,
  },
  {
    type: 'wrestling-practice',
    label: 'Wrestling Practice',
    description: 'Technical work and live goes',
    icon: <Wrestling size={22} className="text-primary" />,
  },
  {
    type: 'judo-class',
    label: 'Judo Class',
    description: 'Throws, entries, and randori',
    icon: <Gi size={22} className="text-primary" />,
  },
  {
    type: 'open-mat',
    label: 'Open Mat',
    description: 'Unstructured sparring session',
    icon: <Stretch size={22} className="text-primary" />,
  },
  {
    type: 'competition',
    label: 'Competition',
    description: 'Tournament or match day',
    icon: <Trophy size={22} className="text-primary" />,
  },
  {
    type: 'sparring',
    label: 'Sparring',
    description: 'Focused live rounds',
    icon: <Boxing size={22} className="text-primary" />,
  },
  {
    type: 'drilling',
    label: 'Drilling',
    description: 'High-rep technical practice',
    icon: <Drill size={22} className="text-primary" />,
  },
  {
    type: 'conditioning',
    label: 'Conditioning',
    description: 'Roadwork, intervals, circuits',
    icon: <Flame size={22} className="text-primary" />,
  },
]

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120]

const getIntensityLabel = (value: number) => {
  if (value <= 3) return 'Easy'
  if (value <= 6) return 'Moderate'
  if (value <= 8) return 'Hard'
  return 'Max Effort'
}

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
  const selectedDay = weekDays[selectedDayIndex]
  const selectedTypeMeta = ACTIVITY_TYPES.find((item) => item.type === selectedType) ?? null
  const parsedDuration = Number.parseInt(duration, 10)
  const validDuration = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0

  const handleSubmit = () => {
    if (!selectedType || !validDuration) return

    haptics.success()

    const activityData = {
      date: selectedDay.date.toISOString(),
      type: selectedType,
      duration: validDuration,
      intensity,
      notes: notes.trim() || undefined
    }

    if (isEditing && onUpdateActivity && editingActivity) {
      onUpdateActivity(activityData, editingActivity.id)
    } else {
      onLogActivity(activityData)
    }
  }

  const isValid = selectedType !== null && validDuration > 0

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth>
        <div className="pb-32">
          {/* Hero */}
          <div className="relative safe-area-top pb-8 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background to-background opacity-60" />
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
                  {isEditing ? 'Edit Activity' : 'Log Activity'}
                </p>
                <BackButton
                  onClick={onClose}
                  label="Cancel"
                  styleVariant="glass"
                />
              </div>

              <h1 className="text-4xl font-black tracking-tight text-foreground">
                External Training
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-[320px] leading-relaxed">
                Capture mat sessions outside your lift so weekly load, streaks, and recovery stay accurate.
              </p>
            </div>
          </div>

          {/* Day Selection */}
          <div className="px-6 py-3">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
              Which Day
            </h2>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-fade-x">
              {weekDays.map((day, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDayIndex(index)}
                  stacked
                  className={`
                    min-w-[72px] rounded-xl border px-3 py-2 text-center h-auto items-center justify-center gap-0.5
                    ${selectedDayIndex === index
                      ? 'bg-primary/20 border-primary/70 text-foreground'
                      : day.isToday
                        ? 'bg-primary/10 border-primary/40 text-foreground/90'
                        : 'bg-white/[0.02] border-white/10 text-muted-foreground hover:text-foreground'
                    }
                  `}
                  aria-pressed={selectedDayIndex === index}
                >
                  <p className="text-base font-black leading-none">
                    {day.shortLabel}
                  </p>
                  <p className="text-xs mt-1 opacity-75">
                    {day.date.getDate()}
                  </p>
                </Button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Logging for{' '}
                <span className="text-foreground font-semibold">
                  {selectedDay.label}
                </span>
                {' '}({selectedDay.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </p>
            </div>
          </div>

          {/* Activity Type */}
          <div className="px-6 py-4">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
              Activity Type
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {ACTIVITY_TYPES.map(({ type, label, description, icon }) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  stacked
                  className={`
                    w-full rounded-2xl p-4 text-left h-auto items-start justify-start min-h-[132px] border gap-3
                    ${selectedType === type
                      ? 'border-primary/70 bg-gradient-to-br from-primary/25 via-black/80 to-black/95'
                      : 'border-white/10 bg-gradient-to-br from-white/[0.03] via-black/80 to-black/95'
                    }
                  `}
                  aria-pressed={selectedType === type}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${selectedType === type ? 'bg-primary/20' : 'bg-primary/10'}`}>
                    {icon}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {label}
                    </p>
                    <p className="text-xs text-white/55 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Session Details */}
          <div className="px-6 py-4 space-y-3">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase">
              Session Details
            </h2>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-black/80 to-black/95 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <Clock size={16} className="text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-cyan-200">Duration</p>
                  <p className="text-[11px] text-white/60 uppercase tracking-[0.18em]">Minutes</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_OPTIONS.map((mins) => (
                  <Button
                    key={mins}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDuration(mins.toString())}
                    className={`
                      h-10 rounded-lg text-xs font-bold
                      ${duration === mins.toString()
                        ? 'bg-cyan-500/25 border border-cyan-300/40 text-cyan-100'
                        : 'bg-white/[0.03] border border-white/10 text-white/65 hover:text-white'
                      }
                    `}
                  >
                    {mins}
                  </Button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={1}
                  step={5}
                  className="h-11 bg-white/[0.03] border-white/10 text-center font-bold"
                  placeholder="60"
                />
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">min</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-black/80 to-black/95 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Flame size={16} className="text-amber-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-200">Intensity {intensity}/10</p>
                  <p className="text-[11px] text-white/60 uppercase tracking-[0.18em]">{getIntensityLabel(intensity)}</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <Button
                    key={level}
                    variant="ghost"
                    size="sm"
                    onClick={() => setIntensity(level)}
                    className={`
                      h-10 rounded-lg text-xs font-black
                      ${intensity >= level
                        ? 'bg-amber-500/25 border border-amber-300/40 text-amber-100'
                        : 'bg-white/[0.03] border border-white/10 text-white/45'
                      }
                    `}
                    aria-label={`Intensity ${level}`}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 py-4">
            <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/70 uppercase mb-3">
              Notes
            </h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go? Any techniques, rounds, or weaknesses to address?"
              className="min-h-[120px] rounded-2xl bg-white/[0.02] border-white/10 text-sm"
              maxLength={500}
              showCount
            />
          </div>
        </div>
      </ScreenShellContent>

      {/* Submit Button */}
      <ScreenShellFooter>
        <div className="max-w-lg mx-auto w-full px-6">
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Ready to log
            </p>
            <p className="text-sm font-semibold text-foreground mt-1">
              {selectedTypeMeta?.label ?? 'Select an activity type'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedDay.label} · {validDuration > 0 ? `${validDuration} min` : 'Set duration'} · Intensity {intensity}/10
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            variant="primary"
            size="xl"
            fullWidth
            withHaptic={false}
            className={isValid ? 'font-black uppercase tracking-[0.14em] card-interactive' : 'bg-card/50 text-muted-foreground'}
          >
            {isEditing ? 'Update Activity' : 'Log Activity'}
          </Button>
        </div>
      </ScreenShellFooter>
    </ScreenShell>
  )
}
