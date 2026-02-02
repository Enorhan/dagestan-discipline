// ============================================
// SOCIAL SERVICE - Offline-first with Supabase-ready architecture
// ============================================

import {
  UserProfile,
  CustomWorkout,
  SavedWorkout,
  FeedItem,
  WorkoutSearchFilters,
  UserSearchFilters,
  WorkoutBuilderState,
  CustomWorkoutExercise,
  AuthState
} from './social-types'

const STORAGE_KEYS = {
  AUTH: 'dagestani.social.auth',
  MY_WORKOUTS: 'dagestani.social.myWorkouts',
  SAVED_WORKOUTS: 'dagestani.social.savedWorkouts',
  FOLLOWING: 'dagestani.social.following',
  FOLLOWERS: 'dagestani.social.followers',
  ALL_USERS: 'dagestani.social.allUsers',
  ALL_PUBLIC_WORKOUTS: 'dagestani.social.publicWorkouts'
}

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// ============================================
// AUTH FUNCTIONS
// ============================================

export const socialService = {
  // Get current auth state
  getAuthState(): AuthState {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false, user: null, isLoading: false, error: null }
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { isAuthenticated: true, user: parsed, isLoading: false, error: null }
      }
    } catch (e) {
      console.debug('Failed to get auth state:', e)
    }
    return { isAuthenticated: false, user: null, isLoading: false, error: null }
  },

  // Sign up new user
  async signUp(username: string, displayName: string, sport: 'wrestling' | 'bjj' | 'judo'): Promise<UserProfile> {
    const existingUsers = this.getAllUsers()
    if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already taken')
    }

    const user: UserProfile = {
      id: generateId(),
      username: username.toLowerCase(),
      displayName,
      sport,
      createdAt: new Date().toISOString(),
      workoutCount: 0,
      followerCount: 0,
      followingCount: 0,
      totalSaves: 0
    }

    // Save to all users
    const allUsers = [...existingUsers, user]
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(allUsers))
    
    // Set as current user
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user))
    
    return user
  },

  // Sign in existing user
  async signIn(username: string): Promise<UserProfile> {
    const users = this.getAllUsers()
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
    if (!user) {
      throw new Error('User not found')
    }
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user))
    return user
  },

  // Sign out
  signOut(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH)
  },

  // Get all users (for demo/offline mode)
  getAllUsers(): UserProfile[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALL_USERS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const users = this.getAllUsers()
    const index = users.findIndex(u => u.id === userId)
    if (index === -1) throw new Error('User not found')
    
    users[index] = { ...users[index], ...updates }
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users))
    
    // Update auth if current user
    const auth = this.getAuthState()
    if (auth.user?.id === userId) {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(users[index]))
    }
    
    return users[index]
  },

  // ============================================
  // WORKOUT FUNCTIONS
  // ============================================

  // Create new workout
  async createWorkout(state: WorkoutBuilderState): Promise<CustomWorkout> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')

    const workout: CustomWorkout = {
      id: generateId(),
      creatorId: auth.user.id,
      creator: auth.user,
      name: state.name,
      description: state.description,
      focus: state.focus,
      difficulty: state.difficulty,
      estimatedDuration: this.calculateDuration(state.exercises),
      sportRelevance: state.sportRelevance,
      exercises: state.exercises.map((e, i) => ({ ...e, order: i })),
      visibility: state.visibility,
      saveCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save to my workouts
    const myWorkouts = this.getMyWorkouts()
    myWorkouts.unshift(workout)
    localStorage.setItem(STORAGE_KEYS.MY_WORKOUTS, JSON.stringify(myWorkouts))

    // If public, add to public feed
    if (workout.visibility === 'public') {
      const publicWorkouts = this.getPublicWorkouts()
      publicWorkouts.unshift(workout)
      localStorage.setItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS, JSON.stringify(publicWorkouts))
    }

    // Update user workout count
    await this.updateProfile(auth.user.id, { workoutCount: myWorkouts.length })

    return workout
  },

  calculateDuration(exercises: CustomWorkoutExercise[]): number {
    let totalSeconds = 0
    for (const ex of exercises) {
      const exerciseTime = ex.duration || (ex.reps || 10) * 3 // ~3 sec per rep
      totalSeconds += (exerciseTime * ex.sets) + (ex.restTime * (ex.sets - 1))
    }
    return Math.ceil(totalSeconds / 60)
  },

  // Get my workouts
  getMyWorkouts(): CustomWorkout[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MY_WORKOUTS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  // Get public workouts for feed
  getPublicWorkouts(): CustomWorkout[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  // Get community feed
  async getCommunityFeed(filters?: WorkoutSearchFilters): Promise<FeedItem[]> {
    const auth = this.getAuthState()
    const publicWorkouts = this.getPublicWorkouts()
    const savedIds = this.getSavedWorkoutIds()
    const followingIds = this.getFollowing()

    let workouts = publicWorkouts

    // Apply filters
    if (filters?.query) {
      const q = filters.query.toLowerCase()
      workouts = workouts.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
      )
    }
    if (filters?.focus) {
      workouts = workouts.filter(w => w.focus === filters.focus)
    }
    if (filters?.difficulty) {
      workouts = workouts.filter(w => w.difficulty === filters.difficulty)
    }
    if (filters?.sport) {
      workouts = workouts.filter(w => w.sportRelevance.includes(filters.sport!))
    }

    // Sort
    if (filters?.sortBy === 'popular' || filters?.sortBy === 'saves') {
      workouts.sort((a, b) => b.saveCount - a.saveCount)
    } else {
      workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    // Map to feed items
    return workouts.map(workout => ({
      workout,
      creator: workout.creator || this.getUserById(workout.creatorId) || this.getDefaultUser(),
      isSaved: savedIds.includes(workout.id),
      isFollowing: followingIds.includes(workout.creatorId)
    }))
  },

  getUserById(id: string): UserProfile | null {
    const users = this.getAllUsers()
    return users.find(u => u.id === id) || null
  },

  getDefaultUser(): UserProfile {
    return {
      id: 'unknown',
      username: 'unknown',
      displayName: 'Unknown User',
      sport: 'wrestling',
      createdAt: new Date().toISOString(),
      workoutCount: 0,
      followerCount: 0,
      followingCount: 0,
      totalSaves: 0
    }
  },

  // ============================================
  // SAVE/UNSAVE WORKOUTS
  // ============================================

  getSavedWorkoutIds(): string[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_WORKOUTS)
      const saved: SavedWorkout[] = stored ? JSON.parse(stored) : []
      return saved.map(s => s.workoutId)
    } catch {
      return []
    }
  },

  getSavedWorkouts(): SavedWorkout[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_WORKOUTS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  async saveWorkout(workoutId: string): Promise<void> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')

    const saved = this.getSavedWorkouts()
    if (saved.some(s => s.workoutId === workoutId)) return // Already saved

    const newSave: SavedWorkout = {
      id: generateId(),
      userId: auth.user.id,
      workoutId,
      savedAt: new Date().toISOString()
    }

    saved.unshift(newSave)
    localStorage.setItem(STORAGE_KEYS.SAVED_WORKOUTS, JSON.stringify(saved))

    // Update save count on workout
    const publicWorkouts = this.getPublicWorkouts()
    const workoutIndex = publicWorkouts.findIndex(w => w.id === workoutId)
    if (workoutIndex !== -1) {
      publicWorkouts[workoutIndex].saveCount++
      localStorage.setItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS, JSON.stringify(publicWorkouts))
    }
  },

  async unsaveWorkout(workoutId: string): Promise<void> {
    const saved = this.getSavedWorkouts()
    const filtered = saved.filter(s => s.workoutId !== workoutId)
    localStorage.setItem(STORAGE_KEYS.SAVED_WORKOUTS, JSON.stringify(filtered))

    // Update save count on workout
    const publicWorkouts = this.getPublicWorkouts()
    const workoutIndex = publicWorkouts.findIndex(w => w.id === workoutId)
    if (workoutIndex !== -1 && publicWorkouts[workoutIndex].saveCount > 0) {
      publicWorkouts[workoutIndex].saveCount--
      localStorage.setItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS, JSON.stringify(publicWorkouts))
    }
  },

  // ============================================
  // FOLLOW/UNFOLLOW
  // ============================================

  getFollowing(): string[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLLOWING)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  getFollowers(): string[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLLOWERS)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  },

  async followUser(userId: string): Promise<void> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')
    if (auth.user.id === userId) throw new Error('Cannot follow yourself')

    const following = this.getFollowing()
    if (following.includes(userId)) return

    following.push(userId)
    localStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(following))

    // Update counts
    await this.updateProfile(auth.user.id, { followingCount: following.length })
    const targetUser = this.getUserById(userId)
    if (targetUser) {
      await this.updateProfile(userId, { followerCount: targetUser.followerCount + 1 })
    }
  },

  async unfollowUser(userId: string): Promise<void> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')

    const following = this.getFollowing().filter(id => id !== userId)
    localStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(following))

    // Update counts
    await this.updateProfile(auth.user.id, { followingCount: following.length })
    const targetUser = this.getUserById(userId)
    if (targetUser && targetUser.followerCount > 0) {
      await this.updateProfile(userId, { followerCount: targetUser.followerCount - 1 })
    }
  },

  // ============================================
  // SEARCH
  // ============================================

  async searchUsers(query: string): Promise<UserProfile[]> {
    let users = this.getAllUsers()

    if (query) {
      const q = query.toLowerCase()
      users = users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q)
      )
    }

    return users
  },

  async searchWorkouts(filters: WorkoutSearchFilters): Promise<CustomWorkout[]> {
    let workouts = this.getPublicWorkouts()

    if (filters.query) {
      const q = filters.query.toLowerCase()
      workouts = workouts.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
      )
    }
    if (filters.focus) {
      workouts = workouts.filter(w => w.focus === filters.focus)
    }
    if (filters.difficulty) {
      workouts = workouts.filter(w => w.difficulty === filters.difficulty)
    }
    if (filters.sport) {
      workouts = workouts.filter(w => w.sportRelevance.includes(filters.sport!))
    }

    // Sort
    if (filters.sortBy === 'popular' || filters.sortBy === 'saves') {
      workouts.sort((a, b) => b.saveCount - a.saveCount)
    } else {
      workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return workouts
  },

  // ============================================
  // COPY WORKOUT
  // ============================================

  async copyWorkout(workoutId: string): Promise<CustomWorkout> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')

    const publicWorkouts = this.getPublicWorkouts()
    const original = publicWorkouts.find(w => w.id === workoutId)
    if (!original) throw new Error('Workout not found')

    const copy: CustomWorkout = {
      ...original,
      id: generateId(),
      creatorId: auth.user.id,
      creator: auth.user,
      name: `${original.name} (Copy)`,
      visibility: 'private',
      saveCount: 0,
      originalWorkoutId: original.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const myWorkouts = this.getMyWorkouts()
    myWorkouts.unshift(copy)
    localStorage.setItem(STORAGE_KEYS.MY_WORKOUTS, JSON.stringify(myWorkouts))

    return copy
  },

  // Delete workout
  async deleteWorkout(workoutId: string): Promise<void> {
    const auth = this.getAuthState()
    if (!auth.user) throw new Error('Must be logged in')

    // Remove from my workouts
    const myWorkouts = this.getMyWorkouts().filter(w => w.id !== workoutId)
    localStorage.setItem(STORAGE_KEYS.MY_WORKOUTS, JSON.stringify(myWorkouts))

    // Remove from public workouts
    const publicWorkouts = this.getPublicWorkouts().filter(w => w.id !== workoutId)
    localStorage.setItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS, JSON.stringify(publicWorkouts))

    // Update user workout count
    await this.updateProfile(auth.user.id, { workoutCount: myWorkouts.length })
  },

  // Update workout
  async updateWorkout(workoutId: string, updates: Partial<WorkoutBuilderState>): Promise<CustomWorkout> {
    const myWorkouts = this.getMyWorkouts()
    const index = myWorkouts.findIndex(w => w.id === workoutId)
    if (index === -1) throw new Error('Workout not found')

    const updated: CustomWorkout = {
      ...myWorkouts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    if (updates.exercises) {
      updated.estimatedDuration = this.calculateDuration(updates.exercises)
    }

    myWorkouts[index] = updated
    localStorage.setItem(STORAGE_KEYS.MY_WORKOUTS, JSON.stringify(myWorkouts))

    // Update in public workouts if public
    if (updated.visibility === 'public') {
      const publicWorkouts = this.getPublicWorkouts()
      const pubIndex = publicWorkouts.findIndex(w => w.id === workoutId)
      if (pubIndex !== -1) {
        publicWorkouts[pubIndex] = updated
      } else {
        publicWorkouts.unshift(updated)
      }
      localStorage.setItem(STORAGE_KEYS.ALL_PUBLIC_WORKOUTS, JSON.stringify(publicWorkouts))
    }

    return updated
  }
}

