import {
  BookOpen,
  Network,
  Shield,
  Target,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import type {
  BjjBottomTab,
  BjjPersistedState,
  BjjSessionType,
  BjjSessionVisibility,
} from '@/lib/bjj-types'

export const SESSION_TYPES_BY_BRANCH: Record<MartialArtsBranchId, BjjSessionType[]> = {
  bjj: ['Gi', 'No-Gi', 'Open Mat', 'Drilling', 'Competition'],
  grappling: ['No-Gi', 'Open Mat', 'Drilling', 'Sparring', 'Competition'],
}
export const DURATION_PRESETS: number[] = [30, 45, 60, 90, 120]
export const DURATION_MIN = 5
export const DURATION_MAX = 360
export const BELTS: Array<BjjPersistedState['profile']['belt']> = ['white', 'blue', 'purple', 'brown', 'black']
export const VISIBILITY_OPTIONS: BjjSessionVisibility[] = ['everyone', 'friends', 'private']

export const USERNAME_MIN_LEN = 3
export const USERNAME_MAX_LEN = 30

export const BRANCH_DOT_COLORS: Record<MartialArtsBranchId, string> = {
  'bjj': '#4d7cff',
  'grappling': '#7c5cff',
}

export const CALENDAR_WEEKDAY_LABELS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const ANALYTICS_CARDS: Array<{ label: string; background: string; Icon: LucideIcon }> = [
  { label: 'Submissions', background: '#3b0f14', Icon: Target },
  { label: 'Taps', background: '#36270a', Icon: Shield },
  { label: 'Sessions', background: '#091c3b', Icon: Zap },
  { label: 'Techniques', background: '#101d3a', Icon: BookOpen },
]

export const MAX_REEL_DURATION_MS = 180_000

export const ONBOARDING_PREVIEW_TECHNIQUES = [
  { id: 'preview-triangle', title: 'Triangle Choke', category: 'submission', tags: ['Submission', 'Closed Guard'] },
  { id: 'preview-scissor', title: 'Scissor Sweep', category: 'sweep', tags: ['Sweep', 'Fundamental'] },
  { id: 'preview-knee-cut', title: 'Knee Cut Pass', category: 'guard-pass', tags: ['Guard Pass', 'Pressure'] },
  { id: 'preview-arm-drag', title: 'Arm Drag', category: 'transition', tags: ['Transition', 'Back Take'] },
] as const

export const BOTTOM_NAV_ITEMS: Array<{ value: BjjBottomTab; label: string; Icon: LucideIcon }> = [
  { value: 'today', label: 'Today', Icon: Zap },
  { value: 'library', label: 'Library', Icon: BookOpen },
  { value: 'gameplans', label: 'Gameplans', Icon: Network },
  { value: 'community', label: 'Community', Icon: Trophy },
  { value: 'you', label: 'You', Icon: UserRound },
]

