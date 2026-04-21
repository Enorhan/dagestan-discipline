'use client'

import { ChevronLeft } from 'lucide-react'
import { SocialReelsPlayer } from '@/components/social-reels-player'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import type { SocialFeedPost } from '@/lib/social-models'

type SocialReelsViewerModalProps = {
  currentUserId: string
  initialPostId: string
  isFollowingAuthor?: (authorId: string) => boolean
  onClose: () => void
  onFollowAuthor: (authorId: string, authorName: string) => void
  onOpenComments: (postId: string) => void
  onOpenMore: (post: SocialFeedPost) => void
  onToggleLike: (post: SocialFeedPost) => void
  onToggleSave: (post: SocialFeedPost) => void
  posts: SocialFeedPost[]
}

export function SocialReelsViewerModal({
  currentUserId,
  initialPostId,
  isFollowingAuthor,
  onClose,
  onFollowAuthor,
  onOpenComments,
  onOpenMore,
  onToggleLike,
  onToggleSave,
  posts,
}: SocialReelsViewerModalProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  return (
    <div className="fixed inset-0 z-modal bg-black text-white">
      <div className="absolute left-3 top-[calc(env(safe-area-inset-top)+10px)] z-20">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>
      <SocialReelsPlayer
        currentUserId={currentUserId}
        initialPostId={initialPostId}
        isFollowingAuthor={isFollowingAuthor}
        onFollowAuthor={onFollowAuthor}
        onOpenComments={onOpenComments}
        onOpenMore={onOpenMore}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        posts={posts}
        surface="profile"
      />
    </div>
  )
}
