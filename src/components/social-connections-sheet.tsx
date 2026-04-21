'use client'

import Image from 'next/image'
import { Users, X } from 'lucide-react'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import type { SocialConnectionProfile } from '@/lib/social-models'

type SocialConnectionsSheetProps = {
  loading: boolean
  onClose: () => void
  onSelectProfile?: (profile: SocialConnectionProfile) => void
  profiles: SocialConnectionProfile[]
  title: string
}

export function SocialConnectionsSheet({
  loading,
  onClose,
  onSelectProfile,
  profiles,
  title,
}: SocialConnectionsSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  return (
    <div className="fixed inset-0 z-modal bg-black/60 text-white backdrop-blur-sm">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[84dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#090d16]/98 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/36">
              Connections
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/78"
            aria-label={`Close ${title}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="rounded-[20px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">
              Loading…
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex min-h-[28vh] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/58">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">Nothing here yet</p>
              <p className="mt-2 max-w-[240px] text-sm leading-6 text-white/55">
                This list will fill up as your network grows.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <button
                  key={profile.userId}
                  type="button"
                  onClick={() => onSelectProfile?.(profile)}
                  className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3"
                  aria-label={`View @${profile.username}`}
                >
                  {profile.avatarUrl ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-full">
                      <Image src={profile.avatarUrl} alt={profile.displayName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-sm font-black text-white">
                      {profile.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{profile.displayName}</p>
                    <p className="truncate text-xs font-semibold text-white/45">@{profile.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
