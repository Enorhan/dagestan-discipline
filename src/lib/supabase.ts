// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

import { createClient, type Session as AuthSession } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import type { Database } from './database.types'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Legacy prefix used until v8 — values may still be sitting in @capacitor/preferences
// (NSUserDefaults on iOS) on devices that were signed in before the Keychain migration.
const LEGACY_AUTH_STORAGE_PREFIX = 'dd.supabase.auth'
// New Keychain key prefix. Underscore separator avoids platform key restrictions.
const SECURE_AUTH_STORAGE_PREFIX = 'matflow_supabase_auth'
const NATIVE_AUTH_STORAGE_TIMEOUT_MS = 1200
const SUPABASE_PROJECT_REF = new URL(supabaseUrl).hostname.split('.')[0] ?? 'unknown-project'
const SUPABASE_AUTH_TOKEN_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`

const toSecureKey = (key: string): string =>
  `${SECURE_AUTH_STORAGE_PREFIX}_${key.replace(/[^a-zA-Z0-9_]/g, '_')}`

const toLegacyPreferencesKey = (key: string): string => `${LEGACY_AUTH_STORAGE_PREFIX}:${key}`

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
          logger.debug(`[SupabaseAuthStorage] ${label} timed out; using local fallback`)
          resolve(fallbackValue)
        }, NATIVE_AUTH_STORAGE_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    logger.debug(`[SupabaseAuthStorage] ${label} failed; using local fallback`, error)
    return fallbackValue
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function secureStorageGet(key: string): Promise<string | null> {
  return withNativeStorageTimeout(
    SecureStoragePlugin.get({ key }).then(
      (result) => result.value ?? null,
      // Plugin rejects when the key is missing; treat as null.
      () => null
    ),
    null,
    `secureGet(${key})`
  )
}

async function secureStorageSet(key: string, value: string): Promise<void> {
  await withNativeStorageTimeout(
    SecureStoragePlugin.set({ key, value }).then(() => undefined, () => undefined),
    undefined,
    `secureSet(${key})`
  )
}

async function secureStorageRemove(key: string): Promise<void> {
  await withNativeStorageTimeout(
    SecureStoragePlugin.remove({ key }).then(() => undefined, () => undefined),
    undefined,
    `secureRemove(${key})`
  )
}

async function legacyPreferencesGet(key: string): Promise<string | null> {
  const result = await withNativeStorageTimeout(
    Preferences.get({ key: toLegacyPreferencesKey(key) }),
    { value: null },
    `legacyGet(${key})`
  )
  return result.value
}

async function legacyPreferencesRemove(key: string): Promise<void> {
  await withNativeStorageTimeout(
    Preferences.remove({ key: toLegacyPreferencesKey(key) }),
    undefined,
    `legacyRemove(${key})`
  )
}

const authStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null

    if (!Capacitor.isNativePlatform()) {
      return window.localStorage.getItem(key)
    }

    const secureKey = toSecureKey(key)
    const secureValue = await secureStorageGet(secureKey)
    if (secureValue !== null) {
      // Defensive cleanup: prior versions mirrored the token to localStorage.
      const localValue = window.localStorage.getItem(key)
      if (localValue !== null) window.localStorage.removeItem(key)
      return secureValue
    }

    // Migrate from @capacitor/preferences (NSUserDefaults on iOS).
    const legacyValue = await legacyPreferencesGet(key)
    if (legacyValue !== null) {
      await secureStorageSet(secureKey, legacyValue)
      void legacyPreferencesRemove(key)
      window.localStorage.removeItem(key)
      return legacyValue
    }

    // Migrate from WKWebView localStorage (oldest fallback).
    const localValue = window.localStorage.getItem(key)
    if (localValue !== null) {
      await secureStorageSet(secureKey, localValue)
      window.localStorage.removeItem(key)
      return localValue
    }

    return null
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return

    if (!Capacitor.isNativePlatform()) {
      window.localStorage.setItem(key, value)
      return
    }

    await secureStorageSet(toSecureKey(key), value)
    // Remove any plaintext residue from previous versions.
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key)
    }
    void legacyPreferencesRemove(key)
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') return

    window.localStorage.removeItem(key)

    if (Capacitor.isNativePlatform()) {
      await secureStorageRemove(toSecureKey(key))
      void legacyPreferencesRemove(key)
    }
  },
}

export async function getStoredSupabaseSession(): Promise<AuthSession | null> {
  const rawValue = await authStorage.getItem(SUPABASE_AUTH_TOKEN_KEY)
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue) as AuthSession
  } catch (error) {
    logger.debug('[SupabaseAuthStorage] Failed to parse stored session snapshot', error)
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
