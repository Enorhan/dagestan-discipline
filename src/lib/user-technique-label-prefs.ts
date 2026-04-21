/**
 * Persists technique labels the user adds in the tag picker and optional "hidden"
 * entries for library-derived labels they dismiss from the palette.
 * Survives app restarts; keyed per Supabase user id.
 */

export type UserTechniqueLabelPrefs = {
  saved: string[]
  hiddenLower: string[]
}

const storageKey = (userId: string) => `dd.technique-label-prefs:${userId}`

function normalizePrefs(raw: unknown): UserTechniqueLabelPrefs {
  if (!raw || typeof raw !== 'object') {
    return { saved: [], hiddenLower: [] }
  }
  const p = raw as Record<string, unknown>
  const saved = Array.isArray(p.saved)
    ? p.saved.map((s) => String(s).trim()).filter(Boolean)
    : []
  const hiddenLower = Array.isArray(p.hiddenLower)
    ? p.hiddenLower.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
    : []
  return { saved, hiddenLower }
}

export function loadUserTechniqueLabelPrefs(userId: string): UserTechniqueLabelPrefs {
  if (typeof window === 'undefined' || !userId) {
    return { saved: [], hiddenLower: [] }
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    return normalizePrefs(raw ? JSON.parse(raw) : null)
  } catch {
    return { saved: [], hiddenLower: [] }
  }
}

export function saveUserTechniqueLabelPrefs(userId: string, prefs: UserTechniqueLabelPrefs): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs))
  } catch {
    // ignore quota / private mode
  }
}

export function appendSavedTechniqueLabel(userId: string, label: string): UserTechniqueLabelPrefs {
  const trimmed = label.trim()
  if (!trimmed) {
    return loadUserTechniqueLabelPrefs(userId)
  }
  const prefs = loadUserTechniqueLabelPrefs(userId)
  const lower = trimmed.toLowerCase()
  prefs.hiddenLower = prefs.hiddenLower.filter((h) => h !== lower)
  if (!prefs.saved.some((s) => s.toLowerCase() === lower)) {
    prefs.saved.push(trimmed)
  }
  saveUserTechniqueLabelPrefs(userId, prefs)
  return prefs
}

/** Remove from saved list, or hide from palette if the label only came from the library. */
export function removeTechniqueLabelFromPalette(userId: string, label: string): UserTechniqueLabelPrefs {
  const trimmed = label.trim()
  if (!trimmed) {
    return loadUserTechniqueLabelPrefs(userId)
  }
  const prefs = loadUserTechniqueLabelPrefs(userId)
  const lower = trimmed.toLowerCase()
  const wasInSaved = prefs.saved.some((s) => s.toLowerCase() === lower)
  prefs.saved = prefs.saved.filter((s) => s.toLowerCase() !== lower)
  if (!wasInSaved) {
    if (!prefs.hiddenLower.includes(lower)) {
      prefs.hiddenLower.push(lower)
    }
  }
  saveUserTechniqueLabelPrefs(userId, prefs)
  return prefs
}
