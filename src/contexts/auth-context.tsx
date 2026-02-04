'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile } from '@/lib/social-types'
import { SportType } from '@/lib/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<UserProfile>
  signUp: (email: string, password: string, username: string, displayName: string, sport: SportType) => Promise<UserProfile>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authState = await supabaseService.getAuthState()
        setUser(authState.user)
        setError(authState.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize auth')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen to auth state changes
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await supabaseService.getProfile(session.user.id)
          setUser(profile)
          setError(null)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load profile')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Re-fetch profile on token refresh to ensure data is current
        try {
          const profile = await supabaseService.getProfile(session.user.id)
          setUser(profile)
        } catch (e) {
          // Silent fail on token refresh profile fetch
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true)
    setError(null)
    try {
      const profile = await supabaseService.signIn(email, password)
      setUser(profile)
      return profile
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign in failed'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    sport: SportType
  ): Promise<UserProfile> => {
    setIsLoading(true)
    setError(null)
    try {
      const profile = await supabaseService.signUp(email, password, username, displayName, sport)
      setUser(profile)
      return profile
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign up failed'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await supabaseService.signOut()
      setUser(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign out failed'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user) throw new Error('Must be logged in to update profile')
    
    setError(null)
    try {
      const updatedProfile = await supabaseService.updateProfile(user.id, updates)
      setUser(updatedProfile)
      return updatedProfile
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Profile update failed'
      setError(message)
      throw e
    }
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

