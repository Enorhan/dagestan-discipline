'use client'

import Image from 'next/image'
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Camera,
  Check,
  ChevronDown,
  Crown,
  Info,
  Link2,
  NotebookPen,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  Video,
  X,
  Zap,
} from 'lucide-react'
import { LibraryGameplansShell } from '@/components/bjj-app/library-gameplans-shell'
import { TodayShell } from '@/components/bjj-app/today-shell'
import { YouLegacyShell } from '@/components/bjj-app/you-legacy-shell'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { UserSystemReaderModal } from '@/components/user-system-reader-modal'
import { UserSystemWizardModal } from '@/components/user-system-wizard-modal'
import { useAuth } from '@/contexts/auth-context'
import { useRuntimeFlags } from '@/contexts/runtime-flags-context'
import { useToast } from '@/contexts/toast-context'
import { toastCopy } from '@/lib/toast-messages'
import { bjjService, type SaveUserSystemInput } from '@/lib/bjj-service'

import { haptics } from '@/lib/haptics'
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics-consent'
import { supabase } from '@/lib/supabase'
import { supabaseService } from '@/lib/supabase-service'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import {
  branchFromPrimaryDiscipline,
  getMartialArtsBranchLabel,
  normalizeMartialArtsBranchId,
  type MartialArtsBranchId,
} from '@/lib/martial-arts-branches'
import {
  applyServerProfileFlags,
  BJJ_PROFILE_FLAGS_STORAGE_KEY,
  BJJ_UI_PREFS_STORAGE_KEY,
  mergePersistedShellProfileFlags,
  mergeShellProfilePatch,
  normalizeBjjState,
  normalizePersistedShellProfileFlags,
  normalizePersistedShellUiPrefs,
} from '@/lib/bjj-state'
import { Preferences } from '@capacitor/preferences'
import {
  BJJ_CATEGORY_META,
  BJJ_CHALLENGE_OPTIONS,
  BJJ_EXPERIENCE_LEVEL_OPTIONS,
  BJJ_FAVORITE_CONTENT_OPTIONS,
  BJJ_HEARD_FROM_OPTIONS,
  BJJ_ONBOARDING_STEPS,
  BJJ_PAYWALL_STEPS,
  BJJ_PRIMARY_DISCIPLINE_OPTIONS,
  BJJ_STORAGE_KEY,
  createChecklistItems,
  createDefaultBjjState,
} from '@/lib/bjj-seed'
import { initDeepLinkHandler } from '@/lib/deep-link-handler'
import {
  appendSavedTechniqueLabel,
  loadUserTechniqueLabelPrefs,
  removeTechniqueLabelFromPalette,
} from '@/lib/user-technique-label-prefs'
import {
  PRIVACY_POLICY_URL,
  SUPPORT_MAILTO,
  TERMS_OF_SERVICE_URL,
  openSupportLink,
} from '@/lib/app-support'
import { useBillingCoordinator } from '@/lib/hooks/use-billing-coordinator'
import { getMatFlowAccessState } from '@/lib/matflow-access'
import type {
  BjjAchievement,
  BjjAnalyticsWindow,
  BjjAuthMode,
  BjjChallenge,
  BjjPaywallStep,
  BjjPersistedState,
  BjjSession,
  BjjSurface,
  BjjSystem,
  BjjTechnique,
  BjjTechniqueCategory,
} from '@/lib/bjj-types'
import type { UserProfile } from '@/lib/user-profile-types'
import { cn } from '@/lib/utils'

import {
  ANALYTICS_CARDS,
  BOTTOM_NAV_ITEMS,
  BRANCH_DOT_COLORS,
  CALENDAR_WEEKDAY_LABELS,
  DURATION_PRESETS,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
} from './bjj-app/constants'
import type {
  DiscoverTechniqueDraft,
  ProfileDraft,
  SessionDraft,
  TechniqueDraft,
} from './bjj-app/types'
import {
  createDiscoverTechniqueDraft,
  createSessionDraft,
  createTechniqueDraft,
  sessionToDraft,
} from './bjj-app/draft-factories'
import {
  type SessionBucketKey,
  SESSION_BUCKET_LABELS,
  SESSION_BUCKET_ORDER,
  addMonths,
  bucketForSessionDate,
  computeStreakDayKeys,
  computeTrainingStreakDays,
  computeWeekStart,
  formatDayKey,
  formatMonthTitle,
  formatPrettyDate,
  formatPrettyDateTime,
  formatSelectedDayTitle,
  getMonthAnchor,
  getMonthMatrix,
  parseDayKey,
  startOfDay,
} from './bjj-app/date-utils'
import {
  formatDurationSeconds,
  readVideoMetadata,
  slugifyUsername,
  toTechniqueColor,
} from './bjj-app/format-utils'
import {
  ScreenBackdrop,
  type ScreenBackdropVariant,
} from './bjj-app/screen-backdrop'
import {
  BeltBar,
  BranchSelect,
  CircleIconButton,
  EmptyState,
  PrimaryButton,
  SearchField,
  ShellCard,
} from './bjj-app/primitives'
import { ModalShell } from './bjj-app/modal-shell'
import { TipModal, type TipModalContent } from './bjj-app/tip-modal'
import { SystemPreviewGraph } from './bjj-app/system-preview-graph'
import { AuthScreen } from './bjj-app/auth-screen'
import { OnboardingScreen } from './bjj-app/onboarding-screen'
import { PaywallScreen } from './bjj-app/paywall-screen'
import { SessionDetailModal } from './bjj-app/session-detail-modal'
import { SessionFormModal } from './bjj-app/session-form-modal'
import { EditProfileModal } from './bjj-app/edit-profile-modal'

function BjjAppInner() {
  const {
    clearError,
    error: authError,
    isAuthenticated,
    isInitializing: authInitializing,
    isLoading: authLoading,
    requestPasswordReset,
    signIn,
    signInWithOAuth,
    signOut,
    signUp,
    updateProfile,
    user,
  } = useAuth()
  const { flags: runtimeFlags } = useRuntimeFlags()
  const { showError, showInfo, showSuccess } = useToast()

  const identityDisplayName = user?.displayName ?? 'Grappler'
  const identityUsername = user?.username ?? 'grappler'
  const storageKey = `${BJJ_STORAGE_KEY}:${user?.id ?? 'anonymous'}`
  const profileFlagsStorageKey = `${BJJ_PROFILE_FLAGS_STORAGE_KEY}:${user?.id ?? 'anonymous'}`
  const uiPrefsStorageKey = `${BJJ_UI_PREFS_STORAGE_KEY}:${user?.id ?? 'anonymous'}`
  const debugTourKey = 'dd.debug.tour'

  const debugTourLog = useMemo(() => (message: string, data: Record<string, unknown>) => {
    const entry = JSON.stringify({ message, data, timestamp: Date.now() })
    void Preferences.get({ key: debugTourKey })
      .then((existing) => Preferences.set({ key: debugTourKey, value: existing.value ? `${existing.value}\n${entry}` : entry }))
      .catch(() => {})
  }, [])

  const [appState, setAppState] = useState<BjjPersistedState | null>(null)
  const [emailSheetOpen, setEmailSheetOpen] = useState(false)
  const [authMode, setAuthMode] = useState<BjjAuthMode>('sign-up')
  const [authForm, setAuthForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(createSessionDraft)
  const [techniqueDraft, setTechniqueDraft] = useState<TechniqueDraft>(createTechniqueDraft)
  const [discoverDraft, setDiscoverDraft] = useState<DiscoverTechniqueDraft>(createDiscoverTechniqueDraft)
  const [discoverVideoFile, setDiscoverVideoFile] = useState<File | null>(null)
  const [discoverKeepMediaUrls, setDiscoverKeepMediaUrls] = useState<string[]>([])
  const [editingDiscoverTechniqueId, setEditingDiscoverTechniqueId] = useState<string | null>(null)
  const [categoryPickerFor, setCategoryPickerFor] = useState<'library' | 'discover'>('library')
  const [techniqueCategoryOverlayOpen, setTechniqueCategoryOverlayOpen] = useState(false)
  const [techniqueTagsModalFor, setTechniqueTagsModalFor] = useState<'new-technique' | 'new-discover-technique'>('new-technique')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [activeSurface, setActiveSurface] = useState<BjjSurface | null>(null)
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null)
  const [expandedDiscoverCategory, setExpandedDiscoverCategory] = useState<BjjTechniqueCategory | null>('submission')
  const [coachStep, setCoachStep] = useState<number | null>(null)
  const [onboardingIndex, setOnboardingIndex] = useState(0)
  const [paywallIndex, setPaywallIndex] = useState(0)
  const [paywallPlan] = useState<'monthly'>('monthly')
  const [setupProgress, setSetupProgress] = useState(27)
  const [analyticsWindow, setAnalyticsWindow] = useState<BjjAnalyticsWindow>('this-month')
  const [librarySearchInput, setLibrarySearchInput] = useState('')
  const [techniqueTagSearchInput, setTechniqueTagSearchInput] = useState('')
  const [userLabelPrefsVersion, setUserLabelPrefsVersion] = useState(0)
  const [techniqueLinkedSearchInput, setTechniqueLinkedSearchInput] = useState('')
  const [libraryView, setLibraryView] = useState<'list' | 'graph'>('list')
  const [sessionSearchInput, setSessionSearchInput] = useState('')
  const [tipModal, setTipModal] = useState<TipModalContent | null>(null)
  const [searchTutorialSaving, setSearchTutorialSaving] = useState(false)
  const [discoverTechniques, setDiscoverTechniques] = useState<BjjTechnique[]>([])
  const [systemsState, setSystemsState] = useState<BjjSystem[]>([])
  const [systemActionsOpenId, setSystemActionsOpenId] = useState<string | null>(null)
  const [systemEditorSession, setSystemEditorSession] = useState<{
    initial: BjjSystem | null
    nonce: number
  } | null>(null)
  const [systemReaderSession, setSystemReaderSession] = useState<BjjSystem | null>(null)
  const [challengeState, setChallengeState] = useState<BjjChallenge[]>([])
  const [achievementState, setAchievementState] = useState<BjjAchievement[]>([])
  const [shellSyncing, setShellSyncing] = useState(false)
  const [shellError, setShellError] = useState<string | null>(null)
  const [shellHydratedOnce, setShellHydratedOnce] = useState(false)
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0)
  const [justForkedId, setJustForkedId] = useState<{ kind: 'system' | 'technique'; id: string; forkedAt: number } | null>(null)
  const [sessionPhotoFile, setSessionPhotoFile] = useState<File | null>(null)
  const [sessionPhotoPreview, setSessionPhotoPreview] = useState<string | null>(null)
  const [sessionPhotoExistingUrl, setSessionPhotoExistingUrl] = useState<string | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [sessionDurationMode, setSessionDurationMode] = useState<'preset' | 'custom'>('preset')
  const [pendingDeletedSession, setPendingDeletedSession] = useState<BjjSession | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionsView, setSessionsView] = useState<'list' | 'calendar'>('list')
  const [calendarAnchor, setCalendarAnchor] = useState<Date>(() => getMonthAnchor(new Date()))
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null)
  const sessionClientIdRef = useRef<string>('')
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [techniqueMediaFiles, setTechniqueMediaFiles] = useState<File[]>([])
  const [techniqueMediaPreviews, setTechniqueMediaPreviews] = useState<string[]>([])
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [authNameInputUnlocked, setAuthNameInputUnlocked] = useState(false)
  const [authAuxAction, setAuthAuxAction] = useState<'google' | 'apple' | 'reset' | null>(null)
  const [onboardingNameDraft, setOnboardingNameDraft] = useState('')
  const [onboardingNameDirty, setOnboardingNameDirty] = useState(false)
  const [onboardingNameInputUnlocked, setOnboardingNameInputUnlocked] = useState(false)
  const [onboardingNameSentinel, setOnboardingNameSentinel] = useState('')
  const [profileNameDirty, setProfileNameDirty] = useState(false)
  const [profileNameInputUnlocked, setProfileNameInputUnlocked] = useState(false)
  const [profileNameSentinel, setProfileNameSentinel] = useState('')
  const [viewportHeight, setViewportHeight] = useState(0)
  const sessionPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const sessionSearchInputRef = useRef<HTMLInputElement | null>(null)
  const librarySearchInputRef = useRef<HTMLInputElement | null>(null)
  const systemsHubSearchInputRef = useRef<HTMLInputElement | null>(null)
  const techniqueMediaInputRef = useRef<HTMLInputElement | null>(null)
  const discoverVideoInputRef = useRef<HTMLInputElement | null>(null)
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null)
  const cachedStateRef = useRef<BjjPersistedState | null>(null)
  const scrollHandledForkIdRef = useRef<string | null>(null)
  const deferredLibrarySearch = useDeferredValue(librarySearchInput)
  const deferredTechniqueLinkedSearch = useDeferredValue(techniqueLinkedSearchInput)
  const deferredSessionSearch = useDeferredValue(sessionSearchInput)
  const deferredSystemsHubSearch = useDeferredValue(appState?.systemsHubSearch ?? '')
  const hasAppState = appState !== null
  const isCompactHeight = viewportHeight > 0 && viewportHeight <= 860
  const isShortHeight = viewportHeight > 0 && viewportHeight <= 760
  const onboardingTitleClass = isShortHeight ? 'text-[30px]' : isCompactHeight ? 'text-[36px]' : 'text-[42px]'
  const onboardingBodyClass = isShortHeight ? 'text-[16px] leading-6' : isCompactHeight ? 'text-[18px] leading-6' : 'text-[20px] leading-7'
  const onboardingPreviewWidthClass = isShortHeight ? 'w-[236px]' : isCompactHeight ? 'w-[248px]' : 'w-[264px]'
  const welcomeMediaHeightClass = isShortHeight ? 'h-[260px]' : isCompactHeight ? 'h-[304px]' : 'h-[min(52dvh,380px)]'
  const onboardingSectionGapClass = isShortHeight ? 'space-y-4' : isCompactHeight ? 'space-y-5' : 'space-y-6'
  const shellSectionTitleClass = isCompactHeight ? 'text-[28px]' : 'text-[34px]'
  const shellCardTitleClass = isCompactHeight ? 'text-[20px]' : 'text-[22px]'
  const shellCompactCardPaddingClass = isCompactHeight ? 'p-3.5' : 'p-4'
  const shellTopTabsClass = isCompactHeight ? 'mb-2 rounded-[20px] border border-white/8 bg-black/30 p-1' : 'mb-3 rounded-[22px] border border-white/8 bg-black/30 p-1.5'
  const shellTopTabButtonClass = isCompactHeight ? 'px-3 py-2 text-[13px]' : 'px-3.5 py-2.5 text-sm'
  const shellSectionSpacingClass = isCompactHeight ? 'mt-6' : 'mt-8'
  const shellSubsectionSpacingClass = isCompactHeight ? 'mt-3.5' : 'mt-4'
  const shellFeatureTitleClass = isCompactHeight ? 'text-[18px]' : 'text-[20px]'
  const shellMetricTileClass = isCompactHeight ? 'text-[30px]' : 'text-[34px]'
  const techniqueRowTitleClass = isCompactHeight ? 'text-[18px]' : 'text-[21px]'
  const categoryRowTitleClass = isCompactHeight ? 'text-[20px]' : 'text-[24px]'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  }, [])

  useEffect(() => {
    return () => {
      if (pendingDeleteTimerRef.current) {
        clearTimeout(pendingDeleteTimerRef.current)
        pendingDeleteTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(storageKey)
    const flagsRaw = window.localStorage.getItem(profileFlagsStorageKey)
    const uiPrefsRaw = window.localStorage.getItem(uiPrefsStorageKey)

    let parsed: unknown = null
    let hasPersistedState = false
    let persistedFlags = {}
    let persistedUiPrefs = {}

    try {
      parsed = raw ? JSON.parse(raw) : null
      hasPersistedState = raw != null
    } catch {
      parsed = null
      hasPersistedState = false
    }

    try {
      persistedFlags = normalizePersistedShellProfileFlags(flagsRaw ? JSON.parse(flagsRaw) : null)
    } catch {
      persistedFlags = {}
    }

    try {
      persistedUiPrefs = normalizePersistedShellUiPrefs(uiPrefsRaw ? JSON.parse(uiPrefsRaw) : null)
    } catch {
      persistedUiPrefs = {}
    }

    const nextState = normalizeBjjState(
      parsed && typeof parsed === 'object'
        ? { ...(parsed as Record<string, unknown>), ...(persistedUiPrefs as Record<string, unknown>) }
        : persistedUiPrefs,
      identityDisplayName,
      identityUsername,
    )
    nextState.profile = applyServerProfileFlags(
      nextState.profile,
      mergePersistedShellProfileFlags(
        persistedFlags,
        {
          onboardingCompleted: user?.onboardingCompleted,
          paywallCompleted: user?.paywallCompleted,
          coachMarksSeen: user?.coachMarksSeen,
        },
      ),
    )

    // #region agent log (dd-techniques-tour)
    debugTourLog('localStorage hydrate', {
      ok: raw == null || hasPersistedState,
      hasRaw: raw != null,
      hasPersistedFlags: Object.keys(persistedFlags).length > 0,
      hasPersistedUiPrefs: Object.keys(persistedUiPrefs).length > 0,
      coachMarksSeen: nextState.profile.coachMarksSeen,
      selectedBottomTab: nextState.selectedBottomTab,
      selectedTechniquesTab: nextState.selectedTechniquesTab,
    })
    // #endregion agent log (dd-techniques-tour)

    // Only treat previously serialized shell data as migratable cache. A synthetic
    // default state would otherwise be pushed back into Supabase on cold start.
    cachedStateRef.current = hasPersistedState ? nextState : null
    queueMicrotask(() => setAppState(nextState))
  }, [
    debugTourLog,
    identityDisplayName,
    identityUsername,
    profileFlagsStorageKey,
    storageKey,
    uiPrefsStorageKey,
    user?.coachMarksSeen,
    user?.onboardingCompleted,
    user?.paywallCompleted,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return

    const stickyFlags = mergePersistedShellProfileFlags(
      appState ? {
        onboardingCompleted: appState.profile.onboardingCompleted,
        paywallCompleted: appState.profile.paywallCompleted,
        coachMarksSeen: appState.profile.coachMarksSeen,
      } : null,
      {
        onboardingCompleted: user.onboardingCompleted,
        paywallCompleted: user.paywallCompleted,
        coachMarksSeen: user.coachMarksSeen,
      },
    )

    if (Object.keys(stickyFlags).length === 0) {
      window.localStorage.removeItem(profileFlagsStorageKey)
      return
    }

    window.localStorage.setItem(profileFlagsStorageKey, JSON.stringify(stickyFlags))
  }, [
    appState,
    profileFlagsStorageKey,
    user,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !appState) return

    window.localStorage.setItem(uiPrefsStorageKey, JSON.stringify({
      selectedBottomTab: appState.selectedBottomTab,
      selectedSessionsTab: appState.selectedSessionsTab,
      selectedTechniquesTab: appState.selectedTechniquesTab,
      selectedTechniqueBranch: appState.selectedTechniqueBranch,
      selectedSystemBranch: appState.selectedSystemBranch,
    }))
  }, [appState, uiPrefsStorageKey])

  useEffect(() => {
    setOnboardingNameDraft('')
    setOnboardingNameDirty(false)
    setOnboardingNameInputUnlocked(false)
    setOnboardingNameSentinel('')
  }, [storageKey])

  useEffect(() => {
    setAuthNameInputUnlocked(false)
    clearError()
  }, [authMode, clearError, emailSheetOpen])

  useEffect(() => {
    return initDeepLinkHandler(
      (type) => {
        if (type === 'password_reset') {
          if (typeof window !== 'undefined') {
            window.location.assign('/reset-password')
          }
          return
        }

        showSuccess(type === 'email_verified' ? 'Email verified' : 'Signed in')
        setSnapshotRefreshKey((previous) => previous + 1)
      },
      (status) => {
        if (status === 'success') {
          showSuccess('Subscription activated')
          setSnapshotRefreshKey((previous) => previous + 1)
          return
        }

        if (status === 'canceled') {
          showInfo(toastCopy.checkoutCanceled)
          return
        }

        showError(toastCopy.billingReturnFailed)
      },
      (message) => {
        showError(message)
      },
    )
  }, [showError, showInfo, showSuccess])

  useEffect(() => {
    if (!user || !hasAppState) return

    // P1-04: When offline with cached state already in hand, skip the network
    // fetch and let the existing UI render. The global OfflineBanner already
    // surfaces connectivity state, so no inline shellError is needed. A
    // separate effect re-arms the snapshot when `online` fires.
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline && cachedStateRef.current) {
      return
    }

    let active = true

    const hydrateShell = async () => {
      setShellSyncing(true)
      try {
        const snapshot = await bjjService.getShellSnapshot(user, cachedStateRef.current)
        if (!active) return

        setShellHydratedOnce(true)

        // #region agent log (dd-techniques-tour)
        debugTourLog('shell snapshot received', {
          profilePatchCoachMarksSeen: snapshot.profilePatch.coachMarksSeen,
          cachedCoachMarksSeen: cachedStateRef.current?.profile.coachMarksSeen ?? null,
        })
        // #endregion agent log (dd-techniques-tour)

        setDiscoverTechniques(snapshot.discoverTechniques)
        setSystemsState(snapshot.systems)
        setChallengeState(snapshot.challenges)
        setAchievementState(snapshot.achievements)
        setShellError(null)

        setAppState((previous) => {
          if (!previous) return previous
          const merged = normalizeBjjState({
            ...previous,
            profile: {
              ...mergeShellProfilePatch(previous.profile, snapshot.profilePatch),
            },
            customTags: Array.from(
              new Set(
                [
                  ...(snapshot.customTags ?? []),
                  ...loadUserTechniqueLabelPrefs(user?.id ?? 'anonymous').saved,
                  ...(previous.customTags ?? []),
                ]
                  .map((tag) => String(tag).trim())
                  .filter(Boolean),
              ),
            ),
            libraryTechniques: snapshot.libraryTechniques,
            discoverAddedTechniqueIds: snapshot.libraryTechniques
              .map((technique) => technique.catalogTechniqueId)
              .filter((value): value is string => Boolean(value)),
            sessions: snapshot.sessions,
          }, snapshot.profilePatch.displayName ?? identityDisplayName, snapshot.profilePatch.username ?? identityUsername)

          // P1-04: Persist the freshly synced shell so the next cold start can
          // render immediately from cache before the network responds.
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(storageKey, JSON.stringify(merged))
            } catch {
              // Quota exceeded or serialization failure — fall through.
            }
          }
          cachedStateRef.current = merged

          return merged
        })
      } catch (error) {
        if (active) {
          // P1-04: When offline AND we have nothing cached to fall back on,
          // surface a friendly inline message instead of the raw network
          // error. With cached state present the global OfflineBanner is
          // sufficient and we leave the existing UI undisturbed.
          const offline = typeof navigator !== 'undefined' && navigator.onLine === false
          if (offline) {
            if (!cachedStateRef.current) {
              setShellError('You\u2019re offline. Reconnect to sync your MatFlow workspace.')
            }
          } else {
            const message = error instanceof Error ? error.message : 'Unable to sync your MatFlow workspace'
            setShellError(message)
            showError(message)
          }
        }
      } finally {
        if (active) {
          setShellSyncing(false)
        }
      }
    }

    void hydrateShell()

    return () => {
      active = false
    }
  }, [debugTourLog, hasAppState, identityDisplayName, identityUsername, showError, snapshotRefreshKey, storageKey, user])

  // P1-04: When connectivity is restored, re-arm the shell snapshot effect.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => setSnapshotRefreshKey((previous) => previous + 1)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  useEffect(() => {
    if (
      (activeSurface === 'technique-detail' || activeSurface === 'discover-detail')
      && selectedTechniqueId
      && !(appState?.libraryTechniques ?? []).some((technique) => technique.id === selectedTechniqueId)
      && !discoverTechniques.some((technique) => technique.id === selectedTechniqueId)
    ) {
      setActiveSurface(null)
      setSelectedTechniqueId(null)
    }
  }, [activeSurface, appState?.libraryTechniques, discoverTechniques, selectedTechniqueId])

  useEffect(() => {
    if (activeSurface !== 'system-editor') return
    if (!appState) return
    if (appState.selectedBottomTab !== 'systems') {
      setActiveSurface(null)
      setSystemEditorSession(null)
    }
  }, [activeSurface, appState])

  useEffect(() => {
    const currentStep = BJJ_ONBOARDING_STEPS[onboardingIndex]
    if (currentStep !== 'setup') return

    let frame = 27
    const interval = window.setInterval(() => {
      frame += 7
      setSetupProgress(Math.min(100, frame))
      if (frame >= 100) {
        window.clearInterval(interval)
      }
    }, 120)

    return () => window.clearInterval(interval)
  }, [onboardingIndex])

  useEffect(() => {
    const currentStep = BJJ_ONBOARDING_STEPS[onboardingIndex]
    if (!appState || currentStep !== 'name' || onboardingNameDirty) return

    setOnboardingNameSentinel((previous) => (
      previous === appState.profile.displayName ? previous : appState.profile.displayName
    ))
    setOnboardingNameDraft((previous) => (
      previous === appState.profile.displayName ? previous : appState.profile.displayName
    ))
  }, [appState, onboardingIndex, onboardingNameDirty])

  const updateAppState = useCallback((updater: (previous: BjjPersistedState) => BjjPersistedState) => {
    setAppState((previous) => {
      if (!previous) return previous
      const next = updater(previous)
      return normalizeBjjState(next, identityDisplayName, identityUsername)
    })
  }, [identityDisplayName, identityUsername])

  const refreshShellSnapshot = () => {
    setSnapshotRefreshKey((previous) => previous + 1)
  }

  const handlePullToRefresh = useCallback(async () => {
    setSnapshotRefreshKey((previous) => previous + 1)
    await new Promise((resolve) => setTimeout(resolve, 600))
  }, [])

  const navigateToForkedSystem = (branch: MartialArtsBranchId, forkedId: string | null = null) => {
    updateAppState((previous) => ({
      ...previous,
      selectedBottomTab: 'systems',
      selectedTechniquesTab: 'systems',
      systemsHubFilter: 'mine',
      selectedSystemBranch: branch,
    }))
    setActiveSurface((current) => (current === 'discover-detail' ? null : current))
    if (forkedId) setJustForkedId({ kind: 'system', id: forkedId, forkedAt: Date.now() })
  }

  const navigateToForkedTechnique = (branch: MartialArtsBranchId, forkedId: string | null = null) => {
    updateAppState((previous) => ({
      ...previous,
      selectedBottomTab: 'my-library',
      selectedTechniquesTab: 'my-library',
      selectedTechniqueBranch: branch,
    }))
    setActiveSurface((current) => (current === 'discover-detail' ? null : current))
    if (forkedId) setJustForkedId({ kind: 'technique', id: forkedId, forkedAt: Date.now() })
  }

  useEffect(() => {
    if (!justForkedId) {
      scrollHandledForkIdRef.current = null
      return
    }
    const timer = setTimeout(() => setJustForkedId(null), 3500)
    return () => clearTimeout(timer)
  }, [justForkedId])

  const handleJustForkedRef = useCallback((node: HTMLElement | null) => {
    if (!node || !justForkedId) return
    if (scrollHandledForkIdRef.current === justForkedId.id) return
    scrollHandledForkIdRef.current = justForkedId.id
    requestAnimationFrame(() => {
      try {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {
        /* non-browser / jsdom */
      }
    })
  }, [justForkedId])

  const openUserSystemEditorCreate = () => {
    if (!user) return
    setSystemEditorSession({ initial: null, nonce: Date.now() })
    setActiveSurface('system-editor')
  }

  const openUserSystemEditorEdit = (system: BjjSystem) => {
    if (!user || system.userId !== user.id) return
    setSystemEditorSession({ initial: system, nonce: Date.now() })
    setActiveSurface('system-editor')
  }

  const openSystemReader = useCallback((system: BjjSystem) => {
    setSystemReaderSession(system)
    setActiveSurface('system-reader')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !appState) return
    if (!shellHydratedOnce) return

    let cancelled = false

    const cleanUrl = (keepSearch = true) => {
      const search = keepSearch ? window.location.search : ''
      window.history.replaceState(null, '', `${window.location.pathname}${search}`)
    }

    const runSystemHash = async () => {
      const raw = window.location.hash.replace(/^#/, '')
      if (!raw.startsWith('system=')) return
      const id = raw.slice('system='.length).split('&')[0]?.trim()
      if (!id) return

      const fromList = systemsState.find((s) => s.id === id)
      if (fromList) {
        if (cancelled) return
        openSystemReader(fromList)
        cleanUrl()
        return
      }

      try {
        const fetched = await bjjService.getSystemByIdForViewer(user.id, id, appState.profile.proUnlocked)
        if (cancelled) return
        if (fetched) {
          openSystemReader(fetched)
          cleanUrl()
          return
        }
      } catch {
        if (cancelled) return
      }

      showInfo(toastCopy.systemUnavailableDeepLink)
      cleanUrl()
    }

    void runSystemHash()
    const onHashChange = () => void runSystemHash()
    window.addEventListener('hashchange', onHashChange)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [user, appState, shellHydratedOnce, systemsState, showInfo, openSystemReader])

  const handleSaveUserSystem = async (input: SaveUserSystemInput) => {
    if (!user) return
    try {
      await bjjService.saveUserSystem(user.id, { ...input, status: 'active', visibility: 'public' })
      showSuccess('System saved')
      setSystemEditorSession(null)
      setActiveSurface(null)
      refreshShellSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save system'
      showError(message)
    }
  }

  const handleDeleteUserSystem = async (systemId: string) => {
    if (!user) return
    const readerOpen = systemReaderSession?.id === systemId
    try {
      await bjjService.deleteUserSystem(user.id, systemId)
      showSuccess('System deleted')
      setSystemEditorSession(null)
      if (readerOpen) {
        setSystemReaderSession(null)
      }
      setActiveSurface(null)
      refreshShellSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete system'
      showError(message)
    }
  }

  const completeCoachMarksTour = async () => {
    setCoachStep(null)
    updateAppState((previous) => ({
      ...previous,
      profile: { ...previous.profile, coachMarksSeen: true },
    }))
    try {
      await updateProfile({ coachMarksSeen: true })
      refreshShellSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save tutorial progress'
      showError(message)
      updateAppState((previous) => ({
        ...previous,
        profile: { ...previous.profile, coachMarksSeen: false },
      }))
    }
  }

  const libraryTechniques = useMemo(() => appState?.libraryTechniques ?? [], [appState?.libraryTechniques])
  const selectedTechniqueBranch = appState?.selectedTechniqueBranch ?? branchFromPrimaryDiscipline(appState?.profile.primaryDiscipline)
  const selectedSystemBranch = appState?.selectedSystemBranch ?? selectedTechniqueBranch
  const hasSeenCoachMarks = (user?.coachMarksSeen ?? false) || (appState?.profile.coachMarksSeen ?? false)
  const filteredLibraryTechniques = useMemo(() => {
    const query = deferredLibrarySearch.trim().toLowerCase()
    const source = libraryTechniques.filter((technique) => technique.branch === selectedTechniqueBranch)
    const filtered = source.filter((technique) => {
      const matchesQuery =
        !query ||
        technique.title.toLowerCase().includes(query) ||
        technique.tags.some((tag) => tag.toLowerCase().includes(query))
      const matchesCategory =
        !appState ||
        appState.activeCategoryFilter === 'all' ||
        technique.category === appState.activeCategoryFilter
      return matchesQuery && matchesCategory
    })

    if (!appState || appState.librarySort === 'new') {
      return filtered.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    }

    return filtered.sort((left, right) => left.title.localeCompare(right.title))
  }, [appState, deferredLibrarySearch, libraryTechniques, selectedTechniqueBranch])

  const filteredSessions = useMemo(() => {
    const query = deferredSessionSearch.trim().toLowerCase()
    const hiddenId = pendingDeletedSession?.id
    return (appState?.sessions ?? [])
      .filter((session) => {
        if (hiddenId && session.id === hiddenId) return false
        if (!query) return true
        return (
          session.location.toLowerCase().includes(query) ||
          session.type.toLowerCase().includes(query) ||
          session.notes.toLowerCase().includes(query) ||
          session.submissions.join(' ').toLowerCase().includes(query)
        )
      })
      .sort((left, right) => Date.parse(`${right.date}T${right.time}`) - Date.parse(`${left.date}T${left.time}`))
  }, [appState?.sessions, deferredSessionSearch, pendingDeletedSession?.id])

  const groupedSessions = useMemo(() => {
    const now = new Date()
    const buckets = new Map<SessionBucketKey, BjjSession[]>()
    for (const session of filteredSessions) {
      const key = bucketForSessionDate(session.date, now)
      const list = buckets.get(key)
      if (list) list.push(session)
      else buckets.set(key, [session])
    }
    return SESSION_BUCKET_ORDER
      .map((key) => ({ key, label: SESSION_BUCKET_LABELS[key], sessions: buckets.get(key) ?? [] }))
      .filter((group) => group.sessions.length > 0)
  }, [filteredSessions])

  const sessionStats = useMemo(() => {
    const all = appState?.sessions ?? []
    const now = new Date()
    const weekStart = computeWeekStart(now)
    let weekCount = 0
    let weekMinutes = 0
    for (const session of all) {
      const parsed = new Date(session.date)
      if (Number.isNaN(parsed.getTime())) continue
      if (startOfDay(parsed).getTime() >= weekStart) {
        weekCount += 1
        weekMinutes += session.durationMinutes
      }
    }
    const streak = computeTrainingStreakDays(all, now)
    return { weekCount, weekMinutes, streak }
  }, [appState?.sessions])

  const selectedSession = useMemo(
    () => (selectedSessionId ? (appState?.sessions ?? []).find((entry) => entry.id === selectedSessionId) ?? null : null),
    [selectedSessionId, appState?.sessions],
  )

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, BjjSession[]>()
    const hiddenId = pendingDeletedSession?.id
    for (const session of appState?.sessions ?? []) {
      if (hiddenId && session.id === hiddenId) continue
      if (!session.date) continue
      const key = session.date.slice(0, 10)
      const list = map.get(key)
      if (list) list.push(session)
      else map.set(key, [session])
    }
    for (const list of map.values()) {
      list.sort((left, right) => Date.parse(`${right.date}T${right.time}`) - Date.parse(`${left.date}T${left.time}`))
    }
    return map
  }, [appState?.sessions, pendingDeletedSession?.id])

  const streakDayKeys = useMemo(
    () => computeStreakDayKeys(appState?.sessions ?? []),
    [appState?.sessions],
  )

  const calendarMatrix = useMemo(() => getMonthMatrix(calendarAnchor), [calendarAnchor])

  const calendarMonthStats = useMemo(() => {
    let count = 0
    let minutes = 0
    const year = calendarAnchor.getFullYear()
    const month = calendarAnchor.getMonth()
    for (const session of appState?.sessions ?? []) {
      const parsed = new Date(session.date)
      if (Number.isNaN(parsed.getTime())) continue
      if (parsed.getFullYear() === year && parsed.getMonth() === month) {
        count += 1
        minutes += session.durationMinutes
      }
    }
    return { count, minutes }
  }, [appState?.sessions, calendarAnchor])

  const selectedDaySessions = useMemo(
    () => (selectedCalendarDay ? sessionsByDay.get(selectedCalendarDay) ?? [] : []),
    [selectedCalendarDay, sessionsByDay],
  )

  const isViewingCurrentMonth = useMemo(() => {
    const now = new Date()
    return calendarAnchor.getFullYear() === now.getFullYear() && calendarAnchor.getMonth() === now.getMonth()
  }, [calendarAnchor])

  const todayDayKey = useMemo(() => formatDayKey(new Date()), [])

  const systemsFilteredSorted = useMemo(() => {
    const query = deferredSystemsHubSearch.trim().toLowerCase()
    let list = systemsState.filter((system) => system.status !== 'draft' && system.branch === selectedSystemBranch)
    if (query) {
      list = list.filter(
        (system) =>
          system.title.toLowerCase().includes(query) || system.summary.toLowerCase().includes(query),
      )
    }
    const rank = (system: BjjSystem) => {
      if (user?.id && system.userId === user.id) return 0
      if (!system.userId) return 1
      return 2
    }
    list.sort((left, right) => {
      const rankDelta = rank(left) - rank(right)
      if (rankDelta !== 0) return rankDelta
      const orderDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
      if (orderDelta !== 0) return orderDelta
      return left.title.localeCompare(right.title)
    })
    return list
  }, [deferredSystemsHubSearch, selectedSystemBranch, systemsState, user?.id])

  const discoverByCategory = useMemo(() => {
    const query = deferredLibrarySearch.trim().toLowerCase()
    return discoverTechniques.filter((technique) => technique.branch === selectedTechniqueBranch).reduce<Record<BjjTechniqueCategory, BjjTechnique[]>>((groups, technique) => {
      if (query) {
        const matchesQuery = technique.title.toLowerCase().includes(query)
          || technique.tags.some((tag) => tag.toLowerCase().includes(query))
        if (!matchesQuery) return groups
      }
      groups[technique.category].push(technique)
      return groups
    }, {
      submission: [],
      sweep: [],
      escape: [],
      'guard-pass': [],
      takedown: [],
      transition: [],
      strike: [],
      defense: [],
      footwork: [],
      clinch: [],
      kick: [],
      counter: [],
    })
  }, [deferredLibrarySearch, discoverTechniques, selectedTechniqueBranch])
  const analyticsLabel = analyticsWindow === 'this-month' ? 'This Month' : 'All Time'

  const analyticsSessions = useMemo(() => {
    if (!appState) return []
    if (analyticsWindow === 'all-time') return appState.sessions

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return appState.sessions.filter((session) => {
      const date = new Date(`${session.date}T12:00:00`)
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth
    })
  }, [analyticsWindow, appState])

  const analyticsTechniqueCount = useMemo(() => {
    if (analyticsWindow === 'all-time') return libraryTechniques.length

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return libraryTechniques.filter((technique) => {
      const date = new Date(technique.updatedAt)
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth
    }).length
  }, [analyticsWindow, libraryTechniques])

  const totalSubmissions = useMemo(
    () => analyticsSessions.reduce((sum, session) => sum + session.submissions.length, 0),
    [analyticsSessions],
  )
  const totalTaps = useMemo(
    () => analyticsSessions.reduce((sum, session) => sum + session.taps.length, 0),
    [analyticsSessions],
  )
  const favoriteSubmissions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const session of analyticsSessions) {
      for (const submission of session.submissions) {
        counts.set(submission, (counts.get(submission) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
  }, [analyticsSessions])

  const checklistItems = useMemo(
    () => createChecklistItems(appState?.sessions.length ?? 0, libraryTechniques.length, (appState?.sessions ?? []).some((session) => session.visibility === 'everyone')),
    [appState?.sessions, libraryTechniques.length],
  )

  const challenges = challengeState
  const achievements = achievementState

  const selectedTechnique = useMemo(() => {
    if (!selectedTechniqueId) return null
    return [...libraryTechniques, ...discoverTechniques].find((technique) => technique.id === selectedTechniqueId) ?? null
  }, [discoverTechniques, libraryTechniques, selectedTechniqueId])

  const beginEditProfile = () => {
    if (!appState) return
    setProfileDraft({
      displayName: appState.profile.displayName,
      username: appState.profile.username,
      belt: appState.profile.belt,
      stripes: appState.profile.stripes,
      gymName: appState.profile.gymName,
      bio: appState.profile.bio,
      privacy: appState.profile.privacy,
    })
    setProfileNameDirty(false)
    setProfileNameInputUnlocked(false)
    setProfileNameSentinel(appState.profile.displayName)
    setProfilePhotoFile(null)
    setProfilePhotoPreview(appState.profile.avatarUrl ?? user?.avatarUrl ?? null)
    setActiveSurface('edit-profile')
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()

    try {
      if (authMode === 'sign-in') {
        await signIn(authForm.email.trim(), authForm.password)
        showSuccess('Signed in')
      } else {
        if (authForm.password !== authForm.confirmPassword) {
          showError('Passwords do not match')
          return
        }
        const username = slugifyUsername(authForm.username)
        if (username.length < USERNAME_MIN_LEN) {
          showError(`Username must be at least ${USERNAME_MIN_LEN} characters (letters, numbers, underscores).`)
          return
        }
        if (username.length > USERNAME_MAX_LEN) {
          showError(`Username must be at most ${USERNAME_MAX_LEN} characters.`)
          return
        }
        const available = await supabaseService.checkUsernameAvailable(username)
        if (!available) {
          showError('That username is already taken. Try another.')
          return
        }
        await signUp(authForm.email.trim(), authForm.password, username, authForm.name.trim() || 'Grappler', 'bjj')
        showSuccess('Account created')
      }

      setEmailSheetOpen(false)
      setAuthForm({ name: '', username: '', email: '', password: '', confirmPassword: '' })
      setOnboardingIndex(0)
    } catch {
      // AuthProvider already maps and stores auth errors for inline rendering.
    }
  }

  const handleAddDiscoverTechnique = async (technique: BjjTechnique) => {
    if (!user) {
      showError('Sign in required')
      return
    }

    if (appState && !appState.profile.proUnlocked && appState.libraryTechniques.length >= 20) {
      showInfo(toastCopy.freePlanTechniqueLimit)
      setPaywallIndex(0)
      setActiveSurface('paywall')
      return
    }

    try {
      const saved = await bjjService.addCatalogTechniqueToLibrary(user.id, technique.id)
      void haptics.success()
      const forkedBranch = normalizeMartialArtsBranchId(technique.branch) ?? 'bjj'
      navigateToForkedTechnique(forkedBranch, saved.id)
      refreshShellSnapshot()
      showSuccess(`${technique.title} added to My Library`)
    } catch (error) {
      void haptics.error()
      showError(error instanceof Error ? error.message : 'Unable to save technique')
    }
  }

  const handleSaveTechnique = async () => {
    if (!techniqueDraft.title.trim()) {
      showError(toastCopy.techniqueNameRequired)
      return
    }

    if (!user) {
      showError('Sign in required')
      return
    }

    if (appState && !appState.profile.proUnlocked && appState.libraryTechniques.length >= 20) {
      showInfo(toastCopy.freePlanTechniqueLimit)
      setPaywallIndex(0)
      setActiveSurface('paywall')
      return
    }

    try {
      const mediaUrls = techniqueMediaFiles.length
        ? await Promise.all(techniqueMediaFiles.slice(0, 3).map((file) => bjjService.uploadTechniqueMedia(user.id, file)))
        : []

      await bjjService.saveTechnique(user.id, {
        branch: selectedTechniqueBranch,
        title: techniqueDraft.title.trim(),
        category: techniqueDraft.category,
        tags: techniqueDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        notes: techniqueDraft.notes.trim(),
        description: techniqueDraft.description.trim() || 'Personal study note',
        tutorialTitle: techniqueDraft.tutorialTitle.trim() || techniqueDraft.title.trim(),
        media: mediaUrls,
        links: parseLinkLines(techniqueDraft.links).slice(0, 10),
        linkedTechniqueIds: techniqueDraft.linkedTechniqueIds.slice(0, 15),
      })

      setTechniqueDraft(createTechniqueDraft())
      setTechniqueMediaFiles([])
      setTechniqueMediaPreviews([])
      setTechniqueCategoryOverlayOpen(false)
      setActiveSurface(null)
      refreshShellSnapshot()
      showSuccess('Technique added')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to add technique')
    }
  }

  const openTechniqueMedia = async (technique: BjjTechnique) => {
    const url = technique.links[0] ?? technique.media[0]
    const trimmed = url?.trim()
    if (!trimmed) {
      showInfo('No video linked for this technique yet.')
      return
    }
    try {
      await openSupportLink(trimmed)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not open video')
    }
  }

  const handleSaveDiscoverTechnique = async () => {
    if (!user) {
      showError('Sign in required')
      return
    }
    if (!discoverDraft.title.trim()) {
      showError(toastCopy.techniqueNameRequired)
      return
    }
    const discoverTags = parseTagList(discoverDraft.tags)
    if (!discoverTags.length) {
      showError(toastCopy.labelsRequired)
      return
    }
    if (!discoverDraft.description.trim()) {
      showError(toastCopy.descriptionRequired)
      return
    }
    if (!discoverDraft.tutorialTitle.trim()) {
      showError(toastCopy.tutorialTitleRequired)
      return
    }
    const links = discoverDraft.videoUrl.trim() ? [discoverDraft.videoUrl.trim()] : []
    let mediaUrls: string[] = []
    if (discoverVideoFile) {
      try {
        mediaUrls = [await bjjService.uploadTechniqueMedia(user.id, discoverVideoFile)]
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Upload failed')
        return
      }
    } else if (editingDiscoverTechniqueId) {
      mediaUrls = [...discoverKeepMediaUrls]
    }
    if (!links.length && !mediaUrls.length) {
      showError(toastCopy.mediaRequiredDiscover)
      return
    }
    const payload = {
      branch: selectedTechniqueBranch,
      title: discoverDraft.title.trim(),
      category: discoverDraft.category,
      tags: discoverTags,
      description: discoverDraft.description.trim(),
      tutorialTitle: discoverDraft.tutorialTitle.trim(),
      media: mediaUrls,
      links,
    }
    try {
      if (editingDiscoverTechniqueId) {
        await bjjService.updateDiscoverTechnique(user.id, editingDiscoverTechniqueId, payload)
        showSuccess('Discover technique updated')
      } else {
        await bjjService.createDiscoverTechnique(user.id, payload)
        showSuccess('Technique published to Discover')
      }
      setDiscoverDraft(createDiscoverTechniqueDraft())
      setDiscoverVideoFile(null)
      setDiscoverKeepMediaUrls([])
      setEditingDiscoverTechniqueId(null)
      setTechniqueCategoryOverlayOpen(false)
      setActiveSurface(null)
      refreshShellSnapshot()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not save Discover technique')
    }
  }

  const beginEditDiscoverTechnique = (technique: BjjTechnique) => {
    setDiscoverDraft({
      title: technique.title,
      category: technique.category,
      tags: technique.tags.join(', '),
      description: technique.description,
      tutorialTitle: technique.tutorialTitle,
      videoUrl: technique.links[0] ?? '',
    })
    setDiscoverKeepMediaUrls([...technique.media])
    setDiscoverVideoFile(null)
    setEditingDiscoverTechniqueId(technique.id)
    setTechniqueCategoryOverlayOpen(false)
    setActiveSurface('new-discover-technique')
  }

  const {
    applyAppleEntitlement,
    handleSubscribe,
    handleRestorePurchase,
    handleManageSubscription,
    completePaywall,
    handleDeleteAccount,
  } = useBillingCoordinator({
    userId: user?.id,
    isAuthenticated,
    appState,
    updateAppState,
    updateProfile,
    refreshShellSnapshot,
    signOut,
    setIsDeletingAccount,
    showSuccess,
    showError,
    showInfo,
  })

  const handleDeleteDiscoverTechnique = async (technique: BjjTechnique) => {
    if (!user) {
      showError('Sign in required')
      return
    }
    if (typeof window !== 'undefined' && !window.confirm('Delete this technique from Discover? This cannot be undone.')) {
      return
    }
    try {
      await bjjService.deleteDiscoverTechnique(user.id, technique.id)
      setActiveSurface(null)
      setSelectedTechniqueId(null)
      refreshShellSnapshot()
      showSuccess('Technique removed from Discover')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not delete technique')
    }
  }

  const handleRemoveDiscoverFromLibrary = async (technique: BjjTechnique) => {
    if (!user) {
      showError('Sign in required')
      return
    }
    const lib = (appState?.libraryTechniques ?? []).find((entry) => entry.catalogTechniqueId === technique.id)
    if (!lib) {
      showError('This technique is not in your library')
      return
    }
    try {
      await bjjService.deleteLibraryTechnique(user.id, lib.id)
      refreshShellSnapshot()
      showSuccess('Removed from your library')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not remove technique')
    }
  }

  const handleRemoveLibraryTechniqueFromDetail = async () => {
    if (!user || !selectedTechnique || activeSurface !== 'technique-detail') {
      return
    }
    if (typeof window !== 'undefined' && !window.confirm('Remove this technique from your library?')) {
      return
    }
    try {
      await bjjService.deleteLibraryTechnique(user.id, selectedTechnique.id)
      setActiveSurface(null)
      setSelectedTechniqueId(null)
      refreshShellSnapshot()
      showSuccess('Removed from your library')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not remove technique')
    }
  }

  const parseTagList = (value: string) =>
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

  const serializeTagList = (tags: string[]) => tags.join(', ')

  const parseLinkLines = (value: string) =>
    value
      .split('\n')
      .map((link) => link.trim())
      .filter(Boolean)

  const techniqueDraftHasFavoriteTag = () =>
    parseTagList(techniqueDraft.tags).some((tag) => tag.toLowerCase() === 'favorite')

  const toggleTechniqueFavoriteTag = () => {
    setTechniqueDraft((previous) => {
      const tags = parseTagList(previous.tags)
      const hasFavorite = tags.some((tag) => tag.toLowerCase() === 'favorite')
      const next = hasFavorite
        ? tags.filter((tag) => tag.toLowerCase() !== 'favorite')
        : [...tags, 'Favorite']
      return { ...previous, tags: serializeTagList(next) }
    })
  }

  const handleSaveSession = async () => {
    if (savingSession) return
    if (!sessionDraft.location.trim()) {
      void haptics.warning()
      showError(toastCopy.locationRequired)
      return
    }

    if (!user) {
      showError('Sign in required')
      return
    }

    setSavingSession(true)
    try {
      const uploadedPhotoUrl = sessionPhotoFile
        ? await bjjService.uploadSessionPhoto(user.id, sessionPhotoFile)
        : undefined

      const submissions = sessionDraft.submissions.split(',').map((entry) => entry.trim()).filter(Boolean)
      const taps = sessionDraft.taps.split(',').map((entry) => entry.trim()).filter(Boolean)
      const taggedFriends = sessionDraft.taggedFriends.split(',').map((entry) => entry.trim()).filter(Boolean)

      if (editingSessionId) {
        const nextPhotoUrl = uploadedPhotoUrl !== undefined
          ? uploadedPhotoUrl
          : sessionPhotoExistingUrl
        await bjjService.updateSession(user.id, editingSessionId, {
          branch: sessionDraft.branch,
          date: sessionDraft.date,
          time: sessionDraft.time,
          location: sessionDraft.location.trim(),
          type: sessionDraft.type,
          submissions,
          taps,
          durationMinutes: sessionDraft.durationMinutes,
          notes: sessionDraft.notes.trim(),
          satisfaction: sessionDraft.satisfaction,
          taggedFriends,
          visibility: sessionDraft.visibility,
          caption: sessionDraft.caption.trim(),
          linkedTechniqueIds: sessionDraft.linkedTechniqueIds,
          photoUrl: nextPhotoUrl ?? null,
        })
      } else {
        if (!sessionClientIdRef.current) {
          sessionClientIdRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? `session-${crypto.randomUUID()}`
            : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        }
        await bjjService.saveSession(user.id, {
          clientId: sessionClientIdRef.current,
          branch: sessionDraft.branch,
          date: sessionDraft.date,
          time: sessionDraft.time,
          location: sessionDraft.location.trim(),
          type: sessionDraft.type,
          submissions,
          taps,
          durationMinutes: sessionDraft.durationMinutes,
          notes: sessionDraft.notes.trim(),
          satisfaction: sessionDraft.satisfaction,
          taggedFriends,
          visibility: sessionDraft.visibility,
          caption: sessionDraft.caption.trim(),
          linkedTechniqueIds: sessionDraft.linkedTechniqueIds,
          photoUrl: uploadedPhotoUrl,
        })
      }

      void haptics.success()
      const defaultBranch = branchFromPrimaryDiscipline(appState?.profile.primaryDiscipline)
      setSessionDraft(createSessionDraft(defaultBranch))
      setSessionPhotoFile(null)
      setSessionPhotoPreview(null)
      setSessionPhotoExistingUrl(null)
      setSessionDurationMode('preset')
      const wasEditing = Boolean(editingSessionId)
      setEditingSessionId(null)
      sessionClientIdRef.current = ''
      setActiveSurface(null)
      refreshShellSnapshot()
      showSuccess(wasEditing ? 'Session updated' : 'Session saved')
    } catch (error) {
      void haptics.error()
      showError(error instanceof Error ? error.message : 'Unable to save session')
    } finally {
      setSavingSession(false)
    }
  }

  const openCreateSession = (dateOverride?: string) => {
    const defaultBranch = branchFromPrimaryDiscipline(appState?.profile.primaryDiscipline)
    const draft = createSessionDraft(defaultBranch)
    setSessionDraft(dateOverride ? { ...draft, date: dateOverride } : draft)
    setSessionPhotoFile(null)
    setSessionPhotoPreview(null)
    setSessionPhotoExistingUrl(null)
    setSessionDurationMode(DURATION_PRESETS.includes(90) ? 'preset' : 'custom')
    setEditingSessionId(null)
    sessionClientIdRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `session-${crypto.randomUUID()}`
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    setActiveSurface('new-session')
  }

  const handlePrevMonth = () => {
    void haptics.light()
    setCalendarAnchor((anchor) => addMonths(anchor, -1))
    setSelectedCalendarDay(null)
  }

  const handleNextMonth = () => {
    void haptics.light()
    setCalendarAnchor((anchor) => addMonths(anchor, 1))
    setSelectedCalendarDay(null)
  }

  const handleGoToTodayMonth = () => {
    void haptics.light()
    setCalendarAnchor(getMonthAnchor(new Date()))
    setSelectedCalendarDay(formatDayKey(new Date()))
  }

  const handleSelectCalendarDay = (dayKey: string) => {
    void haptics.light()
    setSelectedCalendarDay((current) => (current === dayKey ? null : dayKey))
  }

  const openEditSession = (session: BjjSession) => {
    setSessionDraft(sessionToDraft(session))
    setSessionPhotoFile(null)
    setSessionPhotoPreview(session.photo ?? null)
    setSessionPhotoExistingUrl(session.photo ?? null)
    setSessionDurationMode(DURATION_PRESETS.includes(session.durationMinutes) ? 'preset' : 'custom')
    setEditingSessionId(session.id)
    sessionClientIdRef.current = ''
    setActiveSurface('new-session')
  }

  const openSessionDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveSurface('session-detail')
  }

  const handleDuplicateSession = (session: BjjSession) => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const time = now.toTimeString().slice(0, 5)
    const base = sessionToDraft(session)
    setSessionDraft({
      ...base,
      date: today,
      time,
      submissions: '',
      taps: '',
      caption: '',
    })
    setSessionPhotoFile(null)
    setSessionPhotoPreview(null)
    setSessionPhotoExistingUrl(null)
    setSessionDurationMode(DURATION_PRESETS.includes(base.durationMinutes) ? 'preset' : 'custom')
    setEditingSessionId(null)
    sessionClientIdRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `session-${crypto.randomUUID()}`
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    setActiveSurface('new-session')
  }

  const handleRequestDeleteSession = (session: BjjSession) => {
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current)
      pendingDeleteTimerRef.current = null
    }
    void haptics.warning()
    setPendingDeletedSession(session)
    pendingDeleteTimerRef.current = setTimeout(() => {
      pendingDeleteTimerRef.current = null
      void (async () => {
        try {
          if (!user) return
          await bjjService.deleteSession(user.id, session.id)
          refreshShellSnapshot()
        } catch (error) {
          showError(error instanceof Error ? error.message : 'Unable to delete session')
        } finally {
          setPendingDeletedSession((current) => (current?.id === session.id ? null : current))
        }
      })()
    }, 5000)
  }

  const handleUndoDeleteSession = () => {
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current)
      pendingDeleteTimerRef.current = null
    }
    void haptics.light()
    setPendingDeletedSession(null)
  }

  const handleSaveProfile = async () => {
    if (!appState || !profileDraft || !user) return

    try {
      const username = slugifyUsername(profileDraft.username)
      if (username.length < USERNAME_MIN_LEN) {
        showError(`Username must be at least ${USERNAME_MIN_LEN} characters (letters, numbers, underscores).`)
        return
      }
      if (username.length > USERNAME_MAX_LEN) {
        showError(`Username must be at most ${USERNAME_MAX_LEN} characters.`)
        return
      }

      let avatarUrl = appState.profile.avatarUrl
      if (profilePhotoFile) {
        avatarUrl = await bjjService.uploadProfilePhoto(user.id, profilePhotoFile)
      }

      await updateProfile({
        displayName: profileDraft.displayName,
        username,
        avatarUrl,
        bio: profileDraft.bio,
        belt: profileDraft.belt,
        stripes: profileDraft.stripes,
        gymName: profileDraft.gymName,
        privacy: profileDraft.privacy,
      })

      setProfilePhotoFile(null)
      setProfilePhotoPreview(null)
      setActiveSurface(null)
      refreshShellSnapshot()
      showSuccess('Profile updated')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Profile sync failed')
    }
  }

  const [isExportingData, setIsExportingData] = useState(false)
  const [analyticsConsent, setAnalyticsConsentState] = useState<boolean>(true)
  useEffect(() => {
    setAnalyticsConsentState(getAnalyticsConsent())
  }, [])
  const handleToggleAnalyticsConsent = () => {
    setAnalyticsConsentState((previous) => {
      const next = !previous
      setAnalyticsConsent(next)
      return next
    })
  }
  const handleExportData = async () => {
    if (!user?.id) {
      showError('Sign in to export your data')
      return
    }
    setIsExportingData(true)
    try {
      const { data, error } = await supabase.functions.invoke<Record<string, unknown>>('export-account-data', {
        body: { confirm: 'EXPORT' },
      })
      if (error) throw error
      if (!data || typeof data !== 'object') {
        throw new Error('Empty export response')
      }
      const archiveJson = JSON.stringify(data, null, 2)
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([archiveJson], { type: 'application/json' })
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = `matflow-export-${user.id}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(objectUrl)
      }
      showSuccess('Your data export was downloaded')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to start data export')
    } finally {
      setIsExportingData(false)
    }
  }

  if (authInitializing || !appState) {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-[#04060a] text-white">
        <ScreenBackdrop variant="auth" />
        <div className="relative mx-auto flex h-full w-full max-w-[430px] items-center justify-center px-6">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-[28px] border border-[#4d7cff]/35 bg-white/10 shadow-[0_16px_38px_rgba(37,99,235,0.22)]">
              <Image src="/app-icon.png" alt="MatFlow" fill className="object-cover" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7ea4ff]">MatFlow</p>
              <h1 className="mt-3 text-3xl font-bold">Loading your MatFlow workspace...</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        authLoading={authLoading}
        authError={authError}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        emailSheetOpen={emailSheetOpen}
        setEmailSheetOpen={setEmailSheetOpen}
        authAuxAction={authAuxAction}
        setAuthAuxAction={setAuthAuxAction}
        authNameInputUnlocked={authNameInputUnlocked}
        setAuthNameInputUnlocked={setAuthNameInputUnlocked}
        isCompactHeight={isCompactHeight}
        isShortHeight={isShortHeight}
        signInWithOAuth={signInWithOAuth}
        requestPasswordReset={requestPasswordReset}
        handleAuthSubmit={handleAuthSubmit}
        showError={showError}
        showInfo={showInfo}
        showSuccess={showSuccess}
      />
    )
  }
  if (!appState.profile.onboardingCompleted) {
    return (
      <OnboardingScreen
        appState={appState}
        updateAppState={updateAppState}
        updateProfile={updateProfile}
        refreshShellSnapshot={refreshShellSnapshot}
        onboardingIndex={onboardingIndex}
        setOnboardingIndex={setOnboardingIndex}
        onboardingNameDraft={onboardingNameDraft}
        setOnboardingNameDraft={setOnboardingNameDraft}
        onboardingNameDirty={onboardingNameDirty}
        setOnboardingNameDirty={setOnboardingNameDirty}
        onboardingNameSentinel={onboardingNameSentinel}
        onboardingNameInputUnlocked={onboardingNameInputUnlocked}
        setOnboardingNameInputUnlocked={setOnboardingNameInputUnlocked}
        setupProgress={setupProgress}
        setSetupProgress={setSetupProgress}
        setPaywallIndex={setPaywallIndex}
        isCompactHeight={isCompactHeight}
        isShortHeight={isShortHeight}
        showError={showError}
      />
    )
  }
  const matflowAccess = getMatFlowAccessState({
    createdAt: user?.createdAt,
    firstActiveAt: user?.firstActiveAt,
    matflowTrialStartedAt: user?.matflowTrialStartedAt ?? appState.profile.matflowTrialStartedAt ?? null,
    isPremium: user?.isPremium,
    subscriptionStatus: user?.subscriptionStatus ?? appState.profile.subscriptionStatus ?? null,
    subscriptionPeriodEnd: user?.subscriptionPeriodEnd ?? appState.profile.subscriptionPeriodEnd ?? null,
  })
  const forcedPaywallStep = BJJ_PAYWALL_STEPS[paywallIndex] as BjjPaywallStep
  const showingForcedPaywall = !appState.profile.paywallCompleted || matflowAccess.trialExpired
  if (showingForcedPaywall) {
    return (
      <PaywallScreen
        forcedPaywallStep={forcedPaywallStep}
        paywallIndex={paywallIndex}
        setPaywallIndex={setPaywallIndex}
        paywallPlan={paywallPlan}
        matflowAccess={matflowAccess}
        isCompactHeight={isCompactHeight}
        isShortHeight={isShortHeight}
        handleSubscribe={handleSubscribe}
        handleRestorePurchase={handleRestorePurchase}
        completePaywall={completePaywall}
      />
    )
  }
  const selectedBottomTab = appState.selectedBottomTab
  const selectedTechniquesTab = appState.selectedTechniquesTab
  const activeGameplan = (() => {
    const owned = user?.id
      ? systemsState.filter((system) => system.userId === user.id && system.status !== 'draft')
      : []
    const pins = new Set(appState.pinnedSystemIds ?? [])
    return owned.find((system) => pins.has(system.id)) ?? owned[0] ?? systemsFilteredSorted[0] ?? null
  })()
  const mainBackdropVariant: ScreenBackdropVariant = activeSurface === 'sessions'
    ? 'sessions'
    : activeSurface === 'profile'
        ? 'profile'
        : 'techniques'

  const openTechniqueDetail = (techniqueId: string, surface: Extract<BjjSurface, 'technique-detail' | 'discover-detail'>) => {
    setSelectedTechniqueId(techniqueId)
    setActiveSurface(surface)
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#04060a] text-white">
      <ScreenBackdrop variant={mainBackdropVariant} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+100px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        {tipModal && <TipModal content={tipModal} onClose={() => setTipModal(null)} />}
        <header className="flex items-center justify-between px-1 pb-3">
          <button
            type="button"
            onClick={() => {
              void haptics.light()
              setActiveSurface('profile')
            }}
            aria-label="Open profile"
            className="flex items-center gap-3 rounded-full transition active:scale-[0.97]"
          >
            {appState.profile.avatarUrl ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                <Image src={appState.profile.avatarUrl} alt={appState.profile.displayName} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
                <UserRound className="h-5 w-5 text-white/70" />
              </div>
            )}
            <div className="text-left">
              <p className={cn(isCompactHeight ? 'text-[16px]' : 'text-[18px]', 'font-bold')}>
                {appState.profile.displayName}
              </p>
              {shellSyncing ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Syncing</p>
              ) : null}
            </div>
          </button>

          <div className="flex items-center gap-2">
            <CircleIconButton
              aria-label="Open sessions"
              onClick={() => {
                void haptics.light()
                setActiveSurface('sessions')
              }}
            >
              <Zap className="h-5 w-5" />
            </CircleIconButton>
            <CircleIconButton
              aria-label="About this screen"
              onClick={() => setTipModal({
                title: 'Library',
                body: 'Keep techniques, systems, and discovery in one focused workspace.',
                bullets: [
                  'Use My Library for saved techniques.',
                  'Use Systems to create and study connected paths.',
                  'Use Discover to browse public techniques and systems.',
                ],
              })}
            >
              <Info className="h-5 w-5" />
            </CircleIconButton>
            <CircleIconButton
              aria-label="Search"
              onClick={() => {
                if (!searchTutorialSaving && user && !user.searchTutorialSeen) {
                  setTipModal({
                    title: 'Smart search',
                    body: 'Search always filters the screen you’re on — no extra steps.',
                    bullets: [
                      'My Library: search technique names, tags, and systems.',
                      'Systems: search titles and summaries inside the Systems tab.',
                      'Discover: filters the public catalog.',
                    ],
                  })
                  setSearchTutorialSaving(true)
                  void (async () => {
                    try {
                      await updateProfile({ searchTutorialSeen: true })
                    } catch {
                      // If saving fails, do not block search; user may see this again next time.
                    } finally {
                      setSearchTutorialSaving(false)
                    }
                  })()
                }
                if (selectedBottomTab === 'systems') {
                  systemsHubSearchInputRef.current?.focus()
                  return
                }
                librarySearchInputRef.current?.focus()
              }}
            >
              <Search className="h-5 w-5" />
            </CircleIconButton>
          </div>
        </header>


        {shellError && (
          <ShellCard className="mb-4 border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200/80">Sync issue</p>
                <p className="mt-2 text-base leading-7 text-red-100/90">{shellError}</p>
              </div>
              <button
                type="button"
                onClick={refreshShellSnapshot}
                className="rounded-full border border-red-200/20 px-3 py-1.5 text-sm font-semibold text-red-100"
              >
                Retry
              </button>
            </div>
          </ShellCard>
        )}

        <LibraryGameplansShell
          appState={appState}
          user={user}
          libraryTechniques={libraryTechniques}
          filteredLibraryTechniques={filteredLibraryTechniques}
          librarySearchInput={librarySearchInput}
          setLibrarySearchInput={setLibrarySearchInput}
          librarySearchInputRef={librarySearchInputRef}
          libraryView={libraryView}
          setLibraryView={setLibraryView}
          selectedTechniqueBranch={selectedTechniqueBranch}
          selectedTechniquesTab={selectedTechniquesTab}
          discoverByCategory={discoverByCategory}
          discoverTechniques={discoverTechniques}
          expandedDiscoverCategory={expandedDiscoverCategory}
          setExpandedDiscoverCategory={setExpandedDiscoverCategory}
          systemsState={systemsState}
          systemsFilteredSorted={systemsFilteredSorted}
          systemsHubSearchInputRef={systemsHubSearchInputRef}
          selectedSystemBranch={selectedSystemBranch}
          systemActionsOpenId={systemActionsOpenId}
          setSystemActionsOpenId={setSystemActionsOpenId}
          justForkedId={justForkedId}
          handleJustForkedRef={handleJustForkedRef}
          coachStep={coachStep}
          setCoachStep={setCoachStep}
          hasSeenCoachMarks={hasSeenCoachMarks}
          completeCoachMarksTour={completeCoachMarksTour}
          debugTourLog={debugTourLog}
          shellHydratedOnce={shellHydratedOnce}
          shellSyncing={shellSyncing}
          activeSurface={activeSurface}
          setActiveSurface={setActiveSurface}
          updateAppState={updateAppState}
          isCompactHeight={isCompactHeight}
          shellSubsectionSpacingClass={shellSubsectionSpacingClass}
          shellCompactCardPaddingClass={shellCompactCardPaddingClass}
          shellTopTabButtonClass={shellTopTabButtonClass}
          shellTopTabsClass={shellTopTabsClass}
          categoryRowTitleClass={categoryRowTitleClass}
          techniqueRowTitleClass={techniqueRowTitleClass}
          clearSystemEditorSession={() => setSystemEditorSession(null)}
          clearSystemReaderSession={() => setSystemReaderSession(null)}
          openSystemReader={openSystemReader}
          openTechniqueDetail={openTechniqueDetail}
          openUserSystemEditorCreate={openUserSystemEditorCreate}
          openUserSystemEditorEdit={openUserSystemEditorEdit}
          handleDeleteUserSystem={handleDeleteUserSystem}
          onPullToRefresh={handlePullToRefresh}
        />

        <nav aria-label="Primary" className="fixed bottom-[calc(env(safe-area-inset-bottom)+8px)] left-1/2 z-30 w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#080b13]/88 px-4 py-3 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-1">
            {BOTTOM_NAV_ITEMS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-current={selectedBottomTab === value ? 'page' : undefined}
                aria-label={label}
                onClick={() => {
                  // #region agent log (dd-techniques-tour)
                  debugTourLog('bottom nav pressed', {
                    to: value,
                    selectedTechniquesTab: appState.selectedTechniquesTab,
                    coachMarksSeen: hasSeenCoachMarks,
                    shellHydratedOnce,
                    shellSyncing,
                  })
                  // #endregion agent log (dd-techniques-tour)
                  if (selectedBottomTab !== value) void haptics.light()
                  if (value === 'my-library' && shellHydratedOnce && !shellSyncing && !hasSeenCoachMarks) {
                    setCoachStep((previous) => previous ?? 0)
                  }
                  if (value !== 'systems') {
                    setSystemEditorSession(null)
                    setActiveSurface((current) => (current === 'system-editor' ? null : current))
                  } else {
                    setSystemActionsOpenId(null)
                  }
                  updateAppState((previous) => ({
                    ...previous,
                    selectedBottomTab: value,
                    selectedTechniquesTab: value,
                  }))
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2 text-[10px] font-bold transition active:scale-[0.94]',
                  selectedBottomTab === value ? 'text-[#4d7cff]' : 'text-white/28',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {pendingDeletedSession && (
          <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+176px)] left-1/2 z-[60] w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 px-2">
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#101520]/95 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur"
            >
              <span className="truncate">Session deleted</span>
              <button
                type="button"
                onClick={handleUndoDeleteSession}
                className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white"
              >
                Undo
              </button>
            </div>
          </div>
        )}

        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+106px)] left-1/2 z-30 w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 px-2">
          <div className="flex justify-end">
            <button
              type="button"
              aria-label={
                selectedBottomTab === 'systems'
                  ? 'New system'
                  : selectedBottomTab === 'discover'
                    ? 'New discover technique'
                    : 'New technique'
              }
              onClick={() => {
                void haptics.light()
                if (selectedBottomTab === 'systems') {
                  openUserSystemEditorCreate()
                  return
                }
                if (selectedBottomTab === 'discover') {
                  if (!user) {
                    showError('Sign in required')
                    return
                  }
                  setDiscoverDraft(createDiscoverTechniqueDraft())
                  setDiscoverKeepMediaUrls([])
                  setDiscoverVideoFile(null)
                  setEditingDiscoverTechniqueId(null)
                  setTechniqueCategoryOverlayOpen(false)
                  setActiveSurface('new-discover-technique')
                  return
                }
                setTechniqueDraft(createTechniqueDraft())
                setTechniqueCategoryOverlayOpen(false)
                setActiveSurface('new-technique')
              }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.42)] transition active:scale-95"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>
        </div>
      </div>

      {activeSurface === 'sessions' && (
        <ModalShell title="Sessions" onBack={() => setActiveSurface(null)} variant="sessions">
          <TodayShell
            appState={appState}
            activeGameplan={activeGameplan}
            matflowAccess={matflowAccess}
            sessionStats={sessionStats}
            systemsState={systemsState}
            sessionSearchInputRef={sessionSearchInputRef}
            sessionSearchInput={sessionSearchInput}
            setSessionSearchInput={setSessionSearchInput}
            sessionsView={sessionsView}
            setSessionsView={setSessionsView}
            filteredSessions={filteredSessions}
            groupedSessions={groupedSessions}
            libraryTechniques={libraryTechniques}
            shellSubsectionSpacingClass={shellSubsectionSpacingClass}
            shellCompactCardPaddingClass={shellCompactCardPaddingClass}
            shellCardTitleClass={shellCardTitleClass}
            calendarAnchor={calendarAnchor}
            calendarMatrix={calendarMatrix}
            calendarMonthStats={calendarMonthStats}
            isViewingCurrentMonth={isViewingCurrentMonth}
            todayDayKey={todayDayKey}
            selectedCalendarDay={selectedCalendarDay}
            sessionsByDay={sessionsByDay}
            streakDayKeys={streakDayKeys}
            selectedDaySessions={selectedDaySessions}
            openCreateSession={openCreateSession}
            openSystemReader={openSystemReader}
            openSessionDetail={openSessionDetail}
            openEditSession={openEditSession}
            handleRequestDeleteSession={handleRequestDeleteSession}
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
            handleGoToTodayMonth={handleGoToTodayMonth}
            handleSelectCalendarDay={handleSelectCalendarDay}
            updateAppState={updateAppState}
            setActiveSurface={setActiveSurface}
            onPullToRefresh={handlePullToRefresh}
          />
        </ModalShell>
      )}

      {activeSurface === 'profile' && (
        <ModalShell title="Profile" onBack={() => setActiveSurface(null)} variant="profile">
          <YouLegacyShell
            appState={appState}
            isCompactHeight={isCompactHeight}
            analyticsLabel={analyticsLabel}
            analyticsSessionsLength={analyticsSessions.length}
            totalSubmissions={totalSubmissions}
            totalTaps={totalTaps}
            analyticsTechniqueCount={analyticsTechniqueCount}
            favoriteSubmissions={favoriteSubmissions}
            challenges={challenges}
            completedChallengeCount={challenges.filter((challenge) => challenge.progress >= challenge.goal).length}
            challengeCompletionPercent={challenges.length === 0
              ? 0
              : Math.round((challenges.filter((challenge) => challenge.progress >= challenge.goal).length / challenges.length) * 100)}
            achievements={achievements}
            completedAchievementCount={achievements.filter((achievement) => achievement.progress >= achievement.goal).length}
            achievementCompletionPercent={achievements.length === 0
              ? 0
              : Math.round((achievements.filter((achievement) => achievement.progress >= achievement.goal).length / achievements.length) * 100)}
            checklistItems={checklistItems}
            shellSectionSpacingClass={shellSectionSpacingClass}
            shellSubsectionSpacingClass={shellSubsectionSpacingClass}
            shellSectionTitleClass={shellSectionTitleClass}
            shellCompactCardPaddingClass={shellCompactCardPaddingClass}
            shellMetricTileClass={shellMetricTileClass}
            shellFeatureTitleClass={shellFeatureTitleClass}
            shellCardTitleClass={shellCardTitleClass}
            beginEditProfile={beginEditProfile}
            setAnalyticsWindow={setAnalyticsWindow}
            updateAppState={updateAppState}
          />
        </ModalShell>
      )}

      {activeSurface === 'new-session' && (
        <SessionFormModal
          editingSessionId={editingSessionId}
          savingSession={savingSession}
          sessionDraft={sessionDraft}
          setSessionDraft={setSessionDraft}
          sessionDurationMode={sessionDurationMode}
          setSessionDurationMode={setSessionDurationMode}
          sessionPhotoInputRef={sessionPhotoInputRef}
          sessionPhotoPreview={sessionPhotoPreview}
          setSessionPhotoFile={setSessionPhotoFile}
          setSessionPhotoPreview={setSessionPhotoPreview}
          libraryTechniques={libraryTechniques}
          onClose={() => {
            setSessionPhotoFile(null)
            setSessionPhotoPreview(null)
            setSessionPhotoExistingUrl(null)
            setEditingSessionId(null)
            sessionClientIdRef.current = ''
            setActiveSurface(null)
          }}
          handleSaveSession={handleSaveSession}
          showInfo={showInfo}
        />
      )}

      {activeSurface === 'session-detail' && selectedSession && (
        <SessionDetailModal
          selectedSession={selectedSession}
          libraryTechniques={libraryTechniques}
          onClose={() => {
            setActiveSurface(null)
            setSelectedSessionId(null)
          }}
          openEditSession={openEditSession}
          handleDuplicateSession={handleDuplicateSession}
          handleRequestDeleteSession={handleRequestDeleteSession}
        />
      )}

      {activeSurface === 'new-technique' && (
        <ModalShell
          title="Add Technique"
          onBack={() => {
            setTechniqueCategoryOverlayOpen(false)
            setActiveSurface(null)
          }}
          variant="techniques"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTechniqueFavoriteTag}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70"
                aria-label={techniqueDraftHasFavoriteTag() ? 'Remove Favorite tag' : 'Add Favorite tag'}
              >
                <Star className={cn('h-5 w-5', techniqueDraftHasFavoriteTag() ? 'fill-[#ffba33] text-[#ffba33]' : '')} />
              </button>
            </div>
          }
        >
          <div className="pb-[88px]">
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Name</div>
                <input
                  value={techniqueDraft.title}
                  onChange={(event) => setTechniqueDraft((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="Name"
                  className="mt-2 w-full bg-transparent text-[20px] font-semibold text-white/92 placeholder:text-white/22 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoryPickerFor('library')
                  setTechniqueCategoryOverlayOpen(true)
                }}
                className="flex w-full items-center justify-between border-b border-white/10 pb-5 text-left"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Category</div>
                  <div className="mt-2 flex items-center gap-2 text-[18px] font-semibold text-white/92">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toTechniqueColor(techniqueDraft.category) }} />
                    <span>{BJJ_CATEGORY_META[techniqueDraft.category].label}</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-white/40" />
              </button>

              <div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Tags</div>
                  <button
                    type="button"
                    onClick={() => {
                      setTechniqueTagsModalFor('new-technique')
                      setTechniqueTagSearchInput('')
                      setActiveSurface('new-technique-tags')
                    }}
                    className="inline-flex h-7 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70"
                    aria-label="Add tags"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 min-h-[24px] text-[15px] font-medium text-white/38">
                  {parseTagList(techniqueDraft.tags).length ? parseTagList(techniqueDraft.tags).join(', ') : 'Add tags'}
                </div>
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Notes</div>
                <textarea
                  value={techniqueDraft.notes}
                  onChange={(event) => setTechniqueDraft((previous) => ({ ...previous, notes: event.target.value }))}
                  placeholder="Add notes about the technique, key details, or what you learned…"
                  className="mt-2 min-h-24 w-full resize-none bg-transparent text-[16px] font-medium leading-6 text-white/80 placeholder:text-white/22 outline-none"
                />
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Media</div>
                <input
                  ref={techniqueMediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).slice(0, 3)
                    setTechniqueMediaFiles(files)
                    setTechniqueMediaPreviews(files.map((file) => URL.createObjectURL(file)))
                  }}
                />
                <div className="mt-3 flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => techniqueMediaInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-white/18 bg-white/4"
                    aria-label="Add technique media"
                  >
                    <Camera className="h-5 w-5 text-white/45" />
                  </button>
                  <div className="pt-1">
                    <div className="text-sm font-semibold text-white/62">Add up to 3 photos or videos.</div>
                    <div className="mt-1 text-xs font-medium text-white/38">
                      {techniqueMediaFiles.length ? `${techniqueMediaFiles.length}/3 selected` : 'Optional. Media uploads with your technique.'}
                    </div>
                  </div>
                </div>
                {techniqueMediaPreviews.length > 0 && (
                  <div className="mt-4 flex gap-3 overflow-x-auto">
                    {techniqueMediaPreviews.map((src) => (
                      <div key={src} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        <Image src={src} alt="Technique media preview" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Links & References</div>
                  <div className="text-xs font-semibold text-white/35">
                    {parseLinkLines(techniqueDraft.links).length}/10 links
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <textarea
                    value={techniqueDraft.links}
                    onChange={(event) => setTechniqueDraft((previous) => ({ ...previous, links: event.target.value }))}
                    placeholder="Enter reference link..."
                    className="min-h-12 w-full resize-none bg-transparent text-[16px] font-medium text-white/80 placeholder:text-white/22 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTechniqueDraft((previous) => ({ ...previous, links: `${previous.links}${previous.links.trim() ? '\n' : ''}` }))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70"
                    aria-label="Add link row"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTechniqueLinkedSearchInput('')
                  setActiveSurface('new-technique-linked')
                }}
                className="flex w-full items-center justify-between border-b border-white/10 pb-5 text-left"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Linked Techniques</div>
                  <div className="mt-2 text-[16px] font-medium text-white/35">
                    {techniqueDraft.linkedTechniqueIds.length
                      ? `${techniqueDraft.linkedTechniqueIds.length} selected`
                      : 'Select related techniques…'}
                  </div>
                  <div className="mt-1 text-xs font-medium text-white/28">{techniqueDraft.linkedTechniqueIds.length}/15 linked</div>
                </div>
                <ChevronDown className="h-5 w-5 text-white/40" />
              </button>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-50">
              <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)]">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSurface(null)}
                    className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white/65"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTechnique}
                    className="flex-1 rounded-2xl bg-[#2f58ff] px-4 py-3 text-base font-bold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {activeSurface === 'new-discover-technique' && (
        <ModalShell
          title={editingDiscoverTechniqueId ? 'Edit Discover technique' : 'Add Discover technique'}
          onBack={() => {
            setTechniqueCategoryOverlayOpen(false)
            setActiveSurface(null)
            setEditingDiscoverTechniqueId(null)
            setDiscoverDraft(createDiscoverTechniqueDraft())
            setDiscoverVideoFile(null)
            setDiscoverKeepMediaUrls([])
          }}
          variant="techniques"
        >
          <div className="pb-[88px]">
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Technique name</div>
                <p className="mt-0.5 text-[11px] font-semibold text-white/32">Required</p>
                <input
                  value={discoverDraft.title}
                  onChange={(event) => setDiscoverDraft((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="e.g. Armbar from guard"
                  className="mt-2 w-full bg-transparent text-[20px] font-semibold text-white/92 placeholder:text-white/22 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoryPickerFor('discover')
                  setTechniqueCategoryOverlayOpen(true)
                }}
                className="flex w-full items-center justify-between border-b border-white/10 pb-5 text-left"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Category</div>
                  <p className="mt-0.5 text-[11px] font-semibold text-white/32">Required · tap to change</p>
                  <div className="mt-2 flex items-center gap-2 text-[18px] font-semibold text-white/92">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toTechniqueColor(discoverDraft.category) }} />
                    <span>{BJJ_CATEGORY_META[discoverDraft.category].label}</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-white/40" />
              </button>

              <div className="border-b border-white/10 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Labels & tags</div>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/32">Required · at least one</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTechniqueTagsModalFor('new-discover-technique')
                      setTechniqueTagSearchInput('')
                      setActiveSurface('new-technique-tags')
                    }}
                    className="inline-flex h-7 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70"
                    aria-label="Add tags"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 min-h-[24px] text-[15px] font-medium text-white/38">
                  {parseTagList(discoverDraft.tags).length ? parseTagList(discoverDraft.tags).join(', ') : 'Tap + to add tags (required)'}
                </div>
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Description</div>
                <p className="mt-0.5 text-[11px] font-semibold text-white/32">Required</p>
                <textarea
                  value={discoverDraft.description}
                  onChange={(event) => setDiscoverDraft((previous) => ({ ...previous, description: event.target.value }))}
                  placeholder="What is this technique, and what should people focus on?"
                  className="mt-2 min-h-28 w-full resize-none bg-transparent text-[16px] font-medium leading-6 text-white/80 placeholder:text-white/22 outline-none"
                />
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Tutorial title</div>
                <p className="mt-0.5 text-[11px] font-semibold text-white/32">Required · shown on the video card</p>
                <input
                  value={discoverDraft.tutorialTitle}
                  onChange={(event) => setDiscoverDraft((previous) => ({ ...previous, tutorialTitle: event.target.value }))}
                  placeholder="Short title for the tutorial block"
                  className="mt-2 w-full bg-transparent text-[16px] font-semibold text-white/85 placeholder:text-white/22 outline-none"
                />
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Video link</div>
                <p className="mt-0.5 text-[11px] font-semibold text-white/32">Provide a link or upload below — one is required</p>
                <input
                  value={discoverDraft.videoUrl}
                  onChange={(event) => setDiscoverDraft((previous) => ({ ...previous, videoUrl: event.target.value }))}
                  placeholder="YouTube, Instagram, or TikTok URL"
                  className="mt-2 w-full bg-transparent text-[16px] font-medium text-white/80 placeholder:text-white/22 outline-none"
                />
              </div>

              <div className="border-b border-white/10 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Or upload a clip</div>
                <p className="mt-0.5 text-[11px] font-semibold text-white/32">Optional if you added a link above</p>
                <input
                  ref={discoverVideoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setDiscoverVideoFile(file)
                    event.target.value = ''
                  }}
                />
                <div className="mt-3 flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => discoverVideoInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-white/18 bg-white/4"
                    aria-label="Upload technique video"
                  >
                    <Video className="h-5 w-5 text-white/45" />
                  </button>
                  <div className="pt-1 text-sm font-medium text-white/55">
                    {discoverVideoFile
                      ? discoverVideoFile.name
                      : discoverKeepMediaUrls.length > 0
                        ? 'Saved clip will be kept unless you replace it.'
                        : 'Add a file if you did not add a link above.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-50">
              <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)]">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTechniqueCategoryOverlayOpen(false)
                      setActiveSurface(null)
                      setEditingDiscoverTechniqueId(null)
                      setDiscoverDraft(createDiscoverTechniqueDraft())
                      setDiscoverVideoFile(null)
                      setDiscoverKeepMediaUrls([])
                    }}
                    className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white/65"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveDiscoverTechnique()}
                    className="flex-1 rounded-2xl bg-[#2f58ff] px-4 py-3 text-base font-bold text-white"
                  >
                    {editingDiscoverTechniqueId ? 'Save' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {techniqueCategoryOverlayOpen && (activeSurface === 'new-technique' || activeSurface === 'new-discover-technique') && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex h-[100dvh] items-center justify-center px-6 text-white">
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-black/70"
            aria-label="Close category picker"
            onClick={() => setTechniqueCategoryOverlayOpen(false)}
          />
          <div className="pointer-events-auto relative z-10 w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f18]/95 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="px-5 pb-3 pt-4 text-center text-[18px] font-bold">Select Category</div>
            <div className="border-t border-white/10">
              {(Object.keys(BJJ_CATEGORY_META) as BjjTechniqueCategory[]).map((category) => {
                const active =
                  categoryPickerFor === 'discover'
                    ? discoverDraft.category === category
                    : techniqueDraft.category === category
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      if (categoryPickerFor === 'discover') {
                        setDiscoverDraft((previous) => ({ ...previous, category }))
                      } else {
                        setTechniqueDraft((previous) => ({ ...previous, category }))
                      }
                      setTechniqueCategoryOverlayOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-5 py-3.5 text-left',
                      active ? 'bg-[#2f58ff]/18' : 'bg-transparent hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: toTechniqueColor(category) }} />
                      <span className="text-[16px] font-semibold">{BJJ_CATEGORY_META[category].label}</span>
                    </div>
                    {active ? <Check className="h-5 w-5 text-[#7ea4ff]" /> : <span className="h-5 w-5" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeSurface === 'techniques-filter-category' && appState && (
        <div className="fixed inset-0 z-[60] flex h-[100dvh] items-center justify-center bg-black/70 px-6 text-white">
          <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f18]/95 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="px-5 pb-3 pt-4 text-center text-[18px] font-bold">Select Category</div>
            <div className="border-t border-white/10">
              {(['all', ...Object.keys(BJJ_CATEGORY_META)] as Array<BjjTechniqueCategory | 'all'>).map((category) => {
                const active = appState.activeCategoryFilter === category
                const label = category === 'all' ? 'All' : BJJ_CATEGORY_META[category].label
                const dot = category === 'all' ? 'rgba(255,255,255,0.28)' : toTechniqueColor(category)
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      updateAppState((previous) => ({
                        ...previous,
                        activeCategoryFilter: category,
                      }))
                      setActiveSurface(null)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-5 py-3.5 text-left',
                      active ? 'bg-[#2f58ff]/18' : 'bg-transparent hover:bg-white/5',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dot }} />
                      <span className="text-[16px] font-semibold">{label}</span>
                    </div>
                    {active ? <Check className="h-5 w-5 text-[#7ea4ff]" /> : <span className="h-5 w-5" />}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSurface(null)}
            className="absolute inset-0 -z-10"
            aria-label="Close category filter"
          />
        </div>
      )}

      {activeSurface === 'new-technique-tags' && appState && (
        <ModalShell
          title="Add Tags"
          onBack={() => setActiveSurface(techniqueTagsModalFor === 'new-discover-technique' ? 'new-discover-technique' : 'new-technique')}
          variant="techniques"
          action={
            <button
              type="button"
              onClick={() => setActiveSurface(techniqueTagsModalFor === 'new-discover-technique' ? 'new-discover-technique' : 'new-technique')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          }
        >
          {(() => {
            void userLabelPrefsVersion
            const tagSourceTags = techniqueTagsModalFor === 'new-discover-technique' ? discoverDraft.tags : techniqueDraft.tags
            const tagReturnSurface = techniqueTagsModalFor === 'new-discover-technique' ? 'new-discover-technique' : 'new-technique'
            const setTagsOnTarget = (tags: string) => {
              if (techniqueTagsModalFor === 'new-discover-technique') {
                setDiscoverDraft((previous) => ({ ...previous, tags }))
              } else {
                setTechniqueDraft((previous) => ({ ...previous, tags }))
              }
            }
            const suggestedPositions = ['Closed Guard', 'Open Guard', 'Half Guard', 'Side Control', 'Mount', 'Back Control']
            const suggestedCommon = ['Beginner', 'Fundamental', 'High Percentage', 'Competition', 'Drill', 'Details']
            const builtInPresets = [...suggestedPositions, ...suggestedCommon]
            const builtInPresetLower = new Set(builtInPresets.map((label) => label.toLowerCase()))
            const customTags = appState.customTags ?? []
            const allPresetLabels = [...builtInPresets, ...customTags]
            const labelPrefs = loadUserTechniqueLabelPrefs(user?.id ?? 'anonymous')
            const hiddenLowerSet = new Set(labelPrefs.hiddenLower)
            const yourTags = Array.from(
              new Map(customTags.map((tag) => [tag.toLowerCase(), tag.trim()])).values(),
            )
              .filter((tag) => tag.length > 0 && !builtInPresetLower.has(tag.toLowerCase()))
              .filter((tag) => !hiddenLowerSet.has(tag.toLowerCase()))
              .sort((left, right) => left.localeCompare(right))

            const selectedTags = new Set(parseTagList(tagSourceTags).map((tag) => tag.toLowerCase()))
            const toggleTag = (label: string) => {
              const key = label.toLowerCase()
              const keys = new Set(selectedTags)
              if (keys.has(key)) keys.delete(key)
              else keys.add(key)
              const prevList = parseTagList(tagSourceTags)
              const nextList = Array.from(keys).map((k) => {
                const kept = prevList.find((entry) => entry.toLowerCase() === k)
                if (kept) return kept
                const preset = allPresetLabels.find((entry) => entry.toLowerCase() === k)
                if (preset) return preset
                if (k === key) return label
                return k
              })
              setTagsOnTarget(serializeTagList(nextList))
            }

            const addCustomTagFromSearch = () => {
              const raw = techniqueTagSearchInput.trim()
              if (!raw) return
              const key = raw.toLowerCase()
              if (selectedTags.has(key)) {
                setTechniqueTagSearchInput('')
                return
              }
              toggleTag(raw)
              appendSavedTechniqueLabel(user?.id ?? 'anonymous', raw)
              setUserLabelPrefsVersion((v) => v + 1)
              updateAppState((previousState) => ({
                ...previousState,
                customTags: Array.from(
                  new Set([...(previousState.customTags ?? []), raw].map((t) => t.trim()).filter(Boolean)),
                ),
              }))
              setTechniqueTagSearchInput('')
            }

            const removeYourTagFromPalette = (tag: string) => {
              const uid = user?.id ?? 'anonymous'
              const lower = tag.toLowerCase()
              const prefs = loadUserTechniqueLabelPrefs(uid)
              const wasInSaved = prefs.saved.some((entry) => entry.toLowerCase() === lower)
              removeTechniqueLabelFromPalette(uid, tag)
              if (wasInSaved) {
                updateAppState((previousState) => ({
                  ...previousState,
                  customTags: (previousState.customTags ?? []).filter((entry) => entry.toLowerCase() !== lower),
                }))
              }
              setUserLabelPrefsVersion((v) => v + 1)
            }

            const tagQuery = techniqueTagSearchInput.trim().toLowerCase()
            const tagMatches = (label: string) => !tagQuery || label.toLowerCase().includes(tagQuery)
            const searchTrimmedLower = techniqueTagSearchInput.trim().toLowerCase()
            const canAddCustomTag =
              techniqueTagSearchInput.trim().length > 0
              && !selectedTags.has(searchTrimmedLower)
              && !builtInPresets.some((entry) => entry.toLowerCase() === searchTrimmedLower)
              && !customTags.some((entry) => entry.toLowerCase() === searchTrimmedLower)

            const TagChip = ({ label }: { label: string }) => {
              const active = selectedTags.has(label.toLowerCase())
              return (
                <button
                  type="button"
                  onClick={() => toggleTag(label)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-bold transition',
                    active ? 'bg-white text-black' : 'border border-white/10 bg-white/6 text-white/80',
                  )}
                >
                  {label}
                </button>
              )
            }

            return (
              <div className="pb-[88px]">
                <div className="mt-1 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <div className="flex items-center gap-2 text-white/55">
                    <Search className="h-4 w-4" />
                    <input
                      value={techniqueTagSearchInput}
                      onChange={(event) => setTechniqueTagSearchInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          if (canAddCustomTag) addCustomTagFromSearch()
                        }
                      }}
                      placeholder="Search or type a new tag…"
                      className="w-full bg-transparent text-[16px] font-semibold text-white/85 placeholder:text-white/28 outline-none"
                    />
                  </div>
                </div>

                {canAddCustomTag && (
                  <button
                    type="button"
                    onClick={addCustomTagFromSearch}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#4d7cff]/35 bg-[#4d7cff]/12 py-3 text-[15px] font-bold text-[#8cabff]"
                  >
                    <Plus className="h-4 w-4" />
                    Add “{techniqueTagSearchInput.trim()}”
                  </button>
                )}

                {!canAddCustomTag && techniqueTagSearchInput.trim().length > 0 && selectedTags.has(techniqueTagSearchInput.trim().toLowerCase()) && (
                  <p className="mt-3 text-center text-sm font-medium text-white/45">This tag is already selected.</p>
                )}

                {!canAddCustomTag && techniqueTagSearchInput.trim().length > 0 && builtInPresets.some((entry) => entry.toLowerCase() === searchTrimmedLower) && (
                  <p className="mt-3 text-center text-sm font-medium text-white/45">Tap a chip below to toggle this tag.</p>
                )}

                {!canAddCustomTag && techniqueTagSearchInput.trim().length > 0 && customTags.some((entry) => entry.toLowerCase() === searchTrimmedLower) && !selectedTags.has(searchTrimmedLower) && (
                  <p className="mt-3 text-center text-sm font-medium text-white/45">Tap it under Your tags.</p>
                )}

                <div className="mt-6 space-y-6">
                  <div>
                    <div className="text-sm font-bold text-white/85">Your tags</div>
                    <p className="mt-1 text-xs font-medium text-white/40">
                      Saved on this device until you remove them. Also shows labels from your library (minus built-in suggestions).
                    </p>
                    {yourTags.filter(tagMatches).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {yourTags.filter(tagMatches).map((tag) => {
                          const active = selectedTags.has(tag.toLowerCase())
                          return (
                            <div
                              key={tag}
                              className={cn(
                                'inline-flex max-w-full items-center gap-0.5 rounded-full pl-3.5 pr-1 py-1.5 text-sm font-bold transition',
                                active ? 'bg-white text-black' : 'border border-white/10 bg-white/6 text-white/80',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className="min-w-0 flex-1 truncate text-left"
                              >
                                {tag}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  removeYourTagFromPalette(tag)
                                }}
                                className={cn(
                                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition',
                                  active ? 'text-black/55 hover:text-black' : 'text-white/45 hover:text-white/75',
                                )}
                                aria-label={`Remove ${tag} from your tags`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-medium text-white/45">
                        {tagQuery ? 'No saved tags match your search.' : 'No custom tags yet — use Add above or save techniques with labels.'}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white/85">Positions</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestedPositions.filter(tagMatches).map((tag) => <TagChip key={tag} label={tag} />)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white/85">Common Tags</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestedCommon.filter(tagMatches).map((tag) => <TagChip key={tag} label={tag} />)}
                    </div>
                  </div>
                </div>

                <div className="fixed inset-x-0 bottom-0 z-50">
                  <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)]">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setTagsOnTarget('')}
                        className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-base font-bold text-white/65"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSurface(tagReturnSurface)}
                        className="flex-1 rounded-2xl bg-[#2f58ff] px-4 py-3 text-base font-bold text-white"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </ModalShell>
      )}

      {activeSurface === 'new-technique-linked' && appState && (
        <ModalShell
          title="Linked Techniques"
          onBack={() => setActiveSurface('new-technique')}
          variant="techniques"
          action={
            <button
              type="button"
              onClick={() => setActiveSurface('new-technique')}
              className="rounded-2xl bg-[#2f58ff] px-4 py-2 text-sm font-bold"
            >
              Done
            </button>
          }
        >
          <div className="space-y-4 pb-4">
            <SearchField
              value={techniqueLinkedSearchInput}
              onChange={(event) => setTechniqueLinkedSearchInput(event.target.value)}
              placeholder="Search your library…"
            />
            <p className="text-sm font-semibold text-white/55">
              {techniqueDraft.linkedTechniqueIds.length}/15 linked — tap techniques to toggle.
            </p>
            <div className="flex flex-wrap gap-2">
              {libraryTechniques
                .filter((technique) => {
                  const query = deferredTechniqueLinkedSearch.trim().toLowerCase()
                  if (!query) return true
                  return (
                    technique.title.toLowerCase().includes(query) ||
                    technique.tags.some((tag) => tag.toLowerCase().includes(query))
                  )
                })
                .map((technique) => {
                  const selected = techniqueDraft.linkedTechniqueIds.includes(technique.id)
                  return (
                    <button
                      key={technique.id}
                      type="button"
                      onClick={() => {
                        setTechniqueDraft((previous) => {
                          const already = previous.linkedTechniqueIds.includes(technique.id)
                          if (already) {
                            return {
                              ...previous,
                              linkedTechniqueIds: previous.linkedTechniqueIds.filter((id) => id !== technique.id),
                            }
                          }
                          if (previous.linkedTechniqueIds.length >= 15) {
                            showError(toastCopy.linkLimitTechniques)
                            return previous
                          }
                          return {
                            ...previous,
                            linkedTechniqueIds: [...previous.linkedTechniqueIds, technique.id],
                          }
                        })
                      }}
                      className={cn(
                        'rounded-full border px-3 py-2 text-sm font-semibold',
                        selected ? 'border-[#4d7cff]/40 bg-[#4d7cff]/18 text-[#8cabff]' : 'border-white/10 bg-white/6 text-white/58',
                      )}
                    >
                      {technique.title}
                    </button>
                  )
                })}
            </div>
            {libraryTechniques.length === 0 && (
              <p className="text-sm text-white/45">Add techniques to your library first, then link them here.</p>
            )}
          </div>
        </ModalShell>
      )}

      {activeSurface === 'edit-profile' && profileDraft && (
        <EditProfileModal
          profileDraft={profileDraft}
          setProfileDraft={setProfileDraft}
          profilePhotoPreview={profilePhotoPreview}
          setProfilePhotoFile={setProfilePhotoFile}
          setProfilePhotoPreview={setProfilePhotoPreview}
          profilePhotoInputRef={profilePhotoInputRef}
          profileNameInputUnlocked={profileNameInputUnlocked}
          setProfileNameInputUnlocked={setProfileNameInputUnlocked}
          profileNameSentinel={profileNameSentinel}
          profileNameDirty={profileNameDirty}
          setProfileNameDirty={setProfileNameDirty}
          analyticsConsent={analyticsConsent}
          authLoading={authLoading}
          isDeletingAccount={isDeletingAccount}
          isExportingData={isExportingData}
          setActiveSurface={setActiveSurface}
          handleSaveProfile={handleSaveProfile}
          handleManageSubscription={handleManageSubscription}
          handleRestorePurchase={handleRestorePurchase}
          handleExportData={handleExportData}
          handleOpenPrivacyPolicy={() => openSupportLink(PRIVACY_POLICY_URL)}
          handleOpenTerms={() => openSupportLink(TERMS_OF_SERVICE_URL)}
          handleContactSupport={() => openSupportLink(SUPPORT_MAILTO)}
          handleToggleAnalyticsConsent={handleToggleAnalyticsConsent}
          handleDeleteAccount={handleDeleteAccount}
          signOut={signOut}
          showError={showError}
        />
      )}
      {(activeSurface === 'technique-detail' || activeSurface === 'discover-detail') && selectedTechnique && (
        <ModalShell
          title={selectedTechnique.title}
          onBack={() => {
            setActiveSurface(null)
            setSelectedTechniqueId(null)
          }}
          variant="techniques"
          action={
            activeSurface === 'discover-detail' ? (
              <div className="flex max-w-[min(280px,72vw)] flex-wrap items-center justify-end gap-2">
                {user?.id && selectedTechnique.createdBy === user.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => beginEditDiscoverTechnique(selectedTechnique)}
                      className="rounded-2xl border border-white/12 bg-white/8 px-3 py-2 text-sm font-bold text-white/88"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteDiscoverTechnique(selectedTechnique)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/12 text-red-200"
                      aria-label="Delete from Discover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {(appState?.discoverAddedTechniqueIds ?? []).includes(selectedTechnique.id) ? (
                  <button
                    type="button"
                    onClick={() => void handleRemoveDiscoverFromLibrary(selectedTechnique)}
                    className="rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/18 px-4 py-2 text-sm font-bold text-[#8cabff]"
                  >
                    In library — Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddDiscoverTechnique(selectedTechnique)}
                    className="rounded-2xl bg-[#2f58ff] px-4 py-2 text-sm font-bold"
                  >
                    Add to My Library
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-[#f97316] px-4 py-2 text-sm font-bold text-white">
                {BJJ_CATEGORY_META[selectedTechnique.category].label}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void openTechniqueMedia(selectedTechnique)}
              className={cn(
                'grid w-full place-items-center rounded-[28px] border border-white/10 bg-[linear-gradient(150deg,rgba(249,115,22,0.22),rgba(9,10,14,0.95))] text-center transition active:opacity-90',
                isCompactHeight ? 'h-44' : 'h-52',
              )}
            >
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <Play className="h-7 w-7 text-white" fill="currentColor" />
                </div>
                <p className={cn('mt-4 font-black', shellFeatureTitleClass)}>{selectedTechnique.tutorialTitle}</p>
                <p className="mt-1 text-sm text-white/50">Watch tutorial</p>
              </div>
            </button>
            <div>
              <h3 className={cn(categoryRowTitleClass, 'font-black')}>Description</h3>
              <p className={cn('mt-3 text-white/66', isCompactHeight ? 'text-[17px] leading-7' : 'text-[19px] leading-8')}>{selectedTechnique.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTechnique.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white/68">
                  {tag}
                </span>
              ))}
            </div>
            {selectedTechnique.notes && (
              <ShellCard className="p-4">
                <div className="flex items-center gap-3">
                  <NotebookPen className="h-5 w-5 text-[#7ea4ff]" />
                  <p className={cn(shellFeatureTitleClass, 'font-bold')}>Notes</p>
                </div>
                <p className={cn('mt-3 text-white/62', isCompactHeight ? 'text-[16px] leading-7' : 'text-[18px] leading-7')}>{selectedTechnique.notes}</p>
              </ShellCard>
            )}
            {(selectedTechnique.links.length > 0 || selectedTechnique.media.length > 0) && (
              <ShellCard className="p-4">
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-[#7ea4ff]" />
                  <p className={cn(shellFeatureTitleClass, 'font-bold')}>References</p>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedTechnique.links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-base font-semibold text-[#8cabff] underline decoration-white/15 underline-offset-4">
                      {link}
                    </a>
                  ))}
                  {selectedTechnique.media.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-base font-semibold text-[#8cabff] underline decoration-white/15 underline-offset-4">
                      {link}
                    </a>
                  ))}
                </div>
              </ShellCard>
            )}
            {activeSurface === 'technique-detail' && (
              <button
                type="button"
                onClick={() => void handleRemoveLibraryTechniqueFromDetail()}
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-200/95"
              >
                Remove from library
              </button>
            )}
          </div>
        </ModalShell>
      )}

      {activeSurface === 'paywall' && (
        <ModalShell title="MatFlow Pro" onBack={() => setActiveSurface(null)} variant="paywall-pricing">
          <div className="space-y-5">
            <ShellCard className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[34px] font-black leading-none">Go Pro</p>
                  <p className="mt-3 text-[18px] leading-7 text-white/60">
                    Unlock systems, advanced analytics, unlimited techniques, and achievement tracks.
                  </p>
                </div>
                <Crown className="h-8 w-8 text-[#7ea4ff]" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  'System maps',
                  'Expanded training analytics',
                  'Unlimited techniques',
                  'Challenges and achievements',
                ].map((line) => (
                  <div key={line} className="flex items-center gap-3 text-[17px] font-semibold">
                    <Check className="h-4 w-4 text-[#7ea4ff]" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </ShellCard>
            <PrimaryButton onClick={() => void handleSubscribe(paywallPlan)}>Start Pro</PrimaryButton>
          </div>
        </ModalShell>
      )}

      {activeSurface === 'system-editor' && systemEditorSession && user && (
        <UserSystemWizardModal
          key={`sys-wizard-${systemEditorSession.nonce}`}
          initial={systemEditorSession.initial}
          branch={systemEditorSession.initial?.branch ?? selectedSystemBranch}
          onClose={() => {
            setSystemEditorSession(null)
            setActiveSurface(null)
          }}
          onFinish={handleSaveUserSystem}
          onDelete={handleDeleteUserSystem}
        />
      )}

      {activeSurface === 'system-reader' && systemReaderSession && user && appState && (
        <UserSystemReaderModal
          system={systemReaderSession}
          libraryTechniques={libraryTechniques}
          isOwner={Boolean(systemReaderSession.userId && systemReaderSession.userId === user.id)}
          onClose={() => {
            setSystemReaderSession(null)
            setActiveSurface(null)
          }}
          onOpenTechnique={(techniqueId) => {
            setSystemReaderSession(null)
            setActiveSurface(null)
            openTechniqueDetail(techniqueId, 'technique-detail')
          }}
          onDelete={
            systemReaderSession.userId && systemReaderSession.userId === user.id
              ? () => { void handleDeleteUserSystem(systemReaderSession.id) }
              : undefined
          }
        />
      )}

    </div>
  )
}

export function BjjApp() {
  const { user } = useAuth()
  return <BjjAppInner key={user?.id ?? 'anon'} />
}
