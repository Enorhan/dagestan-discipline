'use client'

import { ArrowLeft, Check, Loader2, Mic, MicOff, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { BranchSelect } from '@/components/bjj-app/primitives'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { Button } from '@/components/ui/button'
import { useModalFocusTrap } from '@/lib/hooks/use-modal-focus-trap'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { useVoiceDictation } from '@/lib/hooks/use-voice-dictation'
import { haptics } from '@/lib/haptics'
import type { SaveUserSystemInput } from '@/lib/bjj-service'
import type { BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import { generateSystemFromTextWithAi, SystemAiQuotaExceededError } from '@/lib/system-ai-generator'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import { generateSystemFromText, systemToPrompt } from '@/lib/system-text-generator'
import { cn } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'error' | 'quota'

const DICTATION_PROMPT_HINT =
  'Brazilian jiu-jitsu and grappling sequence. Include submission names like armbar, D\u2019Arce, foot lock, kimura, triangle.'

export function UserSystemWizardModal({
  initial,
  branch,
  onClose,
  onFinish,
  onDelete,
}: {
  initial: BjjSystem | null
  branch: MartialArtsBranchId
  onClose: () => void
  onFinish: (payload: SaveUserSystemInput) => Promise<void>
  onDelete?: (systemId: string) => Promise<void>
}) {
  const [prompt, setPrompt] = useState(() => systemToPrompt(initial))
  const [selectedBranch, setSelectedBranch] = useState<MartialArtsBranchId>(initial?.branch ?? branch)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleting, setDeleting] = useState(false)
  const modalShellRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()
  useModalFocusTrap(true, modalShellRef)

  const generated = useMemo(
    () => generateSystemFromText({ branch: selectedBranch, text: prompt, initial }),
    [initial, prompt, selectedBranch],
  )
  const positions = useMemo(() => computeGraphLayout(generated.nodes, generated.edges), [generated.nodes, generated.edges])
  const canSave = prompt.trim().length > 2 && generated.nodes.length > 0

  const appendTranscript = useCallback((transcript: string) => {
    setPrompt((previous) => `${previous}${previous.trim() ? ' ' : ''}${transcript}`)
  }, [])
  const dictation = useVoiceDictation({
    onTranscript: appendTranscript,
    promptHint: DICTATION_PROMPT_HINT,
    language: 'en',
  })
  const dictationLabel = dictation.state === 'recording'
    ? 'Stop'
    : dictation.state === 'transcribing'
      ? 'Transcribing'
      : 'Dictate'
  const dictationErrorCopy = (() => {
    switch (dictation.errorCode) {
      case 'permission':
        return 'Microphone access denied. Enable it in Settings to dictate.'
      case 'quota':
        return 'Daily transcription limit reached. Try again tomorrow.'
      case 'payload-too-large':
        return 'Recording was too long. Try shorter clips.'
      case 'transcription':
        return 'Could not transcribe that clip. Try again.'
      case 'recording':
        return 'Could not start recording. Check the mic permission.'
      default:
        return null
    }
  })()

  const handleSave = async () => {
    if (!canSave) return
    setSaveState('saving')
    try {
      const payload = await generateSystemFromTextWithAi({ branch: selectedBranch, text: prompt, initial })
      await onFinish(payload)
    } catch (err) {
      setSaveState(err instanceof SystemAiQuotaExceededError ? 'quota' : 'error')
    }
  }

  const handleDelete = async () => {
    if (!initial?.id || !onDelete) return
    setDeleting(true)
    try {
      await onDelete(initial.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={modalShellRef}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#04060a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Edit system from text' : 'Create system from text'}
    >
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="inline-flex min-w-0 items-center gap-2 text-base font-semibold text-white/90">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">{initial ? 'Edit system' : 'New system'}</span>
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="rounded-[26px] border border-white/10 bg-[#050914] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.48)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cabff]">Text to system</p>
                <h1 className="mt-1 text-[25px] font-black leading-none text-white">Describe the sequence</h1>
              </div>
              <Sparkles className="h-5 w-5 text-[#8cabff]" />
            </div>

            <div className="mt-4">
              <BranchSelect label="System branch" value={selectedBranch} onChange={setSelectedBranch} />
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={8}
                placeholder="Example: From foot lock to armbar to D'Arce. From D'Arce you can go to short D'Arce or full D'Arce."
                className="mt-2 w-full resize-none rounded-[20px] border border-white/12 bg-black/35 px-4 py-4 text-base leading-6 text-white outline-none placeholder:text-white/25 focus:border-[#4d7cff]/55"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white/38">
                  {generated.nodes.length} step{generated.nodes.length === 1 ? '' : 's'} · {generated.edges.length} link{generated.edges.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  disabled={!dictation.supported || dictation.state === 'transcribing'}
                  onClick={() => {
                    void haptics.light()
                    void dictation.toggle()
                  }}
                  aria-label={dictation.state === 'recording' ? 'Stop dictation' : 'Start dictation'}
                  aria-busy={dictation.state === 'transcribing'}
                  className={cn(
                    'inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3 text-xs font-black transition active:scale-[0.97]',
                    dictation.state === 'recording'
                      ? 'border-red-400/35 bg-red-500/12 text-red-100'
                      : 'border-white/10 bg-white/[0.06] text-white/70',
                    (!dictation.supported || dictation.state === 'transcribing') && 'opacity-50',
                  )}
                >
                  {dictation.state === 'transcribing' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : dictation.state === 'recording' ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                  {dictationLabel}
                </button>
              </div>
              {dictationErrorCopy ? (
                <p className="mt-2 text-xs font-semibold text-amber-200/85">{dictationErrorCopy}</p>
              ) : null}
            </div>
          </div>

          {generated.nodes.length > 0 ? (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-[#030712]">
              <div className="aspect-[4/3]">
                <SystemGraphCanvas
                  variant="reader"
                  nodes={generated.nodes}
                  edges={generated.edges}
                  positions={positions}
                  density="hero"
                  showGrid
                  showControls={false}
                  showMiniMap={false}
                  reduceMotion={reduceMotion}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : null}

          {saveState === 'error' ? (
            <p className="mt-3 rounded-[16px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
              Could not save this system. Check the text and try again.
            </p>
          ) : null}
          {saveState === 'quota' ? (
            <p className="mt-3 rounded-[16px] border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Daily AI generation limit reached. Try again tomorrow.
            </p>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-[0.9fr_1.1fr] gap-3 border-t border-white/10 pt-4">
          {initial?.id && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              loading={deleting}
              disabled={deleting}
              onClick={handleDelete}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            loading={saveState === 'saving'}
            disabled={!canSave || saveState === 'saving'}
            onClick={handleSave}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Save system
          </Button>
        </div>
      </div>
    </div>
  )
}
