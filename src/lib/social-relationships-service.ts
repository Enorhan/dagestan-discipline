import { analytics } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import type { FollowRequestRecord, SocialConnectionProfile, SocialFollowSuggestion } from '@/lib/social-models'

const db = supabase as any

function toFollowRequest(row: any): FollowRequestRecord {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    targetUserId: row.target_user_id,
    status: row.status,
    createdAt: row.created_at ?? new Date().toISOString(),
    respondedAt: row.responded_at ?? null,
  }
}

/** Load profiles in the same order as {@link userIds} (follows FK targets auth.users; embed `profiles:…` is invalid). */
async function loadConnectionProfilesOrdered(viewerId: string, userIds: string[]): Promise<SocialConnectionProfile[]> {
  if (userIds.length === 0) return []
  const { data, error } = await db.rpc('public_profile_cards_batch', {
    p_viewer_id: viewerId,
    p_user_ids: userIds,
  })
  if (error) throw new Error(error.message)
  const byId = new Map<string, any>((data ?? []).map((row: any) => [row.user_id, row]))
  return userIds.map((userId) => {
    const profile = byId.get(userId)
    const username = typeof profile?.username === 'string' && profile.username.length > 0 ? profile.username : 'grappler'
    return {
      userId,
      username,
      displayName: profile?.display_name ?? 'Grappler',
      avatarUrl: profile?.avatar_url ?? undefined,
    }
  })
}

export const socialRelationshipsService = {
  async followUser(userId: string, targetUserId: string): Promise<'followed' | 'requested' | 'noop'> {
    if (userId === targetUserId) return 'noop'

    let action: 'followed' | 'requested' | 'noop' = 'noop'
    const { data, error } = await db.rpc('request_or_follow', {
      requester_id: userId,
      target_id: targetUserId,
    })
    if (error) throw new Error(error.message)
    action = (data ?? 'noop') as 'followed' | 'requested' | 'noop'

    if (action === 'requested') {
      analytics.track('social_follow_request_sent' as any, { targetUserId } as any)
    } else if (action === 'followed') {
      analytics.track('social_followed' as any, { targetUserId } as any)
    }
    return action
  },

  async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_user_id', userId)
      .eq('following_user_id', targetUserId)
    if (error) throw new Error(error.message)
  },

  async listPendingFollowRequests(userId: string): Promise<FollowRequestRecord[]> {
    const { data, error } = await db
      .from('follow_requests')
      .select('*')
      .eq('target_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toFollowRequest)
  },

  async respondToFollowRequest(requestId: string, accept: boolean): Promise<'accepted' | 'rejected'> {
    const { data, error } = await db.rpc('respond_follow_request', {
      request_id: requestId,
      accept_request: accept,
    })
    if (error) throw new Error(error.message)
    const result = (data ?? (accept ? 'accepted' : 'rejected')) as 'accepted' | 'rejected'

    analytics.track('social_follow_request_responded' as any, { requestId, result } as any)
    return result
  },

  async listFollowSuggestions(userId: string, limit = 12): Promise<string[]> {
    const ranked = await this.listFollowSuggestionsRanked(userId, limit)
    return ranked.map((entry) => entry.userId)
  },

  async listFollowSuggestionsRanked(userId: string, limit = 12): Promise<SocialFollowSuggestion[]> {
    const { data, error } = await db.rpc('follow_suggestions', {
      viewer_id: userId,
      page_size: Math.max(1, Math.min(40, limit)),
    })
    if (error) throw new Error(error.message)
    return (data ?? [])
      .map((row: any) => ({
        userId: row.user_id as string,
        score: Number(row.score ?? 0),
      }))
      .filter((row: SocialFollowSuggestion) => Boolean(row.userId))
  },

  async listFollowers(viewerId: string, profileId: string, limit = 60): Promise<SocialConnectionProfile[]> {
    const lim = Math.max(1, Math.min(100, limit))
    const { data, error } = await db
      .from('follows')
      .select('follower_user_id')
      .eq('following_user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(lim)
    if (error) throw new Error(error.message)
    const userIds = (data ?? []).map((row: any) => row.follower_user_id as string).filter(Boolean)
    return loadConnectionProfilesOrdered(viewerId, userIds)
  },

  async listFollowing(viewerId: string, profileId: string, limit = 60): Promise<SocialConnectionProfile[]> {
    const lim = Math.max(1, Math.min(100, limit))
    const { data, error } = await db
      .from('follows')
      .select('following_user_id')
      .eq('follower_user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(lim)
    if (error) throw new Error(error.message)
    const userIds = (data ?? []).map((row: any) => row.following_user_id as string).filter(Boolean)
    return loadConnectionProfilesOrdered(viewerId, userIds)
  },
}
