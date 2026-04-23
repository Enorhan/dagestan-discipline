import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'

export type BjjBottomTab = 'sessions' | 'social' | 'techniques' | 'you'
export type BjjSessionsTab = 'my-sessions'
export type BjjTechniquesTab = 'my-library' | 'systems' | 'discover'
export type BjjSocialSurface = MartialArtsBranchId
export type BjjSocialHomeRail = 'for_you' | 'following'
export type BjjSurface =
  | 'notifications'
  | 'social-insights'
  | 'paywall'
  | 'edit-profile'
  | 'new-session'
  | 'session-detail'
  | 'new-technique'
  | 'new-discover-technique'
  | 'new-technique-tags'
  | 'new-technique-linked'
  | 'system-editor'
  | 'system-reader'
  | 'public-profile'
  | 'techniques-filter-category'
  | 'technique-detail'
  | 'discover-detail'
  | 'comments'
  | 'social-post-viewer'

export type BjjAuthMode = 'sign-up' | 'sign-in'
export type BeltRank = 'white' | 'blue' | 'purple' | 'brown' | 'black'
export type BjjPrivacy = 'public' | 'private'
export type BjjTechniqueCategory =
  | 'submission'
  | 'sweep'
  | 'escape'
  | 'guard-pass'
  | 'takedown'
  | 'transition'
  | 'strike'
  | 'defense'
  | 'footwork'
  | 'clinch'
  | 'kick'
  | 'counter'
export type BjjSessionType =
  | 'Gi'
  | 'No-Gi'
  | 'Open Mat'
  | 'Wrestling'
  | 'Competition'
  | 'Grappling'
  | 'Boxing'
  | 'MMA'
  | 'Muay Thai'
  | 'Judo'
  | 'Taekwondo'
  | 'Sparring'
  | 'Pad Work'
  | 'Bag Work'
  | 'Drilling'
  | 'Technique'
export type BjjSessionVisibility = 'everyone' | 'friends' | 'private'
export type BjjOnboardingStep =
  | 'welcome'
  | 'mission'
  | 'name'
  | 'discipline'
  | 'experience'
  | 'content'
  | 'pain-points'
  | 'attribution'
  | 'setup'
  | 'ready'
export type BjjPaywallStep = 'founder' | 'pro' | 'trial' | 'pricing'
export type BjjAnalyticsWindow = 'this-month' | 'all-time'

export interface BjjProfile {
  displayName: string
  username: string
  avatarUrl?: string
  belt: BeltRank
  stripes: number
  gymName: string
  bio: string
  privacy: BjjPrivacy
  xp: number
  level: number
  flowStreak: number
  trainingStreak: number
  primaryDiscipline?: string
  experienceLevel?: string
  favoriteContentTypes: string[]
  biggestChallenges: string[]
  heardFrom?: string
  onboardingCompleted: boolean
  paywallCompleted: boolean
  coachMarksSeen: boolean
  proUnlocked: boolean
}

export interface BjjTechnique {
  id: string
  catalogTechniqueId?: string
  /** Set when this Discover row was created by a user (community contribution). */
  createdBy?: string
  branch: MartialArtsBranchId
  title: string
  category: BjjTechniqueCategory
  tags: string[]
  notes: string
  description: string
  tutorialTitle: string
  tutorialThumbnail?: string
  media: string[]
  links: string[]
  linkedTechniqueIds: string[]
  createdAt: string
  updatedAt: string
  ownership: 'library' | 'discover'
  /** True when the authenticated viewer has already forked this community technique into their library. */
  viewerHasForked?: boolean
}

export interface BjjSystem {
  id: string
  branch: MartialArtsBranchId
  title: string
  summary: string
  nodes: Array<{
    id: string
    label: string
    color: string
    /** Normalized graph coordinates (0–1) when set. */
    layout?: { x: number; y: number } | null
    /** Library technique IDs attached to this step (owner). */
    linkedTechniqueIds?: string[]
    /** Snapshot titles for public viewers (non-owners); prefer over resolving IDs. */
    linkedTechniqueTitles?: string[]
  }>
  edges: Array<{
    from: string
    to: string
    /** Short transition note (optional). */
    label?: string | null
  }>
  locked?: boolean
  /** Set when this row is a user-owned system (null/undefined = curated catalog). */
  userId?: string | null
  visibility?: BjjPrivacy
  sortOrder?: number
  /** ISO timestamp from `systems.updated_at` (user-owned rows); used for edit conflict checks. */
  updatedAt?: string
  /** True when the authenticated viewer has already forked this public system into their library. */
  viewerHasForked?: boolean
}

export interface BjjSession {
  id: string
  branch: MartialArtsBranchId
  date: string
  time: string
  location: string
  type: BjjSessionType
  submissions: string[]
  taps: string[]
  durationMinutes: number
  notes: string
  satisfaction: number
  taggedFriends: string[]
  visibility: BjjSessionVisibility
  caption: string
  linkedTechniqueIds: string[]
  photo?: string
  createdAt: string
}

export interface BjjSuggestedGrappler {
  id: string
  name: string
  handle: string
  accent: string
  branch: MartialArtsBranchId
  branchLabel: string
  avatarUrl?: string
  followerCount?: number
  followingCount?: number
  viewerFollows?: boolean
  viewerRequested?: boolean
}

export interface BjjFeedPost {
  id: string
  authorId?: string
  authorName: string
  authorHandle: string
  authorAvatarUrl?: string
  title: string
  summary: string
  submissions: number
  durationLabel: string
  imageLabel: string
  imageUrl?: string
  mediaType?: 'image' | 'video'
  playbackUrl?: string
  createdAt?: string
  createdAtLabel: string
  likes: number
  comments: number
  saves: number
  likedByViewer: boolean
  savedByViewer: boolean
  accent: string
  source: 'session' | 'social'
  sessionId?: string
}

export interface BjjFeedComment {
  id: string
  sessionId: string
  authorName: string
  authorHandle: string
  body: string
  parentCommentId?: string
  mentions?: string[]
  hashtags?: string[]
  createdAt: string
  createdAtLabel: string
}

export interface BjjNotification {
  id: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

export interface BjjChallenge {
  id: string
  title: string
  summary: string
  progress: number
  goal: number
  xpReward: number
  difficulty: 'beginner' | 'intermediate'
}

export interface BjjAchievement {
  id: string
  title: string
  summary: string
  progress: number
  goal: number
}

export interface BjjChecklistItem {
  id: string
  title: string
  summary: string
  completed: boolean
}

export interface BjjLeaderboardEntry {
  id: string
  name: string
  handle: string
  score: number
}

export interface BjjPersistedState {
  profile: BjjProfile
  selectedBottomTab: BjjBottomTab
  selectedSessionsTab: BjjSessionsTab
  selectedTechniquesTab: BjjTechniquesTab
  socialSurface: BjjSocialSurface
  socialHomeRail: BjjSocialHomeRail
  selectedTechniqueBranch: MartialArtsBranchId
  selectedSystemBranch: MartialArtsBranchId
  librarySort: 'new' | 'a-z'
  activeCategoryFilter: BjjTechniqueCategory | 'all'
  searchQuery: string
  customTags: string[]
  libraryTechniques: BjjTechnique[]
  discoverAddedTechniqueIds: string[]
  sessions: BjjSession[]
  followedGrapplerIds: string[]
  likedPostIds: string[]
  notifications: BjjNotification[]
  /** Systems tab: filter list */
  systemsHubFilter: 'all' | 'mine' | 'curated' | 'community'
  /** Systems tab: search query (titles) */
  systemsHubSearch: string
  /** Pinned system ids (shown first); user-owned and catalog ids */
  pinnedSystemIds: string[]
}
