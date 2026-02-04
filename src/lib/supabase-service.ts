// ============================================
// SUPABASE SERVICE - Comprehensive backend service
// ============================================

import { supabase } from './supabase'
import type { Database } from './database.types'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import {
  UserProfile,
  CustomWorkout,
  SavedWorkout,
  FeedItem,
  WorkoutSearchFilters,
  WorkoutBuilderState,
  CustomWorkoutExercise,
  AuthState,
  WorkoutFocus,
} from './social-types'
import type { SportType, Drill, Routine, LearningPath, ActivityLog, SessionLog, DrillDifficulty } from './types'

// Type aliases for database rows - used for return type annotations
type DbProfile = Database['public']['Tables']['profiles']['Row']
type DbUserStats = Database['public']['Tables']['user_stats']['Row']
type DbCustomWorkout = Database['public']['Tables']['custom_workouts']['Row']
type DbCustomWorkoutExercise = Database['public']['Tables']['custom_workout_exercises']['Row']
type DbFollow = Database['public']['Tables']['follows']['Row']
type DbSavedWorkout = Database['public']['Tables']['saved_workouts']['Row']
type DbSessionLog = Database['public']['Tables']['session_logs']['Row']
type DbActivityLog = Database['public']['Tables']['activity_logs']['Row']
type DbDrill = Database['public']['Tables']['drills']['Row']
type DbRoutine = Database['public']['Tables']['routines']['Row']
type DbRoutineDrill = Database['public']['Tables']['routine_drills']['Row']
type DbLearningPath = Database['public']['Tables']['learning_paths']['Row']
type DbLearningPathDrill = Database['public']['Tables']['learning_path_drills']['Row']
type DbUserRecentlyViewed = Database['public']['Tables']['user_recently_viewed']['Row']
type DbSubscription = Database['public']['Tables']['subscriptions']['Row']
type DbSubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================
// TYPE CONVERTERS
// ============================================

// Convert database profile to UserProfile
function dbProfileToUserProfile(
  profile: DbProfile,
  stats?: DbUserStats | null
): UserProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    sport: profile.sport as SportType,
    createdAt: profile.created_at ?? new Date().toISOString(),
    workoutCount: stats?.workout_count ?? 0,
    followerCount: stats?.follower_count ?? 0,
    followingCount: stats?.following_count ?? 0,
    totalSaves: stats?.total_saves ?? 0,
  }
}

// Convert database workout to CustomWorkout
function dbWorkoutToCustomWorkout(
  workout: DbCustomWorkout,
  exercises: DbCustomWorkoutExercise[],
  creator?: UserProfile
): CustomWorkout {
  return {
    id: workout.id,
    creatorId: workout.creator_id,
    creator,
    name: workout.name,
    description: workout.description ?? '',
    focus: workout.focus as WorkoutFocus,
    difficulty: workout.difficulty as DrillDifficulty,
    estimatedDuration: workout.estimated_duration ?? 30,
    sportRelevance: (workout.sport_relevance ?? []) as SportType[],
    exercises: exercises
      .sort((a, b) => a.order_index - b.order_index)
      .map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps ?? undefined,
        duration: e.duration ?? undefined,
        restTime: e.rest_time,
        notes: e.notes ?? undefined,
        videoUrl: e.video_url ?? undefined,
        order: e.order_index,
      })),
    visibility: workout.visibility as 'private' | 'public',
    saveCount: workout.save_count ?? 0,
    createdAt: workout.created_at ?? new Date().toISOString(),
    updatedAt: workout.updated_at ?? new Date().toISOString(),
    originalWorkoutId: workout.original_workout_id ?? undefined,
  }
}

// Convert database drill to Drill type
function dbDrillToDrill(drill: DbDrill): Drill {
  return {
    id: drill.id,
    name: drill.name,
    category: drill.category as Drill['category'],
    subcategory: (drill.subcategory ?? 'general') as Drill['subcategory'],
    videoUrl: drill.video_url ?? '',
    duration: drill.duration ?? 60,
    difficulty: (drill.difficulty ?? 'beginner') as DrillDifficulty,
    sportRelevance: (drill.sport_relevance ?? []) as SportType[],
    equipment: drill.equipment ?? undefined,
    description: drill.description ?? '',
    benefits: drill.benefits ?? [],
    musclesWorked: drill.muscles_worked ?? undefined,
    injuryPrevention: drill.injury_prevention ?? undefined,
    instructions: drill.instructions ?? [],
    commonMistakes: drill.common_mistakes ?? undefined,
    coachingCues: drill.coaching_cues ?? undefined,
    relatedDrills: drill.related_drills ?? undefined,
  }
}

// ============================================
// SUPABASE SERVICE
// ============================================

export const supabaseService = {
  // ============================================
  // AUTHENTICATION
  // ============================================

  async signUp(
    email: string,
    password: string,
    username: string,
    displayName: string,
    sport: SportType
  ): Promise<UserProfile> {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      throw new Error(authError.message)
    }
    if (!authData.user) throw new Error('Failed to create user')

    // Create profile manually (trigger was removed)
    const { error: profileError } = await db.from('profiles').insert({
      id: authData.user.id,
      username: username.toLowerCase(),
      display_name: displayName,
      sport,
      weight_unit: 'kg',
      training_days: 3,
    })

    if (profileError) {
      console.error('Profile insert error:', profileError)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // Create initial user stats
    const { error: statsError } = await db.from('user_stats').insert({
      user_id: authData.user.id,
    })

    if (statsError) {
      console.error('User stats insert error:', statsError)
      // Non-critical, continue
    }

    return {
      id: authData.user.id,
      username: username.toLowerCase(),
      displayName,
      sport,
      createdAt: new Date().toISOString(),
      workoutCount: 0,
      followerCount: 0,
      followingCount: 0,
      totalSaves: 0,
    }
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Failed to sign in')

    const profile = await this.getProfile(data.user.id)
    if (!profile) throw new Error('Profile not found')

    return profile
  },

  async signOut(): Promise<void> {
    const { error } = await db.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await db.auth.getUser()
    return user
  },

  async getAuthState(): Promise<AuthState> {
    try {
      const { data: { user } } = await db.auth.getUser()
      if (!user) {
        return { isAuthenticated: false, user: null, isLoading: false, error: null }
      }

      const profile = await this.getProfile(user.id)
      return {
        isAuthenticated: true,
        user: profile,
        isLoading: false,
        error: null,
      }
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return db.auth.onAuthStateChange(callback)
  },

  // ============================================
  // PROFILES
  // ============================================

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !profile) return null

    const { data: stats } = await db
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    return dbProfileToUserProfile(profile, stats)
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const dbUpdates: Record<string, unknown> = {}

    if (updates.username) dbUpdates.username = updates.username.toLowerCase()
    if (updates.displayName) dbUpdates.display_name = updates.displayName
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio
    if (updates.sport) dbUpdates.sport = updates.sport

    const { error } = await db
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)

    if (error) throw new Error(error.message)

    const profile = await this.getProfile(userId)
    if (!profile) throw new Error('Profile not found after update')

    return profile
  },

  async searchUsers(query: string, sport?: SportType): Promise<UserProfile[]> {
    let queryBuilder = db
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20)

    if (sport) {
      queryBuilder = queryBuilder.eq('sport', sport)
    }

    const { data: profiles, error } = await queryBuilder

    if (error || !profiles) return []

    // Get stats for all users
    const userIds = (profiles as DbProfile[]).map((p: DbProfile) => p.id)
    const { data: allStats } = await db
      .from('user_stats')
      .select('*')
      .in('user_id', userIds)

    const statsMap = new Map((allStats as DbUserStats[] | null)?.map((s: DbUserStats) => [s.user_id, s]) ?? [])

    return (profiles as DbProfile[]).map((p: DbProfile) => dbProfileToUserProfile(p, statsMap.get(p.id) as DbUserStats | undefined))
  },

  // ============================================
  // SOCIAL (FOLLOWS)
  // ============================================

  async followUser(userId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')
    if (currentUser.id === userId) throw new Error('Cannot follow yourself')

    const { error } = await db.from('follows').insert({
      follower_id: currentUser.id,
      following_id: userId,
    })

    if (error && !error.message.includes('duplicate')) {
      throw new Error(error.message)
    }
  },

  async unfollowUser(userId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)

    if (error) throw new Error(error.message)
  },

  async getFollowers(userId: string): Promise<UserProfile[]> {
    const { data: follows, error } = await db
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)

    if (error || !follows) return []

    const followerIds = (follows as DbFollow[]).map((f: DbFollow) => f.follower_id)
    if (followerIds.length === 0) return []

    const { data: profiles } = await db
      .from('profiles')
      .select('*')
      .in('id', followerIds)

    if (!profiles) return []

    const { data: allStats } = await db
      .from('user_stats')
      .select('*')
      .in('user_id', followerIds)

    const statsMap = new Map((allStats as DbUserStats[] | null)?.map((s: DbUserStats) => [s.user_id, s]) ?? [])

    return (profiles as DbProfile[]).map((p: DbProfile) => dbProfileToUserProfile(p, statsMap.get(p.id) as DbUserStats | undefined))
  },

  async getFollowing(userId: string): Promise<UserProfile[]> {
    const { data: follows, error } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (error || !follows) return []

    const followingIds = (follows as DbFollow[]).map((f: DbFollow) => f.following_id)
    if (followingIds.length === 0) return []

    const { data: profiles } = await db
      .from('profiles')
      .select('*')
      .in('id', followingIds)

    if (!profiles) return []

    const { data: allStats } = await db
      .from('user_stats')
      .select('*')
      .in('user_id', followingIds)

    const statsMap = new Map((allStats as DbUserStats[] | null)?.map((s: DbUserStats) => [s.user_id, s]) ?? [])

    return (profiles as DbProfile[]).map((p: DbProfile) => dbProfileToUserProfile(p, statsMap.get(p.id) as DbUserStats | undefined))
  },

  async isFollowing(userId: string): Promise<boolean> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return false

    const { data } = await db
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single()

    return !!data
  },

  // ============================================
  // WORKOUTS
  // ============================================

  calculateDuration(exercises: CustomWorkoutExercise[]): number {
    let totalSeconds = 0
    for (const ex of exercises) {
      const exerciseTime = ex.duration || (ex.reps || 10) * 3
      totalSeconds += (exerciseTime * ex.sets) + (ex.restTime * (ex.sets - 1))
    }
    return Math.ceil(totalSeconds / 60)
  },

  async createWorkout(state: WorkoutBuilderState): Promise<CustomWorkout> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const estimatedDuration = this.calculateDuration(state.exercises)

    // Create the workout
    const { data: workout, error: workoutError } = await db
      .from('custom_workouts')
      .insert({
        creator_id: currentUser.id,
        name: state.name,
        description: state.description,
        focus: state.focus,
        difficulty: state.difficulty,
        estimated_duration: estimatedDuration,
        sport_relevance: state.sportRelevance,
        visibility: state.visibility,
        save_count: 0,
      })
      .select()
      .single()

    if (workoutError || !workout) throw new Error(workoutError?.message ?? 'Failed to create workout')

    // Create exercises
    const exerciseInserts = state.exercises.map((e, i) => ({
      workout_id: workout.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps ?? null,
      duration: e.duration ?? null,
      rest_time: e.restTime,
      notes: e.notes ?? null,
      video_url: e.videoUrl ?? null,
      order_index: i,
    }))

    const { data: exercises, error: exercisesError } = await db
      .from('custom_workout_exercises')
      .insert(exerciseInserts)
      .select()

    if (exercisesError) throw new Error(exercisesError.message)

    // Update user workout count
    const { data: currentStats } = await db
      .from('user_stats')
      .select('workout_count')
      .eq('user_id', currentUser.id)
      .single()

    await db
      .from('user_stats')
      .upsert({
        user_id: currentUser.id,
        workout_count: (currentStats?.workout_count ?? 0) + 1,
      })

    const profile = await this.getProfile(currentUser.id)

    return dbWorkoutToCustomWorkout(workout, exercises ?? [], profile ?? undefined)
  },

  async updateWorkout(
    workoutId: string,
    updates: Partial<WorkoutBuilderState>
  ): Promise<CustomWorkout> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (updates.name) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.focus) dbUpdates.focus = updates.focus
    if (updates.difficulty) dbUpdates.difficulty = updates.difficulty
    if (updates.sportRelevance) dbUpdates.sport_relevance = updates.sportRelevance
    if (updates.visibility) dbUpdates.visibility = updates.visibility
    if (updates.exercises) {
      dbUpdates.estimated_duration = this.calculateDuration(updates.exercises)
    }

    const { error } = await db
      .from('custom_workouts')
      .update(dbUpdates)
      .eq('id', workoutId)
      .eq('creator_id', currentUser.id)

    if (error) throw new Error(error.message)

    // Update exercises if provided
    if (updates.exercises) {
      // Delete existing exercises
      await db
        .from('custom_workout_exercises')
        .delete()
        .eq('workout_id', workoutId)

      // Insert new exercises
      const exerciseInserts = updates.exercises.map((e, i) => ({
        workout_id: workoutId,
        name: e.name,
        sets: e.sets,
        reps: e.reps ?? null,
        duration: e.duration ?? null,
        rest_time: e.restTime,
        notes: e.notes ?? null,
        video_url: e.videoUrl ?? null,
        order_index: i,
      }))

      await db.from('custom_workout_exercises').insert(exerciseInserts)
    }

    const workout = await this.getWorkout(workoutId)
    if (!workout) throw new Error('Workout not found after update')

    return workout
  },

  async deleteWorkout(workoutId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    // Delete exercises first (cascade should handle this, but being explicit)
    await db
      .from('custom_workout_exercises')
      .delete()
      .eq('workout_id', workoutId)

    // Delete the workout
    const { error } = await db
      .from('custom_workouts')
      .delete()
      .eq('id', workoutId)
      .eq('creator_id', currentUser.id)

    if (error) throw new Error(error.message)
  },

  async getWorkout(workoutId: string): Promise<CustomWorkout | null> {
    const { data: workout, error } = await db
      .from('custom_workouts')
      .select('*')
      .eq('id', workoutId)
      .single()

    if (error || !workout) return null

    const { data: exercises } = await db
      .from('custom_workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index')

    const creator = await this.getProfile(workout.creator_id)

    return dbWorkoutToCustomWorkout(workout, exercises ?? [], creator ?? undefined)
  },

  async getUserWorkouts(userId: string): Promise<CustomWorkout[]> {
    const { data: workouts, error } = await db
      .from('custom_workouts')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })

    if (error || !workouts) return []

    const workoutIds = (workouts as DbCustomWorkout[]).map((w: DbCustomWorkout) => w.id)
    const { data: allExercises } = await db
      .from('custom_workout_exercises')
      .select('*')
      .in('workout_id', workoutIds)

    const exercisesMap = new Map<string, DbCustomWorkoutExercise[]>()
    ;(allExercises as DbCustomWorkoutExercise[] | null)?.forEach((e: DbCustomWorkoutExercise) => {
      const list = exercisesMap.get(e.workout_id) ?? []
      list.push(e)
      exercisesMap.set(e.workout_id, list)
    })

    const creator = await this.getProfile(userId)

    return (workouts as DbCustomWorkout[]).map((w: DbCustomWorkout) => dbWorkoutToCustomWorkout(w, exercisesMap.get(w.id) ?? [], creator ?? undefined))
  },

  async getFeedWorkouts(filters?: WorkoutSearchFilters): Promise<FeedItem[]> {
    const currentUser = await this.getCurrentUser()

    let queryBuilder = db
      .from('custom_workouts')
      .select('*')
      .eq('visibility', 'public')

    if (filters?.query) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
      )
    }
    if (filters?.focus) {
      queryBuilder = queryBuilder.eq('focus', filters.focus)
    }
    if (filters?.difficulty) {
      queryBuilder = queryBuilder.eq('difficulty', filters.difficulty)
    }
    if (filters?.sport) {
      queryBuilder = queryBuilder.contains('sport_relevance', [filters.sport])
    }

    if (filters?.sortBy === 'popular' || filters?.sortBy === 'saves') {
      queryBuilder = queryBuilder.order('save_count', { ascending: false })
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false })
    }

    const { data: workouts, error } = await queryBuilder.limit(50)

    if (error || !workouts) return []

    // Get all required data in parallel
    const typedWorkouts = workouts as DbCustomWorkout[]
    const workoutIds = typedWorkouts.map((w: DbCustomWorkout) => w.id)
    const creatorIds = [...new Set(typedWorkouts.map((w: DbCustomWorkout) => w.creator_id))]

    const [
      { data: allExercises },
      { data: profiles },
      { data: allStats },
      { data: savedWorkouts },
      { data: following },
    ] = await Promise.all([
      db.from('custom_workout_exercises').select('*').in('workout_id', workoutIds),
      db.from('profiles').select('*').in('id', creatorIds),
      db.from('user_stats').select('*').in('user_id', creatorIds),
      currentUser
        ? db.from('saved_workouts').select('workout_id').eq('user_id', currentUser.id)
        : Promise.resolve({ data: [] }),
      currentUser
        ? db.from('follows').select('following_id').eq('follower_id', currentUser.id)
        : Promise.resolve({ data: [] }),
    ])

    const exercisesMap = new Map<string, DbCustomWorkoutExercise[]>()
    ;(allExercises as DbCustomWorkoutExercise[] | null)?.forEach((e: DbCustomWorkoutExercise) => {
      const list = exercisesMap.get(e.workout_id) ?? []
      list.push(e)
      exercisesMap.set(e.workout_id, list)
    })

    const statsMap = new Map((allStats as DbUserStats[] | null)?.map((s: DbUserStats) => [s.user_id, s]) ?? [])
    const profilesMap = new Map(
      (profiles as DbProfile[] | null)?.map((p: DbProfile) => [p.id, dbProfileToUserProfile(p, statsMap.get(p.id) as DbUserStats | undefined)]) ?? []
    )

    const savedIds = new Set((savedWorkouts as {workout_id: string}[] | null)?.map((s: {workout_id: string}) => s.workout_id) ?? [])
    const followingIds = new Set((following as {following_id: string}[] | null)?.map((f: {following_id: string}) => f.following_id) ?? [])

    return typedWorkouts.map((w: DbCustomWorkout) => {
      const creator = profilesMap.get(w.creator_id) ?? {
        id: 'unknown',
        username: 'unknown',
        displayName: 'Unknown User',
        sport: 'wrestling' as SportType,
        createdAt: new Date().toISOString(),
        workoutCount: 0,
        followerCount: 0,
        followingCount: 0,
        totalSaves: 0,
      }

      return {
        workout: dbWorkoutToCustomWorkout(w, exercisesMap.get(w.id) ?? [], creator),
        creator,
        isSaved: savedIds.has(w.id),
        isFollowing: followingIds.has(w.creator_id),
      }
    })
  },

  async saveWorkout(workoutId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { error } = await db.from('saved_workouts').insert({
      user_id: currentUser.id,
      workout_id: workoutId,
    })

    if (error && !error.message.includes('duplicate')) {
      throw new Error(error.message)
    }

    // Increment save count on workout
    const { data: workout } = await db
      .from('custom_workouts')
      .select('save_count')
      .eq('id', workoutId)
      .single()

    await db
      .from('custom_workouts')
      .update({ save_count: (workout?.save_count ?? 0) + 1 })
      .eq('id', workoutId)
  },

  async unsaveWorkout(workoutId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { error } = await db
      .from('saved_workouts')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('workout_id', workoutId)

    if (error) throw new Error(error.message)
  },

  async getSavedWorkouts(): Promise<SavedWorkout[]> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return []

    const { data: saved, error } = await db
      .from('saved_workouts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('saved_at', { ascending: false })

    if (error || !saved) return []

    const typedSaved = saved as DbSavedWorkout[]
    const workoutIds = typedSaved.map((s: DbSavedWorkout) => s.workout_id)
    const workoutsPromises = workoutIds.map((id: string) => this.getWorkout(id))
    const workouts = await Promise.all(workoutsPromises)

    const workoutsMap = new Map(workouts.filter(Boolean).map(w => [w!.id, w!]))

    return typedSaved.map((s: DbSavedWorkout) => ({
      id: s.id,
      userId: s.user_id,
      workoutId: s.workout_id,
      workout: workoutsMap.get(s.workout_id),
      savedAt: s.saved_at ?? new Date().toISOString(),
    }))
  },

  // ============================================
  // PROGRESS (Session Logs & Activity Logs)
  // ============================================

  async logSession(sessionLog: Omit<SessionLog, 'id'>): Promise<SessionLog> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { data, error } = await db
      .from('session_logs')
      .insert({
        user_id: currentUser.id,
        session_id: sessionLog.sessionId || null,
        date: sessionLog.date,
        completed: sessionLog.completed,
        effort_rating: sessionLog.effortRating ?? null,
        total_time: sessionLog.totalTime ?? null,
        total_volume: sessionLog.volume ?? null,
        notes: sessionLog.notes ?? null,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to log session')

    return {
      id: data.id,
      date: data.date,
      sessionId: data.session_id ?? '',
      completed: data.completed ?? false,
      effortRating: data.effort_rating ?? undefined,
      totalTime: data.total_time ?? undefined,
      notes: data.notes ?? undefined,
      volume: data.total_volume ?? undefined,
    }
  },

  async getSessionLogs(
    startDate?: string,
    endDate?: string,
    limit = 50
  ): Promise<SessionLog[]> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return []

    let queryBuilder = db
      .from('session_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
      .limit(limit)

    if (startDate) {
      queryBuilder = queryBuilder.gte('date', startDate)
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('date', endDate)
    }

    const { data, error } = await queryBuilder

    if (error || !data) return []

    return (data as DbSessionLog[]).map((log: DbSessionLog) => ({
      id: log.id,
      date: log.date,
      sessionId: log.session_id ?? '',
      completed: log.completed ?? false,
      effortRating: log.effort_rating ?? undefined,
      totalTime: log.total_time ?? undefined,
      notes: log.notes ?? undefined,
      volume: log.total_volume ?? undefined,
    }))
  },

  async logActivity(activity: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { data, error } = await db
      .from('activity_logs')
      .insert({
        user_id: currentUser.id,
        type: activity.type,
        date: activity.date,
        duration: activity.duration,
        intensity: activity.intensity?.toString() ?? null,
        notes: activity.notes ?? null,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to log activity')

    return {
      id: data.id,
      date: data.date,
      type: data.type as ActivityLog['type'],
      duration: data.duration,
      intensity: parseInt(data.intensity ?? '5', 10),
      notes: data.notes ?? undefined,
    }
  },

  async getActivityLogs(
    startDate?: string,
    endDate?: string,
    limit = 50
  ): Promise<ActivityLog[]> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return []

    let queryBuilder = db
      .from('activity_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
      .limit(limit)

    if (startDate) {
      queryBuilder = queryBuilder.gte('date', startDate)
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('date', endDate)
    }

    const { data, error } = await queryBuilder

    if (error || !data) return []

    return (data as DbActivityLog[]).map((log: DbActivityLog) => ({
      id: log.id,
      date: log.date,
      type: log.type as ActivityLog['type'],
      duration: log.duration,
      intensity: parseInt(log.intensity ?? '5', 10),
      notes: log.notes ?? undefined,
    }))
  },

  async updateActivity(activityId: string, activity: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { data, error } = await db
      .from('activity_logs')
      .update({
        type: activity.type,
        date: activity.date,
        duration: activity.duration,
        intensity: activity.intensity?.toString() ?? null,
        notes: activity.notes ?? null,
      })
      .eq('id', activityId)
      .eq('user_id', currentUser.id)
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to update activity')

    return {
      id: data.id,
      date: data.date,
      type: data.type as ActivityLog['type'],
      duration: data.duration,
      intensity: parseInt(data.intensity ?? '5', 10),
      notes: data.notes ?? undefined,
    }
  },

  async deleteActivity(activityId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { error } = await db
      .from('activity_logs')
      .delete()
      .eq('id', activityId)
      .eq('user_id', currentUser.id)

    if (error) throw new Error(error?.message ?? 'Failed to delete activity')
  },

  // ============================================
  // DRILLS
  // ============================================

  async getDrills(filters?: {
    category?: string
    subcategory?: string
    sport?: SportType
    difficulty?: DrillDifficulty
    search?: string
    limit?: number
  }): Promise<Drill[]> {
    let queryBuilder = db
      .from('drills')
      .select('*')

    if (filters?.category) {
      queryBuilder = queryBuilder.eq('category', filters.category)
    }
    if (filters?.subcategory) {
      queryBuilder = queryBuilder.eq('subcategory', filters.subcategory)
    }
    if (filters?.sport) {
      queryBuilder = queryBuilder.contains('sport_relevance', [filters.sport])
    }
    if (filters?.difficulty) {
      queryBuilder = queryBuilder.eq('difficulty', filters.difficulty)
    }
    if (filters?.search) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await queryBuilder.limit(filters?.limit ?? 100)

    if (error || !data) return []

    return data.map(dbDrillToDrill)
  },

  async getDrillById(drillId: string): Promise<Drill | null> {
    const { data, error } = await db
      .from('drills')
      .select('*')
      .eq('id', drillId)
      .single()

    if (error || !data) return null

    return dbDrillToDrill(data)
  },

  async getRoutines(filters?: {
    type?: 'warmup' | 'recovery' | 'mobility'
    sport?: SportType
    forWorkoutFocus?: string
  }): Promise<Routine[]> {
    let queryBuilder = db
      .from('routines')
      .select('*')

    if (filters?.type) {
      queryBuilder = queryBuilder.eq('type', filters.type)
    }
    if (filters?.sport) {
      queryBuilder = queryBuilder.contains('for_sport', [filters.sport])
    }
    if (filters?.forWorkoutFocus) {
      queryBuilder = queryBuilder.contains('for_workout_focus', [filters.forWorkoutFocus])
    }

    const { data: routines, error } = await queryBuilder

    if (error || !routines) return []

    const typedRoutines = routines as DbRoutine[]
    // Get routine drills
    const routineIds = typedRoutines.map((r: DbRoutine) => r.id)
    const { data: routineDrills } = await db
      .from('routine_drills')
      .select('*')
      .in('routine_id', routineIds)
      .order('order_index')

    const drillsMap = new Map<string, { drillId: string; duration: number | null }[]>()
    ;(routineDrills as DbRoutineDrill[] | null)?.forEach((rd: DbRoutineDrill) => {
      const list = drillsMap.get(rd.routine_id) ?? []
      list.push({ drillId: rd.drill_id, duration: rd.duration })
      drillsMap.set(rd.routine_id, list)
    })

    return typedRoutines.map((r: DbRoutine) => ({
      id: r.id,
      name: r.name,
      type: r.type as 'warmup' | 'recovery' | 'mobility',
      duration: r.duration ?? 10,
      description: r.description ?? '',
      forSport: (r.for_sport ?? []) as SportType[],
      forWorkoutFocus: r.for_workout_focus ?? undefined,
      drills: (drillsMap.get(r.id) ?? []).map(d => ({
        drillId: d.drillId,
        duration: d.duration ?? 30,
      })),
    }))
  },

  async getLearningPaths(filters?: {
    sport?: SportType
    difficulty?: DrillDifficulty
  }): Promise<LearningPath[]> {
    let queryBuilder = db
      .from('learning_paths')
      .select('*')

    if (filters?.sport) {
      queryBuilder = queryBuilder.eq('sport', filters.sport)
    }
    if (filters?.difficulty) {
      queryBuilder = queryBuilder.eq('difficulty', filters.difficulty)
    }

    const { data: paths, error } = await queryBuilder

    if (error || !paths) return []

    const typedPaths = paths as DbLearningPath[]
    // Get learning path drills
    const pathIds = typedPaths.map((p: DbLearningPath) => p.id)
    const { data: pathDrills } = await db
      .from('learning_path_drills')
      .select('*')
      .in('learning_path_id', pathIds)
      .order('order_index')

    const drillsMap = new Map<string, string[]>()
    ;(pathDrills as DbLearningPathDrill[] | null)?.forEach((pd: DbLearningPathDrill) => {
      const list = drillsMap.get(pd.learning_path_id) ?? []
      list.push(pd.drill_id)
      drillsMap.set(pd.learning_path_id, list)
    })

    return typedPaths.map((p: DbLearningPath) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      sport: p.sport as SportType,
      difficulty: (p.difficulty ?? 'beginner') as DrillDifficulty,
      drills: drillsMap.get(p.id) ?? [],
      estimatedWeeks: p.estimated_weeks ?? 4,
    }))
  },

  async trackRecentlyViewed(drillId: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return

    // Upsert - update viewed_at if exists, insert if not
    const { error } = await db
      .from('user_recently_viewed')
      .upsert(
        {
          user_id: currentUser.id,
          drill_id: drillId,
          viewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,drill_id',
        }
      )

    if (error) {
      console.debug('Failed to track recently viewed:', error.message)
    }
  },

  async getRecentlyViewed(limit = 10): Promise<Drill[]> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return []

    const { data: recent, error } = await db
      .from('user_recently_viewed')
      .select('drill_id')
      .eq('user_id', currentUser.id)
      .order('viewed_at', { ascending: false })
      .limit(limit)

    if (error || !recent || recent.length === 0) return []

    const drillIds = (recent as {drill_id: string}[]).map((r: {drill_id: string}) => r.drill_id)
    const { data: drills } = await db
      .from('drills')
      .select('*')
      .in('id', drillIds)

    if (!drills) return []

    // Maintain order
    const drillsMap = new Map((drills as DbDrill[]).map((d: DbDrill) => [d.id, d]))
    return drillIds
      .map((id: string) => drillsMap.get(id))
      .filter((d: DbDrill | undefined): d is DbDrill => !!d)
      .map(dbDrillToDrill)
  },

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async getSubscriptionStatus(): Promise<{
    isActive: boolean
    subscription: {
      id: string
      status: string
      planName: string
      currentPeriodEnd: string | null
      cancelAtPeriodEnd: boolean
      trialEnd: string | null
    } | null
  }> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) {
      return { isActive: false, subscription: null }
    }

    const { data: subscription, error } = await db
      .from('subscriptions')
      .select('*, subscription_plans!inner(*)')
      .eq('user_id', currentUser.id)
      .in('status', ['active', 'trialing'])
      .single()

    if (error || !subscription) {
      return { isActive: false, subscription: null }
    }

    const plan = subscription.subscription_plans as unknown as DbSubscriptionPlan

    const isActive =
      subscription.status === 'active' ||
      (subscription.status === 'trialing' &&
        subscription.trial_end &&
        new Date(subscription.trial_end) > new Date())

    return {
      isActive,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: plan?.name ?? 'Premium',
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        trialEnd: subscription.trial_end,
      },
    }
  },

  async hasActiveSubscription(): Promise<boolean> {
    const { isActive } = await this.getSubscriptionStatus()
    return isActive
  },
}

// Export type for the service
export type SupabaseService = typeof supabaseService

