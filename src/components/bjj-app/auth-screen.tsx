'use client'

import { type FormEvent } from 'react'
import { ChevronDown, ChevronRight, Globe, NotebookPen, X } from 'lucide-react'
import { createDisplayNameInputBehavior } from '@/lib/display-name-input'
import { getAuthErrorMessage } from '@/lib/action-feedback'
import type { BjjAuthMode } from '@/lib/bjj-types'
import { cn } from '@/lib/utils'
import { USERNAME_MAX_LEN, USERNAME_MIN_LEN } from './constants'
import { slugifyUsername } from './format-utils'
import { ScreenBackdrop } from './screen-backdrop'
import { CircleIconButton, PrimaryButton, SecondaryButton, ShellCard } from './primitives'

export interface AuthScreenAuxAction {
  current: 'google' | 'apple' | 'reset' | null
}

export interface AuthScreenForm {
  name: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthScreenProps {
  authLoading: boolean
  authError: string | null
  authMode: BjjAuthMode
  setAuthMode: (mode: BjjAuthMode) => void
  authForm: AuthScreenForm
  setAuthForm: (updater: (previous: AuthScreenForm) => AuthScreenForm) => void
  emailSheetOpen: boolean
  setEmailSheetOpen: (open: boolean) => void
  authAuxAction: AuthScreenAuxAction['current']
  setAuthAuxAction: (action: AuthScreenAuxAction['current']) => void
  authNameInputUnlocked: boolean
  setAuthNameInputUnlocked: (value: true) => void
  isCompactHeight: boolean
  isShortHeight: boolean
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  handleAuthSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showSuccess: (message: string) => void
}

const AUTH_PREVIEW_CARDS: Array<{ title: string; tags: string[]; color: string }> = [
  { title: 'Straight Arm Lock', tags: ['Submission', 'Closed Guard', '+2'], color: '#ef4444' },
  { title: 'Side control frame escape', tags: ['Escape', 'NoGi', 'Side Control'], color: '#eab308' },
  { title: 'Side control underhook escape', tags: ['Escape', 'NoGi', 'Side Control'], color: '#eab308' },
]

/**
 * Phase D D4 — unauthenticated auth screen route.
 * Pure presentation; all auth state remains in `BjjAppInner`.
 */
export function AuthScreen({
  authLoading,
  authError,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  emailSheetOpen,
  setEmailSheetOpen,
  authAuxAction,
  setAuthAuxAction,
  authNameInputUnlocked,
  setAuthNameInputUnlocked,
  isCompactHeight,
  isShortHeight,
  signInWithOAuth,
  requestPasswordReset,
  handleAuthSubmit,
  showError,
  showInfo,
  showSuccess,
}: AuthScreenProps) {
  const authPreviewCards = 2

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#04060a] text-white">
      <ScreenBackdrop variant="auth" />
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between text-sm font-semibold text-white/70">
          <span>MatFlow</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">NoGi</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Closed Guard</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            <p className="text-base font-semibold text-white/58">Preview techniques</p>
            <div className="mt-3 space-y-2.5">
              {AUTH_PREVIEW_CARDS.slice(0, authPreviewCards).map((card) => (
                <ShellCard key={card.title} className="relative overflow-hidden p-3">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.04),transparent_45%)]" />
                  <div className="relative flex items-start gap-3">
                    <div className="mt-1 h-12 w-1 rounded-full" style={{ backgroundColor: card.color }} />
                    <div className="flex-1">
                      <h3 className={cn(isCompactHeight ? 'text-[18px]' : 'text-[20px]', 'font-bold')}>{card.title}</h3>
                      <p className="mt-1 text-sm text-white/35">Mar 15 4:50 PM</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/8 bg-white/7 px-3 py-1 text-xs font-semibold text-white/58">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <CircleIconButton className="h-8 w-8 self-center">
                      <ChevronDown className="h-4 w-4" />
                    </CircleIconButton>
                  </div>
                </ShellCard>
              ))}
            </div>

            <div className="pb-1 pt-5 text-center">
              <h1 className={cn('mx-auto max-w-[300px] font-black leading-[0.98] text-white', isShortHeight ? 'text-[30px]' : isCompactHeight ? 'text-[34px]' : 'text-[38px]')}>
                Never forget a technique again!
              </h1>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="h-2 w-8 rounded-full bg-white" />
                <span className="h-2 w-2 rounded-full bg-white/35" />
                <span className="h-2 w-2 rounded-full bg-white/35" />
              </div>
            </div>
          </div>

          <div className="shrink-0 bg-[linear-gradient(180deg,rgba(4,6,10,0),rgba(4,6,10,0.88)_18%,#04060a_100%)] pt-2.5">
            <ShellCard className="overflow-hidden border-white/10 bg-black/60 p-4 backdrop-blur-xl">
              {!emailSheetOpen ? (
                <AuthSocialPanel
                  authLoading={authLoading}
                  authAuxAction={authAuxAction}
                  setAuthAuxAction={setAuthAuxAction}
                  setEmailSheetOpen={setEmailSheetOpen}
                  signInWithOAuth={signInWithOAuth}
                  requestPasswordReset={requestPasswordReset}
                  authForm={authForm}
                  showError={showError}
                  showInfo={showInfo}
                  showSuccess={showSuccess}
                />
              ) : (
                <AuthEmailForm
                  authLoading={authLoading}
                  authError={authError}
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  authForm={authForm}
                  setAuthForm={setAuthForm}
                  setEmailSheetOpen={setEmailSheetOpen}
                  authNameInputUnlocked={authNameInputUnlocked}
                  setAuthNameInputUnlocked={setAuthNameInputUnlocked}
                  handleAuthSubmit={handleAuthSubmit}
                />
              )}
            </ShellCard>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AuthSocialPanelProps {
  authLoading: boolean
  authAuxAction: AuthScreenAuxAction['current']
  setAuthAuxAction: AuthScreenProps['setAuthAuxAction']
  setEmailSheetOpen: (open: boolean) => void
  signInWithOAuth: AuthScreenProps['signInWithOAuth']
  requestPasswordReset: AuthScreenProps['requestPasswordReset']
  authForm: AuthScreenForm
  showError: AuthScreenProps['showError']
  showInfo: AuthScreenProps['showInfo']
  showSuccess: AuthScreenProps['showSuccess']
}

function AuthSocialPanel({
  authLoading,
  authAuxAction,
  setAuthAuxAction,
  setEmailSheetOpen,
  signInWithOAuth,
  requestPasswordReset,
  authForm,
  showError,
  showInfo,
  showSuccess,
}: AuthSocialPanelProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={authLoading}
        onClick={async () => {
          setAuthAuxAction('apple')
          try {
            await signInWithOAuth('apple')
          } catch (error) {
            showError(getAuthErrorMessage(error, 'Apple sign-in failed'))
          } finally {
            setAuthAuxAction(null)
          }
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-black text-[15px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        <svg viewBox="0 0 384 512" aria-hidden="true" className="h-5 w-5 fill-white">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
        </svg>
        {authLoading && authAuxAction === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
      </button>
      <SecondaryButton
        disabled={authLoading}
        onClick={async () => {
          setAuthAuxAction('google')
          try {
            await signInWithOAuth('google')
          } catch (error) {
            showError(getAuthErrorMessage(error, 'Google sign-in failed'))
          } finally {
            setAuthAuxAction(null)
          }
        }}
      >
        <Globe className="h-5 w-5" />
        {authLoading && authAuxAction === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </SecondaryButton>
      <PrimaryButton disabled={authLoading} onClick={() => setEmailSheetOpen(true)}>
        <NotebookPen className="h-5 w-5" />
        Sign in with Email
      </PrimaryButton>
      <button
        type="button"
        disabled={authLoading}
        onClick={async () => {
          setAuthAuxAction('reset')
          const email = authForm.email.trim()
          if (!email) {
            setEmailSheetOpen(true)
            showInfo('Enter your email first, then recover the account.')
            setAuthAuxAction(null)
            return
          }

          try {
            await requestPasswordReset(email)
            showSuccess('Password reset email sent')
          } catch (error) {
            showError(getAuthErrorMessage(error, 'Unable to send reset email'))
          } finally {
            setAuthAuxAction(null)
          }
        }}
        className="block w-full pt-1 text-center text-sm font-semibold text-white/40 disabled:cursor-not-allowed disabled:text-white/25"
      >
        {authLoading && authAuxAction === 'reset' ? 'Sending…' : 'Recover Account'}
      </button>
    </div>
  )
}

interface AuthEmailFormProps {
  authLoading: boolean
  authError: string | null
  authMode: BjjAuthMode
  setAuthMode: AuthScreenProps['setAuthMode']
  authForm: AuthScreenForm
  setAuthForm: AuthScreenProps['setAuthForm']
  setEmailSheetOpen: (open: boolean) => void
  authNameInputUnlocked: boolean
  setAuthNameInputUnlocked: (value: true) => void
  handleAuthSubmit: AuthScreenProps['handleAuthSubmit']
}

function AuthEmailForm({
  authLoading,
  authError,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  setEmailSheetOpen,
  authNameInputUnlocked,
  setAuthNameInputUnlocked,
  handleAuthSubmit,
}: AuthEmailFormProps) {
  return (
    <form className="space-y-3" onSubmit={handleAuthSubmit}>
      <div className="flex items-center justify-between pb-1">
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
          {(['sign-up', 'sign-in'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAuthMode(mode)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold capitalize transition',
                authMode === mode ? 'bg-[#4d7cff] text-white' : 'text-white/45',
              )}
            >
              {mode.replace('-', ' ')}
            </button>
          ))}
        </div>
        <CircleIconButton className="h-8 w-8" onClick={() => setEmailSheetOpen(false)}>
          <X className="h-4 w-4" />
        </CircleIconButton>
      </div>

      {authMode === 'sign-up' && (
        <input
          {...createDisplayNameInputBehavior('signup', authNameInputUnlocked, () => setAuthNameInputUnlocked(true))}
          value={authForm.name}
          onChange={(event) => setAuthForm((previous) => ({ ...previous, name: event.target.value }))}
          placeholder="What should we call you?"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none focus:border-[#4d7cff]/55"
        />
      )}
      {authMode === 'sign-up' && (
        <div className="space-y-1.5">
          <input
            value={authForm.username}
            onChange={(event) => setAuthForm((previous) => ({
              ...previous,
              username: slugifyUsername(event.target.value),
            }))}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="Choose a unique username"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-medium text-white placeholder:text-white/35 outline-none focus:border-[#4d7cff]/55"
          />
          <p className="px-1 text-xs font-medium text-white/38">
            {USERNAME_MIN_LEN}–{USERNAME_MAX_LEN} characters: lowercase letters, numbers, underscores. Must not be taken.
          </p>
        </div>
      )}
      <input
        value={authForm.email}
        onChange={(event) => setAuthForm((previous) => ({ ...previous, email: event.target.value }))}
        type="email"
        placeholder="Email"
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none focus:border-[#4d7cff]/55"
      />
      <input
        value={authForm.password}
        onChange={(event) => setAuthForm((previous) => ({ ...previous, password: event.target.value }))}
        type="password"
        placeholder="Password"
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none focus:border-[#4d7cff]/55"
      />
      {authMode === 'sign-up' && (
        <input
          value={authForm.confirmPassword}
          onChange={(event) => setAuthForm((previous) => ({ ...previous, confirmPassword: event.target.value }))}
          type="password"
          placeholder="Confirm password"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none focus:border-[#4d7cff]/55"
        />
      )}
      {authError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
          {authError}
        </div>
      )}
      <PrimaryButton type="submit" disabled={authLoading}>
        {authLoading
          ? authMode === 'sign-up'
            ? 'Creating account…'
            : 'Signing in…'
          : authMode === 'sign-up'
            ? 'Create account'
            : 'Sign in'}
        <ChevronRight className="h-5 w-5" />
      </PrimaryButton>
    </form>
  )
}

