/**
 * Central toast copy + error presentation for useToast / showError.
 * Design reference: Figma “MatFlow — Toast / Snackbar” (team drafts).
 */

/** Prefer these for new code; legacy literals are normalized in {@link presentableErrorText}. */
export const toastCopy = {
  signInRequired: 'Sign in to continue.',
  checkoutCanceled: 'Checkout canceled.',
  billingReturnFailed: 'Billing couldn’t complete. Open Account and try again.',
  techniqueNameRequired: 'Add a technique name.',
  labelsRequired: 'Add at least one label or tag.',
  descriptionRequired: 'Add a short description.',
  tutorialTitleRequired: 'Add a tutorial title.',
  mediaRequiredDiscover: 'Add a video link or upload a clip.',
  locationRequired: 'Add a location for this session.',
  linkLimitTechniques: 'You can link up to 15 techniques.',
  freePlanTechniqueLimit: 'Free plan limit: 20 techniques. Upgrade to Pro to add more.',
  createAccountBeforePaywall: 'Create an account first, then continue from the paywall.',
  systemUnavailableDeepLink: 'That gameplan isn’t available. Open it from the Gameplans hub or use an updated link.',
} as const

/**
 * Turn raw errors and legacy short strings into concise, user-facing sentences.
 * Keeps intentional short messages; replaces known brittle Supabase/PostgREST text.
 */
export function presentableErrorText(message: string): string {
  const raw = message.trim()
  if (!raw) return 'Something went wrong. Try again.'

  const lower = raw.toLowerCase()

  if (lower === 'sign in required') {
    return toastCopy.signInRequired
  }

  if (lower === 'billing return failed') {
    return toastCopy.billingReturnFailed
  }

  if (lower === 'technique name is required') {
    return toastCopy.techniqueNameRequired
  }

  if (lower === 'description is required') {
    return toastCopy.descriptionRequired
  }

  if (lower === 'location is required') {
    return toastCopy.locationRequired
  }

  if (/could not find a relationship between ['"]follows['"] and/i.test(raw)) {
    return 'We couldn’t load followers right now. Pull to refresh or try again shortly.'
  }

  if (/schema cache|could not find a relationship/i.test(raw)) {
    return 'We couldn’t sync that with the server. Try again in a moment.'
  }

  if (/jwt|invalid refresh token|session (expired|missing)/i.test(raw)) {
    return toastCopy.signInRequired
  }

  if (/permission denied|violates row-level security|\brls\b/i.test(raw)) {
    return 'You don’t have permission for that. Sign in again or contact support.'
  }

  if (/network|failed to fetch|load failed|internet connection appears to be offline/i.test(raw)) {
    return 'Connection problem. Check your network and try again.'
  }

  if (/duplicate key|unique constraint/i.test(raw)) {
    return 'That already exists. Try something different.'
  }

  // Very long or multi-line technical traces — don’t show verbatim.
  if (raw.length > 180 || raw.includes('\n')) {
    return 'Something went wrong. Try again.'
  }

  return raw
}
