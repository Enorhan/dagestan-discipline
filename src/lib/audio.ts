// Audio cues for workout events
// Uses Web Audio API for simple beeps
// Respects prefers-reduced-motion setting

import { prefersReducedMotion } from '@/lib/hooks/use-reduced-motion'

class AudioManager {
  private audioContext: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.debug('Audio not available:', error)
        return null
      }
    }
    return this.audioContext
  }

  private playBeep(frequency: number, duration: number, volume: number = 0.3) {
    // Skip audio if user prefers reduced motion
    if (prefersReducedMotion()) return

    const ctx = this.getContext()
    if (!ctx) return

    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (error) {
      console.debug('Failed to play beep:', error)
    }
  }

  // Rest timer completion - single beep
  restComplete() {
    this.playBeep(800, 0.2, 0.4)
  }

  // Session completion - success chime (two ascending notes)
  sessionComplete() {
    this.playBeep(600, 0.15, 0.3)
    setTimeout(() => {
      this.playBeep(800, 0.25, 0.3)
    }, 150)
  }

  // Countdown beep (optional for 3-2-1)
  countdown() {
    this.playBeep(600, 0.1, 0.2)
  }
}

export const audio = new AudioManager()

