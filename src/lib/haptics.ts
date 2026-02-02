// Haptic feedback utilities for iOS
// Uses Capacitor Haptics plugin
// Respects prefers-reduced-motion setting

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { prefersReducedMotion } from '@/lib/hooks/use-reduced-motion'

export const haptics = {
  // Light impact - for button presses
  light: async () => {
    // Skip haptics if user prefers reduced motion
    if (prefersReducedMotion()) return

    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      // Silently fail on web or if haptics unavailable
      console.debug('Haptics not available:', error)
    }
  },

  // Medium impact - for set confirmations
  medium: async () => {
    if (prefersReducedMotion()) return

    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  },

  // Heavy impact - for rest timer completion
  heavy: async () => {
    if (prefersReducedMotion()) return

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  },

  // Success notification - for session completion
  // Note: Notifications are kept even with reduced motion as they're important feedback
  success: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  },

  // Warning notification - for ending session early
  warning: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  },

  // Error notification
  error: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }
}

