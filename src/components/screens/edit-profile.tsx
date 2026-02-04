'use client'

import React, { useState } from 'react'
import { Screen, SportType } from '@/lib/types'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { haptics } from '@/lib/haptics'
import { supabaseService } from '@/lib/supabase-service'
import { UserProfile } from '@/lib/social-types'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

interface EditProfileProps {
  user: UserProfile
  onSave: (updatedUser: UserProfile) => void
  onBack: () => void
}

export function EditProfile({ user, onSave, onBack }: EditProfileProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio || '')
  const [sport, setSport] = useState<SportType>(user.sport)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sportOptions: { value: SportType; label: string }[] = [
    { value: 'wrestling', label: 'Wrestling' },
    { value: 'judo', label: 'Judo' },
    { value: 'bjj', label: 'Jiu-Jitsu' },
  ]

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Display name validation
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters'
    } else if (displayName.trim().length > 50) {
      newErrors.displayName = 'Display name must be less than 50 characters'
    }

    // Bio validation
    if (bio.length > 160) {
      newErrors.bio = 'Bio must be less than 160 characters'
    }

    // Avatar URL validation (basic)
    if (avatarUrl && !avatarUrl.match(/^https?:\/\/.+/)) {
      newErrors.avatarUrl = 'Avatar URL must be a valid URL starting with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      haptics.warning()
      return
    }

    setIsSaving(true)
    haptics.medium()

    try {
      const updates: Partial<UserProfile> = {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        sport,
        avatarUrl: avatarUrl.trim() || undefined,
      }

      const updatedUser = await supabaseService.updateProfile(user.id, updates)
      
      // Small delay for UX polish
      setTimeout(() => {
        setIsSaving(false)
        haptics.success()
        onSave(updatedUser)
      }, 300)
    } catch (error) {
      console.error('Failed to update profile:', error)
      setIsSaving(false)
      haptics.error()
      setErrors({ submit: 'Failed to update profile. Please try again.' })
    }
  }

  const hasChanges = 
    displayName.trim() !== user.displayName ||
    bio.trim() !== (user.bio || '') ||
    sport !== user.sport ||
    avatarUrl.trim() !== (user.avatarUrl || '')

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4">
          <BackButton onClick={onBack} label="Cancel" />
          <h1 className="type-title text-foreground mt-4">
            Edit Profile
          </h1>
        </header>

        <ScreenShellContent>
          <div className="px-6 pb-32 space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar preview" 
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-primary font-black text-3xl">
                    {displayName.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>

            {/* Display Name */}
            <Input
              label="Display Name *"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                if (errors.displayName) setErrors({ ...errors, displayName: '' })
              }}
              placeholder="Your display name"
              maxLength={50}
              error={errors.displayName}
            />

            {/* Bio */}
            <Textarea
              label="Bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                if (errors.bio) setErrors({ ...errors, bio: '' })
              }}
              placeholder="Tell us about yourself..."
              maxLength={160}
              rows={3}
              error={errors.bio}
              showCount
            />

            {/* Sport */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Primary Sport *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sportOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSport(option.value)}
                    className={`h-12 rounded-lg font-medium text-sm transition-all normal-case tracking-normal ${
                      sport === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Avatar URL */}
            <Input
              label="Avatar URL"
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                if (errors.avatarUrl) setErrors({ ...errors, avatarUrl: '' })
              }}
              placeholder="https://example.com/avatar.jpg"
              error={errors.avatarUrl}
            />

            {/* Error Message */}
            {errors.submit && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{errors.submit}</p>
              </div>
            )}
          </div>
        </ScreenShellContent>

        {/* Save Button */}
        <ScreenShellFooter className="px-6">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isSaving}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Button>
        </ScreenShellFooter>
      </div>
    </ScreenShell>
  )
}
