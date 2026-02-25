'use client'

interface SportIconProps {
  sport: 'wrestling' | 'judo' | 'bjj'
  size?: number
  className?: string
}

export function SportIcon({ sport, size = 48, className = '' }: SportIconProps) {
  const icons = {
    wrestling: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Two wrestlers grappling */}
        <circle cx="20" cy="16" r="6" fill="currentColor" opacity="0.9"/>
        <circle cx="44" cy="16" r="6" fill="currentColor" opacity="0.9"/>
        {/* Bodies in contact */}
        <path d="M14 24c0-2 1-4 3-5l3 8-4 12c-2-1-3-3-3-5v-10z" fill="currentColor" opacity="0.7"/>
        <path d="M50 24c0-2-1-4-3-5l-3 8 4 12c2-1 3-3 3-5v-10z" fill="currentColor" opacity="0.7"/>
        {/* Arms locked together */}
        <path d="M20 22c2 0 4 2 5 4l7 2 7-2c1-2 3-4 5-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
        {/* Legs in stance */}
        <path d="M16 40l-4 16M24 40l4 16M40 40l-4 16M48 40l4 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        {/* Torsos */}
        <ellipse cx="20" cy="32" rx="8" ry="10" fill="currentColor" opacity="0.8"/>
        <ellipse cx="44" cy="32" rx="8" ry="10" fill="currentColor" opacity="0.8"/>
      </svg>
    ),
    judo: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Throwing athlete - Seoi Nage position */}
        <circle cx="24" cy="14" r="6" fill="currentColor" opacity="0.9"/>
        {/* Person being thrown */}
        <circle cx="44" cy="28" r="5" fill="currentColor" opacity="0.7"/>
        {/* Thrower body - bent forward */}
        <ellipse cx="26" cy="30" rx="8" ry="10" fill="currentColor" opacity="0.8"/>
        {/* Thrower legs - wide stance */}
        <path d="M18 38l-6 18M34 38l6 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        {/* Arms gripping gi */}
        <path d="M20 20c4 1 8 4 10 8l8-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Person being thrown - body arc */}
        <path d="M44 34c-4 8-8 14-16 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Flying legs */}
        <path d="M50 32l8-4M48 38l10 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    bjj: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Guard position - person on bottom */}
        <circle cx="24" cy="42" r="5" fill="currentColor" opacity="0.9"/>
        {/* Person on top */}
        <circle cx="40" cy="24" r="5" fill="currentColor" opacity="0.9"/>
        {/* Bottom person body - on back */}
        <ellipse cx="24" cy="50" rx="12" ry="6" fill="currentColor" opacity="0.7"/>
        {/* Top person body - leaning in */}
        <ellipse cx="36" cy="36" rx="8" ry="10" fill="currentColor" opacity="0.8"/>
        {/* Legs wrapped (guard) */}
        <path d="M12 46c6-2 10 2 16 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M36 46c-4-2-6 2-10 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Arms controlling */}
        <path d="M24 42l12-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M28 46l10-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        {/* Top person's arms posting */}
        <path d="M44 30l8 8M32 28l-4 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  }

  return icons[sport] || null
}

// Equipment icons
export function EquipmentIcon({ type, size = 40, className = '' }: { type: 'bodyweight' | 'gym', size?: number, className?: string }) {
  const icons = {
    bodyweight: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Person doing push-up */}
        <circle cx="38" cy="14" r="5" fill="currentColor" opacity="0.9"/>
        <path d="M8 34h28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M32 14l-6 12-10 4-8 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M10 34l-2 8M24 30l2 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    gym: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Barbell */}
        <rect x="4" y="20" width="6" height="12" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="38" y="20" width="6" height="12" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="10" y="22" width="4" height="8" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="34" y="22" width="4" height="8" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="14" y="24" width="20" height="4" rx="1" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  }

  return icons[type] || null
}

// Level icons
export function LevelIcon({ level, size = 40, className = '' }: { level: 'beginner' | 'intermediate' | 'advanced', size?: number, className?: string }) {
  const bars = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3
  
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="8" y="32" width="8" height="10" rx="2" fill="currentColor" opacity={bars >= 1 ? 0.9 : 0.2}/>
      <rect x="20" y="24" width="8" height="18" rx="2" fill="currentColor" opacity={bars >= 2 ? 0.9 : 0.2}/>
      <rect x="32" y="14" width="8" height="28" rx="2" fill="currentColor" opacity={bars >= 3 ? 0.9 : 0.2}/>
    </svg>
  )
}

// Goal icons  
export function GoalIcon({ goal, size = 36, className = '' }: { goal: 'balanced' | 'strength' | 'power' | 'conditioning', size?: number, className?: string }) {
  const icons = {
    balanced: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.9"/>
        <path d="M18 8v20M8 18h20" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
      </svg>
    ),
    strength: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M8 22v-8M28 22v-8M12 20v-4M24 20v-4M12 18h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    power: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20 4l-8 14h10l-8 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    conditioning: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M18 6c6 0 10 4 10 10s-4 10-10 10-10-4-10-10S12 6 18 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M18 10v6l4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  }

  return icons[goal] || null
}

