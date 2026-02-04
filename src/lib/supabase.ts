// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftwtxslonvjgvbaexkwn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d3R4c2xvbnZqZ3ZiYWV4a3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MzQsImV4cCI6MjA4NTYwNTYzNH0.Owl7W3VEha3y3VpfTzWMNP3hmfpCoYZ_hRFUev-lO6A'

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Export types for convenience
export type { Database }
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

