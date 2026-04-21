import assert from 'node:assert/strict'
import type { UserProfile } from '../src/lib/user-profile-types'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

async function main() {
  const { createDefaultBjjState } = await import('../src/lib/bjj-seed')
  const { supabase } = await import('../src/lib/supabase')
  const { bjjService } = await import('../src/lib/bjj-service')
  const { createMockFrom, createMockStorage } = await import('./lib/mock-supabase')

  const tables: Record<string, any[]> = {
    profiles: [
      {
        id: 'user-1',
        username: 'enes',
        display_name: 'Enes',
        avatar_url: null,
        bio: '',
        sport: 'bjj',
        created_at: '2026-04-06T09:00:00.000Z',
        training_days: 3,
        weight_unit: 'kg',
        equipment: null,
        experience_level: 'beginner',
        bodyweight_kg: null,
        primary_goal: 'skill',
        combat_sessions_per_week: 3,
        session_minutes: 90,
        injury_notes: null,
        is_premium: false,
        first_active_at: null,
        stripe_customer_id: null,
        subscription_status: null,
        subscription_period_end: null,
        onboarding_completed: false,
        belt: 'white',
        stripes: 0,
        gym_name: '',
        privacy: 'public',
        xp: 50,
        level: 1,
        heard_from: null,
        biggest_challenges: [],
        bjj_paywall_completed: false,
        bjj_coach_marks_seen: false,
        updated_at: '2026-04-06T09:00:00.000Z',
      },
      {
        id: 'coach-2',
        username: 'coach',
        display_name: 'Coach',
        avatar_url: null,
        bio: '',
        sport: 'bjj',
        created_at: '2026-04-06T09:00:00.000Z',
        training_days: 4,
        weight_unit: 'kg',
        equipment: null,
        experience_level: 'advanced',
        bodyweight_kg: null,
        primary_goal: 'skill',
        combat_sessions_per_week: 4,
        session_minutes: 90,
        injury_notes: null,
        is_premium: true,
        first_active_at: null,
        stripe_customer_id: null,
        subscription_status: 'active',
        subscription_period_end: null,
        onboarding_completed: true,
        belt: 'black',
        stripes: 4,
        gym_name: 'Dagestan HQ',
        privacy: 'public',
        xp: 900,
        level: 4,
        heard_from: 'Friends',
        biggest_challenges: [],
        bjj_paywall_completed: true,
        bjj_coach_marks_seen: true,
        updated_at: '2026-04-06T09:00:00.000Z',
      },
    ],
    user_stats: [
      {
        user_id: 'user-1',
        workout_count: 0,
        follower_count: 0,
        following_count: 0,
        total_saves: 0,
        current_streak: 0,
        longest_streak: 0,
        last_workout_date: null,
        flow_streak: 1,
        training_streak: 0,
      },
      {
        user_id: 'coach-2',
        workout_count: 5,
        follower_count: 0,
        following_count: 0,
        total_saves: 0,
        current_streak: 0,
        longest_streak: 0,
        last_workout_date: null,
        flow_streak: 4,
        training_streak: 3,
      },
    ],
    techniques: [
      {
        id: 'disc-triangle-choke',
        title: 'Triangle Choke',
        category: 'submission',
        description: 'A closed guard staple.',
        tutorial_title: 'Triangle From Broken Posture',
        tutorial_thumbnail: null,
        tags: ['Submission', 'Beginner'],
        links: ['https://example.com/triangle'],
        media: [],
        linked_technique_ids: [],
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T09:00:00.000Z',
      },
    ],
    user_techniques: [],
    technique_tags: [],
    technique_links: [],
    training_sessions: [],
    training_session_techniques: [],
    systems: [
      {
        id: 'system-closed-guard',
        title: 'Closed Guard Attacks',
        summary: 'Scissor sweep into triangle and armbar.',
        locked: false,
        user_id: null,
        visibility: 'private',
        sort_order: 0,
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T10:30:00.000Z',
      },
    ],
    system_nodes: [
      { id: 'node-a', system_id: 'system-closed-guard', label: 'Break Posture', color: '#3b82f6', sort_order: 0, layout_x: null, layout_y: null, created_at: '2026-04-06T09:00:00.000Z' },
      { id: 'node-b', system_id: 'system-closed-guard', label: 'Triangle', color: '#ef4444', sort_order: 1, layout_x: null, layout_y: null, created_at: '2026-04-06T09:00:00.000Z' },
    ],
    system_edges: [
      {
        id: 'edge-a',
        system_id: 'system-closed-guard',
        from_node_id: 'node-a',
        to_node_id: 'node-b',
        label: null,
        created_at: '2026-04-06T09:00:00.000Z',
      },
    ],
    system_node_techniques: [],
    user_system_access: [],
    follows: [],
    follow_requests: [],
    notifications: [],
    training_session_likes: [],
    training_session_comments: [],
    invite_links: [],
    challenge_progress: [],
    achievement_progress: [],
    challenge_definitions: [
      {
        id: 'challenge-warrior',
        title: 'Weekly Warrior',
        summary: 'Complete 3 training sessions this week.',
        goal: 3,
        xp_reward: 50,
        difficulty: 'beginner',
        sort_order: 0,
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T09:00:00.000Z',
      },
      {
        id: 'challenge-collector',
        title: 'Dedicated Practitioner',
        summary: 'Save 5 techniques to your library.',
        goal: 5,
        xp_reward: 100,
        difficulty: 'beginner',
        sort_order: 1,
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T09:00:00.000Z',
      },
    ],
    achievement_definitions: [
      {
        id: 'ach-first-session',
        title: 'Showed Up',
        summary: 'Log your first training session.',
        goal: 1,
        sort_order: 0,
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T09:00:00.000Z',
      },
      {
        id: 'ach-technique-web',
        title: 'System Builder',
        summary: 'Link 10 techniques together.',
        goal: 10,
        sort_order: 1,
        created_at: '2026-04-06T09:00:00.000Z',
        updated_at: '2026-04-06T09:00:00.000Z',
      },
    ],
  }

  const originalFrom = supabase.from.bind(supabase)
  const originalStorage = supabase.storage
  const originalRpc = (supabase as any).rpc?.bind(supabase)

  ;(supabase as any).from = createMockFrom(tables)
  ;(supabase as any).storage = createMockStorage()
  ;(supabase as any).rpc = async (fn: string, params?: Record<string, unknown>) => {
    if (fn === 'bjj_leaderboard_sessions_for_month') {
      const monthStart = String(params?.month_start ?? '2026-04-01')
      const y = Number(monthStart.slice(0, 4))
      const m = Number(monthStart.slice(5, 7))
      const prefix = `${y}-${String(m).padStart(2, '0')}`
      const counts = new Map<string, number>()
      for (const row of tables.training_sessions ?? []) {
        const d = String(row.session_date ?? '')
        if (!d.startsWith(prefix)) continue
        const uid = String(row.user_id ?? '')
        if (!uid) continue
        counts.set(uid, (counts.get(uid) ?? 0) + 1)
      }
      const rows = (tables.profiles ?? [])
        .filter((p: { onboarding_completed?: boolean }) => p.onboarding_completed)
        .map((p: { id: string; display_name: string; username: string }) => {
          const id = String(p.id)
          return {
            id,
            name: p.display_name,
            handle: `@${p.username}`,
            score: counts.get(id) ?? 0,
          }
        })
        .sort((a: { score: number; name: string }, b: { score: number; name: string }) => (
          b.score - a.score || String(a.name).localeCompare(String(b.name))
        ))
      return { data: rows, error: null }
    }
    if (fn === 'public_profile_cards_batch') {
      const ids = Array.isArray(params?.p_user_ids) ? params.p_user_ids.map(String) : []
      const rows = (tables.profiles ?? [])
        .filter((profile: any) => ids.includes(String(profile.id)))
        .map((profile: any) => ({
          user_id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url ?? null,
        }))
      return { data: rows, error: null }
    }
    if (fn === 'request_or_follow') {
      const requesterId = String(params?.requester_id ?? '')
      const targetId = String(params?.target_id ?? '')
      if (!requesterId || !targetId || requesterId === targetId) {
        return { data: 'noop', error: null }
      }
      const targetProfile = tables.profiles.find((profile) => profile.id === targetId)
      if ((targetProfile?.privacy ?? 'public') === 'private') {
        const existing = tables.follow_requests.find((row) => row.requester_user_id === requesterId && row.target_user_id === targetId)
        if (existing) {
          Object.assign(existing, {
            status: 'pending',
            responded_at: null,
            created_at: '2026-04-06T12:00:00.000Z',
          })
        } else {
          tables.follow_requests.push({
            id: `follow-request-${tables.follow_requests.length + 1}`,
            requester_user_id: requesterId,
            target_user_id: targetId,
            status: 'pending',
            responded_at: null,
            created_at: '2026-04-06T12:00:00.000Z',
          })
        }
        return { data: 'requested', error: null }
      }
      if (!tables.follows.some((row) => row.follower_user_id === requesterId && row.following_user_id === targetId)) {
        tables.follows.push({
          id: `follow-${tables.follows.length + 1}`,
          follower_user_id: requesterId,
          following_user_id: targetId,
          created_at: '2026-04-06T12:00:00.000Z',
        })
      }
      return { data: 'followed', error: null }
    }
    if (fn === 'respond_follow_request') {
      const request = tables.follow_requests.find((row) => row.id === params?.request_id)
      if (!request) return { data: null, error: { message: 'Follow request not found' } }
      request.status = params?.accept_request ? 'accepted' : 'rejected'
      request.responded_at = '2026-04-06T12:00:00.000Z'
      if (params?.accept_request && !tables.follows.some((row) => (
        row.follower_user_id === request.requester_user_id && row.following_user_id === request.target_user_id
      ))) {
        tables.follows.push({
          id: `follow-${tables.follows.length + 1}`,
          follower_user_id: request.requester_user_id,
          following_user_id: request.target_user_id,
          created_at: '2026-04-06T12:00:00.000Z',
        })
      }
      return { data: params?.accept_request ? 'accepted' : 'rejected', error: null }
    }
    if (fn === 'search_public_profiles') {
      const branch = String(params?.p_branch ?? 'bjj')
      const query = String(params?.p_query ?? '').trim().toLowerCase()
      const limit = Number(params?.p_limit ?? 24)
      const rows = (tables.profiles ?? [])
        .filter((profile: any) => (profile.privacy ?? 'public') === 'public')
        .filter((profile: any) => String(profile.primary_discipline ?? profile.sport ?? 'bjj') === branch)
        .filter((profile: any) => {
          if (!query) return true
          return String(profile.username ?? '').toLowerCase().includes(query)
            || String(profile.display_name ?? '').toLowerCase().includes(query)
        })
        .slice(0, Number.isFinite(limit) ? limit : 24)
        .map((profile: any) => ({
          user_id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url ?? null,
          primary_discipline: profile.primary_discipline ?? profile.sport ?? 'bjj',
          branch: profile.primary_discipline ?? profile.sport ?? 'bjj',
          privacy: profile.privacy ?? 'public',
          follower_count: (tables.follows ?? []).filter((row: any) => row.following_user_id === profile.id).length,
          following_count: (tables.follows ?? []).filter((row: any) => row.follower_user_id === profile.id).length,
          viewer_follows: false,
          viewer_requested: false,
        }))
      return { data: rows, error: null }
    }
    if (fn === 'save_user_system_graph') {
      const input = (params?.p_input ?? {}) as any
      const systemId = String(input.id ?? `user-system-${tables.systems.length + 1}`)
      const updatedAt = '2026-04-06T12:00:00.000Z'
      const systemRow = {
        id: systemId,
        title: String(input.title ?? 'System'),
        summary: String(input.summary ?? ''),
        locked: false,
        user_id: 'user-1',
        visibility: input.visibility === 'public' ? 'public' : 'private',
        branch: String(input.branch ?? 'bjj'),
        sort_order: Number(input.sortOrder ?? 5000),
        created_at: updatedAt,
        updated_at: updatedAt,
      }
      const existing = tables.systems.find((row) => row.id === systemId)
      if (existing) {
        Object.assign(existing, systemRow)
      } else {
        tables.systems.push(systemRow)
      }
      tables.system_nodes = tables.system_nodes.filter((row) => row.system_id !== systemId)
      tables.system_edges = tables.system_edges.filter((row) => row.system_id !== systemId)
      tables.system_node_techniques = tables.system_node_techniques.filter((row) => row.system_id !== systemId)
      for (const [index, node] of (Array.isArray(input.nodes) ? input.nodes : []).entries()) {
        tables.system_nodes.push({
          id: node.id,
          system_id: systemId,
          label: node.label,
          color: node.color,
          sort_order: Number(node.sortOrder ?? index),
          layout_x: node.layout?.x ?? null,
          layout_y: node.layout?.y ?? null,
          created_at: updatedAt,
        })
        for (const techniqueId of Array.isArray(node.linkedTechniqueIds) ? node.linkedTechniqueIds : []) {
          const technique = tables.user_techniques.find((row) => row.id === techniqueId)
          tables.system_node_techniques.push({
            id: `snt-${tables.system_node_techniques.length + 1}`,
            system_id: systemId,
            node_id: node.id,
            technique_id: techniqueId,
            technique_title_snapshot: technique?.title ?? 'Technique',
            created_at: updatedAt,
          })
        }
      }
      for (const edge of Array.isArray(input.edges) ? input.edges : []) {
        tables.system_edges.push({
          id: `edge-${tables.system_edges.length + 1}`,
          system_id: systemId,
          from_node_id: edge.from,
          to_node_id: edge.to,
          label: edge.label ?? null,
          created_at: updatedAt,
        })
      }
      return { data: { id: systemId, updatedAt }, error: null }
    }
    return { data: null, error: { message: `unknown rpc ${fn}` } }
  }

  try {
    const cachedState = createDefaultBjjState('Enes', 'enes')
    cachedState.profile.belt = 'blue'
    cachedState.profile.stripes = 1
    cachedState.profile.onboardingCompleted = true
    cachedState.profile.paywallCompleted = true
    cachedState.profile.coachMarksSeen = true
    cachedState.profile.heardFrom = 'Friends'
    cachedState.profile.biggestChallenges = ['Training feels scattered']
    cachedState.libraryTechniques = [
      {
        id: 'lib-local-test',
        branch: 'bjj',
        title: 'Local Test Technique',
        category: 'submission',
        tags: ['Closed Guard', 'Submission'],
        notes: 'Local cache note',
        description: 'Migrated from local cache.',
        tutorialTitle: 'Local Cache Technique',
        tutorialThumbnail: undefined,
        media: [],
        links: ['https://example.com/local-technique'],
        linkedTechniqueIds: [],
        createdAt: '2026-04-06T09:00:00.000Z',
        updatedAt: '2026-04-06T09:00:00.000Z',
        ownership: 'library',
      },
    ]
    cachedState.sessions = [
      {
        id: 'session-local',
        branch: 'bjj',
        date: '2026-04-06',
        time: '10:15',
        location: 'Dagestani HQ',
        type: 'No-Gi',
        submissions: ['Triangle Choke'],
        taps: [],
        durationMinutes: 75,
        notes: 'Good round quality.',
        satisfaction: 4,
        taggedFriends: ['Coach'],
        visibility: 'everyone',
        caption: 'Posting my first real session.',
        linkedTechniqueIds: ['lib-local-test'],
        createdAt: '2026-04-06T10:15:00.000Z',
      },
    ]

    const userProfile: UserProfile = {
      id: 'user-1',
      username: 'enes',
      displayName: 'Enes',
      sport: 'bjj',
      createdAt: '2026-04-06T09:00:00.000Z',
      workoutCount: 0,
      followerCount: 0,
      followingCount: 0,
      totalSaves: 0,
    }

    const snapshot = await bjjService.getShellSnapshot(userProfile, cachedState)

    assert.equal(snapshot.profilePatch.belt, 'blue')
    assert.equal(snapshot.profilePatch.stripes, 1)
    assert.equal(snapshot.profilePatch.onboardingCompleted, true)
    assert.equal(snapshot.libraryTechniques.some((technique) => technique.id === 'lib-local-test'), true)
    assert.equal(snapshot.sessions.some((session) => session.location === 'Dagestani HQ'), true)
    assert.equal(tables.user_techniques.some((row) => row.id === 'lib-local-test'), true)
    assert.equal(tables.training_sessions.some((row) => row.client_id === 'session-local'), true)
    assert.equal(tables.profiles[0].belt, 'blue')

    tables.profiles[0].onboarding_completed = true
    tables.profiles[0].bjj_paywall_completed = true
    tables.profiles[0].bjj_coach_marks_seen = true

    const coldStartDefault = createDefaultBjjState('Enes', 'enes')
    const coldStartSnapshot = await bjjService.getShellSnapshot(userProfile, coldStartDefault)

    assert.equal(coldStartSnapshot.profilePatch.onboardingCompleted, true)
    assert.equal(coldStartSnapshot.profilePatch.paywallCompleted, true)
    assert.equal(coldStartSnapshot.profilePatch.coachMarksSeen, true)
    assert.equal(tables.profiles[0].onboarding_completed, true)
    assert.equal(tables.profiles[0].bjj_paywall_completed, true)
    assert.equal(tables.profiles[0].bjj_coach_marks_seen, true)

    const savedTechnique = await bjjService.addCatalogTechniqueToLibrary('user-1', 'disc-triangle-choke')
    assert.equal(savedTechnique.catalogTechniqueId, 'disc-triangle-choke')
    assert.equal(tables.user_techniques.some((row) => row.catalog_technique_id === 'disc-triangle-choke'), true)
    assert.ok(Number(tables.profiles[0].xp) >= 65)

    await bjjService.followUser('coach-2', 'user-1')
    assert.equal(tables.follows.length, 1)
    assert.equal(tables.notifications.some((row) => row.user_id === 'user-1' && row.kind === 'follow'), true)

    await bjjService.likeFeedPost('user-1', 'session-post-session-local')
    assert.equal(tables.training_session_likes.length, 1)

    const commentRows = await bjjService.addCommentToPost('user-1', 'session-post-session-local', 'Sharp round.')
    assert.equal(commentRows.length, 1)
    assert.equal(tables.training_session_comments.length, 1)

    const inviteUrl = await bjjService.getInviteLink('user-1', 'https://app.example.com')
    assert.match(inviteUrl, /\?invite=/)
    assert.equal(tables.invite_links.length, 1)

    await bjjService.markNotificationsRead('user-1')
    assert.equal(tables.notifications.filter((row) => row.user_id === 'user-1').every((row) => row.read === true), true)

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const avatarUrl = await bjjService.uploadProfilePhoto('user-1', file)
    assert.match(avatarUrl, /profile-images/)
    assert.match(String(tables.profiles[0].avatar_url), /profile-images/)

    const sessionPhotoUrl = await bjjService.uploadSessionPhoto('user-1', file)
    assert.match(sessionPhotoUrl, /session-media/)

    console.log('BJJ service tests passed.')
  } finally {
    ;(supabase as any).from = originalFrom
    ;(supabase as any).storage = originalStorage
    if (originalRpc) {
      ;(supabase as any).rpc = originalRpc
    }
  }
}

void main()
