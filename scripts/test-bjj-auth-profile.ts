import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

async function main() {
  const { supabase } = await import('../src/lib/supabase')
  const { supabaseService } = await import('../src/lib/supabase-service')
  const { createMockFrom } = await import('./lib/mock-supabase')
  const { Capacitor } = await import('@capacitor/core')

  const tables = {
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
        primary_discipline: null,
        xp: 50,
        level: 1,
        favorite_content_types: [],
        heard_from: null,
        biggest_challenges: [],
        bjj_paywall_completed: false,
        bjj_coach_marks_seen: false,
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
    ],
  }

  const bootstrapTables = {
    profiles: [] as any[],
    user_stats: [] as any[],
  }

  const originalFrom = supabase.from.bind(supabase)
  const originalRpc = typeof supabase.rpc === 'function' ? supabase.rpc.bind(supabase) : null
  const originalOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth)
  const originalResetPassword = supabase.auth.resetPasswordForEmail.bind(supabase.auth)
  const originalIsNativePlatform = Capacitor.isNativePlatform.bind(Capacitor)
  const originalGetPlatform = Capacitor.getPlatform.bind(Capacitor)
  const originalLiveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalGoogleWebClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID

  let assignedUrl = ''
  let oauthProvider = ''
  let oauthRedirectTo = ''
  let resetRedirectTo = ''

  const previousWindow = (globalThis as any).window
  ;(globalThis as any).window = {
    location: {
      origin: 'https://app.example.com',
      assign(url: string) {
        assignedUrl = url
      },
    },
  }

  ;(supabase as any).from = createMockFrom(tables)
  ;(supabase as any).rpc = async (fn: string, args?: Record<string, unknown>) => {
    if (fn === 'username_is_available') {
      const normalized = String(args?.p_username ?? '').toLowerCase().trim()
      const exclude = args?.p_exclude_user_id ?? null
      const allProfiles = [...tables.profiles, ...bootstrapTables.profiles]
      const taken = allProfiles.some(
        (p) => String(p.username).toLowerCase() === normalized && p.id !== exclude,
      )
      return { data: !taken, error: null }
    }
    if (fn === 'ensure_profile_from_auth') {
      bootstrapTables.profiles.push({
        id: 'oauth-user-1',
        username: 'apple_user',
        display_name: 'apple.user',
        avatar_url: null,
        bio: '',
        sport: 'bjj',
        created_at: '2026-04-06T12:00:00.000Z',
        training_days: 3,
        weight_unit: 'kg',
        equipment: null,
        experience_level: 'beginner',
        bodyweight_kg: null,
        primary_goal: 'balanced',
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
        primary_discipline: null,
        xp: 50,
        level: 1,
        favorite_content_types: [],
        heard_from: null,
        biggest_challenges: [],
        bjj_paywall_completed: false,
        bjj_coach_marks_seen: false,
        search_tutorial_seen: false,
        updated_at: '2026-04-06T12:00:00.000Z',
      })
      bootstrapTables.user_stats.push({
        user_id: 'oauth-user-1',
        workout_count: 0,
        follower_count: 0,
        following_count: 0,
        total_saves: 0,
        current_streak: 0,
        longest_streak: 0,
        last_workout_date: null,
        flow_streak: 1,
        training_streak: 0,
      })
      return { data: null, error: null }
    }
    if (originalRpc) {
      return (originalRpc as any)(fn, args)
    }
    return { data: null, error: { message: `unmocked rpc ${fn}` } }
  }
  ;(supabase.auth.signInWithOAuth as unknown as typeof supabase.auth.signInWithOAuth) = async (params: any) => {
    oauthProvider = params.provider
    oauthRedirectTo = params.options?.redirectTo ?? ''
    return {
      data: {
        provider: params.provider,
        url: 'https://auth.example.com/oauth',
      },
      error: null,
    } as any
  }
  ;(supabase.auth.resetPasswordForEmail as unknown as typeof supabase.auth.resetPasswordForEmail) = async (_email: string, options: any) => {
    resetRedirectTo = options.redirectTo
    return {
      data: {},
      error: null,
    } as any
  }

  try {
    await supabaseService.signInWithOAuth('google')
    assert.equal(oauthProvider, 'google')
    assert.equal(oauthRedirectTo, 'https://app.example.com')
    assert.equal(assignedUrl, 'https://auth.example.com/oauth')
    assert.equal(String(oauthRedirectTo).startsWith('dagestanidiscipline://'), false)

    ;(Capacitor as any).isNativePlatform = () => true
    ;(Capacitor as any).getPlatform = () => 'ios'
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID = ''
    oauthProvider = ''
    let missingNativeClientIdError: Error | null = null
    try {
      await supabaseService.signInWithOAuth('google')
    } catch (error) {
      missingNativeClientIdError = error as Error
    }
    assert.ok(missingNativeClientIdError, 'Expected missing native Google client ID to throw')
    assert.match(missingNativeClientIdError!.message, /NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID/)
    assert.equal(oauthProvider, '', 'Native iOS flow should not invoke Supabase signInWithOAuth')

    ;(Capacitor as any).isNativePlatform = () => false
    ;(globalThis as any).window.location.origin = 'https://app.example.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com'

    await supabaseService.resetPassword('enes@example.com')
    assert.equal(resetRedirectTo, 'https://app.example.com/reset-password')

    const updatedProfile = await supabaseService.updateProfile('user-1', {
      displayName: 'Enes Orhan',
      username: 'enesorhan',
      belt: 'blue',
      stripes: 2,
      gymName: 'Dagestani HQ',
      privacy: 'private',
      primaryDiscipline: 'BJJ',
      experienceLevel: 'intermediate',
      xp: 125,
      level: 1,
      favoriteContentTypes: ['Technique breakdowns'],
      heardFrom: 'Friends',
      biggestChallenges: ['Training feels scattered'],
      onboardingCompleted: true,
      paywallCompleted: true,
      coachMarksSeen: true,
      flowStreak: 3,
      trainingStreak: 2,
    })

    assert.equal(updatedProfile.displayName, 'Enes Orhan')
    assert.equal(updatedProfile.username, 'enesorhan')
    assert.equal(updatedProfile.belt, 'blue')
    assert.equal(updatedProfile.stripes, 2)
    assert.equal(updatedProfile.gymName, 'Dagestani HQ')
    assert.equal(updatedProfile.privacy, 'private')
    assert.equal(updatedProfile.primaryDiscipline, 'BJJ')
    assert.equal(updatedProfile.experienceLevel, 'intermediate')
    assert.equal(updatedProfile.xp, 125)
    assert.deepEqual(updatedProfile.favoriteContentTypes, ['Technique breakdowns'])
    assert.equal(updatedProfile.heardFrom, 'Friends')
    assert.deepEqual(updatedProfile.biggestChallenges, ['Training feels scattered'])
    assert.equal(updatedProfile.onboardingCompleted, true)
    assert.equal(updatedProfile.paywallCompleted, true)
    assert.equal(updatedProfile.coachMarksSeen, true)
    assert.equal(updatedProfile.flowStreak, 3)
    assert.equal(updatedProfile.trainingStreak, 2)

    ;(supabase as any).from = createMockFrom(bootstrapTables)
    const oauthProfile = await supabaseService.getOrBootstrapProfile({
      id: 'oauth-user-1',
      email: 'apple.user@example.com',
      created_at: '2026-04-06T09:00:00.000Z',
      user_metadata: {},
    } as any)

    assert.equal(oauthProfile.username, 'apple_user')
    assert.equal(oauthProfile.displayName, 'apple.user')
    assert.equal(oauthProfile.sport, 'bjj')
    assert.equal(oauthProfile.profileHydrationPending, true)
    assert.equal(bootstrapTables.profiles.length, 1)
    assert.equal(bootstrapTables.profiles[0]?.primary_goal, 'balanced')
    assert.equal(bootstrapTables.profiles[0]?.primary_discipline, null)
    assert.deepEqual(bootstrapTables.profiles[0]?.favorite_content_types, [])
    assert.equal(bootstrapTables.user_stats.length, 1)

    console.log('BJJ auth/profile tests passed.')
  } finally {
    ;(supabase as any).from = originalFrom
    if (originalRpc) {
      ;(supabase as any).rpc = originalRpc
    }
    ;(supabase.auth.signInWithOAuth as unknown as typeof supabase.auth.signInWithOAuth) = originalOAuth
    ;(supabase.auth.resetPasswordForEmail as unknown as typeof supabase.auth.resetPasswordForEmail) = originalResetPassword
    ;(Capacitor as any).isNativePlatform = originalIsNativePlatform
    ;(Capacitor as any).getPlatform = originalGetPlatform
    process.env.CAPACITOR_LIVE_RELOAD_URL = originalLiveReloadUrl
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalGoogleWebClientId
    ;(globalThis as any).window = previousWindow
  }
}

void main()
