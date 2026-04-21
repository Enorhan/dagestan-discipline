import assert from 'node:assert/strict'
import type { Session as AuthSession, User } from '@supabase/supabase-js'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

async function main() {
  const { supabase } = await import('../src/lib/supabase')
  const { supabaseService } = await import('../src/lib/supabase-service')

  const originalSignInWithPassword = supabase.auth.signInWithPassword.bind(supabase.auth)
  const originalGetProfile = supabaseService.getProfile.bind(supabaseService)

  const sessionUser = {
    app_metadata: {},
    aud: 'authenticated',
    id: 'user-1',
    email: 'enes@example.com',
    created_at: '2026-03-18T12:00:00.000Z',
    user_metadata: {
      username: 'enes',
      display_name: 'Enes',
      sport: 'wrestling',
    },
  } as unknown as User

  try {
    ;(supabase.auth.signInWithPassword as unknown as typeof supabase.auth.signInWithPassword) = async () => ({
      data: {
        user: sessionUser,
        session: {} as AuthSession,
      },
      error: null,
    })

    supabaseService.getProfile = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1800))
      return null
    }) as typeof supabaseService.getProfile

    const startedAt = Date.now()
    const profile = await supabaseService.signIn('enes@example.com', 'password123')
    const elapsedMs = Date.now() - startedAt

    assert.equal(profile.id, sessionUser.id)
    assert.equal(profile.profileHydrationPending, true)
    assert.ok(elapsedMs < 1700, `Expected signIn to resolve before long profile fetch, took ${elapsedMs}ms`)

    console.log('Auth sign-in flow tests passed.')
  } finally {
    ;(supabase.auth.signInWithPassword as unknown as typeof supabase.auth.signInWithPassword) = originalSignInWithPassword
    supabaseService.getProfile = originalGetProfile
  }
}

void main()
