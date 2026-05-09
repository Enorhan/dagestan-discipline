'use client'

import Image from 'next/image'
import { Bookmark, ChevronLeft, Ellipsis, Heart, MessageCircle, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BjjFeedComment } from '@/lib/bjj-types'
import { bjjService } from '@/lib/bjj-service'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import type { SocialFeedPost } from '@/lib/social-models'
import { cn } from '@/lib/utils'

type SocialPostViewerSheetProps = {
  post: SocialFeedPost
  viewerUserId: string | null
  onClose: () => void
  onOpenComments: () => void
  onOpenMore: () => void
  onShare: () => void
  onToggleLike: () => void
  onToggleSave: () => void
}

function formatEngagementCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

export function SocialPostViewerSheet({
  post,
  viewerUserId,
  onClose,
  onOpenComments,
  onOpenMore,
  onShare,
  onToggleLike,
  onToggleSave,
}: SocialPostViewerSheetProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  const mediaSrc = post.thumbnailUrl ?? post.mediaUrl ?? ''
  const createdAtLabel = new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const [previewComments, setPreviewComments] = useState<BjjFeedComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)

  const processingLabel = useMemo(() => {
    if (post.renderStatus === 'processing') return 'Rendering'
    if (post.renderStatus === 'failed') return 'Render failed'
    if (post.processingStatus && post.processingStatus !== 'ready') {
      return post.processingStatus === 'failed' ? 'Render failed' : 'Processing'
    }
    return null
  }, [post.processingStatus, post.renderStatus])

  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)
    setPreviewComments([])
    void (async () => {
      try {
        const list = await bjjService.listCommentsForPost(viewerUserId, post.id)
        if (cancelled) return
        const roots = list.filter((c) => !c.parentCommentId)
        setPreviewComments(roots.slice(0, 3))
      } catch {
        if (!cancelled) setPreviewComments([])
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [post.id, viewerUserId])

  const likesLine = post.likes > 0 ? `${formatEngagementCount(post.likes)} likes` : 'Be the first to like this'

  return (
    <div className="fixed inset-0 z-modal flex flex-col bg-black text-white">
      <header className="flex shrink-0 items-center justify-between gap-2 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition active:scale-[0.98]"
          aria-label="Back"
        >
          <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={onOpenMore}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/78 transition active:scale-[0.98]"
          aria-label="More post actions"
        >
          <Ellipsis className="h-6 w-6" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative w-full shrink-0 bg-black">
          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="relative aspect-[4/5] w-full max-h-[min(72dvh,820px)] bg-[#0a0c12] sm:aspect-auto sm:min-h-[320px] sm:max-h-[62dvh]">
              {post.mediaType === 'video' && post.playbackUrl ? (
                <video
                  src={post.playbackUrl}
                  poster={mediaSrc || undefined}
                  className="absolute inset-0 h-full w-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                />
              ) : mediaSrc ? (
                <Image
                  src={mediaSrc}
                  alt={post.caption || `${post.authorName} post`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[linear-gradient(165deg,rgba(47,88,255,0.2),rgba(8,10,18,0.96))] text-sm font-semibold text-white/72">
                  {post.postKind === 'reel' ? 'Reel' : 'Post'}
                </div>
              )}
              {processingLabel && (
                <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm">
                  {processingLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px] shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-1">
          <div className="flex items-center gap-3 border-b border-white/[0.07] py-3">
            {post.authorAvatarUrl ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-white/12">
                <Image src={post.authorAvatarUrl} alt="" fill className="object-cover" />
              </div>
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/16 to-white/6 text-sm font-black text-white ring-1 ring-white/12">
                {post.authorName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold tracking-tight">{post.authorName}</p>
              <p className="truncate text-xs font-medium text-white/45">{post.authorHandle}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={onToggleLike}
                className={cn(
                  'inline-flex h-12 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 transition active:scale-[0.97]',
                  post.viewerLiked ? 'text-[#ff4d6d]' : 'text-white/88',
                )}
                aria-label={post.viewerLiked ? 'Unlike' : 'Like'}
              >
                <Heart className={cn('h-7 w-7', post.viewerLiked && 'fill-current')} />
                <span className="text-[11px] font-bold tabular-nums">{formatEngagementCount(post.likes)}</span>
              </button>
              <button
                type="button"
                onClick={onOpenComments}
                className="inline-flex h-12 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-white/88 transition active:scale-[0.97]"
                aria-label="Comments"
              >
                <MessageCircle className="h-7 w-7" strokeWidth={2} />
                <span className="text-[11px] font-bold tabular-nums">{post.comments}</span>
              </button>
              <button
                type="button"
                onClick={onShare}
                className="inline-flex h-12 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-white/88 transition active:scale-[0.97]"
                aria-label="Share"
              >
                <Send className="h-6 w-6" strokeWidth={2} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Share</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleSave}
              className={cn(
                'inline-flex h-12 w-12 items-center justify-center rounded-2xl transition active:scale-[0.97]',
                post.viewerSaved ? 'text-[#8cabff]' : 'text-white/78',
              )}
              aria-label={post.viewerSaved ? 'Remove save' : 'Save'}
            >
              <Bookmark className={cn('h-7 w-7', post.viewerSaved && 'fill-current')} />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenComments}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-left transition active:bg-white/[0.07]"
          >
            <p className="text-[13px] font-semibold text-white/88">{likesLine}</p>
            <p className="mt-0.5 text-xs text-white/38">{createdAtLabel}</p>
          </button>

          {post.caption ? (
            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="text-[15px] leading-relaxed text-white/92">
                <span className="font-bold text-white">{post.authorName}</span>
                <span className="text-white/92"> {post.caption}</span>
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-white/88">Comments</p>
              {post.comments > 0 ? (
                <button
                  type="button"
                  onClick={onOpenComments}
                  className="text-xs font-semibold text-[#8cabff]"
                >
                  View all
                </button>
              ) : null}
            </div>
            {commentsLoading ? (
              <div className="space-y-2">
                {[0, 1].map((key) => (
                  <div key={key} className="skeleton-shimmer h-12 rounded-xl bg-white/[0.06]" />
                ))}
              </div>
            ) : previewComments.length === 0 ? (
              <button
                type="button"
                onClick={onOpenComments}
                className="w-full rounded-2xl border border-dashed border-white/14 bg-white/[0.02] px-4 py-8 text-center transition active:bg-white/[0.05]"
              >
                <p className="text-sm font-semibold text-white/55">No comments yet</p>
                <p className="mt-1 text-xs text-white/35">Start the conversation</p>
              </button>
            ) : (
              <div className="space-y-3">
                {previewComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-left">
                    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-white/10" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-white/88">
                        <span className="font-bold text-white">{comment.authorName}</span>
                        <span className="text-white/75"> {comment.body}</span>
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-white/32">{comment.createdAtLabel}</p>
                    </div>
                  </div>
                ))}
                {post.comments > previewComments.length ? (
                  <button
                    type="button"
                    onClick={onOpenComments}
                    className="text-sm font-semibold text-[#8cabff]"
                  >
                    View all {post.comments} comments
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenComments}
            className="mt-5 flex w-full items-center gap-3 rounded-full border border-white/12 bg-white/[0.06] px-4 py-3 text-left text-sm text-white/45 transition active:bg-white/[0.09]"
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            Add a comment…
          </button>
        </div>
      </div>
    </div>
  )
}
