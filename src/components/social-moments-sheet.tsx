'use client'

import Image from 'next/image'
import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import type { SocialMomentSummary, SocialStory } from '@/lib/social-models'
import { cn } from '@/lib/utils'

type Mode = 'list' | 'pick'

type SocialMomentsSheetProps = {
  moments: SocialMomentSummary[]
  mode?: Mode
  onClose: () => void
  onCreateMoment: (title: string) => Promise<void> | void
  onSelectMoment?: (moment: SocialMomentSummary) => Promise<void> | void
  pendingStory?: SocialStory | null
}

export function SocialMomentsSheet({
  moments,
  mode = 'list',
  onClose,
  onCreateMoment,
  onSelectMoment,
  pendingStory,
}: SocialMomentsSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  const [title, setTitle] = useState('')
  const canSelect = mode === 'pick' && typeof onSelectMoment === 'function'
  const headline = mode === 'pick' ? 'Save to Moments' : 'Moments'
  const helper = mode === 'pick'
    ? pendingStory ? 'Choose a moment for this story.' : 'Choose a moment.'
    : 'Keep your favorite stories on your profile.'
  const sorted = useMemo(
    () => [...moments].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [moments],
  )

  return (
    <div className="fixed inset-0 z-modal bg-black/60 text-white backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close moments" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#090d16]/98 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{headline}</p>
            <p className="truncate text-xs font-semibold text-white/45">{helper}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/78"
            onClick={onClose}
            aria-label="Close moments"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/36">New moment</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (e.g. Seminars)"
                  className="h-11 flex-1 rounded-[16px] border border-white/12 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/28"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = title.trim()
                    if (!next) return
                    setTitle('')
                    void onCreateMoment(next)
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-white px-3 text-sm font-bold text-black"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {sorted.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-white/70">No moments yet</p>
                <p className="mt-1 text-xs text-white/40">Create one, then save stories into it.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {sorted.map((moment) => (
                  <button
                    key={moment.id}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => {
                      if (!canSelect) return
                      void onSelectMoment(moment)
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left',
                      canSelect ? 'active:scale-[0.99]' : 'opacity-95',
                    )}
                    aria-label={canSelect ? `Save to ${moment.title || 'Moment'}` : `Moment ${moment.title || 'Untitled'}`}
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/12 bg-white/[0.06]">
                      {moment.coverThumbnailUrl ? (
                        <Image src={moment.coverThumbnailUrl} alt="" fill className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-black text-white/70">
                          {(moment.title || 'M').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{moment.title || 'Moment'}</p>
                      <p className="text-xs font-semibold text-white/45">{moment.storyCount} stories</p>
                    </div>
                    {canSelect && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                        Save
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

