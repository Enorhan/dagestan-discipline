'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Screen, Equipment, WeekDay, SessionLog, TimerMode, SportType, Session, SessionAdjustmentMode, WeightUnit, ActivityLog, Drill, DrillCategory, DrillSubcategory, Routine, LearningPath, ExerciseCategory, Athlete, ExperienceLevel, EnhancedExerciseData, ExerciseWithGuidance, PrimaryGoal, Exercise, PersonalRecord } from '@/lib/types'
import { generateWeeklyProgram } from '@/lib/data'
import { allDrills, routines, learningPaths } from '@/lib/drills-data'
import { analytics } from '@/lib/analytics'
import { ActiveSessionRoutes } from '@/components/app/active-session-routes'
import { CoreAppRoutes } from '@/components/app/core-app-routes'
import { OnboardingRoutes } from '@/components/app/onboarding-routes'
import { PlanningRoutes } from '@/components/app/planning-routes'
import { SettingsRoutes } from '@/components/app/settings-routes'
import { StatusRoutes } from '@/components/app/status-routes'
import { AuthRoutes } from '@/components/app/auth-routes'
import { TrainingLibraryRoutes } from '@/components/app/training-library-routes'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
// Social screens
import { ProfileWorkoutRoutes } from '@/components/app/profile-workout-routes'
import { NavigationNotSet } from '@/components/screens/navigation-not-set'
import { supabaseService } from '@/lib/supabase-service'
import { supabase } from '@/lib/supabase'
import { initDeepLinkHandler } from '@/lib/deep-link-handler'
import stripeService from '@/lib/stripe-service'
import { UserProfile, CustomWorkout } from '@/lib/social-types'
import { drillsService } from '@/lib/drills-service'
import { athletesService } from '@/lib/athletes-service'
import { resolveHydratedScreenWithoutStorage, resolvePersistedHydratedScreen } from '@/lib/hydration-restore'
import { getMissedSessionRecoveryState } from '@/lib/missed-session-recovery'
import { resolveNavigation } from '@/lib/navigation-machine'
import { adjustSessionForReadiness, estimateDurationMinutes, normalizeSessionAdjustmentMode } from '@/lib/session-adjustment'
import { normalizeSessionRuntimeState } from '@/lib/session-runtime'
import { shouldPollSubscriptionStatusAfterReturn, SubscriptionReturnStatus } from '@/lib/subscription-return'
import { useToast } from '@/contexts/toast-context'
import {
  getActivitySaveFeedback,
  getActivitySyncFallbackFeedback,
  getProgramDraftSaveFeedback,
  getProgramSessionSaveFeedback,
  getSettingsSaveFeedback,
  getWorkoutSaveFeedback,
} from '@/lib/action-feedback'
import { canAccessFeature, PREMIUM_CORE_HIGHLIGHTS, PREMIUM_FEATURES, PREMIUM_POSITIONING_COPY } from '@/lib/premium-gate'
import {
  PREMIUM_SUBSCRIPTION_PRICE_LABEL,
  SUBSCRIPTION_REQUIRED_AFTER_DAYS,
  SUBSCRIPTION_REQUIRED_AFTER_MS,
} from '@/lib/subscription-config'
import { getBillingCheckoutAvailability, getRuntimeFlagsSnapshot } from '@/lib/runtime-flags'

const STORAGE_KEY = 'dagestaniDiscipline.state'
const UNDO_TTL_MS = 6000
const STREAK_GRACE_HOURS = 36
const DEFAULT_SCREENSHOT_INTERVAL_MS = 1400
const DEFAULT_SCREENSHOT_DELAY_MS = 400

// Default empty week progress - will be populated when user sets up their program
const DEFAULT_WEEK_PROGRESS: WeekDay[] = [
  { day: 'Monday', shortDay: 'M', planned: false, completed: false },
  { day: 'Tuesday', shortDay: 'T', planned: false, completed: false },
  { day: 'Wednesday', shortDay: 'W', planned: false, completed: false },
  { day: 'Thursday', shortDay: 'T', planned: false, completed: false },
  { day: 'Friday', shortDay: 'F', planned: false, completed: false },
  { day: 'Saturday', shortDay: 'S', planned: false, completed: false },
  { day: 'Sunday', shortDay: 'S', planned: false, completed: false },
]

const DEFAULT_PLAN_INDEXES: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
}

const buildWeekProgress = (daysPerWeek: number): WeekDay[] => {
  const plan = DEFAULT_PLAN_INDEXES[Math.max(2, Math.min(6, daysPerWeek))] ?? DEFAULT_PLAN_INDEXES[4]
  return DEFAULT_WEEK_PROGRESS.map((day, index) => ({
    ...day,
    planned: plan.includes(index),
    completed: false,
  }))
}

const getTodayIndex = () => {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

const getLocalDateKey = (date: Date = new Date()) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getSubscriptionRequiredAt = (
  firstActiveAt?: string | null,
  createdAt?: string | null
): number | null => {
  const anchor = firstActiveAt ?? createdAt
  if (!anchor) return null
  const anchorMs = Date.parse(anchor)
  if (!Number.isFinite(anchorMs)) return null
  return anchorMs + SUBSCRIPTION_REQUIRED_AFTER_MS
}

type PendingBillingReturn = 'checkout' | 'portal'

const fingerprintSession = (session: Session | null): string | null => {
  if (!session) return null
  const exercises = Array.isArray(session.exercises) ? session.exercises : []
  const payload = {
    id: session.id,
    focus: session.focus,
    duration: session.duration,
    exercises: exercises.map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps ?? null,
      duration: e.duration ?? null,
      restTime: e.restTime,
    })),
  }
  return JSON.stringify(payload)
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`))
        }, ms)
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const SCREENSHOT_SCREENS: Screen[] = [
  'auth-login',
  'auth-signup',
  'loading',
  'onboarding-sport',
  'onboarding-schedule',
  'onboarding-equipment',
  'onboarding-generating',
  'onboarding-program-explainer',
  'onboarding-app-tour',
  'home',
  'week-view',
  'exercise-list',
  'sport-exercise-categories',
  'sport-category-exercises',
  'workout-session',
  'rest-timer',
  'post-workout-reflection',
  'session-complete',
  'missed-session-accountability',
  'round-timer',
  'log-activity',
  'training-stats',
  'training-hub',
  'category-list',
  'drill-detail',
  'routine-player',
  'learning-path',
  'body-part-selector',
  'athlete-detail',
  'workout-detail',
  'workout-builder',
  'program-session-editor',
  'user-profile',
  'edit-profile',
  'settings',
]

const parseScreenshotNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const getScreenshotParams = () => {
  const isBrowser = typeof window !== 'undefined'
  const params = isBrowser ? new URLSearchParams(window.location.search) : null
  const enabled = (params?.get('screenshot') === '1') || process.env.NEXT_PUBLIC_SCREENSHOT_MODE === '1'
  const screen = params?.get('screen') ?? process.env.NEXT_PUBLIC_SCREENSHOT_SCREEN ?? null
  const intervalMs = parseScreenshotNumber(
    params?.get('interval') ?? process.env.NEXT_PUBLIC_SCREENSHOT_INTERVAL ?? null,
    DEFAULT_SCREENSHOT_INTERVAL_MS
  )
  const delayMs = parseScreenshotNumber(
    params?.get('delay') ?? process.env.NEXT_PUBLIC_SCREENSHOT_DELAY ?? null,
    DEFAULT_SCREENSHOT_DELAY_MS
  )
  return { enabled, screen, intervalMs, delayMs }
}

interface UndoSnapshot {
  currentExerciseIndex: number
  currentSet: number
  sessionStartTime: number | null
  restTimerEndsAt: number | null
  restTimerDuration: number
  currentScreen: Screen
  setProgressByExercise: Record<string, boolean[]>
  currentSessionWeights: Record<string, number[]>
  totalVolume: number
  sessionPaused: boolean
  pauseStartedAt: number | null
  pausedTime: number
}

interface UndoAction {
  id: string
  label: string
  createdAt: number
  snapshot: UndoSnapshot
}

type TodayWorkoutOverride = {
  baseSessionId: string | null
  baseProgramDayIndex: number | null
  baseFingerprint: string | null
  addedExercises: Exercise[]
  removedExerciseIds: string[]
  exerciseOrderIds: string[]
  exerciseEdits: Record<string, Partial<Exercise>>
  addedDrillIds: string[]
  removedDrillIds: string[]
  drillDoneIds: string[]
  drillsLoggedAt: string | null
  readinessMode: SessionAdjustmentMode | null
  updatedAt: string
}

export default function App() {
  const { showToast } = useToast()

  type ProgramMetaState = {
    sport: SportType
    trainingDays: number
    equipment: Equipment | null
    level: ExperienceLevel
    primaryGoal: PrimaryGoal
    combatSessionsPerWeek: number
    sessionMinutes: number
  }

  // Core state
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth-login')
  const [navigationError, setNavigationError] = useState<{ message: string; details?: string } | null>(null)
  const [navigationBlockNotice, setNavigationBlockNotice] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<SportType>('wrestling')
  const [trainingDays, setTrainingDays] = useState(4)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('balanced')
  const [combatSessionsPerWeek, setCombatSessionsPerWeek] = useState(0)
  const [sessionMinutes, setSessionMinutes] = useState(45)
  const [injuryNotes, setInjuryNotes] = useState('')
  const [generatedProgram, setGeneratedProgram] = useState<Session[] | null>(null)
  const generatedProgramRef = useRef<Session[] | null>(null)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [programId, setProgramId] = useState<string | null>(null)
  const [savedProgramSessions, setSavedProgramSessions] = useState<Session[] | null>(null)
  const [hasProgramChanges, setHasProgramChanges] = useState(false)
  const [programMeta, setProgramMeta] = useState<ProgramMetaState | null>(null)
  const [sessionOverride, setSessionOverride] = useState<Session | null>(null)
  const [sessionSource, setSessionSource] = useState<'program' | 'custom' | 'extra' | null>(null)
  const [todayOverridesByDate, setTodayOverridesByDate] = useState<Record<string, TodayWorkoutOverride>>({})
  const [editingSessionDayIndex, setEditingSessionDayIndex] = useState<number | null>(null)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [loadingContext, setLoadingContext] = useState<'default' | 'signup'>('default')
  const [isGeneratingOnboardingProgram, setIsGeneratingOnboardingProgram] = useState(false)
  const [onboardingGenerationError, setOnboardingGenerationError] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  // Session state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [restTimerEndsAt, setRestTimerEndsAt] = useState<number | null>(null)
  const [restTimerDuration, setRestTimerDuration] = useState(0)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null)

  // Progress state
  const [weekProgress, setWeekProgress] = useState<WeekDay[]>(DEFAULT_WEEK_PROGRESS)

  // Streak & Accountability state
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionLog[]>([])
  const [editingCompletedSessionId, setEditingCompletedSessionId] = useState<string | null>(null)
  const [missedSessionExcuse, setMissedSessionExcuse] = useState<string | null>(null)

  // Performance tracking state
  const [currentSessionWeights, setCurrentSessionWeights] = useState<Record<string, number[]>>({})
  const [currentSessionPRs, setCurrentSessionPRs] = useState<PersonalRecord[]>([])
  const [setProgressByExercise, setSetProgressByExercise] = useState<Record<string, boolean[]>>({})
  const [totalVolume, setTotalVolume] = useState(0)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const todayOverridePersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contentDataVersion, setContentDataVersion] = useState(0)
  const contentRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentInvalidationRef = useRef(false)
  const latestCompletedSessionSyncRef = useRef<{
    localId: string
    persistedId: string | null
    effortRating?: number
    notes?: string
  } | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const hasHydratedRef = useRef(false)
  const hasTrackedAppOpenedRef = useRef(false)
  const firstActiveSyncUserRef = useRef<string | null>(null)

  // Round timer state
  const [roundTimerMode, setRoundTimerMode] = useState<TimerMode>('mma')

  // Exercise navigation state
  const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set())

  // Activity logging state (for external training like BJJ, wrestling, judo)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null)

  // Training Hub state
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<DrillSubcategory | null>(null)
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [selectedLearningPath, setSelectedLearningPath] = useState<LearningPath | null>(null)
  const [learningPathProgress, setLearningPathProgress] = useState<Record<string, number>>({})
  const [recentlyViewedDrills, setRecentlyViewedDrills] = useState<string[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [userExperienceLevel, setUserExperienceLevel] = useState<ExperienceLevel>('beginner')

  // Exercise navigation state
  const [selectedExerciseSport, setSelectedExerciseSport] = useState<SportType | null>(null)
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState<ExerciseCategory | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<EnhancedExerciseData | null>(null)
  const [favoriteExercises, setFavoriteExercises] = useState<Set<string>>(new Set())
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [workoutBuilderPrefillExercise, setWorkoutBuilderPrefillExercise] = useState<{ id: string; name: string; videoUrl?: string | null } | null>(null)

  // Screen transition state
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const previousScreenRef = useRef<Screen | null>(null)
  const navigationHistoryRef = useRef<Screen[]>([])
  const skipNextHistoryPushRef = useRef(false)
  const lastHistoryScreenRef = useRef<Screen>(currentScreen)

  // Scroll position preservation for screens (stores scrollTop by screen name)
  const screenScrollPositionsRef = useRef<Record<string, number>>({})

  // Social state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<CustomWorkout | null>(null)
  const [featureUsage, setFeatureUsage] = useState<Record<string, number>>({})
  const [subscriptionGateNow, setSubscriptionGateNow] = useState<number>(() => Date.now())
  const [isStartingMandatorySubscription, setIsStartingMandatorySubscription] = useState(false)
  const [isRefreshingMandatorySubscription, setIsRefreshingMandatorySubscription] = useState(false)
  const [mandatorySubscriptionError, setMandatorySubscriptionError] = useState<string | null>(null)
  const pendingBillingReturnRef = useRef<PendingBillingReturn | null>(null)

  // Loading state for Supabase data
  const [isLoadingSupabaseData, setIsLoadingSupabaseData] = useState(false)

  const screenshotParams = getScreenshotParams()
  const isScreenshotMode = screenshotParams.enabled
  const screenshotScreen = screenshotParams.screen
  const screenshotIntervalMs = screenshotParams.intervalMs
  const screenshotDelayMs = screenshotParams.delayMs

  const navigationContext = useMemo(() => ({
    isAuthenticated: !!currentUser,
    onboardingCompleted: currentUser?.onboardingCompleted === true,
    hasActiveSession: (
      sessionStartTime !== null ||
      restTimerEndsAt !== null ||
      sessionPaused ||
      pauseStartedAt !== null ||
      currentScreen === 'workout-session' ||
      currentScreen === 'rest-timer'
    ),
  }), [
    currentUser,
    sessionStartTime,
    restTimerEndsAt,
    sessionPaused,
    pauseStartedAt,
    currentScreen,
  ])

  const navigateTo = useCallback((screen: Screen, options?: { fallback?: Screen; force?: boolean }) => {
    if (options?.force || isScreenshotMode) {
      setCurrentScreen(screen)
      return
    }

    // Monetization guard: non-premium users have limited custom workout creations.
    // Allow editing existing workouts even if the creation cap is reached.
    if (screen === 'workout-builder' && !selectedWorkout) {
      const usageCount = featureUsage['custom-workouts']
      const hasUsageSnapshot = typeof usageCount === 'number'
      const access = canAccessFeature(currentUser, 'custom-workouts', usageCount)
      if (hasUsageSnapshot && !access.canAccess) {
        analytics.track('navigation_blocked', {
          from: currentScreen,
          to: screen,
          redirectTo: 'settings',
          reason: 'premium-feature-locked',
          feature: 'custom-workouts',
        })
        setNavigationBlockNotice(access.upgradePrompt ?? 'Upgrade to Premium to create more workouts.')
        setCurrentScreen('settings')
        return
      }
    }

    const decision = resolveNavigation({
      from: currentScreen,
      to: screen,
      fallback: options?.fallback,
      context: navigationContext,
    })

    if (decision.blocked) {
      console.debug(
        `[navigation] blocked ${currentScreen} -> ${screen} (${decision.reason}); redirected to ${decision.screen}`
      )
      analytics.track('navigation_blocked', {
        from: currentScreen,
        to: screen,
        redirectTo: decision.screen,
        reason: decision.reason ?? 'unknown',
      })

      if (decision.reason === 'active-session-lock') {
        setNavigationBlockNotice('Finish or end your active workout first.')
      }

      if (decision.reason === 'invalid-transition') {
        setNavigationError({
          message: 'Navigation state conflict detected.',
          details: `Blocked transition: ${currentScreen} -> ${screen}`,
        })
        setCurrentScreen('navigation-not-set')
        return
      }
    }

    if (decision.screen !== currentScreen) {
      setCurrentScreen(decision.screen)
    }
  }, [currentScreen, navigationContext, isScreenshotMode, selectedWorkout, currentUser, featureUsage])

  const goBack = useCallback((fallback: Screen = 'home') => {
    const previous = navigationHistoryRef.current.pop()
    const target = previous ?? fallback
    if (target === currentScreen) return

    skipNextHistoryPushRef.current = true
    navigateTo(target, { fallback })
  }, [currentScreen, navigateTo])

  const resetNavigationTo = useCallback((screen: Screen) => {
    navigationHistoryRef.current = []
    skipNextHistoryPushRef.current = true
    navigateTo(screen, { force: true, fallback: screen })
  }, [navigateTo])

  const reconcileSessionRuntime = useCallback((source: 'foreground' | 'hydrate') => {
    if (isScreenshotMode || typeof window === 'undefined' || !hasHydratedRef.current) return

    const normalized = normalizeSessionRuntimeState({
      screen: currentScreen,
      sessionStartTime,
      pausedTime,
      sessionPaused,
      pauseStartedAt,
      restTimerEndsAt,
      restTimerDuration,
    })

    const hasChanges = (
      normalized.screen !== currentScreen
      || normalized.sessionStartTime !== sessionStartTime
      || normalized.pausedTime !== pausedTime
      || normalized.sessionPaused !== sessionPaused
      || normalized.pauseStartedAt !== pauseStartedAt
      || normalized.restTimerEndsAt !== restTimerEndsAt
      || normalized.restTimerDuration !== restTimerDuration
    )

    if (!hasChanges) return

    console.debug(
      `[SessionRuntime] Reconciled after ${source}: ${normalized.reason ?? 'state-normalized'}`,
    )

    if (normalized.screen !== currentScreen) setCurrentScreen(normalized.screen)
    if (normalized.sessionStartTime !== sessionStartTime) setSessionStartTime(normalized.sessionStartTime)
    if (normalized.pausedTime !== pausedTime) setPausedTime(normalized.pausedTime)
    if (normalized.sessionPaused !== sessionPaused) setSessionPaused(normalized.sessionPaused)
    if (normalized.pauseStartedAt !== pauseStartedAt) setPauseStartedAt(normalized.pauseStartedAt)
    if (normalized.restTimerEndsAt !== restTimerEndsAt) setRestTimerEndsAt(normalized.restTimerEndsAt)
    if (normalized.restTimerDuration !== restTimerDuration) setRestTimerDuration(normalized.restTimerDuration)
  }, [
    currentScreen,
    isScreenshotMode,
    pauseStartedAt,
    pausedTime,
    restTimerDuration,
    restTimerEndsAt,
    sessionPaused,
    sessionStartTime,
  ])

  const queueContentInvalidation = useCallback((reason: string) => {
    // Coalesce bursts of realtime events (pipelines can insert many rows).
    pendingContentInvalidationRef.current = true

    if (contentRealtimeDebounceRef.current) return
    contentRealtimeDebounceRef.current = setTimeout(() => {
      contentRealtimeDebounceRef.current = null
      if (!pendingContentInvalidationRef.current) return
      pendingContentInvalidationRef.current = false

      console.debug('[realtime] content invalidated:', reason)
      drillsService.clearCache()
      athletesService.clearCache()
      setContentDataVersion((v) => v + 1)
    }, 350)
  }, [])

  const subscriptionRequiredAt = useMemo(
    () => getSubscriptionRequiredAt(currentUser?.firstActiveAt, currentUser?.createdAt),
    [currentUser?.firstActiveAt, currentUser?.createdAt]
  )

  useEffect(() => {
    if (!currentUser || isScreenshotMode) return
    if (currentUser.onboardingCompleted !== true) return
    if (currentUser.firstActiveAt) return

    const userId = currentUser.id
    if (firstActiveSyncUserRef.current === userId) return
    firstActiveSyncUserRef.current = userId

    void (async () => {
      try {
        const firstActiveAt = await supabaseService.setFirstActiveIfMissing()
        if (!firstActiveAt) return
        setCurrentUser((prev) => (
          prev && prev.id === userId
            ? { ...prev, firstActiveAt }
            : prev
        ))
      } catch (error) {
        console.debug('Failed to set first_active_at:', error)
        firstActiveSyncUserRef.current = null
      }
    })()
  }, [currentUser, isScreenshotMode])

  useEffect(() => {
    if (!currentUser || isScreenshotMode) {
      setFeatureUsage({})
      return
    }

    let cancelled = false

    const loadFeatureUsage = async () => {
      try {
        const [customWorkoutUsage, learningPathUsage] = await Promise.all([
          supabaseService.getFeatureUsage('custom-workouts'),
          supabaseService.getLearningPathUsage(),
        ])
        if (cancelled) return
        setFeatureUsage((prev) => ({
          ...prev,
          'custom-workouts': customWorkoutUsage,
          'learning-paths': learningPathUsage,
        }))
      } catch (error) {
        console.debug('Failed to load feature usage counters:', error)
      }
    }

    void loadFeatureUsage()

    return () => {
      cancelled = true
    }
  }, [currentUser, isScreenshotMode])

  const shouldShowMandatorySubscriptionGate = useMemo(() => {
    if (isScreenshotMode) return false
    if (!currentUser) return false
    if (currentUser.onboardingCompleted !== true) return false
    if (currentUser.isPremium) return false
    if (!subscriptionRequiredAt) return false
    return subscriptionGateNow >= subscriptionRequiredAt
  }, [
    currentUser,
    isScreenshotMode,
    subscriptionRequiredAt,
    subscriptionGateNow,
  ])

  const refreshSubscriptionState = useCallback(async ({ poll }: { poll: boolean }): Promise<boolean> => {
    const authState = await supabaseService.getAuthState()
    if (authState.isAuthenticated && authState.user) {
      setCurrentUser(authState.user)
      const isPremium = authState.user.isPremium === true
      if (isPremium || !poll) {
        return isPremium
      }
    } else if (!poll) {
      return false
    }

    const isPremiumConfirmed = await stripeService.pollForSubscriptionStatus(4, 1500)
    if (!isPremiumConfirmed) {
      return false
    }

    const refreshedAuthState = await supabaseService.getAuthState()
    if (refreshedAuthState.isAuthenticated && refreshedAuthState.user) {
      setCurrentUser(refreshedAuthState.user)
      return refreshedAuthState.user.isPremium === true
    }

    return false
  }, [])

  const handleStartMandatorySubscription = useCallback(async () => {
    if (!currentUser) return
    setMandatorySubscriptionError(null)
    setIsStartingMandatorySubscription(true)
    pendingBillingReturnRef.current = 'checkout'
    analytics.track('subscription_checkout_started', { source: 'mandatory-gate' })
    try {
      await stripeService.subscribeToPremium()
    } catch (error) {
      pendingBillingReturnRef.current = null
      analytics.track('subscription_checkout_failed', {
        source: 'mandatory-gate',
        reason: 'launch-failed',
      })
      const message = error instanceof Error
        ? error.message
        : 'Unable to start subscription checkout right now.'
      setMandatorySubscriptionError(message)
    } finally {
      setIsStartingMandatorySubscription(false)
      setSubscriptionGateNow(Date.now())
    }
  }, [currentUser])

  const handleRefreshMandatorySubscription = useCallback(async () => {
    setMandatorySubscriptionError(null)
    setIsRefreshingMandatorySubscription(true)
    try {
      const isPremiumConfirmed = await refreshSubscriptionState({ poll: true })
      if (!isPremiumConfirmed) {
        analytics.track('subscription_checkout_failed', {
          source: 'mandatory-gate',
          reason: 'not-active-after-refresh',
        })
        setMandatorySubscriptionError('Subscription not active yet. Complete checkout, then try again.')
        return
      }
    } catch (error) {
      analytics.track('subscription_status_refresh_failed', {
        source: 'mandatory-gate',
        flow: 'checkout',
        reason: 'refresh-failed',
      })
      const message = error instanceof Error
        ? error.message
        : 'Unable to refresh subscription status.'
      setMandatorySubscriptionError(message)
    } finally {
      setIsRefreshingMandatorySubscription(false)
      setSubscriptionGateNow(Date.now())
    }
  }, [refreshSubscriptionState])

  useEffect(() => {
    setSubscriptionGateNow(Date.now())
  }, [currentUser?.id, currentUser?.isPremium, currentUser?.createdAt, currentUser?.onboardingCompleted])

  useEffect(() => {
    if (isScreenshotMode || hasTrackedAppOpenedRef.current) return
    if (!loadingComplete) return

    hasTrackedAppOpenedRef.current = true
    analytics.track('app_opened', {
      authenticated: !!currentUser,
      onboardingCompleted: currentUser?.onboardingCompleted === true,
      screen: currentScreen,
    })
  }, [currentScreen, currentUser, isScreenshotMode, loadingComplete])

  useEffect(() => {
    if (!currentUser || currentUser.isPremium || currentUser.onboardingCompleted !== true || isScreenshotMode) {
      return
    }

    const interval = setInterval(() => {
      setSubscriptionGateNow(Date.now())
    }, 60000)

    return () => clearInterval(interval)
  }, [currentUser, isScreenshotMode])

  useEffect(() => {
    if (!currentUser || currentUser.isPremium || currentUser.onboardingCompleted !== true || isScreenshotMode) {
      return
    }
    if (!subscriptionRequiredAt) return

    const msUntilRequired = subscriptionRequiredAt - Date.now()
    if (msUntilRequired <= 0) {
      setSubscriptionGateNow(Date.now())
      return
    }

    const timeout = setTimeout(() => {
      setSubscriptionGateNow(Date.now())
    }, msUntilRequired)

    return () => clearTimeout(timeout)
  }, [currentUser, isScreenshotMode, subscriptionRequiredAt])

  useEffect(() => {
    const previous = lastHistoryScreenRef.current
    if (previous === currentScreen) return

    if (skipNextHistoryPushRef.current) {
      skipNextHistoryPushRef.current = false
    } else {
      navigationHistoryRef.current.push(previous)
      if (navigationHistoryRef.current.length > 120) {
        navigationHistoryRef.current = navigationHistoryRef.current.slice(-120)
      }
    }

    lastHistoryScreenRef.current = currentScreen
  }, [currentScreen])

  const getProgramIndexForDay = useCallback((dayIndex: number) => {
    let plannedCount = 0
    for (let i = 0; i < dayIndex; i++) {
      if (weekProgress[i]?.planned) plannedCount++
    }
    return plannedCount
  }, [weekProgress])

  const getSessionForDay = useCallback((dayIndex: number) => {
    if (!generatedProgram || dayIndex < 0) return null
    const programIndex = getProgramIndexForDay(dayIndex)
    return generatedProgram[programIndex] ?? null
  }, [generatedProgram, getProgramIndexForDay])

  const missedSessionRecovery = useMemo(() => {
    return getMissedSessionRecoveryState({
      weekProgress,
      todayIndex: getTodayIndex(),
      lastWorkoutDate,
      currentStreak,
    })
  }, [weekProgress, lastWorkoutDate, currentStreak])

  const nextPlannedDayIndex = missedSessionRecovery.nextSessionDayIndex
  const missedPlannedSessionCount = missedSessionRecovery.overdueDayIndexes.length
  const carryOverSessionDayLabel = missedSessionRecovery.carryOverDayIndex !== null
    ? (weekProgress[missedSessionRecovery.carryOverDayIndex]?.day ?? null)
    : null

  const programDayIndex = (sessionStartTime && sessionSource === 'program')
    ? currentDayIndex
    : nextPlannedDayIndex

  const programSession = programDayIndex >= 0 ? getSessionForDay(programDayIndex) : null
  const currentSession = sessionOverride ?? programSession

  // "Workout instance" overrides (AAA-style): edits apply to the current calendar day only.
  const todayKey = getLocalDateKey()
  const todayProgramOverride = useMemo(() => {
    return todayOverridesByDate[todayKey] ?? null
  }, [todayOverridesByDate, todayKey])

  const hasTodayBaseChanged = useMemo(() => {
    if (!todayProgramOverride) return false
    const currentFingerprint = fingerprintSession(programSession)
    if (!todayProgramOverride.baseFingerprint || !currentFingerprint) return false
    return todayProgramOverride.baseFingerprint !== currentFingerprint
  }, [todayProgramOverride, programSession])

  const effectiveProgramSession = useMemo((): Session | null => {
    if (!programSession) return null
    if (!todayProgramOverride) return programSession

    const removed = new Set(todayProgramOverride.removedExerciseIds ?? [])
    const combined = [
      ...(programSession.exercises ?? []),
      ...(todayProgramOverride.addedExercises ?? []),
    ]

    // Remove excluded exercises and dedupe by id (keep the first occurrence).
    const seen = new Set<string>()
    let exercises = combined.filter((ex) => {
      if (!ex?.id) return false
      if (removed.has(ex.id)) return false
      if (seen.has(ex.id)) return false
      seen.add(ex.id)
      return true
    })

    // Apply per-exercise edits (sets/reps/rest/notes overrides).
    const edits = (todayProgramOverride.exerciseEdits as Record<string, Partial<Exercise>> | undefined) ?? {}
    exercises = exercises.map((ex) => {
      const patch = edits[ex.id]
      if (!patch) return ex
      // Defensive: older localStorage payloads may contain nulls for optional fields.
      const sanitized: Record<string, unknown> = { ...patch }
      if ((sanitized as any).reps === null) delete (sanitized as any).reps
      if ((sanitized as any).duration === null) delete (sanitized as any).duration
      if ((sanitized as any).notes === null) delete (sanitized as any).notes
      return { ...ex, ...(sanitized as Partial<Exercise>) }
    })

    // Apply user-defined ordering (AAA behavior). If not set, fall back to base order + appended additions.
    const baseOrderSeed = [
      ...(programSession.exercises ?? []).map((e) => e.id),
      ...(todayProgramOverride.addedExercises ?? []).map((e) => e.id),
    ]
    const requestedOrder = Array.isArray(todayProgramOverride.exerciseOrderIds) && todayProgramOverride.exerciseOrderIds.length > 0
      ? todayProgramOverride.exerciseOrderIds
      : baseOrderSeed

    const idsInList = new Set(exercises.map((e) => e.id))
    const requestedInList = requestedOrder.filter((id) => idsInList.has(id))
    const requestedSet = new Set(requestedInList)
    const missing = exercises.map((e) => e.id).filter((id) => !requestedSet.has(id))
    const finalOrder = [...requestedInList, ...missing]
    const indexById = new Map<string, number>()
    finalOrder.forEach((id, i) => indexById.set(id, i))

    exercises = [...exercises].sort((a, b) => {
      const ai = indexById.get(a.id) ?? 0
      const bi = indexById.get(b.id) ?? 0
      return ai - bi
    })

    return {
      ...programSession,
      exercises,
      duration: estimateDurationMinutes(exercises),
    }
  }, [programSession, todayProgramOverride])

  const sessionAdjustmentMode = normalizeSessionAdjustmentMode(todayProgramOverride?.readinessMode)

  const adjustedProgramSession = useMemo(() => {
    return adjustSessionForReadiness({
      session: effectiveProgramSession,
      mode: sessionAdjustmentMode,
      sport: selectedSport,
    })
  }, [effectiveProgramSession, sessionAdjustmentMode, selectedSport])

  const displaySession = sessionOverride ?? adjustedProgramSession

  const todayWorkoutExerciseIds = useMemo(() => {
    const ids = new Set<string>()
    const session = adjustedProgramSession
    if (session?.exercises?.length) {
      session.exercises.forEach((ex) => {
        if (ex?.id) ids.add(ex.id)
      })
    }
    return ids
  }, [adjustedProgramSession])

  const todayActiveDrillIds = useMemo(() => {
    if (!todayProgramOverride) return []
    const removed = new Set(todayProgramOverride.removedDrillIds ?? [])
    const ids = (todayProgramOverride.addedDrillIds ?? []).filter((id) => id && !removed.has(id))
    return Array.from(new Set(ids))
  }, [todayProgramOverride])

  const todayActiveDrillIdSet = useMemo(() => new Set(todayActiveDrillIds), [todayActiveDrillIds])

  const todayRemovedDrillIds = useMemo(() => {
    if (!todayProgramOverride) return []
    const added = new Set(todayProgramOverride.addedDrillIds ?? [])
    const ids = (todayProgramOverride.removedDrillIds ?? []).filter((id) => id && added.has(id))
    return Array.from(new Set(ids))
  }, [todayProgramOverride])

  const todayDrillDoneIdSet = useMemo(() => {
    return new Set(todayProgramOverride?.drillDoneIds ?? [])
  }, [todayProgramOverride])

  const todayDrillsLoggedAt = todayProgramOverride?.drillsLoggedAt ?? null

  const todayRemovedExercises = useMemo(() => {
    if (!programSession || !todayProgramOverride) return []
    const removed = new Set(todayProgramOverride.removedExerciseIds ?? [])
    const candidates = [
      ...(programSession.exercises ?? []),
      ...(todayProgramOverride.addedExercises ?? []),
    ]
    const seen = new Set<string>()
    const list: Exercise[] = []
    for (const ex of candidates) {
      if (!ex?.id) continue
      if (!removed.has(ex.id)) continue
      if (seen.has(ex.id)) continue
      seen.add(ex.id)
      list.push(ex)
    }
    return list
  }, [programSession, todayProgramOverride])

  const hasTodayOverrides = useMemo(() => {
    if (!todayProgramOverride) return false
    return (
      (todayProgramOverride.addedExercises?.length ?? 0) > 0
      || (todayProgramOverride.removedExerciseIds?.length ?? 0) > 0
      || (todayProgramOverride.exerciseOrderIds?.length ?? 0) > 0
      || (Object.keys(todayProgramOverride.exerciseEdits ?? {}).length) > 0
      || (todayProgramOverride.addedDrillIds?.length ?? 0) > 0
      || (todayProgramOverride.removedDrillIds?.length ?? 0) > 0
      || (todayProgramOverride.drillDoneIds?.length ?? 0) > 0
      || !!todayProgramOverride.drillsLoggedAt
      || !!sessionAdjustmentMode
    )
  }, [todayProgramOverride, sessionAdjustmentMode])

  // Calculate completed and planned sessions
  const completedSessions = weekProgress.filter(d => d.planned && d.completed).length
  const plannedSessions = weekProgress.filter(d => d.planned).length

  const derivedTotalVolume = useMemo(() => {
    if (!currentSession) return 0
    let total = 0
    for (const exercise of currentSession.exercises) {
      const doneFlags = setProgressByExercise[exercise.id] ?? []
      const weights = currentSessionWeights[exercise.id] ?? []
      const reps = exercise.reps || 1
      for (let i = 0; i < exercise.sets; i++) {
        if (!doneFlags[i]) continue
        const w = weights[i] ?? 0
        if (w > 0) total += w * reps
      }
    }
    return total
  }, [currentSession, setProgressByExercise, currentSessionWeights])

  useEffect(() => {
    if (!sessionStartTime) return
    setTotalVolume(derivedTotalVolume)
  }, [derivedTotalVolume, sessionStartTime])

  // Load persisted state
  useEffect(() => {
    const hydrateState = async () => {
      if (isScreenshotMode) {
        hasHydratedRef.current = true
        return
      }
      if (typeof window === 'undefined') return
      try {
        // Check auth state FIRST - if not authenticated, stay on auth-login
        const authState = await supabaseService.getAuthState()
        if (!authState.isAuthenticated || !authState.user) {
          // User is not logged in - keep them on auth-login screen
          setCurrentUser(null)
          setFeatureUsage({})
          setFavoriteExercises(new Set())
          setCompletedExercises(new Set())
          setTodayOverridesByDate({})
          setSetProgressByExercise({})
          setCurrentSessionWeights({})
          setCurrentSessionPRs([])
          setTotalVolume(0)
          setLoadingContext('default')
          setCurrentScreen('auth-login')
          hasHydratedRef.current = true
          return
        }

        // User is authenticated - set current user and restore app state
        setCurrentUser(authState.user)
        if (authState.user.sport) setSelectedSport(authState.user.sport)
        if (authState.user.trainingDays) setTrainingDays(authState.user.trainingDays)
        if (authState.user.equipment !== undefined) setEquipment(authState.user.equipment ?? null)
        if (authState.user.weightUnit) setWeightUnit(authState.user.weightUnit)
        if (authState.user.experienceLevel) setUserExperienceLevel(authState.user.experienceLevel)
        if (authState.user.bodyweightKg !== undefined) setBodyweightKg(authState.user.bodyweightKg ?? null)
        if (authState.user.primaryGoal) setPrimaryGoal(authState.user.primaryGoal)
        if (authState.user.combatSessionsPerWeek !== undefined) setCombatSessionsPerWeek(authState.user.combatSessionsPerWeek ?? 0)
        if (authState.user.sessionMinutes !== undefined) setSessionMinutes(authState.user.sessionMinutes ?? 45)
        if (authState.user.injuryNotes !== undefined) setInjuryNotes(authState.user.injuryNotes ?? '')

        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
          // No saved state but user is authenticated - reset to defaults
          setGeneratedProgram(null)
          setCurrentStreak(0)
          setLongestStreak(0)
          setWeekProgress(DEFAULT_WEEK_PROGRESS)
          setSessionHistory([])
          setActivityLogs([])
          setTodayOverridesByDate({})
          setSetProgressByExercise({})
          setCurrentSessionWeights({})
          setCurrentSessionPRs([])
          setTotalVolume(0)
          setLoadingContext('default')
          const needsOnboarding = authState.user.onboardingCompleted !== true
          setCurrentScreen(prev => {
		            const newScreen = resolveHydratedScreenWithoutStorage(prev, needsOnboarding)
            return newScreen
          })
          hasHydratedRef.current = true
          return
        }
        const data = JSON.parse(stored)

        // Restore screen, but never restore to auth screens for authenticated users
        const savedScreen = data.currentScreen ?? 'home'
        const needsOnboarding = authState.user.onboardingCompleted !== true
	        const restoreDecision = resolvePersistedHydratedScreen(savedScreen, data, needsOnboarding)
	        if (restoreDecision.navigationError) {
	          setNavigationError(restoreDecision.navigationError)
	          setCurrentScreen(restoreDecision.screen)
        } else {
          setNavigationError(null)
	          if (
	            restoreDecision.requestedScreen
	            && restoreDecision.reason
	            && restoreDecision.screen !== restoreDecision.requestedScreen
	          ) {
	            console.debug(
	              `[Hydration] Redirecting restored screen ${restoreDecision.requestedScreen} -> ${restoreDecision.screen} (${restoreDecision.reason})`
	            )
          }

          const normalizedRuntime = normalizeSessionRuntimeState({
	            screen: restoreDecision.screen,
            sessionStartTime: data.sessionStartTime ?? null,
            pausedTime: data.pausedTime ?? 0,
            sessionPaused: data.sessionPaused ?? false,
            pauseStartedAt: data.pauseStartedAt ?? null,
            restTimerEndsAt: data.restTimerEndsAt ?? null,
            restTimerDuration: data.restTimerDuration ?? 0,
          })

	          if (normalizedRuntime.screen !== restoreDecision.screen || normalizedRuntime.reason) {
            console.debug(
	              `[Hydration] Normalized session runtime for ${restoreDecision.screen} -> ${normalizedRuntime.screen} (${normalizedRuntime.reason ?? 'state-normalized'})`
            )
          }

          setCurrentScreen(normalizedRuntime.screen)

          setCurrentExerciseIndex(data.currentExerciseIndex ?? 0)
          setCurrentSet(data.currentSet ?? 1)
          setSessionStartTime(normalizedRuntime.sessionStartTime)
          setPausedTime(normalizedRuntime.pausedTime)
          setRestTimerEndsAt(normalizedRuntime.restTimerEndsAt)
          setRestTimerDuration(normalizedRuntime.restTimerDuration)
          setSessionPaused(normalizedRuntime.sessionPaused)
          setPauseStartedAt(normalizedRuntime.pauseStartedAt)
        }

        setGeneratedProgram(data.generatedProgram ?? null)
        setCurrentDayIndex(data.currentDayIndex ?? 0)
        setSessionOverride(data.sessionOverride ?? null)
        setSessionSource(data.sessionSource ?? null)
        setTodayOverridesByDate(data.todayOverridesByDate ?? {})

        setSetProgressByExercise(data.setProgressByExercise ?? {})
        setWeekProgress(data.weekProgress ?? DEFAULT_WEEK_PROGRESS)
        setCurrentStreak(data.currentStreak ?? 0)
        setLongestStreak(data.longestStreak ?? 0)
        setLastWorkoutDate(data.lastWorkoutDate ?? null)
        setSessionHistory(data.sessionHistory ?? [])
        setMissedSessionExcuse(data.missedSessionExcuse ?? null)
        setCurrentSessionWeights(data.currentSessionWeights ?? {})
        setCurrentSessionPRs(data.currentSessionPRs ?? [])
        setTotalVolume(data.totalVolume ?? 0)
        setActivityLogs(data.activityLogs ?? [])
        setSelectedLearningPath(data.selectedLearningPath ?? null)
        setLearningPathProgress(data.learningPathProgress ?? {})

        // Intake: only apply localStorage values if the profile doesn't have them yet.
        if (!authState.user.experienceLevel && data.userExperienceLevel) setUserExperienceLevel(data.userExperienceLevel)
        if (authState.user.bodyweightKg === undefined && data.bodyweightKg !== undefined) setBodyweightKg(data.bodyweightKg)
        if (!authState.user.primaryGoal && data.primaryGoal) setPrimaryGoal(data.primaryGoal)
        if (authState.user.combatSessionsPerWeek === undefined && data.combatSessionsPerWeek !== undefined) {
          setCombatSessionsPerWeek(data.combatSessionsPerWeek)
        }
        if (authState.user.sessionMinutes === undefined && data.sessionMinutes !== undefined) setSessionMinutes(data.sessionMinutes)
        if (authState.user.injuryNotes === undefined && typeof data.injuryNotes === 'string') setInjuryNotes(data.injuryNotes)

	        if (restoreDecision.showResumePrompt) {
          setShowResumePrompt(true)
        }
      } catch (error) {
        console.debug('Failed to hydrate state:', error)
      } finally {
        hasHydratedRef.current = true
      }
    }

    hydrateState()
  }, [isScreenshotMode])

  useEffect(() => {
    if (isScreenshotMode || typeof window === 'undefined') return

    const maybeRefreshSubscriptionOnReturn = () => {
      const pendingBillingReturn = pendingBillingReturnRef.current
      if (!pendingBillingReturn) return

      pendingBillingReturnRef.current = null

      void refreshSubscriptionState({ poll: pendingBillingReturn === 'checkout' })
        .then((isPremium) => {
          if (pendingBillingReturn === 'checkout') {
            analytics.track('subscription_checkout_returned', {
              source: 'visibility',
              premiumActive: isPremium,
            })

            if (isPremium) {
              analytics.track('subscription_checkout_completed', { source: 'visibility' })
            }

            return
          }

          analytics.track('subscription_portal_returned', {
            source: 'visibility',
            premiumActive: isPremium,
          })
        })
        .catch((error) => {
          console.debug('Failed to refresh subscription status on return:', error)
          if (pendingBillingReturn === 'checkout') {
            analytics.track('subscription_checkout_failed', {
              source: 'visibility',
              reason: 'refresh-failed',
            })
          } else {
            analytics.track('subscription_portal_failed', {
              source: 'visibility',
              reason: 'refresh-failed',
            })
          }

          analytics.track('subscription_status_refresh_failed', {
            source: 'visibility',
            flow: pendingBillingReturn,
            reason: 'refresh-failed',
          })
        })
        .finally(() => {
          setSubscriptionGateNow(Date.now())
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reconcileSessionRuntime('foreground')
        maybeRefreshSubscriptionOnReturn()
      }
    }

    const handleWindowResume = () => {
      reconcileSessionRuntime('foreground')
      maybeRefreshSubscriptionOnReturn()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowResume)
    window.addEventListener('pageshow', handleWindowResume)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowResume)
      window.removeEventListener('pageshow', handleWindowResume)
    }
  }, [isScreenshotMode, reconcileSessionRuntime, refreshSubscriptionState])

  // Deep link handler for iOS auth callbacks (email verification, password reset)
  useEffect(() => {
    if (isScreenshotMode) return

    const cleanup = initDeepLinkHandler(async (type) => {

      // Refresh auth state after deep link auth
      const authState = await supabaseService.getAuthState()

      if (authState.isAuthenticated && authState.user) {
        setCurrentUser(authState.user)

        if (type === 'email_verified') {
          // Email verified - proceed to app
          setPendingVerificationEmail(null)
          if (authState.user.onboardingCompleted !== true) {
            resetNavigationTo('onboarding-sport')
          } else {
            resetNavigationTo('loading')
          }
        } else if (type === 'password_reset') {
          // Password was reset - user is now logged in
          resetNavigationTo('loading')
        } else {
          // Generic auth - go to home or onboarding
          if (authState.user.onboardingCompleted !== true) {
            resetNavigationTo('onboarding-sport')
          } else {
            resetNavigationTo('loading')
          }
        }
      }
    }, async (status: SubscriptionReturnStatus) => {
      pendingBillingReturnRef.current = null

      if (status === 'canceled') {
        analytics.track('subscription_checkout_canceled', { source: 'deeplink' })
        setSubscriptionGateNow(Date.now())
        return
      }

      setMandatorySubscriptionError(null)

      try {
        const isPremium = await refreshSubscriptionState({
          poll: shouldPollSubscriptionStatusAfterReturn(status),
        })

        if (status === 'portal') {
          analytics.track('subscription_portal_returned', {
            source: 'deeplink',
            premiumActive: isPremium,
          })
        } else {
          analytics.track('subscription_checkout_returned', {
            source: 'deeplink',
            premiumActive: isPremium,
          })

          if (isPremium) {
            analytics.track('subscription_checkout_completed', { source: 'deeplink' })
          }
        }

        if (status === 'success' && !isPremium) {
          analytics.track('subscription_checkout_failed', {
            source: 'deeplink',
            reason: 'not-active-after-return',
          })
          setMandatorySubscriptionError('Subscription not active yet. Complete checkout, then try again.')
        }
      } catch (error) {
        analytics.track('subscription_status_refresh_failed', {
          source: 'deeplink',
          flow: status,
          reason: 'refresh-failed',
        })

        if (status === 'success') {
          analytics.track('subscription_checkout_failed', {
            source: 'deeplink',
            reason: 'refresh-failed',
          })
          const message = error instanceof Error
            ? error.message
            : 'Unable to refresh subscription status.'
          setMandatorySubscriptionError(message)
        } else if (status === 'portal') {
          analytics.track('subscription_portal_failed', {
            source: 'deeplink',
            reason: 'refresh-failed',
          })
        }
      } finally {
        setSubscriptionGateNow(Date.now())
      }
    })

    return cleanup
  }, [isScreenshotMode, refreshSubscriptionState, resetNavigationTo])

  // Supabase Realtime: invalidate content caches and refresh screens when pipeline publishes new data.
  useEffect(() => {
    if (isScreenshotMode) return

    const channel = supabase.channel('realtime-content')
    const handler = (_payload: any) => {
      queueContentInvalidation('content')
    }

    const tables = [
      'athletes',
      'athlete_exercises',
      'exercises',
      'exercise_recommendations',
      'published_records',
      'drills',
      'routines',
      'routine_drills',
      'learning_paths',
      'learning_path_drills',
    ]

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        handler
      )
    })

    channel.subscribe((status) => {
      console.debug('[realtime] content channel:', status)
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isScreenshotMode, queueContentInvalidation])

  // Supabase Realtime: keep user-specific state in sync across devices.
  useEffect(() => {
    if (!currentUser?.id || isScreenshotMode) return

    const userId = currentUser.id
    const channel = supabase.channel(`realtime-user-${userId}`)

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workout_day_overrides', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        const eventType = String(payload?.eventType ?? '')
        const row = payload?.new ?? payload?.old ?? null
        const workoutDate = row?.workout_date ? String(row.workout_date) : null
        if (!workoutDate) return

        if (eventType === 'DELETE') {
          setTodayOverridesByDate((prev) => {
            if (!prev[workoutDate]) return prev
            const next = { ...prev }
            delete next[workoutDate]
            return next
          })
          return
        }

        const raw = row?.data
        const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : (typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString())

        const normalized: TodayWorkoutOverride = {
          baseSessionId: raw?.baseSessionId ?? null,
          baseProgramDayIndex: typeof raw?.baseProgramDayIndex === 'number' ? raw.baseProgramDayIndex : null,
          baseFingerprint: raw?.baseFingerprint ?? null,
          addedExercises: Array.isArray(raw?.addedExercises) ? raw.addedExercises : [],
          removedExerciseIds: Array.isArray(raw?.removedExerciseIds) ? raw.removedExerciseIds : [],
          exerciseOrderIds: Array.isArray(raw?.exerciseOrderIds) ? raw.exerciseOrderIds : [],
          exerciseEdits: (raw?.exerciseEdits && typeof raw.exerciseEdits === 'object') ? raw.exerciseEdits : {},
          addedDrillIds: Array.isArray(raw?.addedDrillIds) ? raw.addedDrillIds : [],
          removedDrillIds: Array.isArray(raw?.removedDrillIds) ? raw.removedDrillIds : [],
          drillDoneIds: Array.isArray(raw?.drillDoneIds) ? raw.drillDoneIds : [],
          drillsLoggedAt: typeof raw?.drillsLoggedAt === 'string' ? raw.drillsLoggedAt : null,
          readinessMode: normalizeSessionAdjustmentMode(raw?.readinessMode),
          updatedAt,
        }

        setTodayOverridesByDate((prev) => {
          const local = prev[workoutDate]
          if (!local) return { ...prev, [workoutDate]: normalized }
          const localTs = Date.parse(local.updatedAt ?? '')
          const remoteTs = Date.parse(normalized.updatedAt ?? '')
          if (Number.isFinite(remoteTs) && (!Number.isFinite(localTs) || remoteTs > localTs)) {
            return { ...prev, [workoutDate]: normalized }
          }
          return prev
        })
      }
    )

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'exercise_favorites', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        const eventType = String(payload?.eventType ?? '')
        const row = payload?.new ?? payload?.old ?? null
        const exerciseId = row?.exercise_id ? String(row.exercise_id) : null
        if (!exerciseId) return

        setFavoriteExercises((prev) => {
          const next = new Set(prev)
          if (eventType === 'INSERT') next.add(exerciseId)
          if (eventType === 'DELETE') next.delete(exerciseId)
          return next
        })
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'exercise_completions', filter: `user_id=eq.${userId}` },
      (payload: any) => {
        const row = payload?.new ?? null
        const exerciseId = row?.exercise_id ? String(row.exercise_id) : null
        if (!exerciseId) return
        setCompletedExercises((prev) => {
          const next = new Set(prev)
          next.add(exerciseId)
          return next
        })
      }
    )

    // AAA Pattern: Realtime profile updates for instant subscription status changes
    // When webhook updates is_premium, subscription_status, etc., app reflects immediately
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload: any) => {
        const row = payload?.new ?? null
        if (!row) return

        // Update currentUser with the new profile data from database
        setCurrentUser((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            // Subscription fields (updated by Stripe webhook)
            isPremium: row.is_premium ?? prev.isPremium,
            firstActiveAt: row.first_active_at ?? prev.firstActiveAt,
            stripeCustomerId: row.stripe_customer_id ?? prev.stripeCustomerId,
            subscriptionStatus: row.subscription_status ?? prev.subscriptionStatus,
            subscriptionPeriodEnd: row.subscription_period_end ?? prev.subscriptionPeriodEnd,
            // Profile fields (in case user updates from another device)
            displayName: row.display_name ?? prev.displayName,
            bio: row.bio ?? prev.bio,
            avatarUrl: row.avatar_url ?? prev.avatarUrl,
            sport: row.sport ?? prev.sport,
            trainingDays: row.training_days ?? prev.trainingDays,
            equipment: row.equipment ?? prev.equipment,
            weightUnit: row.weight_unit ?? prev.weightUnit,
            experienceLevel: row.experience_level ?? prev.experienceLevel,
            bodyweightKg: row.bodyweight_kg ?? prev.bodyweightKg,
            primaryGoal: row.primary_goal ?? prev.primaryGoal,
            combatSessionsPerWeek: row.combat_sessions_per_week ?? prev.combatSessionsPerWeek,
            sessionMinutes: row.session_minutes ?? prev.sessionMinutes,
            injuryNotes: row.injury_notes ?? prev.injuryNotes,
            onboardingCompleted: row.onboarding_completed ?? prev.onboardingCompleted,
          }
        })
      }
    )

    channel.subscribe((status) => {
      console.debug('[realtime] user channel:', status)
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUser?.id, currentUser?.onboardingCompleted, isScreenshotMode])

  // Persist state
  useEffect(() => {
    if (isScreenshotMode || !hasHydratedRef.current || typeof window === 'undefined') return
    const payload = {
      currentScreen,
      selectedSport,
      trainingDays,
      equipment,
      weightUnit,
      userExperienceLevel,
      bodyweightKg,
      primaryGoal,
      combatSessionsPerWeek,
      sessionMinutes,
      injuryNotes,
      generatedProgram,
      currentDayIndex,
      sessionOverride,
      sessionSource,
      todayOverridesByDate,
      currentExerciseIndex,
      currentSet,
      sessionStartTime,
      pausedTime,
      restTimerEndsAt,
      restTimerDuration,
      sessionPaused,
      pauseStartedAt,
      weekProgress,
      currentStreak,
      longestStreak,
      lastWorkoutDate,
      sessionHistory,
      missedSessionExcuse,
      setProgressByExercise,
      currentSessionWeights,
      currentSessionPRs,
      totalVolume,
      activityLogs,
      selectedLearningPath,
      learningPathProgress,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.debug('Failed to persist state:', error)
    }
  }, [
    isScreenshotMode,
    currentScreen,
    selectedSport,
    trainingDays,
    equipment,
    weightUnit,
    userExperienceLevel,
    bodyweightKg,
    primaryGoal,
    combatSessionsPerWeek,
    sessionMinutes,
    injuryNotes,
    generatedProgram,
    currentDayIndex,
    sessionOverride,
    sessionSource,
    todayOverridesByDate,
    currentExerciseIndex,
    currentSet,
    sessionStartTime,
    pausedTime,
    restTimerEndsAt,
    restTimerDuration,
    sessionPaused,
    pauseStartedAt,
    weekProgress,
    currentStreak,
    longestStreak,
    lastWorkoutDate,
    sessionHistory,
    missedSessionExcuse,
    setProgressByExercise,
    currentSessionWeights,
    currentSessionPRs,
    totalVolume,
    activityLogs,
    selectedLearningPath,
    learningPathProgress,
  ])

  useEffect(() => {
    if (sessionStartTime && !sessionSource) {
      setSessionSource('program')
    }
  }, [sessionStartTime, sessionSource])

  useEffect(() => {
    generatedProgramRef.current = generatedProgram
  }, [generatedProgram])

  // Fetch session and activity data from Supabase when user authenticates
  useEffect(() => {
    if (!currentUser || isScreenshotMode) return
    const fallbackSport = currentUser.sport ?? 'wrestling'
    const fallbackDays = currentUser.trainingDays ?? 4
    const fallbackLevel = currentUser.experienceLevel ?? 'beginner'
    const fallbackEquipment = currentUser.equipment ?? null
    const fallbackPrimaryGoal = currentUser.primaryGoal ?? 'balanced'
    const fallbackCombatSessions = currentUser.combatSessionsPerWeek ?? 0
    const fallbackSessionCap = currentUser.sessionMinutes ?? 45

    const fetchSupabaseData = async () => {
      setIsLoadingSupabaseData(true)
      setFavoriteExercises(new Set())
      setCompletedExercises(new Set())
      try {
        const needsOnboarding = currentUser.onboardingCompleted !== true
        if (needsOnboarding) {
          // Don't clear program data if we're in the middle of onboarding
          // (the user may have already generated a program in the equipment step)
          // Only clear if there's no generated program yet
          const inProgressProgram = generatedProgramRef.current
          if (!inProgressProgram || inProgressProgram.length === 0) {
            setProgramId(null)
            setSavedProgramSessions(null)
            setHasProgramChanges(false)
            setProgramMeta(null)
            setWeekProgress(DEFAULT_WEEK_PROGRESS)
          }
          return
        }

        const [
          supabaseSessionLogs,
          supabaseActivityLogs,
          supabaseFavorites,
          supabaseCompletions,
          supabaseTodayOverride,
          supabaseLearningPathProgress,
        ] = await Promise.all([
          supabaseService.getSessionLogs(),
          supabaseService.getActivityLogs(),
          supabaseService.getExerciseFavorites(),
          supabaseService.getExerciseCompletions(),
          supabaseService.getWorkoutDayOverride(todayKey),
          supabaseService.getLearningPathProgress(),
        ])

        // Program + state
        let programSnapshot = await supabaseService.getActiveProgram()
        if (!programSnapshot) {
          const blueprint = generateWeeklyProgram(fallbackSport, fallbackDays, {
            level: fallbackLevel,
            equipment: fallbackEquipment,
            primaryGoal: fallbackPrimaryGoal,
            combatSessionsPerWeek: fallbackCombatSessions,
            sessionMinutes: fallbackSessionCap,
          })
          const sessions = await supabaseService.resolveProgramSessionsToLibraryExercises({
            sport: fallbackSport,
            sessions: blueprint,
            equipment: fallbackEquipment,
          })
          programSnapshot = await supabaseService.createProgram({
            sport: fallbackSport,
            trainingDays: fallbackDays,
            sessions,
            label: 'Original',
          })
        }
        // Defensive: if an older/buggy program exists with empty sessions, regenerate so workouts are runnable.
        if (programSnapshot && programSnapshot.sessions.some((s) => !Array.isArray(s.exercises) || s.exercises.length === 0)) {
          const regenSport = programSnapshot.sport
          const regenDays = programSnapshot.trainingDays
          const blueprint = generateWeeklyProgram(regenSport, regenDays, {
            level: fallbackLevel,
            equipment: fallbackEquipment,
            primaryGoal: fallbackPrimaryGoal,
            combatSessionsPerWeek: fallbackCombatSessions,
            sessionMinutes: fallbackSessionCap,
          })
          const sessions = await supabaseService.resolveProgramSessionsToLibraryExercises({
            sport: regenSport,
            sessions: blueprint,
            equipment: fallbackEquipment,
          })
          programSnapshot = await supabaseService.createProgram({
            sport: regenSport,
            trainingDays: regenDays,
            sessions,
            label: 'Original',
          })
        }

        if (programSnapshot) {
          setProgramId(programSnapshot.programId)
          setGeneratedProgram(programSnapshot.sessions)
          setSavedProgramSessions(programSnapshot.sessions)
          setHasProgramChanges(false)
          setSelectedSport(programSnapshot.sport)
          setTrainingDays(programSnapshot.trainingDays)
          setProgramMeta({
            sport: programSnapshot.sport,
            trainingDays: programSnapshot.trainingDays,
            equipment: fallbackEquipment,
            level: fallbackLevel,
            primaryGoal: fallbackPrimaryGoal,
            combatSessionsPerWeek: fallbackCombatSessions,
            sessionMinutes: fallbackSessionCap,
          })

          const programState = await supabaseService.getProgramState()
          const hasPlannedDays = programState?.some((d) => d && (d as any).planned === true) ?? false
          const isShapeValid = Array.isArray(programState) && programState.length === 7

          if (programState && isShapeValid && hasPlannedDays) {
            setWeekProgress(programState)
          } else {
            // If an older/invalid state exists (no planned days), rebuild the schedule but keep completion marks when possible.
            const defaultProgress = buildWeekProgress(programSnapshot.trainingDays)
            const completedByDay = new Map<string, boolean>()
            if (Array.isArray(programState)) {
              for (const d of programState as any[]) {
                if (d?.day) completedByDay.set(String(d.day), !!d.completed)
              }
            }
            const merged = defaultProgress.map((d) => ({
              ...d,
              completed: completedByDay.get(d.day) ?? d.completed,
            }))
            setWeekProgress(merged)
            await supabaseService.upsertProgramState(programSnapshot.programId, merged)
          }
        }

        // Merge with localStorage data - Supabase takes precedence
        if (supabaseSessionLogs.length > 0) {
          setSessionHistory((prev) => {
            const prsById = new Map(
              prev
                .filter((log) => Array.isArray(log.prs) && log.prs.length > 0)
                .map((log) => [log.id, log.prs ?? []] as const)
            )

            const prsByComposite = new Map(
              prev
                .filter((log) => Array.isArray(log.prs) && log.prs.length > 0)
                .map((log) => [`${log.sessionId}|${String(log.date).slice(0, 10)}`, log.prs ?? []] as const)
            )

            return supabaseSessionLogs.map((log) => {
              const byId = prsById.get(log.id)
              const byComposite = prsByComposite.get(`${log.sessionId}|${String(log.date).slice(0, 10)}`)
              return {
                ...log,
                prs: byId ?? byComposite ?? log.prs,
              }
            })
          })
        }
        if (supabaseActivityLogs.length > 0) {
          setActivityLogs(supabaseActivityLogs)
        }
        setFavoriteExercises(supabaseFavorites)
        setCompletedExercises(supabaseCompletions)
        setLearningPathProgress((prev) => {
          const merged = { ...prev }
          for (const [pathId, progress] of Object.entries(supabaseLearningPathProgress ?? {})) {
            const previous = merged[pathId]
            merged[pathId] = typeof previous === 'number'
              ? Math.max(previous, progress)
              : progress
          }
          return merged
        })
        if (currentUser.equipment !== undefined) setEquipment(currentUser.equipment ?? null)
        if (currentUser.weightUnit) setWeightUnit(currentUser.weightUnit)
        if (currentUser.experienceLevel) setUserExperienceLevel(currentUser.experienceLevel)
        if (currentUser.bodyweightKg !== undefined) setBodyweightKg(currentUser.bodyweightKg ?? null)
        if (currentUser.primaryGoal) setPrimaryGoal(currentUser.primaryGoal)
        if (currentUser.combatSessionsPerWeek !== undefined) setCombatSessionsPerWeek(currentUser.combatSessionsPerWeek ?? 0)
        if (currentUser.sessionMinutes !== undefined) setSessionMinutes(currentUser.sessionMinutes ?? 45)
        if (currentUser.injuryNotes !== undefined) setInjuryNotes(currentUser.injuryNotes ?? '')

        if (supabaseTodayOverride?.data) {
          const raw = supabaseTodayOverride.data as any
          const normalized: TodayWorkoutOverride = {
            baseSessionId: raw?.baseSessionId ?? null,
            baseProgramDayIndex: typeof raw?.baseProgramDayIndex === 'number' ? raw.baseProgramDayIndex : null,
            baseFingerprint: raw?.baseFingerprint ?? null,
            addedExercises: Array.isArray(raw?.addedExercises) ? raw.addedExercises : [],
            removedExerciseIds: Array.isArray(raw?.removedExerciseIds) ? raw.removedExerciseIds : [],
            exerciseOrderIds: Array.isArray(raw?.exerciseOrderIds) ? raw.exerciseOrderIds : [],
            exerciseEdits: (raw?.exerciseEdits && typeof raw.exerciseEdits === 'object') ? raw.exerciseEdits : {},
            addedDrillIds: Array.isArray(raw?.addedDrillIds) ? raw.addedDrillIds : [],
            removedDrillIds: Array.isArray(raw?.removedDrillIds) ? raw.removedDrillIds : [],
            drillDoneIds: Array.isArray(raw?.drillDoneIds) ? raw.drillDoneIds : [],
            drillsLoggedAt: typeof raw?.drillsLoggedAt === 'string' ? raw.drillsLoggedAt : null,
            readinessMode: normalizeSessionAdjustmentMode(raw?.readinessMode),
            updatedAt: supabaseTodayOverride.updatedAt,
          }

          setTodayOverridesByDate((prev) => {
            const local = prev[todayKey]
            if (!local) return { ...prev, [todayKey]: normalized }
            const localTs = Date.parse(local.updatedAt ?? '')
            const remoteTs = Date.parse(normalized.updatedAt ?? '')
            if (Number.isFinite(remoteTs) && (!Number.isFinite(localTs) || remoteTs > localTs)) {
              return { ...prev, [todayKey]: normalized }
            }
            return prev
          })
        }
      } catch (error) {
        console.debug('Failed to fetch Supabase data, using localStorage cache:', error)
      } finally {
        setIsLoadingSupabaseData(false)
      }
    }

    fetchSupabaseData()
  }, [currentUser, isScreenshotMode, todayKey])

  const todayOverride = todayOverridesByDate[todayKey]
  const todayOverrideUpdatedAt = todayOverride?.updatedAt

  useEffect(() => {
    if (!currentUser || isScreenshotMode) return
    const override = todayOverride
    if (!override) return

    if (todayOverridePersistTimeoutRef.current) {
      clearTimeout(todayOverridePersistTimeoutRef.current)
    }

    todayOverridePersistTimeoutRef.current = setTimeout(() => {
      void supabaseService.upsertWorkoutDayOverride(todayKey, override)
    }, 700)

    return () => {
      if (todayOverridePersistTimeoutRef.current) {
        clearTimeout(todayOverridePersistTimeoutRef.current)
        todayOverridePersistTimeoutRef.current = null
      }
    }
  }, [currentUser, isScreenshotMode, todayKey, todayOverride, todayOverrideUpdatedAt])

  useEffect(() => {
    if (currentScreen !== 'loading' || !loadingComplete) return
    if (isLoadingSupabaseData) return
    if (isGeneratingOnboardingProgram) return
    setLoadingContext('default')
    if (currentUser && currentUser.onboardingCompleted !== true) {
      navigateTo('onboarding-sport')
      return
    }
    if (!generatedProgram || generatedProgram.length === 0) {
      navigateTo('onboarding-sport')
    } else {
      navigateTo('home')
    }
  }, [currentScreen, loadingComplete, isLoadingSupabaseData, isGeneratingOnboardingProgram, generatedProgram, currentUser, navigateTo])

  useEffect(() => {
    if (currentScreen !== 'onboarding-generating') return

    // If there's an error, let the user see it and choose what to do
    if (onboardingGenerationError) return

    // If this screen was restored from persisted state without an active generation task, recover immediately.
    if (!isGeneratingOnboardingProgram) {
      if (generatedProgram && generatedProgram.length > 0) {
        navigateTo('onboarding-program-explainer')
      } else {
        navigateTo('onboarding-equipment')
      }
      return
    }

    // Hard safety timeout so users are never trapped on this transient screen.
    const timeoutId = setTimeout(() => {
      setIsGeneratingOnboardingProgram(false)
      setOnboardingGenerationError('Generation timed out. Please try again.')
    }, 10000)

    return () => clearTimeout(timeoutId)
  }, [currentScreen, isGeneratingOnboardingProgram, generatedProgram, onboardingGenerationError, navigateTo])

  useEffect(() => {
    if (currentScreen === 'navigation-not-set') return
    if (!navigationError) return
    setNavigationError(null)
  }, [currentScreen, navigationError])

  useEffect(() => {
    if (!navigationBlockNotice) return
    const timeoutId = setTimeout(() => {
      setNavigationBlockNotice(null)
    }, 2200)

    return () => clearTimeout(timeoutId)
  }, [navigationBlockNotice])

  useEffect(() => {
    if (!isScreenshotMode || !screenshotScreen) return

    const demoProgram = generateWeeklyProgram('wrestling', 4)
    const demoSession = demoProgram[0]
    const demoWeights =
      demoSession?.exercises?.length
        ? {
            [demoSession.exercises[0].id]: [135, 155, 165],
            [demoSession.exercises[1]?.id ?? demoSession.exercises[0].id]: [95, 105],
          }
        : {}

    // Demo week progress for screenshots - shows realistic progress
    const demoWeekProgress: WeekDay[] = [
      { day: 'Monday', shortDay: 'M', planned: true, completed: true },
      { day: 'Tuesday', shortDay: 'T', planned: false, completed: false },
      { day: 'Wednesday', shortDay: 'W', planned: true, completed: true },
      { day: 'Thursday', shortDay: 'T', planned: false, completed: false },
      { day: 'Friday', shortDay: 'F', planned: true, completed: false },
      { day: 'Saturday', shortDay: 'S', planned: true, completed: false },
      { day: 'Sunday', shortDay: 'S', planned: false, completed: false },
    ]

    const demoHistory: SessionLog[] = demoSession
      ? [
          {
            id: 'demo-1',
            date: new Date().toISOString(),
            sessionId: demoSession.id,
            completed: true,
            effortRating: 8,
            totalTime: 42 * 60,
            notes: 'Felt strong',
            weight: demoWeights,
            volume: 12400,
          },
        ]
      : []

    const demoDrill = allDrills[0]
    const demoRoutine = routines[0]
    const demoLearningPath = learningPaths[0]

    const demoUser: UserProfile = {
      id: 'demo-user-1',
      username: 'dagestani',
      displayName: 'Dagestani Disciple',
      bio: 'Wrestling + strength. Built from discipline.',
      sport: 'wrestling',
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      workoutCount: 12,
      followerCount: 842,
      followingCount: 131,
      totalSaves: 210,
    }

    const demoWorkout: CustomWorkout = {
      id: 'demo-workout-1',
      creatorId: demoUser.id,
      creator: demoUser,
      name: 'Explosive Takedown Circuit',
      description: 'Short, brutal circuit to build shot speed and chain wrestling.',
      focus: 'explosive-power',
      difficulty: 'intermediate',
      estimatedDuration: 35,
      sportRelevance: ['wrestling'],
      exercises: [
        { id: 'ex-1', name: 'Power Cleans', sets: 4, reps: 3, restTime: 120, order: 0 },
        { id: 'ex-2', name: 'Shot Entries', sets: 5, reps: 6, restTime: 60, order: 1 },
        { id: 'ex-3', name: 'Sled Push', sets: 6, duration: 20, restTime: 45, order: 2 },
      ],
      visibility: 'public',
      saveCount: 128,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const applyBaseState = (now: number) => {
      setSelectedSport('wrestling')
      setTrainingDays(4)
      setEquipment('gym')
      setWeightUnit('lbs')
      setGeneratedProgram(demoProgram)
      setCurrentDayIndex(0)
      setWeekProgress(demoWeekProgress)
      setCurrentExerciseIndex(0)
      setCurrentSet(2)
      setSessionStartTime(now - 12 * 60 * 1000)
      setPausedTime(0)
      setRestTimerDuration(90)
      setRestTimerEndsAt(now + 45 * 1000)
      setSessionPaused(false)
      setPauseStartedAt(null)
      setCurrentStreak(3)
      setLongestStreak(7)
      setLastWorkoutDate(new Date(now - 24 * 60 * 60 * 1000).toISOString())
      setSessionHistory(demoHistory)
      setCurrentSessionWeights(demoWeights)
      setTotalVolume(demoHistory[0]?.volume ?? 0)
      setMissedSessionExcuse(null)
      setRoundTimerMode('mma')
      setUndoAction(null)
      setShowResumePrompt(false)

      setCurrentUser(demoUser)
      setSelectedWorkout(demoWorkout)
      setSelectedDrill(demoDrill ?? null)
      setSelectedCategory(demoDrill?.category ?? 'injury-prevention')
      setSelectedSubcategory(demoDrill?.subcategory ?? 'neck')
      setSelectedRoutine(demoRoutine ?? null)
      setSelectedLearningPath(demoLearningPath ?? null)
      setLearningPathProgress(demoLearningPath ? { [demoLearningPath.id]: 1 } : {})
      setRecentlyViewedDrills(demoDrill ? [demoDrill.id] : [])
    }

    const applyStep = (screen: Screen) => {
      const now = Date.now()
      applyBaseState(now)

      if (screen === 'onboarding-sport') {
        setEquipment(null)
      }

      if (screen === 'onboarding-equipment') {
        setEquipment('gym')
      }

      if (screen === 'workout-session') {
        setCurrentExerciseIndex(0)
        setCurrentSet(2)
        setSessionStartTime(now - 18 * 60 * 1000)
      }

      if (screen === 'rest-timer') {
        setCurrentExerciseIndex(1)
        setCurrentSet(2)
        setRestTimerDuration(90)
        setRestTimerEndsAt(now + 50 * 1000)
      }

      if (screen === 'post-workout-reflection') {
        setSessionStartTime(now - 28 * 60 * 1000)
      }

      if (screen === 'session-complete') {
        setSessionStartTime(now - 34 * 60 * 1000)
      }

      if (screen === 'workout-builder') {
        setSelectedWorkout(null)
      }

      if (screen === 'drill-detail' && !demoDrill) {
        return
      }

      if (screen === 'routine-player' && !demoRoutine) {
        return
      }

      setCurrentScreen(screen)
    }

    const screens = screenshotScreen === 'all'
      ? SCREENSHOT_SCREENS
      : [screenshotScreen as Screen]
    let index = 0
    let intervalId: ReturnType<typeof setInterval> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const showScreen = (screen: Screen) => {
      applyStep(screen)
      if (typeof window !== 'undefined') {
        ;(window as any).__screenshotScreen = screen
      }
    }

    const startCycle = () => {
      showScreen(screens[0])
      if (screens.length > 1) {
        intervalId = setInterval(() => {
          index = (index + 1) % screens.length
          showScreen(screens[index])
        }, screenshotIntervalMs)
      }
    }

    timeoutId = setTimeout(startCycle, screenshotDelayMs)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isScreenshotMode, screenshotScreen, screenshotIntervalMs, screenshotDelayMs])

  useEffect(() => {
    if (!currentUser || isScreenshotMode || !programId) return
    if (!hasHydratedRef.current) return
    supabaseService.upsertProgramState(programId, weekProgress).catch((error) => {
      console.debug('Failed to persist program state:', error)
    })
  }, [currentUser, isScreenshotMode, programId, weekProgress])

  // Check for missed sessions
  useEffect(() => {
    if (!hasHydratedRef.current) return
    if (missedSessionRecovery.shouldPromptAccountability) {
      navigateTo('missed-session-accountability')
    }
  }, [missedSessionRecovery.shouldPromptAccountability, navigateTo])

  // Update streak when session is completed
  const updateStreak = useCallback(() => {
    const now = Date.now()
    const today = new Date(now).toDateString()

    if (!lastWorkoutDate) {
      // First workout
      setCurrentStreak(1)
      setLongestStreak(Math.max(1, longestStreak))
    } else {
      const lastWorkoutTime = new Date(lastWorkoutDate).getTime()
      const lastWorkout = new Date(lastWorkoutTime).toDateString()

      if (lastWorkout === today) {
        // Already worked out today, don't increment
        return
      }

      const hoursSinceLast = (now - lastWorkoutTime) / (1000 * 60 * 60)
      if (hoursSinceLast <= STREAK_GRACE_HOURS) {
        const newStreak = currentStreak + 1
        setCurrentStreak(newStreak)
        setLongestStreak(Math.max(newStreak, longestStreak))
      } else {
        // Streak broken, reset to 1
        setCurrentStreak(1)
      }
    }

    setLastWorkoutDate(new Date().toISOString())
  }, [lastWorkoutDate, currentStreak, longestStreak])

  // Calculate session duration
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return 0
    const activePausedTime = sessionPaused && pauseStartedAt
      ? pausedTime + (Date.now() - pauseStartedAt)
      : pausedTime
    return Math.max(0, Math.floor((Date.now() - sessionStartTime - activePausedTime) / 1000))
  }, [sessionStartTime, pausedTime, sessionPaused, pauseStartedAt])

  const queueUndo = useCallback((snapshot: UndoSnapshot, label: string) => {
    const action: UndoAction = {
      id: Date.now().toString(),
      label,
      createdAt: Date.now(),
      snapshot
    }
    setUndoAction(action)
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
    }
    undoTimeoutRef.current = setTimeout(() => {
      setUndoAction(null)
    }, UNDO_TTL_MS)
  }, [])

  const handleUndo = useCallback(() => {
    if (!undoAction) return
    const snapshot = undoAction.snapshot
    setCurrentExerciseIndex(snapshot.currentExerciseIndex)
    setCurrentSet(snapshot.currentSet)
    setSessionStartTime(snapshot.sessionStartTime)
    setRestTimerEndsAt(snapshot.restTimerEndsAt)
    setRestTimerDuration(snapshot.restTimerDuration)
    setCurrentScreen(snapshot.currentScreen)
    setSetProgressByExercise(snapshot.setProgressByExercise)
    setCurrentSessionWeights(snapshot.currentSessionWeights)
    setTotalVolume(snapshot.totalVolume)
    setSessionPaused(snapshot.sessionPaused)
    setPauseStartedAt(snapshot.pauseStartedAt)
    setPausedTime(snapshot.pausedTime)
    setUndoAction(null)
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = null
    }
  }, [undoAction])

  // Screen navigation with transitions
  const navigateWithTransition = useCallback((screen: Screen, direction: 'forward' | 'back' = 'forward') => {
    if (isTransitioning) return
    previousScreenRef.current = currentScreen
    setTransitionDirection(direction)
    setIsTransitioning(true)

    // Short delay to allow exit animation, then switch screen
    setTimeout(() => {
      setCurrentScreen(screen)
      // Reset transition state after enter animation
      setTimeout(() => {
        setIsTransitioning(false)
        setTransitionDirection(null)
      }, 250)
    }, 100)
  }, [currentScreen, isTransitioning])

  // Find next non-skipped exercise index
  const findNextExerciseIndex = useCallback((fromIndex: number): number | null => {
    if (!currentSession) return null
    for (let i = fromIndex + 1; i < currentSession.exercises.length; i++) {
      if (!skippedExercises.has(currentSession.exercises[i].id)) {
        return i
      }
    }
    return null // No more exercises
  }, [currentSession, skippedExercises])

  // Check if current exercise is the last non-skipped one
  const isLastNonSkippedExercise = useCallback((): boolean => {
    return findNextExerciseIndex(currentExerciseIndex) === null
  }, [currentExerciseIndex, findNextExerciseIndex])

  // Handle set confirmation
  const handleConfirmSet = useCallback((weight?: number) => {
    if (!currentSession) return
    const exercise = currentSession.exercises[currentExerciseIndex]
    const isLastSet = currentSet === exercise.sets
    const isLastExercise = isLastNonSkippedExercise()

    queueUndo({
      currentExerciseIndex,
      currentSet,
      sessionStartTime,
      restTimerEndsAt,
      restTimerDuration,
      currentScreen,
      setProgressByExercise,
      currentSessionWeights,
      totalVolume,
      sessionPaused,
      pauseStartedAt,
      pausedTime
    }, 'Set confirmed')

    analytics.track('set_confirmed', {
      exerciseId: exercise.id,
      set: currentSet,
      weight: weight ?? null
    })

    // Track weight
    if (weight !== undefined && !Number.isNaN(weight)) {
      setCurrentSessionWeights(prev => ({
        ...prev,
        [exercise.id]: [...(prev[exercise.id] || []), weight]
      }))

      // Calculate volume (weight × prescribed reps)
      const prescribedReps = exercise.reps || 1
      setTotalVolume(prev => prev + (weight * prescribedReps))
    }

    if (isLastSet && isLastExercise) {
      // Session complete - go to reflection screen
      navigateTo('post-workout-reflection')
    } else if (isLastSet) {
      // Move to next non-skipped exercise
      const nextIndex = findNextExerciseIndex(currentExerciseIndex)
      if (nextIndex !== null) {
        setRestTimerDuration(exercise.restTime)
        setRestTimerEndsAt(Date.now() + exercise.restTime * 1000)
        navigateTo('rest-timer')
        setCurrentExerciseIndex(nextIndex)
        setCurrentSet(1)
      } else {
        // No more exercises, go to reflection
        navigateTo('post-workout-reflection')
      }
    } else {
      // Start rest timer, then next set
      setRestTimerDuration(exercise.restTime)
      setRestTimerEndsAt(Date.now() + exercise.restTime * 1000)
      navigateTo('rest-timer')
      setCurrentSet(prev => prev + 1)
    }
  }, [
    currentExerciseIndex,
    currentSet,
    currentSession,
    sessionStartTime,
    currentScreen,
    currentSessionWeights,
    totalVolume,
    restTimerEndsAt,
    restTimerDuration,
    sessionPaused,
    pauseStartedAt,
    pausedTime,
    queueUndo,
    setProgressByExercise,
    isLastNonSkippedExercise,
    findNextExerciseIndex,
    navigateTo
  ])

  const handleTogglePause = useCallback(() => {
    if (!sessionStartTime) return
    if (sessionPaused) {
      const pausedFor = pauseStartedAt ? Date.now() - pauseStartedAt : 0
      if (pausedFor > 0) {
        setPausedTime(prev => prev + pausedFor)
        setRestTimerEndsAt(prev => (prev ? prev + pausedFor : prev))
      }
      setPauseStartedAt(null)
      setSessionPaused(false)
      analytics.track('session_resumed')
      return
    }

    setPauseStartedAt(Date.now())
    setSessionPaused(true)
    analytics.track('session_paused')
  }, [sessionStartTime, sessionPaused, pauseStartedAt])

  const handleAdjustRest = useCallback((deltaSeconds: number) => {
    setRestTimerEndsAt(prev => {
      if (!prev) return prev
      const next = prev + deltaSeconds * 1000
      return Math.max(Date.now(), next)
    })
    setRestTimerDuration(prev => Math.max(10, prev + deltaSeconds))
    analytics.track('rest_adjusted', { deltaSeconds })
  }, [])

  const handleSkipRest = useCallback(() => {
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    navigateTo('workout-session')
    analytics.track('rest_skipped')
  }, [navigateTo])

  const handleSelectSet = useCallback((exerciseIndex: number, setNumber: number) => {
    if (!currentSession) return
    const exercise = currentSession.exercises[exerciseIndex]
    if (!exercise) return
    const boundedSet = Math.max(1, Math.min(exercise.sets, setNumber))
    setCurrentExerciseIndex(exerciseIndex)
    setCurrentSet(boundedSet)
  }, [currentSession])

  const handleToggleSetDone = useCallback((
    exerciseIndex: number,
    setNumber: number,
    shouldBeDone: boolean,
    weightBase?: number
  ) => {
    if (!currentSession) return
    const exercise = currentSession.exercises[exerciseIndex]
    if (!exercise) return
    const setIndex = setNumber - 1
    if (setIndex < 0 || setIndex >= exercise.sets) return

    queueUndo({
      currentExerciseIndex,
      currentSet,
      sessionStartTime,
      restTimerEndsAt,
      restTimerDuration,
      currentScreen,
      setProgressByExercise,
      currentSessionWeights,
      totalVolume,
      sessionPaused,
      pauseStartedAt,
      pausedTime
    }, shouldBeDone ? 'Set completed' : 'Set uncompleted')

    setCurrentExerciseIndex(exerciseIndex)
    setCurrentSet(setNumber)

    setSetProgressByExercise((prev) => {
      const next = { ...prev }
      const existing = Array.isArray(next[exercise.id])
        ? [...next[exercise.id]]
        : Array.from({ length: exercise.sets }, () => false)
      existing[setIndex] = shouldBeDone
      next[exercise.id] = existing
      return next
    })

    if (weightBase !== undefined && !Number.isNaN(weightBase)) {
      setCurrentSessionWeights((prev) => {
        const next = { ...prev }
        const existing = Array.isArray(next[exercise.id])
          ? [...next[exercise.id]]
          : Array.from({ length: exercise.sets }, () => 0)
        existing[setIndex] = weightBase
        next[exercise.id] = existing
        return next
      })
    }

    if (shouldBeDone) {
      analytics.track('set_confirmed', {
        exerciseId: exercise.id,
        set: setNumber,
        weight: weightBase ?? null
      })
    }
  }, [
    currentExerciseIndex,
    currentSet,
    currentSession,
    sessionStartTime,
    restTimerEndsAt,
    restTimerDuration,
    currentScreen,
    setProgressByExercise,
    currentSessionWeights,
    totalVolume,
    sessionPaused,
    pauseStartedAt,
    pausedTime,
    queueUndo
  ])

  // Handle jumping to a specific exercise
  const handleJumpToExercise = useCallback((index: number) => {
    if (!currentSession) return
    if (index < 0 || index >= currentSession.exercises.length) return
    const targetExercise = currentSession.exercises[index]
    if (skippedExercises.has(targetExercise.id)) return

    setCurrentExerciseIndex(index)
    setCurrentSet(1)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    navigateTo('workout-session')
    analytics.track('exercise_jumped', { fromIndex: currentExerciseIndex, toIndex: index })
  }, [currentSession, skippedExercises, currentExerciseIndex, navigateTo])

  // Handle skipping an exercise
  const handleSkipExercise = useCallback((exerciseId: string) => {
    setSkippedExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId) // Toggle off if already skipped
      } else {
        next.add(exerciseId)
      }
      return next
    })
    analytics.track('exercise_skipped', { exerciseId })
  }, [])

  // Handle rest timer complete
  const handleTimerComplete = useCallback(() => {
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    navigateTo('workout-session')
  }, [navigateTo])

  // Handle logging external training activity
  const handleLogActivity = useCallback(async (log: Omit<ActivityLog, 'id'>) => {
    // Optimistically update local state with a temporary ID
    const tempId = crypto.randomUUID()
    const newLog: ActivityLog = {
      ...log,
      id: tempId
    }
    setActivityLogs(prev => [newLog, ...prev])
    analytics.track('activity_logged', { type: log.type, duration: log.duration, intensity: log.intensity })
    setEditingActivity(null)
    goBack('home')
    const successFeedback = getActivitySaveFeedback(false)
    showToast(successFeedback.message, successFeedback.variant)
    const activityDate = new Date(log.date)
    const weekdayIndex = activityDate.getDay() === 0 ? 6 : activityDate.getDay() - 1
    setWeekProgress(prev => {
      const next = [...prev]
      const target = next[weekdayIndex]
      if (!target) return prev
      if (!target.completed) {
        next[weekdayIndex] = { ...target, completed: true }
      }
      return next
    })

    // Persist to Supabase (background, non-blocking)
    try {
      const savedLog = await supabaseService.logActivity(log)
      // Update with the real ID from Supabase
      setActivityLogs(prev => prev.map(a => a.id === tempId ? savedLog : a))
    } catch (error) {
      console.debug('Failed to save activity to Supabase, cached locally:', error)
      const warningFeedback = getActivitySyncFallbackFeedback(false)
      showToast(warningFeedback.message, warningFeedback.variant)
    }
  }, [goBack, showToast])

  // Handle updating an existing activity
  const handleUpdateActivity = useCallback(async (log: Omit<ActivityLog, 'id'>, activityId: string) => {
    // Optimistically update local state
    setActivityLogs(prev => prev.map(a =>
      a.id === activityId ? { ...log, id: activityId } : a
    ))
    analytics.track('activity_updated', { type: log.type, duration: log.duration, intensity: log.intensity })
    setEditingActivity(null)
    goBack('home')
    const successFeedback = getActivitySaveFeedback(true)
    showToast(successFeedback.message, successFeedback.variant)

    // Persist to Supabase (background, non-blocking)
    try {
      await supabaseService.updateActivity(activityId, log)
    } catch (error) {
      console.debug('Failed to update activity in Supabase, cached locally:', error)
      const warningFeedback = getActivitySyncFallbackFeedback(true)
      showToast(warningFeedback.message, warningFeedback.variant)
    }
  }, [goBack, showToast])

  // Handle editing an activity - navigate to log-activity with pre-filled data
  const handleEditActivity = useCallback((activity: ActivityLog) => {
    setEditingActivity(activity)
    navigateTo('log-activity')
  }, [navigateTo])

  // Handle deleting an activity
  const handleDeleteActivity = useCallback(async (activityId: string) => {
    // Optimistically update local state
    setActivityLogs(prev => prev.filter(log => log.id !== activityId))
    analytics.track('activity_deleted', { activityId })

    // Delete from Supabase (background, non-blocking)
    try {
      await supabaseService.deleteActivity(activityId)
    } catch (error) {
      console.debug('Failed to delete activity from Supabase:', error)
    }
  }, [])

  const beginSession = useCallback((session: Session | null, source: 'program' | 'custom' | 'extra', dayIndex?: number) => {
    if (!session) return
    const initialSetProgress: Record<string, boolean[]> = {}
    const initialWeights: Record<string, number[]> = {}
    session.exercises.forEach((exercise) => {
      initialSetProgress[exercise.id] = Array.from({ length: exercise.sets }, () => false)
      // Base-unit (lbs) weights per set. 0 means "not set".
      initialWeights[exercise.id] = Array.from({ length: exercise.sets }, () => 0)
    })
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(Date.now())
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setUndoAction(null)
    setSkippedExercises(new Set())
    setSetProgressByExercise(initialSetProgress)
    setCurrentSessionWeights(initialWeights)
    setCurrentSessionPRs([])
    setTotalVolume(0)

    if (source === 'program') {
      setSessionOverride(session)
      setSessionSource('program')
      setCurrentDayIndex(dayIndex ?? currentDayIndex)
    } else {
      setSessionOverride(session)
      setSessionSource(source)
      setCurrentDayIndex(dayIndex ?? getTodayIndex())
    }

    navigateTo('workout-session')
    analytics.track('workout_started', { sessionId: session.id, source })
  }, [currentDayIndex, navigateTo])

  const handleStartSession = useCallback(() => {
    const dayIndex = nextPlannedDayIndex
    const session = dayIndex >= 0 ? getSessionForDay(dayIndex) : null
    // If the user edited "today", start the effective instance instead of the raw template session.
    beginSession(adjustedProgramSession ?? session, 'program', dayIndex)
  }, [beginSession, getSessionForDay, nextPlannedDayIndex, adjustedProgramSession])

  const handleStartSessionForDay = useCallback((dayIndex: number) => {
    const session = getSessionForDay(dayIndex)
    beginSession(session, 'program', dayIndex)
  }, [beginSession, getSessionForDay])

  const handleStartCustomWorkout = useCallback((workout: CustomWorkout) => {
    const session: Session = {
      id: `custom-${workout.id}`,
      day: 'Extra Session',
      focus: workout.name,
      duration: workout.estimatedDuration,
      exercises: workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        duration: exercise.duration,
        restTime: exercise.restTime,
        notes: exercise.notes,
        videoUrl: exercise.videoUrl,
      }))
    }
    beginSession(session, 'extra', getTodayIndex())
  }, [beginSession])

  const mutateTodayOverride = useCallback((mutator: (current: TodayWorkoutOverride) => TodayWorkoutOverride) => {
    const key = getLocalDateKey()
    const baseSessionId = programSession?.id ?? null
    const baseProgramDayIndex = programDayIndex >= 0 ? programDayIndex : null
    const baseFingerprint = fingerprintSession(programSession)

    setTodayOverridesByDate((prev) => {
      const existing = prev[key]
      const defaults: TodayWorkoutOverride = {
        baseSessionId,
        baseProgramDayIndex,
        baseFingerprint,
        addedExercises: [],
        removedExerciseIds: [],
        exerciseOrderIds: [],
        exerciseEdits: {},
        addedDrillIds: [],
        removedDrillIds: [],
        drillDoneIds: [],
        drillsLoggedAt: null,
        readinessMode: null,
        updatedAt: new Date().toISOString(),
      }

      const seed: TodayWorkoutOverride = existing
        ? {
            ...defaults,
            ...existing,
            // Keep the original fingerprint for guardrails. Only fill if missing.
            baseFingerprint: existing.baseFingerprint ?? defaults.baseFingerprint,
            exerciseOrderIds: Array.isArray(existing.exerciseOrderIds) ? existing.exerciseOrderIds : [],
            exerciseEdits: (existing.exerciseEdits as Record<string, Partial<Exercise>> | undefined) ?? {},
            drillDoneIds: Array.isArray(existing.drillDoneIds) ? existing.drillDoneIds : [],
            drillsLoggedAt: existing.drillsLoggedAt ?? null,
            readinessMode: normalizeSessionAdjustmentMode(existing.readinessMode),
          }
        : defaults

      const next = mutator(seed)
      return {
        ...prev,
        [key]: {
          ...next,
          baseSessionId,
          baseProgramDayIndex,
          updatedAt: new Date().toISOString(),
        }
      }
    })
  }, [programSession, programDayIndex])

  const handleResetTodayOverrides = useCallback(() => {
    const key = getLocalDateKey()
    setTodayOverridesByDate((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    void supabaseService.deleteWorkoutDayOverride(key)
  }, [])

  const handleSetSessionAdjustmentMode = useCallback((mode: SessionAdjustmentMode) => {
    mutateTodayOverride((current) => ({
      ...current,
      readinessMode: mode === 'full' ? null : mode,
    }))
    analytics.track('session_adjustment_selected', { mode })
  }, [mutateTodayOverride])

  const buildAddedExercise = useCallback((params: {
    id: string
    name: string
    videoUrl?: string | null
    isWeighted?: boolean
  }): Exercise => {
    const level = userExperienceLevel
    const sets = level === 'beginner' ? 3 : level === 'advanced' ? 5 : 4
    const reps = params.isWeighted ? (level === 'advanced' ? 6 : 8) : (level === 'advanced' ? 10 : 12)
    const restTime = params.isWeighted ? 120 : 75
    return {
      id: params.id,
      name: params.name,
      sets,
      reps,
      restTime,
      videoUrl: params.videoUrl ?? undefined,
    }
  }, [userExperienceLevel])

  const mapGuidanceExerciseToEnhanced = useCallback((exercise: ExerciseWithGuidance): EnhancedExerciseData => {
    const athleteData = exercise.athleteData?.[0]
    const sport = (exercise.sport ?? athleteData?.athleteSport ?? selectedAthlete?.sport ?? selectedSport) as SportType

    return {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups || [],
      equipment: exercise.equipment || [],
      description: exercise.description,
      videoUrl: exercise.videoUrl,
      isWeighted: exercise.isWeighted,
      sport,
      athleteId: athleteData?.athleteId ?? selectedAthlete?.id ?? 'elite-athlete',
      athleteName: athleteData?.athleteName ?? selectedAthlete?.name ?? 'Elite Athlete',
      athleteAchievements: athleteData?.athleteAchievements ?? selectedAthlete?.achievements ?? [],
      reps: athleteData?.reps,
      sets: athleteData?.sets,
      weight: athleteData?.weight,
      duration: athleteData?.duration,
      frequency: athleteData?.frequency,
      priority: athleteData?.priority ?? 5,
      notes: athleteData?.notes,
      eliteStandard: exercise.eliteStandard,
      benefitsJudo: exercise.benefitsJudo,
      benefitsWrestling: exercise.benefitsWrestling,
      benefitsBjj: exercise.benefitsBjj,
      difficultyLevel: exercise.difficultyLevel,
      loggableMetrics: exercise.loggableMetrics,
    }
  }, [selectedAthlete, selectedSport])

  const handleAddExerciseToWorkoutBuilder = useCallback((exercise: EnhancedExerciseData) => {
    setWorkoutBuilderPrefillExercise({
      id: exercise.id,
      name: exercise.name,
      videoUrl: exercise.videoUrl ?? null,
    })
    setSelectedWorkout(null)
    navigateTo('workout-builder')
  }, [navigateTo])

  const handleAddExerciseToToday = useCallback((exercise: EnhancedExerciseData) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedExerciseIds ?? [])
      removed.delete(exercise.id)

      const alreadyInBase = (programSession?.exercises ?? []).some((e) => e.id === exercise.id)
      const alreadyAdded = (current.addedExercises ?? []).some((e) => e.id === exercise.id)

      const nextAdded = alreadyInBase || alreadyAdded
        ? (current.addedExercises ?? [])
        : [...(current.addedExercises ?? []), buildAddedExercise({
            id: exercise.id,
            name: exercise.name,
            videoUrl: exercise.videoUrl ?? null,
            isWeighted: exercise.isWeighted,
          })]

      return {
        ...current,
        addedExercises: nextAdded,
        removedExerciseIds: Array.from(removed),
      }
    })
  }, [mutateTodayOverride, programSession, buildAddedExercise])

  const workoutBuilderExerciseIds = useMemo(
    () => new Set(workoutBuilderPrefillExercise?.id ? [workoutBuilderPrefillExercise.id] : []),
    [workoutBuilderPrefillExercise?.id]
  )

  const handleSelectTrainingDrill = useCallback((drill: Drill) => {
    setSelectedDrill(drill)
    setRecentlyViewedDrills((prev) => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
    navigateTo('drill-detail')
  }, [navigateTo])

  const handleSelectTrainingCategory = useCallback((category: DrillCategory) => {
    setSelectedCategory(category)
    setSelectedSubcategory(null)
    navigateTo('category-list')
  }, [navigateTo])

  const handleSelectTrainingRoutine = useCallback((routine: Routine) => {
    setSelectedRoutine(routine)
    navigateTo('routine-player')
  }, [navigateTo])

  const handleSelectTrainingAthlete = useCallback((athlete: Athlete) => {
    setSelectedAthlete(athlete)
    navigateTo('athlete-detail')
  }, [navigateTo])

  const handleSelectExerciseSport = useCallback((sport: SportType) => {
    setSelectedExerciseSport(sport)
  }, [])

  const handleSelectAthleteExercise = useCallback((exercise: ExerciseWithGuidance) => {
    const enhancedExercise = mapGuidanceExerciseToEnhanced(exercise)
    setSelectedExerciseSport(enhancedExercise.sport)
    setSelectedExercise(enhancedExercise)
    navigateTo('exercise-detail')
  }, [mapGuidanceExerciseToEnhanced, navigateTo])

  const handleAddAthleteExerciseToWorkout = useCallback((exercise: ExerciseWithGuidance) => {
    const enhancedExercise = mapGuidanceExerciseToEnhanced(exercise)
    handleAddExerciseToWorkoutBuilder(enhancedExercise)
  }, [mapGuidanceExerciseToEnhanced, handleAddExerciseToWorkoutBuilder])

  const handleSelectExerciseCategory = useCallback((sport: SportType, category: ExerciseCategory) => {
    setSelectedExerciseSport(sport)
    setSelectedExerciseCategory(category)
    navigateTo('sport-category-exercises')
  }, [navigateTo])

  const handleSelectLibraryExercise = useCallback((exercise: EnhancedExerciseData) => {
    setSelectedExercise(exercise)
    navigateTo('exercise-detail')
  }, [navigateTo])

  const handleOpenBodyPartSelector = useCallback(() => {
    navigateTo('body-part-selector')
  }, [navigateTo])

  const handleSelectBodyPart = useCallback((bodyPart: DrillSubcategory) => {
    setSelectedCategory('injury-prevention')
    setSelectedSubcategory(bodyPart)
    navigateTo('category-list')
  }, [navigateTo])

  const handleCloseRoutinePlayer = useCallback(() => {
    setSelectedRoutine(null)
    goBack('training-hub')
  }, [goBack])

  const handleToggleFavoriteExercise = useCallback((exerciseId: string) => {
    const shouldFavorite = !favoriteExercises.has(exerciseId)
    setFavoriteExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
    supabaseService.setExerciseFavorite(exerciseId, shouldFavorite).catch((error) => {
      setFavoriteExercises(prev => {
        const next = new Set(prev)
        if (shouldFavorite) {
          next.delete(exerciseId)
        } else {
          next.add(exerciseId)
        }
        return next
      })
      console.debug('Failed to update exercise favorite:', error)
    })
  }, [favoriteExercises])

  const handleMarkExerciseComplete = useCallback((exerciseId: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.add(exerciseId)
      return next
    })
    supabaseService.logExerciseCompletions([exerciseId], undefined, 'manual').catch((error) => {
      setCompletedExercises(prev => {
        const next = new Set(prev)
        next.delete(exerciseId)
        return next
      })
      console.debug('Failed to log exercise completion:', error)
    })
  }, [])

  const handleShareExercise = useCallback((exercise: EnhancedExerciseData) => {
    if (navigator.share) {
      navigator.share({
        title: exercise.name,
        text: `Check out this exercise: ${exercise.name} - used by ${exercise.athleteName}`,
        url: window.location.href,
      }).catch(() => {})
    }
  }, [])

  const handleAddPickerExerciseToToday = useCallback((picked: { id: string; name: string; videoUrl?: string | null }) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedExerciseIds ?? [])
      removed.delete(picked.id)

      const alreadyInBase = (programSession?.exercises ?? []).some((e) => e.id === picked.id)
      const alreadyAdded = (current.addedExercises ?? []).some((e) => e.id === picked.id)

      const nextAdded = alreadyInBase || alreadyAdded
        ? (current.addedExercises ?? [])
        : [...(current.addedExercises ?? []), buildAddedExercise({
            id: picked.id,
            name: picked.name,
            videoUrl: picked.videoUrl ?? null,
          })]

      return {
        ...current,
        addedExercises: nextAdded,
        removedExerciseIds: Array.from(removed),
      }
    })
  }, [mutateTodayOverride, programSession, buildAddedExercise])

  const handleSetTodayExerciseOrder = useCallback((orderIds: string[]) => {
    mutateTodayOverride((current) => {
      const nextOrder: string[] = []
      const seen = new Set<string>()
      for (const id of orderIds ?? []) {
        if (!id || seen.has(id)) continue
        seen.add(id)
        nextOrder.push(id)
      }
      return { ...current, exerciseOrderIds: nextOrder }
    })
  }, [mutateTodayOverride])

  const handleReplacePickerExerciseInToday = useCallback((targetExerciseId: string, picked: { id: string; name: string; videoUrl?: string | null }) => {
    if (!targetExerciseId || !picked?.id) return
    if (picked.id === targetExerciseId) return

    mutateTodayOverride((current) => {
      const removed = new Set(current.removedExerciseIds ?? [])
      removed.add(targetExerciseId)
      removed.delete(picked.id)

      const alreadyInBase = (programSession?.exercises ?? []).some((e) => e.id === picked.id)
      const alreadyAdded = (current.addedExercises ?? []).some((e) => e.id === picked.id)

      let nextAdded = current.addedExercises ?? []
      // If the target was added (not part of the base session), drop it from addedExercises.
      nextAdded = nextAdded.filter((e) => e.id !== targetExerciseId)

      if (!alreadyInBase && !alreadyAdded) {
        nextAdded = [
          ...nextAdded,
          buildAddedExercise({
            id: picked.id,
            name: picked.name,
            videoUrl: picked.videoUrl ?? null,
          })
        ]
      }

      // Replace ordering slot if user previously reordered (or derive from current effective order).
      const seedOrder =
        Array.isArray(current.exerciseOrderIds) && current.exerciseOrderIds.length > 0
          ? current.exerciseOrderIds
          : (effectiveProgramSession?.exercises ?? []).map((e) => e.id)

      const replaced = seedOrder.map((id) => (id === targetExerciseId ? picked.id : id)).filter(Boolean)
      const filtered = replaced.filter((id) => id !== targetExerciseId)
      if (!filtered.includes(picked.id)) filtered.push(picked.id)
      const nextOrder: string[] = []
      const seen = new Set<string>()
      for (const id of filtered) {
        if (!id || seen.has(id)) continue
        seen.add(id)
        nextOrder.push(id)
      }

      const nextEdits = { ...(current.exerciseEdits ?? {}) }
      delete nextEdits[targetExerciseId]

      return {
        ...current,
        addedExercises: nextAdded,
        removedExerciseIds: Array.from(removed),
        exerciseOrderIds: nextOrder,
        exerciseEdits: nextEdits,
      }
    })
  }, [mutateTodayOverride, programSession, buildAddedExercise, effectiveProgramSession])

  const handleUpdateTodayExercise = useCallback((exerciseId: string, patch: { sets?: number; reps?: number | null; duration?: number | null; restTime?: number; notes?: string | null }) => {
    if (!exerciseId) return
    mutateTodayOverride((current) => {
      const currentEdits = (current.exerciseEdits as Record<string, Partial<Exercise>> | undefined) ?? {}
      const prevPatch = currentEdits[exerciseId] ?? {}

      const nextPatch: Record<string, unknown> = { ...prevPatch, ...patch }

      // Null means "clear override" for that field.
      if (patch.reps === null) delete nextPatch.reps
      if (patch.duration === null) delete nextPatch.duration
      if (patch.notes === null) delete nextPatch.notes

      // Basic sanitization.
      if (typeof nextPatch.sets === 'number') nextPatch.sets = Math.max(1, Math.floor(nextPatch.sets))
      if (typeof nextPatch.restTime === 'number') nextPatch.restTime = Math.max(0, Math.floor(nextPatch.restTime))
      if (typeof nextPatch.reps === 'number') nextPatch.reps = Math.max(0, Math.floor(nextPatch.reps))
      if (typeof nextPatch.duration === 'number') nextPatch.duration = Math.max(0, Math.floor(nextPatch.duration))

      const cleaned = { ...currentEdits }
      const keys = Object.keys(nextPatch).filter((k) => nextPatch[k] !== undefined)
      if (keys.length === 0) {
        delete cleaned[exerciseId]
      } else {
        cleaned[exerciseId] = nextPatch as Partial<Exercise>
      }

      return { ...current, exerciseEdits: cleaned }
    })
  }, [mutateTodayOverride])

  const handleResetTodayExerciseEdits = useCallback((exerciseId: string) => {
    if (!exerciseId) return
    mutateTodayOverride((current) => {
      const cleaned = { ...(current.exerciseEdits ?? {}) }
      delete (cleaned as Record<string, unknown>)[exerciseId]
      return { ...current, exerciseEdits: cleaned }
    })
  }, [mutateTodayOverride])

  const handleRemoveExerciseForToday = useCallback((exerciseId: string) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedExerciseIds ?? [])
      removed.add(exerciseId)
      return { ...current, removedExerciseIds: Array.from(removed) }
    })
  }, [mutateTodayOverride])

  const handleRestoreExerciseForToday = useCallback((exerciseId: string) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedExerciseIds ?? [])
      removed.delete(exerciseId)
      return { ...current, removedExerciseIds: Array.from(removed) }
    })
  }, [mutateTodayOverride])

  const handleAddDrillToToday = useCallback((drill: Drill) => {
    mutateTodayOverride((current) => {
      const added = new Set(current.addedDrillIds ?? [])
      const removed = new Set(current.removedDrillIds ?? [])
      added.add(drill.id)
      removed.delete(drill.id)
      return {
        ...current,
        addedDrillIds: Array.from(added),
        removedDrillIds: Array.from(removed),
      }
    })
  }, [mutateTodayOverride])

  const handleRemoveDrillForToday = useCallback((drillId: string) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedDrillIds ?? [])
      removed.add(drillId)
      return { ...current, removedDrillIds: Array.from(removed) }
    })
  }, [mutateTodayOverride])

  const handleRestoreDrillForToday = useCallback((drillId: string) => {
    mutateTodayOverride((current) => {
      const removed = new Set(current.removedDrillIds ?? [])
      removed.delete(drillId)
      return { ...current, removedDrillIds: Array.from(removed) }
    })
  }, [mutateTodayOverride])

  const handleToggleTodayDrillDone = useCallback((drillId: string, done: boolean) => {
    if (!drillId) return
    mutateTodayOverride((current) => {
      const next = new Set(current.drillDoneIds ?? [])
      if (done) next.add(drillId)
      else next.delete(drillId)
      return { ...current, drillDoneIds: Array.from(next) }
    })
  }, [mutateTodayOverride])

  const handleLogTodayDrills = useCallback(async (params: { drillIds: string[]; durationMinutes: number; notes: string }) => {
    const nowIso = new Date().toISOString()
    mutateTodayOverride((current) => ({ ...current, drillsLoggedAt: nowIso }))

    const tempId = `drills-${Date.now()}`
    const log: ActivityLog = {
      id: tempId,
      date: nowIso,
      type: 'drilling',
      duration: Math.max(1, Math.floor(params.durationMinutes)),
      intensity: 5,
      notes: params.notes,
    }

    setActivityLogs((prev) => [...prev, log])
    analytics.track('activity_logged', { type: log.type, duration: log.duration, source: 'drills' })

    try {
      const savedLog = await supabaseService.logActivity({
        date: log.date,
        type: log.type,
        duration: log.duration,
        intensity: log.intensity,
        notes: log.notes,
      })
      setActivityLogs((prev) => prev.map((a) => (a.id === tempId ? savedLog : a)))
    } catch (error) {
      console.debug('Failed to save drill log to Supabase, cached locally:', error)
    }
  }, [mutateTodayOverride])

  // Handle ending session early
  const handleEndSession = useCallback(() => {
    queueUndo({
      currentExerciseIndex,
      currentSet,
      sessionStartTime,
      restTimerEndsAt,
      restTimerDuration,
      currentScreen,
      setProgressByExercise,
      currentSessionWeights,
      totalVolume,
      sessionPaused,
      pauseStartedAt,
      pausedTime
    }, 'Session ended')

    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(null)
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setSetProgressByExercise({})
    setCurrentSessionWeights({})
    setCurrentSessionPRs([])
    setTotalVolume(0)
    setUndoAction(null)
    setSessionOverride(null)
    setSessionSource(null)
    navigateTo('home')
    analytics.track('session_ended')
  }, [
    currentExerciseIndex,
    currentSet,
    sessionStartTime,
    restTimerEndsAt,
    restTimerDuration,
    currentScreen,
    setProgressByExercise,
    currentSessionWeights,
    totalVolume,
    sessionPaused,
    pauseStartedAt,
    pausedTime,
    queueUndo,
    navigateTo
  ])

  const persistCompletedSession = useCallback(async ({
    effortRating,
    notes,
  }: {
    effortRating?: number
    notes?: string
  }) => {
    if (!currentSession) return

    const normalizedNotes = notes?.trim() ? notes.trim() : undefined
    const dedupedSessionPRs = currentSessionPRs.filter((pr, index, arr) => (
      arr.findIndex((candidate) => (
        candidate.exerciseId === pr.exerciseId &&
        candidate.type === pr.type &&
        candidate.value === pr.value
      )) === index
    ))

    const tempId = Date.now().toString()
    const completedExerciseIds = currentSession.exercises.map(ex => ex.id)
    const uuidIds = completedExerciseIds.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    )
    const sessionLog: SessionLog = {
      id: tempId,
      date: new Date().toISOString(),
      sessionId: currentSession.id,
      completed: true,
      effortRating,
      totalTime: getSessionDuration(),
      notes: normalizedNotes,
      weight: currentSessionWeights,
      volume: totalVolume,
      prs: dedupedSessionPRs,
    }

    latestCompletedSessionSyncRef.current = {
      localId: tempId,
      persistedId: null,
      effortRating: sessionLog.effortRating,
      notes: sessionLog.notes,
    }

    setSessionHistory(prev => [...prev, sessionLog])
    setEditingCompletedSessionId(tempId)
    setCompletedExercises(prev => {
      const next = new Set(prev)
      // Only persist "completed" markers for real library exercises (UUID-backed).
      uuidIds.forEach(id => next.add(id))
      return next
    })

    setCurrentSessionWeights({})
    setSetProgressByExercise({})
    setTotalVolume(0)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setUndoAction(null)

    setWeekProgress(prev => {
      const newProgress = [...prev]
      const fallbackIndex = newProgress.findIndex(d => d.planned && !d.completed)
      const targetIndex = sessionSource === 'program'
        ? (currentDayIndex >= 0 ? currentDayIndex : fallbackIndex)
        : getTodayIndex()
      if (targetIndex < 0 || targetIndex >= newProgress.length) return prev
      const targetDay = newProgress[targetIndex]
      if (!targetDay) return prev

      newProgress[targetIndex] = {
        ...targetDay,
        planned: targetDay.planned,
        completed: true,
      }
      return newProgress
    })

    updateStreak()

    navigateTo('session-complete')
    analytics.track('session_completed', {
      sessionId: currentSession.id,
      effortRating: sessionLog.effortRating ?? null,
    })

    try {
      const savedLog = await supabaseService.logSession({
        date: sessionLog.date,
        sessionId: sessionLog.sessionId,
        completed: sessionLog.completed,
        effortRating: sessionLog.effortRating,
        totalTime: sessionLog.totalTime,
        notes: sessionLog.notes,
        volume: sessionLog.volume,
      })

      setSessionHistory(prev => prev.map(s => (
        s.id === tempId
          ? {
              ...s,
              ...savedLog,
              id: savedLog.id,
              effortRating: s.effortRating,
              notes: s.notes,
              prs: s.prs ?? sessionLog.prs,
            }
          : s
      )))

      const latestReflection = latestCompletedSessionSyncRef.current?.localId === tempId
        ? latestCompletedSessionSyncRef.current
        : null

      latestCompletedSessionSyncRef.current = latestReflection
        ? {
            ...latestReflection,
            localId: savedLog.id,
            persistedId: savedLog.id,
          }
        : null

      setEditingCompletedSessionId((prev) => (prev === tempId ? savedLog.id : prev))

      await supabaseService.logExerciseCompletions(uuidIds, savedLog.id, sessionSource ?? 'session')

      const reflectionChangedAfterCreate = latestReflection != null && (
        latestReflection.effortRating !== sessionLog.effortRating ||
        latestReflection.notes !== sessionLog.notes
      )

      if (reflectionChangedAfterCreate) {
        await supabaseService.updateSessionLog(savedLog.id, {
          effortRating: latestReflection.effortRating,
          notes: latestReflection.notes,
        })
      }
    } catch (error) {
      console.debug('Failed to save session to Supabase, cached locally:', error)
    }

    setCurrentSessionPRs([])
    setSessionOverride(null)
    setSessionSource(null)
  }, [currentSession, currentSessionWeights, currentSessionPRs, totalVolume, getSessionDuration, updateStreak, currentDayIndex, sessionSource, navigateTo])

  // Handle post-workout reflection complete
  const handleReflectionComplete = useCallback(async (effortRating: number, notes: string) => {
    const normalizedNotes = notes.trim() || undefined

    if (editingCompletedSessionId) {
      const isPendingCreatedSession =
        latestCompletedSessionSyncRef.current?.localId === editingCompletedSessionId &&
        !latestCompletedSessionSyncRef.current?.persistedId

      setSessionHistory((prev) => prev.map((log) => (
        log.id === editingCompletedSessionId
          ? { ...log, effortRating, notes: normalizedNotes }
          : log
      )))

      if (
        latestCompletedSessionSyncRef.current && (
          latestCompletedSessionSyncRef.current.localId === editingCompletedSessionId ||
          latestCompletedSessionSyncRef.current.persistedId === editingCompletedSessionId
        )
      ) {
        latestCompletedSessionSyncRef.current = {
          ...latestCompletedSessionSyncRef.current,
          effortRating,
          notes: normalizedNotes,
        }
      }

      navigateTo('session-complete')

      if (!isPendingCreatedSession) {
        try {
          await supabaseService.updateSessionLog(editingCompletedSessionId, {
            effortRating,
            notes: normalizedNotes,
          })
        } catch (error) {
          console.debug('Failed to update session reflection in Supabase:', error)
        }
      }

      return
    }

    await persistCompletedSession({ effortRating, notes: normalizedNotes })
  }, [editingCompletedSessionId, navigateTo, persistCompletedSession])

  // Handle session complete close
  const handleSessionCompleteClose = useCallback(() => {
    setEditingCompletedSessionId(null)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(null)
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setCurrentSessionPRs([])
    navigateTo('home')
  }, [navigateTo])

  // Handle missed session accountability
  const handleMissedSessionSubmit = useCallback((excuse: string) => {
    setMissedSessionExcuse(excuse)
    setCurrentStreak(0)
    navigateTo('home')
  }, [navigateTo])

  const handleMissedSessionDismiss = useCallback(() => {
    navigateTo('home')
  }, [navigateTo])

  // Round timer handlers
  const handleStartRoundTimer = useCallback((mode: TimerMode) => {
    setRoundTimerMode(mode)
    navigateTo('round-timer')
  }, [navigateTo])

  const handleRoundTimerComplete = useCallback(() => {
    goBack('home')
  }, [goBack])

  const handleRoundTimerClose = useCallback(() => {
    goBack('home')
  }, [goBack])

  const handleCloseWeekView = useCallback(() => {
    goBack('home')
  }, [goBack])

  const handleWeekViewLogTraining = useCallback(() => {
    navigateTo('log-activity')
  }, [navigateTo])

  const handleOpenProgramSessionEditor = useCallback((dayIndex: number) => {
    setEditingSessionDayIndex(dayIndex)
    navigateTo('program-session-editor')
  }, [navigateTo])

  const handleHomeScrollChange = useCallback((scrollTop: number) => {
    screenScrollPositionsRef.current['home'] = scrollTop
  }, [])

  const handleWeekViewScrollChange = useCallback((scrollTop: number) => {
    screenScrollPositionsRef.current['week-view'] = scrollTop
  }, [])

  const handleCloseTodayEditor = useCallback(() => {
    goBack('home')
  }, [goBack])

  const handleEditTodayProgram = useCallback(() => {
    if (programDayIndex >= 0) {
      setEditingSessionDayIndex(programDayIndex)
      navigateTo('program-session-editor')
    } else {
      navigateTo('week-view')
    }
  }, [programDayIndex, navigateTo])

  const handleOpenTodayEditorDrill = useCallback((drill: Drill) => {
    setSelectedDrill(drill)
    setRecentlyViewedDrills((prev) => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
    navigateTo('drill-detail')
  }, [navigateTo])

  const handleCloseLogActivity = useCallback(() => {
    setEditingActivity(null)
    goBack('home')
  }, [goBack])

  const handleCloseTrainingStats = useCallback(() => {
    goBack('home')
  }, [goBack])

  const handleUpgradeTrainingStats = useCallback(() => {
    const checkoutAvailability = getBillingCheckoutAvailability(getRuntimeFlagsSnapshot())
    setNavigationBlockNotice(
      checkoutAvailability.enabled
        ? 'Unlock Premium analytics in Subscription settings.'
        : (checkoutAvailability.message ?? 'Premium upgrades are temporarily unavailable right now.')
    )
    navigateTo('settings')
  }, [navigateTo])

  const handleChangeSettingsSport = useCallback((sport: SportType) => {
    setSelectedSport(sport)
    setSelectedExerciseSport(null)
  }, [])

  const handleSaveSettings = useCallback(async () => {
    let profileSyncFailed = false
    let programSyncFailed = false

    if (currentUser) {
      try {
        const updatedProfile = await supabaseService.updateProfile(currentUser.id, {
          sport: selectedSport,
          trainingDays,
          equipment,
          weightUnit,
          experienceLevel: userExperienceLevel,
          bodyweightKg,
          primaryGoal,
          combatSessionsPerWeek,
          sessionMinutes,
          injuryNotes: injuryNotes.trim() ? injuryNotes.trim() : null,
          onboardingCompleted: true,
        })
        setCurrentUser(updatedProfile)
      } catch (error) {
        profileSyncFailed = true
        console.debug('Failed to update profile preferences:', error)
      }
    }

    const shouldRegenerate = !programMeta
      || programMeta.sport !== selectedSport
      || programMeta.trainingDays !== trainingDays
      || programMeta.equipment !== equipment
      || programMeta.level !== userExperienceLevel
      || programMeta.primaryGoal !== primaryGoal
      || programMeta.combatSessionsPerWeek !== combatSessionsPerWeek
      || programMeta.sessionMinutes !== sessionMinutes

    if (shouldRegenerate) {
      try {
        const blueprint = generateWeeklyProgram(selectedSport, trainingDays, {
          level: userExperienceLevel,
          equipment,
          primaryGoal,
          combatSessionsPerWeek,
          sessionMinutes,
        })
        const resolved = await supabaseService.resolveProgramSessionsToLibraryExercises({
          sport: selectedSport,
          sessions: blueprint,
          equipment,
        })

        if (currentUser) {
          const newProgram = await supabaseService.createProgram({
            sport: selectedSport,
            trainingDays,
            sessions: resolved,
            label: 'Original',
          })
          setProgramId(newProgram.programId)
          setGeneratedProgram(newProgram.sessions)
          setSavedProgramSessions(newProgram.sessions)
          setHasProgramChanges(false)
          setProgramMeta({
            sport: newProgram.sport,
            trainingDays: newProgram.trainingDays,
            equipment,
            level: userExperienceLevel,
            primaryGoal,
            combatSessionsPerWeek,
            sessionMinutes,
          })
          const defaultProgress = buildWeekProgress(newProgram.trainingDays)
          setWeekProgress(defaultProgress)
          await supabaseService.upsertProgramState(newProgram.programId, defaultProgress)
        } else {
          setGeneratedProgram(resolved)
          setSavedProgramSessions(resolved)
          setHasProgramChanges(false)
          setProgramMeta({
            sport: selectedSport,
            trainingDays,
            equipment,
            level: userExperienceLevel,
            primaryGoal,
            combatSessionsPerWeek,
            sessionMinutes,
          })
          const defaultProgress = buildWeekProgress(trainingDays)
          setWeekProgress(defaultProgress)
        }
      } catch (error) {
        if (currentUser) {
          programSyncFailed = true
        }
        console.debug('Failed to regenerate program:', error)
        const fallbackProgram = generateWeeklyProgram(selectedSport, trainingDays, {
          level: userExperienceLevel,
          equipment,
          primaryGoal,
          combatSessionsPerWeek,
          sessionMinutes,
        })
        setGeneratedProgram(fallbackProgram)
        setHasProgramChanges(false)
      }
    }

    setCurrentDayIndex(0)
    navigateTo('home')
    const feedback = getSettingsSaveFeedback({
      shouldRegenerate,
      profileSyncFailed,
      programSyncFailed,
    })
    showToast(feedback.message, feedback.variant)
  }, [bodyweightKg, combatSessionsPerWeek, currentUser, equipment, injuryNotes, navigateTo, primaryGoal, programMeta, selectedSport, sessionMinutes, showToast, trainingDays, userExperienceLevel, weightUnit])

  const handleLogoutSettings = useCallback(() => {
    supabaseService.signOut()
    setCurrentUser(null)
    setFeatureUsage({})
    setFavoriteExercises(new Set())
    setCompletedExercises(new Set())
    setSessionHistory([])
    setActivityLogs([])
    setSetProgressByExercise({})
    setCurrentSessionWeights({})
    setCurrentSessionPRs([])
    setTotalVolume(0)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(null)
    setGeneratedProgram(null)
    setSavedProgramSessions(null)
    setProgramId(null)
    setHasProgramChanges(false)
    setWorkoutBuilderPrefillExercise(null)
    resetNavigationTo('auth-login')
  }, [resetNavigationTo])

  const handleSaveSettingsProgramChanges = useCallback(async () => {
    if (!programId || !generatedProgram) return
    try {
      await supabaseService.saveProgramVersion(programId, generatedProgram, 'Saved changes')
      setSavedProgramSessions(generatedProgram)
      setHasProgramChanges(false)
      const feedback = getProgramDraftSaveFeedback(true)
      showToast(feedback.message, feedback.variant)
    } catch (error) {
      console.debug('Failed to save program changes:', error)
      const feedback = getProgramDraftSaveFeedback(false)
      showToast(feedback.message, feedback.variant)
    }
  }, [generatedProgram, programId, showToast])

  const handleRevertSettingsProgramChanges = useCallback(() => {
    if (!savedProgramSessions) return
    setGeneratedProgram(savedProgramSessions)
    setHasProgramChanges(false)
  }, [savedProgramSessions])

  const handleResetSettingsProgram = useCallback(async () => {
    if (!programId) return
    try {
      const sessions = await supabaseService.getOriginalProgramSessions(programId)
      if (sessions.length > 0) {
        setGeneratedProgram(sessions)
        setHasProgramChanges(true)
      }
    } catch (error) {
      console.debug('Failed to reset program:', error)
    }
  }, [programId])

  const handleStartSettingsSubscription = useCallback(async () => {
    if (!currentUser) {
      resetNavigationTo('auth-login')
      throw new Error('Please sign in to upgrade to Premium.')
    }
    pendingBillingReturnRef.current = 'checkout'
    analytics.track('subscription_checkout_started', { source: 'settings' })

    try {
      await stripeService.subscribeToPremium()
    } catch (error) {
      pendingBillingReturnRef.current = null
      analytics.track('subscription_checkout_failed', {
        source: 'settings',
        reason: 'launch-failed',
      })
      throw error
    }
  }, [currentUser, resetNavigationTo])

  const handleManageSettingsSubscription = useCallback(async () => {
    if (!currentUser) {
      resetNavigationTo('auth-login')
      throw new Error('Please sign in to manage your subscription.')
    }
    pendingBillingReturnRef.current = 'portal'
    analytics.track('subscription_portal_opened', { source: 'settings' })

    try {
      await stripeService.openCustomerPortal()
    } catch (error) {
      pendingBillingReturnRef.current = null
      analytics.track('subscription_portal_failed', {
        source: 'settings',
        reason: 'launch-failed',
      })
      throw error
    }
  }, [currentUser, resetNavigationTo])

  const handleSettingsScrollChange = useCallback((scrollTop: number) => {
    screenScrollPositionsRef.current['settings'] = scrollTop
  }, [])

  const handleSaveProgramSession = useCallback((updatedSession: Session) => {
    const dayIndex = editingSessionDayIndex ?? -1
    if (dayIndex < 0 || !generatedProgram) return

    const programIndex = getProgramIndexForDay(dayIndex)
    setGeneratedProgram(prev => {
      if (!prev) return prev
      const next = [...prev]
      if (programIndex >= 0 && programIndex < next.length) {
        next[programIndex] = updatedSession
      }
      return next
    })
    setHasProgramChanges(true)
    goBack('week-view')
    const feedback = getProgramSessionSaveFeedback()
    showToast(feedback.message, feedback.variant)
  }, [editingSessionDayIndex, generatedProgram, getProgramIndexForDay, goBack, showToast])

  const handleCloseProgramSessionEditor = useCallback(() => {
    goBack('week-view')
  }, [goBack])

  const handleFinishWorkoutSession = useCallback(() => {
    setEditingCompletedSessionId(null)
    navigateTo('post-workout-reflection')
  }, [navigateTo])

  const handleRecordCurrentSessionPr = useCallback((pr: PersonalRecord) => {
    setCurrentSessionPRs((prev) => {
      const exists = prev.some((candidate) => (
        candidate.exerciseId === pr.exerciseId &&
        candidate.type === pr.type &&
        candidate.value === pr.value
      ))
      if (exists) return prev
      return [...prev, pr]
    })
  }, [])

  const handleViewWeekFromSessionComplete = useCallback(() => {
    setEditingCompletedSessionId(null)
    navigateTo('week-view')
  }, [navigateTo])

  const handleSkipPostWorkoutReflection = useCallback(async () => {
    if (editingCompletedSessionId) {
      navigateTo('session-complete')
      return
    }

    await persistCompletedSession({})
  }, [editingCompletedSessionId, navigateTo, persistCompletedSession])

  const handleResumeSession = useCallback(() => {
    setShowResumePrompt(false)
  }, [])

  const handleDiscardResume = useCallback(() => {
    setShowResumePrompt(false)
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(null)
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setCurrentSessionWeights({})
    setSetProgressByExercise({})
    setCurrentSessionPRs([])
    setTotalVolume(0)
    setUndoAction(null)
    setSessionOverride(null)
    setSessionSource(null)
    navigateTo('home')
  }, [navigateTo])


  const lastSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null
  const lastSessionWeights = lastSession?.weight
  const lastCompletedSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null
  const editingReflectionSession = useMemo(() => {
    if (!editingCompletedSessionId) return null
    return sessionHistory.find((log) => log.id === editingCompletedSessionId) ?? null
  }, [editingCompletedSessionId, sessionHistory])

  const previousReflectionSession = useMemo(() => {
    if (editingCompletedSessionId) {
      const editingIndex = sessionHistory.findIndex((log) => log.id === editingCompletedSessionId)
      return editingIndex > 0 ? sessionHistory[editingIndex - 1] ?? null : null
    }

    return lastCompletedSession
  }, [editingCompletedSessionId, lastCompletedSession, sessionHistory])

  const handleEditCompletedReflection = useCallback(() => {
    if (!lastCompletedSession) return
    setEditingCompletedSessionId(lastCompletedSession.id)
    navigateTo('post-workout-reflection')
  }, [lastCompletedSession, navigateTo])

  const bestSet = (() => {
    if (!lastCompletedSession?.weight || !currentSession) return null
    let bestWeight = 0
    let bestExerciseName = ''

    Object.entries(lastCompletedSession.weight).forEach(([exerciseId, weights]) => {
      weights.forEach((value) => {
        if (value > bestWeight) {
          bestWeight = value
          bestExerciseName = currentSession.exercises.find(ex => ex.id === exerciseId)?.name ?? 'Best set'
        }
      })
    })

    if (bestWeight <= 0) return null
    return { weight: bestWeight, exerciseName: bestExerciseName }
  })()

  const restExerciseIndex = Math.max(0, currentExerciseIndex - (currentSet === 1 ? 1 : 0))
  const restExercise = currentSession?.exercises[restExerciseIndex] ?? null
  const editingProgramDayIndex = editingSessionDayIndex ?? -1
  const editingProgramSession = editingProgramDayIndex >= 0 ? getSessionForDay(editingProgramDayIndex) : null
  const editingSessionDayLabel = weekProgress[editingProgramDayIndex]?.day ?? 'Session'

  // Smart center action for bottom nav
  const handleCenterAction = useCallback(() => {
    if (programSession && !sessionStartTime) {
      // Has workout today, not started yet -> Start workout
      handleStartSession()
    } else if (currentUser) {
      // No workout or already started -> Create workout
      navigateTo('workout-builder')
    } else {
      // Not logged in -> Go to login
      navigateTo('auth-login')
    }
  }, [programSession, sessionStartTime, currentUser, handleStartSession, navigateTo])

  const handleAuthLogin = useCallback((user: UserProfile) => {
    setCurrentUser(user)
    setSelectedSport(user.sport)
    if (user.trainingDays) setTrainingDays(user.trainingDays)
    if (user.equipment !== undefined) setEquipment(user.equipment ?? null)
    if (user.weightUnit) setWeightUnit(user.weightUnit)
    if (user.experienceLevel) setUserExperienceLevel(user.experienceLevel)
    if (user.bodyweightKg !== undefined) setBodyweightKg(user.bodyweightKg ?? null)
    if (user.primaryGoal) setPrimaryGoal(user.primaryGoal)
    if (user.combatSessionsPerWeek !== undefined) setCombatSessionsPerWeek(user.combatSessionsPerWeek ?? 0)
    if (user.sessionMinutes !== undefined) setSessionMinutes(user.sessionMinutes ?? 45)
    if (user.injuryNotes !== undefined) setInjuryNotes(user.injuryNotes ?? '')
    if (typeof window !== 'undefined') {
      // Prevent stale cross-user app state while keeping Supabase auth storage intact.
      localStorage.removeItem(STORAGE_KEY)
    }
    setGeneratedProgram(null)
    setProgramId(null)
    setSavedProgramSessions(null)
    setHasProgramChanges(false)
    setProgramMeta(null)
    setWeekProgress(DEFAULT_WEEK_PROGRESS)
    setSessionOverride(null)
    setSessionSource(null)
    setLoadingComplete(false)
    setLoadingContext('default')
    if (user.onboardingCompleted === true) {
      resetNavigationTo('loading')
    } else {
      resetNavigationTo('onboarding-sport')
    }
  }, [resetNavigationTo])

  const handleAuthSkip = useCallback(() => {
    setCurrentUser(null)
    setFeatureUsage({})
    setGeneratedProgram(null)
    setProgramId(null)
    setSavedProgramSessions(null)
    setHasProgramChanges(false)
    setProgramMeta(null)
    setWeekProgress(DEFAULT_WEEK_PROGRESS)
    resetNavigationTo('onboarding-sport')
  }, [resetNavigationTo])

  const handleAuthSignup = useCallback((user: UserProfile) => {
    setCurrentUser(user)
    setSelectedSport(user.sport)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    setGeneratedProgram(null)
    setProgramId(null)
    setSavedProgramSessions(null)
    setHasProgramChanges(false)
    setProgramMeta(null)
    setWeekProgress(DEFAULT_WEEK_PROGRESS)
    setSessionOverride(null)
    setSessionSource(null)
    setLoadingComplete(false)
    setLoadingContext('default')
    // Skip onboarding-sport since sport was already selected during signup
    resetNavigationTo('onboarding-schedule')
  }, [resetNavigationTo])

  const handleEmailVerificationRequired = useCallback((email: string) => {
    setPendingVerificationEmail(email)
    navigateTo('email-verification-pending')
  }, [navigateTo])

  const handleVerifiedPendingEmail = useCallback(async () => {
    // Re-fetch auth state to get the verified user
    const authState = await supabaseService.getAuthState()
    if (authState.isAuthenticated && authState.user) {
      setCurrentUser(authState.user)
      setSelectedSport(authState.user.sport)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
      setGeneratedProgram(null)
      setProgramId(null)
      setSavedProgramSessions(null)
      setHasProgramChanges(false)
      setProgramMeta(null)
      setWeekProgress(DEFAULT_WEEK_PROGRESS)
      setPendingVerificationEmail(null)
      // Skip onboarding-sport since sport was already selected during signup
      resetNavigationTo('onboarding-schedule')
    }
  }, [resetNavigationTo])

  const handleBackFromEmailVerification = useCallback(() => {
    setPendingVerificationEmail(null)
    supabaseService.signOut()
    navigateTo('auth-login')
  }, [navigateTo])

  const handlePendingVerificationFallbackLogin = useCallback((user: UserProfile) => {
    setCurrentUser(user)
    navigateTo('home')
  }, [navigateTo])

  const handlePendingVerificationFallbackSkip = useCallback(() => {
    navigateTo('home')
  }, [navigateTo])

  const handleSelectLearningPath = useCallback(async (path: LearningPath) => {
    const localProgress = learningPathProgress[path.id] ?? 0
    const hasStartedPath = Object.prototype.hasOwnProperty.call(learningPathProgress, path.id)

    const blockToSettings = (message: string) => {
      analytics.track('navigation_blocked', {
        from: currentScreen,
        to: 'learning-path',
        redirectTo: 'settings',
        reason: 'premium-feature-locked',
        feature: 'learning-paths',
      })
      setNavigationBlockNotice(message)
      navigateTo('settings')
    }

    if (currentUser && !isScreenshotMode) {
      let usageCount = featureUsage['learning-paths']

      if (!currentUser.isPremium && typeof usageCount !== 'number') {
        try {
          usageCount = await supabaseService.getLearningPathUsage()
          setFeatureUsage((prev) => ({
            ...prev,
            'learning-paths': usageCount,
          }))
        } catch (error) {
          console.debug('Failed to load learning path usage counter:', error)
        }
      }

      if (!currentUser.isPremium && !hasStartedPath) {
        const access = canAccessFeature(currentUser, 'learning-paths', usageCount)
        const hasUsageSnapshot = typeof usageCount === 'number'
        if (hasUsageSnapshot && !access.canAccess) {
          blockToSettings(access.upgradePrompt ?? 'Upgrade to Premium to unlock additional learning paths.')
          return
        }
      }

      if (!hasStartedPath) {
        try {
          await supabaseService.upsertLearningPathProgress(path.id, localProgress, false)
          setLearningPathProgress((prev) => (
            Object.prototype.hasOwnProperty.call(prev, path.id)
              ? prev
              : { ...prev, [path.id]: localProgress }
          ))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to start this learning path.'
          const normalized = message.toLowerCase()
          if (normalized.includes('free learning path limit') || normalized.includes('learning path limit')) {
            blockToSettings('Free tier includes one learning path. Upgrade to unlock all paths.')
            try {
              const refreshedUsage = await supabaseService.getLearningPathUsage()
              setFeatureUsage((prev) => ({
                ...prev,
                'learning-paths': refreshedUsage,
              }))
            } catch (refreshError) {
              console.debug('Failed to refresh learning path usage after limit block:', refreshError)
            }
            return
          }
          console.debug('Failed to initialize learning path progress:', error)
        }

        if (!currentUser.isPremium) {
          try {
            const refreshedUsage = await supabaseService.getLearningPathUsage()
            setFeatureUsage((prev) => ({
              ...prev,
              'learning-paths': refreshedUsage,
            }))
          } catch (error) {
            console.debug('Failed to refresh learning path usage counter:', error)
          }
        }
      }
    }

    setSelectedLearningPath(path)
    navigateTo('learning-path')
  }, [
    learningPathProgress,
    currentScreen,
    currentUser,
    featureUsage,
    isScreenshotMode,
    navigateTo,
  ])

  const handleAdvanceLearningPath = useCallback(() => {
    if (!selectedLearningPath) return

    const next = Math.min(
      (learningPathProgress[selectedLearningPath.id] ?? 0) + 1,
      selectedLearningPath.drills.length
    )
    setLearningPathProgress((prev) => ({ ...prev, [selectedLearningPath.id]: next }))

    if (currentUser && !isScreenshotMode) {
      const completed = next >= selectedLearningPath.drills.length
      void supabaseService
        .upsertLearningPathProgress(selectedLearningPath.id, next, completed)
        .catch((error) => {
          console.debug('Failed to persist learning path progress:', error)
        })
    }
  }, [currentUser, isScreenshotMode, learningPathProgress, selectedLearningPath])

  const handleResetLearningPathProgress = useCallback(() => {
    if (!selectedLearningPath) return

    setLearningPathProgress((prev) => ({ ...prev, [selectedLearningPath.id]: 0 }))

    if (currentUser && !isScreenshotMode) {
      void supabaseService
        .upsertLearningPathProgress(selectedLearningPath.id, 0, false)
        .catch((error) => {
          console.debug('Failed to reset learning path progress:', error)
        })
    }
  }, [currentUser, isScreenshotMode, selectedLearningPath])

  const handleSaveWorkoutBuilder = useCallback((workout: CustomWorkout) => {
    const wasEditingExisting = !!selectedWorkout
    if (!wasEditingExisting && !currentUser?.isPremium && currentUser) {
      const freeLimit = PREMIUM_FEATURES['custom-workouts'].freeLimit ?? 0
      void (async () => {
        try {
          const usageAfterSave = await supabaseService.getFeatureUsage('custom-workouts')
          setFeatureUsage((prev) => ({
            ...prev,
            'custom-workouts': usageAfterSave,
          }))

          if (freeLimit > 0) {
            const remaining = Math.max(0, freeLimit - usageAfterSave)
            if (remaining === 0) {
              setNavigationBlockNotice('Free custom workout limit reached. Upgrade in Settings to keep creating.')
            } else if (remaining === 1) {
              setNavigationBlockNotice('1 free custom workout creation remaining.')
            }
          }
        } catch (error) {
          console.debug('Failed to refresh custom workout usage counter:', error)
        }
      })()
    }
    setSelectedWorkout(workout)
    setWorkoutBuilderPrefillExercise(null)
    goBack('user-profile')
    const feedback = getWorkoutSaveFeedback(wasEditingExisting)
    showToast(feedback.message, feedback.variant)
  }, [currentUser, goBack, selectedWorkout, showToast])

  const handleCloseWorkoutBuilder = useCallback(() => {
    setWorkoutBuilderPrefillExercise(null)
    goBack('user-profile')
  }, [goBack])

  const handleSelectProfileWorkout = useCallback((workout: CustomWorkout) => {
    setSelectedWorkout(workout)
    navigateTo('workout-detail')
  }, [navigateTo])

  const handleSaveEditedProfile = useCallback((updatedUser: UserProfile) => {
    setCurrentUser(updatedUser)
    goBack('user-profile')
  }, [goBack])

  const handleCopyWorkoutToBuilder = useCallback((workout: CustomWorkout) => {
    setSelectedWorkout(workout)
    navigateTo('workout-builder')
  }, [navigateTo])

  const handleLoginToProfile = useCallback((user: UserProfile) => {
    setCurrentUser(user)
    navigateTo('user-profile')
  }, [navigateTo])

  const handleChangeOnboardingSport = useCallback((sport: SportType) => {
    setSelectedSport(sport)
    setSelectedExerciseSport(null)
  }, [])

  const handleContinueOnboardingSchedule = useCallback(() => {
    setIsGeneratingOnboardingProgram(true)
    setOnboardingGenerationError(null)
    navigateTo('onboarding-generating')
    analytics.track('onboarding_started', {
      source: 'schedule',
      sport: selectedSport,
      trainingDays,
    })

    const defaults = {
      level: 'intermediate' as ExperienceLevel,
      equipment: 'gym' as Equipment,
      primaryGoal: 'balanced' as PrimaryGoal,
      sessionMinutes: 45,
      combatSessionsPerWeek: 3,
    }

    if (!userExperienceLevel) setUserExperienceLevel(defaults.level)
    if (!equipment) setEquipment(defaults.equipment)
    if (!primaryGoal) setPrimaryGoal(defaults.primaryGoal)
    if (!sessionMinutes) setSessionMinutes(defaults.sessionMinutes)

    void (async () => {
      try {
        const programBlueprint = generateWeeklyProgram(selectedSport, trainingDays, {
          level: userExperienceLevel || defaults.level,
          equipment: equipment || defaults.equipment,
          primaryGoal: primaryGoal || defaults.primaryGoal,
          combatSessionsPerWeek: combatSessionsPerWeek || defaults.combatSessionsPerWeek,
          sessionMinutes: sessionMinutes || defaults.sessionMinutes,
        })
        let program = programBlueprint

        try {
          program = await withTimeout(
            supabaseService.resolveProgramSessionsToLibraryExercises({
              sport: selectedSport,
              sessions: programBlueprint,
              equipment: equipment || defaults.equipment,
            }),
            4500,
            'Resolve onboarding sessions'
          )
        } catch (error) {
          console.debug('Failed to resolve onboarding sessions, using blueprint fallback:', error)
        }

        const defaultProgress = buildWeekProgress(trainingDays)
        setGeneratedProgram(program)
        setSavedProgramSessions(program)
        setHasProgramChanges(false)
        setWeekProgress(defaultProgress)
        setCurrentDayIndex(0)
        setProgramId(null)
        setProgramMeta({
          sport: selectedSport,
          trainingDays,
          equipment: equipment || defaults.equipment,
          level: userExperienceLevel || defaults.level,
          primaryGoal: primaryGoal || defaults.primaryGoal,
          combatSessionsPerWeek: combatSessionsPerWeek || defaults.combatSessionsPerWeek,
          sessionMinutes: sessionMinutes || defaults.sessionMinutes,
        })

        setIsGeneratingOnboardingProgram(false)
        analytics.track('onboarding_program_generated', {
          source: 'schedule',
          sessionCount: program.length,
          authenticated: !!currentUser,
        })

        if (currentUser) {
          const profilePatch = {
            sport: selectedSport,
            trainingDays,
            equipment: equipment || defaults.equipment,
            weightUnit,
            experienceLevel: userExperienceLevel || defaults.level,
            bodyweightKg,
            primaryGoal: primaryGoal || defaults.primaryGoal,
            combatSessionsPerWeek: combatSessionsPerWeek || defaults.combatSessionsPerWeek,
            sessionMinutes: sessionMinutes || defaults.sessionMinutes,
            injuryNotes: injuryNotes?.trim() ? injuryNotes.trim() : null,
            onboardingCompleted: true as const,
          }

          void (async () => {
            try {
              const updatedProfile = await withTimeout(
                supabaseService.updateProfile(currentUser.id, profilePatch),
                5000,
                'Update onboarding profile'
              )
              setCurrentUser(updatedProfile)
            } catch (error) {
              console.debug('Failed to update profile during onboarding:', error)
              setCurrentUser((prev) => (prev ? { ...prev, ...profilePatch } : prev))
            }

            try {
              const newProgram = await withTimeout(
                supabaseService.createProgram({
                  sport: selectedSport,
                  trainingDays,
                  sessions: program,
                  label: 'Original',
                }),
                6500,
                'Create onboarding program'
              )
              setProgramId(newProgram.programId)
              setSavedProgramSessions(newProgram.sessions)
              await withTimeout(
                supabaseService.upsertProgramState(newProgram.programId, defaultProgress),
                4000,
                'Persist onboarding program state'
              )
            } catch (error) {
              console.debug('Failed to create program during onboarding:', error)
            }
          })()
        }

        analytics.track('onboarding_completed', {
          source: 'schedule',
          sessionCount: program.length,
          authenticated: !!currentUser,
        })
        resetNavigationTo('home')
      } catch (error) {
        console.debug('Failed to build onboarding program:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate your training program. Please try again.'
        analytics.track('onboarding_generation_failed', {
          source: 'schedule',
          reason: errorMessage,
        })
        setOnboardingGenerationError(errorMessage)
        setIsGeneratingOnboardingProgram(false)
      }
    })()
  }, [
    bodyweightKg,
    combatSessionsPerWeek,
    currentUser,
    equipment,
    injuryNotes,
    navigateTo,
    primaryGoal,
    resetNavigationTo,
    selectedSport,
    sessionMinutes,
    trainingDays,
    userExperienceLevel,
    weightUnit,
  ])

  const handleStartOnboardingFromEquipment = useCallback(async () => {
    setIsGeneratingOnboardingProgram(true)
    setOnboardingGenerationError(null)
    navigateTo('onboarding-generating')
    analytics.track('onboarding_started', {
      source: 'equipment',
      sport: selectedSport,
      trainingDays,
    })

    try {
      const programBlueprint = generateWeeklyProgram(selectedSport, trainingDays, {
        level: userExperienceLevel,
        equipment,
        primaryGoal,
        combatSessionsPerWeek,
        sessionMinutes,
      })
      let program = programBlueprint

      try {
        program = await withTimeout(
          supabaseService.resolveProgramSessionsToLibraryExercises({
            sport: selectedSport,
            sessions: programBlueprint,
            equipment,
          }),
          4500,
          'Resolve onboarding sessions'
        )
      } catch (error) {
        console.debug('Failed to resolve onboarding sessions, using blueprint fallback:', error)
      }

      const defaultProgress = buildWeekProgress(trainingDays)
      setGeneratedProgram(program)
      setSavedProgramSessions(program)
      setHasProgramChanges(false)
      setWeekProgress(defaultProgress)
      setCurrentDayIndex(0)
      setProgramId(null)
      setProgramMeta({
        sport: selectedSport,
        trainingDays,
        equipment,
        level: userExperienceLevel,
        primaryGoal,
        combatSessionsPerWeek,
        sessionMinutes,
      })

      analytics.track('onboarding_program_generated', {
        source: 'equipment',
        sessionCount: program.length,
        authenticated: !!currentUser,
      })

      navigateTo('onboarding-program-explainer')

      if (currentUser) {
        const profilePatch = {
          sport: selectedSport,
          trainingDays,
          equipment,
          weightUnit,
          experienceLevel: userExperienceLevel,
          bodyweightKg,
          primaryGoal,
          combatSessionsPerWeek,
          sessionMinutes,
          injuryNotes: injuryNotes.trim() ? injuryNotes.trim() : null,
          onboardingCompleted: false as const,
        }

        void (async () => {
          try {
            const updatedProfile = await withTimeout(
              supabaseService.updateProfile(currentUser.id, profilePatch),
              5000,
              'Update onboarding profile'
            )
            setCurrentUser(updatedProfile)
          } catch (error) {
            console.debug('Failed to update profile during onboarding:', error)
            setCurrentUser((prev) => (
              prev
                ? {
                    ...prev,
                    ...profilePatch,
                  }
                : prev
            ))
          }
        })()

        void (async () => {
          try {
            const newProgram = await withTimeout(
              supabaseService.createProgram({
                sport: selectedSport,
                trainingDays,
                sessions: program,
                label: 'Original',
              }),
              6500,
              'Create onboarding program'
            )
            setProgramId(newProgram.programId)
            setSavedProgramSessions(newProgram.sessions)
            setHasProgramChanges(false)
            setProgramMeta({
              sport: newProgram.sport,
              trainingDays: newProgram.trainingDays,
              equipment,
              level: userExperienceLevel,
              primaryGoal,
              combatSessionsPerWeek,
              sessionMinutes,
            })
            await withTimeout(
              supabaseService.upsertProgramState(newProgram.programId, defaultProgress),
              4000,
              'Persist onboarding program state'
            )
          } catch (error) {
            console.debug('Failed to create program during onboarding:', error)
          }
        })()
      }
    } catch (error) {
      console.debug('Failed to build onboarding program:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate your training program. Please try again.'
      analytics.track('onboarding_generation_failed', {
        source: 'equipment',
        reason: errorMessage,
      })
      setOnboardingGenerationError(errorMessage)
    } finally {
      setIsGeneratingOnboardingProgram(false)
    }
  }, [
    bodyweightKg,
    combatSessionsPerWeek,
    currentUser,
    equipment,
    injuryNotes,
    navigateTo,
    primaryGoal,
    selectedSport,
    sessionMinutes,
    trainingDays,
    userExperienceLevel,
    weightUnit,
  ])

  const handleRetryOnboardingGeneration = useCallback(() => {
    setOnboardingGenerationError(null)
    navigateTo('onboarding-schedule')
  }, [navigateTo])

  const handleFinishOnboardingTour = useCallback(async () => {
    if (!generatedProgram || generatedProgram.length === 0) {
      navigateTo('onboarding-equipment')
      return
    }

    analytics.track('onboarding_completed', {
      source: 'app-tour',
      sessionCount: generatedProgram.length,
      authenticated: !!currentUser,
    })

    if (currentUser) {
      const userId = currentUser.id
      setCurrentUser((prev) => (
        prev
          ? {
              ...prev,
              onboardingCompleted: true,
            }
          : prev
      ))

      void (async () => {
        try {
          const updatedProfile = await withTimeout(
            supabaseService.updateProfile(userId, { onboardingCompleted: true }),
            5000,
            'Finalize onboarding profile'
          )
          setCurrentUser(updatedProfile)
        } catch (error) {
          console.debug('Failed to mark onboarding complete:', error)
        }
      })()
    }

    resetNavigationTo('home')
  }, [currentUser, generatedProgram, navigateTo, resetNavigationTo])

  const hasWorkoutToday = !!programSession

  const renderNavigationNotSet = useCallback((
    message: string,
    details?: string,
    backTo: Screen = 'home'
  ) => (
    <NavigationNotSet
      message={message}
      details={details}
      onGoBack={() => {
        setNavigationError(null)
        navigateTo(backTo)
      }}
      onGoHome={() => {
        setNavigationError(null)
        navigateTo('home')
      }}
    />
  ), [navigateTo])

  const handleLoadingComplete = useCallback(() => {
    setLoadingComplete(true)
  }, [])

  const handleGoBackFromNavigationError = useCallback(() => {
    setNavigationError(null)
    goBack('home')
  }, [goBack])

  const handleGoHomeFromNavigationError = useCallback(() => {
    setNavigationError(null)
    navigateTo('home')
  }, [navigateTo])

  let screen: React.ReactNode = null

  switch (currentScreen) {
    case 'onboarding-sport':
    case 'onboarding-schedule':
    case 'onboarding-level':
    case 'onboarding-intake':
    case 'onboarding-equipment':
    case 'onboarding-generating':
    case 'onboarding-program-explainer':
    case 'onboarding-app-tour':
      screen = (
        <OnboardingRoutes
          currentScreen={currentScreen}
          selectedSport={selectedSport}
          trainingDays={trainingDays}
          equipment={equipment}
          weightUnit={weightUnit}
          bodyweightKg={bodyweightKg}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          injuryNotes={injuryNotes}
          userExperienceLevel={userExperienceLevel}
          generatedProgram={generatedProgram}
          weekProgress={weekProgress}
          onboardingGenerationError={onboardingGenerationError}
          navigateTo={navigateTo}
          onSportChange={handleChangeOnboardingSport}
          onTrainingDaysChange={setTrainingDays}
          onContinueFromSchedule={handleContinueOnboardingSchedule}
          onLevelChange={setUserExperienceLevel}
          onBodyweightKgChange={setBodyweightKg}
          onWeightUnitChange={setWeightUnit}
          onPrimaryGoalChange={setPrimaryGoal}
          onCombatSessionsChange={setCombatSessionsPerWeek}
          onSessionMinutesChange={setSessionMinutes}
          onInjuryNotesChange={setInjuryNotes}
          onEquipmentChange={setEquipment}
          onStartFromEquipment={handleStartOnboardingFromEquipment}
          onRetryGenerating={handleRetryOnboardingGeneration}
          onFinishAppTour={handleFinishOnboardingTour}
        />
      )
      break

    case 'home':
    case 'today-editor':
    case 'log-activity':
    case 'training-stats':
      screen = (
        <CoreAppRoutes
          currentScreen={currentScreen}
          displaySession={displaySession}
          weekProgress={weekProgress}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          userName={currentUser?.displayName}
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
          selectedSport={selectedSport}
          equipment={equipment}
          programSession={programSession}
          effectiveProgramSession={adjustedProgramSession}
          todayRemovedExercises={todayRemovedExercises}
          todayActiveDrillIds={todayActiveDrillIds}
          todayRemovedDrillIds={todayRemovedDrillIds}
          todayDrillDoneIdSet={todayDrillDoneIdSet}
          todayDrillsLoggedAt={todayDrillsLoggedAt}
          hasTodayOverrides={hasTodayOverrides}
          hasTodayBaseChanged={hasTodayBaseChanged}
          sessionAdjustmentMode={sessionAdjustmentMode}
          carryOverSessionDayLabel={carryOverSessionDayLabel}
          missedPlannedSessionCount={missedPlannedSessionCount}
          canEditProgram={!!programSession && programDayIndex >= 0}
          homeScrollTop={screenScrollPositionsRef.current['home']}
          completedExerciseCount={completedExercises.size}
          weightUnit={weightUnit}
          isPremium={currentUser?.isPremium ?? false}
          isStatsLoading={isLoadingSupabaseData}
          hasWorkoutToday={hasWorkoutToday}
          editingActivity={editingActivity}
          navigateTo={navigateTo}
          onUndo={handleUndo}
          undoLabel={undoAction?.label ?? null}
          onStartAction={handleCenterAction}
          onStartSession={handleStartSession}
          onSetSessionAdjustmentMode={handleSetSessionAdjustmentMode}
          onStartRoundTimer={handleStartRoundTimer}
          onHomeScrollChange={handleHomeScrollChange}
          onCloseTodayEditor={handleCloseTodayEditor}
          onResetToday={handleResetTodayOverrides}
          onEditTodayProgram={handleEditTodayProgram}
          onAddExercise={handleAddPickerExerciseToToday}
          onReplaceExercise={handleReplacePickerExerciseInToday}
          onSetExerciseOrder={handleSetTodayExerciseOrder}
          onUpdateExercise={handleUpdateTodayExercise}
          onResetExerciseEdits={handleResetTodayExerciseEdits}
          onRemoveExercise={handleRemoveExerciseForToday}
          onRestoreExercise={handleRestoreExerciseForToday}
          onRemoveDrill={handleRemoveDrillForToday}
          onRestoreDrill={handleRestoreDrillForToday}
          onToggleDrillDone={handleToggleTodayDrillDone}
          onLogDrills={handleLogTodayDrills}
          onOpenDrill={handleOpenTodayEditorDrill}
          onLogActivity={handleLogActivity}
          onUpdateActivity={handleUpdateActivity}
          onCloseLogActivity={handleCloseLogActivity}
          onCloseTrainingStats={handleCloseTrainingStats}
          onUpgradeTrainingStats={handleUpgradeTrainingStats}
        />
      )
      break

    case 'settings':
      screen = (
        <SettingsRoutes
          currentScreen={currentScreen}
          sport={selectedSport}
          trainingDays={trainingDays}
          equipment={equipment}
          weightUnit={weightUnit}
          experienceLevel={userExperienceLevel}
          bodyweightKg={bodyweightKg}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          injuryNotes={injuryNotes}
          onSportChange={handleChangeSettingsSport}
          onDaysChange={setTrainingDays}
          onEquipmentChange={setEquipment}
          onWeightUnitChange={setWeightUnit}
          onExperienceLevelChange={setUserExperienceLevel}
          onBodyweightKgChange={setBodyweightKg}
          onPrimaryGoalChange={setPrimaryGoal}
          onCombatSessionsChange={setCombatSessionsPerWeek}
          onSessionMinutesChange={setSessionMinutes}
          onInjuryNotesChange={setInjuryNotes}
          onSave={handleSaveSettings}
          onLogout={handleLogoutSettings}
          navigateTo={navigateTo}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
          hasUnsavedProgramChanges={hasProgramChanges}
          onSaveProgramChanges={handleSaveSettingsProgramChanges}
          onRevertProgramChanges={handleRevertSettingsProgramChanges}
          onResetProgram={handleResetSettingsProgram}
          onStartSubscription={handleStartSettingsSubscription}
          onManageSubscription={handleManageSettingsSubscription}
          isPremium={currentUser?.isPremium ?? false}
          subscriptionStatus={currentUser?.subscriptionStatus}
          subscriptionPeriodEnd={currentUser?.subscriptionPeriodEnd}
          customWorkoutUsage={featureUsage['custom-workouts'] ?? 0}
          learningPathUsage={featureUsage['learning-paths'] ?? 0}
          settingsScrollTop={screenScrollPositionsRef.current['settings']}
          onSettingsScrollChange={handleSettingsScrollChange}
        />
      )
      break

    case 'training-hub':
    case 'drill-detail':
    case 'athlete-detail':
    case 'category-list':
    case 'routine-player':
    case 'learning-path':
    case 'body-part-selector':
    case 'sport-exercise-categories':
    case 'sport-category-exercises':
    case 'exercise-detail':
      screen = (
        <TrainingLibraryRoutes
          currentScreen={currentScreen}
          contentDataVersion={contentDataVersion}
          selectedSport={selectedSport}
          displaySession={displaySession}
          selectedDrill={selectedDrill}
          selectedAthlete={selectedAthlete}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          selectedRoutine={selectedRoutine}
          selectedLearningPath={selectedLearningPath}
          selectedExerciseSport={selectedExerciseSport}
          selectedExerciseCategory={selectedExerciseCategory}
          selectedExercise={selectedExercise}
          userExperienceLevel={userExperienceLevel}
          learningPathProgress={learningPathProgress}
          isPremium={currentUser?.isPremium ?? false}
          learningPathUsage={featureUsage['learning-paths'] ?? 0}
          hasWorkoutToday={hasWorkoutToday}
          todayActiveDrillIdSet={todayActiveDrillIdSet}
          todayWorkoutExerciseIds={todayWorkoutExerciseIds}
          workoutExerciseIds={workoutBuilderExerciseIds}
          favoriteExercises={favoriteExercises}
          completedExercises={completedExercises}
          screenScrollPositions={screenScrollPositionsRef.current}
          navigateTo={navigateTo}
          goBack={goBack}
          renderNavigationNotSet={renderNavigationNotSet}
          onScreenScrollChange={(screenName, scrollTop) => {
            screenScrollPositionsRef.current[screenName] = scrollTop
          }}
          onStartAction={handleCenterAction}
          onSelectTrainingDrill={handleSelectTrainingDrill}
          onSelectTrainingCategory={handleSelectTrainingCategory}
          onSelectTrainingRoutine={handleSelectTrainingRoutine}
          onSelectLearningPath={handleSelectLearningPath}
          onOpenBodyPartSelector={handleOpenBodyPartSelector}
          onSelectTrainingAthlete={handleSelectTrainingAthlete}
          onSelectExerciseSport={handleSelectExerciseSport}
          onSelectAthleteExercise={handleSelectAthleteExercise}
          onAddAthleteExerciseToWorkout={handleAddAthleteExerciseToWorkout}
          onSelectExerciseCategory={handleSelectExerciseCategory}
          onSelectLibraryExercise={handleSelectLibraryExercise}
          onAddDrillToToday={handleAddDrillToToday}
          onAddExerciseToWorkout={handleAddExerciseToWorkoutBuilder}
          onAddExerciseToToday={handleAddExerciseToToday}
          onAdvanceLearningPath={handleAdvanceLearningPath}
          onResetLearningPathProgress={handleResetLearningPathProgress}
          onSelectBodyPart={handleSelectBodyPart}
          onToggleFavoriteExercise={handleToggleFavoriteExercise}
          onMarkExerciseComplete={handleMarkExerciseComplete}
          onShareExercise={handleShareExercise}
          onCloseRoutinePlayer={handleCloseRoutinePlayer}
        />
      )
      break

    case 'week-view':
    case 'program-session-editor':
      screen = (
        <PlanningRoutes
          currentScreen={currentScreen}
          selectedSport={selectedSport}
          weekProgress={weekProgress}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          generatedProgram={generatedProgram}
          activityLogs={activityLogs}
          editingProgramSession={editingProgramSession}
          editingSessionDayLabel={editingSessionDayLabel}
          hasWorkoutToday={hasWorkoutToday}
          weekViewScrollTop={screenScrollPositionsRef.current['week-view']}
          navigateTo={navigateTo}
          renderNavigationNotSet={renderNavigationNotSet}
          onCloseWeekView={handleCloseWeekView}
          onEditActivity={handleEditActivity}
          onDeleteActivity={handleDeleteActivity}
          onLogTraining={handleWeekViewLogTraining}
          onStartSessionForDay={handleStartSessionForDay}
          onEditSession={handleOpenProgramSessionEditor}
          onStartAction={handleCenterAction}
          onWeekViewScrollChange={handleWeekViewScrollChange}
          onSaveProgramSession={handleSaveProgramSession}
          onCloseProgramSessionEditor={handleCloseProgramSessionEditor}
        />
      )
      break

    case 'workout-session':
    case 'rest-timer':
    case 'session-complete':
    case 'exercise-list':
    case 'post-workout-reflection':
    case 'missed-session-accountability':
    case 'round-timer':
      screen = (
        <ActiveSessionRoutes
          currentScreen={currentScreen}
          currentSession={currentSession}
          displaySession={displaySession}
          currentExerciseIndex={currentExerciseIndex}
          currentSet={currentSet}
          sessionStartTime={sessionStartTime}
          weightUnit={weightUnit}
          equipment={equipment}
          sessionPaused={sessionPaused}
          pausedTime={pausedTime}
          pauseStartedAt={pauseStartedAt}
          setProgressByExercise={setProgressByExercise}
          currentSessionWeights={currentSessionWeights}
          lastSessionWeights={lastSessionWeights}
          restTimerDuration={restTimerDuration}
          restTimerEndsAt={restTimerEndsAt}
          restExercise={restExercise}
          sessionDurationSeconds={getSessionDuration()}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          lastCompletedSessionVolume={lastCompletedSession?.volume}
          bestSet={bestSet}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          lastCompletedSession={lastCompletedSession}
          editingReflectionSession={editingReflectionSession}
          previousReflectionSession={previousReflectionSession}
          lastCompletedSessionPrs={lastCompletedSession?.prs ?? []}
          roundTimerMode={roundTimerMode}
          hasWorkoutToday={hasWorkoutToday}
          carryOverSessionDayLabel={carryOverSessionDayLabel}
          missedPlannedSessionCount={missedPlannedSessionCount}
          undoLabel={undoAction?.label ?? null}
          navigateTo={navigateTo}
          onStartAction={handleCenterAction}
          onTogglePause={handleTogglePause}
          onEndSession={handleEndSession}
          onWeightUnitChange={setWeightUnit}
          onSelectSet={handleSelectSet}
          onToggleSetDone={handleToggleSetDone}
          onFinishWorkoutSession={handleFinishWorkoutSession}
          onRecordSessionPr={handleRecordCurrentSessionPr}
          onUndo={handleUndo}
          onAdjustRest={handleAdjustRest}
          onSkipRest={handleSkipRest}
          onTimerComplete={handleTimerComplete}
          onCloseSessionComplete={handleSessionCompleteClose}
          onViewWeekFromSessionComplete={handleViewWeekFromSessionComplete}
          onEditReflection={handleEditCompletedReflection}
          onCompleteReflection={handleReflectionComplete}
          onSkipReflection={handleSkipPostWorkoutReflection}
          onSubmitMissedSession={handleMissedSessionSubmit}
          onDismissMissedSession={handleMissedSessionDismiss}
          onCompleteRoundTimer={handleRoundTimerComplete}
          onCloseRoundTimer={handleRoundTimerClose}
        />
      )
      break

    // exercises-main has been merged into training-hub

    // Loading screen - shown after login while data loads
    case 'loading':
    case 'navigation-not-set':
      screen = (
        <StatusRoutes
          currentScreen={currentScreen}
          loadingContext={loadingContext}
          navigationError={navigationError}
          onLoadComplete={handleLoadingComplete}
          onGoBackFromNavigationError={handleGoBackFromNavigationError}
          onGoHomeFromNavigationError={handleGoHomeFromNavigationError}
        />
      )
      break

    // Social screens
    case 'auth-login':
    case 'auth-signup':
    case 'email-verification-pending':
      screen = (
        <AuthRoutes
          currentScreen={currentScreen}
          pendingVerificationEmail={pendingVerificationEmail}
          navigateTo={navigateTo}
          onLogin={handleAuthLogin}
          onSkipLogin={handleAuthSkip}
          onSignup={handleAuthSignup}
          onEmailVerificationRequired={handleEmailVerificationRequired}
          onVerifiedEmail={handleVerifiedPendingEmail}
          onBackFromEmailVerification={handleBackFromEmailVerification}
          onPendingFallbackLogin={handlePendingVerificationFallbackLogin}
          onPendingFallbackSkip={handlePendingVerificationFallbackSkip}
        />
      )
      break

    case 'workout-builder':
    case 'user-profile':
    case 'edit-profile':
    case 'workout-detail':
      screen = (
        <ProfileWorkoutRoutes
          currentScreen={currentScreen}
          currentUser={currentUser}
          selectedWorkout={selectedWorkout}
          workoutBuilderPrefillExercise={workoutBuilderPrefillExercise}
          hasWorkoutToday={hasWorkoutToday}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
          navigateTo={navigateTo}
          goBack={goBack}
          renderNavigationNotSet={renderNavigationNotSet}
          onSaveWorkout={handleSaveWorkoutBuilder}
          onCloseWorkoutBuilder={handleCloseWorkoutBuilder}
          onWorkoutPrefillHandled={() => setWorkoutBuilderPrefillExercise(null)}
          onSelectWorkout={handleSelectProfileWorkout}
          onSaveEditedProfile={handleSaveEditedProfile}
          onStartWorkout={handleStartCustomWorkout}
          onCopyWorkout={handleCopyWorkoutToBuilder}
          onLoginToProfile={handleLoginToProfile}
          onStartAction={handleCenterAction}
        />
      )
      break

    default:
      screen = renderNavigationNotSet(
        'This navigation route is not implemented.',
        `Route: ${currentScreen}`,
        'home'
      )
  }

  // Determine transition class
  const getTransitionClass = () => {
    if (!isTransitioning && !transitionDirection) return ''
    if (transitionDirection === 'forward') {
      return isTransitioning ? 'screen-enter' : ''
    }
    if (transitionDirection === 'back') {
      return isTransitioning ? 'screen-enter-back' : ''
    }
    return ''
  }

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className={`h-full ${getTransitionClass()}`}>
        {screen}
      </div>
      {navigationBlockNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[75] px-4">
          <div className="rounded-full border border-red-500/45 bg-black/90 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-lg">
            {navigationBlockNotice}
          </div>
        </div>
      )}
      {showResumePrompt && (
        <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-4">
              Session found
            </p>
            <h2 className="text-2xl font-black text-foreground mb-3">
              Resume your workout?
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              We restored your last session so you can pick up where you left off.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResumeSession}
                className="w-full h-14 bg-foreground text-background font-semibold text-base tracking-wide uppercase transition-opacity hover:opacity-90 active:opacity-80 rounded-lg"
              >
                Resume session
              </button>
              <button
                onClick={() => setShowDiscardConfirm(true)}
                className="w-full h-12 text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground transition-colors rounded-lg"
              >
                Discard session
              </button>
            </div>
            <ConfirmationModal
              isOpen={showDiscardConfirm}
              onClose={() => setShowDiscardConfirm(false)}
              onConfirm={() => {
                setShowDiscardConfirm(false)
                handleDiscardResume()
              }}
              title="Discard session?"
              message="Your workout progress will be lost. This action cannot be undone."
              confirmText="Discard"
              cancelText="Keep session"
              variant="destructive"
            />
          </div>
        </div>
      )}
      {shouldShowMandatorySubscriptionGate && (
        <div className="fixed inset-0 z-[70] bg-background/95 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mb-4">
              Subscription required
            </p>
            <h2 className="text-2xl font-black text-foreground mb-3">
              Keep the full coaching layer
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Premium is required after your first {SUBSCRIPTION_REQUIRED_AFTER_DAYS} days to keep full access to the app.
            </p>
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 mb-4 text-left">
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {PREMIUM_POSITIONING_COPY}
              </p>
            </div>
            <div className="mb-6 space-y-2 text-left">
              {PREMIUM_CORE_HIGHLIGHTS.map((highlight) => (
                <div key={highlight} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
            <p className="text-lg font-black text-foreground mb-8">
              {PREMIUM_SUBSCRIPTION_PRICE_LABEL}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartMandatorySubscription}
                disabled={isStartingMandatorySubscription || isRefreshingMandatorySubscription}
                className="w-full h-14 bg-foreground text-background font-semibold text-base tracking-wide uppercase transition-opacity hover:opacity-90 active:opacity-80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStartingMandatorySubscription ? 'Opening checkout...' : 'Subscribe now'}
              </button>
              <button
                onClick={handleRefreshMandatorySubscription}
                disabled={isStartingMandatorySubscription || isRefreshingMandatorySubscription}
                className="w-full h-12 text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshingMandatorySubscription ? 'Checking status...' : 'I already subscribed'}
              </button>
            </div>
            {mandatorySubscriptionError && (
              <p className="text-sm text-red-400 mt-4">{mandatorySubscriptionError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
