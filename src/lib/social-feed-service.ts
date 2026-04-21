import { analytics } from '@/lib/analytics'
import {
  normalizeSocialCreativeEdit,
  SOCIAL_MUSIC_TRACK_FALLBACKS,
} from '@/lib/social-creative'
import { supabase } from '@/lib/supabase'
import type {
  CreateSocialPostResult,
  CreateSocialPostInput,
  SocialCreatorDraft,
  SocialMomentSummary,
  SocialProfileOverview,
  SocialProfileTab,
  SocialCursorPage,
  SocialFeedPost,
  SocialMusicTrack,
  SocialModerationQueueItem,
  SocialPlaybackMilestone,
  SocialStory,
  SocialTopicSummary,
  SocialVideoProvider,
} from '@/lib/social-models'

const db = supabase as any
const MAX_PAGE_SIZE = 20

function isMissingSocialSchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /relation .* does not exist|schema cache|column .* does not exist|not found/i.test(error.message)
}

function toIsoCursor(input?: string | null): string {
  if (!input) return new Date().toISOString()
  const parsed = Date.parse(input)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
}

function toPage<T extends { createdAt: string }>(items: T[]): SocialCursorPage<T> {
  const nextCursor = items.length >= MAX_PAGE_SIZE ? items[items.length - 1]?.createdAt ?? null : null
  return { items, nextCursor }
}

function withoutOwnPosts(userId: string, items: SocialFeedPost[]): SocialFeedPost[] {
  return items.filter((item) => item.authorId !== userId)
}

function mapFeedRow(row: any): SocialFeedPost {
  const creativeMode = row.post_kind === 'reel' ? 'reel' : 'post'
  return {
    id: row.post_id,
    authorId: row.user_id,
    authorName: row.author_name ?? 'Grappler',
    authorHandle: row.author_handle ?? '@grappler',
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    caption: row.caption ?? '',
    mediaType: row.media_type ?? 'image',
    mediaUrl: row.media_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    playbackUrl: row.playback_url ?? row.hls_url ?? undefined,
    playbackId: row.playback_id ?? undefined,
    processingStatus: row.media_processing_status ?? 'ready',
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : undefined,
    aspectRatio: typeof row.aspect_ratio === 'number' ? row.aspect_ratio : undefined,
    visibility: row.visibility ?? 'public',
    postKind: row.post_kind ?? 'moment',
    allowComments: typeof row.allow_comments === 'boolean' ? row.allow_comments : undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    likes: Number(row.like_count ?? 0),
    comments: Number(row.comment_count ?? 0),
    saves: Number(row.save_count ?? 0),
    viewerLiked: Boolean(row.viewer_liked),
    viewerSaved: Boolean(row.viewer_saved),
    rankScore: Number(row.rank_score ?? 0),
    creativeEdit: row.creative_edit ? normalizeSocialCreativeEdit(row.creative_edit, creativeMode) : undefined,
    renderStatus: row.render_status ?? undefined,
    renderError: row.render_error ?? undefined,
  }
}

function mapDraftRow(row: any): SocialCreatorDraft {
  const publishTarget = row.publish_target ?? (row.post_kind === 'reel' ? 'reel' : 'post')
  return {
    id: row.id,
    publishTarget,
    caption: row.caption ?? '',
    mediaType: row.media_type ?? 'video',
    postKind: row.post_kind ?? 'reel',
    visibility: row.visibility ?? 'public',
    uploadUrl: row.upload_url ?? undefined,
    sourceMediaUrl: row.source_media_url ?? row.upload_url ?? undefined,
    sourceThumbnailUrl: row.source_thumbnail_url ?? row.thumbnail_url ?? undefined,
    sourceMediaType: row.source_media_type ?? row.media_type ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    coverTimestampMs: typeof row.cover_timestamp_ms === 'number' ? row.cover_timestamp_ms : undefined,
    videoAssetId: row.video_asset_id ?? undefined,
    videoProvider: row.video_provider ?? undefined,
    renderJobId: row.render_job_id ?? undefined,
    uploadStatus: row.upload_status ?? undefined,
    uploadProgress: typeof row.upload_progress === 'number' ? row.upload_progress : undefined,
    failedReason: row.failed_reason ?? undefined,
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : undefined,
    aspectRatio: typeof row.aspect_ratio === 'number' ? row.aspect_ratio : undefined,
    trimStartMs: typeof row.trim_start_ms === 'number' ? row.trim_start_ms : undefined,
    trimEndMs: typeof row.trim_end_ms === 'number' ? row.trim_end_ms : undefined,
    scheduledFor: row.scheduled_for ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    creativeEdit: row.creative_edit ? normalizeSocialCreativeEdit(row.creative_edit, publishTarget) : undefined,
    renderStatus: row.render_status ?? undefined,
    renderError: row.render_error ?? undefined,
  }
}

function mapProfileOverview(row: any): SocialProfileOverview {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? 'Grappler',
    username: row.username ?? 'grappler',
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? '',
    primaryDiscipline: row.primary_discipline ?? undefined,
    followerCount: Number(row.follower_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    postCount: Number(row.post_count ?? 0),
    reelCount: Number(row.reel_count ?? 0),
    savedCount: Number(row.saved_count ?? 0),
    isSelf: Boolean(row.is_self),
    viewerFollows: Boolean(row.viewer_follows),
    viewerRequested: Boolean(row.viewer_requested),
  }
}

function mapModerationRow(row: any): SocialModerationQueueItem {
  return {
    id: row.queue_id ?? row.id,
    reportId: row.report_id,
    status: row.status ?? 'open',
    priority: Number(row.priority ?? 50),
    reason: row.reason ?? 'report',
    details: row.details ?? undefined,
    evidenceUrls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
    reportCreatedAt: row.report_created_at ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    targetUserId: row.target_user_id ?? undefined,
    targetPostId: row.post_id ?? undefined,
    reporterUserId: row.reporter_user_id,
    targetAuthorName: row.target_author_name ?? undefined,
    targetAuthorHandle: row.target_author_handle ?? undefined,
    postCaption: row.post_caption ?? undefined,
    postMediaUrl: row.post_media_url ?? undefined,
  }
}

function mapStoryRow(row: any): SocialStory {
  return {
    id: row.story_id,
    authorId: row.user_id,
    authorName: row.author_name ?? 'Grappler',
    authorHandle: row.author_handle ?? '@grappler',
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    mediaType: row.media_type ?? 'image',
    mediaUrl: row.media_url ?? '',
    thumbnailUrl: row.thumbnail_url ?? undefined,
    caption: row.caption ?? undefined,
    visibility: row.visibility ?? 'public',
    createdAt: row.created_at ?? new Date().toISOString(),
    expiresAt: row.expires_at ?? new Date().toISOString(),
    viewerSeen: Boolean(row.viewer_seen),
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : undefined,
    creativeEdit: row.creative_edit ? normalizeSocialCreativeEdit(row.creative_edit, 'story') : undefined,
    renderStatus: row.render_status ?? undefined,
    renderError: row.render_error ?? undefined,
  }
}

function mapMomentRow(row: any): SocialMomentSummary {
  return {
    id: row.moment_id,
    userId: row.user_id,
    title: row.title ?? '',
    coverThumbnailUrl: row.cover_thumbnail_url ?? undefined,
    storyCount: Number(row.story_count ?? 0),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

function mapOwnPostRow(row: any): SocialFeedPost {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const media = Array.isArray(row.post_media) ? row.post_media[0] : row.post_media
  const mediaType = row.media_type ?? 'image'
  const creativeMode = row.post_kind === 'reel' ? 'reel' : 'post'

  return {
    id: row.id,
    authorId: row.user_id,
    authorName: profile?.display_name ?? 'Grappler',
    authorHandle: `@${profile?.username ?? 'grappler'}`,
    authorAvatarUrl: profile?.avatar_url ?? undefined,
    caption: row.caption ?? '',
    mediaType,
    mediaUrl: media
      ? media.video_url ?? media.playback_url ?? media.hls_url ?? media.image_url ?? media.poster_url ?? undefined
      : undefined,
    thumbnailUrl: media?.poster_url ?? media?.image_url ?? undefined,
    playbackUrl: media?.playback_url ?? media?.hls_url ?? media?.video_url ?? undefined,
    playbackId: media?.playback_id ?? undefined,
    processingStatus: media?.media_processing_status ?? (mediaType === 'video' ? 'pending' : 'ready'),
    durationMs: typeof media?.duration_ms === 'number' ? media.duration_ms : undefined,
    aspectRatio: typeof media?.aspect_ratio === 'number' ? media.aspect_ratio : undefined,
    visibility: row.visibility ?? 'public',
    postKind: row.post_kind ?? 'moment',
    allowComments: typeof row.allow_comments === 'boolean' ? row.allow_comments : undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    likes: Number(row.like_count ?? 0),
    comments: Number(row.comment_count ?? 0),
    saves: Number(row.save_count ?? 0),
    viewerLiked: false,
    viewerSaved: false,
    rankScore: 0,
    creativeEdit: row.creative_edit ? normalizeSocialCreativeEdit(row.creative_edit, creativeMode) : undefined,
    renderStatus: row.render_status ?? media?.media_processing_status ?? undefined,
    renderError: row.render_error ?? media?.failed_reason ?? undefined,
  }
}

async function loadOwnedPostById(userId: string, postId: string): Promise<SocialFeedPost | null> {
  const { data: postRow, error: postError } = await db
    .from('posts')
    .select(`
      id,
      user_id,
      caption,
      media_type,
      visibility,
      allow_comments,
      creative_edit,
      render_status,
      render_error,
      post_kind,
      created_at,
      like_count,
      comment_count,
      save_count
    `)
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (postError) throw new Error(postError.message)
  if (!postRow) return null

  const [{ data: profileRow, error: profileError }, { data: mediaRow, error: mediaError }] = await Promise.all([
    db
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
    db
      .from('post_media')
      .select(`
        image_url,
        poster_url,
        video_url,
        playback_url,
        hls_url,
        playback_id,
        media_processing_status,
        failed_reason,
        duration_ms,
        aspect_ratio
      `)
      .eq('post_id', postId)
      .maybeSingle(),
  ])

  if (profileError) throw new Error(profileError.message)
  if (mediaError) throw new Error(mediaError.message)

  // Keep the mapping logic stable by emulating the previous embedded select shape.
  return mapOwnPostRow({
    ...postRow,
    profiles: profileRow ?? null,
    post_media: mediaRow ?? null,
  })
}

export const socialFeedService = {
  async getOwnPost(userId: string, postId: string): Promise<SocialFeedPost | null> {
    return loadOwnedPostById(userId, postId)
  },

  async listHomeFeed(userId: string, cursor?: string | null): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_for_you', {
      viewer_id: userId,
      cursor_created_at: toIsoCursor(cursor),
      page_size: MAX_PAGE_SIZE,
    })
    if (error) {
      throw new Error(error.message)
    }
    const items = withoutOwnPosts(userId, (data ?? []).map(mapFeedRow))
    analytics.track('social_feed_impression', {
      source: 'for_you',
      count: items.length,
    } as any)
    return toPage(items)
  },

  async listFollowingFeed(userId: string, cursor?: string | null): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_following', {
      viewer_id: userId,
      cursor_created_at: toIsoCursor(cursor),
      page_size: MAX_PAGE_SIZE,
    })
    if (error) throw new Error(error.message)
    const items = withoutOwnPosts(userId, (data ?? []).map(mapFeedRow))
    analytics.track('social_feed_impression', {
      source: 'following',
      count: items.length,
    } as any)
    return toPage(items)
  },

  async listExploreFeed(userId: string, cursor?: string | null): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_explore', {
      viewer_id: userId,
      cursor_created_at: toIsoCursor(cursor),
      page_size: MAX_PAGE_SIZE,
    })
    if (error) throw new Error(error.message)
    const items = withoutOwnPosts(userId, (data ?? []).map(mapFeedRow))
    analytics.track('social_feed_impression', {
      source: 'explore',
      count: items.length,
    } as any)
    return toPage(items)
  },

  async listProfileFeed(
    userId: string,
    profileId: string,
    tab: Extract<SocialProfileTab, 'posts' | 'reels'> | 'all' = 'posts',
    cursor?: string | null,
    pageSize = MAX_PAGE_SIZE,
  ): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_user_profile_filtered', {
      viewer_id: userId,
      profile_id: profileId,
      tab_filter: tab,
      cursor_created_at: toIsoCursor(cursor),
      page_size: pageSize,
    })
    if (error) {
      throw new Error(error.message)
    }
    const items = (data ?? []).map((row: any) => mapFeedRow(row))
    return {
      items,
      nextCursor: items.length >= pageSize ? items[items.length - 1]?.createdAt ?? null : null,
    }
  },

  async listSavedFeed(userId: string, cursor?: string | null, pageSize = MAX_PAGE_SIZE): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_saved_posts', {
      viewer_id: userId,
      cursor_created_at: toIsoCursor(cursor),
      page_size: pageSize,
    })
    if (error) {
      throw new Error(error.message)
    }
    const items = (data ?? []).map((row: any) => mapFeedRow(row))
    return {
      items,
      nextCursor: items.length >= pageSize ? items[items.length - 1]?.createdAt ?? null : null,
    }
  },

  async getProfileOverview(userId: string, profileId: string): Promise<SocialProfileOverview | null> {
    const { data, error } = await db.rpc('social_profile_overview', {
      viewer_id: userId,
      profile_id: profileId,
    })
    if (error) {
      throw new Error(error.message)
    }
    const row = Array.isArray(data) ? data[0] : data
    return row ? mapProfileOverview(row) : null
  },

  async listMoments(userId: string, profileId: string): Promise<SocialMomentSummary[]> {
    const { data, error } = await db.rpc('moments_list', {
      viewer_id: userId,
      profile_id: profileId,
    })
    if (error) {
      if (isMissingSocialSchemaError(new Error(error.message))) return []
      throw new Error(error.message)
    }
    return (data ?? []).map(mapMomentRow)
  },

  async createMoment(userId: string, title: string): Promise<SocialMomentSummary> {
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Moment title is required')

    const { data, error } = await db
      .from('moments')
      .insert({
        user_id: userId,
        title: trimmed,
        updated_at: new Date().toISOString(),
      })
      .select('id, user_id, title, updated_at')
      .single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title ?? trimmed,
      coverThumbnailUrl: undefined,
      storyCount: 0,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    }
  },

  async addStoryToMoment(userId: string, momentId: string, storyId: string): Promise<void> {
    const now = new Date().toISOString()
    const { error: insertError } = await db
      .from('moment_stories')
      .upsert({
        moment_id: momentId,
        story_id: storyId,
        added_at: now,
      }, { onConflict: 'moment_id,story_id' })
    if (insertError) throw new Error(insertError.message)

    const { error: momentError } = await db
      .from('moments')
      .update({
        updated_at: now,
      })
      .eq('id', momentId)
      .eq('user_id', userId)
    if (momentError) throw new Error(momentError.message)
  },

  async listReels(userId: string, cursor?: string | null): Promise<SocialCursorPage<SocialFeedPost>> {
    const { data, error } = await db.rpc('feed_reels', {
      viewer_id: userId,
      cursor_created_at: toIsoCursor(cursor),
      page_size: MAX_PAGE_SIZE,
    })
    if (!error) {
      const items = withoutOwnPosts(userId, (data ?? []).map(mapFeedRow))
      analytics.track('social_feed_impression', {
        source: 'reels',
        count: items.length,
      } as any)
      return toPage(items)
    }

    const page = await this.listExploreFeed(userId, cursor)
    return { items: page.items.filter((item) => item.authorId !== userId && item.postKind === 'reel'), nextCursor: page.nextCursor }
  },

  async updateOwnPost(
    userId: string,
    postId: string,
    updates: {
      caption?: string
      visibility?: SocialFeedPost['visibility']
      allowComments?: boolean
    },
  ): Promise<SocialFeedPost> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.caption !== undefined) payload.caption = updates.caption.trim() || null
    if (updates.visibility !== undefined) payload.visibility = updates.visibility
    if (updates.allowComments !== undefined) payload.allow_comments = updates.allowComments

    const { error } = await db
      .from('posts')
      .update(payload)
      .eq('id', postId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)

    const hydrated = await loadOwnedPostById(userId, postId)
    if (!hydrated) throw new Error('Post updated but could not be hydrated')
    return hydrated
  },

  async archiveOwnPost(userId: string, postId: string, archived = true): Promise<void> {
    const { error } = await db
      .from('posts')
      .update({
        is_archived: archived,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async deleteOwnPost(userId: string, postId: string): Promise<void> {
    const { error } = await db
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async listStories(userId: string): Promise<SocialStory[]> {
    const { data, error } = await db.rpc('stories_active', {
      viewer_id: userId,
      page_size: 40,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapStoryRow)
  },

  async createPost(userId: string, input: CreateSocialPostInput): Promise<CreateSocialPostResult> {
    const scheduledAt =
      typeof input.scheduledFor === 'string' && input.scheduledFor.trim()
        ? new Date(input.scheduledFor).toISOString()
        : null
    const { data, error } = await db
      .from('posts')
      .insert({
        user_id: userId,
        caption: input.caption.trim() || null,
        media_type: input.mediaType,
        visibility: input.visibility,
        post_kind: input.postKind,
        creative_edit: input.creativeEdit ?? null,
        render_status: input.renderStatus ?? (input.mediaType === 'video' && !input.playbackUrl && !input.playbackId ? 'processing' : 'ready'),
        render_error: input.renderError ?? null,
        allow_comments: input.allowComments ?? true,
        published_at: scheduledAt ? null : new Date().toISOString(),
        scheduled_for: scheduledAt,
        is_published: !scheduledAt,
        session_id: input.sessionId ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    const shouldPersistMedia = Boolean(
      input.mediaUrl
      || input.thumbnailUrl
      || input.playbackId
      || input.playbackUrl
      || input.videoAssetId
    )

    if (shouldPersistMedia) {
      const mediaProcessingStatus =
        input.renderStatus === 'processing'
          ? 'processing'
          : input.renderStatus === 'failed'
            ? 'failed'
            : 'ready'
      const { error: mediaError } = await db
        .from('post_media')
        .upsert({
          post_id: data.id,
          image_url: input.mediaType === 'image' ? input.mediaUrl ?? null : null,
          video_url: input.mediaType === 'video' ? input.mediaUrl ?? null : null,
          playback_url: input.playbackUrl ?? null,
          playback_id: input.playbackId ?? null,
          video_asset_id: input.videoAssetId ?? null,
          provider: input.videoProvider ?? null,
          duration_ms: input.durationMs ?? null,
          aspect_ratio: input.aspectRatio ?? null,
          media_processing_status: mediaProcessingStatus,
          cover_timestamp_ms: input.coverTimestampMs ?? null,
          poster_url: input.thumbnailUrl ?? (input.mediaType === 'image' ? input.mediaUrl ?? null : null),
        }, { onConflict: 'post_id' })
      if (mediaError) throw new Error(mediaError.message)
    }

    if (input.videoAssetId) {
      const { error: uploadLinkError } = await db
        .from('social_video_uploads')
        .update({
          post_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('asset_id', input.videoAssetId)
        .eq('user_id', userId)
      if (uploadLinkError) throw new Error(uploadLinkError.message)
    }

    if (input.draftId) {
      const draftPayload = scheduledAt
        ? {
            published_post_id: data.id,
            scheduled_for: scheduledAt,
            upload_status: 'scheduled',
            updated_at: new Date().toISOString(),
          }
        : {
            published_post_id: data.id,
            upload_status: input.mediaType === 'video' ? (input.videoAssetId ? 'processing' : 'ready') : 'ready',
            updated_at: new Date().toISOString(),
          }
      const { error: draftError } = await db
        .from('creator_drafts')
        .update(draftPayload)
        .eq('id', input.draftId)
        .eq('user_id', userId)
      if (draftError) throw new Error(draftError.message)
    }

    analytics.track('social_post_created', {
      postKind: input.postKind,
      visibility: input.visibility,
      mediaType: input.mediaType,
      scheduled: Boolean(scheduledAt),
    } as any)

    if (scheduledAt) {
      return {
        post: null,
        scheduled: true,
      }
    }

    const created = await loadOwnedPostById(userId, data.id)
    if (!created) {
      throw new Error('Post created but could not be hydrated')
    }
    return {
      post: created,
      scheduled: false,
    }
  },

  async saveDraft(
    userId: string,
    input: Omit<CreateSocialPostInput, 'sessionId'> & {
      id?: string
      publishTarget?: SocialCreatorDraft['publishTarget']
      sourceMediaUrl?: string
      sourceThumbnailUrl?: string
      sourceMediaType?: SocialCreatorDraft['sourceMediaType']
      renderJobId?: string
      coverTimestampMs?: number
      uploadStatus?: SocialCreatorDraft['uploadStatus']
      uploadProgress?: number
      failedReason?: string
    },
  ): Promise<SocialCreatorDraft> {
    const payload = {
      user_id: userId,
      publish_target: input.publishTarget ?? (input.postKind === 'reel' ? 'reel' : 'post'),
      caption: input.caption.trim() || null,
      media_type: input.mediaType,
      post_kind: input.postKind,
      visibility: input.visibility,
      upload_url: input.mediaUrl ?? null,
      source_media_url: input.sourceMediaUrl ?? input.mediaUrl ?? null,
      source_thumbnail_url: input.sourceThumbnailUrl ?? input.thumbnailUrl ?? null,
      source_media_type: input.sourceMediaType ?? input.mediaType,
      thumbnail_url: input.thumbnailUrl ?? null,
      cover_timestamp_ms: input.coverTimestampMs ?? null,
      video_asset_id: input.videoAssetId ?? null,
      video_provider: input.videoProvider ?? null,
      render_job_id: input.renderJobId ?? null,
      upload_status: input.uploadStatus ?? (input.videoAssetId ? 'uploaded' : 'idle'),
      upload_progress: input.uploadProgress ?? (input.videoAssetId ? 100 : 0),
      failed_reason: input.failedReason ?? null,
      duration_ms: input.durationMs ?? null,
      aspect_ratio: input.aspectRatio ?? null,
      trim_start_ms: input.trimStartMs ?? null,
      trim_end_ms: input.trimEndMs ?? null,
      creative_edit: input.creativeEdit ?? null,
      render_status: input.renderStatus ?? 'idle',
      render_error: input.renderError ?? null,
      scheduled_for: input.scheduledFor ? new Date(input.scheduledFor).toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db
      .from('creator_drafts')
      .upsert(input.id ? { ...payload, id: input.id } : payload, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapDraftRow(data)
  },

  async listDrafts(userId: string): Promise<SocialCreatorDraft[]> {
    const { data, error } = await db
      .from('creator_drafts')
      .select('*')
      .eq('user_id', userId)
      .is('published_post_id', null)
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapDraftRow)
  },

  async listMusicTracks(): Promise<SocialMusicTrack[]> {
    const { data, error } = await db
      .from('social_music_tracks')
      .select('id, slug, title, artist, preview_url, artwork_url, duration_ms')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      if (isMissingSocialSchemaError(error)) return SOCIAL_MUSIC_TRACK_FALLBACKS
      throw new Error(error.message)
    }

    const items = (data ?? [])
      .map((row: any) => ({
        id: row.id,
        slug: row.slug ?? row.id,
        title: row.title ?? 'Untitled track',
        artist: row.artist ?? 'Dagestani Disciple',
        previewUrl: row.preview_url ?? '',
        artworkUrl: row.artwork_url ?? undefined,
        durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : 15_000,
      }))
      .filter((row: SocialMusicTrack) => row.previewUrl.length > 0)

    return items.length > 0 ? items : SOCIAL_MUSIC_TRACK_FALLBACKS
  },

  async requestVideoUploadIntent(
    fileName: string,
    contentType: string,
    clientUploadKey?: string,
  ): Promise<{ uploadUrl: string; assetId: string; provider: SocialVideoProvider; reused?: boolean }> {
    const { data, error } = await db.functions.invoke('social-video-upload-intent', {
      body: {
        fileName,
        contentType,
        clientUploadKey: clientUploadKey?.trim() || undefined,
      },
    })
    if (error) throw new Error(error.message)
    const response = {
      uploadUrl: data?.uploadUrl,
      assetId: data?.assetId,
      provider: (data?.provider ?? 'mux') as SocialVideoProvider,
      reused: Boolean(data?.reused),
    }
    if (!response.uploadUrl || !response.assetId) {
      throw new Error('Upload intent response is incomplete')
    }
    analytics.track('social_video_upload_intent_created', {
      provider: response.provider,
      reused: Boolean(response.reused),
    } as any)
    return response
  },

  async uploadVideoFile(uploadUrl: string, file: File, onProgress?: (progressPercent: number) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('PUT', uploadUrl)
      if (file.type) {
        request.setRequestHeader('Content-Type', file.type)
      }
      request.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable || !onProgress) return
        onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))))
      })
      request.onerror = () => reject(new Error('Video upload failed'))
      request.onabort = () => reject(new Error('Video upload was cancelled'))
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(100)
          resolve()
          return
        }
        reject(new Error(`Video upload failed (${request.status})`))
      }
      request.send(file)
    })
  },

  async trackPlaybackEvent(
    userId: string,
    postId: string,
    payload: { surface: 'reels' | 'profile' | 'home' | 'explore' | 'following' | 'for_you'; watchMs?: number; completed?: boolean; skipped?: boolean; replayed?: boolean },
  ): Promise<void> {
    await db.rpc('record_feed_event', {
      viewer_id: userId,
      post_id: postId,
      surface_name: payload.surface,
      watch_ms: payload.watchMs ?? 0,
      completed_view: Boolean(payload.completed),
      skipped_view: Boolean(payload.skipped),
      replayed_view: Boolean(payload.replayed),
    })

    if ((payload.watchMs ?? 0) <= 0) {
      analytics.track('social_reel_watch_started', { postId, surface: payload.surface } as any)
      return
    }
    if (payload.completed) {
      analytics.track('social_reel_watch_completed', { postId, surface: payload.surface } as any)
      return
    }
    analytics.track('social_reel_watch_progress', { postId, surface: payload.surface, watchMs: payload.watchMs ?? 0 } as any)
  },

  async trackPlaybackMilestone(
    userId: string,
    postId: string,
    payload: { surface: 'reels' | 'profile' | 'home' | 'explore' | 'following' | 'for_you'; milestone: SocialPlaybackMilestone; watchMs?: number },
  ): Promise<void> {
    const { error } = await db.rpc('record_playback_milestone', {
      viewer_id: userId,
      post_id: postId,
      surface_name: payload.surface,
      milestone_name: payload.milestone,
      watch_ms: payload.watchMs ?? 0,
    })
    if (error) throw new Error(error.message)

    if (payload.milestone === 'impression') {
      analytics.track('social_reel_impression', { postId, surface: payload.surface } as any)
      return
    }
    if (payload.milestone === 'view_2s') {
      analytics.track('social_reel_view_2s', { postId, surface: payload.surface, watchMs: payload.watchMs ?? 0 } as any)
      return
    }
    if (payload.milestone === 'quartile_25' || payload.milestone === 'quartile_50' || payload.milestone === 'quartile_75') {
      analytics.track('social_reel_quartile', { postId, surface: payload.surface, milestone: payload.milestone } as any)
      return
    }
    if (payload.milestone === 'skip') {
      analytics.track('social_reel_skipped', { postId, surface: payload.surface, watchMs: payload.watchMs ?? 0 } as any)
      return
    }
    if (payload.milestone === 'replay') {
      analytics.track('social_reel_replayed', { postId, surface: payload.surface } as any)
    }
  },

  async submitNegativeFeedback(userId: string, postId: string, feedbackType: 'not_interested' | 'hide' | 'report'): Promise<void> {
    const { error } = await db.rpc('submit_negative_feedback', {
      viewer_id: userId,
      target_post_id: postId,
      feedback: feedbackType,
    })
    if (error) throw new Error(error.message)
    analytics.track('social_negative_feedback' as any, { postId, feedbackType } as any)
  },

  async reportPost(
    userId: string,
    postId: string,
    reason: string,
    details?: string,
    evidenceUrls: string[] = [],
  ): Promise<void> {
    const { data: postRow, error: postError } = await db
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle()
    if (postError) throw new Error(postError.message)

    const { data: reportRow, error } = await db
      .from('social_reports')
      .insert({
        reporter_user_id: userId,
        target_user_id: postRow?.user_id ?? null,
        post_id: postId,
        reason,
        details: details ?? null,
        evidence_urls: evidenceUrls,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    if (!reportRow?.id) {
      throw new Error('Report was created without an identifier')
    }
  },

  async refreshRankFeatureRollups(): Promise<number> {
    const { data, error } = await db.rpc('refresh_social_post_feature_rollups')
    if (error) throw new Error(error.message)
    return Number(data ?? 0)
  },

  async retryScheduledDraft(userId: string, draftId: string, scheduledFor: string): Promise<void> {
    const parsedSchedule = new Date(scheduledFor)
    if (Number.isNaN(parsedSchedule.getTime())) {
      throw new Error('scheduledFor must be a valid date')
    }
    const { error } = await db
      .from('creator_drafts')
      .update({
        scheduled_for: parsedSchedule.toISOString(),
        upload_status: 'scheduled',
        failed_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const { error } = await db.from('social_blocks').insert({
      blocker_user_id: userId,
      blocked_user_id: blockedUserId,
    })
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
  },

  async muteUser(userId: string, mutedUserId: string): Promise<void> {
    const { error } = await db.from('social_mutes').insert({
      muter_user_id: userId,
      muted_user_id: mutedUserId,
    })
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
  },

  async listTrendingTopics(): Promise<SocialTopicSummary[]> {
    const { data, error } = await db.rpc('social_trending_topics', {
      page_size: 12,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any) => ({
      slug: row.slug,
      label: row.label,
      postCount: Number(row.post_count ?? 0),
    }))
  },

  async listModerationQueue(status: 'open' | 'reviewing' | 'actioned' | 'dismissed' = 'open'): Promise<SocialModerationQueueItem[]> {
    const { data, error } = await db.rpc('social_moderation_queue_page', {
      page_size: 50,
      status_filter: status,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapModerationRow)
  },

  async resolveModerationItem(
    queueItemId: string,
    status: 'reviewing' | 'actioned' | 'dismissed',
    action: 'none' | 'archive_post' | 'block_user' = 'none',
    notes?: string,
  ): Promise<void> {
    const { error } = await db.rpc('resolve_social_moderation_item', {
      queue_item_id: queueItemId,
      next_status: status,
      action,
      notes: notes ?? null,
    })
    if (error) throw new Error(error.message)
  },

  async createStory(
    userId: string,
    input: Pick<CreateSocialPostInput, 'caption' | 'visibility' | 'mediaType' | 'mediaUrl' | 'thumbnailUrl' | 'creativeEdit' | 'renderStatus' | 'renderError' | 'durationMs'>,
  ): Promise<void> {
    if (!input.mediaUrl) {
      throw new Error('Story mediaUrl is required')
    }

    const { error } = await db
      .from('stories')
      .insert({
        user_id: userId,
        media_type: input.mediaType,
        media_url: input.mediaUrl,
        thumbnail_url: input.thumbnailUrl ?? null,
        caption: input.caption.trim() || null,
        visibility: input.visibility,
        duration_ms: input.durationMs ?? null,
        creative_edit: input.creativeEdit ?? null,
        render_status: input.renderStatus ?? 'ready',
        render_error: input.renderError ?? null,
      })
    if (error) throw new Error(error.message)

    analytics.track('social_story_created', {
      visibility: input.visibility,
      mediaType: input.mediaType,
    } as any)
  },

  async markStoryViewed(userId: string, storyId: string): Promise<void> {
    const { error } = await db
      .from('story_views')
      .upsert({
        story_id: storyId,
        viewer_user_id: userId,
      }, { onConflict: 'story_id,viewer_user_id' })
    if (error) throw new Error(error.message)
  },
}
