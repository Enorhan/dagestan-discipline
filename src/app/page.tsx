'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Screen, Equipment, WeekDay, SessionLog, TimerMode, SportType, Session, WeightUnit, ActivityLog, Drill, DrillCategory, DrillSubcategory, Routine, LearningPath, ExerciseCategory, Athlete, ExperienceLevel, EnhancedExerciseData, PrimaryGoal } from '@/lib/types'
import { generateWeeklyProgram } from '@/lib/data'
import { allDrills, routines, learningPaths } from '@/lib/drills-data'
import { analytics } from '@/lib/analytics'
import { OnboardingSport } from '@/components/screens/onboarding-sport'
import { OnboardingSchedule } from '@/components/screens/onboarding-schedule'
import { OnboardingLevel } from '@/components/screens/onboarding-level'
import { OnboardingIntake } from '@/components/screens/onboarding-intake'
import { OnboardingEquipment } from '@/components/screens/onboarding-equipment'
import { Home } from '@/components/screens/home'
import { WeekView } from '@/components/screens/week-view'
import { WorkoutSession } from '@/components/screens/workout-session'
import { RestTimer } from '@/components/screens/rest-timer'
import { SessionComplete } from '@/components/screens/session-complete'
import { ExerciseList } from '@/components/screens/exercise-list'
import { PostWorkoutReflection } from '@/components/screens/post-workout-reflection'
import { MissedSessionAccountability } from '@/components/screens/missed-session-accountability'
import { RoundTimer } from '@/components/screens/round-timer'
import { Settings } from '@/components/screens/settings'
import { LogActivity } from '@/components/screens/log-activity'
import { TrainingStats } from '@/components/screens/training-stats'
import { TrainingHub } from '@/components/screens/training-hub'
import { DrillDetail } from '@/components/screens/drill-detail'
import { CategoryList } from '@/components/screens/category-list'
import { RoutinePlayer } from '@/components/screens/routine-player'
import { LearningPathScreen } from '@/components/screens/learning-path'
import { BodyPartSelector } from '@/components/screens/body-part-selector'
import { AthleteDetail } from '@/components/screens/athlete-detail'
import { SportExerciseCategories } from '@/components/screens/sport-exercise-categories'
import { SportCategoryExercises } from '@/components/screens/sport-category-exercises'
import { ExerciseDetail } from '@/components/screens/exercise-detail'
import { ProgramSessionEditor } from '@/components/screens/program-session-editor'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
// Social screens
import { AuthLogin } from '@/components/screens/auth-login'
import { AuthSignup } from '@/components/screens/auth-signup'
import { WorkoutBuilder } from '@/components/screens/workout-builder'
import { UserProfileScreen } from '@/components/screens/user-profile'
import { EditProfile } from '@/components/screens/edit-profile'
import { WorkoutDetail } from '@/components/screens/workout-detail'
import { LoadingScreen } from '@/components/screens/loading-screen'
import { NavigationNotSet } from '@/components/screens/navigation-not-set'
import { supabaseService } from '@/lib/supabase-service'
import stripeService from '@/lib/stripe-service'
import { UserProfile, CustomWorkout } from '@/lib/social-types'

const STORAGE_KEY = 'dagestaniDiscipline.state'
const UNDO_TTL_MS = 6000
const STREAK_GRACE_HOURS = 36
const DEFAULT_SCREENSHOT_INTERVAL_MS = 1400
const DEFAULT_SCREENSHOT_DELAY_MS = 400
const IMPLEMENTED_SCREENS: ReadonlySet<Screen> = new Set([
  'onboarding-sport',
  'onboarding-schedule',
  'onboarding-level',
  'onboarding-intake',
  'onboarding-equipment',
  'home',
  'settings',
  'log-activity',
  'training-stats',
  'training-hub',
  'drill-detail',
  'athlete-detail',
  'category-list',
  'routine-player',
  'learning-path',
  'body-part-selector',
  'week-view',
  'program-session-editor',
  'workout-session',
  'rest-timer',
  'session-complete',
  'exercise-list',
  'sport-exercise-categories',
  'sport-category-exercises',
  'exercise-detail',
  'post-workout-reflection',
  'missed-session-accountability',
  'round-timer',
  'loading',
  'auth-login',
  'auth-signup',
  'workout-builder',
  'user-profile',
  'edit-profile',
  'workout-detail',
  'navigation-not-set',
])

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

const SCREENSHOT_SCREENS: Screen[] = [
  'auth-login',
  'auth-signup',
  'loading',
  'onboarding-sport',
  'onboarding-schedule',
  'onboarding-equipment',
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

export default function App() {
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
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [programId, setProgramId] = useState<string | null>(null)
  const [savedProgramSessions, setSavedProgramSessions] = useState<Session[] | null>(null)
  const [hasProgramChanges, setHasProgramChanges] = useState(false)
  const [programMeta, setProgramMeta] = useState<ProgramMetaState | null>(null)
  const [sessionOverride, setSessionOverride] = useState<Session | null>(null)
  const [sessionSource, setSessionSource] = useState<'program' | 'custom' | 'extra' | null>(null)
  const [editingSessionDayIndex, setEditingSessionDayIndex] = useState<number | null>(null)
  const [loadingComplete, setLoadingComplete] = useState(false)

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
  const [missedSessionExcuse, setMissedSessionExcuse] = useState<string | null>(null)

  // Performance tracking state
  const [currentSessionWeights, setCurrentSessionWeights] = useState<Record<string, number[]>>({})
  const [totalVolume, setTotalVolume] = useState(0)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const hasHydratedRef = useRef(false)

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

  // Screen transition state
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const previousScreenRef = useRef<Screen | null>(null)

  // Social state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<CustomWorkout | null>(null)

  // Loading state for Supabase data
  const [isLoadingSupabaseData, setIsLoadingSupabaseData] = useState(false)

  const screenshotParams = getScreenshotParams()
  const isScreenshotMode = screenshotParams.enabled
  const screenshotScreen = screenshotParams.screen
  const screenshotIntervalMs = screenshotParams.intervalMs
  const screenshotDelayMs = screenshotParams.delayMs

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

  const nextPlannedDayIndex = useMemo(() => {
    const nextIndex = weekProgress.findIndex(d => d.planned && !d.completed)
    if (nextIndex !== -1) return nextIndex
    return weekProgress.findIndex(d => d.planned)
  }, [weekProgress])

  const programDayIndex = (sessionStartTime && sessionSource === 'program')
    ? currentDayIndex
    : nextPlannedDayIndex

  const programSession = programDayIndex >= 0 ? getSessionForDay(programDayIndex) : null
  const currentSession = sessionOverride ?? programSession

  // Calculate completed and planned sessions
  const completedSessions = weekProgress.filter(d => d.planned && d.completed).length
  const plannedSessions = weekProgress.filter(d => d.planned).length

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
        console.log('[Hydration] Auth state:', authState)
        if (!authState.isAuthenticated || !authState.user) {
          // User is not logged in - keep them on auth-login screen
          console.log('[Hydration] Not authenticated, staying on auth-login')
          setCurrentUser(null)
          setFavoriteExercises(new Set())
          setCompletedExercises(new Set())
          setCurrentScreen('auth-login')
          hasHydratedRef.current = true
          return
        }

        // User is authenticated - set current user and restore app state
        console.log('[Hydration] User authenticated:', authState.user.username)
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
          // Don't change screen if already on loading/onboarding screens
          console.log('[Hydration] No localStorage data, resetting to defaults')
          setGeneratedProgram(null)
          setCurrentStreak(0)
          setLongestStreak(0)
          setWeekProgress(DEFAULT_WEEK_PROGRESS)
          setSessionHistory([])
          setActivityLogs([])
          // Only set to loading if we're on auth screens, otherwise keep current screen
          setCurrentScreen(prev => {
            const authScreens = ['auth-login', 'auth-signup']
            const newScreen = authScreens.includes(prev) ? 'loading' : prev
            console.log('[Hydration] Screen transition:', prev, '->', newScreen)
            return newScreen
          })
          hasHydratedRef.current = true
          return
        }
        console.log('[Hydration] Found localStorage data, restoring state')
        const data = JSON.parse(stored)

        // Restore screen, but never restore to auth screens for authenticated users
        const savedScreen = data.currentScreen ?? 'home'
        const authScreens = ['auth-login', 'auth-signup', 'loading']
        const normalizedScreen = typeof savedScreen === 'string' ? savedScreen : 'home'
        if (!IMPLEMENTED_SCREENS.has(normalizedScreen as Screen)) {
          setNavigationError({
            message: 'The previous route is not available in this build.',
            details: `Saved route: ${String(normalizedScreen)}`
          })
          setCurrentScreen('navigation-not-set')
        } else {
          setNavigationError(null)
          setCurrentScreen(authScreens.includes(normalizedScreen) ? 'home' : (normalizedScreen as Screen))
        }

        setGeneratedProgram(data.generatedProgram ?? null)
        setCurrentDayIndex(data.currentDayIndex ?? 0)
        setSessionOverride(data.sessionOverride ?? null)
        setSessionSource(data.sessionSource ?? null)

        setCurrentExerciseIndex(data.currentExerciseIndex ?? 0)
        setCurrentSet(data.currentSet ?? 1)
        setSessionStartTime(data.sessionStartTime ?? null)
        setPausedTime(data.pausedTime ?? 0)
        setRestTimerEndsAt(data.restTimerEndsAt ?? null)
        setRestTimerDuration(data.restTimerDuration ?? 0)
        setSessionPaused(data.sessionPaused ?? false)
        setPauseStartedAt(data.pauseStartedAt ?? null)

        setWeekProgress(data.weekProgress ?? DEFAULT_WEEK_PROGRESS)
        setCurrentStreak(data.currentStreak ?? 0)
        setLongestStreak(data.longestStreak ?? 0)
        setLastWorkoutDate(data.lastWorkoutDate ?? null)
        setSessionHistory(data.sessionHistory ?? [])
        setMissedSessionExcuse(data.missedSessionExcuse ?? null)
        setCurrentSessionWeights(data.currentSessionWeights ?? {})
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

        if (data.sessionStartTime && ['workout-session', 'rest-timer'].includes(savedScreen)) {
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
      currentSessionWeights,
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
    currentSessionWeights,
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

  // Fetch session and activity data from Supabase when user authenticates
  useEffect(() => {
    if (!currentUser || isScreenshotMode) return

    const fetchSupabaseData = async () => {
      setIsLoadingSupabaseData(true)
      setFavoriteExercises(new Set())
      setCompletedExercises(new Set())
      try {
        const [
          supabaseSessionLogs,
          supabaseActivityLogs,
          supabaseFavorites,
          supabaseCompletions,
        ] = await Promise.all([
          supabaseService.getSessionLogs(),
          supabaseService.getActivityLogs(),
          supabaseService.getExerciseFavorites(),
          supabaseService.getExerciseCompletions(),
        ])

        // Program + state
        let programSnapshot = await supabaseService.getActiveProgram()
        if (!programSnapshot) {
          const fallbackSport = currentUser.sport ?? selectedSport
          const fallbackDays = currentUser.trainingDays ?? trainingDays
          const blueprint = generateWeeklyProgram(fallbackSport, fallbackDays, {
            level: currentUser.experienceLevel ?? userExperienceLevel,
            equipment: currentUser.equipment ?? equipment,
            primaryGoal: currentUser.primaryGoal ?? primaryGoal,
            combatSessionsPerWeek: currentUser.combatSessionsPerWeek ?? combatSessionsPerWeek,
            sessionMinutes: currentUser.sessionMinutes ?? sessionMinutes,
          })
          const sessions = await supabaseService.resolveProgramSessionsToLibraryExercises({
            sport: fallbackSport,
            sessions: blueprint,
            equipment: currentUser.equipment ?? equipment,
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
            level: currentUser.experienceLevel ?? userExperienceLevel,
            equipment: currentUser.equipment ?? equipment,
            primaryGoal: currentUser.primaryGoal ?? primaryGoal,
            combatSessionsPerWeek: currentUser.combatSessionsPerWeek ?? combatSessionsPerWeek,
            sessionMinutes: currentUser.sessionMinutes ?? sessionMinutes,
          })
          const sessions = await supabaseService.resolveProgramSessionsToLibraryExercises({
            sport: regenSport,
            sessions: blueprint,
            equipment: currentUser.equipment ?? equipment,
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
            equipment: currentUser.equipment ?? equipment,
            level: currentUser.experienceLevel ?? userExperienceLevel,
            primaryGoal: currentUser.primaryGoal ?? primaryGoal,
            combatSessionsPerWeek: currentUser.combatSessionsPerWeek ?? combatSessionsPerWeek,
            sessionMinutes: currentUser.sessionMinutes ?? sessionMinutes,
          })

          const programState = await supabaseService.getProgramState()
          if (programState && programState.length > 0) {
            setWeekProgress(programState)
          } else {
            const defaultProgress = buildWeekProgress(programSnapshot.trainingDays)
            setWeekProgress(defaultProgress)
            await supabaseService.upsertProgramState(programSnapshot.programId, defaultProgress)
          }
        }

        // Merge with localStorage data - Supabase takes precedence
        if (supabaseSessionLogs.length > 0) {
          setSessionHistory(supabaseSessionLogs)
        }
        if (supabaseActivityLogs.length > 0) {
          setActivityLogs(supabaseActivityLogs)
        }
        setFavoriteExercises(supabaseFavorites)
        setCompletedExercises(supabaseCompletions)
        if (currentUser.equipment !== undefined) setEquipment(currentUser.equipment ?? null)
        if (currentUser.weightUnit) setWeightUnit(currentUser.weightUnit)
        if (currentUser.experienceLevel) setUserExperienceLevel(currentUser.experienceLevel)
        if (currentUser.bodyweightKg !== undefined) setBodyweightKg(currentUser.bodyweightKg ?? null)
        if (currentUser.primaryGoal) setPrimaryGoal(currentUser.primaryGoal)
        if (currentUser.combatSessionsPerWeek !== undefined) setCombatSessionsPerWeek(currentUser.combatSessionsPerWeek ?? 0)
        if (currentUser.sessionMinutes !== undefined) setSessionMinutes(currentUser.sessionMinutes ?? 45)
        if (currentUser.injuryNotes !== undefined) setInjuryNotes(currentUser.injuryNotes ?? '')
      } catch (error) {
        console.debug('Failed to fetch Supabase data, using localStorage cache:', error)
      } finally {
        setIsLoadingSupabaseData(false)
      }
    }

    fetchSupabaseData()
  }, [currentUser, isScreenshotMode])

  useEffect(() => {
    if (currentScreen !== 'loading' || !loadingComplete) return
    if (isLoadingSupabaseData) return
    if (!generatedProgram || generatedProgram.length === 0) {
      setCurrentScreen('onboarding-sport')
    } else {
      setCurrentScreen('home')
    }
  }, [currentScreen, loadingComplete, isLoadingSupabaseData, generatedProgram])

  useEffect(() => {
    if (currentScreen === 'navigation-not-set') return
    if (!navigationError) return
    setNavigationError(null)
  }, [currentScreen, navigationError])

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
    if (!lastWorkoutDate || !hasHydratedRef.current) return

    const today = new Date().toDateString()
    const lastWorkout = new Date(lastWorkoutDate).toDateString()
    const daysSinceLastWorkout = Math.floor(
      (new Date(today).getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastWorkout > 1 && currentStreak > 0) {
      setCurrentScreen('missed-session-accountability')
    }
  }, [lastWorkoutDate, currentStreak])

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
      setCurrentScreen('post-workout-reflection')
    } else if (isLastSet) {
      // Move to next non-skipped exercise
      const nextIndex = findNextExerciseIndex(currentExerciseIndex)
      if (nextIndex !== null) {
        setRestTimerDuration(exercise.restTime)
        setRestTimerEndsAt(Date.now() + exercise.restTime * 1000)
        setCurrentScreen('rest-timer')
        setCurrentExerciseIndex(nextIndex)
        setCurrentSet(1)
      } else {
        // No more exercises, go to reflection
        setCurrentScreen('post-workout-reflection')
      }
    } else {
      // Start rest timer, then next set
      setRestTimerDuration(exercise.restTime)
      setRestTimerEndsAt(Date.now() + exercise.restTime * 1000)
      setCurrentScreen('rest-timer')
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
    isLastNonSkippedExercise,
    findNextExerciseIndex
  ])

  const handlePreviousSet = useCallback(() => {
    if (!currentSession) return
    if (currentExerciseIndex === 0 && currentSet === 1) return

    const isWithinExercise = currentSet > 1
    const targetExerciseIndex = isWithinExercise ? currentExerciseIndex : Math.max(0, currentExerciseIndex - 1)
    const targetExercise = currentSession.exercises[targetExerciseIndex]
    const targetSet = isWithinExercise ? currentSet - 1 : targetExercise.sets

    const weights = currentSessionWeights[targetExercise.id]
    const lastLoggedWeight = weights && weights.length > 0 ? weights[weights.length - 1] : null

    if (lastLoggedWeight !== null && lastLoggedWeight !== undefined && !Number.isNaN(lastLoggedWeight)) {
      const prescribedReps = targetExercise.reps || 1
      setTotalVolume(prev => Math.max(0, prev - (lastLoggedWeight * prescribedReps)))
    }

    if (weights && weights.length > 0) {
      setCurrentSessionWeights(prev => {
        const updated = { ...prev }
        const nextWeights = updated[targetExercise.id]?.slice(0, -1) || []
        if (nextWeights.length === 0) {
          delete updated[targetExercise.id]
        } else {
          updated[targetExercise.id] = nextWeights
        }
        return updated
      })
    }

    setCurrentExerciseIndex(targetExerciseIndex)
    setCurrentSet(targetSet)
  }, [currentExerciseIndex, currentSet, currentSession, currentSessionWeights])

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
    setCurrentScreen('workout-session')
    analytics.track('rest_skipped')
  }, [])

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
    setCurrentScreen('workout-session')
    analytics.track('exercise_jumped', { fromIndex: currentExerciseIndex, toIndex: index })
  }, [currentSession, skippedExercises, currentExerciseIndex])

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
    setCurrentScreen('workout-session')
  }, [])

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
    setCurrentScreen('home')
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
    }
  }, [])

  // Handle updating an existing activity
  const handleUpdateActivity = useCallback(async (log: Omit<ActivityLog, 'id'>, activityId: string) => {
    // Optimistically update local state
    setActivityLogs(prev => prev.map(a =>
      a.id === activityId ? { ...log, id: activityId } : a
    ))
    analytics.track('activity_updated', { type: log.type, duration: log.duration, intensity: log.intensity })
    setEditingActivity(null)
    setCurrentScreen('home')

    // Persist to Supabase (background, non-blocking)
    try {
      await supabaseService.updateActivity(activityId, log)
    } catch (error) {
      console.debug('Failed to update activity in Supabase, cached locally:', error)
    }
  }, [])

  // Handle editing an activity - navigate to log-activity with pre-filled data
  const handleEditActivity = useCallback((activity: ActivityLog) => {
    setEditingActivity(activity)
    setCurrentScreen('log-activity')
  }, [])

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

    if (source === 'program') {
      setSessionOverride(null)
      setSessionSource('program')
      setCurrentDayIndex(dayIndex ?? currentDayIndex)
    } else {
      setSessionOverride(session)
      setSessionSource(source)
      setCurrentDayIndex(dayIndex ?? getTodayIndex())
    }

    setCurrentScreen('workout-session')
    analytics.track('workout_started', { sessionId: session.id, source })
  }, [currentDayIndex])

  const handleStartSession = useCallback(() => {
    const dayIndex = nextPlannedDayIndex
    const session = dayIndex >= 0 ? getSessionForDay(dayIndex) : null
    beginSession(session, 'program', dayIndex)
  }, [beginSession, getSessionForDay, nextPlannedDayIndex])

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

  // Handle ending session early
  const handleEndSession = useCallback(() => {
    queueUndo({
      currentExerciseIndex,
      currentSet,
      sessionStartTime,
      restTimerEndsAt,
      restTimerDuration,
      currentScreen,
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
    setUndoAction(null)
    setSessionOverride(null)
    setSessionSource(null)
    setCurrentScreen('home')
    analytics.track('session_ended')
  }, [
    currentExerciseIndex,
    currentSet,
    sessionStartTime,
    restTimerEndsAt,
    restTimerDuration,
    currentScreen,
    currentSessionWeights,
    totalVolume,
    sessionPaused,
    pauseStartedAt,
    pausedTime,
    queueUndo
  ])

  // Handle post-workout reflection complete
  const handleReflectionComplete = useCallback(async (effortRating: number, notes: string) => {
    if (!currentSession) return
    // Save session log
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
      notes,
      weight: currentSessionWeights,
      volume: totalVolume,
    }

    // Optimistically update local state
    setSessionHistory(prev => [...prev, sessionLog])
    setCompletedExercises(prev => {
      const next = new Set(prev)
      // Only persist "completed" markers for real library exercises (UUID-backed).
      uuidIds.forEach(id => next.add(id))
      return next
    })

    // Reset session tracking
    setCurrentSessionWeights({})
    setTotalVolume(0)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setUndoAction(null)

    // Update week progress
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
        // Extra/custom sessions should not mutate the user's planned schedule.
        // Otherwise it corrupts the planned-day -> program-session mapping.
        planned: targetDay.planned,
        completed: true,
      }
      return newProgress
    })

    // Update streak
    updateStreak()

    // Go to session complete screen
    setCurrentScreen('session-complete')
    analytics.track('session_completed', { sessionId: currentSession.id, effortRating })

    // Persist to Supabase (background, non-blocking)
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
      // Update with the real ID from Supabase
      setSessionHistory(prev => prev.map(s => s.id === tempId ? savedLog : s))
      await supabaseService.logExerciseCompletions(uuidIds, savedLog.id, sessionSource ?? 'session')
    } catch (error) {
      console.debug('Failed to save session to Supabase, cached locally:', error)
    }
    setSessionOverride(null)
    setSessionSource(null)
  }, [currentSession, currentSessionWeights, totalVolume, getSessionDuration, updateStreak, currentDayIndex, sessionSource])

  // Handle session complete close
  const handleSessionCompleteClose = useCallback(() => {
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(null)
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setCurrentScreen('home')
  }, [])

  // Handle missed session accountability
  const handleMissedSessionSubmit = useCallback((excuse: string) => {
    setMissedSessionExcuse(excuse)
    setCurrentStreak(0)
    setCurrentScreen('home')
  }, [])

  const handleMissedSessionDismiss = useCallback(() => {
    setCurrentScreen('home')
  }, [])

  // Round timer handlers
  const handleStartRoundTimer = useCallback((mode: TimerMode) => {
    setRoundTimerMode(mode)
    setCurrentScreen('round-timer')
  }, [])

  const handleRoundTimerComplete = useCallback(() => {
    setCurrentScreen('home')
  }, [])

  const handleRoundTimerClose = useCallback(() => {
    setCurrentScreen('home')
  }, [])

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
    setTotalVolume(0)
    setUndoAction(null)
    setSessionOverride(null)
    setSessionSource(null)
    setCurrentScreen('home')
  }, [])


  const lastSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null
  const lastSessionWeights = lastSession?.weight
  const lastCompletedSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null

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

  // Smart center action for bottom nav
  const handleCenterAction = useCallback(() => {
    if (programSession && !sessionStartTime) {
      // Has workout today, not started yet -> Start workout
      handleStartSession()
    } else if (currentUser) {
      // No workout or already started -> Create workout
      setCurrentScreen('workout-builder')
    } else {
      // Not logged in -> Go to login
      setCurrentScreen('auth-login')
    }
  }, [programSession, sessionStartTime, currentUser, handleStartSession])

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
        setCurrentScreen(backTo)
      }}
      onGoHome={() => {
        setNavigationError(null)
        setCurrentScreen('home')
      }}
    />
  ), [])

  let screen: React.ReactNode = null

  switch (currentScreen) {
    case 'onboarding-sport':
      screen = (
        <OnboardingSport
          sport={selectedSport}
          onSportChange={(sport) => {
            setSelectedSport(sport)
            setSelectedExerciseSport(null)
          }}
          onContinue={() => setCurrentScreen('onboarding-schedule')}
        />
      )
      break

    case 'onboarding-schedule':
      screen = (
        <OnboardingSchedule
          trainingDays={trainingDays}
          onDaysChange={setTrainingDays}
          onContinue={() => setCurrentScreen('onboarding-level')}
          onBack={() => setCurrentScreen('onboarding-sport')}
        />
      )
      break

    case 'onboarding-level':
      screen = (
        <OnboardingLevel
          level={userExperienceLevel}
          onLevelChange={setUserExperienceLevel}
          onContinue={() => setCurrentScreen('onboarding-intake')}
          onBack={() => setCurrentScreen('onboarding-schedule')}
        />
      )
      break

    case 'onboarding-intake':
      screen = (
        <OnboardingIntake
          bodyweightKg={bodyweightKg}
          weightUnit={weightUnit}
          primaryGoal={primaryGoal}
          combatSessionsPerWeek={combatSessionsPerWeek}
          sessionMinutes={sessionMinutes}
          injuryNotes={injuryNotes}
          onBodyweightKgChange={setBodyweightKg}
          onWeightUnitChange={setWeightUnit}
          onPrimaryGoalChange={setPrimaryGoal}
          onCombatSessionsChange={setCombatSessionsPerWeek}
          onSessionMinutesChange={setSessionMinutes}
          onInjuryNotesChange={setInjuryNotes}
          onContinue={() => setCurrentScreen('onboarding-equipment')}
          onBack={() => setCurrentScreen('onboarding-level')}
        />
      )
      break

    case 'onboarding-equipment':
      screen = (
        <OnboardingEquipment
          equipment={equipment}
          onEquipmentChange={setEquipment}
          onStart={async () => {
            const programBlueprint = generateWeeklyProgram(selectedSport, trainingDays, {
              level: userExperienceLevel,
              equipment,
              primaryGoal,
              combatSessionsPerWeek,
              sessionMinutes,
            })
            const program = await supabaseService.resolveProgramSessionsToLibraryExercises({
              sport: selectedSport,
              sessions: programBlueprint,
              equipment,
            })
            const defaultProgress = buildWeekProgress(trainingDays)
            setGeneratedProgram(program)
            setWeekProgress(defaultProgress)
            setCurrentDayIndex(0)
            setProgramMeta({
              sport: selectedSport,
              trainingDays,
              equipment,
              level: userExperienceLevel,
              primaryGoal,
              combatSessionsPerWeek,
              sessionMinutes,
            })

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
                console.debug('Failed to update profile during onboarding:', error)
              }
              try {
                const newProgram = await supabaseService.createProgram({
                  sport: selectedSport,
                  trainingDays,
                  sessions: program,
                  label: 'Original',
                })
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
                await supabaseService.upsertProgramState(newProgram.programId, defaultProgress)
              } catch (error) {
                console.debug('Failed to create program during onboarding:', error)
              }
            }

            setCurrentScreen('home')
          }}
          onBack={() => setCurrentScreen('onboarding-intake')}
        />
      )
      break

    case 'home':
      screen = (
        <Home
          session={currentSession}
          weekProgress={weekProgress}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          equipment={equipment}
          onStartSession={handleStartSession}
          onNavigate={setCurrentScreen}
          undoLabel={undoAction?.label ?? null}
          onUndo={handleUndo}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'settings':
      screen = (
        <Settings
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
          onSportChange={(sport) => {
            setSelectedSport(sport)
            setSelectedExerciseSport(null)
          }}
          onDaysChange={setTrainingDays}
          onEquipmentChange={setEquipment}
          onWeightUnitChange={setWeightUnit}
          onExperienceLevelChange={setUserExperienceLevel}
          onBodyweightKgChange={setBodyweightKg}
          onPrimaryGoalChange={setPrimaryGoal}
          onCombatSessionsChange={setCombatSessionsPerWeek}
          onSessionMinutesChange={setSessionMinutes}
          onInjuryNotesChange={setInjuryNotes}
          onSave={async () => {
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
            setCurrentScreen('home')
          }}
          onLogout={() => {
            supabaseService.signOut()
            setCurrentUser(null)
            setFavoriteExercises(new Set())
            setCompletedExercises(new Set())
            setSessionHistory([])
            setActivityLogs([])
            setGeneratedProgram(null)
            setSavedProgramSessions(null)
            setProgramId(null)
            setHasProgramChanges(false)
            setCurrentScreen('auth-login')
          }}
          onNavigate={setCurrentScreen}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
          hasUnsavedProgramChanges={hasProgramChanges}
          onSaveProgramChanges={async () => {
            if (!programId || !generatedProgram) return
            try {
              const versionId = await supabaseService.saveProgramVersion(programId, generatedProgram, 'Saved changes')
              setSavedProgramSessions(generatedProgram)
              setHasProgramChanges(false)
            } catch (error) {
              console.debug('Failed to save program changes:', error)
            }
          }}
          onRevertProgramChanges={() => {
            if (!savedProgramSessions) return
            setGeneratedProgram(savedProgramSessions)
            setHasProgramChanges(false)
          }}
          onResetProgram={async () => {
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
          }}
          onStartTrial={async () => {
            if (!currentUser) {
              setCurrentScreen('auth-login')
              throw new Error('Please sign in to start the free trial.')
            }
            await stripeService.subscribeToPremium(currentUser.id)
          }}
        />
      )
      break

    case 'log-activity':
      screen = (
        <LogActivity
          onLogActivity={handleLogActivity}
          onUpdateActivity={handleUpdateActivity}
          editingActivity={editingActivity}
          onClose={() => {
            setEditingActivity(null)
            setCurrentScreen('home')
          }}
        />
      )
      break

    case 'training-stats':
      screen = (
        <TrainingStats
          sessionHistory={sessionHistory}
          activityLogs={activityLogs}
          completedExerciseCount={completedExercises.size}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weightUnit={weightUnit}
          onClose={() => setCurrentScreen('home')}
          onNavigate={setCurrentScreen}
          isLoading={isLoadingSupabaseData}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'training-hub':
      screen = (
        <TrainingHub
          sport={selectedSport}
          currentWorkoutFocus={currentSession?.focus}
          onNavigate={setCurrentScreen}
          backScreen='home'
          session={currentSession}
          onSelectDrill={(drill) => {
            setSelectedDrill(drill)
            setRecentlyViewedDrills(prev => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
            setCurrentScreen('drill-detail')
          }}
          onSelectCategory={(category) => {
            setSelectedCategory(category)
            setSelectedSubcategory(null)
            setCurrentScreen('category-list')
          }}
          onSelectRoutine={(routine) => {
            setSelectedRoutine(routine)
            setCurrentScreen('routine-player')
          }}
          onSelectLearningPath={(path) => {
            setSelectedLearningPath(path)
            setCurrentScreen('learning-path')
          }}
          onSelectBodyPart={() => {
            setCurrentScreen('body-part-selector')
          }}
          onSelectAthlete={(athlete) => {
            setSelectedAthlete(athlete)
            setCurrentScreen('athlete-detail')
          }}
          onSelectSport={(sport) => {
            setSelectedExerciseSport(sport)
          }}
          learningPathProgress={learningPathProgress}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'drill-detail':
      screen = selectedDrill ? (
        <DrillDetail
          drill={selectedDrill}
          onBack={() => {
            if (selectedCategory) {
              setCurrentScreen('category-list')
            } else {
              setCurrentScreen('training-hub')
            }
          }}
          onSelectRelatedDrill={(drill) => {
            setSelectedDrill(drill)
            setRecentlyViewedDrills(prev => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
          }}
        />
      ) : renderNavigationNotSet(
        'The selected drill is missing from the current app state.',
        'Open Training Hub and choose a drill again.',
        'training-hub'
      )
      break

    case 'athlete-detail':
      screen = selectedAthlete ? (
        <AthleteDetail
          athlete={selectedAthlete}
          userLevel={userExperienceLevel}
          onNavigate={setCurrentScreen}
          onBack={() => setCurrentScreen('training-hub')}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : renderNavigationNotSet(
        'The selected athlete is missing from the current app state.',
        'Open Training Hub and choose an athlete again.',
        'training-hub'
      )
      break

    case 'category-list':
      screen = selectedCategory ? (
        <CategoryList
          category={selectedCategory}
          onBack={() => setCurrentScreen('training-hub')}
          onSelectDrill={(drill) => {
            setSelectedDrill(drill)
            setRecentlyViewedDrills(prev => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
            setCurrentScreen('drill-detail')
          }}
          initialSubcategory={selectedSubcategory || undefined}
        />
      ) : renderNavigationNotSet(
        'No category was selected before opening this page.',
        'Open Training Hub and choose a category again.',
        'training-hub'
      )
      break

    case 'routine-player':
      screen = selectedRoutine ? (
        <RoutinePlayer
          routine={selectedRoutine}
          onComplete={() => {
            setSelectedRoutine(null)
            setCurrentScreen('training-hub')
          }}
          onClose={() => {
            setSelectedRoutine(null)
            setCurrentScreen('training-hub')
          }}
        />
      ) : renderNavigationNotSet(
        'No routine is available for playback right now.',
        'Open Training Hub and choose a routine again.',
        'training-hub'
      )
      break

    case 'learning-path': {
      const learningPath = selectedLearningPath
      const completedSteps = learningPath ? (learningPathProgress[learningPath.id] ?? 0) : 0

      screen = learningPath ? (
        <LearningPathScreen
          path={learningPath}
          completedSteps={completedSteps}
          onBack={() => setCurrentScreen('training-hub')}
          onNavigate={setCurrentScreen}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
          onOpenDrill={(drill) => {
            setSelectedDrill(drill)
            setRecentlyViewedDrills((prev) => [drill.id, ...prev.filter(id => id !== drill.id)].slice(0, 10))
            setCurrentScreen('drill-detail')
          }}
          onAdvanceStep={() => {
            setLearningPathProgress((prev) => {
              const previous = prev[learningPath.id] ?? 0
              const next = Math.min(previous + 1, learningPath.drills.length)
              return { ...prev, [learningPath.id]: next }
            })
          }}
          onResetProgress={() => {
            setLearningPathProgress((prev) => ({ ...prev, [learningPath.id]: 0 }))
          }}
        />
      ) : renderNavigationNotSet(
        'No learning path was selected before opening this page.',
        'Open Training Hub and choose a learning path again.',
        'training-hub'
      )
      break
    }

    case 'body-part-selector':
      screen = (
        <BodyPartSelector
          onBack={() => setCurrentScreen('training-hub')}
          onSelectBodyPart={(bodyPart) => {
            setSelectedCategory('injury-prevention')
            setSelectedSubcategory(bodyPart)
            setCurrentScreen('category-list')
          }}
        />
      )
      break

    case 'week-view':
      screen = (
        <WeekView
          weekProgress={weekProgress}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          onClose={() => setCurrentScreen('home')}
          onNavigate={setCurrentScreen}
          program={generatedProgram}
          activityLogs={activityLogs}
          onEditActivity={handleEditActivity}
          onDeleteActivity={handleDeleteActivity}
          onLogTraining={() => setCurrentScreen('log-activity')}
          onStartSessionForDay={handleStartSessionForDay}
          onEditSession={(dayIndex) => {
            setEditingSessionDayIndex(dayIndex)
            setCurrentScreen('program-session-editor')
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'program-session-editor': {
      const dayIndex = editingSessionDayIndex ?? -1
      const session = dayIndex >= 0 ? getSessionForDay(dayIndex) : null
      const dayLabel = weekProgress[dayIndex]?.day ?? 'Session'
      screen = session ? (
        <ProgramSessionEditor
          sport={selectedSport}
          session={session}
          dayLabel={dayLabel}
          onSave={(updatedSession) => {
            if (!generatedProgram) return
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
            setCurrentScreen('week-view')
          }}
          onClose={() => setCurrentScreen('week-view')}
        />
      ) : renderNavigationNotSet(
        'The requested session could not be found for this day.',
        'Open Week View and select a planned day again.',
        'week-view'
      )
      break
    }

    case 'workout-session':
      screen = (
        <WorkoutSession
          session={currentSession}
          currentExerciseIndex={currentExerciseIndex}
          currentSet={currentSet}
          sessionStartTime={sessionStartTime}
          weightUnit={weightUnit}
          equipment={equipment}
          isPaused={sessionPaused}
          pausedTime={pausedTime}
          pauseStartedAt={pauseStartedAt}
          onTogglePause={handleTogglePause}
          onConfirmSet={handleConfirmSet}
          onPreviousSet={handlePreviousSet}
          onEndSession={handleEndSession}
          onWeightUnitChange={setWeightUnit}
          lastSessionWeights={lastSessionWeights}
          undoLabel={undoAction?.label ?? null}
          onUndo={handleUndo}
          skippedExercises={skippedExercises}
          onJumpToExercise={handleJumpToExercise}
          onSkipExercise={handleSkipExercise}
        />
      )
      break

    case 'rest-timer':
      screen = (
        <RestTimer
          totalTime={restTimerDuration}
          endsAt={restTimerEndsAt}
          exerciseName={restExercise?.name ?? 'Next exercise'}
          nextSetNumber={currentSet}
          totalSets={restExercise?.sets ?? 0}
          isPaused={sessionPaused}
          onTogglePause={handleTogglePause}
          onAdjustTime={handleAdjustRest}
          onSkip={handleSkipRest}
          onTimerComplete={handleTimerComplete}
          undoLabel={undoAction?.label ?? null}
          onUndo={handleUndo}
        />
      )
      break

    case 'session-complete':
      screen = (
        <SessionComplete
          totalTime={getSessionDuration()}
          completedSessions={weekProgress.filter(d => d.planned && d.completed).length}
          plannedSessions={plannedSessions}
          totalVolume={lastCompletedSession?.volume}
          weightUnit={weightUnit}
          bestSet={bestSet}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          onClose={handleSessionCompleteClose}
          onViewWeek={() => setCurrentScreen('week-view')}
        />
      )
      break

    case 'exercise-list':
      screen = (
        <ExerciseList
          session={currentSession}
          currentExerciseIndex={currentExerciseIndex}
          onNavigate={setCurrentScreen}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    // exercises-main has been merged into training-hub

    case 'sport-exercise-categories':
      screen = (
        <SportExerciseCategories
          sport={selectedExerciseSport ?? selectedSport}
          onNavigate={setCurrentScreen}
          onBack={() => setCurrentScreen('training-hub')}
          onSelectCategory={(sport, category) => {
            setSelectedExerciseSport(sport)
            setSelectedExerciseCategory(category)
            setCurrentScreen('sport-category-exercises')
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'sport-category-exercises':
      screen = selectedExerciseCategory ? (
        <SportCategoryExercises
          sport={selectedExerciseSport ?? selectedSport}
          category={selectedExerciseCategory}
          onNavigate={setCurrentScreen}
          onBack={() => setCurrentScreen('sport-exercise-categories')}
          onExerciseSelect={(exercise) => {
            setSelectedExercise(exercise)
            setCurrentScreen('exercise-detail')
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : (
        <SportExerciseCategories
          sport={selectedExerciseSport ?? selectedSport}
          onNavigate={setCurrentScreen}
          onBack={() => setCurrentScreen('training-hub')}
          onSelectCategory={(sport, category) => {
            setSelectedExerciseSport(sport)
            setSelectedExerciseCategory(category)
            setCurrentScreen('sport-category-exercises')
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'exercise-detail':
      screen = selectedExercise ? (
        <ExerciseDetail
          exercise={selectedExercise}
          onNavigate={setCurrentScreen}
          onBack={() => setCurrentScreen('sport-category-exercises')}
          isFavorite={favoriteExercises.has(selectedExercise.id)}
          isCompleted={completedExercises.has(selectedExercise.id)}
          onToggleFavorite={(exerciseId) => {
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
          }}
          onMarkComplete={(exerciseId) => {
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
          }}
          onShare={(exercise) => {
            if (navigator.share) {
              navigator.share({
                title: exercise.name,
                text: `Check out this exercise: ${exercise.name} - used by ${exercise.athleteName}`,
                url: window.location.href
              }).catch(() => {})
            }
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : renderNavigationNotSet(
        'The selected exercise is missing from the current app state.',
        'Open the exercise library and choose an exercise again.',
        'sport-exercise-categories'
      )
      break

    case 'post-workout-reflection':
      screen = (
        <PostWorkoutReflection
          totalTime={getSessionDuration()}
          onComplete={handleReflectionComplete}
          onSkip={() => setCurrentScreen('session-complete')}
          undoLabel={undoAction?.label ?? null}
          onUndo={handleUndo}
        />
      )
      break

    case 'missed-session-accountability':
      screen = (
        <MissedSessionAccountability
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          onSubmit={handleMissedSessionSubmit}
          onDismiss={handleMissedSessionDismiss}
        />
      )
      break

    case 'round-timer':
      screen = (
        <RoundTimer
          mode={roundTimerMode}
          onComplete={handleRoundTimerComplete}
          onClose={handleRoundTimerClose}
        />
      )
      break

    // Loading screen - shown after login while data loads
    case 'loading':
      screen = (
        <LoadingScreen
          onLoadComplete={() => {
            setLoadingComplete(true)
          }}
          loadingDuration={2500}
        />
      )
      break

    case 'navigation-not-set':
      screen = (
        <NavigationNotSet
          message={navigationError?.message ?? 'The requested navigation route is not available.'}
          details={navigationError?.details}
          onGoBack={() => {
            setNavigationError(null)
            setCurrentScreen('home')
          }}
          backLabel="Back to home"
          onGoHome={() => {
            setNavigationError(null)
            setCurrentScreen('home')
          }}
        />
      )
      break

    // Social screens
    case 'auth-login':
      screen = (
        <AuthLogin
          onLogin={(user) => {
            console.log('[Login] User logged in:', user.username)
            setCurrentUser(user)
            console.log('[Login] Navigating to loading screen')
            setLoadingComplete(false)
            setCurrentScreen('loading')
          }}
          onNavigate={setCurrentScreen}
          onSkip={() => {
            setLoadingComplete(false)
            setCurrentScreen('loading')
          }}
        />
      )
      break

    case 'auth-signup':
      screen = (
        <AuthSignup
          onSignup={(user) => {
            setCurrentUser(user)
            setLoadingComplete(false)
            setCurrentScreen('loading')
          }}
          onNavigate={setCurrentScreen}
        />
      )
      break

    case 'workout-builder':
      screen = (
        <WorkoutBuilder
          onSave={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('user-profile')
          }}
          onClose={() => setCurrentScreen('user-profile')}
          editingWorkout={selectedWorkout || undefined}
          onNavigate={setCurrentScreen}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      )
      break

    case 'user-profile':
      screen = currentUser ? (
        <UserProfileScreen
          user={currentUser}
          isOwnProfile={true}
          currentUser={currentUser}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
          onStartAction={handleCenterAction}
          hasWorkoutToday={hasWorkoutToday}
        />
      ) : (
        <AuthLogin
          onLogin={(user) => {
            setCurrentUser(user)
            setCurrentScreen('user-profile')
          }}
          onNavigate={setCurrentScreen}
          onSkip={() => setCurrentScreen('home')}
        />
      )
      break

    case 'edit-profile':
      screen = currentUser ? (
        <EditProfile
          user={currentUser}
          onSave={(updatedUser) => {
            setCurrentUser(updatedUser)
            setCurrentScreen('user-profile')
          }}
          onBack={() => setCurrentScreen('user-profile')}
        />
      ) : renderNavigationNotSet(
        'Profile data is not loaded for editing.',
        'Sign in again and retry.',
        'auth-login'
      )
      break

    case 'workout-detail':
      screen = selectedWorkout ? (
        <WorkoutDetail
          workout={selectedWorkout}
          currentUser={currentUser}
          onStartWorkout={(workout) => {
            handleStartCustomWorkout(workout)
          }}
          onCopyWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-builder')
          }}
          onBack={() => setCurrentScreen('user-profile')}
        />
      ) : renderNavigationNotSet(
        'The selected workout is missing from the current app state.',
        'Open your profile and select a workout again.',
        'user-profile'
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
    </div>
  )
}
