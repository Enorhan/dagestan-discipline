export type SportType = 'wrestling' | 'judo' | 'bjj'
export type WeightUnit = 'lbs' | 'kg'
export type Equipment = 'bodyweight' | 'gym'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
export type PrimaryGoal = 'balanced' | 'strength' | 'power' | 'conditioning' | 'skill'
export type BeltRank = 'white' | 'blue' | 'purple' | 'brown' | 'black'
export type ProfilePrivacy = 'public' | 'private'

export interface UserProfile {
  id: string
  username: string
  displayName: string
  profileHydrationPending?: boolean
  avatarUrl?: string
  bio?: string
  sport: SportType
  createdAt: string
  trainingDays?: number
  weightUnit?: WeightUnit
  equipment?: Equipment | null
  experienceLevel?: ExperienceLevel
  bodyweightKg?: number | null
  primaryGoal?: PrimaryGoal
  combatSessionsPerWeek?: number
  sessionMinutes?: number
  injuryNotes?: string | null
  isPremium?: boolean
  firstActiveAt?: string | null
  stripeCustomerId?: string | null
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
  premiumSource?: string
  premiumProviderId?: string
  premiumUpdatedAt?: string
  belt?: BeltRank
  stripes?: number
  gymName?: string
  privacy?: ProfilePrivacy
  primaryDiscipline?: string
  xp?: number
  level?: number
  flowStreak?: number
  trainingStreak?: number
  favoriteContentTypes?: string[]
  heardFrom?: string
  biggestChallenges?: string[]
  onboardingCompleted?: boolean
  paywallCompleted?: boolean
  coachMarksSeen?: boolean
  searchTutorialSeen?: boolean
  workoutCount: number
  followerCount: number
  followingCount: number
  totalSaves: number
}

export interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  isLoading: boolean
  error: string | null
  emailVerified: boolean
}
