'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabaseService } from '@/lib/supabase-service'
import { getAuthErrorMessage } from '@/lib/action-feedback'
import { captureException } from '@/lib/monitoring'
import { type SportType, type UserProfile } from '@/lib/user-profile-types'

interface AuthContextType {
  user: UserProfile | null
  isInitializing: boolean
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<UserProfile>
  signUp: (email: string, password: string, username: string, displayName: string, sport: SportType) => Promise<UserProfile>
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
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
        setIsInitializing(false)
      }
    }

    initAuth()

    // Listen to auth state changes
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') && session?.user) {
        try {
          const authState = await supabaseService.getAuthState()
          setUser(authState.user)
          setError(authState.error)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load profile')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Re-fetch profile on token refresh to ensure data is current
        try {
          const authState = await supabaseService.getAuthState()
          setUser(authState.user)
        } catch (error) {
          captureException('auth-context-token-refresh', error, {
            step: 'onAuthStateChange.TOKEN_REFRESHED',
          }, 'warning')
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
      const message = getAuthErrorMessage(e, 'Sign in failed')
      setError(message)
      throw new Error(message)
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
      const authState = await supabaseService.getAuthState()
      setUser(authState.isAuthenticated ? authState.user : null)
      return profile
    } catch (e) {
      const message = getAuthErrorMessage(e, 'Sign up failed')
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple'): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await supabaseService.signInWithOAuth(provider)
    } catch (e) {
      const message = getAuthErrorMessage(e, 'OAuth sign in failed')
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await supabaseService.resetPassword(email)
    } catch (e) {
      const message = getAuthErrorMessage(e, 'Password reset failed')
      setError(message)
      throw new Error(message)
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
      const message = getAuthErrorMessage(e, 'Sign out failed')
      setError(message)
      throw new Error(message)
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
      const message = getAuthErrorMessage(e, 'Profile update failed')
      setError(message)
      throw new Error(message)
    }
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    isInitializing,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signInWithOAuth,
    requestPasswordReset,
    signOut,
    updateProfile,
    clearError,
  }), [
    user,
    isInitializing,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithOAuth,
    requestPasswordReset,
    signOut,
    updateProfile,
    clearError,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
