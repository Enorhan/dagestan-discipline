'use client'

/**
 * Permission primer helpers.
 *
 * iOS only ever surfaces the system permission prompt the first time the app
 * requests a capability. After that, denial is sticky and the only recovery
 * path is the Settings app. We therefore:
 *   1. Show an in-app primer that explains why we need the capability before
 *      triggering the native prompt (improves grant rate, App Review-friendly).
 *   2. When the OS reports a denied/blocked state, offer a deep link into
 *      Settings so the user can reverse the decision without leaving the app.
 *
 * Currently only the camera/photo capture flow in the creation studio uses
 * a native permission. Push/local notifications are not used by this app.
 */
import { Capacitor } from '@capacitor/core'

const PRIMER_SEEN_KEY_PREFIX = 'matflow.permission-primer.seen.'

export type PermissionScope = 'camera'

export type PermissionPrimerOutcome =
  | 'granted'
  | 'denied'
  | 'cancelled'
  | 'unavailable'

function storageKey(scope: PermissionScope): string {
  return `${PRIMER_SEEN_KEY_PREFIX}${scope}`
}

export function hasSeenPermissionPrimer(scope: PermissionScope): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(storageKey(scope)) === '1'
  } catch {
    return false
  }
}

export function markPermissionPrimerSeen(scope: PermissionScope): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(scope), '1')
  } catch {
    /* private mode — best effort */
  }
}

/**
 * Open the system Settings app, scoped to this app on iOS so the user lands
 * on the screen where they can flip the relevant toggle.
 */
export async function openAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { AppLauncher } = await import('@capacitor/app-launcher')
    const url = Capacitor.getPlatform() === 'ios' ? 'app-settings:' : 'package:'
    await AppLauncher.openUrl({ url })
  } catch {
    /* ignore — UI will fall back to a toast */
  }
}

/**
 * Inspect the current camera/photos permission. Returns the worst of the two
 * states so the caller can react to either being blocked.
 */
export async function inspectCameraPermission(): Promise<{
  granted: boolean
  denied: boolean
  prompt: boolean
}> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, denied: false, prompt: false }
  }
  try {
    const { Camera } = await import('@capacitor/camera')
    const status = await Camera.checkPermissions()
    const states = [status.camera, status.photos]
    const granted = states.every((state) => state === 'granted' || state === 'limited')
    const denied = states.some((state) => state === 'denied')
    const prompt = states.some((state) => state === 'prompt' || state === 'prompt-with-rationale')
    return { granted, denied, prompt }
  } catch {
    return { granted: false, denied: false, prompt: true }
  }
}

/**
 * Trigger the native camera permission prompt. Returns the resulting outcome.
 * Callers should have already shown the in-app primer if `hasSeenPermissionPrimer`
 * returned false.
 */
export async function requestCameraPermission(): Promise<PermissionPrimerOutcome> {
  if (!Capacitor.isNativePlatform()) return 'granted'
  try {
    const { Camera } = await import('@capacitor/camera')
    const status = await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
    const states = [status.camera, status.photos]
    if (states.every((state) => state === 'granted' || state === 'limited')) return 'granted'
    if (states.some((state) => state === 'denied')) return 'denied'
    return 'cancelled'
  } catch {
    return 'unavailable'
  }
}

