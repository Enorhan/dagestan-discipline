'use client'

import Image from 'next/image'
import { Bookmark, Ellipsis, Heart, MessageCircle, Send, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { socialFeedService } from '@/lib/social-feed-service'
import type { SocialFeedPost } from '@/lib/social-models'
import { cn } from '@/lib/utils'

type SocialReelsPlayerProps = {
  currentUserId: string
  initialPostId?: string | null
  posts: SocialFeedPost[]
  surface?: 'reels' | 'profile'
  isFollowingAuthor?: (authorId: string) => boolean
  onToggleLike: (post: SocialFeedPost) => void
  onToggleSave: (post: SocialFeedPost) => void
  onOpenComments: (postId: string) => void
  onFollowAuthor: (authorId: string, authorName: string) => void
  onOpenMore: (post: SocialFeedPost) => void
}

type ReelMilestoneMap = Record<string, Set<string>>
const REELS_PRELOAD_DISTANCE = 2

export function SocialReelsPlayer({
  currentUserId,
  initialPostId,
  posts,
  surface = 'reels',
  isFollowingAuthor,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onFollowAuthor,
  onOpenMore,
}: SocialReelsPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const milestoneRef = useRef<ReelMilestoneMap>({})
  const visibleTimersRef = useRef<Record<string, number>>({})
  const endedRef = useRef<Record<string, boolean>>({})
  const watchRef = useRef<Record<string, number>>({})
  const progressEventRef = useRef<Record<string, number>>({})
  const activePostIdRef = useRef<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [expandedCaptionIds, setExpandedCaptionIds] = useState<string[]>([])
  const [mutedPostIds, setMutedPostIds] = useState<string[]>([])

  const activePost = posts[activeIndex] ?? null

  const activeSet = useMemo(() => new Set(expandedCaptionIds), [expandedCaptionIds])
  const mutedSet = useMemo(() => new Set(mutedPostIds), [mutedPostIds])

  useEffect(() => {
    if (!initialPostId) return
    const index = posts.findIndex((post) => post.id === initialPostId)
    if (index < 0) return
    const frame = window.requestAnimationFrame(() => {
      setActiveIndex(index)
      const node = itemRefs.current[index]
      if (node) {
        node.scrollIntoView({ block: 'start' })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [initialPostId, posts])

  const trackPlaybackEvent = useCallback(async (
    postId: string,
    payload: { watchMs?: number; completed?: boolean; skipped?: boolean; replayed?: boolean },
  ) => {
    await socialFeedService.trackPlaybackEvent(currentUserId, postId, {
      surface: surface === 'profile' ? 'profile' : 'reels',
      watchMs: payload.watchMs,
      completed: payload.completed,
      skipped: payload.skipped,
      replayed: payload.replayed,
    })
  }, [currentUserId, surface])

  const trackMilestone = useCallback(async (
    postId: string,
    milestone:
      | 'impression'
      | 'watch_start'
      | 'view_2s'
      | 'quartile_25'
      | 'quartile_50'
      | 'quartile_75'
      | 'completion'
      | 'skip'
      | 'replay',
    watchMs = 0,
  ) => {
    if (!milestoneRef.current[postId]) {
      milestoneRef.current[postId] = new Set()
    }

    const dedupeKey = milestone === 'replay' ? `${milestone}:${Date.now()}` : milestone
    if (milestone !== 'replay' && milestoneRef.current[postId].has(dedupeKey)) {
      return
    }

    if (milestone !== 'replay') {
      milestoneRef.current[postId].add(dedupeKey)
    }

    await socialFeedService.trackPlaybackMilestone(currentUserId, postId, {
      surface: surface === 'profile' ? 'profile' : 'reels',
      milestone,
      watchMs,
    })
  }, [currentUserId, surface])

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, posts.length)
  }, [posts.length])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const nextCandidate = entries
        .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

      if (nextCandidate) {
        const index = Number(nextCandidate.target.getAttribute('data-index') ?? '0')
        if (Number.isFinite(index)) {
          setActiveIndex(index)
        }
      }

      for (const entry of entries) {
        const postId = entry.target.getAttribute('data-post-id')
        if (!postId) continue

        const existingTimer = visibleTimersRef.current[postId]
        if (existingTimer) {
          window.clearTimeout(existingTimer)
          delete visibleTimersRef.current[postId]
        }

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          visibleTimersRef.current[postId] = window.setTimeout(() => {
            void trackMilestone(postId, 'impression')
            delete visibleTimersRef.current[postId]
          }, 500)
        }
      }
    }, {
      threshold: [0.25, 0.6, 0.85],
      root: containerRef.current,
    })

    for (const node of itemRefs.current) {
      if (node) observer.observe(node)
    }

    return () => {
      observer.disconnect()
      for (const timer of Object.values(visibleTimersRef.current)) {
        window.clearTimeout(timer)
      }
      visibleTimersRef.current = {}
    }
  }, [posts, trackMilestone])

  useEffect(() => {
    const previousPostId = activePostIdRef.current
    if (previousPostId && previousPostId !== activePost?.id) {
      const previousVideo = videoRefs.current[previousPostId]
      if (previousVideo) {
        const watchedRatio = previousVideo.duration > 0 ? previousVideo.currentTime / previousVideo.duration : 0
        if (watchedRatio > 0 && watchedRatio < 0.25 && !endedRef.current[previousPostId]) {
          void trackMilestone(previousPostId, 'skip', Math.round(previousVideo.currentTime * 1000))
          void trackPlaybackEvent(previousPostId, {
            skipped: true,
            watchMs: Math.round(previousVideo.currentTime * 1000),
          })
        }
        previousVideo.pause()
      }
    }

    activePostIdRef.current = activePost?.id ?? null

    for (const post of posts) {
      const video = videoRefs.current[post.id]
      if (!video) continue

      if (post.id === activePost?.id && post.playbackUrl && post.processingStatus === 'ready') {
        video.muted = mutedSet.has(post.id)
        void video.play().catch(() => {})
      } else {
        video.pause()
      }
    }
  }, [activePost?.id, mutedSet, posts, trackMilestone, trackPlaybackEvent])

  useEffect(() => {
    const visiblePostIds = new Set(
      posts
        .filter((_, index) => Math.abs(index - activeIndex) <= REELS_PRELOAD_DISTANCE)
        .map((post) => post.id),
    )
    for (const [postId, video] of Object.entries(videoRefs.current)) {
      if (!video) continue
      if (visiblePostIds.has(postId)) {
        video.preload = 'auto'
        video.load()
      } else {
        video.preload = 'metadata'
      }
    }
  }, [activeIndex, posts])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        for (const video of Object.values(videoRefs.current)) {
          video?.pause()
        }
        return
      }
      const activeId = activePostIdRef.current
      if (!activeId) return
      const activeVideo = videoRefs.current[activeId]
      if (activeVideo) {
        void activeVideo.play().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const handleTimeUpdate = (post: SocialFeedPost, node: HTMLVideoElement) => {
    const duration = node.duration
    if (!Number.isFinite(duration) || duration <= 0) return

    const currentMs = Math.round(node.currentTime * 1000)
    watchRef.current[post.id] = currentMs

    if (node.currentTime >= 2) {
      void trackMilestone(post.id, 'view_2s', currentMs)
      const lastTrackedProgressMs = progressEventRef.current[post.id] ?? 0
      if (currentMs - lastTrackedProgressMs >= 5000 || lastTrackedProgressMs === 0) {
        progressEventRef.current[post.id] = currentMs
        void trackPlaybackEvent(post.id, { watchMs: currentMs })
      }
    }

    const watchedRatio = node.currentTime / duration
    if (watchedRatio >= 0.25) void trackMilestone(post.id, 'quartile_25', currentMs)
    if (watchedRatio >= 0.5) void trackMilestone(post.id, 'quartile_50', currentMs)
    if (watchedRatio >= 0.75) void trackMilestone(post.id, 'quartile_75', currentMs)
    if (watchedRatio >= 0.95) {
      endedRef.current[post.id] = true
      void trackMilestone(post.id, 'completion', currentMs)
      void trackPlaybackEvent(post.id, { completed: true, watchMs: currentMs })
    }
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/58">
        No reels available yet.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full snap-y snap-mandatory overflow-y-auto bg-black',
      )}
    >
      {posts.map((post, index) => {
        const isExpanded = activeSet.has(post.id)
        const isFollowing = post.authorId ? Boolean(isFollowingAuthor?.(post.authorId)) : false
        const displayCaption = isExpanded || post.caption.length <= 160
          ? post.caption
          : `${post.caption.slice(0, 160).trim()}…`

        return (
          <article
            key={post.id}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            data-index={index}
            data-post-id={post.id}
            className="relative snap-start"
          >
            <div className="relative isolate h-[100dvh] min-h-[100dvh] bg-black">
              {post.playbackUrl && post.processingStatus === 'ready' ? (
                <video
                  ref={(node) => {
                    videoRefs.current[post.id] = node
                  }}
                  src={post.playbackUrl}
                  poster={post.thumbnailUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  playsInline
                  loop={false}
                  preload={Math.abs(index - activeIndex) <= REELS_PRELOAD_DISTANCE ? 'auto' : 'metadata'}
                  controls={false}
                  muted={mutedSet.has(post.id)}
                  onPlay={(event) => {
                    const replaying = endedRef.current[post.id] && event.currentTarget.currentTime < 0.25
                    if (replaying) {
                      endedRef.current[post.id] = false
                      void trackMilestone(post.id, 'replay')
                      void trackPlaybackEvent(post.id, { replayed: true })
                    } else {
                      void trackMilestone(post.id, 'watch_start')
                      void trackPlaybackEvent(post.id, { watchMs: 0 })
                    }
                  }}
                  onTimeUpdate={(event) => handleTimeUpdate(post, event.currentTarget)}
                  onEnded={(event) => {
                    endedRef.current[post.id] = true
                    const currentMs = Math.round(event.currentTarget.currentTime * 1000)
                    void trackMilestone(post.id, 'completion', currentMs)
                    void trackPlaybackEvent(post.id, { completed: true, watchMs: currentMs })
                  }}
                />
              ) : post.thumbnailUrl || post.mediaUrl ? (
                <div className="absolute inset-0">
                  <Image
                    src={post.thumbnailUrl ?? post.mediaUrl ?? ''}
                    alt={post.caption || `${post.authorName} reel`}
                    fill
                    className="object-cover opacity-90"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,14,20,0.2),rgba(12,14,20,0.9))]" />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.74)_62%,rgba(0,0,0,0.92))]" />

              <div className="absolute inset-x-0 top-0 z-10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMutedPostIds((previous) => (
                        mutedSet.has(post.id)
                          ? previous.filter((entry) => entry !== post.id)
                          : [...previous, post.id]
                      ))
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white"
                    aria-label={mutedSet.has(post.id) ? 'Unmute reel' : 'Mute reel'}
                    aria-pressed={mutedSet.has(post.id)}
                  >
                    {mutedSet.has(post.id) ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenMore(post)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white"
                    aria-label="More reel actions"
                  >
                    <Ellipsis className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-20">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {post.authorAvatarUrl ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/15">
                        <Image src={post.authorAvatarUrl} alt={post.authorName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-sm font-black text-white">
                        {post.authorName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{post.authorName}</p>
                      <p className="truncate text-xs font-semibold text-white/60">{post.authorHandle}</p>
                    </div>
                    {post.authorId && post.authorId !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => onFollowAuthor(post.authorId, post.authorName)}
                        className={cn(
                          'ml-auto rounded-full px-3 py-1.5 text-xs font-bold',
                          isFollowing ? 'bg-white/12 text-white/70' : 'bg-white text-black',
                        )}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {post.caption && (
                    <div className="max-w-[85%] space-y-1">
                      <p className="text-sm leading-6 text-white/84">{displayCaption}</p>
                      {post.caption.length > 160 && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-white/64"
                          onClick={() => setExpandedCaptionIds((previous) => (
                            activeSet.has(post.id)
                              ? previous.filter((entry) => entry !== post.id)
                              : [...previous, post.id]
                          ))}
                        >
                          {isExpanded ? 'Show less' : 'More'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex w-[72px] flex-col items-center gap-5 pb-1 text-white">
                  <button
                    type="button"
                    onClick={() => onToggleLike(post)}
                    className={cn('flex flex-col items-center gap-1 text-xs font-bold text-white/82', post.viewerLiked && 'text-[#7ea4ff]')}
                  >
                    <Heart className={cn('h-7 w-7', post.viewerLiked && 'fill-current')} />
                    <span>{post.likes}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenComments(post.id)}
                    className="flex flex-col items-center gap-1 text-xs font-bold text-white/82"
                  >
                    <MessageCircle className="h-7 w-7" />
                    <span>{post.comments}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSave(post)}
                    className={cn('flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/82', post.viewerSaved && 'text-[#7ea4ff]')}
                  >
                    <Bookmark className={cn('h-7 w-7', post.viewerSaved && 'fill-current')} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${post.authorName}\n\n${post.caption}`.trim()
                      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                        void navigator.share({ title: post.authorName, text }).catch(() => {})
                        return
                      }
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        void navigator.clipboard.writeText(text).catch(() => {})
                      }
                    }}
                    className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/72"
                  >
                    <Send className="h-6 w-6" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
