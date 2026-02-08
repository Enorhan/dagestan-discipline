'use client'

import { supabaseService } from '@/lib/supabase-service'
import { supabase } from '@/lib/supabase'
import type { Drill, Routine, LearningPath, DrillCategory, SportType, DrillDifficulty } from './types'
import {
  allDrills as localAllDrills,
  routines as localRoutines,
  learningPaths as localLearningPaths,
  getDrillsByCategory as localGetDrillsByCategory,
  getDrillById as localGetDrillById,
  getRoutineById as localGetRoutineById,
  getLearningPathById as localGetLearningPathById,
} from './drills-data'

// In-memory cache
interface DrillsCache {
  drills: Drill[] | null
  drillsTimestamp: number | null
  routines: Routine[] | null
  routinesTimestamp: number | null
  learningPaths: LearningPath[] | null
  learningPathsTimestamp: number | null
  drillsById: Map<string, Drill>
  routinesById: Map<string, Routine>
  learningPathsById: Map<string, LearningPath>
  latestDataAt: string | null
}

const cache: DrillsCache = {
  drills: null,
  drillsTimestamp: null,
  routines: null,
  routinesTimestamp: null,
  learningPaths: null,
  learningPathsTimestamp: null,
  drillsById: new Map(),
  routinesById: new Map(),
  learningPathsById: new Map(),
  latestDataAt: null,
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000

function isCacheValid(timestamp: number | null): boolean {
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_TTL
}

export const drillsService = {
  async refreshCacheIfDataUpdates(): Promise<void> {
    try {
      const [drillsResult, routinesResult] = await Promise.all([
        supabase
          .from('drills')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('routines')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      const drillLatest = (drillsResult.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null
      const routineLatest = (routinesResult.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null
      const latest = [drillLatest, routineLatest].filter(Boolean).sort().pop() ?? null

      if (!latest) {
        return
      }

      if (cache.latestDataAt && latest > cache.latestDataAt) {
        this.clearCache(true)
      }

      cache.latestDataAt = latest
    } catch {
      // Cache invalidation is best-effort.
    }
  },

  /**
   * Get all drills from Supabase, with fallback to local data
   */
  async getDrills(filters?: {
    category?: DrillCategory
    sport?: SportType
    difficulty?: DrillDifficulty
    search?: string
  }): Promise<Drill[]> {
    await this.refreshCacheIfDataUpdates()

    // Check cache first (only for unfiltered requests)
    if (!filters && cache.drills && isCacheValid(cache.drillsTimestamp)) {
      return cache.drills
    }

    try {
      const drills = await supabaseService.getDrills({
        category: filters?.category,
        sport: filters?.sport,
        difficulty: filters?.difficulty,
        search: filters?.search,
      })

      if (drills && drills.length > 0) {
        // Update cache for unfiltered requests
        if (!filters) {
          cache.drills = drills
          cache.drillsTimestamp = Date.now()
          // Update individual drill cache
          drills.forEach(drill => cache.drillsById.set(drill.id, drill))
        }
        return drills
      }

      // Fallback to local data
      console.debug('Falling back to local drills data')
      return this.getLocalDrills(filters)
    } catch (error) {
      console.debug('Error fetching drills from Supabase, using local data:', error)
      return this.getLocalDrills(filters)
    }
  },

  getLocalDrills(filters?: {
    category?: DrillCategory
    sport?: SportType
    difficulty?: DrillDifficulty
    search?: string
  }): Drill[] {
    let drills = [...localAllDrills]

    if (filters?.category) {
      drills = drills.filter(d => d.category === filters.category)
    }
    if (filters?.sport) {
      drills = drills.filter(d => d.sportRelevance?.includes(filters.sport!))
    }
    if (filters?.difficulty) {
      drills = drills.filter(d => d.difficulty === filters.difficulty)
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      drills = drills.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower)
      )
    }

    return drills
  },

  /**
   * Get drill by ID from Supabase, with fallback to local data
   */
  async getDrillById(id: string): Promise<Drill | null> {
    // Check cache first
    if (cache.drillsById.has(id)) {
      return cache.drillsById.get(id)!
    }

    try {
      const drill = await supabaseService.getDrillById(id)
      if (drill) {
        cache.drillsById.set(id, drill)
        return drill
      }

      // Fallback to local data
      console.debug('Falling back to local drill data for:', id)
      return localGetDrillById(id) ?? null
    } catch (error) {
      console.debug('Error fetching drill from Supabase, using local data:', error)
      return localGetDrillById(id) ?? null
    }
  },

  /**
   * Get drills by category
   */
  async getDrillsByCategory(category: DrillCategory): Promise<Drill[]> {
    return this.getDrills({ category })
  },

  /**
   * Get all routines from Supabase, with fallback to local data
   */
  async getRoutines(filters?: {
    type?: 'warmup' | 'recovery' | 'mobility'
    sport?: SportType
  }): Promise<Routine[]> {
    await this.refreshCacheIfDataUpdates()

    // Check cache first (only for unfiltered requests)
    if (!filters && cache.routines && isCacheValid(cache.routinesTimestamp)) {
      return cache.routines
    }

    try {
      const routines = await supabaseService.getRoutines(filters)

      if (routines && routines.length > 0) {
        if (!filters) {
          cache.routines = routines
          cache.routinesTimestamp = Date.now()
          routines.forEach(r => cache.routinesById.set(r.id, r))
        }
        return routines
      }

      console.debug('Falling back to local routines data')
      return this.getLocalRoutines(filters)
    } catch (error) {
      console.debug('Error fetching routines from Supabase, using local data:', error)
      return this.getLocalRoutines(filters)
    }
  },

  getLocalRoutines(filters?: {
    type?: 'warmup' | 'recovery' | 'mobility'
    sport?: SportType
  }): Routine[] {
    let routines = [...localRoutines]

    if (filters?.type) {
      routines = routines.filter(r => r.type === filters.type)
    }
    if (filters?.sport) {
      routines = routines.filter(r => r.forSport?.includes(filters.sport!))
    }

    return routines
  },

  /**
   * Get routine by ID with its drills populated
   */
  async getRoutineWithDrills(id: string): Promise<{ routine: Routine; drillDetails: Drill[] } | null> {
    // Check cache first
    let routine = cache.routinesById.get(id)

    if (!routine) {
      try {
        const routines = await this.getRoutines()
        routine = routines.find(r => r.id === id)
      } catch {
        routine = localGetRoutineById(id)
      }
    }

    if (!routine) return null

    // Fetch all drills for this routine
    const drillDetails: Drill[] = []
    for (const rd of routine.drills) {
      const drill = await this.getDrillById(rd.drillId)
      if (drill) {
        drillDetails.push(drill)
      }
    }

    return { routine, drillDetails }
  },

  /**
   * Get all learning paths from Supabase, with fallback to local data
   */
  async getLearningPaths(filters?: {
    sport?: SportType
    difficulty?: DrillDifficulty
  }): Promise<LearningPath[]> {
    await this.refreshCacheIfDataUpdates()

    // Check cache first (only for unfiltered requests)
    if (!filters && cache.learningPaths && isCacheValid(cache.learningPathsTimestamp)) {
      return cache.learningPaths
    }

    try {
      const paths = await supabaseService.getLearningPaths(filters)

      if (paths && paths.length > 0) {
        if (!filters) {
          cache.learningPaths = paths
          cache.learningPathsTimestamp = Date.now()
          paths.forEach(p => cache.learningPathsById.set(p.id, p))
        }
        return paths
      }

      console.debug('Falling back to local learning paths data')
      return this.getLocalLearningPaths(filters)
    } catch (error) {
      console.debug('Error fetching learning paths from Supabase, using local data:', error)
      return this.getLocalLearningPaths(filters)
    }
  },

  getLocalLearningPaths(filters?: {
    sport?: SportType
    difficulty?: DrillDifficulty
  }): LearningPath[] {
    let paths = [...localLearningPaths]

    if (filters?.sport) {
      paths = paths.filter(p => p.sport === filters.sport)
    }
    if (filters?.difficulty) {
      paths = paths.filter(p => p.difficulty === filters.difficulty)
    }

    return paths
  },

  /**
   * Get learning path by ID with its drills populated
   */
  async getLearningPathWithDrills(id: string): Promise<{ path: LearningPath; drillDetails: Drill[] } | null> {
    // Check cache first
    let path = cache.learningPathsById.get(id)

    if (!path) {
      try {
        const paths = await this.getLearningPaths()
        path = paths.find(p => p.id === id)
      } catch {
        path = localGetLearningPathById(id)
      }
    }

    if (!path) return null

    // Fetch all drills for this learning path
    const drillDetails: Drill[] = []
    for (const drillId of path.drills) {
      const drill = await this.getDrillById(drillId)
      if (drill) {
        drillDetails.push(drill)
      }
    }

    return { path, drillDetails }
  },

  /**
   * Get recently viewed drills
   */
  async getRecentlyViewedDrills(limit = 10): Promise<Drill[]> {
    try {
      return await supabaseService.getRecentlyViewed(limit)
    } catch {
      return []
    }
  },

  /**
   * Track a recently viewed drill
   */
  async trackRecentlyViewed(drillId: string): Promise<void> {
    try {
      await supabaseService.trackRecentlyViewed(drillId)
    } catch (error) {
      console.debug('Failed to track recently viewed:', error)
    }
  },

  /**
   * Clear the cache (useful for forcing refresh)
   */
  clearCache(preserveDataVersion: boolean = false): void {
    cache.drills = null
    cache.drillsTimestamp = null
    cache.routines = null
    cache.routinesTimestamp = null
    cache.learningPaths = null
    cache.learningPathsTimestamp = null
    cache.drillsById.clear()
    cache.routinesById.clear()
    cache.learningPathsById.clear()
    if (!preserveDataVersion) {
      cache.latestDataAt = null
    }
  },

  /**
   * Get local data directly (for fallback scenarios)
   */
  getLocalDrillsByCategory(category: DrillCategory): Drill[] {
    return localGetDrillsByCategory(category)
  },
}
