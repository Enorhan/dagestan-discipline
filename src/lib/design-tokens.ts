/**
 * Design System Tokens
 * 
 * Centralized design tokens for the Dagestan Discipline app.
 * These values are the source of truth for all UI components.
 * 
 * Usage: Import these tokens in components for programmatic access.
 * CSS variables are defined in globals.css for Tailwind usage.
 */

// ============================================
// SPACING SCALE
// ============================================
// Based on 4px base unit for consistent rhythm
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px', // Minimum touch target
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const typography = {
  // Font sizes with line heights
  sizes: {
    xs: { size: '0.75rem', lineHeight: '1rem' },      // 12px
    sm: { size: '0.875rem', lineHeight: '1.25rem' },  // 14px
    base: { size: '1rem', lineHeight: '1.5rem' },     // 16px
    lg: { size: '1.125rem', lineHeight: '1.75rem' },  // 18px
    xl: { size: '1.25rem', lineHeight: '1.75rem' },   // 20px
    '2xl': { size: '1.5rem', lineHeight: '2rem' },    // 24px
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' }, // 36px
    '5xl': { size: '3rem', lineHeight: '1' },         // 48px
  },
  // Font weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  // Letter spacing
  tracking: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.2em', // For uppercase labels
  },
} as const

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '6px',
  DEFAULT: '8px',  // --radius
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const

// ============================================
// SHADOWS / ELEVATION
// ============================================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  // Elevation for dark mode (more subtle)
  elevated: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)',
  // Glow effects
  'glow-primary': '0 0 20px rgba(139, 0, 0, 0.4), 0 0 40px rgba(139, 0, 0, 0.2)',
  'glow-gold': '0 0 20px rgba(212, 175, 55, 0.2), 0 0 40px rgba(212, 175, 55, 0.15)',
} as const

// ============================================
// ANIMATION DURATIONS
// ============================================
export const durations = {
  instant: '0ms',
  fast: '100ms',
  normal: '150ms',
  moderate: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const

// ============================================
// ANIMATION EASINGS
// ============================================
export const easings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Custom easings for specific interactions
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const

// ============================================
// Z-INDEX LAYERS
// ============================================
export const zIndex = {
  hide: -1,
  base: 0,
  raised: 10,
  dropdown: 20,
  sticky: 30,
  fixed: 40,
  modalBackdrop: 45,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  max: 9999,
} as const

// ============================================
// TOUCH TARGETS
// ============================================
export const touchTargets = {
  minimum: '44px', // iOS HIG minimum
  comfortable: '48px',
  large: '56px',
} as const

// ============================================
// BREAKPOINTS
// ============================================
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

