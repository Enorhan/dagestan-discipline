import { supabase } from '@/lib/supabase'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'

const db = supabase as any

export interface SystemForkRow {
  forkId: string
  childSystemId: string
  forkedBy: string
  forkedAt: string
  forkTitle: string
}

export interface CoachLibraryItem {
  itemKind: 'system' | 'technique'
  itemId: string
  title: string
  branch: MartialArtsBranchId | string
  updatedAt: string
  thumbnail: string | null
  summary: string | null
}

export interface DrillLeaderboardRow {
  userId: string
  displayName: string
  handle: string | null
  totalReps: number
  completions: number
  lastCompletedAt: string
}

export interface SessionReviewRow {
  id: string
  reviewerId: string
  reviewerDisplayName: string
  reviewerHandle: string | null
  body: string
  rating: number | null
  focusTechniqueId: string | null
  createdAt: string
  updatedAt: string
}

export interface DiscoverSystemCard {
  systemId: string
  ownerId: string
  ownerDisplayName: string
  ownerHandle: string | null
  title: string
  summary: string
  branch: MartialArtsBranchId | string
  updatedAt: string
  forkCount: number
  viewerHasForked: boolean
}

export interface DiscoverTechniqueCard {
  techniqueId: string
  ownerId: string
  ownerDisplayName: string
  ownerHandle: string | null
  title: string
  category: string
  description: string
  tutorialTitle: string
  tutorialThumbnail: string | null
  tags: string[]
  links: string[]
  media: string[]
  branch: MartialArtsBranchId | string
  updatedAt: string
  forkCount: number
  viewerHasForked: boolean
}

export interface ReceivedReviewRow {
  id: string
  sessionId: string
  sessionTitle: string
  reviewerId: string
  reviewerDisplayName: string
  reviewerHandle: string | null
  body: string
  rating: number | null
  createdAt: string
  updatedAt: string
}

export interface SystemForkerRow {
  forkId: string
  forkerId: string
  forkerDisplayName: string
  forkerHandle: string | null
  forkerAvatarUrl: string | null
  childSystemId: string
  forkedAt: string
}

export interface PublicProfileReviewRow {
  id: string
  sessionId: string
  sessionTitle: string
  reviewerId: string
  reviewerDisplayName: string
  reviewerHandle: string | null
  reviewerAvatarUrl: string | null
  body: string
  rating: number | null
  createdAt: string
}

export type CommentTargetType = 'system' | 'technique'

export interface TargetCommentRow {
  id: string
  targetType: CommentTargetType
  targetId: string
  parentCommentId: string | null
  userId: string
  authorDisplayName: string
  authorHandle: string | null
  authorAvatarUrl: string | null
  body: string
  mentionedUserIds: string[]
  hashtags: string[]
  createdAt: string
  updatedAt: string
}

function isMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const code = String(error.code ?? '')
  if (code === '42P01' || code === '42883' || code === 'PGRST116') return true
  const msg = String(error.message ?? '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('not found')
}

export const communityService = {
  async forkSystem(parentSystemId: string): Promise<string> {
    const { data, error } = await db.rpc('fork_system', { p_parent_system_id: parentSystemId })
    if (error) throw new Error(error.message)
    return String(data ?? '')
  },

  async listSystemForks(parentSystemId: string, limit = 20, cursor: string | null = null): Promise<SystemForkRow[]> {
    const { data, error } = await db.rpc('list_system_forks', {
      p_parent_system_id: parentSystemId,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      forkId: String(r.fork_id),
      childSystemId: String(r.child_system_id),
      forkedBy: String(r.forked_by),
      forkedAt: String(r.forked_at),
      forkTitle: String(r.fork_title ?? ''),
    }))
  },

  async listCoachLibrary(coachId: string, branch: MartialArtsBranchId | null = null, limit = 50): Promise<CoachLibraryItem[]> {
    const { data, error } = await db.rpc('list_coach_library', {
      p_coach_id: coachId,
      p_branch: branch,
      p_limit: limit,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      itemKind: r.item_kind === 'technique' ? 'technique' : 'system',
      itemId: String(r.item_id),
      title: String(r.title ?? ''),
      branch: String(r.branch ?? 'bjj'),
      updatedAt: String(r.updated_at),
      thumbnail: r.thumbnail == null ? null : String(r.thumbnail),
      summary: r.summary == null ? null : String(r.summary),
    }))
  },

  async drillChallengeLeaderboard(challengeId: string): Promise<DrillLeaderboardRow[]> {
    const { data, error } = await db.rpc('drill_challenge_leaderboard', { p_challenge_id: challengeId })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      userId: String(r.user_id),
      displayName: String(r.display_name ?? ''),
      handle: r.handle == null ? null : String(r.handle),
      totalReps: Number(r.total_reps ?? 0),
      completions: Number(r.completions ?? 0),
      lastCompletedAt: String(r.last_completed_at ?? ''),
    }))
  },

  async postSessionReview(sessionId: string, body: string, rating: number | null = null, focusTechniqueId: string | null = null): Promise<string> {
    const { data, error } = await db.rpc('post_session_review', {
      p_session_id: sessionId,
      p_body: body,
      p_rating: rating,
      p_focus_technique_id: focusTechniqueId,
    })
    if (error) throw new Error(error.message)
    return String(data ?? '')
  },

  async listSessionReviews(sessionId: string): Promise<SessionReviewRow[]> {
    const { data, error } = await db.rpc('list_session_reviews', { p_session_id: sessionId })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      reviewerId: String(r.reviewer_id),
      reviewerDisplayName: String(r.reviewer_display_name ?? ''),
      reviewerHandle: r.reviewer_handle == null ? null : String(r.reviewer_handle),
      body: String(r.body ?? ''),
      rating: r.rating == null ? null : Number(r.rating),
      focusTechniqueId: r.focus_technique_id == null ? null : String(r.focus_technique_id),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }))
  },

  async listPublicSystemsByBranch(branch: MartialArtsBranchId | null, limit = 24, cursor: string | null = null): Promise<DiscoverSystemCard[]> {
    const { data, error } = await db.rpc('list_public_systems_by_branch', {
      p_branch: branch,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      systemId: String(r.system_id),
      ownerId: String(r.owner_id),
      ownerDisplayName: String(r.owner_display_name ?? ''),
      ownerHandle: r.owner_handle == null ? null : String(r.owner_handle),
      title: String(r.title ?? ''),
      summary: String(r.summary ?? ''),
      branch: String(r.branch ?? 'bjj'),
      updatedAt: String(r.updated_at),
      forkCount: Number(r.fork_count ?? 0),
      viewerHasForked: Boolean(r.viewer_has_forked),
    }))
  },

  async listPublicTechniquesByBranch(branch: MartialArtsBranchId | null, limit = 24, cursor: string | null = null): Promise<DiscoverTechniqueCard[]> {
    const { data, error } = await db.rpc('list_public_techniques_by_branch', {
      p_branch: branch,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      techniqueId: String(r.technique_id),
      ownerId: String(r.owner_id),
      ownerDisplayName: String(r.owner_display_name ?? ''),
      ownerHandle: r.owner_handle == null ? null : String(r.owner_handle),
      title: String(r.title ?? ''),
      category: String(r.category ?? ''),
      description: String(r.description ?? ''),
      tutorialTitle: String(r.tutorial_title ?? ''),
      tutorialThumbnail: r.tutorial_thumbnail == null ? null : String(r.tutorial_thumbnail),
      tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      links: Array.isArray(r.links) ? r.links.map(String) : [],
      media: Array.isArray(r.media) ? r.media.map(String) : [],
      branch: String(r.branch ?? 'bjj'),
      updatedAt: String(r.updated_at),
      forkCount: Number(r.fork_count ?? 0),
      viewerHasForked: Boolean(r.viewer_has_forked),
    }))
  },

  async listMyReceivedReviews(limit = 30, cursor: string | null = null): Promise<ReceivedReviewRow[]> {
    const { data, error } = await db.rpc('list_my_received_reviews', { p_limit: limit, p_cursor: cursor })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      sessionId: String(r.session_id),
      sessionTitle: String(r.session_title ?? 'Session'),
      reviewerId: String(r.reviewer_id),
      reviewerDisplayName: String(r.reviewer_display_name ?? ''),
      reviewerHandle: r.reviewer_handle == null ? null : String(r.reviewer_handle),
      body: String(r.body ?? ''),
      rating: r.rating == null ? null : Number(r.rating),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }))
  },

  async listSystemForkers(parentSystemId: string, limit = 24, cursor: string | null = null): Promise<SystemForkerRow[]> {
    const { data, error } = await db.rpc('list_system_forkers', {
      p_parent_system_id: parentSystemId,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      forkId: String(r.fork_id),
      forkerId: String(r.forker_id),
      forkerDisplayName: String(r.forker_display_name ?? 'Grappler'),
      forkerHandle: r.forker_handle == null ? null : String(r.forker_handle),
      forkerAvatarUrl: r.forker_avatar_url == null ? null : String(r.forker_avatar_url),
      childSystemId: String(r.child_system_id),
      forkedAt: String(r.forked_at),
    }))
  },

  async listPublicUserReviews(userId: string, limit = 20, cursor: string | null = null): Promise<PublicProfileReviewRow[]> {
    const { data, error } = await db.rpc('list_public_user_reviews', {
      p_user_id: userId,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      sessionId: String(r.session_id),
      sessionTitle: String(r.session_title ?? 'Session'),
      reviewerId: String(r.reviewer_id),
      reviewerDisplayName: String(r.reviewer_display_name ?? 'Grappler'),
      reviewerHandle: r.reviewer_handle == null ? null : String(r.reviewer_handle),
      reviewerAvatarUrl: r.reviewer_avatar_url == null ? null : String(r.reviewer_avatar_url),
      body: String(r.body ?? ''),
      rating: r.rating == null ? null : Number(r.rating),
      createdAt: String(r.created_at),
    }))
  },

  async listTargetComments(targetType: CommentTargetType, targetId: string, limit = 160, cursor: string | null = null): Promise<TargetCommentRow[]> {
    const { data, error } = await db.rpc('list_target_comments', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_limit: limit,
      p_cursor: cursor,
    })
    if (error) {
      if (isMissing(error)) return []
      throw new Error(error.message)
    }
    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      targetType: (r.target_type === 'technique' ? 'technique' : 'system') as CommentTargetType,
      targetId: String(r.target_id),
      parentCommentId: r.parent_comment_id == null ? null : String(r.parent_comment_id),
      userId: String(r.user_id),
      authorDisplayName: String(r.author_display_name ?? 'Grappler'),
      authorHandle: r.author_handle == null ? null : String(r.author_handle),
      authorAvatarUrl: r.author_avatar_url == null ? null : String(r.author_avatar_url),
      body: String(r.body ?? ''),
      mentionedUserIds: Array.isArray(r.mentioned_user_ids) ? r.mentioned_user_ids.map(String) : [],
      hashtags: Array.isArray(r.hashtags) ? r.hashtags.map(String) : [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }))
  },

  async postTargetComment(targetType: CommentTargetType, targetId: string, body: string, parentCommentId: string | null = null): Promise<string> {
    const { data, error } = await db.rpc('post_target_comment', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_body: body,
      p_parent_comment_id: parentCommentId,
    })
    if (error) throw new Error(error.message)
    return String(data ?? '')
  },

  async toggleCoachSubscription(coachId: string, subscribe: boolean, notify = true): Promise<void> {
    if (subscribe) {
      const { data: userData } = await db.auth.getUser()
      const subscriberId = userData?.user?.id
      if (!subscriberId) throw new Error('not authenticated')
      const { error } = await db.from('coach_subscriptions').upsert({ subscriber_id: subscriberId, coach_id: coachId, notify }, { onConflict: 'subscriber_id,coach_id' })
      if (error) throw new Error(error.message)
    } else {
      const { data: userData } = await db.auth.getUser()
      const subscriberId = userData?.user?.id
      if (!subscriberId) throw new Error('not authenticated')
      const { error } = await db.from('coach_subscriptions').delete().eq('subscriber_id', subscriberId).eq('coach_id', coachId)
      if (error) throw new Error(error.message)
    }
  },
}

