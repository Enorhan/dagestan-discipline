import type { Config } from "tailwindcss";

/**
 * Dagestan Discipline Design System
 *
 * Comprehensive Tailwind configuration with design tokens
 * for consistent, production-ready mobile UI.
 */
const config: Config = {
  darkMode: "class" as any,
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ============================================
      // COLORS
      // ============================================
      colors: {
        // Semantic colors are defined via CSS variables in globals.css
        // This allows for theme switching if needed in the future
      },

      // ============================================
      // SPACING (extends default Tailwind scale)
      // ============================================
      spacing: {
        '4.5': '18px',
        '11': '44px', // iOS minimum touch target
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '22': '88px',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },

      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'md': '6px',
        'DEFAULT': '8px',
        'lg': 'var(--radius)', // 8px default
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        'full': '9999px',
      },

      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1.05' }],      // 60px
      },
      letterSpacing: {
        'tightest': '-0.05em',
        'tighter': '-0.025em',
        'tight': '-0.015em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
        'ultra': '0.2em', // For uppercase labels
      },

      // ============================================
      // SHADOWS / ELEVATION
      // ============================================
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        // Dark mode elevation
        'elevated': '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'elevated-lg': '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        // Glow effects
        'glow-primary': '0 0 20px rgba(139, 0, 0, 0.4), 0 0 40px rgba(139, 0, 0, 0.2)',
        'glow-primary-subtle': '0 0 30px rgba(139, 0, 0, 0.4)',
        'glow-gold': '0 0 20px rgba(212, 175, 55, 0.2), 0 0 40px rgba(212, 175, 55, 0.15)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
        // Focus ring
        'focus': '0 0 0 2px var(--color-background), 0 0 0 4px var(--color-primary)',
      },

      // ============================================
      // Z-INDEX LAYERS
      // ============================================
      zIndex: {
        'hide': '-1',
        'base': '0',
        'raised': '10',
        'dropdown': '20',
        'sticky': '30',
        'fixed': '40',
        'modal-backdrop': '45',
        'modal': '50',
        'popover': '60',
        'tooltip': '70',
        'toast': '80',
        'max': '9999',
      },

      // ============================================
      // ANIMATION
      // ============================================
      transitionDuration: {
        'instant': '0ms',
        'fast': '100ms',
        'normal': '150ms',
        'moderate': '200ms',
        'slow': '300ms',
        'slower': '400ms',
        'slowest': '500ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-up': 'slide-up 250ms ease-out',
        'slide-down': 'slide-down 250ms ease-out',
        'slide-in-right': 'slide-in-right 250ms ease-out',
        'slide-in-left': 'slide-in-left 250ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'scale-out': 'scale-out 150ms ease-in',
        'spin': 'spin 1s linear infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'breathe': 'breathe 2.5s ease-in-out infinite',
        'skeleton': 'skeleton-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-30%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'breathe': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139, 0, 0, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px transparent' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },

      // ============================================
      // MIN/MAX DIMENSIONS
      // ============================================
      minHeight: {
        'touch': '44px', // iOS minimum touch target
        'touch-lg': '48px',
        'touch-xl': '56px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      maxWidth: {
        'screen-sm': '640px',
        'screen-md': '768px',
        'content': '512px', // max-w-lg equivalent for content
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

