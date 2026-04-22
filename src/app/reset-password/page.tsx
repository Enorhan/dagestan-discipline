'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SUPPORT_EMAIL, buildSupportMailtoLink } from '@/lib/app-support'
import { captureException } from '@/lib/monitoring'
import { supabase } from '@/lib/supabase'

function readAuthParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (hash) return new URLSearchParams(hash)

  const search = window.location.search.startsWith('?')
    ? window.location.search.slice(1)
    : window.location.search
  return search ? new URLSearchParams(search) : null
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'checking' | 'ready' | 'success' | 'invalid'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const supportHref = useMemo(() => {
    const body = [
      'Hi Dagestani Disciple support,',
      '',
      'I need help with a password reset link.',
      '',
      'What happened:',
      '[add a short description here]',
    ].join('\n')

    return buildSupportMailtoLink(SUPPORT_EMAIL, 'Dagestani Disciple password reset help', body)
  }, [])

  const handleOpenSupport = () => {
    window.location.href = supportHref
  }

  const handleBackToApp = () => {
    window.location.href = '/'
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const params = readAuthParams()
        const authType = params?.get('type')
        const hasRecoveryTokens = Boolean(params?.get('access_token') || params?.get('refresh_token'))

        if (authType !== 'recovery' && !hasRecoveryTokens) {
          if (!cancelled) {
            setStatus('invalid')
            setError('This password reset link is invalid or expired. Request a new reset email from the app.')
          }
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) {
            setStatus('invalid')
            setError('Unable to verify this reset session. Request a new reset email and try again.')
          }
          return
        }

        if (!cancelled) {
          setStatus('ready')
        }
      } catch (error) {
        captureException('reset-password-page', error, {
          step: 'initialize',
        }, 'warning')

        if (!cancelled) {
          setStatus('invalid')
          setError('Unable to verify the reset link right now. Please request a new password reset email.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async () => {
    if (password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        throw error
      }

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/reset-password')
      }

      setStatus('success')
    } catch (error) {
      captureException('reset-password-page', error, {
        step: 'update-password',
      }, 'warning')
      setError(error instanceof Error ? error.message : 'Unable to update your password right now.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-card/70 p-6 shadow-2xl shadow-black/30">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Account recovery</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Reset your password</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Choose a new password for your Dagestani Disciple account. This page is opened from your secure reset email.
        </p>

        {status === 'checking' && (
          <p className="mt-6 text-sm text-muted-foreground">Verifying your reset link…</p>
        )}

        {status === 'invalid' && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="h-14"
                placeholder="Choose a new password"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Confirm password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="h-14"
                placeholder="Confirm your new password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button size="lg" fullWidth loading={isSaving} onClick={handleSubmit}>
              Update password
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">Your password has been updated. You can return to the app and sign in with your new password.</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Need help?</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            If the reset link expired or the page does not work, request a new password reset from the app or contact support.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="ghost" size="sm" fullWidth onClick={handleOpenSupport}>
              Contact support
            </Button>
            <Button variant="outline" size="sm" fullWidth onClick={handleBackToApp}>
              Back to app
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}