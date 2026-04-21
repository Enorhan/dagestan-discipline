import assert from 'node:assert/strict'
import type { Session as AuthSession, User } from '@supabase/supabase-js'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

async function main() {
  const { supabase } = await import('../src/lib/supabase')
  const { supabaseService } = await import('../src/lib/supabase-service')

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)
  const originalGetProfile = supabaseService.getProfile.bind(supabaseService)

  const sessionUser = {
    app_metadata: {},
    aud: 'authenticated',
    id: 'user-1',
    email: 'enes@example.com',
    created_at: '2026-03-17T12:00:00.000Z',
    email_confirmed_at: '2026-03-17T12:05:00.000Z',
    user_metadata: {
      username: 'enes',
      display_name: 'Enes',
      sport: 'wrestling',
    },
  } as unknown as User

  try {
    ;(supabase.auth.getSession as unknown as (typeof supabase.auth.getSession)) = async () => ({
      data: {
        session: {
          user: sessionUser,
        } as AuthSession,
      },
      error: null,
    })
    supabaseService.getProfile = (async () => null) as typeof supabaseService.getProfile

    const localOnlyAuthState = await supabaseService.getAuthState()
    assert.equal(localOnlyAuthState.isAuthenticated, true)
    assert.equal(localOnlyAuthState.user?.id, sessionUser.id)
    assert.equal(localOnlyAuthState.user?.profileHydrationPending, true)

    ;(supabase.auth.getSession as unknown as (typeof supabase.auth.getSession)) = async () => ({
      data: { session: null },
      error: null,
    })

    const signedOutAuthState = await supabaseService.getAuthState()
    assert.equal(signedOutAuthState.isAuthenticated, false)
    assert.equal(signedOutAuthState.user, null)

    console.log('Auth session persistence tests passed.')
  } finally {
    ;(supabase.auth.getSession as unknown as (typeof supabase.auth.getSession)) = originalGetSession
    supabaseService.getProfile = originalGetProfile
  }
}

void main()
