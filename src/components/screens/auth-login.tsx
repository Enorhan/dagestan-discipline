'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Screen } from '@/lib/types'
import { ScreenShell, ScreenShellContent } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { socialService } from '@/lib/social-service'
import { UserProfile } from '@/lib/social-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthLoginProps {
  onLogin: (user: UserProfile) => void
  onNavigate: (screen: Screen) => void
  onSkip?: () => void
}

export function AuthLogin({ onLogin, onNavigate, onSkip }: AuthLoginProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      haptics.error()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const user = await socialService.signIn(username.trim())
      haptics.success()
      onLogin(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
      haptics.error()
    } finally {
      setIsLoading(false)
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
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-14"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

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
