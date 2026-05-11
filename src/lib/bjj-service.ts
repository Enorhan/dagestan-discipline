import { logger } from '@/lib/logger'
import { captureException } from '@/lib/monitoring'
import { supabase } from '@/lib/supabase'
import { supabaseService } from '@/lib/supabase-service'
import type { UserProfile } from '@/lib/user-profile-types'
import { getMatFlowAccessState } from '@/lib/matflow-access'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import {
  normalizeMartialArtsBranchId,
} from '@/lib/martial-arts-branches'
import {
  createDefaultBjjState,
} from '@/lib/bjj-seed'
import type {
  BjjAchievement,
  BjjChallenge,
  BjjPersistedState,
  BjjPrivacy,
  BjjSession,
  BjjSessionType,
  BjjSessionVisibility,
  BjjSystem,
  BjjSystemStatus,
  BjjTechnique,
  BjjTechniqueCategory,
} from '@/lib/bjj-types'

const db = supabase as any

export interface SaveBjjTechniqueInput {
  id?: string
  catalogTechniqueId?: string
  branch?: MartialArtsBranchId
  title: string
  category: BjjTechniqueCategory
  tags: string[]
  notes: string
  description: string
  tutorialTitle: string
  media: string[]
  links: string[]
  linkedTechniqueIds: string[]
}

export interface SaveDiscoverTechniqueInput {
  branch?: MartialArtsBranchId
  title: string
  category: BjjTechniqueCategory
  tags: string[]
  description: string
  tutorialTitle: string
  media: string[]
  links: string[]
}

export interface SaveBjjSessionInput {
  clientId?: string
  branch?: MartialArtsBranchId
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
  photoUrl?: string
}

export interface UpdateBjjSessionInput {
  branch?: MartialArtsBranchId
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
  photoUrl?: string | null
}

export interface SaveUserSystemInput {
  id?: string
  /** Martial arts branch; must match linked library techniques. */
  branch?: MartialArtsBranchId
  title: string
  summary: string
  visibility: BjjPrivacy
  status?: BjjSystemStatus
  sortOrder?: number
  /** When set, `save_user_system` rejects if the row changed (unless null to force overwrite). */
  expectedUpdatedAt?: string | null
  nodes: Array<{
    id: string
    label: string
    color: string
    layout?: { x: number; y: number } | null
    linkedTechniqueIds?: string[]
    details?: string | null
    trigger?: string | null
    commonMistake?: string | null
    videoUrl?: string | null
    videoTimestampSeconds?: number | null
  }>
  edges: Array<{ from: string; to: string; label?: string | null }>
}

export type SaveUserSystemResult = {
  id: string
  updatedAt: string | null
  status: BjjSystemStatus
}

export interface BjjShellSnapshot {
  profilePatch: Partial<BjjPersistedState['profile']>
  libraryTechniques: BjjTechnique[]
  customTags: string[]
  discoverTechniques: BjjTechnique[]
  sessions: BjjSession[]
  systems: BjjSystem[]
  challenges: BjjChallenge[]
  achievements: BjjAchievement[]
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return String(error)
}

function isMissingSchemaError(error: unknown, observabilityContext?: string): boolean {
  const message = getErrorMessage(error)
  const missing = /does not exist|Could not find the table|Could not find a relationship|column .* does not exist|Could not find the '.+' column.+schema cache|function .+ does not exist|schema cache/i.test(
    message,
  )
  if (missing && observabilityContext && process.env.NODE_ENV === 'production') {
    captureException(
      'bjj-supabase-missing-schema',
      error instanceof Error ? error : new Error(message),
      { context: observabilityContext },
      'warning',
    )
  }
  return missing
}

function isPermissionDeniedError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return /permission denied|insufficient privilege|not allowed/i.test(message)
}

function createTextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 300) + 1)
}

function sanitizeArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

async function isPremiumUser(userId: string): Promise<boolean> {
  const { data, error } = await db
    .from('profiles')
    .select('is_premium, subscription_status, subscription_period_end')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error, 'profiles_premium_check')) return false
    throw new Error(error.message)
  }

  const profile = data as { is_premium?: boolean | null; subscription_status?: string | null; subscription_period_end?: string | null } | null
  const isPremium = Boolean(profile?.is_premium)
  const status = String(profile?.subscription_status ?? '')
  if (isPremium || status === 'active' || status === 'trialing') return true

  const periodEnd = String(profile?.subscription_period_end ?? '')
  if (periodEnd) {
    const parsed = Date.parse(periodEnd)
    if (Number.isFinite(parsed) && parsed > Date.now()) return true
  }

  return false
}

async function assertWithinFreeTechniqueLimit(userId: string, techniqueId: string): Promise<void> {
  const premium = await isPremiumUser(userId)
  if (premium) return

  const { data: existing, error: existingError } = await db
    .from('user_techniques')
    .select('id')
    .eq('user_id', userId)
    .eq('id', techniqueId)
    .maybeSingle()

  if (existingError) {
    if (isMissingSchemaError(existingError, 'user_techniques_limit_existing')) return
    throw new Error(existingError.message)
  }

  // Editing an existing technique should remain allowed.
  if ((existing as any)?.id) return

  const { count, error: countError } = await db
    .from('user_techniques')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    if (isMissingSchemaError(countError, 'user_techniques_limit_count')) return
    throw new Error(countError.message)
  }

  if ((count ?? 0) >= 20) {
    throw new Error('Free technique limit reached. Upgrade to Premium to add more techniques.')
  }
}

function toStartedAt(date: string, time: string): string {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : '12:00:00'
  return new Date(`${date}T${safeTime}`).toISOString()
}

function formatTimeLabel(value: string): string {
  try {
    return new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  } catch {
    return value.slice(11, 16)
  }
}

function isPremiumProfile(profile: UserProfile | null | undefined): boolean {
  return getMatFlowAccessState(profile).hasAccess
}

function buildProfilePatch(profile: UserProfile | null, cachedState: BjjPersistedState | null): Partial<BjjPersistedState['profile']> {
  const fallback = cachedState?.profile ?? createDefaultBjjState(profile?.displayName ?? 'Grappler', profile?.username ?? 'grappler').profile
  const xp = profile?.xp ?? fallback.xp
  const premiumUnlocked = isPremiumProfile(profile)

  // Completion flags are monotonic. Once any source has persisted `true`, keep it sticky
  // across cold starts so transient auth/profile hydration gaps cannot regress the UI.
  const onboardingCompleted = Boolean(profile?.onboardingCompleted || cachedState?.profile.onboardingCompleted || fallback.onboardingCompleted)
  const paywallCompleted = Boolean(premiumUnlocked || profile?.paywallCompleted || cachedState?.profile.paywallCompleted || fallback.paywallCompleted)
  const coachMarksSeen = Boolean(profile?.coachMarksSeen || cachedState?.profile.coachMarksSeen || fallback.coachMarksSeen)

  logger.debug('[bjj-service:buildProfilePatch]', {
    hasProfile: profile != null,
    profileCoachMarksSeen: profile?.coachMarksSeen,
    cachedCoachMarksSeen: cachedState?.profile.coachMarksSeen,
    fallbackCoachMarksSeen: fallback.coachMarksSeen,
    resultCoachMarksSeen: coachMarksSeen,
  })

  return {
    displayName: profile?.displayName ?? fallback.displayName,
    username: profile?.username ?? fallback.username,
    avatarUrl: profile?.avatarUrl ?? fallback.avatarUrl,
    belt: profile?.belt ?? fallback.belt,
    stripes: profile?.stripes ?? fallback.stripes,
    primaryDiscipline: profile?.primaryDiscipline ?? cachedState?.profile.primaryDiscipline ?? fallback.primaryDiscipline,
    experienceLevel: profile?.experienceLevel ?? cachedState?.profile.experienceLevel ?? fallback.experienceLevel,
    favoriteContentTypes: profile?.favoriteContentTypes ?? cachedState?.profile.favoriteContentTypes ?? fallback.favoriteContentTypes,
    gymName: profile?.gymName ?? fallback.gymName,
    bio: profile?.bio ?? fallback.bio,
    privacy: profile?.privacy ?? fallback.privacy,
    xp,
    level: profile?.level ?? computeLevel(xp),
    flowStreak: profile?.flowStreak ?? fallback.flowStreak,
    trainingStreak: profile?.trainingStreak ?? fallback.trainingStreak,
    biggestChallenges: profile?.biggestChallenges ?? cachedState?.profile.biggestChallenges ?? fallback.biggestChallenges,
    heardFrom: profile?.heardFrom ?? cachedState?.profile.heardFrom ?? fallback.heardFrom,
    onboardingCompleted,
    paywallCompleted,
    coachMarksSeen,
    proUnlocked: premiumUnlocked || fallback.proUnlocked,
    matflowTrialStartedAt: profile?.matflowTrialStartedAt ?? fallback.matflowTrialStartedAt ?? null,
    subscriptionStatus: profile?.subscriptionStatus ?? fallback.subscriptionStatus ?? null,
    subscriptionPeriodEnd: profile?.subscriptionPeriodEnd ?? fallback.subscriptionPeriodEnd ?? null,
  }
}

function mapDiscoverTechnique(row: any): BjjTechnique {
  return {
    id: row.id,
    catalogTechniqueId: row.id,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    branch: normalizeMartialArtsBranchId(row.branch) ?? 'bjj',
    title: row.title,
    category: row.category as BjjTechniqueCategory,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes ?? '',
    description: row.description ?? '',
    tutorialTitle: row.tutorial_title ?? row.title,
    tutorialThumbnail: row.tutorial_thumbnail ?? undefined,
    media: Array.isArray(row.media) ? row.media : [],
    links: Array.isArray(row.links) ? row.links : [],
    linkedTechniqueIds: Array.isArray(row.linked_technique_ids) ? row.linked_technique_ids : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    ownership: 'discover',
    viewerHasForked: row.viewer_has_forked == null ? undefined : Boolean(row.viewer_has_forked),
  }
}

function mapLibraryTechnique(row: any, tags: string[], linkedTechniqueIds: string[]): BjjTechnique {
  return {
    id: row.id,
    catalogTechniqueId: row.catalog_technique_id ?? undefined,
    branch: normalizeMartialArtsBranchId(row.branch) ?? 'bjj',
    title: row.title,
    category: row.category as BjjTechniqueCategory,
    tags,
    notes: row.notes ?? '',
    description: row.description ?? '',
    tutorialTitle: row.tutorial_title ?? row.title,
    tutorialThumbnail: row.tutorial_thumbnail ?? undefined,
    media: Array.isArray(row.media) ? row.media : [],
    links: Array.isArray(row.links) ? row.links : [],
    linkedTechniqueIds,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    ownership: 'library',
  }
}

function mapSession(row: any, linkedTechniqueIds: string[]): BjjSession {
  return {
    id: row.id,
    branch: normalizeMartialArtsBranchId(row.branch) ?? 'bjj',
    date: row.session_date,
    time: formatTimeLabel(row.started_at),
    location: row.location ?? '',
    type: (row.session_type ?? 'No-Gi') as BjjSessionType,
    submissions: Array.isArray(row.submission_names) ? row.submission_names : [],
    taps: Array.isArray(row.tap_names) ? row.tap_names : [],
    durationMinutes: typeof row.duration_minutes === 'number' ? row.duration_minutes : 90,
    notes: row.notes ?? '',
    satisfaction: typeof row.satisfaction === 'number' ? row.satisfaction : 3,
    taggedFriends: Array.isArray(row.tagged_friends) ? row.tagged_friends : [],
    visibility: (row.visibility ?? 'everyone') as BjjSessionVisibility,
    caption: row.caption ?? '',
    linkedTechniqueIds,
    photo: row.photo_url ?? undefined,
    createdAt: row.created_at ?? row.started_at ?? new Date().toISOString(),
  }
}

async function awardXp(userId: string, delta: number): Promise<void> {
  if (!delta) return
  const profile = await supabaseService.getProfile(userId)
  const nextXp = Math.max(0, (profile?.xp ?? 50) + delta)
  await db
    .from('profiles')
    .update({
      xp: nextXp,
      level: computeLevel(nextXp),
    })
    .eq('id', userId)
}

async function incrementStreaks(userId: string): Promise<void> {
  const { data } = await db
    .from('user_stats')
    .select('flow_streak, training_streak, workout_count')
    .eq('user_id', userId)
    .maybeSingle()

  const flowStreak = Math.max(1, Number(data?.flow_streak ?? 1) + 1)
  const trainingStreak = Math.max(1, Number(data?.training_streak ?? 0) + 1)
  const workoutCount = Math.max(1, Number(data?.workout_count ?? 0) + 1)

  await db
    .from('user_stats')
    .upsert(
      {
        user_id: userId,
        flow_streak: flowStreak,
        training_streak: trainingStreak,
        workout_count: workoutCount,
        last_workout_date: new Date().toISOString().slice(0, 10),
      },
      { onConflict: 'user_id' },
    )
}

async function replaceTechniqueRelations(userId: string, techniqueId: string, tags: string[], linkedTechniqueIds: string[]): Promise<void> {
  const normalizedTags = sanitizeArray(tags)
  const normalizedLinkedIds = sanitizeArray(linkedTechniqueIds).filter((value) => value !== techniqueId)

  const { error: deleteTagsError } = await db
    .from('technique_tags')
    .delete()
    .eq('user_id', userId)
    .eq('technique_id', techniqueId)

  if (deleteTagsError && !isMissingSchemaError(deleteTagsError)) {
    throw new Error(deleteTagsError.message)
  }

  if (normalizedTags.length > 0) {
    const { error: insertTagsError } = await db
      .from('technique_tags')
      .upsert(
        normalizedTags.map((tag) => ({
          user_id: userId,
          technique_id: techniqueId,
          tag,
        })),
        { onConflict: 'user_id,technique_id,tag', ignoreDuplicates: true },
      )

    if (insertTagsError && !isMissingSchemaError(insertTagsError)) {
      throw new Error(insertTagsError.message)
    }
  }

  const { error: deleteLinksError } = await db
    .from('technique_links')
    .delete()
    .eq('user_id', userId)
    .eq('from_technique_id', techniqueId)

  if (deleteLinksError && !isMissingSchemaError(deleteLinksError)) {
    throw new Error(deleteLinksError.message)
  }

  if (normalizedLinkedIds.length > 0) {
    const { error: insertLinksError } = await db
      .from('technique_links')
      .upsert(
        normalizedLinkedIds.map((linkedId) => ({
          user_id: userId,
          from_technique_id: techniqueId,
          to_technique_id: linkedId,
        })),
        { onConflict: 'user_id,from_technique_id,to_technique_id', ignoreDuplicates: true },
      )

    if (insertLinksError && !isMissingSchemaError(insertLinksError)) {
      throw new Error(insertLinksError.message)
    }
  }
}

async function getChallengeRows(userId: string): Promise<any[]> {
  const { data, error } = await db
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    if (isMissingSchemaError(error, 'challenge_progress')) return []
    throw new Error(error.message)
  }

  return data ?? []
}

async function getAchievementRows(userId: string): Promise<any[]> {
  const { data, error } = await db
    .from('achievement_progress')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    if (isMissingSchemaError(error, 'achievement_progress')) return []
    throw new Error(error.message)
  }

  return data ?? []
}

async function listChallengeDefinitions(): Promise<BjjChallenge[]> {
  const { data, error } = await db
    .from('challenge_definitions')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    if (isMissingSchemaError(error, 'challenge_definitions')) return []
    throw new Error(error.message)
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    progress: 0,
    goal: Number(row.goal ?? 0),
    xpReward: Number(row.xp_reward ?? 0),
    difficulty: row.difficulty === 'intermediate' ? 'intermediate' : 'beginner',
  }))
}

async function listAchievementDefinitions(): Promise<BjjAchievement[]> {
  const { data, error } = await db
    .from('achievement_definitions')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    if (isMissingSchemaError(error, 'achievement_definitions')) return []
    throw new Error(error.message)
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    progress: 0,
    goal: Number(row.goal ?? 0),
  }))
}

async function syncProgressSignals(userId: string): Promise<void> {
  const [
    { count: sessionCount, error: sessionError },
    { count: techniqueCount, error: techniqueError },
    { count: linkCount, error: linkError },
    existingChallenges,
    existingAchievements,
    challengeDefinitionsList,
    achievementDefinitionsList,
  ] = await Promise.all([
    db.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('user_techniques').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('technique_links').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    getChallengeRows(userId),
    getAchievementRows(userId),
    listChallengeDefinitions(),
    listAchievementDefinitions(),
  ])

  for (const error of [sessionError, techniqueError, linkError]) {
    if (error && !isMissingSchemaError(error)) {
      throw new Error(error.message)
    }
  }

  const challengeDefinitions = new Map(challengeDefinitionsList.map((challenge) => [challenge.id, challenge]))
  const achievementDefinitions = new Map(achievementDefinitionsList.map((achievement) => [achievement.id, achievement]))

  const challengeProgress = [
    {
      challenge_id: 'challenge-warrior',
      progress: sessionCount ?? 0,
    },
    {
      challenge_id: 'challenge-collector',
      progress: techniqueCount ?? 0,
    },
  ]

  const challengeCompletionById = new Map(existingChallenges.map((row) => [row.challenge_id, row.completed_at]))

  const achievementProgress = [
    {
      achievement_id: 'ach-first-session',
      progress: sessionCount ?? 0,
    },
    {
      achievement_id: 'ach-technique-web',
      progress: linkCount ?? 0,
    },
  ]

  const achievementCompletionById = new Map(existingAchievements.map((row) => [row.achievement_id, row.unlocked_at]))

  const nextChallengeRows = challengeProgress.map((entry) => {
    const definition = challengeDefinitions.get(entry.challenge_id)
    const completed = entry.progress >= (definition?.goal ?? 0)
    return {
      user_id: userId,
      challenge_id: entry.challenge_id,
      progress: entry.progress,
      goal: definition?.goal ?? 0,
      completed_at: completed ? challengeCompletionById.get(entry.challenge_id) ?? new Date().toISOString() : null,
    }
  })

  const nextAchievementRows = achievementProgress.map((entry) => {
    const definition = achievementDefinitions.get(entry.achievement_id)
    const unlocked = entry.progress >= (definition?.goal ?? 0)
    return {
      user_id: userId,
      achievement_id: entry.achievement_id,
      progress: entry.progress,
      goal: definition?.goal ?? 0,
      unlocked_at: unlocked ? achievementCompletionById.get(entry.achievement_id) ?? new Date().toISOString() : null,
    }
  })

  const { error: challengeUpsertError } = await db
    .from('challenge_progress')
    .upsert(nextChallengeRows, { onConflict: 'user_id,challenge_id' })

  if (challengeUpsertError && !isMissingSchemaError(challengeUpsertError)) {
    throw new Error(challengeUpsertError.message)
  }

  const { error: achievementUpsertError } = await db
    .from('achievement_progress')
    .upsert(nextAchievementRows, { onConflict: 'user_id,achievement_id' })

  if (achievementUpsertError && !isMissingSchemaError(achievementUpsertError)) {
    throw new Error(achievementUpsertError.message)
  }

  for (const row of nextChallengeRows) {
    if (row.completed_at && !challengeCompletionById.get(row.challenge_id)) {
      const definition = challengeDefinitions.get(row.challenge_id)
      if (definition) {
        await awardXp(userId, definition.xpReward)
      }
    }
  }
}

async function listLibraryTechniques(userId: string): Promise<BjjTechnique[]> {
  const [{ data: techniques, error }, { data: tags }, { data: links }] = await Promise.all([
    db.from('user_techniques').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    db.from('technique_tags').select('technique_id, tag').eq('user_id', userId),
    db.from('technique_links').select('from_technique_id, to_technique_id').eq('user_id', userId),
  ])

  if (error) {
    if (isMissingSchemaError(error, 'user_techniques')) return []
    throw new Error(error.message)
  }

  const tagsByTechnique = new Map<string, string[]>()
  for (const row of tags ?? []) {
    const list = tagsByTechnique.get(row.technique_id) ?? []
    list.push(row.tag)
    tagsByTechnique.set(row.technique_id, list)
  }

  const linksByTechnique = new Map<string, string[]>()
  for (const row of links ?? []) {
    const list = linksByTechnique.get(row.from_technique_id) ?? []
    list.push(row.to_technique_id)
    linksByTechnique.set(row.from_technique_id, list)
  }

  return (techniques ?? []).map((row: any) => mapLibraryTechnique(
    row,
    sanitizeArray(tagsByTechnique.get(row.id) ?? []),
    sanitizeArray(linksByTechnique.get(row.id) ?? []),
  ))
}

async function listDiscoverTechniques(): Promise<BjjTechnique[]> {
  const { data, error } = await db
    .from('techniques')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingSchemaError(error, 'techniques_catalog')) return []
    throw new Error(error.message)
  }

  return (data ?? []).map((row: any) => mapDiscoverTechnique(row))
}

async function listSessions(userId: string): Promise<BjjSession[]> {
  const { data: sessions, error } = await db
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('started_at', { ascending: false })

  if (error) {
    if (isMissingSchemaError(error, 'training_sessions_list')) return []
    throw new Error(error.message)
  }

  const sessionIds = (sessions ?? []).map((session: any) => session.id)
  if (sessionIds.length === 0) return []

  const { data: links, error: linksError } = await db
    .from('training_session_techniques')
    .select('training_session_id, technique_id')
    .in('training_session_id', sessionIds)

  if (linksError) {
    if (isMissingSchemaError(linksError, 'training_session_techniques')) {
      return (sessions ?? []).map((row: any) => mapSession(row, []))
    }
    throw new Error(linksError.message)
  }

  const linkedTechniqueIdsBySession = new Map<string, string[]>()
  for (const row of links ?? []) {
    const list = linkedTechniqueIdsBySession.get(row.training_session_id) ?? []
    list.push(row.technique_id)
    linkedTechniqueIdsBySession.set(row.training_session_id, list)
  }

  return (sessions ?? []).map((row: any) => mapSession(row, linkedTechniqueIdsBySession.get(row.id) ?? []))
}

const MAX_USER_SYSTEM_NODES = 24
const MAX_USER_SYSTEM_EDGES = 48
const MAX_TECHNIQUES_PER_SYSTEM_NODE = 16
const MAX_EDGE_LABEL_LENGTH = 200

function normalizeSystemStatus(raw: unknown): BjjSystemStatus {
  return raw === 'draft' ? 'draft' : 'active'
}

function buildTechniquesByNodeMap(nodeTechniques: any[] | null | undefined) {
  const techniquesByNode = new Map<string, Array<{ techniqueId: string; snapshot: string | null }>>()
  for (const row of nodeTechniques ?? []) {
    const nodeId = (row as any).node_id as string
    const techniqueId = (row as any).technique_id as string
    if (!nodeId || !techniqueId) continue
    const snapshot = (row as any).technique_title_snapshot as string | null | undefined
    const bucket = techniquesByNode.get(nodeId) ?? []
    bucket.push({ techniqueId, snapshot: typeof snapshot === 'string' ? snapshot : null })
    techniquesByNode.set(nodeId, bucket)
  }
  return techniquesByNode
}

function buildBjjSystemsFromRows(
  systems: any[],
  nodes: any[] | null | undefined,
  edges: any[] | null | undefined,
  access: any[] | null | undefined,
  nodeTechniques: any[] | null | undefined,
  userId: string,
  premiumUnlocked: boolean,
): BjjSystem[] {
  const techniquesByNode = buildTechniquesByNodeMap(nodeTechniques)
  const unlockedBySystem = new Map<string, boolean>(
    (access ?? []).map((row: any) => [row.system_id as string, Boolean(row.unlocked)]),
  )

  return (systems ?? []).map((system: any) => {
    const ownerId = system.user_id as string | null | undefined
    const isCatalog = !ownerId
    const viewerIsOwner = ownerId === userId
    const isPublicUserSystem = Boolean(ownerId && (system.visibility as string) === 'public')

    return {
      id: system.id as string,
      branch: normalizeMartialArtsBranchId(system.branch) ?? 'bjj',
      title: system.title as string,
      summary: system.summary as string,
      userId: ownerId ?? null,
      visibility: (system.visibility as BjjPrivacy | undefined) ?? 'private',
      status: normalizeSystemStatus(system.status),
      sortOrder: typeof system.sort_order === 'number' ? system.sort_order : 0,
      updatedAt:
        typeof system.updated_at === 'string' && system.updated_at
          ? system.updated_at
          : typeof system.created_at === 'string' && system.created_at
            ? system.created_at
            : undefined,
      locked: Boolean(system.locked) && isCatalog && !premiumUnlocked && !unlockedBySystem.get(system.id),
      nodes: (nodes ?? [])
        .filter((node: any) => node.system_id === system.id)
        .sort((left: any, right: any) => left.sort_order - right.sort_order)
        .map((node: any) => {
          const layoutX = node.layout_x
          const layoutY = node.layout_y
          const hasLayout = typeof layoutX === 'number' && typeof layoutY === 'number' && Number.isFinite(layoutX) && Number.isFinite(layoutY)
          const techRows = techniquesByNode.get(node.id as string) ?? []
          let linkedTechniqueIds: string[] | undefined
          let linkedTechniqueTitles: string[] | undefined
          if (viewerIsOwner) {
            linkedTechniqueIds = techRows.map((entry) => entry.techniqueId)
          } else if (isPublicUserSystem && techRows.length > 0) {
            const titles = techRows
              .map((entry) => entry.snapshot)
              .filter((title): title is string => Boolean(title && String(title).trim()))
            linkedTechniqueIds = []
            if (titles.length > 0) linkedTechniqueTitles = titles
          } else {
            linkedTechniqueIds = []
          }
          return {
            id: node.id,
            label: node.label,
            color: node.color,
            layout: hasLayout ? { x: layoutX as number, y: layoutY as number } : null,
            linkedTechniqueIds,
            linkedTechniqueTitles,
            details: typeof node.details === 'string' && node.details.trim() ? node.details : null,
            trigger: typeof node.trigger === 'string' && node.trigger.trim() ? node.trigger : null,
            commonMistake:
              typeof node.common_mistake === 'string' && node.common_mistake.trim() ? node.common_mistake : null,
            videoUrl: typeof node.video_url === 'string' && node.video_url.trim() ? node.video_url : null,
            videoTimestampSeconds:
              typeof node.video_timestamp_seconds === 'number' && Number.isFinite(node.video_timestamp_seconds)
                ? node.video_timestamp_seconds
                : null,
          }
        }),
      edges: (edges ?? [])
        .filter((edge: any) => edge.system_id === system.id)
        .map((edge: any) => {
          const raw = edge.label
          const label =
            typeof raw === 'string' && raw.trim()
              ? raw.length > MAX_EDGE_LABEL_LENGTH
                ? raw.slice(0, MAX_EDGE_LABEL_LENGTH)
                : raw.trim()
              : null
          return {
            from: edge.from_node_id,
            to: edge.to_node_id,
            label: label ?? undefined,
          }
        }),
    }
  })
}

function mapPublicSystemRpcRow(row: any, ownerId: string): BjjSystem {
  const nodes = Array.isArray(row.nodes) ? row.nodes : []
  const edges = Array.isArray(row.edges) ? row.edges : []
  return {
    id: String(row.system_id ?? row.id),
    branch: normalizeMartialArtsBranchId(row.branch) ?? 'bjj',
    title: String(row.title ?? 'System'),
    summary: String(row.summary ?? ''),
    userId: ownerId,
    visibility: 'public',
    status: 'active',
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    locked: false,
    nodes: nodes.map((node: any) => {
      const layout = node?.layout
      const hasLayout =
        layout &&
        typeof layout.x === 'number' &&
        typeof layout.y === 'number' &&
        Number.isFinite(layout.x) &&
        Number.isFinite(layout.y)
      const titles = Array.isArray(node?.linkedTechniqueTitles)
        ? node.linkedTechniqueTitles.map((title: unknown) => String(title)).filter(Boolean)
        : []
      const nTimestamp = typeof node?.videoTimestampSeconds === 'number' ? node.videoTimestampSeconds : null
      return {
        id: String(node?.id ?? ''),
        label: String(node?.label ?? 'Step'),
        color: String(node?.color ?? '#4c6fff'),
        layout: hasLayout ? { x: layout.x, y: layout.y } : null,
        linkedTechniqueIds: [],
        linkedTechniqueTitles: titles,
        details: typeof node?.details === 'string' && node.details.trim() ? node.details : null,
        trigger: typeof node?.trigger === 'string' && node.trigger.trim() ? node.trigger : null,
        commonMistake:
          typeof node?.commonMistake === 'string' && node.commonMistake.trim() ? node.commonMistake : null,
        videoUrl: typeof node?.videoUrl === 'string' && node.videoUrl.trim() ? node.videoUrl : null,
        videoTimestampSeconds: nTimestamp != null && Number.isFinite(nTimestamp) ? nTimestamp : null,
      }
    }),
    edges: edges.map((edge: any) => ({
      from: String(edge?.from ?? ''),
      to: String(edge?.to ?? ''),
      label: typeof edge?.label === 'string' && edge.label.trim() ? edge.label.trim() : undefined,
    })),
    viewerHasForked: row.viewer_has_forked == null ? undefined : Boolean(row.viewer_has_forked),
  }
}

async function listSystems(userId: string, premiumUnlocked: boolean): Promise<BjjSystem[]> {
  const [
    { data: systems, error },
    { data: nodes, error: nodesError },
    { data: edges, error: edgesError },
    { data: access },
    { data: nodeTechniques, error: nodeTechniquesError },
  ] = await Promise.all([
    db.from('systems').select('*').order('sort_order', { ascending: true }),
    db.from('system_nodes').select('*').order('sort_order', { ascending: true }),
    db.from('system_edges').select('*'),
    db.from('user_system_access').select('*').eq('user_id', userId),
    db.from('system_node_techniques').select('*'),
  ])

  if (error) {
    if (isMissingSchemaError(error, 'systems')) return []
    throw new Error(error.message)
  }

  if (nodesError && !isMissingSchemaError(nodesError, 'system_nodes')) {
    throw new Error(nodesError.message)
  }
  if (edgesError && !isMissingSchemaError(edgesError, 'system_edges')) {
    throw new Error(edgesError.message)
  }
  if (nodeTechniquesError && !isMissingSchemaError(nodeTechniquesError, 'system_node_techniques')) {
    throw new Error(nodeTechniquesError.message)
  }

  const mapped = buildBjjSystemsFromRows(systems ?? [], nodes, edges, access, nodeTechniques, userId, premiumUnlocked)

  const rank = (system: BjjSystem) => {
    if (system.userId === userId) return 0
    if (!system.userId) return 1
    return 2
  }

  return mapped.sort((left: BjjSystem, right: BjjSystem) => {
    const rankDelta = rank(left) - rank(right)
    if (rankDelta !== 0) return rankDelta
    const orderDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
    if (orderDelta !== 0) return orderDelta
    return left.title.localeCompare(right.title)
  })
}

async function getSystemByIdForViewer(userId: string, systemId: string, premiumUnlocked: boolean): Promise<BjjSystem | null> {
  const { data: system, error } = await db.from('systems').select('*').eq('id', systemId).maybeSingle()
  if (error) {
    if (isMissingSchemaError(error, 'systems')) return null
    throw new Error(error.message)
  }
  if (!system) return null

  const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }] = await Promise.all([
    db.from('system_nodes').select('*').eq('system_id', systemId).order('sort_order', { ascending: true }),
    db.from('system_edges').select('*').eq('system_id', systemId),
  ])

  if (nodesError && !isMissingSchemaError(nodesError, 'system_nodes')) {
    throw new Error(nodesError.message)
  }
  if (edgesError && !isMissingSchemaError(edgesError, 'system_edges')) {
    throw new Error(edgesError.message)
  }

  const nodeList = nodes ?? []
  const nodeIds = nodeList.map((n: any) => n.id as string).filter(Boolean)

  let nodeTechniques: any[] = []
  if (nodeIds.length > 0) {
    const { data: nt, error: ntError } = await db.from('system_node_techniques').select('*').in('node_id', nodeIds)
    if (ntError && !isMissingSchemaError(ntError, 'system_node_techniques')) {
      throw new Error(ntError.message)
    }
    nodeTechniques = nt ?? []
  }

  const { data: access, error: accessError } = await db.from('user_system_access').select('*').eq('user_id', userId)
  if (accessError && !isMissingSchemaError(accessError, 'user_system_access')) {
    throw new Error(accessError.message)
  }

  const built = buildBjjSystemsFromRows([system], nodeList, edges ?? [], access ?? [], nodeTechniques, userId, premiumUnlocked)
  return built[0] ?? null
}

function sanitizeEdgeLabel(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.length > MAX_EDGE_LABEL_LENGTH ? trimmed.slice(0, MAX_EDGE_LABEL_LENGTH) : trimmed
}

async function assertUserOwnsTechniques(userId: string, techniqueIds: string[], branch?: MartialArtsBranchId): Promise<void> {
  const unique = [...new Set(techniqueIds.map((id) => id.trim()).filter(Boolean))]
  if (unique.length === 0) return
  let query = db.from('user_techniques').select('id').eq('user_id', userId).in('id', unique)
  if (branch) {
    query = query.eq('branch', branch)
  }
  const { data, error } = await query
  if (error) {
    if (isMissingSchemaError(error, 'user_techniques')) {
      throw new Error('Technique library is not available yet.')
    }
    throw new Error(error.message)
  }
  const found = new Set((data ?? []).map((row: any) => row.id as string))
  for (const id of unique) {
    if (!found.has(id)) {
      throw new Error(branch ? 'Each linked technique must be in your library for this martial art branch.' : 'Each linked technique must be in your library.')
    }
  }
}

function mapSaveUserSystemRpcError(message: string): string {
  if (/concurrent_save|P0001/i.test(message)) {
    return 'This system was updated elsewhere. Reload the latest version and try again.'
  }
  if (/technique_not_in_library_for_branch|technique_not_owned_for_system/i.test(message)) {
    return 'Each linked technique must be in your library for this martial art branch.'
  }
  if (/forbidden_system/i.test(message)) {
    return 'You do not have access to edit this system.'
  }
  if (/system_not_user_owned/i.test(message)) {
    return 'That system cannot link techniques.'
  }
  return message
}

async function persistUserSystem(userId: string, input: SaveUserSystemInput): Promise<SaveUserSystemResult> {
  const title = input.title.trim()
  const summary = input.summary.trim()
  if (!title) throw new Error('System title is required')
  if (input.nodes.length === 0) throw new Error('Add at least one step')
  if (input.nodes.length > MAX_USER_SYSTEM_NODES) {
    throw new Error(`Systems can include at most ${MAX_USER_SYSTEM_NODES} steps`)
  }

  const nodeIds = new Set(input.nodes.map((node) => node.id))
  if (nodeIds.size !== input.nodes.length) {
    throw new Error('Each step needs a unique id')
  }

  const edgeKeys = new Set<string>()
  const uniqueEdges = input.edges.filter((edge) => {
    const key = `${edge.from}->${edge.to}`
    if (edgeKeys.has(key)) return false
    edgeKeys.add(key)
    return true
  })

  if (uniqueEdges.length > MAX_USER_SYSTEM_EDGES) {
    throw new Error(`Systems can include at most ${MAX_USER_SYSTEM_EDGES} connections`)
  }

  for (const edge of uniqueEdges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error('Each connection must join two existing steps')
    }
    if (edge.from === edge.to) {
      throw new Error('A step cannot link to itself')
    }
  }

  const allLinkedTechniques: string[] = []
  for (const node of input.nodes) {
    const linked = node.linkedTechniqueIds ?? []
    if (linked.length > MAX_TECHNIQUES_PER_SYSTEM_NODE) {
      throw new Error(`Each step can link at most ${MAX_TECHNIQUES_PER_SYSTEM_NODE} techniques`)
    }
    allLinkedTechniques.push(...linked)
  }

  const systemId = input.id ?? null
  const sortOrder = typeof input.sortOrder === 'number' ? input.sortOrder : 5000
  const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
  const status: BjjSystemStatus = 'active'
  const visibility: BjjPrivacy = 'public'
  await assertUserOwnsTechniques(userId, allLinkedTechniques, branch)

  const pNodes = input.nodes.map((node, index) => {
    const layout = node.layout
    const hasLayout =
      layout &&
      Number.isFinite(layout.x) &&
      Number.isFinite(layout.y) &&
      layout.x >= 0 &&
      layout.x <= 1 &&
      layout.y >= 0 &&
      layout.y <= 1
    const clean = (value: string | null | undefined, max: number) => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      if (!trimmed) return null
      return trimmed.length > max ? trimmed.slice(0, max) : trimmed
    }
    const timestampRaw = node.videoTimestampSeconds
    const timestamp =
      typeof timestampRaw === 'number' && Number.isFinite(timestampRaw) && timestampRaw >= 0
        ? Math.min(Math.floor(timestampRaw), 100000)
        : null
    return {
      id: node.id,
      label: node.label.trim() || 'Step',
      color: node.color,
      sortOrder: index,
      layout: hasLayout ? { x: layout!.x, y: layout!.y } : null,
      linkedTechniqueIds: [...new Set((node.linkedTechniqueIds ?? []).map((id) => id.trim()).filter(Boolean))],
      details: clean(node.details, 2000),
      trigger: clean(node.trigger, 300),
      commonMistake: clean(node.commonMistake, 500),
      videoUrl: clean(node.videoUrl, 512),
      videoTimestampSeconds: timestamp,
    }
  })

  const pEdges = uniqueEdges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    label: sanitizeEdgeLabel(edge.label),
  }))

  const expectedRaw = input.expectedUpdatedAt
  const pExpected =
    typeof expectedRaw === 'string' && expectedRaw.trim().length > 0 ? expectedRaw.trim() : null

  const { data, error } = await db.rpc('save_user_system_graph', {
    p_input: {
      id: systemId,
      title,
      summary,
      visibility,
      status,
      branch,
      sortOrder,
      expectedUpdatedAt: pExpected,
      nodes: pNodes,
      edges: pEdges,
    },
  })

  if (error) {
    if (isMissingSchemaError(error, 'save_user_system_graph')) {
      throw new Error('Systems are not available on this project yet. Apply the latest database migration.')
    }
    throw new Error(mapSaveUserSystemRpcError(error.message))
  }

  await syncProgressSignals(userId)
  const row = data as { id?: unknown; updatedAt?: unknown; status?: unknown } | null
  return {
    id: typeof row?.id === 'string' && row.id ? row.id : (systemId ?? ''),
    updatedAt: typeof row?.updatedAt === 'string' ? row.updatedAt : null,
    status: normalizeSystemStatus(row?.status ?? status),
  }
}

async function removeUserSystem(userId: string, systemId: string): Promise<void> {
  const { error } = await db.from('systems').delete().eq('id', systemId).eq('user_id', userId)
  if (error) {
    if (isMissingSchemaError(error, 'systems_delete')) {
      throw new Error('Systems are not available on this project yet. Apply the latest database migration.')
    }
    throw new Error(error.message)
  }
  await syncProgressSignals(userId)
}



async function mapChallengeProgress(userId: string): Promise<BjjChallenge[]> {
  const [rows, definitions] = await Promise.all([
    getChallengeRows(userId),
    listChallengeDefinitions(),
  ])
  const byId = new Map(rows.map((row) => [row.challenge_id, row]))
  return definitions.map((challenge) => ({
    ...challenge,
    progress: Number(byId.get(challenge.id)?.progress ?? challenge.progress),
    goal: Number(byId.get(challenge.id)?.goal ?? challenge.goal),
  }))
}

async function mapAchievementProgress(userId: string): Promise<BjjAchievement[]> {
  const [rows, definitions] = await Promise.all([
    getAchievementRows(userId),
    listAchievementDefinitions(),
  ])
  const byId = new Map(rows.map((row) => [row.achievement_id, row]))
  return definitions.map((achievement) => ({
    ...achievement,
    progress: Number(byId.get(achievement.id)?.progress ?? achievement.progress),
    goal: Number(byId.get(achievement.id)?.goal ?? achievement.goal),
  }))
}

async function migrateLocalCache(user: UserProfile, cachedState: BjjPersistedState | null): Promise<void> {
  if (!cachedState) return

  try {
    await supabaseService.updateProfile(user.id, {
      displayName: cachedState.profile.displayName,
      username: cachedState.profile.username,
      avatarUrl: cachedState.profile.avatarUrl,
      belt: cachedState.profile.belt,
      stripes: cachedState.profile.stripes,
      gymName: cachedState.profile.gymName,
      bio: cachedState.profile.bio,
      privacy: cachedState.profile.privacy,
      xp: cachedState.profile.xp,
      level: cachedState.profile.level,
      flowStreak: cachedState.profile.flowStreak,
      trainingStreak: cachedState.profile.trainingStreak,
      biggestChallenges: cachedState.profile.biggestChallenges,
      heardFrom: cachedState.profile.heardFrom,
      // Completion flags are one-way state. Never push `false` from local cache because a
      // cold start default would overwrite the user's server truth and resurrect completed UI.
      ...(cachedState.profile.onboardingCompleted ? { onboardingCompleted: true } : {}),
      ...(cachedState.profile.paywallCompleted ? { paywallCompleted: true } : {}),
      ...(cachedState.profile.coachMarksSeen ? { coachMarksSeen: true } : {}),
    } as Partial<UserProfile>)
  } catch (error) {
    if (!isMissingSchemaError(error, 'migrate_local_profile_update')) {
      throw error
    }
  }

  for (const technique of cachedState.libraryTechniques) {
    const catalogTechniqueId = technique.catalogTechniqueId
      ?? cachedState.discoverAddedTechniqueIds.find((discoverId) => technique.id === `lib-${discoverId}`)

    await db
      .from('user_techniques')
      .upsert({
        id: technique.id,
        user_id: user.id,
        catalog_technique_id: catalogTechniqueId ?? null,
        branch: technique.branch,
        title: technique.title,
        category: technique.category,
        notes: technique.notes,
        description: technique.description,
        tutorial_title: technique.tutorialTitle,
        tutorial_thumbnail: technique.tutorialThumbnail ?? null,
        media: technique.media,
        links: technique.links,
        created_at: technique.createdAt,
        updated_at: technique.updatedAt,
      })

    await replaceTechniqueRelations(user.id, technique.id, technique.tags, technique.linkedTechniqueIds)
  }

  for (const session of cachedState.sessions) {
    const { data: row, error } = await db
      .from('training_sessions')
      .upsert({
        user_id: user.id,
        client_id: session.id,
        branch: session.branch,
        title: `${session.type} @ ${session.location || 'Training Room'}`,
        session_date: session.date,
        started_at: toStartedAt(session.date, session.time),
        source: 'manual',
        kind: 'mat',
        notes: session.notes,
        location: session.location,
        session_type: session.type,
        duration_minutes: session.durationMinutes,
        satisfaction: session.satisfaction,
        visibility: session.visibility,
        caption: session.caption,
        photo_url: session.photo ?? null,
        tagged_friends: session.taggedFriends,
        submission_names: session.submissions,
        tap_names: session.taps,
      }, { onConflict: 'user_id,client_id' })
      .select('id')
      .single()

    if (error) {
      if (isMissingSchemaError(error, 'migrate_local_training_sessions')) break
      throw new Error(error.message)
    }

    await db
      .from('training_session_techniques')
      .delete()
      .eq('training_session_id', row.id)

    if (session.linkedTechniqueIds.length > 0) {
      await db
        .from('training_session_techniques')
        .insert(session.linkedTechniqueIds.map((techniqueId) => ({
          training_session_id: row.id,
          technique_id: techniqueId,
        })))
    }
  }
}

export const bjjService = {
  async getShellSnapshot(user: UserProfile, cachedState: BjjPersistedState | null): Promise<BjjShellSnapshot> {
    try {
      await migrateLocalCache(user, cachedState)
      await syncProgressSignals(user.id)

      const profile = await supabaseService.getProfile(user.id)
      const premiumUnlocked = isPremiumProfile(profile ?? user)

      const [libraryTechniques, discoverTechniques, sessions, systems] = await Promise.all([
        listLibraryTechniques(user.id),
        listDiscoverTechniques(),
        listSessions(user.id),
        listSystems(user.id, premiumUnlocked),
      ])

      const [challenges, achievements] = await Promise.all([
        mapChallengeProgress(user.id),
        mapAchievementProgress(user.id),
      ])

      return {
        profilePatch: buildProfilePatch(profile ?? user, cachedState),
        libraryTechniques,
        customTags: sanitizeArray(libraryTechniques.flatMap((technique) => technique.tags)),
        discoverTechniques,
        sessions,
        systems,
        challenges,
        achievements,
      }
    } catch (error) {
      captureException('bjj-shell-snapshot', error, { step: 'hydrate' }, 'warning')
      throw error instanceof Error ? error : new Error(getErrorMessage(error))
    }
  },

  async saveTechnique(userId: string, input: SaveBjjTechniqueInput, xpDelta = 20): Promise<BjjTechnique> {
    const techniqueId = input.id ?? createTextId('lib-custom')
    const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
    await assertWithinFreeTechniqueLimit(userId, techniqueId)

    const { error } = await db
      .from('user_techniques')
      .upsert({
        id: techniqueId,
        user_id: userId,
        catalog_technique_id: input.catalogTechniqueId ?? null,
        branch,
        title: input.title,
        category: input.category,
        notes: input.notes,
        description: input.description,
        tutorial_title: input.tutorialTitle,
        tutorial_thumbnail: null,
        media: sanitizeArray(input.media),
        links: sanitizeArray(input.links),
      })

    if (error) throw new Error(error.message)

    await replaceTechniqueRelations(userId, techniqueId, input.tags, input.linkedTechniqueIds)
    await awardXp(userId, xpDelta)
    await syncProgressSignals(userId)

    const libraryTechniques = await listLibraryTechniques(userId)
    const technique = libraryTechniques.find((entry) => entry.id === techniqueId)
    if (!technique) throw new Error('Technique not found after save')
    return technique
  },

  async createDiscoverTechnique(userId: string, input: SaveDiscoverTechniqueInput): Promise<BjjTechnique> {
    const id = createTextId('comm')
    const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
    const media = sanitizeArray(input.media)
    const links = sanitizeArray(input.links)
    const tags = sanitizeArray(input.tags)
    const row = {
      id,
      title: input.title.trim(),
      branch,
      category: input.category,
      description: input.description.trim(),
      tutorial_title: input.tutorialTitle.trim() || input.title.trim(),
      tutorial_thumbnail: null,
      tags,
      links,
      media,
      linked_technique_ids: [],
      created_by: userId,
    }
    const { data, error } = await db.from('techniques').insert(row).select('*').single()
    if (error) throw new Error(error.message)
    return mapDiscoverTechnique(data)
  },

  async updateDiscoverTechnique(userId: string, techniqueId: string, input: SaveDiscoverTechniqueInput): Promise<void> {
    const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
    const media = sanitizeArray(input.media)
    const links = sanitizeArray(input.links)
    const tags = sanitizeArray(input.tags)
    const { error } = await db
      .from('techniques')
      .update({
        title: input.title.trim(),
        branch,
        category: input.category,
        description: input.description.trim(),
        tutorial_title: input.tutorialTitle.trim() || input.title.trim(),
        tags,
        links,
        media,
        linked_technique_ids: [],
      })
      .eq('id', techniqueId)
      .eq('created_by', userId)
    if (error) throw new Error(error.message)
  },

  async deleteDiscoverTechnique(userId: string, techniqueId: string): Promise<void> {
    const { error } = await db.from('techniques').delete().eq('id', techniqueId).eq('created_by', userId)
    if (error) throw new Error(error.message)
  },

  async deleteLibraryTechnique(userId: string, libraryTechniqueId: string): Promise<void> {
    const { error } = await db.from('user_techniques').delete().eq('user_id', userId).eq('id', libraryTechniqueId)
    if (error) throw new Error(error.message)
    await syncProgressSignals(userId)
  },

  async addCatalogTechniqueToLibrary(userId: string, catalogTechniqueId: string): Promise<BjjTechnique> {
    const { data: existing, error: existingError } = await db
      .from('user_techniques')
      .select('id')
      .eq('user_id', userId)
      .eq('catalog_technique_id', catalogTechniqueId)
      .maybeSingle()

    if (existingError && !isMissingSchemaError(existingError)) {
      throw new Error(existingError.message)
    }

    if (existing?.id) {
      const libraryTechniques = await listLibraryTechniques(userId)
      const technique = libraryTechniques.find((entry) => entry.id === existing.id)
      if (technique) return technique
    }

    const { data: catalogTechnique, error } = await db
      .from('techniques')
      .select('*')
      .eq('id', catalogTechniqueId)
      .single()

    if (error) throw new Error(error.message)

    await assertWithinFreeTechniqueLimit(userId, `lib-${catalogTechniqueId}`)

    return this.saveTechnique(userId, {
      id: createTextId('lib'),
      catalogTechniqueId,
      branch: normalizeMartialArtsBranchId(catalogTechnique.branch) ?? 'bjj',
      title: catalogTechnique.title,
      category: catalogTechnique.category as BjjTechniqueCategory,
      tags: Array.isArray(catalogTechnique.tags) ? catalogTechnique.tags : [],
      notes: catalogTechnique.notes ?? '',
      description: catalogTechnique.description ?? '',
      tutorialTitle: catalogTechnique.tutorial_title ?? catalogTechnique.title,
      media: Array.isArray(catalogTechnique.media) ? catalogTechnique.media : [],
      links: Array.isArray(catalogTechnique.links) ? catalogTechnique.links : [],
      linkedTechniqueIds: [],
    }, 15)
  },

  async saveSession(userId: string, input: SaveBjjSessionInput): Promise<BjjSession> {
    const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
    await assertUserOwnsTechniques(userId, sanitizeArray(input.linkedTechniqueIds), branch)

    const { data: row, error } = await db
      .from('training_sessions')
      .upsert({
        user_id: userId,
        client_id: input.clientId ?? null,
        branch,
        title: `${input.type} @ ${input.location || 'Training Room'}`,
        session_date: input.date,
        started_at: toStartedAt(input.date, input.time),
        source: 'manual',
        kind: 'mat',
        notes: input.notes,
        location: input.location,
        session_type: input.type,
        duration_minutes: input.durationMinutes,
        satisfaction: input.satisfaction,
        visibility: input.visibility,
        caption: input.caption,
        photo_url: input.photoUrl ?? null,
        tagged_friends: sanitizeArray(input.taggedFriends),
        submission_names: sanitizeArray(input.submissions),
        tap_names: sanitizeArray(input.taps),
      }, { onConflict: 'user_id,client_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    const { error: deleteLinksError } = await db
      .from('training_session_techniques')
      .delete()
      .eq('training_session_id', row.id)

    if (deleteLinksError && !isMissingSchemaError(deleteLinksError)) {
      throw new Error(deleteLinksError.message)
    }

    const linkedTechniqueIds = sanitizeArray(input.linkedTechniqueIds)
    if (linkedTechniqueIds.length > 0) {
      const { error: insertLinksError } = await db
        .from('training_session_techniques')
        .insert(linkedTechniqueIds.map((techniqueId) => ({
          training_session_id: row.id,
          technique_id: techniqueId,
        })))

      if (insertLinksError && !isMissingSchemaError(insertLinksError)) {
        throw new Error(insertLinksError.message)
      }
    }

    await incrementStreaks(userId)
    await awardXp(userId, 40)

    await syncProgressSignals(userId)
    return mapSession(row, linkedTechniqueIds)
  },

  async updateSession(userId: string, sessionId: string, input: UpdateBjjSessionInput): Promise<BjjSession> {
    const branch = normalizeMartialArtsBranchId(input.branch) ?? 'bjj'
    await assertUserOwnsTechniques(userId, sanitizeArray(input.linkedTechniqueIds), branch)

    const updatePayload: Record<string, unknown> = {
      branch,
      title: `${input.type} @ ${input.location || 'Training Room'}`,
      session_date: input.date,
      started_at: toStartedAt(input.date, input.time),
      notes: input.notes,
      location: input.location,
      session_type: input.type,
      duration_minutes: input.durationMinutes,
      satisfaction: input.satisfaction,
      visibility: input.visibility,
      caption: input.caption,
      tagged_friends: sanitizeArray(input.taggedFriends),
      submission_names: sanitizeArray(input.submissions),
      tap_names: sanitizeArray(input.taps),
    }
    if (input.photoUrl !== undefined) {
      updatePayload.photo_url = input.photoUrl
    }

    const { data: row, error } = await db
      .from('training_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    const { error: deleteLinksError } = await db
      .from('training_session_techniques')
      .delete()
      .eq('training_session_id', row.id)

    if (deleteLinksError && !isMissingSchemaError(deleteLinksError)) {
      throw new Error(deleteLinksError.message)
    }

    const linkedTechniqueIds = sanitizeArray(input.linkedTechniqueIds)
    if (linkedTechniqueIds.length > 0) {
      const { error: insertLinksError } = await db
        .from('training_session_techniques')
        .insert(linkedTechniqueIds.map((techniqueId) => ({
          training_session_id: row.id,
          technique_id: techniqueId,
        })))

      if (insertLinksError && !isMissingSchemaError(insertLinksError)) {
        throw new Error(insertLinksError.message)
      }
    }

    return mapSession(row, linkedTechniqueIds)
  },

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const { error } = await db
      .from('training_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
  },

  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const filePath = `${userId}/${fileName}`
    const { error } = await db.storage.from('profile-images').upload(filePath, file, {
      upsert: true,
    })

    if (error) throw new Error(error.message)

    const { data } = db.storage.from('profile-images').getPublicUrl(filePath)
    const url = data.publicUrl
    await supabaseService.updateProfile(userId, { avatarUrl: url })
    return url
  },

  async uploadSessionPhoto(userId: string, file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const filePath = `${userId}/${fileName}`
    const { error } = await db.storage.from('session-media').upload(filePath, file, {
      upsert: true,
    })

    if (error) throw new Error(error.message)

    const { data } = db.storage.from('session-media').getPublicUrl(filePath)
    return data.publicUrl
  },

  async uploadTechniqueMedia(userId: string, file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const filePath = `${userId}/${fileName}`
    const { error } = await db.storage.from('technique-media').upload(filePath, file, {
      upsert: true,
    })

    if (error) throw new Error(error.message)

    const { data } = db.storage.from('technique-media').getPublicUrl(filePath)
    return data.publicUrl
  },

  async saveUserSystem(userId: string, input: SaveUserSystemInput): Promise<SaveUserSystemResult> {
    return persistUserSystem(userId, input)
  },

  /** Load one system the current user may view (catalog, own, or others' public), with nodes/edges/techniques. */
  async getSystemByIdForViewer(userId: string, systemId: string, premiumUnlocked: boolean): Promise<BjjSystem | null> {
    return getSystemByIdForViewer(userId, systemId, premiumUnlocked)
  },

  /** Latest `updated_at` for an owned user system (for optimistic concurrency / conflict prompts). */
  async getUserSystemUpdatedAt(userId: string, systemId: string): Promise<string | null> {
    const { data, error } = await db
      .from('systems')
      .select('updated_at')
      .eq('id', systemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      if (isMissingSchemaError(error, 'systems')) return null
      throw new Error(error.message)
    }
    const row = data as { updated_at?: string } | null
    const raw = row?.updated_at
    return typeof raw === 'string' && raw.trim() ? raw : null
  },

  async deleteUserSystem(userId: string, systemId: string): Promise<void> {
    return removeUserSystem(userId, systemId)
  },

  /**
   * Permanently delete the authenticated user's account and owned data.
   * Calls the `delete-account` edge function which purges storage and
   * invokes auth.admin.deleteUser (cascading to all owned tables).
   */
  async deleteAccount(): Promise<void> {
    const { data, error } = await db.functions.invoke('delete-account', {
      body: { confirm: 'DELETE' },
    })
    if (error) {
      throw new Error(error.message || 'Account deletion failed')
    }
    const payload = data as { success?: boolean; error?: string } | null
    if (!payload?.success) {
      throw new Error(payload?.error || 'Account deletion failed')
    }
  },
}
