'use client'

import { Check, ChevronDown, ChevronRight, Flame, Medal, Target, Trophy, Zap } from 'lucide-react'
import { ShellCard } from '@/components/bjj-app/primitives'
import { ANALYTICS_CARDS } from '@/components/bjj-app/constants'
import { cn } from '@/lib/utils'
import type {
  BjjAchievement,
  BjjAnalyticsWindow,
  BjjChallenge,
  BjjChecklistItem,
  BjjPersistedState,
} from '@/lib/bjj-types'

export interface YouLegacyShellProps {
  appState: BjjPersistedState
  isCompactHeight: boolean
  analyticsLabel: string
  analyticsSessionsLength: number
  totalSubmissions: number
  totalTaps: number
  analyticsTechniqueCount: number
  favoriteSubmissions: Array<[string, number]>
  challenges: BjjChallenge[]
  completedChallengeCount: number
  challengeCompletionPercent: number
  achievements: BjjAchievement[]
  completedAchievementCount: number
  achievementCompletionPercent: number
  checklistItems: BjjChecklistItem[]
  shellSectionSpacingClass: string
  shellSubsectionSpacingClass: string
  shellSectionTitleClass: string
  shellCompactCardPaddingClass: string
  shellMetricTileClass: string
  shellFeatureTitleClass: string
  shellCardTitleClass: string
  beginEditProfile: () => void
  setAnalyticsWindow: (updater: (previous: BjjAnalyticsWindow) => BjjAnalyticsWindow) => void
  updateAppState: (updater: (previous: BjjPersistedState) => BjjPersistedState) => void
}

/**
 * P1-01 Phase D — Legacy `You` (non-social profile) route shell.
 * Pure presentation: stats, analytics tiles, weekly challenges, achievements,
 * checklist, favourite submissions. All state and handlers come from `BjjAppInner`.
 */
export function YouLegacyShell({
  appState,
  isCompactHeight,
  analyticsLabel,
  analyticsSessionsLength,
  totalSubmissions,
  totalTaps,
  analyticsTechniqueCount,
  favoriteSubmissions,
  challenges,
  completedChallengeCount,
  challengeCompletionPercent,
  achievements,
  completedAchievementCount,
  achievementCompletionPercent,
  checklistItems,
  shellSectionSpacingClass,
  shellSubsectionSpacingClass,
  shellSectionTitleClass,
  shellCompactCardPaddingClass,
  shellMetricTileClass,
  shellFeatureTitleClass,
  shellCardTitleClass,
  beginEditProfile,
  setAnalyticsWindow,
  updateAppState,
}: YouLegacyShellProps) {
  return (
    <div className="flex-1 overflow-y-auto pb-6">
      <button
        type="button"
        onClick={beginEditProfile}
        className={cn(isCompactHeight ? 'text-[28px]' : 'text-[34px]', 'mb-3 block text-left font-black text-[#4d7cff]')}
      >
        {appState.profile.displayName}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <ShellCard className={shellCompactCardPaddingClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">FlowStreak</p>
          <div className="mt-3.5 flex items-end justify-between">
            <p className={cn(shellMetricTileClass, 'font-black')}>{appState.profile.flowStreak}</p>
            <Flame className={cn(isCompactHeight ? 'h-7 w-7' : 'h-8 w-8', 'text-[#4d7cff]')} />
          </div>
        </ShellCard>
        <ShellCard className={shellCompactCardPaddingClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">Training Streak</p>
          <div className="mt-3.5 flex items-end justify-between">
            <p className={cn(shellMetricTileClass, 'font-black')}>{appState.profile.trainingStreak}</p>
            <Zap className={cn(isCompactHeight ? 'h-7 w-7' : 'h-8 w-8', 'text-[#4d7cff]')} />
          </div>
        </ShellCard>
      </div>

      <ShellCard className={cn(shellSubsectionSpacingClass, isCompactHeight ? 'p-4' : 'p-5')}>
        <div>
          <p className={cn(isCompactHeight ? 'text-[28px]' : 'text-[34px]', 'font-black leading-none')}>Level {appState.profile.level}</p>
          <p className="mt-1.5 text-base text-white/50">{appState.profile.xp} Total XP</p>
        </div>
        <div className="mt-5 h-3 rounded-full bg-white/10">
          <div
            className="h-3 rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)]"
            style={{ width: `${Math.min(100, (appState.profile.xp % 300) / 3)}%` }}
          />
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-white/48">{Math.round((appState.profile.xp % 300) / 3)}%</p>
      </ShellCard>

      <div className={cn(shellSectionSpacingClass, 'flex items-center justify-between px-1')}>
        <h2 className={cn(shellSectionTitleClass, 'font-black leading-none')}>Analytics</h2>
        <button
          type="button"
          onClick={() => setAnalyticsWindow((previous) => previous === 'this-month' ? 'all-time' : 'this-month')}
          className="inline-flex items-center gap-1 text-sm font-semibold text-white/58"
        >
          {analyticsLabel}
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className={cn(shellSubsectionSpacingClass, 'grid grid-cols-2 gap-3')}>
        {ANALYTICS_CARDS.map(({ label, background, Icon }) => {
          const value = label === 'Submissions'
            ? totalSubmissions
            : label === 'Taps'
              ? totalTaps
              : label === 'Sessions'
                ? analyticsSessionsLength
                : analyticsTechniqueCount

          return (
            <ShellCard key={label} className={shellCompactCardPaddingClass} style={{ backgroundColor: background }}>
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[#7ea4ff]" />
                <ChevronRight className="h-4 w-4 text-white/30" />
              </div>
              <p className={cn(isCompactHeight ? 'mt-5 text-[30px]' : 'mt-6 text-[38px]', 'font-black leading-none')}>{value}</p>
              <p className="mt-2.5 text-sm font-semibold text-white/62">{label}</p>
            </ShellCard>
          )
        })}
      </div>

      <ShellCard className={cn(shellSubsectionSpacingClass, shellCompactCardPaddingClass)}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white/80">Top submissions</p>
          <p className="text-xs font-semibold text-white/45">{analyticsLabel}</p>
        </div>
        {favoriteSubmissions.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">Log sessions with submissions to see your top finishes.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {(() => {
              const max = favoriteSubmissions[0]?.[1] ?? 1
              return favoriteSubmissions.map(([submission, count]) => (
                <div key={submission} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold text-white/70">
                    <span className="max-w-[250px] truncate">{submission}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/10">
                    <div
                      className="h-2.5 rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)]"
                      style={{ width: `${Math.max(8, Math.round((count / Math.max(1, max)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </ShellCard>

      <div className={cn(shellSectionSpacingClass, 'flex items-center justify-between px-1')}>
        <h2 className={cn(shellSectionTitleClass, 'font-black leading-none')}>Weekly Challenges</h2>
      </div>
      <ShellCard className={cn(shellSubsectionSpacingClass, 'flex items-center justify-between bg-[#493d06] px-4 py-3')}>
        <div className="inline-flex items-center gap-2 text-lg font-bold">
          <Target className="h-5 w-5 text-[#ffd84d]" />
          {completedChallengeCount} / {challenges.length} Completed
        </div>
        <div className="text-2xl font-black">
          {challengeCompletionPercent}%
        </div>
      </ShellCard>
      <div className={cn(shellSubsectionSpacingClass, 'flex gap-3 overflow-x-auto pb-1')}>
        {challenges.map((challenge) => (
          <ShellCard key={challenge.id} className={cn(shellCompactCardPaddingClass, 'min-w-[280px]')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn(shellFeatureTitleClass, 'font-bold leading-none')}>{challenge.title}</p>
                <p className="mt-2 text-[15px] leading-6 text-white/58">{challenge.summary}</p>
              </div>
              <span className="rounded-full bg-[#163b16] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#62d686]">
                {challenge.difficulty}
              </span>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-white/10">
              <div className="h-2.5 rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)]" style={{ width: `${Math.min(100, (challenge.progress / challenge.goal) * 100)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm font-semibold text-white/48">
              <span>{challenge.progress}/{challenge.goal}</span>
              <span>+{challenge.xpReward} XP</span>
            </div>
          </ShellCard>
        ))}
      </div>

      <div className={cn(shellSectionSpacingClass, 'flex items-center justify-between px-1')}>
        <h2 className={cn(shellSectionTitleClass, 'font-black leading-none')}>Recent Achievements</h2>
      </div>
      <ShellCard className={cn(shellSubsectionSpacingClass, 'flex items-center justify-between bg-[#493d06] px-4 py-3')}>
        <div className="inline-flex items-center gap-2 text-lg font-bold">
          <Trophy className="h-5 w-5 text-[#ffd84d]" />
          {completedAchievementCount} / {achievements.length} Unlocked
        </div>
        <div className="text-2xl font-black">
          {achievementCompletionPercent}%
        </div>
      </ShellCard>
      <div className={cn(shellSubsectionSpacingClass, 'flex gap-3 overflow-x-auto pb-1')}>
        {achievements.map((achievement) => (
          <ShellCard key={achievement.id} className={cn(shellCompactCardPaddingClass, 'min-w-[280px]')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn(shellFeatureTitleClass, 'font-bold leading-none')}>{achievement.title}</p>
                <p className="mt-2 text-[15px] leading-6 text-white/58">{achievement.summary}</p>
              </div>
              <Medal className={cn('h-6 w-6', achievement.progress >= achievement.goal ? 'text-[#ffd84d]' : 'text-white/25')} />
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-white/10">
              <div className="h-2.5 rounded-full bg-white/70" style={{ width: `${Math.min(100, (achievement.progress / achievement.goal) * 100)}%` }} />
            </div>
          </ShellCard>
        ))}
      </div>

      <div className={cn(shellSectionSpacingClass, 'flex items-center justify-between px-1')}>
        <h2 className={cn(shellSectionTitleClass, 'font-black leading-none')}>Blue Belt Checklist</h2>
        <button type="button" className="text-sm font-semibold text-[#7ea4ff]" onClick={() => updateAppState((previous) => ({
          ...previous,
          selectedBottomTab: 'discover',
          selectedTechniquesTab: 'discover',
        }))}>
          Open checklist
        </button>
      </div>
      <div className={cn(shellSubsectionSpacingClass, 'grid gap-3')}>
        {checklistItems.map((item) => (
          <ShellCard key={item.id} className={cn('flex items-start gap-4', shellCompactCardPaddingClass)}>
            <div className={cn('mt-1 flex h-8 w-8 items-center justify-center rounded-full border', item.completed ? 'border-[#4d7cff] bg-[#4d7cff]' : 'border-white/14 bg-white/6')}>
              {item.completed ? <Check className="h-4 w-4" /> : <div className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div>
              <p className={cn(shellCardTitleClass, 'font-bold leading-none')}>{item.title}</p>
              <p className="mt-2 text-[15px] leading-6 text-white/58">{item.summary}</p>
            </div>
          </ShellCard>
        ))}
      </div>

      {favoriteSubmissions.length > 0 && (
        <>
          <div className="mt-8 px-1">
            <h2 className={cn(shellSectionTitleClass, 'font-black leading-none')}>Favourite Submissions</h2>
          </div>
          <div className={cn(shellSubsectionSpacingClass, 'space-y-3')}>
            {favoriteSubmissions.map(([submission, count]) => (
              <ShellCard key={submission} className={cn('flex items-center justify-between', shellCompactCardPaddingClass)}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <span className={cn(shellCardTitleClass, 'font-bold')}>{submission}</span>
                </div>
                <span className={cn(shellFeatureTitleClass, 'font-black')}>{count}</span>
              </ShellCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
