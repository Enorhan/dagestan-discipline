'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Equipment, ExperienceLevel, PrimaryGoal, Screen, SportType, WeightUnit } from '@/lib/types'
import { haptics } from '@/lib/haptics'
import { ScreenShell, ScreenShellContent, ScreenShellFooter } from '@/components/ui/screen-shell'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Card } from '@/components/ui/card'
import { LegalDocumentModal } from '@/components/ui/legal-document-modal'
import { Input, Textarea } from '@/components/ui/input'
import { analytics, getBufferedAnalyticsEntries } from '@/lib/analytics'
import {
  BILLING_SUPPORT_EMAIL,
  ACCOUNT_DELETION_MAILTO,
  BILLING_SUPPORT_MAILTO,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_SERVICE_URL,
  buildSupportMailtoLink,
  openSupportLink,
} from '@/lib/app-support'
import { getBufferedErrorReports, captureException } from '@/lib/monitoring'
import { buildProductMetricsSummary, type ProductMetricsSummary } from '@/lib/product-metrics'
import { PREMIUM_CORE_HIGHLIGHTS, PREMIUM_FEATURES, PREMIUM_POSITIONING_COPY } from '@/lib/premium-gate'
import { useNetworkStatus } from '@/lib/hooks/use-network-status'
import { buildSupportDiagnosticsSnapshot } from '@/lib/support-diagnostics'
import { getBillingCheckoutAvailability, getBillingPortalAvailability, hasRemoteRuntimeFlags } from '@/lib/runtime-flags'
import {
  PREMIUM_SUBSCRIPTION_PRICE_LABEL,
  SUBSCRIPTION_REQUIRED_AFTER_DAYS,
} from '@/lib/subscription-config'
import { useRuntimeFlags } from '@/contexts/runtime-flags-context'

interface SettingsProps {
  sport: SportType
  trainingDays: number
  equipment: Equipment | null
  weightUnit: WeightUnit
  experienceLevel: ExperienceLevel
  bodyweightKg: number | null
  primaryGoal: PrimaryGoal
  combatSessionsPerWeek: number
  sessionMinutes: number
  injuryNotes: string
  onSportChange: (sport: SportType) => void
  onDaysChange: (days: number) => void
  onEquipmentChange: (equipment: Equipment) => void
  onWeightUnitChange: (unit: WeightUnit) => void
  onExperienceLevelChange: (level: ExperienceLevel) => void
  onBodyweightKgChange: (kg: number | null) => void
  onPrimaryGoalChange: (goal: PrimaryGoal) => void
  onCombatSessionsChange: (count: number) => void
  onSessionMinutesChange: (minutes: number) => void
  onInjuryNotesChange: (notes: string) => void
  onSave: () => Promise<void> | void
  onLogout: () => void
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void
  hasWorkoutToday?: boolean
  hasUnsavedProgramChanges?: boolean
  onSaveProgramChanges?: () => void
  onRevertProgramChanges?: () => void
  onResetProgram?: () => void
  onStartSubscription?: () => Promise<void>
  onManageSubscription?: () => Promise<void>
  isPremium?: boolean
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
  customWorkoutUsage?: number
  learningPathUsage?: number
  /** Scroll position to restore when returning to this screen */
  initialScrollTop?: number
  /** Callback to save scroll position when navigating away */
  onScrollChange?: (scrollTop: number) => void
}

interface DiagnosticsActionState {
  tone: 'success' | 'warning' | 'error'
  message: string
}

interface ActiveLegalDocument {
  title: string
  url: string
}

const RELEASE_VERSION = process.env.NEXT_PUBLIC_RELEASE_VERSION?.trim() || null
const HAS_REMOTE_RUNTIME_FLAGS = hasRemoteRuntimeFlags()

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard support is unavailable in this environment.')
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  textArea.setSelectionRange(0, textArea.value.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!copied) {
    throw new Error('Unable to copy diagnostics to the clipboard.')
  }
}

function isExternalSupportTarget(target: string): boolean {
  return /^https?:\/\//i.test(target) || /^mailto:/i.test(target)
}

function normalizeLocalDocumentPath(target: string): string {
  return target.startsWith('/') ? target : `/${target}`
}

export function Settings({
  sport,
  trainingDays,
  equipment,
  weightUnit,
  experienceLevel,
  bodyweightKg,
  primaryGoal,
  combatSessionsPerWeek,
  sessionMinutes,
  injuryNotes,
  onSportChange,
  onDaysChange,
  onEquipmentChange,
  onWeightUnitChange,
  onExperienceLevelChange,
  onBodyweightKgChange,
  onPrimaryGoalChange,
  onCombatSessionsChange,
  onSessionMinutesChange,
  onInjuryNotesChange,
  onSave,
  onLogout,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
  hasUnsavedProgramChanges = false,
  onSaveProgramChanges,
  onRevertProgramChanges,
  onResetProgram,
  onStartSubscription,
  onManageSubscription,
  isPremium = false,
  subscriptionStatus,
  subscriptionPeriodEnd,
  customWorkoutUsage = 0,
  learningPathUsage = 0,
  initialScrollTop,
  onScrollChange
}: SettingsProps) {
  const { flags: runtimeFlags, isLoading: isRuntimeFlagsLoading, refresh: refreshRuntimeFlags } = useRuntimeFlags()
  const { isOnline, wasOffline } = useNetworkStatus()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isMountedRef = useRef(true)
  const saveTimeoutRef = useRef<number | null>(null)

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScroll = useRef(false)

  // Restore scroll position on mount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (initialScrollTop !== undefined && scrollContainerRef.current && !hasRestoredScroll.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = initialScrollTop
            hasRestoredScroll.current = true
          }
        })
      })
    }
  }, [initialScrollTop])

  // Handle scroll to save position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (onScrollChange) {
      onScrollChange((e.target as HTMLDivElement).scrollTop)
    }
  }, [onScrollChange])
  const [isStartingSubscription, setIsStartingSubscription] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [supportActionError, setSupportActionError] = useState<string | null>(null)
  const [productMetricsSummary, setProductMetricsSummary] = useState<ProductMetricsSummary | null>(null)
  const [bufferedAnalyticsEntries, setBufferedAnalyticsEntries] = useState(0)
  const [bufferedErrorReports, setBufferedErrorReports] = useState(0)
  const [isCopyingDiagnostics, setIsCopyingDiagnostics] = useState(false)
  const [isRefreshingRuntimeConfig, setIsRefreshingRuntimeConfig] = useState(false)
  const [diagnosticsActionState, setDiagnosticsActionState] = useState<DiagnosticsActionState | null>(null)
  const [activeLegalDocument, setActiveLegalDocument] = useState<ActiveLegalDocument | null>(null)

  // Reset managing state when app becomes visible again (user returns from portal)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to app - reset loading states
        setIsManagingSubscription(false)
        setIsStartingSubscription(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also reset on mount
    setIsManagingSubscription(false)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const refreshOperationalSummary = useCallback(() => {
    const analyticsEntries = getBufferedAnalyticsEntries()
    setBufferedAnalyticsEntries(analyticsEntries.length)
    setBufferedErrorReports(getBufferedErrorReports().length)

    if (process.env.NODE_ENV !== 'production') {
      setProductMetricsSummary(buildProductMetricsSummary(analyticsEntries))
    }
  }, [])

  useEffect(() => {
    refreshOperationalSummary()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshOperationalSummary()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshOperationalSummary])

  const handleSupportAction = useCallback(async (
    target: string,
    event: 'support_contact_opened' | 'billing_help_opened' | 'legal_document_opened' | 'account_deletion_requested',
    payload: Record<string, string>
  ) => {
    setSupportActionError(null)
    analytics.track(event, payload)

    try {
      await openSupportLink(target)
    } catch (error) {
      captureException('settings-support-link', error, {
        target,
        event,
      }, 'warning')
      setSupportActionError('Unable to open that link right now. Please try again in a moment.')
    }
  }, [])
  const handleLegalDocumentAction = useCallback((title: string, target: string, document: 'privacy-policy' | 'terms-of-service') => {
    if (isExternalSupportTarget(target)) {
      void handleSupportAction(target, 'legal_document_opened', {
        source: 'settings',
        document,
      })
      return
    }

    setSupportActionError(null)
    analytics.track('legal_document_opened', {
      source: 'settings',
      document,
      channel: 'in-app-modal',
    })
    setActiveLegalDocument({
      title,
      url: normalizeLocalDocumentPath(target),
    })
  }, [handleSupportAction])
  const openBillingRecoveryHelp = useCallback((issue: 'checkout' | 'portal', message?: string | null) => {
    const body = [
      'Hi Dagestani Disciple billing support,',
      '',
      'I need help recovering billing access or subscription state.',
      '',
      `Issue: ${issue === 'checkout' ? 'Upgrade or purchase flow' : 'Manage subscription or portal flow'}`,
      `Subscription status in app: ${subscriptionStatus ?? 'unknown'}`,
      message ? `Latest in-app message: ${message}` : null,
      '',
      'What happened:',
      '[add a short description here]',
    ].filter(Boolean).join('\n')

    void handleSupportAction(
      buildSupportMailtoLink(BILLING_SUPPORT_EMAIL, 'Dagestani Disciple billing recovery help', body),
      'billing_help_opened',
      {
        source: 'settings',
        channel: 'email',
        issue,
      }
    )
  }, [handleSupportAction, subscriptionStatus])
  const handleCopyDiagnostics = useCallback(async () => {
    haptics.light()
    setDiagnosticsActionState(null)
    setIsCopyingDiagnostics(true)

    try {
      const diagnosticsSnapshot = buildSupportDiagnosticsSnapshot({
        environment: process.env.NODE_ENV ?? 'unknown',
        releaseVersion: RELEASE_VERSION,
        isOnline,
        wasOffline,
        runtimeFlags,
        remoteRuntimeFlagsConfigured: HAS_REMOTE_RUNTIME_FLAGS,
        runtimeFlagsLoading: isRuntimeFlagsLoading || isRefreshingRuntimeConfig,
        analyticsBufferCount: bufferedAnalyticsEntries,
        errorReportCount: bufferedErrorReports,
        isPremium,
        subscriptionStatus,
        subscriptionPeriodEnd,
        origin: typeof window !== 'undefined' ? window.location.origin : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })

      await copyTextToClipboard(diagnosticsSnapshot)
      setDiagnosticsActionState({
        tone: 'success',
        message: 'Diagnostics copied. Paste them into your support or billing email if you need help.',
      })
    } catch (error) {
      captureException('settings-diagnostics-copy', error, {
        source: 'settings',
      }, 'warning')
      setDiagnosticsActionState({
        tone: 'error',
        message: 'Unable to copy diagnostics right now. You can still retry after reopening Settings.',
      })
    } finally {
      setIsCopyingDiagnostics(false)
    }
  }, [
    bufferedAnalyticsEntries,
    bufferedErrorReports,
    isOnline,
    isPremium,
    isRefreshingRuntimeConfig,
    isRuntimeFlagsLoading,
    runtimeFlags,
    subscriptionPeriodEnd,
    subscriptionStatus,
    wasOffline,
  ])
  const handleRefreshAppStatus = useCallback(async () => {
    haptics.light()
    setDiagnosticsActionState(null)
    setIsRefreshingRuntimeConfig(true)

    try {
      await refreshRuntimeFlags()
      refreshOperationalSummary()
      setDiagnosticsActionState({
        tone: HAS_REMOTE_RUNTIME_FLAGS ? 'success' : 'warning',
        message: HAS_REMOTE_RUNTIME_FLAGS
          ? 'Runtime configuration refreshed. If billing access still looks wrong, try your action once more.'
          : 'This build is using bundled runtime defaults. No remote runtime config URL is set.',
      })
    } catch (error) {
      captureException('settings-runtime-flags-refresh', error, {
        source: 'settings',
      }, 'warning')
      setDiagnosticsActionState({
        tone: 'error',
        message: 'Unable to refresh runtime configuration right now. The app will keep using the latest known values.',
      })
    } finally {
      setIsRefreshingRuntimeConfig(false)
    }
  }, [refreshOperationalSummary, refreshRuntimeFlags])
  const LBS_PER_KG = 2.20462
  const sportOptions: { value: SportType; label: string }[] = [
    { value: 'wrestling', label: 'Wrestling' },
    { value: 'judo', label: 'Judo' },
    { value: 'bjj', label: 'Jiu-Jitsu' },
  ]

  const days = [3, 4, 5, 6]
  const sessionOptions = [30, 45, 60, 75, 90]
  const combatOptions = [0, 1, 2, 3, 4, 5, 6, 7]
  const goalOptions: { value: PrimaryGoal; label: string }[] = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'strength', label: 'Strength' },
    { value: 'power', label: 'Power' },
    { value: 'conditioning', label: 'Conditioning' },
  ]

  const displayBodyweight = bodyweightKg
    ? (weightUnit === 'kg' ? bodyweightKg : bodyweightKg * LBS_PER_KG)
    : null
  const bodyweightValue = displayBodyweight !== null
    ? (weightUnit === 'kg' ? displayBodyweight.toFixed(1) : displayBodyweight.toFixed(0))
    : ''

  const customWorkoutLimit = PREMIUM_FEATURES['custom-workouts'].freeLimit ?? 0
  const safeCustomWorkoutUsage = Math.max(0, customWorkoutUsage)
  const customWorkoutRemaining = Math.max(0, customWorkoutLimit - safeCustomWorkoutUsage)
  const learningPathLimit = PREMIUM_FEATURES['learning-paths'].freeLimit ?? 0
  const safeLearningPathUsage = Math.max(0, learningPathUsage)
  const learningPathRemaining = Math.max(0, learningPathLimit - safeLearningPathUsage)
  const checkoutAvailability = getBillingCheckoutAvailability(runtimeFlags)
  const portalAvailability = getBillingPortalAvailability(runtimeFlags)
  const formattedSubscriptionPeriodEnd = formatDisplayDate(subscriptionPeriodEnd)
  const diagnosticsMessageClassName = diagnosticsActionState?.tone === 'success'
    ? 'text-emerald-400'
    : diagnosticsActionState?.tone === 'warning'
      ? 'text-amber-400'
      : 'text-red-400'

  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Header */}
        <header className="px-6 safe-area-top pb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Preferences
          </p>
          <h1 className="type-title text-foreground mt-2">
            Settings
          </h1>
        </header>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 overflow-x-hidden overscroll-contain px-6 pb-32"
        >
          {/* Sport Selection */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Combat Sport
            </p>
            <div className="flex flex-col gap-2">
              {sportOptions.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => onSportChange(option.value)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className={`
                    w-full p-4 text-left rounded-lg transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start
                    ${sport === option.value
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-card/50 border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={sport === option.value}
                >
                  <span className="text-base font-semibold text-foreground">
                    {option.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Training Days */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Training Days / Week
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {days.map((day) => (
                <Button
                  key={day}
                  onClick={() => onDaysChange(day)}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-14 flex items-center justify-center text-xl font-bold rounded-lg
                    transition-all duration-150 normal-case tracking-normal
                    ${trainingDays === day
                      ? 'bg-primary text-primary-foreground border border-primary'
                      : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={trainingDays === day}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          {/* Training Mode */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Training Mode
            </p>
            <div className="flex flex-col gap-2">
              {([
                { value: 'bodyweight', label: 'Bodyweight only', description: 'No external load needed' },
                { value: 'gym', label: 'Weighted / Gym', description: 'Barbell, kettlebell, pull-up bar' },
              ] as { value: Equipment; label: string; description: string }[]).map((option) => (
                <Button
                  key={option.value}
                  onClick={() => onEquipmentChange(option.value)}
                  variant="ghost"
                  size="sm"
                  stacked
                  className={`
                    w-full p-4 text-left rounded-lg transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start
                    ${equipment === option.value
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-card/50 border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={equipment === option.value}
                >
                  <span className="text-base font-semibold text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">
                    {option.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Weight Unit */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Weight Units
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
                <Button
                  key={unit}
                  onClick={() => onWeightUnitChange(unit)}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-14 flex items-center justify-center text-base font-semibold rounded-lg transition-all duration-150 uppercase normal-case tracking-normal
                    ${weightUnit === unit
                      ? 'bg-primary text-primary-foreground border border-primary'
                      : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                    }
                  `}
                  aria-pressed={weightUnit === unit}
                >
                  {unit}
                </Button>
              ))}
            </div>
          </div>

          {/* Program Personalization */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Program Personalization
            </p>

            {/* Experience */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Experience level
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => (
                  <Button
                    key={lvl}
                    onClick={() => onExperienceLevelChange(lvl)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-12 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${experienceLevel === lvl
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={experienceLevel === lvl}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bodyweight */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Bodyweight ({weightUnit})
              </p>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={weightUnit === 'kg' ? 'e.g. 78.5' : 'e.g. 173'}
                value={bodyweightValue}
                onChange={(e) => {
                  const raw = e.target.value
                  const parsed = raw === '' ? NaN : Number(raw)
                  if (Number.isNaN(parsed)) {
                    onBodyweightKgChange(null)
                    return
                  }
                  const kg = weightUnit === 'kg' ? parsed : parsed / LBS_PER_KG
                  onBodyweightKgChange(Math.max(0, kg))
                }}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Used for better recovery and volume recommendations.
              </p>
            </div>

            {/* Goal */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Primary goal
              </p>
              <div className="grid grid-cols-2 gap-2">
                {goalOptions.map((g) => (
                  <Button
                    key={g.value}
                    onClick={() => onPrimaryGoalChange(g.value)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-12 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${primaryGoal === g.value
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={primaryGoal === g.value}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Combat sessions */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Combat sessions / week
              </p>
              <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
                {combatOptions.map((n) => (
                  <Button
                    key={n}
                    onClick={() => onCombatSessionsChange(n)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-11 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${combatSessionsPerWeek === n
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={combatSessionsPerWeek === n}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time cap */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Session time cap (min)
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {sessionOptions.map((m) => (
                  <Button
                    key={m}
                    onClick={() => onSessionMinutesChange(m)}
                    variant="ghost"
                    size="sm"
                    className={`
                      h-11 flex items-center justify-center text-sm font-bold rounded-lg
                      transition-all duration-150 normal-case tracking-normal
                      ${sessionMinutes === m
                        ? 'bg-primary text-primary-foreground border border-primary'
                        : 'bg-card/50 text-foreground border border-border/60 hover:bg-card'
                      }
                    `}
                    aria-pressed={sessionMinutes === m}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {/* Injuries */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Injuries (optional)
              </p>
              <Textarea
                value={injuryNotes}
                onChange={(e) => onInjuryNotesChange(e.target.value)}
                placeholder="e.g. knee pain, lower back sensitivity"
                className="min-h-[92px]"
              />
            </div>
          </div>

          {/* Subscription */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Subscription
            </p>
            <Card className="p-4 bg-card/50 border-border/60">
              {isPremium ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {subscriptionStatus === 'canceling' ? 'Premium (Canceling)' : 'Premium Active'}
                      </p>
                      <p className="text-sm text-muted-foreground">{PREMIUM_SUBSCRIPTION_PRICE_LABEL}</p>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      subscriptionStatus === 'canceling'
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-green-400 bg-green-400/10'
                    }`}>
                      {subscriptionStatus === 'canceling' ? 'Canceling' : 'Active'}
                    </div>
                  </div>
                  {subscriptionStatus === 'canceling' && subscriptionPeriodEnd ? (
                    <p className="text-xs text-amber-400 mt-3">
                      Your subscription has been cancelled. Premium access ends on{' '}
                      <span className="font-semibold">
                        {new Date(subscriptionPeriodEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-3">
                      You have full access to all premium features.
                    </p>
                  )}
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                      Included now
                    </p>
                    {PREMIUM_CORE_HIGHLIGHTS.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                  {!isOnline && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Offline
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Billing, sync, and recovery actions need a connection. Reconnect, reopen Settings once, then retry.
                      </p>
                    </div>
                  )}
                  {!portalAvailability.enabled && portalAvailability.message && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Billing notice
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {portalAvailability.message}
                      </p>
                    </div>
                  )}
                  {subscriptionError && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs text-red-400">{subscriptionError}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => openBillingRecoveryHelp('portal', subscriptionError)}
                      >
                        Contact Billing Help
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!portalAvailability.enabled || !isOnline}
                    loading={isManagingSubscription}
                    className="mt-4 w-full"
                    onClick={async () => {
                      haptics.light()
                      setSubscriptionError(null)

                      if (!onManageSubscription) {
                        setSubscriptionError('Unable to manage subscription.')
                        return
                      }

                      setIsManagingSubscription(true)
                      try {
                        await onManageSubscription()
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to open subscription management.'
                        setSubscriptionError(message)
                      } finally {
                        setIsManagingSubscription(false)
                      }
                    }}
                  >
                    {!isOnline
                      ? 'Connect to manage subscription'
                      : portalAvailability.enabled
                        ? 'Manage Subscription'
                        : 'Subscription management unavailable'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Upgrade window
                        </p>
                        <h3 className="mt-2 text-lg font-black text-foreground">
                          Keep the full coaching layer after day {SUBSCRIPTION_REQUIRED_AFTER_DAYS}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Premium keeps adaptive planning, deeper analytics, and guided learning unlocked after your grace period ends.
                        </p>
                      </div>
                      <div className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                        {SUBSCRIPTION_REQUIRED_AFTER_DAYS}-day grace
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-foreground">Monthly Plan</p>
                      <p className="text-sm text-muted-foreground">{PREMIUM_SUBSCRIPTION_PRICE_LABEL}</p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                      Cancel anytime
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 p-4 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Smarter coaching unlocked
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {PREMIUM_POSITIONING_COPY}
                    </p>
                    {PREMIUM_CORE_HIGHLIGHTS.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                  {!isOnline && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Offline
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Checkout and purchase recovery need a connection. Reconnect before retrying your upgrade.
                      </p>
                    </div>
                  )}
                  {!checkoutAvailability.enabled && checkoutAvailability.message && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Billing notice
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {checkoutAvailability.message}
                      </p>
                    </div>
                  )}
                  {subscriptionError && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs text-red-400">{subscriptionError}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => openBillingRecoveryHelp('checkout', subscriptionError)}
                      >
                        Contact Billing Help
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!checkoutAvailability.enabled || !isOnline}
                    loading={isStartingSubscription}
                    className="mt-4 w-full"
                    onClick={async () => {
                      haptics.light()
                      setSubscriptionError(null)

                      if (!onStartSubscription) {
                        setSubscriptionError('Sign in required to upgrade.')
                        return
                      }

                      setIsStartingSubscription(true)
                      try {
                        await onStartSubscription()
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to start checkout right now.'
                        setSubscriptionError(message)
                      } finally {
                        setIsStartingSubscription(false)
                      }
                    }}
                  >
                    {!isOnline
                      ? 'Connect to unlock premium'
                      : checkoutAvailability.enabled
                        ? 'Unlock smarter coaching'
                        : 'Premium temporarily unavailable'}
                  </Button>

                  {(customWorkoutLimit > 0 || learningPathLimit > 0) && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                        Free plan limits
                      </p>
                      {customWorkoutLimit > 0 && (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">Custom workouts</span>
                            <span className="font-bold text-amber-400">
                              {safeCustomWorkoutUsage}/{customWorkoutLimit}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {customWorkoutRemaining > 0
                              ? `${customWorkoutRemaining} free creation${customWorkoutRemaining === 1 ? '' : 's'} left before Premium is required.`
                              : 'Free custom workout limit reached. Upgrade to continue creating new workouts.'}
                          </p>
                        </div>
                      )}

                      {learningPathLimit > 0 && (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">Learning paths</span>
                            <span className="font-bold text-amber-400">
                              {safeLearningPathUsage}/{learningPathLimit}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {learningPathRemaining > 0
                              ? `${learningPathRemaining} free path slot${learningPathRemaining === 1 ? '' : 's'} left before Premium is required.`
                              : 'Free learning path limit reached. Upgrade to start additional paths.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Support & Legal
            </p>
            <Card className="p-4 bg-card/50 border-border/60">
              <p className="text-sm font-semibold text-foreground">
                Get billing help, review policies, or request account support.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Use support for billing questions, purchase recovery, privacy requests, or account deletion.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  stacked
                  className="w-full rounded-lg border border-border/60 bg-card/60 p-4 text-left h-auto"
                  onClick={() => void handleSupportAction(BILLING_SUPPORT_MAILTO, 'billing_help_opened', {
                    source: 'settings',
                    channel: 'email',
                  })}
                >
                  <span className="text-sm font-semibold text-foreground">Billing Help</span>
                  <span className="block text-xs text-muted-foreground">
                    Contact support for charge questions, restore access, or subscription recovery.
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  stacked
                  className="w-full rounded-lg border border-border/60 bg-card/60 p-4 text-left h-auto"
                  onClick={() => handleLegalDocumentAction('Privacy Policy', PRIVACY_POLICY_URL, 'privacy-policy')}
                >
                  <span className="text-sm font-semibold text-foreground">Privacy Policy</span>
                  <span className="block text-xs text-muted-foreground">
                    Review how account, training, analytics, and billing data are handled.
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  stacked
                  className="w-full rounded-lg border border-border/60 bg-card/60 p-4 text-left h-auto"
                  onClick={() => handleLegalDocumentAction('Terms of Service', TERMS_OF_SERVICE_URL, 'terms-of-service')}
                >
                  <span className="text-sm font-semibold text-foreground">Terms of Service</span>
                  <span className="block text-xs text-muted-foreground">
                    Review subscription terms, acceptable use expectations, and support boundaries.
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  stacked
                  className="w-full rounded-lg border border-border/60 bg-card/60 p-4 text-left h-auto"
                  onClick={() => void handleSupportAction(ACCOUNT_DELETION_MAILTO, 'account_deletion_requested', {
                    source: 'settings',
                    channel: 'email',
                  })}
                >
                  <span className="text-sm font-semibold text-foreground">Request Account Deletion</span>
                  <span className="block text-xs text-muted-foreground">
                    Start a deletion request for account data, logs, and saved training records.
                  </span>
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Support email
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{SUPPORT_EMAIL}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Best for billing issues, access recovery, privacy requests, and general support.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Recovery tips
                </p>
                <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>• After checkout or portal return, give premium sync up to a minute and reopen Settings once before retrying.</p>
                  <p>• If you were charged but Premium did not unlock, use Billing Help and include the purchase date plus your account email.</p>
                  <p>• If you cannot access your account, use password reset first, then contact support if the recovery email never arrives.</p>
                  <p>• If you contact support, copy the diagnostics snapshot below so release, billing, and runtime state are included automatically.</p>
                </div>
              </div>

              {supportActionError && (
                <p className="text-xs text-red-400 mt-3">{supportActionError}</p>
              )}
            </Card>
          </div>

          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              App Status
            </p>
            <Card className="p-4 bg-card/50 border-border/60">
              <p className="text-sm font-semibold text-foreground">
                Operational snapshot
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Check this before retrying billing, sync, or support flows. If you contact support, copy diagnostics so release and runtime state travel with your report.
              </p>

              {!isOnline ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">Offline now</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Cloud-backed features like billing, recovery email delivery, and account sync may be delayed until you reconnect.
                  </p>
                </div>
              ) : wasOffline ? (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Back online</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Connection recovered. If billing or sync was interrupted, retry the action once from Settings.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Connection</p>
                  <p className="mt-2 text-base font-black text-foreground">{isOnline ? 'Online' : 'Offline'}</p>
                  <p className="text-[11px] text-muted-foreground">{isOnline ? 'Cloud actions available' : 'Local-only until reconnect'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Release</p>
                  <p className="mt-2 text-base font-black text-foreground break-all">{RELEASE_VERSION ?? 'Not set'}</p>
                  <p className="text-[11px] text-muted-foreground">{process.env.NODE_ENV ?? 'unknown'} build</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Runtime config</p>
                  <p className="mt-2 text-base font-black text-foreground">
                    {HAS_REMOTE_RUNTIME_FLAGS ? 'Remote-aware' : 'Bundled defaults'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isRuntimeFlagsLoading || isRefreshingRuntimeConfig
                      ? 'Checking latest values…'
                      : HAS_REMOTE_RUNTIME_FLAGS
                        ? 'Ready to refresh from remote flags'
                        : 'No remote runtime URL configured'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Billing readiness</p>
                  <p className="mt-2 text-base font-black text-foreground">
                    {checkoutAvailability.enabled && portalAvailability.enabled ? 'Ready' : 'Attention needed'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Checkout {checkoutAvailability.enabled ? 'on' : 'paused'} · Portal {portalAvailability.enabled ? 'on' : 'paused'}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground space-y-1">
                <p>Premium access: <span className="font-semibold text-foreground">{isPremium ? 'Enabled' : 'Free plan'}</span></p>
                <p>Subscription status: <span className="font-semibold text-foreground">{subscriptionStatus ?? 'Unknown'}</span></p>
                <p>Subscription end/renewal: <span className="font-semibold text-foreground">{formattedSubscriptionPeriodEnd ?? 'Not available'}</span></p>
                <p>Buffered analytics entries: <span className="font-semibold text-foreground">{bufferedAnalyticsEntries}</span></p>
                <p>Buffered error reports: <span className="font-semibold text-foreground">{bufferedErrorReports}</span></p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  loading={isCopyingDiagnostics}
                  onClick={() => void handleCopyDiagnostics()}
                >
                  Copy Diagnostics Snapshot
                </Button>
                {HAS_REMOTE_RUNTIME_FLAGS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    loading={isRefreshingRuntimeConfig}
                    onClick={() => void handleRefreshAppStatus()}
                  >
                    Recheck Runtime Config
                  </Button>
                )}
              </div>

              {diagnosticsActionState && (
                <p className={`mt-3 text-xs ${diagnosticsMessageClassName}`}>
                  {diagnosticsActionState.message}
                </p>
              )}
            </Card>
          </div>

          {/* Program Actions */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Program
            </p>
            <div className="flex flex-col gap-2">
              {hasUnsavedProgramChanges && onSaveProgramChanges && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    haptics.medium()
                    onSaveProgramChanges()
                  }}
                >
                  Save Draft
                </Button>
              )}
              {hasUnsavedProgramChanges && onRevertProgramChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    haptics.light()
                    onRevertProgramChanges()
                  }}
                >
                  Revert to Last Saved
                </Button>
              )}
              {onResetProgram && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    haptics.light()
                    onResetProgram()
                  }}
                >
                  Restore Original Generated
                </Button>
              )}
            </div>
          </div>

          {/* Streak Rules */}
          <div className="mb-8 p-4 bg-card/50 rounded-lg">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Streak Rules
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your streak advances if you complete a session within 36 hours of your last workout.
              Miss the window and the streak resets.
            </p>
          </div>

          {process.env.NODE_ENV !== 'production' && productMetricsSummary && (
            <div className="mb-8">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Product Review
              </p>
              <Card className="p-4 bg-card/50 border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Recent on-device metrics
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Quick dev snapshot from the local analytics buffer for onboarding, workouts, retention, and billing flows.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Active days</p>
                    <p className="mt-2 text-lg font-black text-foreground">{productMetricsSummary.activeDaysLast7}/7</p>
                    <p className="text-[11px] text-muted-foreground">{productMetricsSummary.activeDaysLast28}/28 in the last 28 days</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Workout funnel</p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {productMetricsSummary.workoutCompletionRate ?? '—'}{productMetricsSummary.workoutCompletionRate !== null ? '%' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {productMetricsSummary.workoutCompletions}/{productMetricsSummary.workoutStarts} completed
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Onboarding funnel</p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {productMetricsSummary.onboardingCompletionRate ?? '—'}{productMetricsSummary.onboardingCompletionRate !== null ? '%' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {productMetricsSummary.onboardingCompletions}/{productMetricsSummary.onboardingStarts} completed · {productMetricsSummary.onboardingFailures} failed
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Checkout funnel</p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {productMetricsSummary.checkoutConversionRate ?? '—'}{productMetricsSummary.checkoutConversionRate !== null ? '%' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {productMetricsSummary.checkoutCompleted}/{productMetricsSummary.checkoutStarts} converted · {productMetricsSummary.checkoutCanceled} canceled
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground space-y-1">
                  <p>Buffered events: <span className="font-semibold text-foreground">{productMetricsSummary.bufferedEvents}</span></p>
                  <p>Buffered error reports: <span className="font-semibold text-foreground">{bufferedErrorReports}</span></p>
                  <p>Portal opens/failures: <span className="font-semibold text-foreground">{productMetricsSummary.portalOpens}/{productMetricsSummary.portalFailures}</span></p>
                  <p>Refresh failures: <span className="font-semibold text-foreground">{productMetricsSummary.refreshFailures}</span></p>
                  <p>Last event: <span className="font-semibold text-foreground">{productMetricsSummary.lastEventAt ? new Date(productMetricsSummary.lastEventAt).toLocaleString() : 'No events yet'}</span></p>
                </div>
              </Card>
            </div>
          )}

          {/* Account Section */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Account
            </p>
            <Button
              onClick={() => setShowLogoutConfirmation(true)}
              variant="ghost"
              size="sm"
              stacked
              className="w-full p-4 text-left rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start"
            >
              <span className="text-base font-semibold text-red-400">
                Log Out
              </span>
              <span className="block text-sm text-red-400/70 mt-1">
                Sign out of your account
              </span>
            </Button>
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={isSaving}
              onClick={() => {
                haptics.light()
                setShowConfirmation(true)
              }}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </div>

      <ScreenShellFooter>
        <BottomNav
          active="profile"
          onNavigate={onNavigate}
          onStartAction={onStartAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      </ScreenShellFooter>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          setShowConfirmation(false)
          setIsSaving(true)

          if (saveTimeoutRef.current !== null) {
            window.clearTimeout(saveTimeoutRef.current)
          }

          // Small delay to show loading state for UX polish
          saveTimeoutRef.current = window.setTimeout(async () => {
            try {
              await onSave()
            } finally {
              saveTimeoutRef.current = null
              if (isMountedRef.current) {
                setIsSaving(false)
              }
            }
          }, 300)
        }}
        title="Save Preferences?"
        message="Your preferences will be saved. If training days or sport changed, a new program will be generated and week progress reset. Streak and history remain."
        confirmText="Save"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          setShowLogoutConfirmation(false)
          haptics.medium()
          onLogout()
        }}
        title="Log Out?"
        message="You will need to sign in again to access your account and training data."
        confirmText="Log Out"
        cancelText="Cancel"
        variant="destructive"
      />

      <LegalDocumentModal
        isOpen={activeLegalDocument !== null}
        title={activeLegalDocument?.title ?? 'Legal document'}
        url={activeLegalDocument?.url ?? '/'}
        onClose={() => setActiveLegalDocument(null)}
      />
    </ScreenShell>
  )
}
