'use client'

import type { ReactNode } from 'react'
import { Screen } from '@/lib/types'
import { haptics } from '@/lib/haptics'

/**
 * Bottom Navigation Component - Design System
 *
 * Instagram/Twitter-style bottom tab navigation.
 * Features:
 * - 5 primary tabs with icons
 * - Active state indicators with smooth transitions
 * - Haptic feedback on tap
 * - Safe area handling for iOS
 * - Meets 44pt minimum touch target
 */

type NavKey = 'home' | 'training' | 'community' | 'week' | 'profile'

interface BottomNavProps {
  active: NavKey
  trainingTarget: Screen
  onNavigate: (screen: Screen) => void
  variant?: 'fixed' | 'inline'
}

interface NavItemProps {
  label: string
  active: boolean
  onClick: () => void
  icon: ReactNode
}

function NavItem({ label, active, onClick, icon }: NavItemProps) {
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
  trainingTarget,
  onNavigate,
  variant = 'fixed',
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
        <NavItem
          label="Training"
          active={active === 'training'}
          onClick={() => {
            haptics.light()
            onNavigate(trainingTarget)
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8h12M6 16h12" />
              <path d="M3 8h3v8H3zM18 8h3v8h-3z" />
            </svg>
          }
        />
        <NavItem
          label="Community"
          active={active === 'community'}
          onClick={() => {
            haptics.light()
            onNavigate('community-feed')
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <NavItem
          label="Week"
          active={active === 'week'}
          onClick={() => {
            haptics.light()
            onNavigate('week-view')
          }}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 10h16M4 14h10" />
              <path d="M4 18h6" />
            </svg>
          }
        />
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
