'use client'

import { type RefObject } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { EmptyState, SearchField, ShellCard } from '@/components/bjj-app/primitives'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { BRANCH_DOT_COLORS, CALENDAR_WEEKDAY_LABELS } from '@/components/bjj-app/constants'
import {
  formatDayKey,
  formatMonthTitle,
  formatPrettyDateTime,
  formatSelectedDayTitle,
  parseDayKey,
} from '@/components/bjj-app/date-utils'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import type { BjjPersistedState, BjjSession, BjjSurface, BjjSystem, BjjTechnique } from '@/lib/bjj-types'
import type { MatFlowAccessState } from '@/lib/matflow-access'

export interface TodaySessionGroup {
  key: string
  label: string
  sessions: BjjSession[]
}

export interface TodayShellProps {
  appState: BjjPersistedState | null
  activeGameplan: BjjSystem | null
  matflowAccess: MatFlowAccessState
  sessionStats: { weekCount: number; weekMinutes: number; streak: number }
  systemsState: BjjSystem[]
  sessionSearchInputRef: RefObject<HTMLInputElement | null>
  sessionSearchInput: string
  setSessionSearchInput: (value: string) => void
  sessionsView: 'list' | 'calendar'
  setSessionsView: (view: 'list' | 'calendar') => void
  filteredSessions: BjjSession[]
  groupedSessions: TodaySessionGroup[]
  libraryTechniques: BjjTechnique[]
  shellSubsectionSpacingClass: string
  shellCompactCardPaddingClass: string
  shellCardTitleClass: string
  calendarAnchor: Date
  calendarMatrix: Date[]
  calendarMonthStats: { count: number; minutes: number }
  isViewingCurrentMonth: boolean
  todayDayKey: string
  selectedCalendarDay: string | null
  sessionsByDay: Map<string, BjjSession[]>
  streakDayKeys: Set<string>
  selectedDaySessions: BjjSession[]
  openCreateSession: (dayKey?: string) => void
  openSystemReader: (system: BjjSystem) => void
  openSessionDetail: (sessionId: string) => void
  openEditSession: (session: BjjSession) => void
  handleRequestDeleteSession: (session: BjjSession) => void
  handlePrevMonth: () => void
  handleNextMonth: () => void
  handleGoToTodayMonth: () => void
  handleSelectCalendarDay: (key: string) => void
  updateAppState: (updater: (previous: BjjPersistedState) => BjjPersistedState) => void
  setActiveSurface: (surface: BjjSurface | null) => void
  onPullToRefresh?: () => Promise<void> | void
}

/**
 * P1-01 Phase D — Today (training cockpit / sessions) route shell.
 * Pure presentation; all state and handlers come from `BjjAppInner`.
 */
export function TodayShell(props: TodayShellProps) {
  const {
    appState,
    activeGameplan,
    matflowAccess,
    sessionStats,
    systemsState,
    sessionSearchInputRef,
    sessionSearchInput,
    setSessionSearchInput,
    sessionsView,
    setSessionsView,
    filteredSessions,
    groupedSessions,
    libraryTechniques,
    shellSubsectionSpacingClass,
    shellCompactCardPaddingClass,
    shellCardTitleClass,
    calendarAnchor,
    calendarMatrix,
    calendarMonthStats,
    isViewingCurrentMonth,
    todayDayKey,
    selectedCalendarDay,
    sessionsByDay,
    streakDayKeys,
    selectedDaySessions,
    openCreateSession,
    openSystemReader,
    openSessionDetail,
    openEditSession,
    handleRequestDeleteSession,
    handlePrevMonth,
    handleNextMonth,
    handleGoToTodayMonth,
    handleSelectCalendarDay,
    updateAppState,
    setActiveSurface,
    onPullToRefresh,
  } = props

  return (
          <PullToRefresh onRefresh={onPullToRefresh} className="pb-4">
            <div className="mb-4 space-y-3">
              <ShellCard className="overflow-hidden border-[#4d7cff]/18 bg-[#07101f]/78 p-4 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8cabff]">Today</p>
                    <h1 className="mt-1 text-[28px] font-black leading-none text-white">Training cockpit</h1>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/58">
                      {activeGameplan
                        ? `Review ${activeGameplan.title} or log the next session.`
                        : 'Log a session, build a gameplan, or save your next technical note.'}
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                    matflowAccess.trialExpired
                      ? 'border-red-400/30 bg-red-500/12 text-red-100'
                      : matflowAccess.hasPaidAccess
                        ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100'
                        : 'border-[#4d7cff]/35 bg-[#4d7cff]/16 text-[#d9e4ff]',
                  )}>
                    {matflowAccess.hasPaidAccess
                      ? 'Pro'
                      : matflowAccess.trialExpired
                        ? 'Locked'
                        : `${matflowAccess.trialDaysRemaining}d trial`}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Sessions', sessionStats.weekCount],
                    ['Mat min', sessionStats.weekMinutes],
                    ['Gameplans', systemsState.filter((system) => system.status !== 'draft').length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] border border-white/8 bg-white/[0.045] px-3 py-2.5">
                      <p className="text-lg font-black leading-none text-white">{value}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void haptics.light()
                      openCreateSession()
                    }}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[16px] bg-white px-4 text-sm font-black text-black"
                  >
                    <Plus className="h-4 w-4" />
                    Log session
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void haptics.light()
                      if (activeGameplan) {
                        openSystemReader(activeGameplan)
                        return
                      }
                      updateAppState((previous) => ({ ...previous, selectedBottomTab: 'gameplans', selectedTechniquesTab: 'systems' }))
                    }}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white/78 transition active:scale-[0.97]"
                  >
                    {activeGameplan ? 'Open map' : 'New map'}
                  </button>
                </div>
              </ShellCard>
              {matflowAccess.trialExpired ? (
                <ShellCard className="border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-red-100">Your MatFlow trial has ended</p>
                      <p className="mt-1 text-sm leading-6 text-red-100/70">Training creation and community actions unlock with Pro.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void haptics.light()
                        setActiveSurface('paywall')
                      }}
                      className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-black transition active:scale-[0.97]"
                    >
                      Subscribe
                    </button>
                  </div>
                </ShellCard>
              ) : null}
            </div>
            <SearchField inputRef={sessionSearchInputRef} value={sessionSearchInput} onChange={(event) => setSessionSearchInput(event.target.value)} placeholder="Search sessions" />
            {(appState?.sessions ?? []).length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">This week</p>
                  <p className="mt-1 text-lg font-black text-white">{sessionStats.weekCount}</p>
                  <p className="text-[11px] font-semibold text-white/50">sessions</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Mat time</p>
                  <p className="mt-1 text-lg font-black text-white">{sessionStats.weekMinutes}</p>
                  <p className="text-[11px] font-semibold text-white/50">min this wk</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Streak</p>
                  <p className="mt-1 text-lg font-black text-white">{sessionStats.streak}</p>
                  <p className="text-[11px] font-semibold text-white/50">{sessionStats.streak === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
            )}
            {(appState?.sessions ?? []).length > 0 && (
              <div
                role="tablist"
                aria-label="Sessions view"
                className="mt-3 inline-flex w-full rounded-full border border-white/10 bg-white/6 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={sessionsView === 'list'}
                  onClick={() => {
                    if (sessionsView !== 'list') void haptics.light()
                    setSessionsView('list')
                  }}
                  className={cn(
                    'flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition',
                    sessionsView === 'list' ? 'bg-white text-black' : 'text-white/65 hover:text-white/85',
                  )}
                >
                  List
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sessionsView === 'calendar'}
                  onClick={() => {
                    if (sessionsView !== 'calendar') void haptics.light()
                    setSessionsView('calendar')
                  }}
                  className={cn(
                    'flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition',
                    sessionsView === 'calendar' ? 'bg-white text-black' : 'text-white/65 hover:text-white/85',
                  )}
                >
                  Calendar
                </button>
              </div>
            )}
            {sessionsView === 'list' && (
              <div className="mt-2.5 flex items-center justify-between px-1 text-sm font-semibold text-white/70">
                <span>{filteredSessions.length} sessions found</span>
                <span>New</span>
              </div>
            )}
            {sessionsView === 'list' && (filteredSessions.length === 0 ? (
              <EmptyState
                title={(appState?.sessions ?? []).length === 0 ? 'Start tracking your training' : 'No matches'}
                body={(appState?.sessions ?? []).length === 0
                  ? 'Log your first session to see your rolls, rounds, and progress build up over time.'
                  : 'Try a different search, or clear the query to see every session you have logged.'}
                actionLabel={(appState?.sessions ?? []).length === 0 ? 'Log a session' : 'Clear search'}
                onAction={(appState?.sessions ?? []).length === 0 ? () => openCreateSession() : () => setSessionSearchInput('')}
              />
            ) : (
              <div className={cn(shellSubsectionSpacingClass, 'space-y-5')}>
                {groupedSessions.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">{group.label}</span>
                      <span className="h-px flex-1 bg-white/8" />
                      <span className="text-[11px] font-semibold text-white/35">{group.sessions.length}</span>
                    </div>
                    <div className="space-y-3">
                      {group.sessions.map((session) => (
                        <ShellCard key={session.id} className={cn(shellCompactCardPaddingClass, 'relative')}>
                          <button
                            type="button"
                            aria-label={`Open ${session.type} session at ${session.location}`}
                            onClick={() => {
                              void haptics.light()
                              openSessionDetail(session.id)
                            }}
                            className="absolute inset-0 rounded-[inherit]"
                          />
                          <div className="pointer-events-none relative flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className={cn(shellCardTitleClass, 'font-bold')}>{session.type} @ {session.location}</p>
                              <p className="mt-1 text-sm text-white/40">{formatPrettyDateTime(session.date, session.time)}</p>
                            </div>
                            <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/55">
                                {session.durationMinutes} min
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void haptics.light()
                                  openEditSession(session)
                                }}
                                aria-label={`Edit session at ${session.location}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/10"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleRequestDeleteSession(session)
                                }}
                                aria-label={`Delete session at ${session.location}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-red-500/15 hover:text-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </div>
                          <div className="pointer-events-none relative mt-4 grid grid-cols-2 gap-3 text-sm font-semibold">
                            <div className="rounded-[18px] bg-white/6 p-3">
                              <p className="text-white/45">Submissions</p>
                              <p className="mt-1 text-lg">{session.submissions.length}</p>
                            </div>
                            <div className="rounded-[18px] bg-white/6 p-3">
                              <p className="text-white/45">Taps</p>
                              <p className="mt-1 text-lg">{session.taps.length}</p>
                            </div>
                          </div>
                          {session.linkedTechniqueIds.length > 0 && (
                            <div className="pointer-events-none relative mt-4 flex flex-wrap gap-2">
                              {session.linkedTechniqueIds.map((id) => {
                                const technique = libraryTechniques.find((entry) => entry.id === id)
                                if (!technique) return null
                                return (
                                  <span key={id} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/70">
                                    {technique.title}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </ShellCard>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {sessionsView === 'calendar' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/75 transition hover:bg-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <div className="flex min-w-0 flex-col items-center">
                    <p className="text-[15px] font-black leading-tight text-white">{formatMonthTitle(calendarAnchor)}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/45">
                      {calendarMonthStats.count} {calendarMonthStats.count === 1 ? 'session' : 'sessions'} · {calendarMonthStats.minutes} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/75 transition hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                {!isViewingCurrentMonth && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleGoToTodayMonth}
                      className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold text-white/85 hover:bg-white/12"
                    >
                      Jump to today
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-7 gap-1 px-0.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  {CALENDAR_WEEKDAY_LABELS.map((label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarMatrix.map((cellDate) => {
                    const cellKey = formatDayKey(cellDate)
                    const inMonth = cellDate.getMonth() === calendarAnchor.getMonth()
                    const isToday = cellKey === todayDayKey
                    const isSelected = cellKey === selectedCalendarDay
                    const daySessions = sessionsByDay.get(cellKey) ?? []
                    const hasSessions = daySessions.length > 0
                    const onStreak = streakDayKeys.has(cellKey)
                    const dotColors = hasSessions
                      ? Array.from(new Set(daySessions.map((s) => BRANCH_DOT_COLORS[s.branch] ?? '#4d7cff'))).slice(0, 3)
                      : []
                    return (
                      <button
                        key={cellKey}
                        type="button"
                        onClick={() => handleSelectCalendarDay(cellKey)}
                        aria-label={`${cellDate.toDateString()}${hasSessions ? `, ${daySessions.length} ${daySessions.length === 1 ? 'session' : 'sessions'}` : ''}`}
                        aria-pressed={isSelected}
                        className={cn(
                          'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[13px] font-semibold transition',
                          inMonth ? 'text-white/85' : 'text-white/25',
                          isSelected
                            ? 'border-white bg-white text-black shadow-[0_0_0_2px_rgba(255,255,255,0.12)]'
                            : isToday
                              ? 'border-[#4d7cff]/50 bg-[#4d7cff]/10'
                              : onStreak
                                ? 'border-[#ffba33]/30 bg-[#ffba33]/6'
                                : 'border-white/6 bg-white/4 hover:bg-white/8',
                        )}
                      >
                        <span className={cn('leading-none', isSelected && 'font-black')}>{cellDate.getDate()}</span>
                        {dotColors.length > 0 && (
                          <span className="absolute bottom-1.5 flex items-center gap-0.5">
                            {dotColors.map((color, index) => (
                              <span
                                key={`${cellKey}-dot-${index}`}
                                className="h-1 w-1 rounded-full"
                                style={{ backgroundColor: isSelected ? '#000' : color }}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-semibold text-white/45">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4d7cff]" /> Trained
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm border border-[#ffba33]/50 bg-[#ffba33]/10" /> Current streak
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm border border-[#4d7cff]/50 bg-[#4d7cff]/10" /> Today
                  </span>
                </div>
                {selectedCalendarDay ? (() => {
                  const dayDate = parseDayKey(selectedCalendarDay)
                  if (!dayDate) return null
                  return (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[15px] font-black text-white">{formatSelectedDayTitle(dayDate)}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-white/45">
                            {selectedDaySessions.length === 0
                              ? 'No sessions logged'
                              : `${selectedDaySessions.length} ${selectedDaySessions.length === 1 ? 'session' : 'sessions'}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCreateSession(selectedCalendarDay)}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white/90"
                        >
                          Log session
                        </button>
                      </div>
                      {selectedDaySessions.length > 0 && (
                        <div className="space-y-2">
                          {selectedDaySessions.map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => {
                                void haptics.light()
                                openSessionDetail(session.id)
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/6 px-3 py-2.5 text-left transition hover:bg-white/10"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: BRANCH_DOT_COLORS[session.branch] ?? '#4d7cff' }}
                                  aria-hidden
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-white">{session.type} @ {session.location || 'Training'}</span>
                                  <span className="block text-[11px] font-semibold text-white/45">{session.time} · {session.durationMinutes} min</span>
                                </span>
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <p className="px-1 text-[12px] font-semibold text-white/45">Tap any day to see sessions or log a new one.</p>
                )}
              </div>
            )}
          </PullToRefresh>
  )
}
