// ============================================
// SUPABASE SERVICE - Comprehensive backend service
// ============================================

import { supabase } from './supabase'
import type { Database } from './database.types'
import type { User, AuthChangeEvent, Session as AuthSession } from '@supabase/supabase-js'
import {
  UserProfile,
  CustomWorkout,
  WorkoutBuilderState,
  CustomWorkoutExercise,
  AuthState,
  WorkoutFocus,
} from './social-types'
import type { SportType, Drill, Routine, LearningPath, ActivityLog, SessionLog, DrillDifficulty, Equipment, WeightUnit, Session, WeekDay, ExperienceLevel, PrimaryGoal } from './types'

// Type aliases for database rows - used for return type annotations
type DbProfile = Database['public']['Tables']['profiles']['Row']
type DbUserStats = Database['public']['Tables']['user_stats']['Row']
type DbCustomWorkout = Database['public']['Tables']['custom_workouts']['Row']
type DbCustomWorkoutExercise = Database['public']['Tables']['custom_workout_exercises']['Row']
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
type DbTrainingProgram = Database['public']['Tables']['training_programs']['Row']
type DbTrainingProgramVersion = Database['public']['Tables']['training_program_versions']['Row']
type DbTrainingProgramState = Database['public']['Tables']['training_program_state']['Row']
type DbExerciseFavorite = Database['public']['Tables']['exercise_favorites']['Row']
type DbExerciseCompletion = Database['public']['Tables']['exercise_completions']['Row']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface TrainingProgramSnapshot {
  programId: string
  sport: SportType
  trainingDays: number
  currentVersionId: string | null
  originalVersionId: string | null
  sessions: Session[]
}

interface TrainingProgramData {
  sessions: Session[]
}

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
    trainingDays: profile.training_days ?? undefined,
    weightUnit: (profile.weight_unit as WeightUnit) ?? undefined,
    equipment: (profile.equipment as Equipment | null) ?? null,
    onboardingCompleted: profile.onboarding_completed ?? null,
    experienceLevel: (profile.experience_level as ExperienceLevel) ?? undefined,
    bodyweightKg: profile.bodyweight_kg ?? null,
    primaryGoal: (profile.primary_goal as PrimaryGoal) ?? undefined,
    combatSessionsPerWeek: profile.combat_sessions_per_week ?? 0,
    sessionMinutes: profile.session_minutes ?? 45,
    injuryNotes: profile.injury_notes ?? null,
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

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
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
    if (updates.trainingDays !== undefined) dbUpdates.training_days = updates.trainingDays
    if (updates.weightUnit) dbUpdates.weight_unit = updates.weightUnit
    if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment
    if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted
    if (updates.experienceLevel) dbUpdates.experience_level = updates.experienceLevel
    if (updates.bodyweightKg !== undefined) dbUpdates.bodyweight_kg = updates.bodyweightKg
    if (updates.primaryGoal) dbUpdates.primary_goal = updates.primaryGoal
    if (updates.combatSessionsPerWeek !== undefined) dbUpdates.combat_sessions_per_week = updates.combatSessionsPerWeek
    if (updates.sessionMinutes !== undefined) dbUpdates.session_minutes = updates.sessionMinutes
    if (updates.injuryNotes !== undefined) dbUpdates.injury_notes = updates.injuryNotes

    const { error } = await db
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)

    if (error) throw new Error(error.message)

    const profile = await this.getProfile(userId)
    if (!profile) throw new Error('Profile not found after update')

    return profile
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
        visibility: 'private',
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
    dbUpdates.visibility = 'private'
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

  // ============================================
  // TRAINING PROGRAMS
  // ============================================

  async getActiveProgram(): Promise<TrainingProgramSnapshot | null> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return null

    const { data: program, error } = await db
      .from('training_programs')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !program) return null

    let version: DbTrainingProgramVersion | null = null
    if (program.current_version_id) {
      const { data: currentVersion } = await db
        .from('training_program_versions')
        .select('*')
        .eq('id', program.current_version_id)
        .single()
      version = currentVersion ?? null
    }

    const data = (version?.data as TrainingProgramData | null) ?? null
    const sessions = Array.isArray(data?.sessions) ? (data?.sessions as Session[]) : []

    return {
      programId: program.id,
      sport: program.sport as SportType,
      trainingDays: program.training_days,
      currentVersionId: program.current_version_id ?? null,
      originalVersionId: program.original_version_id ?? null,
      sessions,
    }
  },

  async createProgram(params: {
    sport: SportType
    trainingDays: number
    sessions: Session[]
    label?: string
  }): Promise<TrainingProgramSnapshot> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    await db
      .from('training_programs')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('user_id', currentUser.id)
      .eq('status', 'active')

    const { data: program, error: programError } = await db
      .from('training_programs')
      .insert({
        user_id: currentUser.id,
        sport: params.sport,
        training_days: params.trainingDays,
        status: 'active',
      })
      .select()
      .single()

    if (programError || !program) throw new Error(programError?.message ?? 'Failed to create program')

    const { data: version, error: versionError } = await db
      .from('training_program_versions')
      .insert({
        program_id: program.id,
        version_number: 1,
        is_original: true,
        label: params.label ?? 'Original',
        data: { sessions: params.sessions },
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (versionError || !version) throw new Error(versionError?.message ?? 'Failed to create program version')

    await db
      .from('training_programs')
      .update({
        current_version_id: version.id,
        original_version_id: version.id,
      })
      .eq('id', program.id)

    return {
      programId: program.id,
      sport: program.sport as SportType,
      trainingDays: program.training_days,
      currentVersionId: version.id,
      originalVersionId: version.id,
      sessions: params.sessions,
    }
  },

  /**
   * Best-effort resolver: takes blueprint sessions (exercise names + placeholder ids)
   * and replaces exercises with real `exercises.id` UUIDs from Supabase when possible.
   *
   * This is important because exercise completion logging has an FK to `exercises(id)`.
   */
  async resolveProgramSessionsToLibraryExercises(params: {
    sport: SportType
    sessions: Session[]
    equipment?: Equipment | null
  }): Promise<Session[]> {
    const sport = params.sport
    const equipment = params.equipment ?? null

    // Fetch a pool of exercises for this sport + general exercises.
    const { data, error } = await db
      .from('exercises')
      .select('id, name, sport, category, equipment, is_weighted, video_url')
      .or(`sport.eq.${sport},sport.is.null`)
      .limit(2000)

    if (error || !Array.isArray(data) || data.length === 0) {
      return params.sessions
    }

    type DbExerciseRow = {
      id: string
      name: string
      sport: string | null
      category: string
      equipment: string[] | null
      is_weighted: boolean | null
      video_url: string | null
    }

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const tokenSet = (value: string) => new Set(normalize(value).split(' ').filter(Boolean))

    const scoreNameMatch = (needle: string, candidate: string): number => {
      if (!needle || !candidate) return 0
      if (needle === candidate) return 100
      if (candidate.includes(needle)) return 85
      if (needle.includes(candidate)) return 75

      const needleTokens = tokenSet(needle)
      const candTokens = tokenSet(candidate)
      let overlap = 0
      for (const t of needleTokens) {
        if (candTokens.has(t)) overlap++
      }
      const denom = Math.max(needleTokens.size, 1)
      return Math.round((overlap / denom) * 60)
    }

    const pool = (data as DbExerciseRow[]).map((row) => ({
      ...row,
      norm: normalize(row.name),
      tokens: tokenSet(row.name),
    }))

    const isBodyweightMode = equipment === 'bodyweight'

    const pickBest = (targetName: string, usedIds: Set<string>): DbExerciseRow | null => {
      const targetNorm = normalize(targetName)
      if (!targetNorm) return null

      let best: { score: number; row: DbExerciseRow } | null = null

      for (const row of pool) {
        if (usedIds.has(row.id)) continue

        let score = scoreNameMatch(targetNorm, row.norm)
        if (score <= 0) continue

        // Prefer sport-specific exercises over "general" (null sport).
        if (row.sport === sport) score += 6

        // Prefer bodyweight-friendly options if the user has no gym access.
        if (isBodyweightMode) {
          const eq = row.equipment ?? []
          const eqNorm = eq.map((e) => normalize(e))
          const bodyweightTagged = eqNorm.some((e) => e.includes('bodyweight') || e === 'none')
          const clearlyWeighted = row.is_weighted === true || eqNorm.some((e) => e.includes('barbell') || e.includes('dumbbell') || e.includes('kettlebell'))
          if (bodyweightTagged) score += 10
          if (clearlyWeighted) score -= 12
        }

        if (!best || score > best.score) {
          best = { score, row }
        }
      }

      // Require a minimum confidence to avoid bad matches.
      if (!best || best.score < 55) return null
      return best.row
    }

    return params.sessions.map((s) => {
      const used = new Set<string>()
      const resolvedExercises = s.exercises.map((e) => {
        const match = pickBest(e.name, used)
        if (!match) return e

        used.add(match.id)
        return {
          ...e,
          id: match.id,
          name: match.name,
          videoUrl: match.video_url ?? e.videoUrl,
        }
      })

      return { ...s, exercises: resolvedExercises }
    })
  },

  async saveProgramVersion(programId: string, sessions: Session[], label?: string): Promise<string> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { data: latest } = await db
      .from('training_program_versions')
      .select('version_number')
      .eq('program_id', programId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (latest?.version_number ?? 0) + 1

    const { data: version, error } = await db
      .from('training_program_versions')
      .insert({
        program_id: programId,
        version_number: nextVersionNumber,
        is_original: false,
        label: label ?? `Version ${nextVersionNumber}`,
        data: { sessions },
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error || !version) throw new Error(error?.message ?? 'Failed to save program version')

    await db
      .from('training_programs')
      .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
      .eq('id', programId)

    return version.id
  },

  async setProgramVersion(programId: string, versionId: string): Promise<Session[]> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    const { data: version, error } = await db
      .from('training_program_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (error || !version) throw new Error(error?.message ?? 'Failed to load program version')

    await db
      .from('training_programs')
      .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
      .eq('id', programId)

    const data = (version.data as TrainingProgramData | null) ?? null
    return Array.isArray(data?.sessions) ? (data?.sessions as Session[]) : []
  },

  async getOriginalProgramSessions(programId: string): Promise<Session[]> {
    const { data: program } = await db
      .from('training_programs')
      .select('original_version_id')
      .eq('id', programId)
      .single()

    if (!program?.original_version_id) return []
    return this.setProgramVersion(programId, program.original_version_id)
  },

  async getProgramState(): Promise<WeekDay[] | null> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return null

    const { data } = await db
      .from('training_program_state')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()

    if (!data) return null
    const payload = data as DbTrainingProgramState
    return (payload.week_progress as unknown as WeekDay[]) ?? null
  },

  async upsertProgramState(programId: string | null, weekProgress: WeekDay[]): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return

    await db
      .from('training_program_state')
      .upsert({
        user_id: currentUser.id,
        program_id: programId,
        week_progress: weekProgress,
        updated_at: new Date().toISOString(),
      })
  },

  // ============================================
  // WORKOUT DAY OVERRIDES (AAA "TODAY" INSTANCES)
  // ============================================

  async getWorkoutDayOverride(workoutDate: string): Promise<{ data: any; updatedAt: string } | null> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return null

    try {
      const { data, error } = await db
        .from('workout_day_overrides')
        .select('data, updated_at')
        .eq('user_id', currentUser.id)
        .eq('workout_date', workoutDate)
        .maybeSingle()

      if (error || !data) return null
      return {
        data: (data as any).data,
        updatedAt: (data as any).updated_at ?? new Date().toISOString(),
      }
    } catch (error) {
      // Table may not exist yet (migration not applied) or network error.
      console.debug('Failed to fetch workout day override:', error)
      return null
    }
  },

  async upsertWorkoutDayOverride(workoutDate: string, payload: any): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return

    try {
      await db
        .from('workout_day_overrides')
        .upsert(
          {
            user_id: currentUser.id,
            workout_date: workoutDate,
            data: payload,
            // Use the payload's timestamp to avoid endless realtime update loops.
            updated_at: payload?.updatedAt ?? new Date().toISOString(),
          },
          { onConflict: 'user_id,workout_date' }
        )
    } catch (error) {
      console.debug('Failed to upsert workout day override:', error)
    }
  },

  async deleteWorkoutDayOverride(workoutDate: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return

    try {
      await db
        .from('workout_day_overrides')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('workout_date', workoutDate)
    } catch (error) {
      console.debug('Failed to delete workout day override:', error)
    }
  },

  // ============================================
  // EXERCISE FAVORITES & COMPLETIONS
  // ============================================

  async getExerciseFavorites(): Promise<Set<string>> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return new Set()

    const { data } = await db
      .from('exercise_favorites')
      .select('exercise_id')
      .eq('user_id', currentUser.id)

    const ids = (data as DbExerciseFavorite[] | null)?.map((row) => row.exercise_id) ?? []
    return new Set(ids)
  },

  async setExerciseFavorite(exerciseId: string, shouldFavorite: boolean): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) throw new Error('Must be logged in')

    if (shouldFavorite) {
      const { error } = await db
        .from('exercise_favorites')
        .insert({ user_id: currentUser.id, exercise_id: exerciseId })
      if (error && !error.message.includes('duplicate')) throw new Error(error.message)
    } else {
      const { error } = await db
        .from('exercise_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('exercise_id', exerciseId)
      if (error) throw new Error(error.message)
    }
  },

  async getExerciseCompletions(): Promise<Set<string>> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser) return new Set()

    const { data } = await db
      .from('exercise_completions')
      .select('exercise_id')
      .eq('user_id', currentUser.id)
      .order('completed_at', { ascending: false })
      .limit(200)

    const ids = (data as DbExerciseCompletion[] | null)?.map((row) => row.exercise_id) ?? []
    return new Set(ids)
  },

  async logExerciseCompletions(exerciseIds: string[], sessionLogId?: string, source?: string): Promise<void> {
    const currentUser = await this.getCurrentUser()
    if (!currentUser || exerciseIds.length === 0) return

    const inserts = exerciseIds.map((exerciseId) => ({
      user_id: currentUser.id,
      exercise_id: exerciseId,
      session_log_id: sessionLogId ?? null,
      source: source ?? null,
      completed_at: new Date().toISOString(),
    }))

    const { error } = await db
      .from('exercise_completions')
      .insert(inserts)

    if (error) {
      console.debug('Failed to log exercise completions:', error.message)
    }
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
