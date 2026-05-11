import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'

export type BjjBottomTab = 'my-library' | 'systems' | 'discover'
export type BjjSessionsTab = 'my-sessions'
export type BjjTechniquesTab = 'my-library' | 'systems' | 'discover'
export type BjjSurface =
  | 'paywall'
  | 'edit-profile'
  | 'sessions'
  | 'profile'
  | 'new-session'
  | 'session-detail'
  | 'new-technique'
  | 'new-discover-technique'
  | 'new-technique-tags'
  | 'new-technique-linked'
  | 'system-editor'
  | 'system-reader'
  | 'techniques-filter-category'
  | 'technique-detail'
  | 'discover-detail'

export type BjjAuthMode = 'sign-up' | 'sign-in'
export type BeltRank = 'white' | 'blue' | 'purple' | 'brown' | 'black'
export type BjjPrivacy = 'public' | 'private'
export type BjjSystemStatus = 'draft' | 'active'
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
  | 'Competition'
  | 'Grappling'
  | 'Sparring'
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
  matflowTrialStartedAt?: string | null
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
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
    /** Study notes body for this step (<= 2000 chars). */
    details?: string | null
    /** When-condition that applies this step (<= 300 chars). */
    trigger?: string | null
    /** Frequent mistake to avoid (<= 500 chars). */
    commonMistake?: string | null
    /** Instructional source URL. */
    videoUrl?: string | null
    /** Optional deep-link offset into videoUrl. */
    videoTimestampSeconds?: number | null
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
  status?: BjjSystemStatus
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

export interface BjjPersistedState {
  profile: BjjProfile
  selectedBottomTab: BjjBottomTab
  selectedSessionsTab: BjjSessionsTab
  selectedTechniquesTab: BjjTechniquesTab
  selectedTechniqueBranch: MartialArtsBranchId
  selectedSystemBranch: MartialArtsBranchId
  librarySort: 'new' | 'a-z'
  activeCategoryFilter: BjjTechniqueCategory | 'all'
  searchQuery: string
  customTags: string[]
  libraryTechniques: BjjTechnique[]
  discoverAddedTechniqueIds: string[]
  sessions: BjjSession[]
  /** Systems tab: filter list */
  systemsHubFilter: 'all' | 'mine' | 'curated' | 'community'
  /** Systems tab: search query (titles) */
  systemsHubSearch: string
  /** Pinned system ids (shown first); user-owned and catalog ids */
  pinnedSystemIds: string[]
}
