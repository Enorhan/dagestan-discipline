// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

import { createClient, type Session as AuthSession } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const AUTH_STORAGE_PREFIX = 'dd.supabase.auth'
const NATIVE_AUTH_STORAGE_TIMEOUT_MS = 1200
const NATIVE_AUTH_STORAGE_READ_RETRIES = 1
const NATIVE_AUTH_STORAGE_RETRY_DELAY_MS = 80
const SUPABASE_PROJECT_REF = new URL(supabaseUrl).hostname.split('.')[0] ?? 'unknown-project'
const SUPABASE_AUTH_TOKEN_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs))

const withNativeStorageTimeout = async <T,>(
  operation: Promise<T>,
  fallbackValue: T,
  label: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.debug(`[SupabaseAuthStorage] ${label} timed out; using local fallback`)
          resolve(fallbackValue)
        }, NATIVE_AUTH_STORAGE_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    console.debug(`[SupabaseAuthStorage] ${label} failed; using local fallback`, error)
    return fallbackValue
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const authStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null

    const localValue = window.localStorage.getItem(key)

    if (Capacitor.isNativePlatform()) {
      const storageKey = `${AUTH_STORAGE_PREFIX}:${key}`
      let value: string | null = null
      for (let attempt = 0; attempt <= NATIVE_AUTH_STORAGE_READ_RETRIES; attempt += 1) {
        const nativeResult = await withNativeStorageTimeout(
          Preferences.get({ key: storageKey }),
          { value: null },
          `getItem(${key})`
        )
        value = nativeResult.value
        if (value !== null) break
        if (attempt < NATIVE_AUTH_STORAGE_READ_RETRIES) {
          await sleep(NATIVE_AUTH_STORAGE_RETRY_DELAY_MS)
        }
      }

      if (value !== null) {
        if (localValue !== value) {
          window.localStorage.setItem(key, value)
        }
        return value
      }

      if (localValue !== null) {
        void withNativeStorageTimeout(
          Preferences.set({ key: storageKey, value: localValue }),
          undefined,
          `migrateItem(${key})`
        )
        return localValue
      }

      return null
    }

    return localValue
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(key, value)

    if (Capacitor.isNativePlatform()) {
      void withNativeStorageTimeout(
        Preferences.set({ key: `${AUTH_STORAGE_PREFIX}:${key}`, value }),
        undefined,
        `setItem(${key})`
      )
      return
    }
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') return

    window.localStorage.removeItem(key)

    if (Capacitor.isNativePlatform()) {
      void withNativeStorageTimeout(
        Preferences.remove({ key: `${AUTH_STORAGE_PREFIX}:${key}` }),
        undefined,
        `removeItem(${key})`
      )
      return
    }
  },
}

export async function getStoredSupabaseSession(): Promise<AuthSession | null> {
  const rawValue = await authStorage.getItem(SUPABASE_AUTH_TOKEN_KEY)
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue) as AuthSession
  } catch (error) {
    console.debug('[SupabaseAuthStorage] Failed to parse stored session snapshot', error)
    return null
  }
}

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
  },
})

// Export types for convenience
export type { Database }
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
