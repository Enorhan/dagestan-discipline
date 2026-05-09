'use client'

import Image from 'next/image'
import { BarChart3, BookOpen, GitBranch, PencilLine, Send } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { BjjSystem, BjjTechnique } from '@/lib/bjj-types'
import { getMartialArtsBranchLabel } from '@/lib/martial-arts-branches'
import type { SocialProfileOverview } from '@/lib/social-models'
import { cn } from '@/lib/utils'

export type YouProfileTab = 'techniques' | 'graphs'

type SocialYouProfileProps = {
  activeTab: YouProfileTab
  loading: boolean
  onEditProfile: () => void
  onOpenFollowers: () => void
  onOpenFollowing: () => void
  onOpenInsights: () => void
  onOpenSystem: (system: BjjSystem) => void
  onOpenTechnique: (techniqueId: string) => void
  onShareProfile: () => void
  onTabChange: (tab: YouProfileTab) => void
  onBrowseDiscoverTechniques?: () => void
  onCreateGameplan?: () => void
  overview: SocialProfileOverview
  systems: BjjSystem[]
  techniques: BjjTechnique[]
}

const PROFILE_TABS: YouProfileTab[] = ['techniques', 'graphs']

function TechniqueList({
  items,
  loading,
  onOpen,
  onBrowse,
}: {
  items: BjjTechnique[]
  loading?: boolean
  onOpen: (techniqueId: string) => void
  onBrowse?: () => void
}) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton-shimmer h-20 rounded-[18px] bg-white/[0.06]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[34vh] flex-col items-center justify-center px-8 text-center">
        <p className="text-[28px] font-black tracking-tight text-white">No techniques yet</p>
        <p className="mt-2 max-w-[280px] text-sm leading-6 text-white/56">
          Techniques you create or save appear here.
        </p>
        {onBrowse ? (
          <button
            type="button"
            onClick={onBrowse}
            className="mt-6 rounded-full border border-[#4d7cff]/45 bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(47,88,255,0.35)]"
          >
            Browse Discover
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((technique) => (
        <button
          key={technique.id}
          type="button"
          onClick={() => onOpen(technique.id)}
          className="block w-full rounded-[18px] border border-white/8 bg-white/[0.05] px-4 py-3.5 text-left"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#4d7cff]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">{technique.title}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/36">
                {getMartialArtsBranchLabel(technique.branch)} · {technique.category}
              </p>
              {technique.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {technique.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/58">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function SystemList({
  items,
  loading,
  onOpen,
  onCreate,
}: {
  items: BjjSystem[]
  loading?: boolean
  onOpen: (system: BjjSystem) => void
  onCreate?: () => void
}) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-shimmer h-24 rounded-[18px] bg-white/[0.06]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[34vh] flex-col items-center justify-center px-8 text-center">
        <p className="text-[28px] font-black tracking-tight text-white">No gameplans yet</p>
        <p className="mt-2 max-w-[280px] text-sm leading-6 text-white/56">
          Gameplans you create appear here.
        </p>
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="mt-6 rounded-full border border-[#4d7cff]/45 bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(47,88,255,0.35)]"
          >
            Build a gameplan
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((system) => (
        <button
          key={system.id}
          type="button"
          onClick={() => onOpen(system)}
          className="block w-full rounded-[18px] border border-white/8 bg-white/[0.05] px-4 py-3.5 text-left"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4d7cff]/16 text-[#b8c9ff]">
              <GitBranch className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">{system.title}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/56">{system.summary}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/36">
                {getMartialArtsBranchLabel(system.branch)} · {system.nodes.length} steps
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function SocialYouProfile({
  activeTab,
  loading,
  onEditProfile,
  onOpenFollowers,
  onOpenFollowing,
  onOpenInsights,
  onOpenSystem,
  onOpenTechnique,
  onShareProfile,
  onTabChange,
  onBrowseDiscoverTechniques,
  onCreateGameplan,
  overview,
  systems,
  techniques,
}: SocialYouProfileProps) {
  const swipeStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null)

  useEffect(() => {
    swipeStartRef.current = null
  }, [activeTab])

  const handleSwipeNavigate = (direction: 'left' | 'right') => {
    const currentIndex = PROFILE_TABS.indexOf(activeTab)
    if (currentIndex < 0) return
    const nextIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1
    const nextTab = PROFILE_TABS[nextIndex]
    if (!nextTab) return
    onTabChange(nextTab)
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (!touch) return
        swipeStartRef.current = { x: touch.clientX, y: touch.clientY, active: true }
      }}
      onTouchMove={(event) => {
        const start = swipeStartRef.current
        const touch = event.touches[0]
        if (!start || !start.active || !touch) return
        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
          swipeStartRef.current = null
        }
      }}
      onTouchEnd={(event) => {
        const start = swipeStartRef.current
        const touch = event.changedTouches[0]
        swipeStartRef.current = null
        if (!start || !start.active || !touch) return
        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        if (Math.abs(dx) < 60) return
        if (Math.abs(dy) > 40) return
        handleSwipeNavigate(dx < 0 ? 'left' : 'right')
      }}
    >
      <div className="space-y-4 px-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-black tracking-tight text-white">@{overview.username}</p>
          </div>
          <button
            type="button"
            onClick={onOpenInsights}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
            aria-label="Open insights"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/6">
            {overview.avatarUrl ? (
              <Image src={overview.avatarUrl} alt={overview.displayName} fill className="object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xl font-black text-white">
                {(overview.displayName || 'G').charAt(0)}
              </div>
            )}
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
            <button type="button" onClick={() => onTabChange('techniques')} className="text-center">
              <p className="text-[22px] font-black text-white">{techniques.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Techniques</p>
            </button>
            <button type="button" onClick={() => onTabChange('graphs')} className="text-center">
              <p className="text-[22px] font-black text-white">{systems.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Gameplans</p>
            </button>
            <button type="button" onClick={onOpenFollowers} className="text-center">
              <p className="text-[22px] font-black text-white">{overview.followerCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">Followers</p>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-base font-black text-white">{overview.displayName}</p>
          {overview.bio ? (
            <p className="text-sm leading-6 text-white/64">{overview.bio}</p>
          ) : (
            <p className="text-sm leading-6 text-white/38">Techniques and gameplans from your training system.</p>
          )}
          {overview.primaryDiscipline ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
              Practicing {overview.primaryDiscipline}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white"
          >
            <PencilLine className="h-4 w-4" />
            Edit profile
          </button>
          <button
            type="button"
            onClick={onOpenFollowing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white"
          >
            <BookOpen className="h-4 w-4" />
            Following
          </button>
          <button
            type="button"
            onClick={onShareProfile}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
            aria-label="Share profile"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-5 border-b border-white/10" role="tablist" aria-label="Profile tabs">
          {([
            { value: 'techniques', label: 'Techniques', Icon: BookOpen, count: techniques.length },
            { value: 'graphs', label: 'Gameplans', Icon: GitBranch, count: systems.length },
          ] as const).map(({ value, label, Icon, count }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              role="tab"
              aria-selected={activeTab === value}
              tabIndex={activeTab === value ? 0 : -1}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-0 py-3 text-sm font-bold transition',
                activeTab === value ? 'border-white text-white' : 'border-transparent text-white/44',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <span className="text-[11px] text-white/36">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="isolate mt-3 min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="px-1">
          {activeTab === 'techniques' ? (
            <TechniqueList items={techniques} loading={loading} onOpen={onOpenTechnique} onBrowse={onBrowseDiscoverTechniques} />
          ) : (
            <SystemList items={systems} loading={loading} onOpen={onOpenSystem} onCreate={onCreateGameplan} />
          )}
        </div>
      </div>
    </div>
  )
}
