export type SocialPostKind = 'moment' | 'reel'
export type SocialPostVisibility = 'public' | 'followers' | 'private'
export type SocialMediaType = 'image' | 'video'
export type SocialVideoProvider = 'mux' | 'cloudflare_stream'
export type SocialUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'scheduled' | 'failed'
export type SocialPublishTarget = 'post' | 'reel' | 'story'
export type SocialProfileTab = 'posts' | 'reels' | 'saved'
export type SocialCreativeMode = SocialPublishTarget
export type SocialCreativeRenderStatus = 'idle' | 'processing' | 'ready' | 'failed'
export type SocialCreativeFilterId = 'none' | 'vivid' | 'mono' | 'warm' | 'cool' | 'dramatic'
export type SocialCreativeAspectPreset = '9:16' | '4:5' | '1:1'
export type SocialTextOverlayAlign = 'left' | 'center' | 'right'
export type SocialTextOverlayBackground = 'none' | 'pill'
export type SocialTextOverlayFontPreset = 'classic' | 'modern' | 'headline'
export type SocialPlaybackMilestone =
  | 'impression'
  | 'watch_start'
  | 'view_2s'
  | 'quartile_25'
  | 'quartile_50'
  | 'quartile_75'
  | 'completion'
  | 'skip'
  | 'replay'

export interface SocialTextOverlay {
  id: string
  text: string
  x: number
  y: number
  scale: number
  rotationDeg: number
  color: string
  align: SocialTextOverlayAlign
  background: SocialTextOverlayBackground
  fontPreset: SocialTextOverlayFontPreset
}

export interface SocialFilterSelection {
  id: SocialCreativeFilterId
  intensity: number
}

export interface SocialCropSelection {
  aspectPreset: SocialCreativeAspectPreset
  scale: number
  offsetX: number
  offsetY: number
}

export interface SocialMusicSelection {
  trackId: string
  title: string
  artist: string
  previewUrl: string
  artworkUrl?: string
  startMs: number
  durationMs: number
  volume: number
}

export interface SocialCreativeEdit {
  mode: SocialCreativeMode
  filter: SocialFilterSelection
  crop: SocialCropSelection
  textOverlays: SocialTextOverlay[]
  music?: SocialMusicSelection | null
}

export interface SocialMusicTrack {
  id: string
  slug: string
  title: string
  artist: string
  previewUrl: string
  artworkUrl?: string
  durationMs: number
}

export interface SocialFeedPost {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorAvatarUrl?: string
  caption: string
  mediaType: SocialMediaType
  mediaUrl?: string
  thumbnailUrl?: string
  playbackUrl?: string
  playbackId?: string
  processingStatus?: 'pending' | 'processing' | 'ready' | 'failed'
  durationMs?: number
  aspectRatio?: number
  visibility: SocialPostVisibility
  postKind: SocialPostKind
  allowComments?: boolean
  createdAt: string
  likes: number
  comments: number
  saves: number
  viewerLiked: boolean
  viewerSaved: boolean
  rankScore: number
  creativeEdit?: SocialCreativeEdit
  renderStatus?: SocialCreativeRenderStatus
  renderError?: string
}

export interface SocialStory {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorAvatarUrl?: string
  mediaType: SocialMediaType
  mediaUrl: string
  thumbnailUrl?: string
  caption?: string
  visibility: SocialPostVisibility
  createdAt: string
  expiresAt: string
  viewerSeen: boolean
  durationMs?: number
  creativeEdit?: SocialCreativeEdit
  renderStatus?: SocialCreativeRenderStatus
  renderError?: string
}

export interface SocialProfileOverview {
  userId: string
  displayName: string
  username: string
  avatarUrl?: string
  bio: string
  primaryDiscipline?: string
  followerCount: number
  followingCount: number
  postCount: number
  reelCount: number
  savedCount: number
  isSelf: boolean
  viewerFollows: boolean
  viewerRequested: boolean
}

export interface SocialCursorPage<T> {
  items: T[]
  nextCursor: string | null
}

export interface CreateSocialPostInput {
  caption: string
  postKind: SocialPostKind
  visibility: SocialPostVisibility
  mediaType: SocialMediaType
  mediaUrl?: string
  thumbnailUrl?: string
  playbackId?: string
  playbackUrl?: string
  videoAssetId?: string
  videoProvider?: SocialVideoProvider
  durationMs?: number
  aspectRatio?: number
  coverTimestampMs?: number
  trimStartMs?: number
  trimEndMs?: number
  scheduledFor?: string | null
  draftId?: string
  sessionId?: string
  creativeEdit?: SocialCreativeEdit | null
  renderStatus?: SocialCreativeRenderStatus
  renderError?: string | null
  allowComments?: boolean
}

export interface CreateSocialPostResult {
  post: SocialFeedPost | null
  scheduled: boolean
}

export interface SocialComment {
  id: string
  postId: string
  userId: string
  authorName: string
  authorHandle: string
  body: string
  parentCommentId?: string
  mentions: string[]
  hashtags: string[]
  createdAt: string
}

export interface FollowRequestRecord {
  id: string
  requesterUserId: string
  targetUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  respondedAt?: string | null
}

export interface SocialCreatorDraft {
  id: string
  publishTarget: SocialPublishTarget
  caption: string
  mediaType: SocialMediaType
  postKind: SocialPostKind
  visibility: SocialPostVisibility
  uploadUrl?: string
  sourceMediaUrl?: string
  sourceThumbnailUrl?: string
  sourceMediaType?: SocialMediaType
  thumbnailUrl?: string
  coverTimestampMs?: number
  videoAssetId?: string
  videoProvider?: SocialVideoProvider
  renderJobId?: string
  uploadStatus?: SocialUploadStatus
  uploadProgress?: number
  failedReason?: string
  durationMs?: number
  aspectRatio?: number
  trimStartMs?: number
  trimEndMs?: number
  scheduledFor?: string
  createdAt: string
  updatedAt: string
  creativeEdit?: SocialCreativeEdit
  renderStatus?: SocialCreativeRenderStatus
  renderError?: string
}

export interface SocialModerationQueueItem {
  id: string
  reportId: string
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed'
  priority: number
  reason: string
  details?: string
  evidenceUrls: string[]
  reportCreatedAt: string
  updatedAt: string
  targetUserId?: string
  targetPostId?: string
  reporterUserId: string
  targetAuthorName?: string
  targetAuthorHandle?: string
  postCaption?: string
  postMediaUrl?: string
}

export interface SocialTopicSummary {
  slug: string
  label: string
  postCount: number
}

export interface SocialFollowSuggestion {
  userId: string
  score: number
}

export interface SocialMomentSummary {
  id: string
  userId: string
  title: string
  coverThumbnailUrl?: string
  storyCount: number
  updatedAt: string
}

export interface SocialConnectionProfile {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
  followsViewer?: boolean
}
