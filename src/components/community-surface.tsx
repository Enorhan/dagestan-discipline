'use client'

import Image from 'next/image'
import { Bell, BookOpen, ChevronDown, GitFork, Network, Search, Star, Trophy, Users2, Compass, MessageSquare, X } from 'lucide-react'
import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react'
import type { BjjLeaderboardEntry, BjjSocialSurface, BjjSuggestedGrappler } from '@/lib/bjj-types'
import {
  getMartialArtsBranchLabel,
  MARTIAL_ARTS_BRANCHES,
  normalizeMartialArtsBranchId,
} from '@/lib/martial-arts-branches'
import { bjjService } from '@/lib/bjj-service'
import { communityService, type DiscoverSystemCard, type DiscoverTechniqueCard, type ReceivedReviewRow } from '@/lib/community-service'
import { useToast } from '@/contexts/toast-context'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'

function DiscoverListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-1">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export type CommunityTab = 'discover' | 'leaderboards' | 'coaches' | 'reviews'

const COMMUNITY_TABS: Array<{ value: CommunityTab; label: string; Icon: typeof Compass }> = [
  { value: 'discover', label: 'Discover', Icon: Compass },
  { value: 'leaderboards', label: 'Leaderboards', Icon: Trophy },
  { value: 'coaches', label: 'Coaches', Icon: Users2 },
  { value: 'reviews', label: 'Reviews', Icon: MessageSquare },
]

type CommunitySurfaceProps = {
  hasUnreadNotifications: boolean
  loading: boolean
  searchInputRef: RefObject<HTMLInputElement | null>
  searchValue: string
  suggestedGrapplers: BjjSuggestedGrappler[]
  surface: BjjSocialSurface
  onDismissSuggested: (grapplerId: string) => void
  onOpenNotifications: () => void
  onOpenProfile: (grappler: BjjSuggestedGrappler) => void
  onSearchChange: (value: string) => void
  onSurfaceChange: (surface: BjjSocialSurface) => void
  onToggleSuggestedFollow: (grappler: BjjSuggestedGrappler) => void
  isFollowingAuthor: (authorId: string) => boolean
  onPreviewSystem: (systemId: string) => void | Promise<void>
  onPreviewTechnique: (techniqueId: string) => void | Promise<void>
  onForkTechnique: (card: DiscoverTechniqueCard) => Promise<void>
  onForkSystem: (card: DiscoverSystemCard) => Promise<void>
}

function SearchInput({ inputRef, onChange, placeholder, value }: {
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
      <input
        ref={inputRef as any}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-white/10 bg-white/[0.08] pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/32 outline-none transition focus:border-[#4d7cff]/55"
      />
    </div>
  )
}

function BranchPicker({ value, onChange }: { value: BjjSocialSurface; onChange: (surface: BjjSocialSurface) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => {
          const branch = normalizeMartialArtsBranchId(event.target.value)
          if (branch) onChange(branch)
        }}
        className="h-11 w-full appearance-none rounded-full border border-white/10 bg-white/[0.08] px-4 pr-10 text-sm font-black text-white outline-none transition focus:border-[#4d7cff]/55"
        aria-label="Community branch"
      >
        {MARTIAL_ARTS_BRANCHES.map((branch) => (
          <option key={branch.id} value={branch.id} className="bg-[#10131c] text-white">
            {branch.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
    </div>
  )
}

function CoachesTab({
  loading,
  searchValue,
  suggestedGrapplers,
  surface,
  onDismissSuggested,
  onOpenProfile,
  onToggleSuggestedFollow,
  isFollowingAuthor,
}: Pick<CommunitySurfaceProps,
  'loading' | 'searchValue' | 'suggestedGrapplers' | 'surface' |
  'onDismissSuggested' | 'onOpenProfile' | 'onToggleSuggestedFollow' | 'isFollowingAuthor'
>) {
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return suggestedGrapplers
      .filter((g) => g.branch === surface)
      .filter((g) => !query || g.name.toLowerCase().includes(query) || g.handle.toLowerCase().includes(query))
  }, [searchValue, suggestedGrapplers, surface])

  if (loading && filtered.length === 0) {
    return <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">Loading coaches…</div>
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No coaches yet"
        body="Switch branches or clear your search to find coaches sharing living training artifacts."
      />
    )
  }
  return (
    <div className="space-y-3 px-1">
      {filtered.map((grappler) => (
        <div key={grappler.id} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onOpenProfile(grappler)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              {grappler.avatarUrl ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
                  <Image src={grappler.avatarUrl} alt={grappler.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: `radial-gradient(circle, ${grappler.accent}, rgba(255,255,255,0.05))` }}>
                  {grappler.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{grappler.name}</p>
                <p className="truncate text-xs font-semibold text-white/45">{grappler.handle} · {grappler.branchLabel}</p>
              </div>
            </button>
            <button type="button" onClick={() => onDismissSuggested(grappler.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/42" aria-label="Hide coach">
              <X className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onToggleSuggestedFollow(grappler)} className={cn('inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold', isFollowingAuthor(grappler.id) ? 'bg-white/10 text-white/70' : 'bg-white text-black')}>
              {isFollowingAuthor(grappler.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}



function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center px-8 text-center">
      <h3 className="text-[28px] font-bold leading-[1.05] text-white">{title}</h3>
      <p className="mt-3 max-w-[280px] text-[17px] leading-7 text-white/58">{body}</p>
    </div>
  )
}

function LeaderboardsTab() {
  const [entries, setEntries] = useState<BjjLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    void (async () => {
      try {
        setLoading(true)
        const rows = await bjjService.listLeaderboardForMonth(now.getFullYear(), now.getMonth() + 1)
        if (!cancelled) setEntries(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">Loading leaderboard…</div>
  if (error) return <EmptyState title="Couldn't load" body={error} />
  if (entries.length === 0) return <EmptyState title="No rankings yet" body="Log training sessions this month to populate the leaderboard." />

  return (
    <div className="space-y-2 px-1">
      {entries.slice(0, 50).map((entry, index) => (
        <div key={entry.id} className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">{index + 1}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">{entry.name || 'Grappler'}</p>
            <p className="truncate text-xs font-semibold text-white/45">{entry.handle ? `@${entry.handle}` : 'anonymous'}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{entry.score}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">sessions</p>
          </div>
        </div>
      ))}
    </div>
  )
}

type DiscoverSubTab = 'gameplans' | 'techniques'

function DiscoverGameplansTab({
  surface,
  branchLabel,
  onPreviewSystem,
  onForkSystem,
  refreshNonce = 0,
}: {
  surface: BjjSocialSurface
  branchLabel: string
  onPreviewSystem: (systemId: string) => void | Promise<void>
  onForkSystem: (card: DiscoverSystemCard) => Promise<void>
  refreshNonce?: number
}) {
  const { showSuccess } = useToast()
  const [cards, setCards] = useState<DiscoverSystemCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forkingId, setForkingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await communityService.listPublicSystemsByBranch(surface, 24, null)
      setCards(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gameplans')
    } finally {
      setLoading(false)
    }
  }, [surface])

  useEffect(() => { void load() }, [load, refreshNonce])

  const handleFork = useCallback(async (card: DiscoverSystemCard) => {
    if (card.viewerHasForked) {
      showSuccess(`"${card.title}" is already in your gameplans`)
      return
    }
    setForkingId(card.systemId)
    try {
      await onForkSystem(card)
      setCards((prev) => prev.map((c) => c.systemId === card.systemId ? { ...c, forkCount: c.forkCount + 1, viewerHasForked: true } : c))
    } catch {
      // onForkSystem already surfaced an error toast
    } finally {
      setForkingId(null)
    }
  }, [onForkSystem, showSuccess])

  if (loading) return <DiscoverListSkeleton />
  if (error) return <EmptyState title="Couldn't load" body={error} />
  if (cards.length === 0) return <EmptyState title="No public gameplans yet" body={`Be the first to publish a ${branchLabel} gameplan and other athletes can fork it into their library.`} />

  return (
    <div className="space-y-3 px-1">
      {cards.map((card) => {
        const busy = forkingId === card.systemId
        return (
          <div key={card.systemId} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
            <button
              type="button"
              onClick={() => { void onPreviewSystem(card.systemId) }}
              className="flex w-full items-start gap-3 text-left"
              aria-label={`Preview ${card.title}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{card.title}</p>
                <p className="truncate text-xs font-semibold text-white/45">
                  {card.ownerHandle ? `@${card.ownerHandle}` : card.ownerDisplayName || 'Anonymous'}
                  {card.forkCount > 0 ? ` · ${card.forkCount} fork${card.forkCount === 1 ? '' : 's'}` : ''}
                </p>
                {card.summary ? (
                  <p className="mt-2 line-clamp-3 text-sm text-white/65">{card.summary}</p>
                ) : null}
              </div>
            </button>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { void onPreviewSystem(card.systemId) }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80"
                aria-label={`Preview ${card.title}`}
              >
                Preview
              </button>
              <button
                type="button"
                disabled={busy || card.viewerHasForked}
                onClick={() => { void handleFork(card) }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold',
                  card.viewerHasForked
                    ? 'cursor-not-allowed border border-white/10 bg-white/[0.06] text-white/60'
                    : busy
                      ? 'bg-white/10 text-white/55'
                      : 'bg-white text-black',
                )}
                aria-label={card.viewerHasForked ? `Already forked ${card.title}` : `Fork ${card.title}`}
              >
                <GitFork className="h-3.5 w-3.5" />
                {card.viewerHasForked ? 'Forked' : busy ? 'Forking…' : 'Fork'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DiscoverTechniquesTab({
  surface,
  branchLabel,
  onPreviewTechnique,
  onForkTechnique,
  refreshNonce = 0,
}: {
  surface: BjjSocialSurface
  branchLabel: string
  onPreviewTechnique: (techniqueId: string) => void | Promise<void>
  onForkTechnique: (card: DiscoverTechniqueCard) => Promise<void>
  refreshNonce?: number
}) {
  const { showError } = useToast()
  const [cards, setCards] = useState<DiscoverTechniqueCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forkingId, setForkingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await communityService.listPublicTechniquesByBranch(surface, 24, null)
      setCards(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load techniques')
    } finally {
      setLoading(false)
    }
  }, [surface])

  useEffect(() => { void load() }, [load, refreshNonce])

  const handleFork = useCallback(async (card: DiscoverTechniqueCard) => {
    if (card.viewerHasForked) return
    setForkingId(card.techniqueId)
    try {
      await onForkTechnique(card)
      setCards((prev) => prev.map((c) => c.techniqueId === card.techniqueId ? { ...c, forkCount: c.forkCount + 1, viewerHasForked: true } : c))
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not add technique')
    } finally {
      setForkingId(null)
    }
  }, [onForkTechnique, showError])

  if (loading) return <DiscoverListSkeleton />
  if (error) return <EmptyState title="Couldn't load" body={error} />
  if (cards.length === 0) return <EmptyState title="No public techniques yet" body={`Be the first to publish a ${branchLabel} technique and other athletes can add it to their library.`} />

  return (
    <div className="space-y-3 px-1">
      {cards.map((card) => {
        const busy = forkingId === card.techniqueId
        return (
          <div key={card.techniqueId} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
            <button
              type="button"
              onClick={() => { void onPreviewTechnique(card.techniqueId) }}
              className="flex w-full items-start gap-3 text-left"
              aria-label={`Preview ${card.title}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{card.title}</p>
                <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  {card.category}
                  {card.ownerHandle ? ` · @${card.ownerHandle}` : card.ownerDisplayName ? ` · ${card.ownerDisplayName}` : ''}
                  {card.forkCount > 0 ? ` · ${card.forkCount} save${card.forkCount === 1 ? '' : 's'}` : ''}
                </p>
                {card.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-white/65">{card.description}</p>
                ) : null}
              </div>
            </button>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { void onPreviewTechnique(card.techniqueId) }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80"
                aria-label={`Preview ${card.title}`}
              >
                Preview
              </button>
              <button
                type="button"
                disabled={busy || card.viewerHasForked}
                onClick={() => { void handleFork(card) }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold',
                  card.viewerHasForked
                    ? 'cursor-not-allowed border border-white/10 bg-white/[0.06] text-white/60'
                    : busy
                      ? 'bg-white/10 text-white/55'
                      : 'bg-white text-black',
                )}
                aria-label={card.viewerHasForked ? `Already saved ${card.title}` : `Save ${card.title} to my library`}
              >
                <GitFork className="h-3.5 w-3.5" />
                {card.viewerHasForked ? 'Saved' : busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DiscoverTab(props: {
  surface: BjjSocialSurface
  branchLabel: string
  onPreviewSystem: (systemId: string) => void | Promise<void>
  onPreviewTechnique: (techniqueId: string) => void | Promise<void>
  onForkTechnique: (card: DiscoverTechniqueCard) => Promise<void>
  onForkSystem: (card: DiscoverSystemCard) => Promise<void>
  refreshNonce: number
}) {
  const [subTab, setSubTab] = useState<DiscoverSubTab>('gameplans')
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 bg-[linear-gradient(180deg,rgba(14,15,20,0.96),rgba(14,15,20,0.86))] px-1 py-1 backdrop-blur">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {([
            { value: 'gameplans' as const, label: 'Gameplans', Icon: Network },
            { value: 'techniques' as const, label: 'Techniques', Icon: BookOpen },
          ]).map(({ value, label, Icon }) => {
            const active = subTab === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSubTab(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                  active ? 'bg-white text-black' : 'text-white/55 hover:text-white',
                )}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
      {subTab === 'gameplans' ? (
        <DiscoverGameplansTab
          surface={props.surface}
          branchLabel={props.branchLabel}
          onPreviewSystem={props.onPreviewSystem}
          onForkSystem={props.onForkSystem}
          refreshNonce={props.refreshNonce}
        />
      ) : (
        <DiscoverTechniquesTab
          surface={props.surface}
          branchLabel={props.branchLabel}
          onPreviewTechnique={props.onPreviewTechnique}
          onForkTechnique={props.onForkTechnique}
          refreshNonce={props.refreshNonce}
        />
      )}
    </div>
  )
}

function ReviewsTab() {
  const [rows, setRows] = useState<ReceivedReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        const data = await communityService.listMyReceivedReviews(30, null)
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load reviews')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">Loading reviews…</div>
  if (error) return <EmptyState title="Couldn't load" body={error} />
  if (rows.length === 0) return <EmptyState title="No peer reviews yet" body="When a teammate reviews one of your training sessions their feedback lands here." />

  return (
    <div className="space-y-3 px-1">
      {rows.map((r) => (
        <div key={r.id} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{r.sessionTitle}</p>
            {r.rating != null ? (
              <div className="flex items-center gap-1 text-white/80">
                <Star className="h-3.5 w-3.5 fill-[#ffd84d] text-[#ffd84d]" />
                <span className="text-xs font-bold">{r.rating}</span>
              </div>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-white/85">{r.body}</p>
          <p className="mt-2 truncate text-[11px] font-semibold text-white/45">
            {r.reviewerHandle ? `@${r.reviewerHandle}` : r.reviewerDisplayName || 'Anonymous'}
          </p>
        </div>
      ))}
    </div>
  )
}

export function CommunitySurface(props: CommunitySurfaceProps) {
  const { hasUnreadNotifications, surface, onOpenNotifications, onSurfaceChange, searchInputRef, searchValue, onSearchChange } = props
  const [activeTab, setActiveTab] = useState<CommunityTab>('coaches')
  const [discoverRefreshNonce, setDiscoverRefreshNonce] = useState(0)
  const branchLabel = getMartialArtsBranchLabel(surface)

  const { pullDistance, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
    onRefresh: async () => {
      setDiscoverRefreshNonce((n) => n + 1)
      await new Promise((resolve) => setTimeout(resolve, 450))
    },
  })
  const pullActive = activeTab === 'discover'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-1">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-black tracking-tight text-white">Community</p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{branchLabel}</p>
          </div>
          <button type="button" onClick={onOpenNotifications} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
            {hasUnreadNotifications && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#4d7cff]" />}
          </button>
        </div>

        <BranchPicker value={surface} onChange={onSurfaceChange} />

        <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1">
          {COMMUNITY_TABS.map(({ value, label, Icon }) => {
            const active = activeTab === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition',
                  active ? 'bg-white text-black' : 'text-white/55 hover:text-white',
                )}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'coaches' && (
          <SearchInput inputRef={searchInputRef} onChange={onSearchChange} placeholder={`Search ${branchLabel} coaches`} value={searchValue} />
        )}
      </div>

      <div
        className="mt-3 min-h-0 flex-1 overflow-y-auto pb-6"
        onTouchStart={pullActive ? handleTouchStart : undefined}
        onTouchMove={pullActive ? handleTouchMove : undefined}
        onTouchEnd={pullActive ? handleTouchEnd : undefined}
      >
        {pullActive && (pullDistance > 0 || isRefreshing) ? (
          <div
            className="flex items-center justify-center overflow-hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/55"
            style={{ height: isRefreshing ? 36 : Math.min(pullDistance, 72), transition: pullDistance === 0 ? 'height 160ms ease-out' : undefined }}
            aria-hidden={!isRefreshing}
          >
            {isRefreshing ? 'Refreshing…' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        ) : null}
        {activeTab === 'discover' && (
          <DiscoverTab
            surface={surface}
            branchLabel={branchLabel}
            onPreviewSystem={props.onPreviewSystem}
            onPreviewTechnique={props.onPreviewTechnique}
            onForkTechnique={props.onForkTechnique}
            onForkSystem={props.onForkSystem}
            refreshNonce={discoverRefreshNonce}
          />
        )}
        {activeTab === 'leaderboards' && <LeaderboardsTab />}
        {activeTab === 'coaches' && (
          <CoachesTab
            loading={props.loading}
            searchValue={props.searchValue}
            suggestedGrapplers={props.suggestedGrapplers}
            surface={props.surface}
            onDismissSuggested={props.onDismissSuggested}
            onOpenProfile={props.onOpenProfile}
            onToggleSuggestedFollow={props.onToggleSuggestedFollow}
            isFollowingAuthor={props.isFollowingAuthor}
          />
        )}
        {activeTab === 'reviews' && <ReviewsTab />}
      </div>
    </div>
  )
}
