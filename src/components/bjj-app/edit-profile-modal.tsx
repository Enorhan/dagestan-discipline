'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import Image from 'next/image'
import { Crown, Download, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { createDisplayNameInputBehavior, shouldIgnoreDisplayNameRefill } from '@/lib/display-name-input'
import { getAuthErrorMessage } from '@/lib/action-feedback'
import { cn } from '@/lib/utils'
import { BELTS, USERNAME_MAX_LEN, USERNAME_MIN_LEN } from './constants'
import { ModalShell } from './modal-shell'
import { SecondaryButton } from './primitives'
import { slugifyUsername } from './format-utils'
import type { NativeInputLike, ProfileDraft } from './types'

export interface EditProfileModalProps {
  profileDraft: ProfileDraft
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft | null>>
  profilePhotoPreview: string | null
  setProfilePhotoFile: (file: File | null) => void
  setProfilePhotoPreview: (preview: string | null) => void
  profilePhotoInputRef: RefObject<HTMLInputElement | null>
  profileNameInputUnlocked: boolean
  setProfileNameInputUnlocked: (value: boolean) => void
  profileNameSentinel: string
  profileNameDirty: boolean
  setProfileNameDirty: (value: boolean) => void
  analyticsConsent: boolean
  authLoading: boolean
  isDeletingAccount: boolean
  isExportingData: boolean
  setActiveSurface: (surface: 'paywall' | null) => void
  handleSaveProfile: () => void | Promise<void>
  handleManageSubscription: () => Promise<void>
  handleRestorePurchase: () => Promise<void>
  handleExportData: () => Promise<void>
  handleToggleAnalyticsConsent: () => void
  handleDeleteAccount: () => Promise<void>
  signOut: () => Promise<void>
  showError: (message: string) => void
}

/**
 * Phase D D4 — Edit Profile settings sheet.
 * Pure presentation; orchestration state and handlers remain in `BjjAppInner`.
 */
export function EditProfileModal(props: EditProfileModalProps) {
  const {
    profileDraft,
    setProfileDraft,
    profilePhotoPreview,
    setProfilePhotoFile,
    setProfilePhotoPreview,
    profilePhotoInputRef,
    profileNameInputUnlocked,
    setProfileNameInputUnlocked,
    profileNameSentinel,
    profileNameDirty,
    setProfileNameDirty,
    analyticsConsent,
    authLoading,
    isDeletingAccount,
    isExportingData,
    setActiveSurface,
    handleSaveProfile,
    handleManageSubscription,
    handleRestorePurchase,
    handleExportData,
    handleToggleAnalyticsConsent,
    handleDeleteAccount,
    signOut,
    showError,
  } = props

  return (
    <ModalShell
      title="Edit Profile"
      onBack={() => {
        setProfilePhotoFile(null)
        setProfilePhotoPreview(null)
        setActiveSurface(null)
      }}
      variant="profile"
      action={
        <button type="button" onClick={() => { void handleSaveProfile() }} className="rounded-2xl bg-[#2f58ff] px-4 py-2 text-sm font-bold">
          Save
        </button>
      }
    >
      <div className="space-y-6">
        <div className="mx-auto flex w-full max-w-[280px] flex-col items-center">
          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setProfilePhotoFile(file)
              setProfilePhotoPreview(file ? URL.createObjectURL(file) : profilePhotoPreview)
            }}
          />
          {profilePhotoPreview ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10">
              <Image src={profilePhotoPreview} alt={profileDraft.displayName} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/6 text-[40px] font-black">
              {profileDraft.displayName.charAt(0) || 'D'}
            </div>
          )}
          <button
            type="button"
            onClick={() => profilePhotoInputRef.current?.click()}
            className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-2 text-sm font-bold text-white/75"
          >
            Change Photo
          </button>
        </div>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Username</span>
          <input
            value={profileDraft.username}
            onChange={(event) => setProfileDraft((previous) => previous ? { ...previous, username: slugifyUsername(event.target.value) } : previous)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="your_unique_name"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-medium text-white placeholder:text-white/30 outline-none"
          />
          <p className="text-xs font-medium text-white/38">
            {USERNAME_MIN_LEN}–{USERNAME_MAX_LEN} characters. Changing your handle may affect how others find you.
          </p>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Display Name</span>
          <input
            {...createDisplayNameInputBehavior('profile', profileNameInputUnlocked, () => setProfileNameInputUnlocked(true))}
            value={profileDraft.displayName}
            onChange={(event) => {
              const nextValue = event.target.value
              const nativeEvent = event.nativeEvent as NativeInputLike
              if (shouldIgnoreDisplayNameRefill({
                sentinelValue: profileNameSentinel,
                currentValue: profileDraft.displayName,
                nextValue,
                hasManualEdit: profileNameDirty,
                inputType: nativeEvent.inputType,
                isComposing: nativeEvent.isComposing,
              })) {
                return
              }

              setProfileNameDirty(true)
              setProfileDraft((previous) => previous ? { ...previous, displayName: nextValue } : previous)
            }}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white outline-none"
          />
        </label>
        <BeltStripesSection
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
        />
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Gym / Academy</span>
          <input
            value={profileDraft.gymName}
            onChange={(event) => setProfileDraft((previous) => previous ? { ...previous, gymName: event.target.value } : previous)}
            placeholder="Enter gym name"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-base font-medium text-white placeholder:text-white/35 outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Bio</span>
          <textarea
            value={profileDraft.bio}
            onChange={(event) => setProfileDraft((previous) => previous ? { ...previous, bio: event.target.value.slice(0, 200) } : previous)}
            placeholder="Tell us about yourself..."
            className="min-h-28 w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-base font-medium text-white placeholder:text-white/35 outline-none"
          />
          <div className="text-right text-xs font-semibold text-white/35">{profileDraft.bio.length}/200</div>
        </label>
        <PrivacySection profileDraft={profileDraft} setProfileDraft={setProfileDraft} />
        <ProfileActionStack
          analyticsConsent={analyticsConsent}
          authLoading={authLoading}
          isDeletingAccount={isDeletingAccount}
          isExportingData={isExportingData}
          setActiveSurface={setActiveSurface}
          handleManageSubscription={handleManageSubscription}
          handleRestorePurchase={handleRestorePurchase}
          handleExportData={handleExportData}
          handleToggleAnalyticsConsent={handleToggleAnalyticsConsent}
          handleDeleteAccount={handleDeleteAccount}
          signOut={signOut}
          showError={showError}
        />
      </div>
    </ModalShell>
  )
}

function BeltStripesSection({
  profileDraft,
  setProfileDraft,
}: {
  profileDraft: ProfileDraft
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft | null>>
}) {
  return (
    <>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Belt Rank</span>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {BELTS.map((belt) => (
            <button
              key={belt}
              type="button"
              onClick={() => setProfileDraft((previous) => previous ? { ...previous, belt } : previous)}
              className={cn(
                'rounded-2xl px-2 py-3 text-sm font-bold capitalize',
                profileDraft.belt === belt ? 'bg-white text-black' : 'bg-white/6 text-white/45',
              )}
            >
              {belt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Stripes</span>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }, (_, value) => (
            <button
              key={value}
              type="button"
              onClick={() => setProfileDraft((previous) => previous ? { ...previous, stripes: value } : previous)}
              className={cn(
                'rounded-2xl px-2 py-3 text-sm font-bold',
                profileDraft.stripes === value ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/45',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function PrivacySection({
  profileDraft,
  setProfileDraft,
}: {
  profileDraft: ProfileDraft
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft | null>>
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Account Privacy</span>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['public', 'private'] as const).map((privacy) => (
          <button
            key={privacy}
            type="button"
            onClick={() => setProfileDraft((previous) => previous ? { ...previous, privacy } : previous)}
            className={cn(
              'rounded-2xl px-3 py-3 text-sm font-bold capitalize',
              profileDraft.privacy === privacy ? 'bg-[#2f58ff] text-white' : 'bg-white/6 text-white/45',
            )}
          >
            {privacy}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProfileActionStack({
  analyticsConsent,
  authLoading,
  isDeletingAccount,
  isExportingData,
  setActiveSurface,
  handleManageSubscription,
  handleRestorePurchase,
  handleExportData,
  handleToggleAnalyticsConsent,
  handleDeleteAccount,
  signOut,
  showError,
}: Omit<EditProfileModalProps, 'profileDraft' | 'setProfileDraft' | 'profilePhotoPreview' | 'setProfilePhotoFile' | 'setProfilePhotoPreview' | 'profilePhotoInputRef' | 'profileNameInputUnlocked' | 'setProfileNameInputUnlocked' | 'profileNameSentinel' | 'profileNameDirty' | 'setProfileNameDirty' | 'handleSaveProfile'>) {
  return (
    <div className="space-y-3 pt-4">
      <SecondaryButton onClick={() => setActiveSurface('paywall')}>
        <Crown className="h-5 w-5" />
        Upgrade to Pro
      </SecondaryButton>
      <SecondaryButton onClick={() => { void handleManageSubscription() }}>
        <ExternalLink className="h-5 w-5" />
        Manage subscription
      </SecondaryButton>
      <SecondaryButton onClick={() => { void handleRestorePurchase() }}>
        <RotateCcw className="h-5 w-5" />
        Restore purchases
      </SecondaryButton>
      <SecondaryButton disabled={isExportingData} onClick={() => { void handleExportData() }}>
        <Download className="h-5 w-5" />
        {isExportingData ? 'Requesting export…' : 'Export my data'}
      </SecondaryButton>
      <button
        type="button"
        role="switch"
        aria-checked={analyticsConsent}
        onClick={handleToggleAnalyticsConsent}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left"
      >
        <span className="flex flex-col">
          <span className="text-sm font-bold text-white">Product analytics</span>
          <span className="text-xs text-white/45">First-party only. We never track you across other apps.</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            analyticsConsent ? 'bg-[#2f58ff]' : 'bg-white/15',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              analyticsConsent ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
      <SecondaryButton disabled={authLoading} onClick={async () => {
        try {
          await signOut()
        } catch (error) {
          showError(getAuthErrorMessage(error, 'Unable to sign out'))
        }
      }}>
        {authLoading ? 'Signing out…' : 'Sign out'}
      </SecondaryButton>
      <button
        type="button"
        disabled={isDeletingAccount}
        onClick={() => void handleDeleteAccount()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 disabled:opacity-60"
        aria-label="Delete account permanently"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isDeletingAccount ? 'Deleting account…' : 'Delete account'}
      </button>
      <p className="text-center text-xs text-white/35">
        Deleting your account permanently removes your profile, sessions, gameplans, and uploads.
      </p>
    </div>
  )
}
