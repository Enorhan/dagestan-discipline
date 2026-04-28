'use client'

import { ArrowLeft, ArrowRight, Check, GitBranch, Plus, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { useModalFocusTrap } from '@/lib/hooks/use-modal-focus-trap'
import { haptics } from '@/lib/haptics'
import type { SaveUserSystemInput, SaveUserSystemResult } from '@/lib/bjj-service'
import type { BjjPrivacy, BjjSystem } from '@/lib/bjj-types'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import {
  computeWizardGraphLayout,
  createGraphWizardState,
  graphWizardCanSave,
  graphWizardReducer,
  graphWizardToSaveInput,
} from '@/lib/system-graph-wizard'
import { newDraftNodeId } from '@/lib/user-system-draft'
import { cn } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function UserSystemWizardModal({
  initial,
  branch,
  onClose,
  onSaveDraft,
  onFinish,
  onDelete,
}: {
  initial: BjjSystem | null
  branch: MartialArtsBranchId
  onClose: () => void
  onSaveDraft: (payload: SaveUserSystemInput) => Promise<SaveUserSystemResult>
  onFinish: (payload: SaveUserSystemInput) => Promise<void>
  onDelete?: (systemId: string) => Promise<void>
}) {
  const [state, dispatch] = useReducer(graphWizardReducer, undefined, () => createGraphWizardState(branch, initial))
  const [reviewOpen, setReviewOpen] = useState(false)
  const [connectTargetId, setConnectTargetId] = useState('')
  const [saveState, setSaveState] = useState<SaveState>(initial?.status === 'draft' ? 'saved' : 'idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initial?.updatedAt ?? null)
  const [finishing, setFinishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const autosaveKey = useMemo(() => JSON.stringify(graphWizardToSaveInput(state, 'draft')), [state])
  const canSave = graphWizardCanSave(state)
  const reduceMotion = useReducedMotion()
  const modalShellRef = useRef<HTMLDivElement | null>(null)
  useModalFocusTrap(true, modalShellRef)

  const activeNode = state.nodes.find((node) => node.id === state.activeNodeId) ?? state.nodes[0]!
  const outgoing = state.edges
    .filter((edge) => edge.from === activeNode.id)
    .map((edge) => ({
      edge,
      node: state.nodes.find((node) => node.id === edge.to) ?? null,
    }))
    .filter((entry): entry is { edge: SaveUserSystemInput['edges'][number]; node: SaveUserSystemInput['nodes'][number] } => entry.node != null)
  const positions = useMemo(() => computeWizardGraphLayout(state.nodes, state.edges), [state.nodes, state.edges])
  const activeIndex = Math.max(0, state.nodes.findIndex((node) => node.id === activeNode.id))

  const saveDraftNow = useCallback(async () => {
    if (!graphWizardCanSave(state)) return null
    setSaveState('saving')
    try {
      const result = await onSaveDraft(graphWizardToSaveInput(state, 'draft'))
      if (result.id && result.id !== state.id) dispatch({ type: 'set-draft-id', id: result.id })
      setLastSavedAt(result.updatedAt)
      setSaveState('saved')
      return result
    } catch {
      setSaveState('error')
      return null
    }
  }, [onSaveDraft, state])

  useEffect(() => {
    if (!canSave || finishing) return
    const timeout = window.setTimeout(() => {
      void saveDraftNow()
    }, 900)
    return () => window.clearTimeout(timeout)
  }, [autosaveKey, canSave, finishing, saveDraftNow])

  const addOutcome = (selectAfterCreate = false) => {
    const nodeId = newDraftNodeId()
    dispatch({ type: 'add-outcome', fromId: activeNode.id, nodeId })
    if (selectAfterCreate) dispatch({ type: 'select-step', id: nodeId })
    void haptics.light()
  }

  const handleClose = async () => {
    if (canSave) await saveDraftNow()
    onClose()
  }

  const handleFinish = async () => {
    if (!canSave) return
    setFinishing(true)
    try {
      const draft = await saveDraftNow()
      await onFinish(graphWizardToSaveInput({ ...state, id: draft?.id ?? state.id }, 'active'))
    } finally {
      setFinishing(false)
    }
  }

  const formattedSave = saveState === 'saving'
    ? 'Saving'
    : saveState === 'saved'
      ? lastSavedAt
        ? 'Draft saved'
        : 'Saved'
      : saveState === 'error'
        ? 'Could not save'
        : 'Draft'

  return (
    <div
      ref={modalShellRef}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#04060a] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Create training graph"
    >
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <button type="button" onClick={() => void handleClose()} className="inline-flex min-w-0 items-center gap-2 text-base font-semibold text-white/90">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">{initial?.status === 'draft' ? 'Resume graph' : 'New graph'}</span>
          </button>
          <span
            className={cn(
              'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.12em]',
              saveState === 'error'
                ? 'border-red-400/25 bg-red-500/10 text-red-100'
                : saveState === 'saving'
                  ? 'border-[#4d7cff]/28 bg-[#4d7cff]/12 text-[#b8c9ff]'
                  : 'border-white/10 bg-white/[0.04] text-white/45',
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {formattedSave}
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="rounded-[26px] border border-white/10 bg-[#050914] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.48)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cabff]">Step {activeIndex + 1}</p>
                <h1 className="mt-1 text-[25px] font-black leading-none text-white">Build the path</h1>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen((previous) => !previous)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 text-xs font-black text-[#d9e4ff]"
              >
                <GitBranch className="h-3.5 w-3.5" />
                {reviewOpen ? 'Form' : 'Map'}
              </button>
            </div>

            {reviewOpen ? (
              <div className="mt-4">
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#030712] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="aspect-[4/3]">
                    <SystemGraphCanvas
                      variant="reader"
                      nodes={state.nodes}
                      edges={state.edges}
                      positions={positions}
                      selectedNodeId={activeNode.id}
                      highlightedNodeIds={[activeNode.id]}
                      highlightedEdgeKeys={state.edges.filter((edge) => edge.from === activeNode.id || edge.to === activeNode.id).map((edge) => `${edge.from}->${edge.to}`)}
                      density="hero"
                      showNodeIndex
                      showGrid
                      showControls={false}
                      showMiniMap={false}
                      reduceMotion={reduceMotion}
                      className="h-full w-full"
                      onSelectNode={(id) => {
                        if (id) {
                          dispatch({ type: 'select-step', id })
                          setReviewOpen(false)
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-white/40" htmlFor="wizard-title">
                    Graph title
                  </label>
                  <input
                    id="wizard-title"
                    value={state.title}
                    onChange={(event) => dispatch({ type: 'set-title', title: event.target.value })}
                    placeholder="Name this training graph"
                    className="mt-1.5 w-full rounded-[12px] border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/45"
                  />
                  <textarea
                    value={state.summary}
                    onChange={(event) => dispatch({ type: 'set-summary', summary: event.target.value })}
                    rows={2}
                    placeholder="Optional short note"
                    className="mt-2 w-full resize-none rounded-[12px] border border-white/10 bg-black/35 px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus:border-[#4d7cff]/45"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['private', 'public'] as const).map((visibility) => (
                      <button
                        key={visibility}
                        type="button"
                        onClick={() => dispatch({ type: 'set-visibility', visibility })}
                        className={cn(
                          'min-h-[42px] rounded-[13px] border text-sm font-black capitalize',
                          state.visibility === visibility
                            ? 'border-[#4d7cff]/50 bg-[#4d7cff]/18 text-[#b8c9ff]'
                            : 'border-white/10 bg-white/[0.04] text-white/50',
                        )}
                      >
                        {visibility}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-white/40" htmlFor="wizard-step-label">
                  What is this step?
                </label>
                <input
                  id="wizard-step-label"
                  value={activeNode.label}
                  onChange={(event) => dispatch({ type: 'rename-step', id: activeNode.id, label: event.target.value })}
                  placeholder="Triangle choke"
                  className="mt-2 w-full rounded-[18px] border border-white/12 bg-black/35 px-4 py-4 text-lg font-black text-white outline-none placeholder:text-white/25 focus:border-[#4d7cff]/55"
                />

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">What can happen next?</p>
                    <p className="mt-1 text-xs text-white/38">{outgoing.length === 0 ? 'Add one outcome or branch into several.' : `${outgoing.length} outcome${outgoing.length === 1 ? '' : 's'}`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addOutcome(false)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white/78"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Outcome
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {outgoing.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addOutcome(false)}
                      className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#4d7cff]/35 bg-[#4d7cff]/08 text-sm font-black text-[#b8c9ff]"
                    >
                      <Plus className="h-4 w-4" />
                      Add next step
                    </button>
                  ) : null}
                  {outgoing.map(({ edge, node }, index) => (
                    <div key={`${edge.from}-${edge.to}`} className="rounded-[18px] border border-white/10 bg-black/28 p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white/70">
                          {index + 1}
                        </span>
                        <input
                          value={node.label}
                          onChange={(event) => dispatch({ type: 'rename-step', id: node.id, label: event.target.value })}
                          placeholder={index === 0 ? 'Armbar' : 'Omoplata'}
                          className="min-w-0 flex-1 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-[#4d7cff]/45"
                        />
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'remove-outcome', fromId: edge.from, toId: edge.to })}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/42"
                          aria-label="Remove outcome"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        value={edge.label ?? ''}
                        onChange={(event) => dispatch({ type: 'set-transition-label', fromId: edge.from, toId: edge.to, label: event.target.value })}
                        placeholder="Optional transition note"
                        className="mt-2 w-full rounded-[12px] border border-white/8 bg-black/30 px-3 py-2 text-xs font-semibold text-white/80 outline-none placeholder:text-white/25 focus:border-[#4d7cff]/35"
                      />
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'select-step', id: node.id })}
                        className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#4d7cff]/30 bg-[#4d7cff]/12 text-xs font-black text-[#d9e4ff]"
                      >
                        Continue here
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {state.nodes.length > 1 ? (
                  <div className="mt-3 rounded-[16px] border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Connect to a step already in this graph</p>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={connectTargetId}
                        onChange={(event) => setConnectTargetId(event.target.value)}
                        className="min-w-0 flex-1 rounded-[12px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-semibold text-white outline-none"
                      >
                        <option value="">Choose step</option>
                        {state.nodes
                          .filter((node) => node.id !== activeNode.id)
                          .map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.label || 'Untitled step'}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!connectTargetId}
                        onClick={() => {
                          if (!connectTargetId) return
                          dispatch({ type: 'connect-existing', fromId: activeNode.id, toId: connectTargetId })
                          setConnectTargetId('')
                        }}
                        className="rounded-[12px] border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-white/72 disabled:opacity-35"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {state.nodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  dispatch({ type: 'select-step', id: node.id })
                  setReviewOpen(false)
                }}
                className={cn(
                  'inline-flex min-h-[42px] max-w-[150px] shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-black',
                  node.id === activeNode.id
                    ? 'border-[#4d7cff]/50 bg-[#4d7cff]/18 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/50',
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px]">{index + 1}</span>
                <span className="truncate">{node.label || 'Untitled'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid shrink-0 grid-cols-[0.95fr_1.05fr] gap-3 border-t border-white/10 pt-4">
          {initial?.status === 'draft' && initial.id && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              loading={deleting}
              disabled={deleting}
              onClick={async () => {
                if (!initial.id) return
                setDeleting(true)
                try {
                  await onDelete(initial.id)
                } finally {
                  setDeleting(false)
                }
              }}
              leftIcon={<X className="h-4 w-4" />}
            >
              Delete
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => void handleClose()}>
              Close
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            loading={finishing}
            disabled={!canSave || finishing}
            onClick={() => reviewOpen ? void handleFinish() : setReviewOpen(true)}
            leftIcon={reviewOpen ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          >
            {reviewOpen ? 'Finish graph' : 'Review'}
          </Button>
        </div>
      </div>
    </div>
  )
}
