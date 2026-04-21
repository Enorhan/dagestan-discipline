'use client'

import Image from 'next/image'
import { Bell, ChevronDown, Search, X } from 'lucide-react'
import { type RefObject, useMemo } from 'react'
import type {
  BjjSocialSurface,
  BjjSuggestedGrappler,
} from '@/lib/bjj-types'
import {
  getMartialArtsBranchLabel,
  MARTIAL_ARTS_BRANCHES,
  normalizeMartialArtsBranchId,
} from '@/lib/martial-arts-branches'
import { cn } from '@/lib/utils'

type SocialFeedSurfaceProps = {
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
}

function SearchInput({
  className,
  inputRef,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <div className={cn('relative', className)}>
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

function BranchPicker({
  value,
  onChange,
}: {
  value: BjjSocialSurface
  onChange: (surface: BjjSocialSurface) => void
}) {
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

function SuggestedUsersList({
  isFollowingUser,
  users,
  onDismiss,
  onOpenProfile,
  onToggleSuggestedFollow,
}: {
  isFollowingUser: (userId: string) => boolean
  users: BjjSuggestedGrappler[]
  onDismiss: (grapplerId: string) => void
  onOpenProfile: (grappler: BjjSuggestedGrappler) => void
  onToggleSuggestedFollow: (grappler: BjjSuggestedGrappler) => void
}) {
  if (users.length === 0) return null

  return (
    <div className="space-y-3">
      {users.map((grappler) => (
        <div key={grappler.id} className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenProfile(grappler)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              {grappler.avatarUrl ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
                  <Image src={grappler.avatarUrl} alt={grappler.name} fill className="object-cover" />
                </div>
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ background: `radial-gradient(circle, ${grappler.accent}, rgba(255,255,255,0.05))` }}
                >
                  {grappler.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{grappler.name}</p>
                <p className="truncate text-xs font-semibold text-white/45">{grappler.handle} · {grappler.branchLabel}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDismiss(grappler.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/42"
              aria-label="Hide user"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleSuggestedFollow(grappler)}
              className={cn(
                'inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold',
                isFollowingUser(grappler.id) ? 'bg-white/10 text-white/70' : 'bg-white text-black',
              )}
            >
              {isFollowingUser(grappler.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SocialFeedSurface({
  hasUnreadNotifications,
  loading,
  searchInputRef,
  searchValue,
  suggestedGrapplers,
  surface,
  onDismissSuggested,
  onOpenProfile,
  onOpenNotifications,
  onSearchChange,
  onSurfaceChange,
  onToggleSuggestedFollow,
  isFollowingAuthor,
}: SocialFeedSurfaceProps) {
  const branchLabel = getMartialArtsBranchLabel(surface)
  const filteredSuggested = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return suggestedGrapplers
      .filter((grappler) => grappler.branch === surface)
      .filter((grappler) => {
        if (!query) return true
        return (
          grappler.name.toLowerCase().includes(query) ||
          grappler.handle.toLowerCase().includes(query)
        )
      })
  }, [searchValue, suggestedGrapplers, surface])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-1">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-black tracking-tight text-white">Community</p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/36">{branchLabel}</p>
          </div>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnreadNotifications && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#4d7cff]" />}
          </button>
        </div>

        <BranchPicker value={surface} onChange={onSurfaceChange} />
        <SearchInput
          inputRef={searchInputRef}
          onChange={onSearchChange}
          placeholder={`Search ${branchLabel} users`}
          value={searchValue}
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-6">
        {loading && filteredSuggested.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">
            Loading users…
          </div>
        ) : filteredSuggested.length === 0 ? (
          <div className="flex min-h-[42vh] flex-col items-center justify-center px-8 text-center">
            <h3 className="text-[28px] font-bold leading-[1.05] text-white">No users found</h3>
            <p className="mt-3 max-w-[280px] text-[17px] leading-7 text-white/58">
              Switch branches or clear search to find people.
            </p>
          </div>
        ) : (
          <div className="space-y-3 px-1">
            <SuggestedUsersList
              isFollowingUser={isFollowingAuthor}
              users={filteredSuggested}
              onDismiss={onDismissSuggested}
              onOpenProfile={onOpenProfile}
              onToggleSuggestedFollow={onToggleSuggestedFollow}
            />
          </div>
        )}
      </div>
    </div>
  )
}
