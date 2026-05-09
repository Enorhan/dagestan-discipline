'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import Image from 'next/image'
import { Calendar, Camera, Clock3, MapPin, Star } from 'lucide-react'
import type { BjjTechnique } from '@/lib/bjj-types'
import { MARTIAL_ARTS_BRANCHES } from '@/lib/martial-arts-branches'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { ModalShell } from './modal-shell'
import {
  DURATION_MAX,
  DURATION_MIN,
  DURATION_PRESETS,
  SESSION_TYPES_BY_BRANCH,
  VISIBILITY_OPTIONS,
} from './constants'
import type { SessionDraft } from './types'

export interface SessionFormModalProps {
  editingSessionId: string | null
  savingSession: boolean
  sessionDraft: SessionDraft
  setSessionDraft: Dispatch<SetStateAction<SessionDraft>>
  sessionDurationMode: 'preset' | 'custom'
  setSessionDurationMode: Dispatch<SetStateAction<'preset' | 'custom'>>
  sessionPhotoInputRef: RefObject<HTMLInputElement | null>
  sessionPhotoPreview: string | null
  setSessionPhotoFile: Dispatch<SetStateAction<File | null>>
  setSessionPhotoPreview: Dispatch<SetStateAction<string | null>>
  libraryTechniques: BjjTechnique[]
  onClose: () => void
  handleSaveSession: () => void
  showInfo: (message: string) => void
}

/**
 * Phase D D4 — session create/edit form surface.
 * Pure presentation; state and persistence are owned by `BjjAppInner`.
 */
export function SessionFormModal({
  editingSessionId,
  savingSession,
  sessionDraft,
  setSessionDraft,
  sessionDurationMode,
  setSessionDurationMode,
  sessionPhotoInputRef,
  sessionPhotoPreview,
  setSessionPhotoFile,
  setSessionPhotoPreview,
  libraryTechniques,
  onClose,
  handleSaveSession,
  showInfo,
}: SessionFormModalProps) {
  return (
    <ModalShell
      title={editingSessionId ? 'Edit Session' : 'New Session'}
      onBack={onClose}
      variant="sessions"
      action={
        <button
          type="button"
          onClick={handleSaveSession}
          disabled={savingSession}
          aria-busy={savingSession}
          className="rounded-2xl bg-[#2f58ff] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingSession ? 'Saving…' : editingSessionId ? 'Update' : 'Save'}
        </button>
      }
    >
      <div className="space-y-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="min-w-0 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Date</span>
            <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/6 px-3">
              <Calendar className="pointer-events-none h-4 w-4 shrink-0 text-white/40" aria-hidden />
              <input
                type="date"
                value={sessionDraft.date}
                onChange={(event) => setSessionDraft((previous) => ({ ...previous, date: event.target.value }))}
                className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
          <label className="min-w-0 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Time</span>
            <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/6 px-3">
              <Clock3 className="pointer-events-none h-4 w-4 shrink-0 text-white/40" aria-hidden />
              <input
                type="time"
                value={sessionDraft.time}
                onChange={(event) => setSessionDraft((previous) => ({ ...previous, time: event.target.value }))}
                className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Location</span>
          <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/6 px-3">
            <MapPin className="pointer-events-none h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <input
              value={sessionDraft.location}
              onChange={(event) => setSessionDraft((previous) => ({ ...previous, location: event.target.value }))}
              placeholder="Gym name..."
              className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-white placeholder:text-white/35 outline-none"
            />
          </div>
        </label>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Discipline</span>
          <div
            role="radiogroup"
            aria-label="Martial arts discipline"
            className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {MARTIAL_ARTS_BRANCHES.map((branch) => {
              const selected = sessionDraft.branch === branch.id
              return (
                <button
                  key={branch.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    void haptics.light()
                    setSessionDraft((previous) => {
                      if (previous.branch === branch.id) return previous
                      const nextTypes = SESSION_TYPES_BY_BRANCH[branch.id] ?? SESSION_TYPES_BY_BRANCH.bjj
                      const nextType = nextTypes.includes(previous.type) ? previous.type : (nextTypes[0] ?? previous.type)
                      return { ...previous, branch: branch.id, type: nextType }
                    })
                  }}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-bold',
                    selected ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/55',
                  )}
                >
                  {branch.label}
                </button>
              )
            })}
          </div>
        </div>
        <SessionFormBody
          sessionDraft={sessionDraft}
          setSessionDraft={setSessionDraft}
          sessionDurationMode={sessionDurationMode}
          setSessionDurationMode={setSessionDurationMode}
          sessionPhotoInputRef={sessionPhotoInputRef}
          sessionPhotoPreview={sessionPhotoPreview}
          setSessionPhotoFile={setSessionPhotoFile}
          setSessionPhotoPreview={setSessionPhotoPreview}
          libraryTechniques={libraryTechniques}
          showInfo={showInfo}
        />
      </div>
    </ModalShell>
  )
}

interface SessionFormBodyProps {
  sessionDraft: SessionDraft
  setSessionDraft: Dispatch<SetStateAction<SessionDraft>>
  sessionDurationMode: 'preset' | 'custom'
  setSessionDurationMode: Dispatch<SetStateAction<'preset' | 'custom'>>
  sessionPhotoInputRef: RefObject<HTMLInputElement | null>
  sessionPhotoPreview: string | null
  setSessionPhotoFile: Dispatch<SetStateAction<File | null>>
  setSessionPhotoPreview: Dispatch<SetStateAction<string | null>>
  libraryTechniques: BjjTechnique[]
  showInfo: (message: string) => void
}

function SessionFormBody({
  sessionDraft,
  setSessionDraft,
  sessionDurationMode,
  setSessionDurationMode,
  sessionPhotoInputRef,
  sessionPhotoPreview,
  setSessionPhotoFile,
  setSessionPhotoPreview,
  libraryTechniques,
  showInfo,
}: SessionFormBodyProps) {
  return (
    <>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Type</span>
        <div role="radiogroup" aria-label="Session type" className="mt-3 flex flex-wrap gap-2">
          {(SESSION_TYPES_BY_BRANCH[sessionDraft.branch] ?? SESSION_TYPES_BY_BRANCH.bjj).map((type) => {
            const selected = sessionDraft.type === type
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  void haptics.light()
                  setSessionDraft((previous) => ({ ...previous, type }))
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-bold',
                  selected ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/55',
                )}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Submissions</span>
        <input
          value={sessionDraft.submissions}
          onChange={(event) => setSessionDraft((previous) => ({ ...previous, submissions: event.target.value }))}
          placeholder="Triangle choke, rear naked choke..."
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none"
        />
      </label>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Taps</span>
        <input
          value={sessionDraft.taps}
          onChange={(event) => setSessionDraft((previous) => ({ ...previous, taps: event.target.value }))}
          placeholder="Leg lock, armbar..."
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none"
        />
      </label>

      <SessionDurationSection
        sessionDraft={sessionDraft}
        setSessionDraft={setSessionDraft}
        sessionDurationMode={sessionDurationMode}
        setSessionDurationMode={setSessionDurationMode}
        sessionPhotoInputRef={sessionPhotoInputRef}
        sessionPhotoPreview={sessionPhotoPreview}
        setSessionPhotoFile={setSessionPhotoFile}
        setSessionPhotoPreview={setSessionPhotoPreview}
      />

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Notes</span>
        <textarea
          value={sessionDraft.notes}
          onChange={(event) => setSessionDraft((previous) => ({ ...previous, notes: event.target.value }))}
          placeholder="How did the session go? What did you work on?"
          className="min-h-[7.5rem] w-full resize-y rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base font-medium text-white placeholder:text-white/35 outline-none"
        />
      </label>

      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Satisfaction</span>
        <div className="mt-3 flex items-center gap-3">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSessionDraft((previous) => ({ ...previous, satisfaction: value }))}
                aria-label={`Rate session ${value} of 5`}
                aria-pressed={value <= sessionDraft.satisfaction}
              >
                <Star className={cn('h-7 w-7', value <= sessionDraft.satisfaction ? 'fill-[#ffba33] text-[#ffba33]' : 'text-white/35')} />
              </button>
            )
          })}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Tag Friends</span>
        <input
          value={sessionDraft.taggedFriends}
          onChange={(event) => setSessionDraft((previous) => ({ ...previous, taggedFriends: event.target.value }))}
          placeholder="Tag training partners..."
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none"
        />
      </label>

      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Visibility</span>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSessionDraft((previous) => ({ ...previous, visibility: option }))}
              className={cn(
                'rounded-2xl px-3 py-3 text-sm font-bold capitalize',
                sessionDraft.visibility === option ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/55',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Caption</span>
        <textarea
          value={sessionDraft.caption}
          onChange={(event) => setSessionDraft((previous) => ({ ...previous, caption: event.target.value }))}
          placeholder="Add a caption for your public post..."
          className="min-h-24 w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base font-medium text-white placeholder:text-white/35 outline-none"
        />
      </label>

      <SessionLinkedTechniquesSection
        sessionDraft={sessionDraft}
        setSessionDraft={setSessionDraft}
        libraryTechniques={libraryTechniques}
        showInfo={showInfo}
      />
    </>
  )
}


interface SessionDurationSectionProps {
  sessionDraft: SessionDraft
  setSessionDraft: Dispatch<SetStateAction<SessionDraft>>
  sessionDurationMode: 'preset' | 'custom'
  setSessionDurationMode: Dispatch<SetStateAction<'preset' | 'custom'>>
  sessionPhotoInputRef: RefObject<HTMLInputElement | null>
  sessionPhotoPreview: string | null
  setSessionPhotoFile: Dispatch<SetStateAction<File | null>>
  setSessionPhotoPreview: Dispatch<SetStateAction<string | null>>
}

function SessionDurationSection({
  sessionDraft,
  setSessionDraft,
  sessionDurationMode,
  setSessionDurationMode,
  sessionPhotoInputRef,
  sessionPhotoPreview,
  setSessionPhotoFile,
  setSessionPhotoPreview,
}: SessionDurationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Duration</span>
          <span className="text-xs font-semibold text-white/55">{sessionDraft.durationMinutes} min</span>
        </div>
        <div role="radiogroup" aria-label="Duration preset" className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => {
            const selected = sessionDurationMode === 'preset' && sessionDraft.durationMinutes === preset
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  void haptics.light()
                  setSessionDurationMode('preset')
                  setSessionDraft((previous) => ({ ...previous, durationMinutes: preset }))
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-bold',
                  selected ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/55',
                )}
              >
                {preset}m
              </button>
            )
          })}
          <button
            type="button"
            role="radio"
            aria-checked={sessionDurationMode === 'custom'}
            onClick={() => {
              void haptics.light()
              setSessionDurationMode('custom')
            }}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold',
              sessionDurationMode === 'custom' ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/55',
            )}
          >
            Custom
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease duration by 5 minutes"
            onClick={() => {
              void haptics.light()
              setSessionDurationMode('custom')
              setSessionDraft((previous) => ({
                ...previous,
                durationMinutes: Math.max(DURATION_MIN, previous.durationMinutes - 5),
              }))
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-lg font-bold text-white"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={DURATION_MIN}
            max={DURATION_MAX}
            aria-label="Duration in minutes"
            value={sessionDraft.durationMinutes}
            onFocus={() => setSessionDurationMode('custom')}
            onChange={(event) => {
              const raw = event.target.value
              const parsed = Number.parseInt(raw, 10)
              setSessionDurationMode('custom')
              setSessionDraft((previous) => ({
                ...previous,
                durationMinutes: Number.isFinite(parsed) ? parsed : previous.durationMinutes,
              }))
            }}
            onBlur={(event) => {
              const parsed = Number.parseInt(event.target.value, 10)
              const clamped = Number.isFinite(parsed)
                ? Math.min(DURATION_MAX, Math.max(DURATION_MIN, parsed))
                : 90
              setSessionDraft((previous) => ({ ...previous, durationMinutes: clamped }))
            }}
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 text-center text-base font-medium text-white outline-none"
          />
          <button
            type="button"
            aria-label="Increase duration by 5 minutes"
            onClick={() => {
              void haptics.light()
              setSessionDurationMode('custom')
              setSessionDraft((previous) => ({
                ...previous,
                durationMinutes: Math.min(DURATION_MAX, previous.durationMinutes + 5),
              }))
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-lg font-bold text-white"
          >
            +
          </button>
        </div>
      </div>
      <div>
        <input
          ref={sessionPhotoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            setSessionPhotoFile(file)
            setSessionPhotoPreview(file ? URL.createObjectURL(file) : null)
          }}
        />
        <button
          type="button"
          onClick={() => sessionPhotoInputRef.current?.click()}
          className="block w-full rounded-[24px] border border-dashed border-white/12 bg-white/4 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            {sessionPhotoPreview ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                <Image src={sessionPhotoPreview} alt="Session upload preview" fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/18 bg-black/25">
                <Camera className="h-5 w-5 text-white/45" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-base font-bold leading-snug sm:text-lg">Share training media on MatFlow</p>
              <p className="mt-1 text-sm text-white/42">{sessionPhotoPreview ? 'Tap to replace your session photo.' : 'Upload a session image for your public post.'}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200/75">Uploaded images are publicly accessible by URL.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

interface SessionLinkedTechniquesSectionProps {
  sessionDraft: SessionDraft
  setSessionDraft: Dispatch<SetStateAction<SessionDraft>>
  libraryTechniques: BjjTechnique[]
  showInfo: (message: string) => void
}

function SessionLinkedTechniquesSection({
  sessionDraft,
  setSessionDraft,
  libraryTechniques,
  showInfo,
}: SessionLinkedTechniquesSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Linked Techniques</span>
        <button
          type="button"
          onClick={() => showInfo('Tap the technique chips below to link the moves you drilled during this session.')}
          className="text-sm font-semibold text-[#7ea4ff]"
        >
          Add Technique
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {libraryTechniques.map((technique) => {
          const selected = sessionDraft.linkedTechniqueIds.includes(technique.id)
          return (
            <button
              key={technique.id}
              type="button"
              onClick={() => setSessionDraft((previous) => ({
                ...previous,
                linkedTechniqueIds: selected
                  ? previous.linkedTechniqueIds.filter((id) => id !== technique.id)
                  : [...previous.linkedTechniqueIds, technique.id],
              }))}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-semibold',
                selected ? 'border-[#4d7cff]/40 bg-[#4d7cff]/18 text-[#8cabff]' : 'border-white/10 bg-white/6 text-white/58',
              )}
            >
              {technique.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
