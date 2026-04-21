'use client'

import { MessageCircle, Send, X } from 'lucide-react'
import type { BjjFeedComment, BjjFeedPost } from '@/lib/bjj-types'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import { cn } from '@/lib/utils'

type SocialCommentsSheetProps = {
  comments: BjjFeedComment[]
  draft: string
  loading: boolean
  post: BjjFeedPost
  replyParentId: string | null
  isSocialPost: boolean
  onCancelReply: () => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onReply: (commentId: string) => void
  onSubmit: () => void
}

export function SocialCommentsSheet({
  comments,
  draft,
  loading,
  post,
  replyParentId,
  isSocialPost,
  onCancelReply,
  onClose,
  onDraftChange,
  onReply,
  onSubmit,
}: SocialCommentsSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  return (
    <div className="fixed inset-0 z-modal bg-black/60 text-white backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#090d16]/98 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Comments</p>
            <p className="truncate text-xs font-semibold text-white/45">{post.authorName} · {post.createdAtLabel}</p>
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
          ) : comments.length === 0 ? (
            <div className="flex h-full min-h-[24vh] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/58">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">No comments yet</p>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/55">Start the thread with a short takeaway or reaction.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    'border-b border-white/8 pb-4',
                    comment.parentCommentId && 'ml-5 border-l border-white/10 border-b-0 pb-0 pl-4',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{comment.authorName}</p>
                      <p className="truncate text-xs font-semibold text-white/42">{comment.authorHandle}</p>
                    </div>
                    <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/32">{comment.createdAtLabel}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">{comment.body}</p>
                  {comment.hashtags && comment.hashtags.length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-[#8cabff]">{comment.hashtags.map((tag) => `#${tag}`).join(' ')}</p>
                  )}
                  {isSocialPost && (
                    <button
                      type="button"
                      onClick={() => onReply(comment.id)}
                      className="mt-3 text-xs font-semibold text-white/55"
                    >
                      Reply
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-[#090d16]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={replyParentId ? 'Write a reply…' : 'Add a comment…'}
              rows={2}
              className="min-h-[48px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/28"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                {replyParentId && (
                  <button
                    type="button"
                    onClick={onCancelReply}
                    className="text-xs font-semibold text-white/55"
                  >
                    Cancel reply
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[#2f58ff] px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
