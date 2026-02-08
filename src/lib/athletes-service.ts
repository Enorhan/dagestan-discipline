/**
 * Athletes Service
 *
 * Service layer for fetching elite athlete data and exercise recommendations.
 * Provides methods to get exercises with both athlete data and user-level recommendations.
 * Includes caching and local fallback for offline support.
 */

import { supabase } from './supabase'
import type {
  Athlete,
  AthleteExerciseData,
  AthleteExerciseGroup,
  EnhancedAthleteExerciseGroup,
  EnhancedExerciseData,
  ExerciseCategory,
  ExerciseCounts,
  ExerciseRecommendation,
  ExerciseWithGuidance,
  ExperienceLevel,
  SportType
} from './types'
import { getAthleteExercisesBySport, getExerciseCategory } from './athlete-exercises'

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface AthletesCache {
  athletes: Map<string, { data: Athlete[]; timestamp: number }>
  exercisesByCategory: Map<string, { data: AthleteExerciseGroup[]; timestamp: number }>
  enhancedExercises: Map<string, { data: EnhancedAthleteExerciseGroup[]; timestamp: number }>
  exerciseCounts: { data: ExerciseCounts; timestamp: number } | null
  latestDataAt: string | null
}

const cache: AthletesCache = {
  athletes: new Map(),
  exercisesByCategory: new Map(),
  enhancedExercises: new Map(),
  exerciseCounts: null,
  latestDataAt: null,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

export class AthletesService {
  private async refreshCacheIfPublishedUpdates(): Promise<void> {
    try {
      const [publishedResult, exerciseResult, linkResult] = await Promise.all([
        db
          .from('published_records')
          .select('published_at')
          .order('published_at', { ascending: false })
          .limit(1),
        supabase
          .from('exercises')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('athlete_exercises')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      const publishedAt = (publishedResult.data?.[0] as { published_at?: string } | undefined)?.published_at ?? null
      const latestExerciseAt = (exerciseResult.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null
      const latestLinkAt = (linkResult.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null
      const latest = [publishedAt, latestExerciseAt, latestLinkAt].filter(Boolean).sort().pop() ?? null

      if (!latest) {
        return
      }

      if (cache.latestDataAt && latest > cache.latestDataAt) {
        this.clearCache(true)
      }

      cache.latestDataAt = latest
    } catch {
      // Best effort cache invalidation only.
    }
  }

  /**
   * Get all athletes, optionally filtered by sport
   */
  async getAthletes(sport?: SportType): Promise<Athlete[]> {
    await this.refreshCacheIfPublishedUpdates()

    let query = supabase
      .from('athletes')
      .select('*')
      .order('name')

    if (sport) {
      query = query.eq('sport', sport)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('[AthletesService] Error fetching athletes:', error)
      return []
    }

    return data.map((a: any) => ({
      id: a.id,
      name: a.name,
      sport: a.sport as SportType,
      nationality: a.nationality,
      achievements: a.achievements,
      bio: a.bio,
      imageUrl: a.image_url
    }))
  }

  /**
   * Get a single athlete by ID
   */
  async getAthleteById(athleteId: string): Promise<Athlete | null> {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    if (error || !data) {
      console.error('[AthletesService] Error fetching athlete:', error)
      return null
    }

    const athlete: any = data

    return {
      id: athlete.id,
      name: athlete.name,
      sport: athlete.sport as SportType,
      nationality: athlete.nationality,
      achievements: athlete.achievements,
      bio: athlete.bio,
      imageUrl: athlete.image_url
    }
  }

  /**
   * Get exercises for a specific athlete with recommendations for user level
   */
  async getAthleteExercises(
    athleteId: string,
    userLevel: ExperienceLevel = 'beginner'
  ): Promise<ExerciseWithGuidance[]> {
    const { data, error } = await supabase
      .from('athlete_exercises')
      .select(`
        *,
        exercise:exercises(*),
        athlete:athletes(*)
      `)
      .eq('athlete_id', athleteId)
      .order('priority', { ascending: false })

    if (error || !data) {
      console.error('[AthletesService] Error fetching athlete exercises:', error)
      return []
    }

    // Fetch recommendations for each exercise
    const exercisesWithGuidance = await Promise.all(
      data.map(async (ae: any) => {
        const recommendations = await this.getRecommendations(ae.exercise.id, userLevel)

        return {
          id: ae.exercise.id,
          name: ae.exercise.name,
          category: ae.exercise.category,
          muscleGroups: ae.exercise.muscle_groups || [],
          description: ae.exercise.description,
          equipment: ae.exercise.equipment || [],
          isWeighted: ae.exercise.is_weighted || false,
          sport: ae.exercise.sport as SportType | undefined,
          athleteSpecific: ae.exercise.athlete_specific || false,
          videoUrl: ae.exercise.video_url,
          athleteData: [{
            athleteId: ae.athlete.id,
            athleteName: ae.athlete.name,
            athleteSport: ae.athlete.sport as SportType,
            athleteAchievements: ae.athlete.achievements || [],
            reps: ae.reps,
            sets: ae.sets,
            weight: ae.weight,
            duration: ae.duration,
            frequency: ae.frequency,
            priority: ae.priority || 5,
            notes: ae.notes,
            source: 'research' as const,
            verified: true
          }],
          recommendations
        }
      })
    )

    return exercisesWithGuidance
  }

  /**
   * Get exercise with both athlete data and recommendations
   */
  async getExerciseWithGuidance(
    exerciseId: string,
    userLevel: ExperienceLevel
  ): Promise<ExerciseWithGuidance | null> {
    // 1. Get base exercise
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .single()

    if (exerciseError || !exercise) {
      console.error('[AthletesService] Error fetching exercise:', exerciseError)
      return null
    }

    const ex: any = exercise

    // 2. Get athlete data
    const athleteData = await this.getAthleteDataForExercise(exerciseId)

    // 3. Get recommendations
    const recommendations = await this.getRecommendations(exerciseId, userLevel)

    return {
      id: ex.id,
      name: ex.name,
      category: ex.category,
      muscleGroups: ex.muscle_groups || [],
      description: ex.description,
      equipment: ex.equipment || [],
      isWeighted: ex.is_weighted || false,
      sport: ex.sport as SportType | undefined,
      athleteSpecific: ex.athlete_specific || false,
      videoUrl: ex.video_url,
      athleteData,
      recommendations
    }
  }

  /**
   * Get athlete data for a specific exercise
   */
  private async getAthleteDataForExercise(
    exerciseId: string
  ): Promise<AthleteExerciseData[]> {
    const { data, error } = await supabase
      .from('athlete_exercises')
      .select(`
        *,
        athlete:athletes(
          id,
          name,
          sport,
          achievements
        )
      `)
      .eq('exercise_id', exerciseId)
      .order('priority', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((ae: any) => ({
      athleteId: ae.athlete.id,
      athleteName: ae.athlete.name,
      athleteSport: ae.athlete.sport as SportType,
      athleteAchievements: ae.athlete.achievements || [],
      reps: ae.reps,
      sets: ae.sets,
      weight: ae.weight,
      duration: ae.duration,
      frequency: ae.frequency,
      priority: ae.priority || 5,
      notes: ae.notes,
      source: 'research' as const,
      verified: true
    }))
  }

  /**
   * Get recommendations for a specific exercise and user level
   */
  private async getRecommendations(
    exerciseId: string,
    userLevel: ExperienceLevel
  ): Promise<ExerciseRecommendation | undefined> {
    const { data, error } = await supabase
      .from('exercise_recommendations')
      .select('*')
      .eq('exercise_id', exerciseId)
      .eq('experience_level', userLevel)
      .single()

    if (error || !data) {
      return undefined
    }

    const rec: any = data

    return {
      experienceLevel: rec.experience_level as ExperienceLevel,
      setsRange: { min: rec.sets_min, max: rec.sets_max },
      repsRange: { min: rec.reps_min, max: rec.reps_max },
      restRange: { min: rec.rest_seconds_min, max: rec.rest_seconds_max },
      tempo: rec.tempo,
      progressionNotes: rec.progression_notes,
      regressionNotes: rec.regression_notes,
      source: 'recommendation' as const,
      basedOn: 'exercise-science' as const
    }
  }

  /**
   * Search exercises by name, optionally filtered by sport
   */
  async searchExercises(
    query: string,
    sport?: SportType,
    athleteSpecificOnly: boolean = false
  ): Promise<ExerciseWithGuidance[]> {
    let dbQuery = supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')

    if (sport) {
      dbQuery = dbQuery.eq('sport', sport)
    }

    if (athleteSpecificOnly) {
      dbQuery = dbQuery.eq('athlete_specific', true)
    }

    const { data, error } = await dbQuery

    if (error || !data) {
      console.error('[AthletesService] Error searching exercises:', error)
      return []
    }

    return data.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      category: ex.category,
      muscleGroups: ex.muscle_groups || [],
      description: ex.description,
      equipment: ex.equipment || [],
      isWeighted: ex.is_weighted || false,
      sport: ex.sport as SportType | undefined,
      athleteSpecific: ex.athlete_specific || false,
      videoUrl: ex.video_url
    }))
  }

  /**
   * Get exercises by category and sport
   */
  async getExercisesByCategory(
    category: string,
    sport?: SportType
  ): Promise<ExerciseWithGuidance[]> {
    let query = supabase
      .from('exercises')
      .select('*')
      .eq('category', category)
      .order('name')

    if (sport) {
      query = query.eq('sport', sport)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('[AthletesService] Error fetching exercises by category:', error)
      return []
    }

    return data.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      category: ex.category,
      muscleGroups: ex.muscle_groups || [],
      description: ex.description,
      equipment: ex.equipment || [],
      isWeighted: ex.is_weighted || false,
      sport: ex.sport as SportType | undefined,
      athleteSpecific: ex.athlete_specific || false,
      videoUrl: ex.video_url
    }))
  }

  /**
   * Get exercises grouped by athlete for a specific sport and category
   * Uses caching and falls back to local data on error
   */
  async getExercisesBySportAndCategory(
    sport: SportType,
    category: ExerciseCategory
  ): Promise<AthleteExerciseGroup[]> {
    await this.refreshCacheIfPublishedUpdates()

    const cacheKey = `${sport}-${category}`

    // Check cache first
    const cached = cache.exercisesByCategory.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      // Fetch from Supabase with athlete join
      const { data, error } = await supabase
        .from('athlete_exercises')
        .select(`
          *,
          exercise:exercises!inner(*),
          athlete:athletes!inner(id, name, sport, achievements)
        `)
        .eq('athlete.sport', sport)
        .order('athlete(name)')

      if (error || !data || data.length === 0) {
        console.debug('[AthletesService] Falling back to local data for:', cacheKey)
        return this.getLocalExercisesBySportAndCategory(sport, category)
      }

      // Filter by category and group by athlete
      const grouped = this.groupExercisesByAthlete(data, category)

      // Cache the result
      cache.exercisesByCategory.set(cacheKey, {
        data: grouped,
        timestamp: Date.now()
      })

      return grouped
    } catch (error) {
      console.debug('[AthletesService] Error fetching from Supabase, using local data:', error)
      return this.getLocalExercisesBySportAndCategory(sport, category)
    }
  }

  /**
   * Group raw Supabase data by athlete
   */
  private groupExercisesByAthlete(
    data: any[],
    category: ExerciseCategory
  ): AthleteExerciseGroup[] {
    const athleteMap = new Map<string, { athlete: string; sport: SportType; exercises: string[] }>()

    for (const item of data) {
      const exercise = item.exercise
      const athlete = item.athlete

      // Filter by category
      const exerciseCategory = getExerciseCategory(exercise.name)
      if (exerciseCategory !== category) continue

      const key = athlete.id
      if (!athleteMap.has(key)) {
        athleteMap.set(key, {
          athlete: athlete.name,
          sport: athlete.sport as SportType,
          exercises: []
        })
      }

      const group = athleteMap.get(key)!
      if (!group.exercises.includes(exercise.name)) {
        group.exercises.push(exercise.name)
      }
    }

    return Array.from(athleteMap.values()).filter(g => g.exercises.length > 0)
  }

  /**
   * Get exercises from local static data (fallback for offline/errors)
   */
  getLocalExercisesBySportAndCategory(
    sport: SportType,
    category: ExerciseCategory
  ): AthleteExerciseGroup[] {
    const allGroups = getAthleteExercisesBySport(sport)

    // Filter exercises by category
    return allGroups
      .map(group => ({
        ...group,
        exercises: group.exercises.filter(ex => getExerciseCategory(ex) === category)
      }))
      .filter(group => group.exercises.length > 0)
  }

  /**
   * Get enhanced exercises with full details by sport and category
   * Returns full exercise data including equipment, muscle groups, and athlete-specific data
   */
  async getEnhancedExercisesBySportAndCategory(
    sport: SportType,
    category: ExerciseCategory
  ): Promise<EnhancedAthleteExerciseGroup[]> {
    await this.refreshCacheIfPublishedUpdates()

    const cacheKey = `enhanced-${sport}-${category}`

    // Check cache first
    const cached = cache.enhancedExercises.get(cacheKey)
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }

    // Type for the joined query response
    interface AthleteExerciseJoined {
      id: string
      athlete_id: string
      exercise_id: string
      reps?: string
      sets?: string
      weight?: string
      duration?: string
      frequency?: string
      priority: number
      notes?: string
      exercise: {
        id: string
        name: string
        category: string
        muscle_groups: string[]
        equipment: string[]
        description?: string
        video_url?: string
        is_weighted: boolean
      }
      athlete: {
        id: string
        name: string
        sport: string
        achievements: string[]
        image_url?: string
      }
    }

    try {
      // Fetch exercises with athlete data
      const { data, error } = await supabase
        .from('athlete_exercises')
        .select(`
          *,
          exercise:exercises!inner(*),
          athlete:athletes!inner(id, name, sport, achievements, image_url)
        `)
        .eq('athlete.sport', sport)
        .eq('exercise.category', category)
        .order('priority', { ascending: false })

      if (error || !data || data.length === 0) {
        console.debug('[AthletesService] No enhanced data for:', cacheKey)
        return []
      }

      // Cast to our typed interface
      const typedData = data as unknown as AthleteExerciseJoined[]

      // Group by athlete with enhanced exercise data
      const athleteMap = new Map<string, EnhancedAthleteExerciseGroup>()

      for (const item of typedData) {
        const exercise = item.exercise
        const athlete = item.athlete

        if (!athleteMap.has(athlete.id)) {
          athleteMap.set(athlete.id, {
            athleteId: athlete.id,
            athleteName: athlete.name,
            sport: athlete.sport as SportType,
            achievements: athlete.achievements || [],
            exercises: [],
            imageUrl: athlete.image_url
          })
        }

        const group = athleteMap.get(athlete.id)!
        group.exercises.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          muscleGroups: exercise.muscle_groups || [],
          equipment: exercise.equipment || [],
          description: exercise.description,
          videoUrl: exercise.video_url,
          isWeighted: exercise.is_weighted || false,
          sport: athlete.sport as SportType,
          athleteId: athlete.id,
          athleteName: athlete.name,
          athleteAchievements: athlete.achievements || [],
          reps: item.reps,
          sets: item.sets,
          weight: item.weight,
          duration: item.duration,
          frequency: item.frequency,
          priority: item.priority || 5,
          notes: item.notes
        })
      }

      const result = Array.from(athleteMap.values())

      // Cache the result
      cache.enhancedExercises.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      console.error('[AthletesService] Error fetching enhanced exercises:', error)
      return []
    }
  }

  /**
   * Get exercise counts per sport and category
   */
  async getExerciseCounts(): Promise<ExerciseCounts> {
    await this.refreshCacheIfPublishedUpdates()

    // Check cache first
    if (cache.exerciseCounts && isCacheValid(cache.exerciseCounts.timestamp)) {
      return cache.exerciseCounts.data
    }

    const defaultCounts: ExerciseCounts = {
      bySport: { wrestling: 0, judo: 0, bjj: 0 },
      byCategory: {
        'full-body': 0, legs: 0, chest: 0, shoulders: 0,
        back: 0, arms: 0, core: 0, neck: 0
      },
      bySportAndCategory: {},
      athletesBySport: { wrestling: 0, judo: 0, bjj: 0 }
    }

    // Types for query responses
    interface ExerciseRow { id: string; sport: string; category: string }
    interface AthleteRow { id: string; sport: string }

    try {
      // Get exercise counts by sport and category
      const { data: exercisesData, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, sport, category')

      if (exerciseError || !exercisesData) {
        return defaultCounts
      }

      const exercises = exercisesData as unknown as ExerciseRow[]

      // Get athlete counts by sport
      const { data: athletesData, error: athleteError } = await supabase
        .from('athletes')
        .select('id, sport')

      if (athleteError || !athletesData) {
        return defaultCounts
      }

      const athletes = athletesData as unknown as AthleteRow[]

      // Calculate counts
      const counts: ExerciseCounts = { ...defaultCounts }

      for (const exercise of exercises) {
        const sport = exercise.sport as SportType
        const category = exercise.category as ExerciseCategory

        if (sport && counts.bySport[sport] !== undefined) {
          counts.bySport[sport]++
        }
        if (category && counts.byCategory[category] !== undefined) {
          counts.byCategory[category]++
        }
        if (sport && category) {
          const key = `${sport}-${category}`
          counts.bySportAndCategory[key] = (counts.bySportAndCategory[key] || 0) + 1
        }
      }

      for (const athlete of athletes) {
        const sport = athlete.sport as SportType
        if (sport && counts.athletesBySport[sport] !== undefined) {
          counts.athletesBySport[sport]++
        }
      }

      // Cache the result
      cache.exerciseCounts = {
        data: counts,
        timestamp: Date.now()
      }

      return counts
    } catch (error) {
      console.error('[AthletesService] Error fetching exercise counts:', error)
      return defaultCounts
    }
  }

  /**
   * Get unique equipment list for a sport
   */
  async getEquipmentForSport(sport: SportType): Promise<string[]> {
    interface EquipmentRow { equipment: string[] | null }

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('equipment')
        .eq('sport', sport)

      if (error || !data) {
        return []
      }

      const typedData = data as unknown as EquipmentRow[]
      const equipmentSet = new Set<string>()
      for (const exercise of typedData) {
        if (exercise.equipment) {
          for (const eq of exercise.equipment) {
            equipmentSet.add(eq)
          }
        }
      }

      return Array.from(equipmentSet).sort()
    } catch (error) {
      console.error('[AthletesService] Error fetching equipment:', error)
      return []
    }
  }

  /**
   * Clear the cache (useful for forcing refresh)
   */
  clearCache(preserveDataVersion: boolean = false): void {
    cache.athletes.clear()
    cache.exercisesByCategory.clear()
    cache.enhancedExercises.clear()
    cache.exerciseCounts = null
    if (!preserveDataVersion) {
      cache.latestDataAt = null
    }
  }
}

// Export singleton instance
export const athletesService = new AthletesService()
