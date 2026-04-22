'use client'

import Image from 'next/image'
import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { communityService, type CommentTargetType, type TargetCommentRow } from '@/lib/community-service'
import { haptics } from '@/lib/haptics'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import { cn } from '@/lib/utils'

type TargetCommentsSheetProps = {
  targetType: CommentTargetType
  targetId: string
  targetTitle: string
  targetSubtitle?: string
  viewerUserId: string | null
  onClose: () => void
  onOpenProfile?: (userId: string) => void
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const s = Math.round(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  return new Date(then).toLocaleDateString()
}

export function TargetCommentsSheet({
  targetType,
  targetId,
  targetTitle,
  targetSubtitle,
  viewerUserId,
  onClose,
  onOpenProfile,
}: TargetCommentsSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })
  const [rows, setRows] = useState<TargetCommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [replyParentId, setReplyParentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nonce, setNonce] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    communityService
      .listTargetComments(targetType, targetId, 200)
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? 'Unable to load comments') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [targetType, targetId, nonce])

  const threaded = useMemo(() => {
    const parents: TargetCommentRow[] = []
    const byParent = new Map<string, TargetCommentRow[]>()
    for (const row of rows) {
      if (row.parentCommentId) {
        const group = byParent.get(row.parentCommentId) ?? []
        group.push(row)
        byParent.set(row.parentCommentId, group)
      } else {
        parents.push(row)
      }
    }
    return parents.flatMap((parent) => [parent, ...(byParent.get(parent.id) ?? [])])
  }, [rows])

  const handleSubmit = async () => {
    const body = draft.trim()
    if (!body || submitting) return
    if (!viewerUserId) {
      setError('Sign in to comment.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await communityService.postTargetComment(targetType, targetId, body, replyParentId)
      haptics.success()
      setDraft('')
      setReplyParentId(null)
      setNonce((n) => n + 1)
      textareaRef.current?.blur()
    } catch (err: any) {
      haptics.error()
      setError(err?.message ?? 'Unable to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-modal bg-black/60 text-white backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Comments on ${targetTitle}`}>
      <button type="button" aria-label="Close comments" className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#090d16]/98 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Comments</p>
            <p className="truncate text-xs font-semibold text-white/45">
              {targetTitle}{targetSubtitle ? ` · ${targetSubtitle}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/78"
            onClick={onClose}
            aria-label="Close comments"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="rounded-[20px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">
              Loading comments…
            </div>
          ) : threaded.length === 0 ? (
            <div className="flex h-full min-h-[24vh] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/58">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">No comments yet</p>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/55">Start the thread with a short takeaway or reaction.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {threaded.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    'border-b border-white/8 pb-4',
                    row.parentCommentId && 'ml-5 border-l border-white/10 border-b-0 pb-0 pl-4',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(row.userId)}
                      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/6"
                      aria-label={`Open ${row.authorDisplayName}'s profile`}
                    >
                      {row.authorAvatarUrl ? (
                        <Image src={row.authorAvatarUrl} alt={row.authorDisplayName} fill sizes="36px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/72">
                          {row.authorDisplayName.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{row.authorDisplayName}</p>
                          {row.authorHandle ? (
                            <p className="truncate text-xs font-semibold text-white/42">@{row.authorHandle}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/32">
                          {formatRelative(row.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/78">{row.body}</p>
                      {!row.parentCommentId && viewerUserId ? (
                        <button
                          type="button"
                          onClick={() => setReplyParentId(row.id)}
                          className="mt-2 text-xs font-semibold text-white/55 hover:text-white/80"
                        >
                          Reply
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 bg-[#090d16]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          {error ? (
            <p className="mb-2 text-xs font-semibold text-red-200">{error}</p>
          ) : null}
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={viewerUserId ? (replyParentId ? 'Write a reply…' : 'Add a comment…') : 'Sign in to comment'}
              rows={2}
              maxLength={1000}
              disabled={!viewerUserId}
              className="min-h-[48px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/28 disabled:opacity-45"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              {replyParentId ? (
                <button
                  type="button"
                  onClick={() => setReplyParentId(null)}
                  className="text-xs font-semibold text-white/55"
                >
                  Cancel reply
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!viewerUserId || !draft.trim() || submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f58ff] px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

