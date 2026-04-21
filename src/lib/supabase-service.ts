import type { AuthChangeEvent, Session as AuthSession, User } from '@supabase/supabase-js'
import { getStoredSupabaseSession, supabase } from './supabase'
import { captureException } from './monitoring'
import type {
  AuthState,
  Equipment,
  ExperienceLevel,
  PrimaryGoal,
  SportType,
  UserProfile,
  WeightUnit,
} from './user-profile-types'

const db = supabase as any

type DbProfile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  bio?: string | null
  sport: string
  created_at?: string | null
  training_days?: number | null
  weight_unit?: string | null
  equipment?: string | null
  experience_level?: string | null
  bodyweight_kg?: number | null
  primary_goal?: string | null
  combat_sessions_per_week?: number | null
  session_minutes?: number | null
  injury_notes?: string | null
  is_premium?: boolean | null
  first_active_at?: string | null
  stripe_customer_id?: string | null
  subscription_status?: string | null
  subscription_period_end?: string | null
  premium_source?: string | null
  premium_provider_id?: string | null
  premium_updated_at?: string | null
  belt?: string | null
  stripes?: number | null
  gym_name?: string | null
  privacy?: string | null
  primary_discipline?: string | null
  xp?: number | null
  level?: number | null
  favorite_content_types?: string[] | null
  heard_from?: string | null
  biggest_challenges?: string[] | null
  onboarding_completed?: boolean | null
  bjj_paywall_completed?: boolean | null
  bjj_coach_marks_seen?: boolean | null
  search_tutorial_seen?: boolean | null
}

type DbUserStats = {
  user_id: string
  workout_count?: number | null
  follower_count?: number | null
  following_count?: number | null
  total_saves?: number | null
  flow_streak?: number | null
  training_streak?: number | null
}

export interface AuthenticatedProfileRetryOptions {
  attempts?: number
  attemptTimeoutMs?: number
  retryDelayMs?: number
}

const AUTHENTICATED_PROFILE_TIMEOUT = Symbol('authenticated-profile-timeout')
const DEFAULT_AUTH_PROFILE_ATTEMPTS = 4
const DEFAULT_AUTH_PROFILE_ATTEMPT_TIMEOUT_MS = 2500
const DEFAULT_AUTH_PROFILE_RETRY_DELAY_MS = 250
const DEFAULT_PENDING_PROFILE_SPORT: SportType = 'bjj'
const SIGN_IN_PROFILE_RETRY_OPTIONS: AuthenticatedProfileRetryOptions = {
  attempts: 1,
  attemptTimeoutMs: 1200,
  retryDelayMs: 0,
}
const AUTH_STATE_PROFILE_RETRY_OPTIONS: AuthenticatedProfileRetryOptions = {
  attempts: 2,
  attemptTimeoutMs: 1200,
  retryDelayMs: 150,
}
const OPTIONAL_BJJ_PROFILE_COLUMNS = new Set([
  'belt',
  'stripes',
  'gym_name',
  'privacy',
  'primary_discipline',
  'xp',
  'level',
  'favorite_content_types',
  'heard_from',
  'biggest_challenges',
  'onboarding_completed',
  'bjj_paywall_completed',
  'bjj_coach_marks_seen',
  'search_tutorial_seen',
])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const withProfileTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T | typeof AUTHENTICATED_PROFILE_TIMEOUT> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<typeof AUTHENTICATED_PROFILE_TIMEOUT>((resolve) => {
        timeoutId = setTimeout(() => resolve(AUTHENTICATED_PROFILE_TIMEOUT), ms)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function resolveAuthenticatedProfileWithRetry(
  loadProfile: () => Promise<UserProfile | null>,
  options: AuthenticatedProfileRetryOptions = {},
): Promise<UserProfile | null> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? DEFAULT_AUTH_PROFILE_ATTEMPTS))
  const attemptTimeoutMs = Math.max(250, Math.floor(options.attemptTimeoutMs ?? DEFAULT_AUTH_PROFILE_ATTEMPT_TIMEOUT_MS))
  const retryDelayMs = Math.max(0, Math.floor(options.retryDelayMs ?? DEFAULT_AUTH_PROFILE_RETRY_DELAY_MS))

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const profile = await withProfileTimeout(loadProfile(), attemptTimeoutMs)
      if (profile && profile !== AUTHENTICATED_PROFILE_TIMEOUT) {
        return profile
      }
    } catch {
      // Retry on the next loop.
    }

    if (attempt < attempts - 1 && retryDelayMs > 0) {
      await sleep(retryDelayMs)
    }
  }

  return null
}

const asSportType = (value: unknown): SportType | null => (
  value === 'wrestling' || value === 'judo' || value === 'bjj' ? value : null
)

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined
}

function getUserMetadata(user: User): Record<string, unknown> {
  return (user.user_metadata ?? {}) as Record<string, unknown>
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function slugifyUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function inferProfileHydrationPending(profile: Pick<UserProfile, 'displayName' | 'username' | 'onboardingCompleted'>): boolean {
  if (profile.onboardingCompleted) return false

  const displayName = profile.displayName.trim().toLowerCase()
  const username = profile.username.trim().toLowerCase()

  return (
    displayName.length === 0
    || displayName === username
    || displayName === 'grappler'
    || username === 'grappler'
    || username.startsWith('user_')
  )
}

function needsProfileCompletionFromAuthUser(user: User): boolean {
  const metadata = getUserMetadata(user)
  return !readStringField(metadata, ['display_name', 'full_name', 'name', 'given_name'])
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return String(error)
}

function isMissingSchemaError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return /does not exist|Could not find the table|Could not find a relationship|column .* does not exist|Could not find the '.+' column.+schema cache/i.test(message)
}

function isUsernameConstraintError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return /profiles_username_lower_uidx|profiles_username_format_check|duplicate key.*username|username.*violates/i.test(message)
}

function stripUnsupportedProfileColumns(payload: Record<string, unknown>, error: unknown): Record<string, unknown> | null {
  const message = getErrorMessage(error)
  const match = message.match(/Could not find the '([^']+)' column of 'profiles' in the schema cache/i)
    ?? message.match(/column \"([^\"]+)\" of relation \"profiles\" does not exist/i)

  if (match) {
    const column = match[1]
    if (!OPTIONAL_BJJ_PROFILE_COLUMNS.has(column) || !(column in payload)) {
      return null
    }

    const nextPayload = { ...payload }
    delete nextPayload[column]
    return nextPayload
  }

  if (!isMissingSchemaError(error)) {
    return null
  }

  const nextPayload = { ...payload }
  let changed = false
  for (const column of OPTIONAL_BJJ_PROFILE_COLUMNS) {
    if (column in nextPayload) {
      delete nextPayload[column]
      changed = true
    }
  }

  return changed ? nextPayload : null
}

async function updateProfileWithCompatibility(userId: string, payload: Record<string, unknown>): Promise<void> {
  let candidatePayload = { ...payload }

  for (;;) {
    const { error } = await db
      .from('profiles')
      .update(candidatePayload)
      .eq('id', userId)

    if (!error) {
      return
    }

    const nextPayload = stripUnsupportedProfileColumns(candidatePayload, error)
    if (!nextPayload) {
      if (isUsernameConstraintError(error)) {
        throw new Error('That username is already taken or invalid. Try another.')
      }
      throw new Error(error.message)
    }
    candidatePayload = nextPayload
    if (Object.keys(candidatePayload).length === 0) {
      return
    }
  }
}

function extractBootstrapIdentity(user: User): { usernameBase: string; displayName: string; sport: SportType } {
  const metadata = getUserMetadata(user)
  const emailLocalPart = user.email?.split('@')[0]?.trim() || ''
  const displayName = readStringField(metadata, [
    'display_name',
    'full_name',
    'name',
    'user_name',
    'preferred_username',
    'given_name',
  ]) ?? (emailLocalPart || `grappler_${user.id.slice(0, 8)}`)

  const usernameBase = slugifyUsername(
    readStringField(metadata, ['username', 'preferred_username', 'user_name'])
      ?? emailLocalPart
      ?? displayName
      ?? `grappler_${user.id.slice(0, 8)}`,
  ) || slugifyUsername(`grappler_${user.id.slice(0, 8)}`)

  return {
    usernameBase,
    displayName,
    sport: asSportType(metadata.sport) ?? DEFAULT_PENDING_PROFILE_SPORT,
  }
}

function buildPendingUserProfile(user: User): UserProfile {
  const { usernameBase, displayName, sport } = extractBootstrapIdentity(user)

  return {
    id: user.id,
    username: usernameBase,
    displayName,
    sport,
    createdAt: user.created_at,
    workoutCount: 0,
    followerCount: 0,
    followingCount: 0,
    totalSaves: 0,
    profileHydrationPending: true,
  }
}

function profileMatchesRequestedUpdates(profile: UserProfile, updates: Partial<UserProfile>): boolean {
  if (updates.username !== undefined && profile.username !== updates.username.toLowerCase()) return false
  if (updates.displayName !== undefined && profile.displayName !== updates.displayName) return false
  if (updates.avatarUrl !== undefined && profile.avatarUrl !== updates.avatarUrl) return false
  if (updates.bio !== undefined && profile.bio !== updates.bio) return false
  if (updates.primaryGoal !== undefined && profile.primaryGoal !== updates.primaryGoal) return false
  if (updates.belt !== undefined && profile.belt !== updates.belt) return false
  if (updates.stripes !== undefined && profile.stripes !== updates.stripes) return false
  if (updates.gymName !== undefined && profile.gymName !== updates.gymName) return false
  if (updates.privacy !== undefined && profile.privacy !== updates.privacy) return false
  if (updates.primaryDiscipline !== undefined && profile.primaryDiscipline !== updates.primaryDiscipline) return false
  if (updates.xp !== undefined && profile.xp !== updates.xp) return false
  if (updates.level !== undefined && profile.level !== updates.level) return false
  if (updates.heardFrom !== undefined && profile.heardFrom !== updates.heardFrom) return false
  if (updates.onboardingCompleted !== undefined && profile.onboardingCompleted !== updates.onboardingCompleted) return false
  if (updates.paywallCompleted !== undefined && profile.paywallCompleted !== updates.paywallCompleted) return false
  if (updates.coachMarksSeen !== undefined && profile.coachMarksSeen !== updates.coachMarksSeen) return false
  if (updates.searchTutorialSeen !== undefined && profile.searchTutorialSeen !== updates.searchTutorialSeen) return false
  if (updates.experienceLevel !== undefined && profile.experienceLevel !== updates.experienceLevel) return false
  if (updates.favoriteContentTypes !== undefined) {
    const left = JSON.stringify(profile.favoriteContentTypes ?? [])
    const right = JSON.stringify(updates.favoriteContentTypes ?? [])
    if (left !== right) return false
  }
  if (updates.biggestChallenges !== undefined) {
    const left = JSON.stringify(profile.biggestChallenges ?? [])
    const right = JSON.stringify(updates.biggestChallenges ?? [])
    if (left !== right) return false
  }
  return true
}

async function getStoredSessionUser(): Promise<User | null> {
  try {
    const sessionResult = await withProfileTimeout<Awaited<ReturnType<typeof db.auth.getSession>>>(
      db.auth.getSession(),
      1800,
    )

    if (sessionResult !== AUTHENTICATED_PROFILE_TIMEOUT) {
      const { data: { session }, error } = sessionResult
      if (error) throw error
      return session?.user ?? null
    }
  } catch (error) {
    captureException('supabase-session-user', error, {
      step: 'auth.getSession',
    }, 'warning')
  }

  const fallbackSession = await getStoredSupabaseSession()
  return fallbackSession?.user ?? null
}

async function openOAuthUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return

  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    // Use system browser on iOS so custom-scheme returns can open the app reliably.
    if (Capacitor.getPlatform() === 'ios') {
      window.location.assign(url)
      return
    }

    // Use Safari view for OAuth. Redirects must be http(s) (e.g. live reload callback page),
    // since Safari view will show "address is invalid" for custom schemes.
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  }

  window.location.assign(url)
}

function getGoogleWebClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()
  if (!clientId) {
    throw new Error(
      'Missing NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID. Add the Google Web Client ID to enable native Google sign-in.'
    )
  }
  return clientId
}

async function signInWithNativeGoogle(): Promise<void> {
  const { GoogleSignIn } = await import('@capawesome/capacitor-google-sign-in')

  await GoogleSignIn.initialize({
    // Capawesome iOS uses Info.plist GIDClientID as iOS client ID and this field as server/web client ID.
    // Supabase validates Google ID token audience against configured Google provider client IDs.
    clientId: getGoogleWebClientId(),
  })

  const result = await GoogleSignIn.signIn()
  if (!result.idToken) {
    throw new Error('Google sign-in did not return an ID token')
  }

  const { error } = await db.auth.signInWithIdToken({
    provider: 'google',
    token: result.idToken,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function toHttpAuthCallbackUrl(baseUrl: string | undefined): string | null {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    return null
  }

  return `${baseUrl.replace(/\/$/, '')}/auth/callback`
}

async function getOAuthRedirectUrl(): Promise<string> {
  const { Capacitor } = await import('@capacitor/core')

  if (Capacitor.isNativePlatform()) {
    const liveReloadRedirect = toHttpAuthCallbackUrl(process.env.CAPACITOR_LIVE_RELOAD_URL)
    if (liveReloadRedirect) return liveReloadRedirect

    const appUrlRedirect = toHttpAuthCallbackUrl(process.env.NEXT_PUBLIC_APP_URL)
    if (appUrlRedirect) return appUrlRedirect

    if (typeof window !== 'undefined') {
      const originRedirect = toHttpAuthCallbackUrl(window.location.origin)
      if (originRedirect) return originRedirect
    }

    throw new Error(
      'Missing native OAuth callback URL. Set CAPACITOR_LIVE_RELOAD_URL or NEXT_PUBLIC_APP_URL to an http(s) origin so OAuth can return via /auth/callback.'
    )
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

async function getAuthRedirectUrl(): Promise<string> {
  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    // Prefer an http(s) callback when available (live reload), because Safari view can't navigate
    // to custom schemes without showing "address is invalid".
    const liveReloadRedirect = toHttpAuthCallbackUrl(process.env.CAPACITOR_LIVE_RELOAD_URL)
    if (liveReloadRedirect) return liveReloadRedirect

    const appUrlRedirect = toHttpAuthCallbackUrl(process.env.NEXT_PUBLIC_APP_URL)
    if (appUrlRedirect) return appUrlRedirect

    if (typeof window !== 'undefined') {
      const originRedirect = toHttpAuthCallbackUrl(window.location.origin)
      if (originRedirect) return originRedirect
    }
    return 'dagestanidiscipline://auth/callback'
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

function getSupabaseAuthCallbackUrl(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  try {
    const origin = new URL(supabaseUrl).origin
    return `${origin}/auth/v1/callback`
  } catch {
    return null
  }
}

function formatOAuthErrorMessage(params: {
  provider: 'google'
  redirectTo: string
  supabaseCallbackUrl: string | null
  rawMessage: string
}): string {
  const { provider, redirectTo, supabaseCallbackUrl, rawMessage } = params
  const message = rawMessage || 'OAuth sign in failed'

  const isSupabaseRedirectNotAllowed =
    /redirect url not allowed|disallowed redirect|not in the list of allowed redirect urls/i.test(message)

  const isProviderRedirectMismatch =
    /redirect_uri_mismatch|redirect uri mismatch|invalid redirect/i.test(message)

  if (isSupabaseRedirectNotAllowed) {
    return [
      message,
      '',
      `Fix: add this to Supabase Auth → URL Configuration → Additional Redirect URLs:`,
      `- ${redirectTo}`,
    ].join('\n')
  }

  if (isProviderRedirectMismatch) {
    const callbackLine = supabaseCallbackUrl ? `- ${supabaseCallbackUrl}` : '- (could not derive Supabase callback URL)'
    return [
      message,
      '',
      `Fix: ensure ${provider} provider allows Supabase callback URL:`,
      callbackLine,
      '',
      `Also ensure Supabase allows the app redirect:`,
      `- ${redirectTo}`,
    ].join('\n')
  }

  return message
}

function dbProfileToUserProfile(profile: DbProfile, stats?: DbUserStats | null): UserProfile {
  const nextProfile: UserProfile = {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    sport: asSportType(profile.sport) ?? DEFAULT_PENDING_PROFILE_SPORT,
    createdAt: profile.created_at ?? new Date().toISOString(),
    trainingDays: profile.training_days ?? undefined,
    weightUnit: (profile.weight_unit as WeightUnit | null) ?? undefined,
    equipment: (profile.equipment as Equipment | null) ?? null,
    experienceLevel: (profile.experience_level as ExperienceLevel | null) ?? undefined,
    bodyweightKg: profile.bodyweight_kg ?? null,
    primaryGoal: (profile.primary_goal as PrimaryGoal | null) ?? undefined,
    combatSessionsPerWeek: profile.combat_sessions_per_week ?? 0,
    sessionMinutes: profile.session_minutes ?? 45,
    injuryNotes: profile.injury_notes ?? null,
    isPremium: profile.is_premium ?? false,
    firstActiveAt: profile.first_active_at ?? null,
    stripeCustomerId: profile.stripe_customer_id ?? null,
    subscriptionStatus: profile.subscription_status ?? null,
    subscriptionPeriodEnd: profile.subscription_period_end ?? null,
    premiumSource: profile.premium_source ?? undefined,
    premiumProviderId: profile.premium_provider_id ?? undefined,
    premiumUpdatedAt: profile.premium_updated_at ?? undefined,
    belt: (profile.belt as UserProfile['belt'] | null) ?? undefined,
    stripes: profile.stripes ?? undefined,
    gymName: profile.gym_name ?? undefined,
    privacy: (profile.privacy as UserProfile['privacy'] | null) ?? undefined,
    primaryDiscipline: profile.primary_discipline ?? undefined,
    xp: profile.xp ?? undefined,
    level: profile.level ?? undefined,
    flowStreak: stats?.flow_streak ?? undefined,
    trainingStreak: stats?.training_streak ?? undefined,
    favoriteContentTypes: toStringArray(profile.favorite_content_types),
    heardFrom: profile.heard_from ?? undefined,
    biggestChallenges: toStringArray(profile.biggest_challenges),
    onboardingCompleted: profile.onboarding_completed ?? undefined,
    paywallCompleted: profile.bjj_paywall_completed ?? undefined,
    coachMarksSeen: Boolean(profile.bjj_coach_marks_seen),
    searchTutorialSeen: Boolean(profile.search_tutorial_seen),
    workoutCount: stats?.workout_count ?? 0,
    followerCount: stats?.follower_count ?? 0,
    followingCount: stats?.following_count ?? 0,
    totalSaves: stats?.total_saves ?? 0,
  }

  return {
    ...nextProfile,
    profileHydrationPending: inferProfileHydrationPending(nextProfile),
  }
}

async function ensureUserStatsRow(userId: string): Promise<void> {
  const { error } = await db
    .from('user_stats')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })

  if (error) {
    throw new Error(error.message)
  }
}

async function bootstrapProfileForUser(user: User): Promise<UserProfile> {
  const existingProfile = await supabaseService.getProfile(user.id)
  if (existingProfile) {
    await ensureUserStatsRow(user.id)
    return {
      ...existingProfile,
      profileHydrationPending: needsProfileCompletionFromAuthUser(user) || inferProfileHydrationPending(existingProfile),
    }
  }

  const { error: ensureError } = await db.rpc('ensure_profile_from_auth')
  if (ensureError && !isMissingSchemaError(ensureError)) {
    captureException('supabase-ensure-profile', ensureError, { step: 'ensure_profile_from_auth' }, 'warning')
  }

  await ensureUserStatsRow(user.id)

  const profile = await supabaseService.getProfile(user.id)
  if (!profile) {
    throw new Error('Profile bootstrap failed')
  }

  return {
    ...profile,
    profileHydrationPending: needsProfileCompletionFromAuthUser(user) || inferProfileHydrationPending(profile),
  }
}

export const supabaseService = {
  async signUp(
    email: string,
    password: string,
    username: string,
    displayName: string,
    sport: SportType,
  ): Promise<UserProfile> {
    const normalizedUsername = username.toLowerCase().trim()
    if (!normalizedUsername) {
      throw new Error('Choose a username.')
    }

    const usernameFree = await supabaseService.checkUsernameAvailable(normalizedUsername)
    if (!usernameFree) {
      throw new Error('That username is already taken. Try another.')
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: displayName,
          sport,
        },
      },
    })

    if (error) {
      captureException('supabase-sign-up', error, { step: 'auth.signUp' })
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Failed to create user')
    }

    try {
      await ensureUserStatsRow(data.user.id)
    } catch (error) {
      captureException('supabase-sign-up', error, {
        step: 'user_stats.ensure',
      }, 'warning')
    }

    if (data.session) {
      try {
        return await bootstrapProfileForUser(data.user)
      } catch (error) {
        captureException('supabase-sign-up', error, {
          step: 'profile.bootstrap',
          userId: data.user.id,
        }, 'warning')
      }
    }

    return {
      ...buildPendingUserProfile(data.user),
      username: normalizedUsername,
      displayName,
      sport,
    }
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
      captureException('supabase-sign-in', error, { step: 'auth.signInWithPassword' }, 'warning')
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Failed to sign in')
    }

    const profile = await resolveAuthenticatedProfileWithRetry(
      () => bootstrapProfileForUser(data.user),
      SIGN_IN_PROFILE_RETRY_OPTIONS,
    )

    if (!profile) {
      captureException('supabase-sign-in', new Error('Profile did not load after successful sign-in'), {
        step: 'profile.load',
        userId: data.user.id,
      }, 'warning')
      return buildPendingUserProfile(data.user)
    }

    return profile
  },

  async signInWithOAuth(provider: 'google'): Promise<void> {
    const { Capacitor } = await import('@capacitor/core')

    if (provider === 'google' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      try {
        await signInWithNativeGoogle()
        return
      } catch (error) {
        captureException('supabase-native-google-sign-in', error, {
          step: 'auth.signInWithIdToken',
        }, 'warning')
        throw error
      }
    }

    const redirectTo = await getOAuthRedirectUrl()
    const supabaseCallbackUrl = getSupabaseAuthCallbackUrl()
    const { data, error } = await db.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          response_type: 'code',
        },
      },
    })

    if (error) {
      captureException('supabase-oauth-sign-in', error, {
        step: 'auth.signInWithOAuth',
        provider,
        redirectTo,
        supabaseCallbackUrl,
      }, 'warning')
      throw new Error(
        formatOAuthErrorMessage({
          provider,
          redirectTo,
          supabaseCallbackUrl,
          rawMessage: error.message,
        }),
      )
    }

    if (data?.url) {
      await openOAuthUrl(data.url)
    }
  },

  async signOut(): Promise<void> {
    const { error } = await db.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  },

  async resetPassword(email: string): Promise<void> {
    const redirectTo = await getAuthRedirectUrl()
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.startsWith('dagestanidiscipline://')
        ? redirectTo
        : `${redirectTo}/reset-password`,
    })

    if (error) {
      captureException('supabase-reset-password', error, {
        step: 'auth.resetPasswordForEmail',
      }, 'warning')
      throw new Error(error.message)
    }
  },

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await db.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      captureException('supabase-resend-verification', error, {
        step: 'auth.resend',
      }, 'warning')
      throw new Error(error.message)
    }
  },

  async checkUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const normalized = username.toLowerCase().trim()
    if (!normalized) {
      return false
    }

    const { data, error } = await db.rpc('username_is_available', {
      p_username: normalized,
      p_exclude_user_id: excludeUserId ?? null,
    })

    if (error) {
      captureException('supabase-username-check', error, {
        step: 'username_is_available',
      }, 'warning')
      return false
    }

    return Boolean(data)
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      return await getStoredSessionUser()
    } catch (error) {
      captureException('supabase-current-user', error, {
        step: 'auth.getSession',
      }, 'warning')
      return null
    }
  },

  async getAuthState(): Promise<AuthState> {
    try {
      const user = await getStoredSessionUser()
      if (!user) {
        return { isAuthenticated: false, user: null, isLoading: false, error: null, emailVerified: false }
      }

      let profile: UserProfile | null = null
      try {
        profile = await resolveAuthenticatedProfileWithRetry(
          () => bootstrapProfileForUser(user),
          AUTH_STATE_PROFILE_RETRY_OPTIONS,
        )
      } catch (error) {
        captureException('supabase-auth-state', error, {
          step: 'profile.resolve',
          userId: user.id,
        }, 'warning')
      }

      return {
        isAuthenticated: true,
        user: profile ?? buildPendingUserProfile(user),
        isLoading: false,
        error: null,
        emailVerified: Boolean(user.email_confirmed_at),
      }
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        emailVerified: false,
      }
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
    return db.auth.onAuthStateChange(callback)
  },

  async getOrBootstrapProfile(user: User): Promise<UserProfile> {
    return bootstrapProfileForUser(user)
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    let { data: profile, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error && isMissingSchemaError(error)) {
      const fallbackResult = await db
        .from('profiles')
        .select(
          'id, username, display_name, avatar_url, bio, sport, created_at, training_days, weight_unit, equipment, experience_level, bodyweight_kg, primary_goal, combat_sessions_per_week, session_minutes, injury_notes, is_premium, first_active_at, stripe_customer_id, subscription_status, subscription_period_end, onboarding_completed, bjj_paywall_completed, bjj_coach_marks_seen, belt, stripes, gym_name, privacy, primary_discipline, xp, level, favorite_content_types, heard_from, biggest_challenges',
        )
        .eq('id', userId)
        .maybeSingle()

      profile = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      captureException('supabase-profile-load', error, {
        step: 'profiles.select.by-id',
        userId,
      }, 'warning')
      return null
    }

    if (!profile) {
      return null
    }

    const { data: stats, error: statsError } = await db
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (statsError) {
      captureException('supabase-profile-load', statsError, {
        step: 'user_stats.select.by-user-id',
        userId,
      }, 'warning')
    }

    return dbProfileToUserProfile(profile as DbProfile, (stats ?? null) as DbUserStats | null)
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const profileUpdates: Record<string, unknown> = {}
    const statsUpdates: Record<string, unknown> = {}

    if (updates.username !== undefined) {
      const nextUsername = updates.username.toLowerCase().trim()
      if (!nextUsername) {
        throw new Error('Username is required.')
      }

      const existing = await supabaseService.getProfile(userId)
      const currentUsername = existing?.username?.toLowerCase().trim() ?? ''

      if (nextUsername !== currentUsername) {
        const available = await supabaseService.checkUsernameAvailable(nextUsername, userId)
        if (!available) {
          throw new Error('That username is already taken. Try another.')
        }
      }

      profileUpdates.username = nextUsername
    }
    if (updates.displayName) profileUpdates.display_name = updates.displayName
    if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl
    if (updates.bio !== undefined) profileUpdates.bio = updates.bio
    if (updates.sport) profileUpdates.sport = updates.sport
    if (updates.trainingDays !== undefined) profileUpdates.training_days = updates.trainingDays
    if (updates.weightUnit) profileUpdates.weight_unit = updates.weightUnit
    if (updates.equipment !== undefined) profileUpdates.equipment = updates.equipment
    if (updates.experienceLevel) profileUpdates.experience_level = updates.experienceLevel
    if (updates.bodyweightKg !== undefined) profileUpdates.bodyweight_kg = updates.bodyweightKg
    if (updates.primaryGoal) profileUpdates.primary_goal = updates.primaryGoal
    if (updates.combatSessionsPerWeek !== undefined) profileUpdates.combat_sessions_per_week = updates.combatSessionsPerWeek
    if (updates.sessionMinutes !== undefined) profileUpdates.session_minutes = updates.sessionMinutes
    if (updates.injuryNotes !== undefined) profileUpdates.injury_notes = updates.injuryNotes
    if (updates.belt) profileUpdates.belt = updates.belt
    if (updates.stripes !== undefined) profileUpdates.stripes = updates.stripes
    if (updates.gymName !== undefined) profileUpdates.gym_name = updates.gymName
    if (updates.privacy !== undefined) profileUpdates.privacy = updates.privacy
    if (updates.primaryDiscipline !== undefined) profileUpdates.primary_discipline = updates.primaryDiscipline
    if (updates.xp !== undefined) profileUpdates.xp = updates.xp
    if (updates.level !== undefined) profileUpdates.level = updates.level
    if (updates.favoriteContentTypes !== undefined) profileUpdates.favorite_content_types = updates.favoriteContentTypes
    if (updates.heardFrom !== undefined) profileUpdates.heard_from = updates.heardFrom
    if (updates.biggestChallenges !== undefined) profileUpdates.biggest_challenges = updates.biggestChallenges
    if (updates.onboardingCompleted !== undefined) profileUpdates.onboarding_completed = updates.onboardingCompleted
    if (updates.paywallCompleted !== undefined) profileUpdates.bjj_paywall_completed = updates.paywallCompleted
    if (updates.coachMarksSeen !== undefined) profileUpdates.bjj_coach_marks_seen = updates.coachMarksSeen
    if (updates.searchTutorialSeen !== undefined) profileUpdates.search_tutorial_seen = updates.searchTutorialSeen

    if (updates.flowStreak !== undefined) statsUpdates.flow_streak = updates.flowStreak
    if (updates.trainingStreak !== undefined) statsUpdates.training_streak = updates.trainingStreak
    if (updates.workoutCount !== undefined) statsUpdates.workout_count = updates.workoutCount
    if (updates.followerCount !== undefined) statsUpdates.follower_count = updates.followerCount
    if (updates.followingCount !== undefined) statsUpdates.following_count = updates.followingCount
    if (updates.totalSaves !== undefined) statsUpdates.total_saves = updates.totalSaves

    if (Object.keys(profileUpdates).length > 0) {
      await updateProfileWithCompatibility(userId, profileUpdates)
    }

    if (Object.keys(statsUpdates).length > 0) {
      const { error } = await db
        .from('user_stats')
        .upsert({
          user_id: userId,
          ...statsUpdates,
        }, { onConflict: 'user_id' })

      if (error) {
        throw new Error(error.message)
      }
    }

    let profile = await supabaseService.getProfile(userId)
    if (!profile) {
      throw new Error('Profile not found after update')
    }

    if (Object.keys(profileUpdates).length > 0 && !profileMatchesRequestedUpdates(profile, updates)) {
      await updateProfileWithCompatibility(userId, profileUpdates)
      profile = await supabaseService.getProfile(userId)
      if (!profile) {
        throw new Error('Profile not found after retry')
      }
      if (!profileMatchesRequestedUpdates(profile, updates)) {
        throw new Error('Profile update did not persist')
      }
    }

    return profile
  },
}
