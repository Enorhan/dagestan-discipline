/**
 * Theme preference helpers.
 *
 * MatFlow defaults to dark mode. Users can opt into light mode or follow the
 * OS preference. The preference is stored in localStorage and applied to
 * <html data-theme="..."> so CSS variables defined in globals.css resolve.
 *
 * The inline script in src/app/layout.tsx applies the theme before paint to
 * avoid FOUC; this module is the React-side entry point used in Settings UI.
 */

export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'matflow.theme'

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark'
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value
    }
  } catch {
    // localStorage may be unavailable (private mode, ITP). Fall back to dark.
  }
  return 'dark'
}

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return resolveSystemTheme()
  return preference
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export function persistThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Best-effort persistence only.
  }
}

/**
 * Inline script body executed before React hydration. Kept as a string so it
 * can be injected via dangerouslySetInnerHTML in layout.tsx without a network
 * round-trip. Mirrors readStoredThemePreference / resolveTheme / applyTheme.
 */
export const themeBootstrapScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var p=null;try{p=window.localStorage.getItem(k);}catch(e){}if(p!=='light'&&p!=='dark'&&p!=='system'){p='dark';}var r=p;if(p==='system'){r=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',r);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`

