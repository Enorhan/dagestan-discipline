'use client'

import Image from 'next/image'
import { GitFork, Users2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { communityService, type SystemForkerRow } from '@/lib/community-service'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'

type SystemForkersSheetProps = {
  parentSystemId: string
  parentTitle: string
  onClose: () => void
  onOpenProfile: (forker: SystemForkerRow) => void
}

export function SystemForkersSheet({
  parentSystemId,
  parentTitle,
  onClose,
  onOpenProfile,
}: SystemForkersSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })
  const [rows, setRows] = useState<SystemForkerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    communityService
      .listSystemForkers(parentSystemId, 50)
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? 'Unable to load forkers') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [parentSystemId])

  return (
    <div className="fixed inset-0 z-modal bg-black/60 text-white backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Forkers of ${parentTitle}`}>
      <button
        type="button"
        aria-label="Close forkers"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#090d16]/98 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Forks</p>
            <p className="truncate text-xs font-semibold text-white/45">{parentTitle}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/78"
            onClick={onClose}
            aria-label="Close forkers"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-white/8" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-white/8" />
                    <div className="h-3 w-16 animate-pulse rounded bg-white/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[20px] border border-red-500/25 bg-red-500/10 px-4 py-5 text-sm text-red-100">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full min-h-[24vh] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/58">
                <Users2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">No forks yet</p>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/55">
                Once grapplers fork this graph you&apos;ll see them here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.forkId}>
                  <button
                    type="button"
                    onClick={() => onOpenProfile(row)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/6">
                      {row.forkerAvatarUrl ? (
                        <Image src={row.forkerAvatarUrl} alt={row.forkerDisplayName} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/72">
                          {row.forkerDisplayName.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{row.forkerDisplayName}</p>
                      {row.forkerHandle ? (
                        <p className="truncate text-xs font-semibold text-white/45">@{row.forkerHandle}</p>
                      ) : null}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                      <GitFork className="h-3 w-3" />
                      Forked
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

