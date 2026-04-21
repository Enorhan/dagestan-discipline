'use client'

import Image from 'next/image'
import { BookmarkPlus, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import type { SocialStory } from '@/lib/social-models'

const STORY_IMAGE_DURATION_MS = 7000

type SocialStoryViewerProps = {
  activeIndex: number
  onChangeIndex: (index: number) => void
  onClose: () => void
  stories: SocialStory[]
  onSaveToMoments?: (story: SocialStory) => void
}

export function SocialStoryViewer({
  activeIndex,
  onChangeIndex,
  onClose,
  stories,
  onSaveToMoments,
}: SocialStoryViewerProps) {
  const activeStory = stories[activeIndex] ?? null
  useOverlayLock({ enabled: Boolean(activeStory), onEscape: onClose })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const pressStartedAtRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)

  useEffect(() => {
    if (!activeStory || activeStory.mediaType !== 'image' || paused) return

    const startedAt = window.performance.now()
    let frame = 0
    const tick = (timestamp: number) => {
      const elapsed = timestamp - startedAt
      const progress = Math.max(0, Math.min(1, elapsed / STORY_IMAGE_DURATION_MS))
      setImageProgress(progress)
      if (progress >= 1) {
        if (activeIndex < stories.length - 1) {
          onChangeIndex(activeIndex + 1)
        } else {
          onClose()
        }
        return
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [activeIndex, activeStory, onChangeIndex, onClose, paused, stories.length])

  useEffect(() => {
    if (!activeStory || activeStory.mediaType !== 'video' || !videoRef.current) return
    const node = videoRef.current
    if (paused) {
      node.pause()
      return
    }
    void node.play().catch(() => {})
  }, [activeStory, paused])

  const progressValues = useMemo(() => stories.map((story, index) => {
    if (!activeStory) return 0
    if (index < activeIndex) return 1
    if (index > activeIndex) return 0
    return story.mediaType === 'video' ? videoProgress : imageProgress
  }), [activeIndex, activeStory, imageProgress, stories, videoProgress])

  if (!activeStory) {
    return null
  }

  const handleNavigate = (direction: 'previous' | 'next') => {
    if (direction === 'previous') {
      if (activeIndex > 0) {
        onChangeIndex(activeIndex - 1)
      }
      return
    }

    if (activeIndex < stories.length - 1) {
      onChangeIndex(activeIndex + 1)
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-modal bg-black text-white">
      <div
        className="relative mx-auto h-full w-full max-w-[430px] overflow-hidden bg-black"
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null
          pressStartedAtRef.current = Date.now()
          setPaused(true)
        }}
        onTouchEnd={(event) => {
          const startedAt = pressStartedAtRef.current
          setPaused(false)

          const startY = touchStartYRef.current
          const endY = event.changedTouches[0]?.clientY ?? null
          if (startY != null && endY != null && endY - startY > 120) {
            onClose()
            return
          }

          const duration = Date.now() - startedAt
          if (duration < 220) {
            const width = event.currentTarget.clientWidth
            const touchX = event.changedTouches[0]?.clientX ?? width / 2
            handleNavigate(touchX < width / 2 ? 'previous' : 'next')
          }
        }}
        onMouseDown={() => {
          pressStartedAtRef.current = Date.now()
          setPaused(true)
        }}
        onMouseUp={(event) => {
          const duration = Date.now() - pressStartedAtRef.current
          setPaused(false)
          if (duration < 220) {
            const width = event.currentTarget.clientWidth
            handleNavigate(event.clientX < width / 2 ? 'previous' : 'next')
          }
        }}
      >
        <div className="absolute left-0 right-0 top-0 z-20 px-3 pb-4 pt-[calc(env(safe-area-inset-top)+10px)]">
          <div className="flex items-center gap-1.5">
            {progressValues.map((progress, index) => (
              <div key={`${stories[index]?.id ?? index}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {activeStory.authorAvatarUrl ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/12">
                  <Image src={activeStory.authorAvatarUrl} alt={activeStory.authorName} fill className="object-cover" />
                </div>
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 text-sm font-black text-white">
                  {activeStory.authorName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{activeStory.authorName}</p>
                <p className="truncate text-xs font-semibold text-white/62">{activeStory.authorHandle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeStory.authorId && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSaveToMoments?.(activeStory)
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white"
                  aria-label="Save to Moments"
                >
                  <BookmarkPlus className="h-5 w-5" />
                </button>
              )}
              {activeStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMuted((previous) => !previous)
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white"
                  aria-label={muted ? 'Unmute story' : 'Mute story'}
                  aria-pressed={muted}
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onClose()
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white"
                aria-label="Close story viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {activeStory.mediaType === 'video' ? (
          <video
            key={activeStory.id}
            ref={videoRef}
            src={activeStory.mediaUrl}
            poster={activeStory.thumbnailUrl}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted={muted}
            onEnded={() => handleNavigate('next')}
            onTimeUpdate={(event) => {
              const node = event.currentTarget
              if (!Number.isFinite(node.duration) || node.duration <= 0) return
              setVideoProgress(Math.max(0, Math.min(1, node.currentTime / node.duration)))
            }}
          />
        ) : (
          <div className="relative h-full w-full">
            <Image
              src={activeStory.mediaUrl}
              alt={`${activeStory.authorName} story`}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42),transparent_24%,transparent_58%,rgba(0,0,0,0.62))]" />

        {activeStory.caption && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <p className="max-w-[82%] text-sm leading-6 text-white/88">{activeStory.caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}
