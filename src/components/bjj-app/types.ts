import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import type {
  BjjPersistedState,
  BjjSessionType,
  BjjSessionVisibility,
  BjjTechniqueCategory,
} from '@/lib/bjj-types'
import type {
  SocialPostKind,
  SocialPostVisibility,
  SocialUploadStatus,
  SocialVideoProvider,
} from '@/lib/social-models'

export type SessionDraft = {
  branch: MartialArtsBranchId
  date: string
  time: string
  location: string
  type: BjjSessionType
  submissions: string
  taps: string
  durationMinutes: number
  notes: string
  satisfaction: number
  taggedFriends: string
  visibility: BjjSessionVisibility
  caption: string
  linkedTechniqueIds: string[]
}

export type TechniqueDraft = {
  title: string
  category: BjjTechniqueCategory
  tags: string
  notes: string
  description: string
  tutorialTitle: string
  links: string
  linkedTechniqueIds: string[]
}

export type DiscoverTechniqueDraft = {
  title: string
  category: BjjTechniqueCategory
  tags: string
  description: string
  tutorialTitle: string
  videoUrl: string
}

export type ProfileDraft = {
  displayName: string
  username: string
  belt: BjjPersistedState['profile']['belt']
  stripes: number
  gymName: string
  bio: string
  privacy: BjjPersistedState['profile']['privacy']
}

export type SocialComposerDraft = {
  id?: string
  caption: string
  mediaUrl: string
  thumbnailUrl: string
  postKind: SocialPostKind
  visibility: SocialPostVisibility
  scheduledFor: string
  coverTimestampMs: number
  trimStartMs: number
  trimEndMs: number
  durationMs?: number
  aspectRatio?: number
  uploadStatus: SocialUploadStatus
  uploadProgress: number
  failedReason?: string
  videoAssetId?: string
  videoProvider?: SocialVideoProvider
}

export type NativeInputLike = Event & {
  inputType?: string
  isComposing?: boolean
}

