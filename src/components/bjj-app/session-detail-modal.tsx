'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'
import type { BjjSession, BjjTechnique } from '@/lib/bjj-types'
import { getMartialArtsBranchLabel } from '@/lib/martial-arts-branches'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { ModalShell } from './modal-shell'
import { formatPrettyDateTime } from './date-utils'

export interface SessionDetailModalProps {
  selectedSession: BjjSession
  libraryTechniques: BjjTechnique[]
  onClose: () => void
  openEditSession: (session: BjjSession) => void
  handleDuplicateSession: (session: BjjSession) => void
  handleRequestDeleteSession: (session: BjjSession) => void
}

/**
 * Phase D D4 — read-only session detail surface.
 * Pure presentation; the Edit/Duplicate/Delete actions delegate to handlers
 * provided by `BjjAppInner`.
 */
export function SessionDetailModal({
  selectedSession,
  libraryTechniques,
  onClose,
  openEditSession,
  handleDuplicateSession,
  handleRequestDeleteSession,
}: SessionDetailModalProps) {
  return (
    <ModalShell title="Session" onBack={onClose} variant="sessions">
      <div className="space-y-5 pb-24">
        {selectedSession.photo && (
          <div className="relative h-56 w-full overflow-hidden rounded-[24px] border border-white/10">
            <Image src={selectedSession.photo} alt="Session photo" fill className="object-cover" />
          </div>
        )}
        <div>
          <p className="text-[26px] font-black leading-tight text-white">{selectedSession.type} @ {selectedSession.location || 'Training Room'}</p>
          <p className="mt-1 text-sm text-white/50">{formatPrettyDateTime(selectedSession.date, selectedSession.time)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/70">
            {getMartialArtsBranchLabel(selectedSession.branch)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/70">
            {selectedSession.durationMinutes} min
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold capitalize text-white/70">
            {selectedSession.visibility}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Satisfaction</p>
          <div className="mt-2 flex items-center gap-2" aria-label={`Rated ${selectedSession.satisfaction} of 5`}>
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1
              return (
                <Star
                  key={value}
                  className={cn('h-5 w-5', value <= selectedSession.satisfaction ? 'fill-[#ffba33] text-[#ffba33]' : 'text-white/25')}
                  aria-hidden
                />
              )
            })}
          </div>
        </div>
        {selectedSession.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Notes</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-white/80">{selectedSession.notes}</p>
          </div>
        )}
        {selectedSession.caption && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Caption</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-white/80">{selectedSession.caption}</p>
          </div>
        )}
        {selectedSession.submissions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Submissions ({selectedSession.submissions.length})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSession.submissions.map((name, index) => (
                <span key={`${name}-${index}`} className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {selectedSession.taps.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Taps ({selectedSession.taps.length})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSession.taps.map((name, index) => (
                <span key={`${name}-${index}`} className="rounded-full border border-rose-300/20 bg-rose-400/12 px-3 py-1 text-xs font-semibold text-rose-100">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {selectedSession.linkedTechniqueIds.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Linked techniques</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSession.linkedTechniqueIds.map((id) => {
                const technique = libraryTechniques.find((entry) => entry.id === id)
                if (!technique) return null
                return (
                  <span key={id} className="rounded-full border border-[#4d7cff]/30 bg-[#4d7cff]/15 px-3 py-1 text-xs font-semibold text-[#8cabff]">
                    {technique.title}
                  </span>
                )
              })}
            </div>
          </div>
        )}
        {selectedSession.taggedFriends.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Training partners</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSession.taggedFriends.map((name, index) => (
                <span key={`${name}-${index}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/75">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className="pointer-events-auto flex w-full max-w-[398px] items-center gap-2 rounded-2xl border border-white/10 bg-[#0b0e14]/95 px-2.5 py-2 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => {
              void haptics.light()
              const target = selectedSession
              onClose()
              openEditSession(target)
            }}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              void haptics.light()
              const target = selectedSession
              onClose()
              handleDuplicateSession(target)
            }}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              const target = selectedSession
              onClose()
              handleRequestDeleteSession(target)
            }}
            className="flex-1 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

