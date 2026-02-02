'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Screen, Equipment, WeekDay, SessionLog, TimerMode, SportType, Session, WeightUnit, ActivityLog, Drill, DrillCategory, DrillSubcategory, Routine, LearningPath } from '@/lib/types'
import { mockSession, mockWeekProgress, bodyweightSession, generateWeeklyProgram } from '@/lib/data'
import { allDrills, routines, learningPaths } from '@/lib/drills-data'
import { analytics } from '@/lib/analytics'
import { OnboardingSport } from '@/components/screens/onboarding-sport'
import { OnboardingSchedule } from '@/components/screens/onboarding-schedule'
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
import { BodyPartSelector } from '@/components/screens/body-part-selector'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
// Social screens
import { AuthLogin } from '@/components/screens/auth-login'
import { AuthSignup } from '@/components/screens/auth-signup'
import { WorkoutBuilder } from '@/components/screens/workout-builder'
import { CommunityFeed } from '@/components/screens/community-feed'
import { UserProfileScreen } from '@/components/screens/user-profile'
import { EditProfile } from '@/components/screens/edit-profile'
import { SearchDiscover } from '@/components/screens/search-discover'
import { SavedWorkouts } from '@/components/screens/saved-workouts'
import { WorkoutDetail } from '@/components/screens/workout-detail'
import { LoadingScreen } from '@/components/screens/loading-screen'
import { socialService } from '@/lib/social-service'
import { UserProfile, CustomWorkout } from '@/lib/social-types'

const STORAGE_KEY = 'dagestaniDiscipline.state'
const UNDO_TTL_MS = 6000
const STREAK_GRACE_HOURS = 36
const DEFAULT_SCREENSHOT_INTERVAL_MS = 1400
const DEFAULT_SCREENSHOT_DELAY_MS = 400

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
  'community-feed',
  'search-discover',
  'workout-detail',
  'saved-workouts',
  'workout-builder',
  'user-profile',
  'edit-profile',
  'user-profile-other',
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
  // Core state
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth-login')
  const [selectedSport, setSelectedSport] = useState<SportType>('wrestling')
  const [trainingDays, setTrainingDays] = useState(4)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')
  const [generatedProgram, setGeneratedProgram] = useState<Session[] | null>(null)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)

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
  const [weekProgress, setWeekProgress] = useState<WeekDay[]>(mockWeekProgress)

  // Streak & Accountability state
  const [currentStreak, setCurrentStreak] = useState(3)
  const [longestStreak, setLongestStreak] = useState(7)
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

  // Screen transition state
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back' | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const previousScreenRef = useRef<Screen | null>(null)

  // Social state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<CustomWorkout | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  const screenshotParams = getScreenshotParams()
  const isScreenshotMode = screenshotParams.enabled
  const screenshotScreen = screenshotParams.screen
  const screenshotIntervalMs = screenshotParams.intervalMs
  const screenshotDelayMs = screenshotParams.delayMs

  // Get the current session - bodyweight sessions override the program
  const currentSession = equipment === 'bodyweight'
    ? bodyweightSession
    : (generatedProgram?.[currentDayIndex] ?? mockSession)

  // Calculate completed and planned sessions
  const completedSessions = weekProgress.filter(d => d.completed).length
  const plannedSessions = weekProgress.filter(d => d.planned).length

  // Load persisted state
  useEffect(() => {
    if (isScreenshotMode) {
      hasHydratedRef.current = true
      return
    }
    if (typeof window === 'undefined') return
    try {
      // Check auth state FIRST - if not authenticated, stay on auth-login
      const authState = socialService.getAuthState()
      if (!authState.isAuthenticated || !authState.user) {
        // User is not logged in - keep them on auth-login screen
        hasHydratedRef.current = true
        return
      }

      // User is authenticated - set current user and restore app state
      setCurrentUser(authState.user)

      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // No saved state but user is authenticated - go to home
        setCurrentScreen('home')
        hasHydratedRef.current = true
        return
      }
      const data = JSON.parse(stored)

      // Restore screen, but never restore to auth screens for authenticated users
      const savedScreen = data.currentScreen ?? 'home'
      const authScreens = ['auth-login', 'auth-signup', 'loading']
      setCurrentScreen(authScreens.includes(savedScreen) ? 'home' : savedScreen)

      setSelectedSport(data.selectedSport ?? 'wrestling')
      setTrainingDays(data.trainingDays ?? 4)
      setEquipment(data.equipment ?? null)
      setWeightUnit(data.weightUnit ?? 'lbs')
      setGeneratedProgram(data.generatedProgram ?? null)
      setCurrentDayIndex(data.currentDayIndex ?? 0)

      setCurrentExerciseIndex(data.currentExerciseIndex ?? 0)
      setCurrentSet(data.currentSet ?? 1)
      setSessionStartTime(data.sessionStartTime ?? null)
      setPausedTime(data.pausedTime ?? 0)
      setRestTimerEndsAt(data.restTimerEndsAt ?? null)
      setRestTimerDuration(data.restTimerDuration ?? 0)
      setSessionPaused(data.sessionPaused ?? false)
      setPauseStartedAt(data.pauseStartedAt ?? null)

      setWeekProgress(data.weekProgress ?? mockWeekProgress)
      setCurrentStreak(data.currentStreak ?? 0)
      setLongestStreak(data.longestStreak ?? 0)
      setLastWorkoutDate(data.lastWorkoutDate ?? null)
      setSessionHistory(data.sessionHistory ?? [])
      setMissedSessionExcuse(data.missedSessionExcuse ?? null)
      setCurrentSessionWeights(data.currentSessionWeights ?? {})
      setTotalVolume(data.totalVolume ?? 0)
      setActivityLogs(data.activityLogs ?? [])

      if (data.sessionStartTime && ['workout-session', 'rest-timer'].includes(savedScreen)) {
        setShowResumePrompt(true)
      }
    } catch (error) {
      console.debug('Failed to hydrate state:', error)
    } finally {
      hasHydratedRef.current = true
    }
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
      generatedProgram,
      currentDayIndex,
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
      activityLogs
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
    generatedProgram,
    currentDayIndex,
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
    activityLogs
  ])

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

    const demoOtherUser: UserProfile = {
      id: 'demo-user-2',
      username: 'matmonster',
      displayName: 'Mat Monster',
      bio: 'Judo black belt. Grip game specialist.',
      sport: 'judo',
      createdAt: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000).toISOString(),
      workoutCount: 34,
      followerCount: 1200,
      followingCount: 88,
      totalSaves: 540,
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
      setWeekProgress(mockWeekProgress)
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
      setSelectedUser(demoOtherUser)
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
    for (let i = fromIndex + 1; i < currentSession.exercises.length; i++) {
      if (!skippedExercises.has(currentSession.exercises[i].id)) {
        return i
      }
    }
    return null // No more exercises
  }, [currentSession.exercises, skippedExercises])

  // Check if current exercise is the last non-skipped one
  const isLastNonSkippedExercise = useCallback((): boolean => {
    return findNextExerciseIndex(currentExerciseIndex) === null
  }, [currentExerciseIndex, findNextExerciseIndex])

  // Handle set confirmation
  const handleConfirmSet = useCallback((weight?: number) => {
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
    currentSession.exercises,
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
  }, [currentExerciseIndex, currentSet, currentSession.exercises, currentSessionWeights])

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
    if (index < 0 || index >= currentSession.exercises.length) return
    const targetExercise = currentSession.exercises[index]
    if (skippedExercises.has(targetExercise.id)) return

    setCurrentExerciseIndex(index)
    setCurrentSet(1)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setCurrentScreen('workout-session')
    analytics.track('exercise_jumped', { fromIndex: currentExerciseIndex, toIndex: index })
  }, [currentSession.exercises, skippedExercises, currentExerciseIndex])

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
  const handleLogActivity = useCallback((log: Omit<ActivityLog, 'id'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: crypto.randomUUID()
    }
    setActivityLogs(prev => [newLog, ...prev])
    analytics.track('activity_logged', { type: log.type, duration: log.duration, intensity: log.intensity })
    setEditingActivity(null)
    setCurrentScreen('home')
  }, [])

  // Handle updating an existing activity
  const handleUpdateActivity = useCallback((log: Omit<ActivityLog, 'id'>, activityId: string) => {
    setActivityLogs(prev => prev.map(a =>
      a.id === activityId ? { ...log, id: activityId } : a
    ))
    analytics.track('activity_updated', { type: log.type, duration: log.duration, intensity: log.intensity })
    setEditingActivity(null)
    setCurrentScreen('home')
  }, [])

  // Handle editing an activity - navigate to log-activity with pre-filled data
  const handleEditActivity = useCallback((activity: ActivityLog) => {
    setEditingActivity(activity)
    setCurrentScreen('log-activity')
  }, [])

  // Handle deleting an activity
  const handleDeleteActivity = useCallback((activityId: string) => {
    setActivityLogs(prev => prev.filter(log => log.id !== activityId))
    analytics.track('activity_deleted', { activityId })
  }, [])

  // Handle starting session
  const handleStartSession = useCallback(() => {
    setCurrentExerciseIndex(0)
    setCurrentSet(1)
    setSessionStartTime(Date.now())
    setPausedTime(0)
    setSessionPaused(false)
    setPauseStartedAt(null)
    setRestTimerEndsAt(null)
    setRestTimerDuration(0)
    setUndoAction(null)
    setSkippedExercises(new Set()) // Reset skipped exercises for new session
    setCurrentScreen('workout-session')
    analytics.track('workout_started', { sessionId: currentSession.id })
  }, [currentSession.id])

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
  const handleReflectionComplete = useCallback((effortRating: number, notes: string) => {
    // Save session log
    const sessionLog: SessionLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      sessionId: currentSession.id,
      completed: true,
      effortRating,
      totalTime: getSessionDuration(),
      notes,
      weight: currentSessionWeights,
      volume: totalVolume,
    }

    setSessionHistory(prev => [...prev, sessionLog])

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
      const todayIndex = newProgress.findIndex(d => d.planned && !d.completed)
      if (todayIndex !== -1) {
        newProgress[todayIndex] = { ...newProgress[todayIndex], completed: true }
      }
      return newProgress
    })

    // Update streak
    updateStreak()

    // Go to session complete screen
    setCurrentScreen('session-complete')
    analytics.track('session_completed', { sessionId: currentSession.id, effortRating })
  }, [currentSession, currentSessionWeights, totalVolume, getSessionDuration, updateStreak])

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
    setCurrentScreen('home')
  }, [])


  const lastSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null
  const lastSessionWeights = lastSession?.weight
  const lastCompletedSession = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : null

  const bestSet = (() => {
    if (!lastCompletedSession?.weight) return null
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
  const restExercise = currentSession.exercises[restExerciseIndex]

  const trainingTarget: Screen = sessionStartTime ? 'workout-session' : 'exercise-list'
  let screen: React.ReactNode = null

  switch (currentScreen) {
    case 'onboarding-sport':
      screen = (
        <OnboardingSport
          sport={selectedSport}
          onSportChange={setSelectedSport}
          onContinue={() => setCurrentScreen('onboarding-schedule')}
        />
      )
      break

    case 'onboarding-schedule':
      screen = (
        <OnboardingSchedule
          trainingDays={trainingDays}
          onDaysChange={setTrainingDays}
          onContinue={() => setCurrentScreen('onboarding-equipment')}
          onBack={() => setCurrentScreen('onboarding-sport')}
        />
      )
      break

    case 'onboarding-equipment':
      screen = (
        <OnboardingEquipment
          equipment={equipment}
          onEquipmentChange={setEquipment}
          onStart={() => {
            const program = generateWeeklyProgram(selectedSport, trainingDays)
            setGeneratedProgram(program)
            setCurrentDayIndex(0)
            setCurrentScreen('home')
          }}
          onBack={() => setCurrentScreen('onboarding-schedule')}
        />
      )
      break

    case 'home':
      screen = (
        <Home
          session={currentSession}
          weekProgress={weekProgress}
          completedSessions={completedSessions}
          plannedSessions={plannedSessions}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          equipment={equipment}
          onStartSession={handleStartSession}
          onViewExerciseList={() => setCurrentScreen('exercise-list')}
          onStartRoundTimer={handleStartRoundTimer}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          undoLabel={undoAction?.label ?? null}
          onUndo={handleUndo}
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
          onSportChange={setSelectedSport}
          onDaysChange={setTrainingDays}
          onEquipmentChange={setEquipment}
          onWeightUnitChange={setWeightUnit}
          onSave={() => {
            const newProgram = generateWeeklyProgram(selectedSport, trainingDays)
            setGeneratedProgram(newProgram)
            setCurrentDayIndex(0)
            setCurrentScreen('home')
          }}
          onLogout={() => {
            socialService.signOut()
            setCurrentUser(null)
            setCurrentScreen('auth-login')
          }}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
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
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          weightUnit={weightUnit}
          onClose={() => setCurrentScreen('home')}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
        />
      )
      break

    case 'training-hub':
      screen = (
        <TrainingHub
          sport={selectedSport}
          currentWorkoutFocus={currentSession?.focus}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
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
          learningPathProgress={learningPathProgress}
          recentlyViewed={recentlyViewedDrills}
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
      ) : null
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
      ) : null
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
      ) : null
      break

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
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          program={generatedProgram}
          activityLogs={activityLogs}
          onEditActivity={handleEditActivity}
          onDeleteActivity={handleDeleteActivity}
        />
      )
      break

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
          completedSessions={weekProgress.filter(d => d.completed).length}
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
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
        />
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
            // If user hasn't completed onboarding (no program generated), send to onboarding
            if (!generatedProgram || generatedProgram.length === 0) {
              setCurrentScreen('onboarding-sport')
            } else {
              setCurrentScreen('home')
            }
          }}
          loadingDuration={2500}
        />
      )
      break

    // Social screens
    case 'auth-login':
      screen = (
        <AuthLogin
          onLogin={(user) => {
            setCurrentUser(user)
            setCurrentScreen('loading')
          }}
          onNavigate={setCurrentScreen}
          onSkip={() => setCurrentScreen('loading')}
        />
      )
      break

    case 'auth-signup':
      screen = (
        <AuthSignup
          onSignup={(user) => {
            setCurrentUser(user)
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
          onClose={() => setCurrentScreen('community-feed')}
          editingWorkout={selectedWorkout || undefined}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
        />
      )
      break

    case 'community-feed':
      screen = (
        <CommunityFeed
          currentUser={currentUser}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
          onSelectUser={(user) => {
            setSelectedUser(user)
            setCurrentScreen('user-profile-other')
          }}
        />
      )
      break

    case 'user-profile':
      screen = currentUser ? (
        <UserProfileScreen
          user={currentUser}
          isOwnProfile={true}
          currentUser={currentUser}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
        />
      ) : (
        <AuthLogin
          onLogin={(user) => {
            setCurrentUser(user)
            setCurrentScreen('user-profile')
          }}
          onNavigate={setCurrentScreen}
          onSkip={() => setCurrentScreen('community-feed')}
        />
      )
      break

    case 'user-profile-other':
      screen = selectedUser ? (
        <UserProfileScreen
          user={selectedUser}
          isOwnProfile={false}
          currentUser={currentUser}
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
          onBack={() => setCurrentScreen('community-feed')}
        />
      ) : null
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
      ) : null
      break

    case 'search-discover':
      screen = (
        <SearchDiscover
          currentUser={currentUser}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
          onSelectUser={(user) => {
            setSelectedUser(user)
            setCurrentScreen('user-profile-other')
          }}
          onBack={() => setCurrentScreen('community-feed')}
        />
      )
      break

    case 'saved-workouts':
      screen = (
        <SavedWorkouts
          trainingTarget={trainingTarget}
          onNavigate={setCurrentScreen}
          onSelectWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-detail')
          }}
          onBack={() => setCurrentScreen('community-feed')}
        />
      )
      break

    case 'workout-detail':
      screen = selectedWorkout ? (
        <WorkoutDetail
          workout={selectedWorkout}
          currentUser={currentUser}
          onNavigate={setCurrentScreen}
          onSelectUser={(user) => {
            setSelectedUser(user)
            setCurrentScreen('user-profile-other')
          }}
          onStartWorkout={(workout) => {
            // TODO: Integrate with workout session
            console.log('Start workout:', workout)
          }}
          onCopyWorkout={(workout) => {
            setSelectedWorkout(workout)
            setCurrentScreen('workout-builder')
          }}
          onBack={() => setCurrentScreen('community-feed')}
        />
      ) : null
      break

    default:
      screen = null
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
