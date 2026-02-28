'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile } from '@/lib/social-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthLoginProps {
  onLogin: (user: UserProfile) => void
  onNavigate: (screen: Screen) => void
  onSkip?: () => void
}

const LOGIN_TIMEOUT_MS = 15000
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 60000 // 1 minute

export function AuthLogin({ onLogin, onNavigate, onSkip }: AuthLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Rate limiting state
  const loginAttemptsRef = useRef(0)
  const lockoutUntilRef = useRef<number | null>(null)

  const handleLogin = async () => {
    // Check rate limiting
    if (lockoutUntilRef.current && Date.now() < lockoutUntilRef.current) {
      const remainingSeconds = Math.ceil((lockoutUntilRef.current - Date.now()) / 1000)
      setError(`Too many attempts. Please wait ${remainingSeconds}s before trying again.`)
      haptics.error()
      return
    }

    if (!email.trim()) {
      setError('Please enter your email')
      haptics.error()
      return
    }
    if (!password) {
      setError('Please enter your password')
      haptics.error()
      return
    }

    setIsLoading(true)
    setError(null)
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      console.log('[Login] Starting login for:', email.trim())
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Login timed out. Check your connection and try again.'))
        }, LOGIN_TIMEOUT_MS)
      })

      const user = await Promise.race([
        supabaseService.signIn(email.trim(), password),
        timeoutPromise,
      ])

      // Reset rate limiting on success
      loginAttemptsRef.current = 0
      lockoutUntilRef.current = null

      console.log('[Login] Sign in successful, user:', user.username)
      haptics.success()
      onLogin(user)
    } catch (e) {
      console.error('[Login] Error:', e)

      // Increment failed attempts and check for lockout
      loginAttemptsRef.current += 1
      if (loginAttemptsRef.current >= MAX_LOGIN_ATTEMPTS) {
        lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS
        setError(`Too many failed attempts. Please wait 1 minute before trying again.`)
      } else {
        setError(e instanceof Error ? e.message : 'Login failed')
      }
      haptics.error()
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      haptics.error()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      haptics.error()
      return
    }

    setIsResetting(true)
    setError(null)

    try {
      await supabaseService.resetPassword(email.trim())
      setResetEmailSent(true)
      haptics.success()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email')
      haptics.error()
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <ScreenShell>
      <ScreenShellContent maxWidth alwaysScroll>
        <div className="flex flex-col flex-1 px-6 pb-safe-bottom safe-area-top">
          {/* Spacer for mobile to push content down */}
          <div className="h-8 sm:hidden flex-shrink-0" />

          {/* Content wrapper */}
          <div className="flex-1 flex flex-col justify-start sm:justify-center">
          {/* Logo/Title */}
          <div className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg shadow-primary/20 ring-2 ring-primary/20">
              <Image
                src="/app-icon.png"
                alt="Dagestani Disciple"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to start training
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-14"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
              />
            </div>

            {!showResetPassword && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-14"
                  autoComplete="current-password"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {resetEmailSent && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">
                  Password reset email sent! Check your inbox and follow the link to reset your password.
                </p>
              </div>
            )}

            {showResetPassword ? (
              <>
                <Button
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  variant="primary"
                  size="lg"
                  fullWidth
                  withHaptic={false}
                  className="card-interactive flex items-center justify-center gap-2"
                >
                  {isResetting && (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isResetting ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <Button
                  onClick={() => {
                    setShowResetPassword(false)
                    setError(null)
                    setResetEmailSent(false)
                  }}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                >
                  Back to Sign In
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  variant="primary"
                  size="lg"
                  fullWidth
                  withHaptic={false}
                  className="card-interactive flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <div className="text-center mt-3">
                  <Button
                    onClick={() => {
                      setShowResetPassword(true)
                      setError(null)
                    }}
                    variant="link"
                    size="sm"
                    className="text-muted-foreground text-sm p-0 h-auto min-h-0 normal-case tracking-normal hover:text-primary"
                  >
                    Forgot Password?
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              Don't have an account?{' '}
              <Button
                variant="link"
                size="sm"
                className="text-primary font-semibold p-0 h-auto min-h-0 normal-case tracking-normal"
                onClick={() => onNavigate('auth-signup')}
              >
                Sign Up
              </Button>
            </p>
          </div>

          {/* Skip for now */}
          <Button
            onClick={() => {
              if (onSkip) {
                onSkip()
              } else {
                onNavigate('home')
              }
            }}
            variant="link"
            size="sm"
            className="mt-4 text-muted-foreground text-sm underline p-0 h-auto min-h-0 normal-case tracking-normal"
          >
            Continue without account
          </Button>
          </div>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
