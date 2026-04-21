'use client'

import { ChevronLeft, Medal, Target, Trophy } from 'lucide-react'
import type {
  BjjAchievement,
  BjjChallenge,
  BjjChecklistItem,
} from '@/lib/bjj-types'
import { cn } from '@/lib/utils'

type SocialInsightsSheetProps = {
  achievements: BjjAchievement[]
  analyticsLabel: string
  checklistItems: BjjChecklistItem[]
  onClose: () => void
  onOpenChecklist: () => void
  topSubmissions: Array<[string, number]>
  totalSessions: number
  totalSubmissions: number
  totalTaps: number
  totalTechniques: number
  challenges: BjjChallenge[]
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">{label}</p>
      <p className="mt-2 text-[30px] font-black leading-none text-white">{value}</p>
    </div>
  )
}

/**
 * Insights as a normal shell column (flex + `overflow-y-auto`), not a `position:fixed` overlay.
 * iOS WKWebView often freezes with full-screen fixed layers; inline layout matches Sessions/You.
 */
export function SocialInsightsSheet({
  achievements,
  analyticsLabel,
  checklistItems,
  onClose,
  onOpenChecklist,
  topSubmissions,
  totalSessions,
  totalSubmissions,
  totalTaps,
  totalTechniques,
  challenges,
}: SocialInsightsSheetProps) {
  const completedChallengeCount = challenges.filter((challenge) => challenge.progress >= challenge.goal).length
  const completedAchievementCount = achievements.filter((achievement) => achievement.progress >= achievement.goal).length

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col text-white"
      aria-label="Training insights"
    >
      <header className="mb-3 flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90"
          aria-label="Back"
        >
          <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-white">Insights</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/36">{analyticsLabel}</p>
        </div>
        <div className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Sessions" value={totalSessions} />
          <StatCard label="Techniques" value={totalTechniques} />
          <StatCard label="Submissions" value={totalSubmissions} />
          <StatCard label="Taps" value={totalTaps} />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Top submissions</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
            {topSubmissions.length === 0 ? (
              <p className="text-sm text-white/52">Log sessions with submissions to see your finishing patterns.</p>
            ) : (
              <div className="space-y-3">
                {topSubmissions.map(([submission, count]) => {
                  const max = topSubmissions[0]?.[1] ?? 1
                  return (
                    <div key={submission} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white/76">
                        <span className="truncate">{submission}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/10">
                        <div
                          className="h-2.5 rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)]"
                          style={{ width: `${Math.max(10, Math.round((count / Math.max(1, max)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Challenges</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/36">
              {completedChallengeCount}/{challenges.length}
            </p>
          </div>
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-white">{challenge.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/56">{challenge.summary}</p>
                  </div>
                  <Target className="mt-1 h-5 w-5 shrink-0 text-[#8cabff]" />
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-white/10">
                  <div
                    className="h-2.5 rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)]"
                    style={{ width: `${Math.min(100, Math.round((challenge.progress / Math.max(1, challenge.goal)) * 100))}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-white/42">
                  <span>{challenge.progress}/{challenge.goal}</span>
                  <span>+{challenge.xpReward} XP</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Achievements</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/36">
              {completedAchievementCount}/{achievements.length}
            </p>
          </div>
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-white">{achievement.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/56">{achievement.summary}</p>
                  </div>
                  <Trophy className={cn('mt-1 h-5 w-5 shrink-0', achievement.progress >= achievement.goal ? 'text-[#ffd84d]' : 'text-white/28')} />
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-white/10">
                  <div
                    className="h-2.5 rounded-full bg-white/80"
                    style={{ width: `${Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.goal)) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">Checklist</p>
            <button
              type="button"
              onClick={onOpenChecklist}
              className="text-xs font-semibold text-[#8cabff]"
            >
              Open
            </button>
          </div>
          <div className="space-y-3">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className={cn('mt-1 h-4 w-4 rounded-full', item.completed ? 'bg-[#4c6fff]' : 'border border-white/22')} />
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/56">{item.summary}</p>
                </div>
                <Medal className="ml-auto mt-1 h-4 w-4 shrink-0 text-white/28" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
