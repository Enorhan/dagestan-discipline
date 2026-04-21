import { analytics } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import type { SocialComment } from '@/lib/social-models'

const db = supabase as any

function toSocialComment(row: any): SocialComment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const username =
    typeof row.author_username === 'string' && row.author_username.length > 0
      ? row.author_username
      : typeof profile?.username === 'string' && profile.username.length > 0
        ? profile.username
        : 'grappler'
  const display =
    typeof row.author_display_name === 'string' && row.author_display_name.length > 0
      ? row.author_display_name
      : profile?.display_name ?? 'Grappler'
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: display,
    authorHandle: `@${username}`,
    body: row.body ?? '',
    parentCommentId: row.parent_comment_id ?? undefined,
    mentions: Array.isArray(row.mentioned_user_ids) ? row.mentioned_user_ids : [],
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

function extractMentionHandles(input: string): string[] {
  const handles = new Set<string>()
  for (const match of input.matchAll(/(^|\s)@([a-z0-9_]{2,32})/gi)) {
    const handle = (match[2] ?? '').toLowerCase()
    if (handle) handles.add(handle)
  }
  return [...handles]
}

function extractHashtags(input: string): string[] {
  const tags = new Set<string>()
  for (const match of input.matchAll(/(^|\s)#([a-z0-9_]{2,64})/gi)) {
    const tag = (match[2] ?? '').toLowerCase()
    if (tag) tags.add(tag)
  }
  return [...tags]
}

async function listMentionedUserIdsByHandle(viewerId: string, handles: string[]): Promise<string[]> {
  if (handles.length === 0) return []
  const { data, error } = await db.rpc('mention_resolve_handles', {
    p_viewer_id: viewerId,
    p_handles: handles,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: any) => row.user_id as string).filter(Boolean)
}

async function createNotification(userId: string, kind: string, title: string, body: string, metadata: Record<string, unknown>) {
  const { error } = await db.from('notifications').insert({
    user_id: userId,
    kind,
    title,
    body,
    metadata,
  })
  if (error) throw new Error(error.message)
}

async function getPostOwner(postId: string): Promise<string | null> {
  const { data, error } = await db.from('posts').select('user_id').eq('id', postId).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.user_id ?? null
}

async function getCommentOwner(commentId: string): Promise<string | null> {
  const { data, error } = await db.from('comments').select('user_id').eq('id', commentId).maybeSingle()
  if (error) throw new Error(error.message)
  return data?.user_id ?? null
}

export const socialInteractionsService = {
  async likePost(userId: string, postId: string): Promise<void> {
    const { error } = await db.from('likes').insert({ user_id: userId, post_id: postId })
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
    const ownerId = await getPostOwner(postId)
    if (ownerId && ownerId !== userId) {
      await createNotification(ownerId, 'social_like', 'New like', 'Someone liked your post.', { postId, actorId: userId })
    }
    analytics.track('social_post_liked' as any, { postId } as any)
  },

  async unlikePost(userId: string, postId: string): Promise<void> {
    const { error } = await db
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    if (error) throw new Error(error.message)
  },

  async savePost(userId: string, postId: string): Promise<void> {
    const { error } = await db.from('saves').insert({ user_id: userId, post_id: postId })
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
    analytics.track('social_post_saved' as any, { postId } as any)
  },

  async unsavePost(userId: string, postId: string): Promise<void> {
    const { error } = await db
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    if (error) throw new Error(error.message)
  },

  async listComments(
    postId: string,
    options?: {
      parentCommentId?: string | null
      cursorCreatedAt?: string | null
      pageSize?: number
    },
  ): Promise<SocialComment[]> {
    const pageSize = Math.max(1, Math.min(250, options?.pageSize ?? 160))
    const cursorCreatedAt = options?.cursorCreatedAt ? new Date(options.cursorCreatedAt).toISOString() : null
    const parentCommentId = options?.parentCommentId ?? null
    const { data, error } = await db.rpc('comments_for_post', {
      target_post_id: postId,
      cursor_created_at: cursorCreatedAt,
      parent_id: parentCommentId,
      page_size: pageSize,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => toSocialComment(row))
  },

  async addComment(userId: string, postId: string, body: string, parentCommentId?: string): Promise<SocialComment[]> {
    const trimmed = body.trim()
    if (!trimmed) throw new Error('Comment body is required')
    const mentionHandles = extractMentionHandles(trimmed)
    const hashtags = extractHashtags(trimmed)
    const mentionedUserIds = await listMentionedUserIdsByHandle(userId, mentionHandles)

    const { error } = await db
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        body: trimmed,
        parent_comment_id: parentCommentId ?? null,
        mentioned_user_ids: mentionedUserIds,
        hashtags,
      })
    if (error) throw new Error(error.message)

    const ownerId = await getPostOwner(postId)
    if (ownerId && ownerId !== userId) {
      await createNotification(
        ownerId,
        parentCommentId ? 'social_reply' : 'social_comment',
        parentCommentId ? 'New reply on your post' : 'New comment on your post',
        parentCommentId ? 'Someone replied in your thread.' : 'Someone commented on your post.',
        { postId, actorId: userId },
      )
    }

    if (parentCommentId) {
      const parentOwnerId = await getCommentOwner(parentCommentId)
      if (parentOwnerId && parentOwnerId !== userId && parentOwnerId !== ownerId) {
        await createNotification(
          parentOwnerId,
          'social_reply',
          'New reply in your thread',
          'Someone replied to your comment.',
          { postId, actorId: userId, parentCommentId },
        )
      }
    }

    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === userId) continue
      await createNotification(
        mentionedUserId,
        'social_mention',
        'You were mentioned',
        'Someone mentioned you in a comment.',
        { postId, actorId: userId },
      )
    }

    analytics.track('social_comment_created' as any, { postId } as any)
    return this.listComments(postId)
  },
}
