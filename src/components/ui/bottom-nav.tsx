'use client'

import type { ReactNode } from 'react'
import { Screen } from '@/lib/types'
import { haptics } from '@/lib/haptics'

/**
 * Bottom Navigation Component - Design System
 *
 * Instagram/TikTok-style bottom tab navigation.
 * Features:
 * - 5 primary tabs with icons
 * - Prominent center action button
 * - Active state indicators with smooth transitions
 * - Haptic feedback on tap
 * - Safe area handling for iOS
 * - Meets 44pt minimum touch target
 */

type NavKey = 'home' | 'start' | 'learn' | 'profile'

interface BottomNavProps {
  active: NavKey
  onNavigate: (screen: Screen) => void
  onStartAction?: () => void // Smart action for center button
  hasWorkoutToday?: boolean // Determines center button behavior
  variant?: 'fixed' | 'inline'
  hideLearnTab?: boolean
}

interface NavItemProps {
  label: string
  active: boolean
  onClick: () => void
  icon: ReactNode
  isCenter?: boolean // For prominent center button styling
}

function NavItem({ label, active, onClick, icon, isCenter = false }: NavItemProps) {
  if (isCenter) {
    // Prominent center action button (Instagram/TikTok style)
    return (
      <button
        onClick={onClick}
        className={[
          // Base styles
          'flex-1 min-h-[56px] min-w-[44px]',
          'flex items-center justify-center',
          // Touch feedback
          'active:scale-95',
          'transition-all duration-normal',
        ].join(' ')}
        aria-label={label}
      >
        <div className={[
          // Prominent styling
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'bg-primary shadow-lg',
          '-mt-2', // Slightly elevated
          'transition-all duration-normal',
          'hover:shadow-xl hover:scale-105',
          // Glow effect
          'shadow-primary/50',
        ].join(' ')}>
          {icon}
        </div>
        <span className="sr-only">{label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={[
        // Base styles - meets 44pt touch target
        'flex-1 min-h-[56px] min-w-[44px]',
        'flex items-center justify-center',
        // Typography (screen reader only)
        'text-xs font-semibold',
        // Transitions
        'transition-all duration-normal',
        // Active/inactive states
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground/70',
        // Touch feedback
        'active:scale-95',
      ].join(' ')}
      aria-pressed={active}
      role="tab"
      aria-label={label}
    >
      {/* Icon with active indicator */}
      <span className={[
        'relative transition-colors duration-normal',
        active ? 'text-primary' : 'text-muted-foreground/60',
      ].join(' ')}>
        {icon}
        {/* Active dot indicator */}
        {active && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
        )}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function BottomNav({
  active,
  onNavigate,
  onStartAction,
  hasWorkoutToday = false,
  variant = 'fixed',
  hideLearnTab = false,
}: BottomNavProps) {
  // Container styles based on variant
  const containerStyles = variant === 'fixed'
    ? [
        // Positioning
        'fixed bottom-0 left-0 right-0 z-fixed',
        // Background with blur
        'bg-background/95 backdrop-blur-lg',
        // Border
        'border-t border-border/50',
        // Padding with safe area
        'px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]',
      ].join(' ')
    : 'mt-4 pt-4 border-t border-border/30'

  return (
    <nav
      className={containerStyles}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Home Tab */}
        <NavItem
          label="Home"
          active={active === 'home'}
          onClick={() => {
            haptics.light()
            onNavigate('home')
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 11l9-8 9 8" />
              <path d="M9 22V12h6v10" />
            </svg>
          }
        />

        {/* Center Action Button - Prominent */}
        <NavItem
          label={hasWorkoutToday ? "Start Workout" : "Create Workout"}
          active={active === 'start'}
          onClick={() => {
            haptics.medium()
            if (onStartAction) {
              onStartAction()
            }
          }}
          isCenter
          icon={
            hasWorkoutToday ? (
              // Play icon for starting workout
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              // Plus icon for creating workout
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary-foreground">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )
          }
        />

        {!hideLearnTab && (
          <NavItem
            label="Learn"
            active={active === 'learn'}
            onClick={() => {
              haptics.light()
              onNavigate('training-hub')
            }}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            }
          />
        )}

        {/* Profile Tab */}
        <NavItem
          label="Profile"
          active={active === 'profile'}
          onClick={() => {
            haptics.light()
            onNavigate('user-profile')
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
          }
        />
      </div>
    </nav>
  )
}
