'use client'

import React, { useState } from 'react'
import { Screen, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Wrestling, Gi, Trophy } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthSignupProps {
  onSignup: (user: UserProfile) => void
  onNavigate: (screen: Screen) => void
}

const SPORTS: { value: SportType; label: string; icon: React.ReactNode }[] = [
  { value: 'wrestling', label: 'Wrestling', icon: <Wrestling size={28} className="text-primary" /> },
  { value: 'bjj', label: 'BJJ', icon: <Gi size={28} className="text-primary" /> },
  { value: 'judo', label: 'Judo', icon: <Trophy size={28} className="text-primary" /> }
]

export function AuthSignup({ onSignup, onNavigate }: AuthSignupProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sport, setSport] = useState<SportType>('wrestling')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      haptics.error()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      haptics.error()
      return
    }
    if (!password) {
      setError('Please enter a password')
      haptics.error()
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      haptics.error()
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      haptics.error()
      return
    }
    if (!username.trim()) {
      setError('Please enter a username')
      haptics.error()
      return
    }
    if (!displayName.trim()) {
      setError('Please enter a display name')
      haptics.error()
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      haptics.error()
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      haptics.error()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const user = await supabaseService.signUp(email.trim(), password, username.trim(), displayName.trim(), sport)
      haptics.success()
      onSignup(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed')
      haptics.error()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ScreenShell className="pt-safe-top">
      <ScreenShellContent maxWidth alwaysScroll>
        <div className="flex flex-col flex-1 px-6 pb-safe-bottom justify-start pt-12 sm:justify-center sm:pt-0">
          <BackButton onClick={() => onNavigate('auth-login')} label="Back" className="absolute top-0 left-0 mt-safe-top ml-2" />

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Create Account
            </h1>
            <p className="text-muted-foreground mt-2">
              Create an account to track your training
            </p>
          </div>

          {/* Signup Form */}
          <div className="space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="h-14"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="h-14"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Choose a unique username"
                className="h-14"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Display Name
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or nickname"
                className="h-14"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Primary Sport
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPORTS.map((s) => (
                  <Button
                    key={s.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSport(s.value)}
                    stacked
                    className={`min-h-[72px] rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 transition-all normal-case tracking-normal h-auto ${
                      sport === s.value
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'bg-card border border-border'
                    }`}
                  >
                    {s.icon}
                    <span className="text-[11px] font-medium text-foreground text-center leading-tight">{s.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSignup}
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Button
                variant="link"
                size="sm"
                className="text-primary font-semibold p-0 h-auto min-h-0 normal-case tracking-normal"
                onClick={() => onNavigate('auth-login')}
              >
                Sign In
              </Button>
            </p>
          </div>
        </div>
      </ScreenShellContent>
    </ScreenShell>
  )
}
