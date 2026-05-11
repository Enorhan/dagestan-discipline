import { BJJ_STORAGE_KEY, createDefaultBjjState } from '@/lib/bjj-seed'
import type { BjjPersistedState } from '@/lib/bjj-types'
import { branchFromPrimaryDiscipline, normalizeMartialArtsBranchId } from '@/lib/martial-arts-branches'

export type PersistedShellProfileFlags = Pick<BjjPersistedState['profile'], 'coachMarksSeen' | 'onboardingCompleted' | 'paywallCompleted'>
export type PersistedShellUiPrefs = Pick<
  BjjPersistedState,
  'selectedBottomTab' | 'selectedSessionsTab' | 'selectedTechniquesTab' | 'selectedTechniqueBranch' | 'selectedSystemBranch'
>

export const BJJ_PROFILE_FLAGS_STORAGE_KEY = `${BJJ_STORAGE_KEY}:profile-flags`
export const BJJ_UI_PREFS_STORAGE_KEY = `${BJJ_STORAGE_KEY}:ui-prefs`

const BOTTOM_TABS = new Set<BjjPersistedState['selectedBottomTab']>(['my-library', 'systems', 'discover'])
const SESSIONS_TABS = new Set<BjjPersistedState['selectedSessionsTab']>(['my-sessions'])
const TECHNIQUES_TABS = new Set<BjjPersistedState['selectedTechniquesTab']>(['my-library', 'systems', 'discover'])
const SYSTEMS_HUB_FILTERS = new Set<BjjPersistedState['systemsHubFilter']>(['all', 'mine', 'curated'])

function normalizeBottomTab(value: unknown, fallback: BjjPersistedState['selectedBottomTab']): BjjPersistedState['selectedBottomTab'] {
  if (BOTTOM_TABS.has(value as BjjPersistedState['selectedBottomTab'])) {
    return value as BjjPersistedState['selectedBottomTab']
  }
  if (value === 'today' || value === 'sessions' || value === 'you' || value === 'profile') return 'my-library'
  if (value === 'library' || value === 'techniques' || value === 'gameplans') return 'my-library'
  if (value === 'community' || value === 'social') return 'my-library'
  return fallback
}

export function normalizeBjjState(raw: unknown, displayName: string, username: string): BjjPersistedState {
  const fallback = createDefaultBjjState(displayName, username)
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const candidate = raw as Partial<BjjPersistedState>
  const profile: Partial<BjjPersistedState['profile']> =
    candidate.profile && typeof candidate.profile === 'object'
      ? candidate.profile as Partial<BjjPersistedState['profile']>
      : {}

  const nextProfile = {
    ...fallback.profile,
    ...profile,
    displayName: typeof profile.displayName === 'string' ? profile.displayName : displayName,
    username: typeof profile.username === 'string' ? profile.username : username,
  }

  nextProfile.xp = Number.isFinite(nextProfile.xp) ? nextProfile.xp : fallback.profile.xp
  nextProfile.level = Math.max(1, Math.floor(nextProfile.xp / 300) + 1)
  nextProfile.stripes = Math.min(4, Math.max(0, Number(nextProfile.stripes) || 0))
  const profileBranch = branchFromPrimaryDiscipline(nextProfile.primaryDiscipline)
  const selectedTechniqueBranch = normalizeMartialArtsBranchId(candidate.selectedTechniqueBranch) ?? profileBranch
  const selectedSystemBranch = normalizeMartialArtsBranchId(candidate.selectedSystemBranch) ?? profileBranch

  return {
    ...fallback,
    ...candidate,
    profile: nextProfile,
    selectedBottomTab: normalizeBottomTab(candidate.selectedBottomTab, fallback.selectedBottomTab),
    selectedSessionsTab: SESSIONS_TABS.has(candidate.selectedSessionsTab as BjjPersistedState['selectedSessionsTab'])
      ? candidate.selectedSessionsTab as BjjPersistedState['selectedSessionsTab']
      : fallback.selectedSessionsTab,
    selectedTechniquesTab: TECHNIQUES_TABS.has(candidate.selectedTechniquesTab as BjjPersistedState['selectedTechniquesTab'])
      ? candidate.selectedTechniquesTab as BjjPersistedState['selectedTechniquesTab']
      : fallback.selectedTechniquesTab,
    customTags: Array.isArray(candidate.customTags) ? candidate.customTags : fallback.customTags,
    libraryTechniques: Array.isArray(candidate.libraryTechniques) ? candidate.libraryTechniques : fallback.libraryTechniques,
    discoverAddedTechniqueIds: Array.isArray(candidate.discoverAddedTechniqueIds) ? candidate.discoverAddedTechniqueIds : fallback.discoverAddedTechniqueIds,
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions : fallback.sessions,
    selectedTechniqueBranch,
    selectedSystemBranch,
    systemsHubFilter: SYSTEMS_HUB_FILTERS.has(candidate.systemsHubFilter as BjjPersistedState['systemsHubFilter'])
      ? (candidate.systemsHubFilter as BjjPersistedState['systemsHubFilter'])
      : fallback.systemsHubFilter,
    systemsHubSearch: typeof candidate.systemsHubSearch === 'string' ? candidate.systemsHubSearch : fallback.systemsHubSearch,
    pinnedSystemIds: Array.isArray(candidate.pinnedSystemIds)
      ? (candidate.pinnedSystemIds as string[]).filter((id) => typeof id === 'string' && id.length > 0)
      : fallback.pinnedSystemIds,
  }
}

export function applyServerProfileFlags(
  profile: BjjPersistedState['profile'],
  flags: Partial<PersistedShellProfileFlags>,
): BjjPersistedState['profile'] {
  return {
    ...profile,
    ...(flags.onboardingCompleted === true ? { onboardingCompleted: true } : {}),
    ...(flags.paywallCompleted === true ? { paywallCompleted: true } : {}),
    ...(flags.coachMarksSeen === true ? { coachMarksSeen: true } : {}),
  }
}

export function normalizePersistedShellProfileFlags(raw: unknown): Partial<PersistedShellProfileFlags> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const candidate = raw as Partial<Record<keyof PersistedShellProfileFlags, unknown>>

  return {
    ...(candidate.onboardingCompleted === true ? { onboardingCompleted: true } : {}),
    ...(candidate.paywallCompleted === true ? { paywallCompleted: true } : {}),
    ...(candidate.coachMarksSeen === true ? { coachMarksSeen: true } : {}),
  }
}

export function normalizePersistedShellUiPrefs(raw: unknown): Partial<PersistedShellUiPrefs> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const candidate = raw as Partial<Record<keyof PersistedShellUiPrefs, unknown>>

  return {
    ...(candidate.selectedBottomTab !== undefined
      ? { selectedBottomTab: normalizeBottomTab(candidate.selectedBottomTab, 'my-library') }
      : {}),
    ...(SESSIONS_TABS.has(candidate.selectedSessionsTab as BjjPersistedState['selectedSessionsTab'])
      ? { selectedSessionsTab: candidate.selectedSessionsTab as BjjPersistedState['selectedSessionsTab'] }
      : {}),
    ...(TECHNIQUES_TABS.has(candidate.selectedTechniquesTab as BjjPersistedState['selectedTechniquesTab'])
      ? { selectedTechniquesTab: candidate.selectedTechniquesTab as BjjPersistedState['selectedTechniquesTab'] }
      : {}),
    ...(normalizeMartialArtsBranchId(candidate.selectedTechniqueBranch)
      ? { selectedTechniqueBranch: normalizeMartialArtsBranchId(candidate.selectedTechniqueBranch)! }
      : {}),
    ...(normalizeMartialArtsBranchId(candidate.selectedSystemBranch)
      ? { selectedSystemBranch: normalizeMartialArtsBranchId(candidate.selectedSystemBranch)! }
      : {}),
  }
}

export function mergePersistedShellProfileFlags(
  ...sources: Array<Partial<PersistedShellProfileFlags> | null | undefined>
): Partial<PersistedShellProfileFlags> {
  return sources.reduce<Partial<PersistedShellProfileFlags>>((merged, source) => ({
    ...merged,
    ...normalizePersistedShellProfileFlags(source),
  }), {})
}

export function mergeShellProfilePatch(
  previousProfile: BjjPersistedState['profile'],
  profilePatch: Partial<BjjPersistedState['profile']>,
): BjjPersistedState['profile'] {
  return {
    ...previousProfile,
    ...profilePatch,
  }
}

export function resolveOnboardingDisplayNameDraft(draft: string): {
  error: string | null
  value: string
} {
  const value = draft.trim()
  if (!value) {
    return {
      error: 'Enter your name to continue',
      value: '',
    }
  }

  return {
    error: null,
    value,
  }
}
