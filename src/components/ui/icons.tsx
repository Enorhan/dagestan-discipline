'use client'

import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

const defaultProps: IconProps = {
  size: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function createIcon(paths: string[], viewBox = '0 0 24 24') {
  return function Icon({ size = 24, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        {...defaultProps}
        {...props}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    )
  }
}

// Navigation
export const ChevronLeft = createIcon(['M15 18l-6-6 6-6'])
export const ChevronRight = createIcon(['M9 18l6-6-6-6'])
export const ChevronDown = createIcon(['M6 9l6 6 6-6'])
export const ChevronUp = createIcon(['M18 15l-6-6-6 6'])
export const X = createIcon(['M18 6L6 18', 'M6 6l12 12'])
export const ArrowLeft = createIcon(['M19 12H5', 'M12 19l-7-7 7-7'])

// Media Controls
export const Play = createIcon(['M5 3l14 9-14 9V3z'])
export const Pause = createIcon(['M6 4h4v16H6z', 'M14 4h4v16h-4z'])
export const SkipForward = createIcon(['M5 4l10 8-10 8V4z', 'M19 5v14'])
export const SkipBack = createIcon(['M19 20L9 12l10-8v16z', 'M5 19V5'])

// Actions
export const Check = createIcon(['M20 6L9 17l-5-5'])
export const Search = createIcon(['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'])
export const Edit = createIcon(['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7', 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'])
export const Trash = createIcon(['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2', 'M10 11v6', 'M14 11v6'])
export const Plus = createIcon(['M12 5v14', 'M5 12h14'])
export const Minus = createIcon(['M5 12h14'])

// Categories
export const Shield = createIcon(['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'])
export const Dumbbell = createIcon(['M6.5 6.5h11', 'M6.5 17.5h11', 'M4 6.5h2.5v11H4z', 'M17.5 6.5H20v11h-2.5z', 'M2 8.5h2v7H2z', 'M20 8.5h2v7h-2z'])
export const Target = createIcon(['M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0', 'M12 12m-6 0a6 6 0 1012 0 6 6 0 10-12 0', 'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0'])
export const Flame = createIcon(['M12 22c-4.97 0-9-2.582-9-7.5 0-3.5 2.5-6 4.5-8.5 1 2 2.5 3 4.5 3s3.5-1.5 4-3c2 2.5 4.5 5 4.5 8.5 0 4.918-4.03 7.5-9 7.5z', 'M12 22c-2.21 0-4-1.343-4-3.5 0-1.5 1-2.5 2-3.5.5 1 1.5 1.5 2 1.5s1.5-.5 2-1.5c1 1 2 2 2 3.5 0 2.157-1.79 3.5-4 3.5z'])
export const Heart = createIcon(['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'])
export const Zap = createIcon(['M13 2L3 14h9l-1 8 10-12h-9l1-8z'])
export const Activity = createIcon(['M22 12h-4l-3 9L9 3l-3 9H2'])
export const Book = createIcon(['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'])
export const Stretch = createIcon(['M12 4a2 2 0 100-4 2 2 0 000 4z', 'M12 4v4', 'M8 8l4 4 4-4', 'M12 12v6', 'M8 22l4-4 4 4'])

// Body Parts - Premium Fitness Icons
export const Neck = createIcon(['M12 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5z', 'M9.5 8l-1 6c-.3 2 .5 4 3.5 4s3.8-2 3.5-4l-1-6'])
export const Shoulder = createIcon(['M12 4a2 2 0 100 4 2 2 0 000-4z', 'M4 14c0-3 2-5 5-6h6c3 1 5 3 5 6', 'M4 14l2 6', 'M20 14l-2 6', 'M9 8v3', 'M15 8v3'])
export const Back = createIcon(['M12 4a2 2 0 100 4 2 2 0 000-4z', 'M12 8v12', 'M7 10c-1 2-1.5 4-1 8', 'M17 10c1 2 1.5 4 1 8', 'M9 12l3 2 3-2', 'M9 16l3 2 3-2'])
export const Hip = createIcon(['M6 10c0-2 2-4 6-4s6 2 6 4', 'M6 10v6c0 2 2 4 6 4s6-2 6-4v-6', 'M12 6v14'])
export const Knee = createIcon(['M12 2v6', 'M8 8h8', 'M9 8c-1.5 3-2 7 0 12', 'M15 8c1.5 3 2 7 0 12', 'M12 12v2'])
export const Hand = createIcon(['M18 11V6a2 2 0 00-4 0v5', 'M14 10V4a2 2 0 00-4 0v6', 'M10 10V5a2 2 0 00-4 0v9', 'M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2a8 8 0 01-8-8V9'])

// Premium Body Part Icons for Training Categories
export const FullBodyIcon = createIcon(['M12 2a2 2 0 100 4 2 2 0 000-4z', 'M12 6v5', 'M12 11l-4 4v5', 'M12 11l4 4v5', 'M8 8l-3 3', 'M16 8l3 3'])
export const LegsIcon = createIcon(['M8 2v6l-2 8v6', 'M16 2v6l2 8v6', 'M8 8h8', 'M6 16h4', 'M14 16h4'])
export const ChestIcon = createIcon(['M4 8c0-2 3-4 8-4s8 2 8 4', 'M4 8v6c0 3 3 6 8 6s8-3 8-6V8', 'M12 4v10', 'M7 10c1 1 2 2 5 2s4-1 5-2'])
export const ShouldersIcon = createIcon(['M12 6a3 3 0 100 6 3 3 0 000-6z', 'M2 16c0-4 4-6 10-6s10 2 10 6', 'M5 16v4', 'M19 16v4'])
export const BackIcon = createIcon(['M12 2v20', 'M6 6c-2 3-2 6-1 10', 'M18 6c2 3 2 6 1 10', 'M8 9l4 3 4-3', 'M8 14l4 3 4-3'])
export const ArmsIcon = createIcon(['M6 4c-2 0-3 1-3 3v6c0 3 2 5 4 6', 'M18 4c2 0 3 1 3 3v6c0 3-2 5-4 6', 'M6 8c1 0 2 1 2 3s-1 3-2 3', 'M18 8c-1 0-2 1-2 3s1 3 2 3', 'M9 18l3 2 3-2'])
export const CoreIcon = createIcon(['M8 4h8v4c0 2-1 3-2 4v6c0 1-1 2-2 2h-4c-1 0-2-1-2-2v-6c-1-1-2-2-2-4V4z', 'M10 8h4', 'M10 12h4', 'M10 16h4'])
export const NeckIcon = createIcon(['M12 2a3 3 0 100 6 3 3 0 000-6z', 'M9 8v4c0 2 1.5 4 3 4s3-2 3-4V8', 'M7 10l2-1', 'M17 10l-2-1'])

// Sports
export const Gi = createIcon(['M12 2L6 6v4l6 2 6-2V6l-6-4z', 'M6 10v10l6 2 6-2V10', 'M12 12v10'])
export const Wrestling = createIcon(['M9 4a2 2 0 100-4 2 2 0 000 4z', 'M15 4a2 2 0 100-4 2 2 0 000 4z', 'M6 8l3 4-3 8', 'M18 8l-3 4 3 8', 'M9 12h6'])
export const Trophy = createIcon(['M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2', 'M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2', 'M6 3h12v6a6 6 0 01-12 0V3z', 'M12 15v4', 'M8 22h8', 'M12 19h.01'])
export const Boxing = createIcon(['M18 4a3 3 0 00-3 3v4H9V7a3 3 0 00-6 0v8a6 6 0 0012 0V7a3 3 0 00-3-3z'])
export const Refresh = createIcon(['M1 4v6h6', 'M23 20v-6h-6', 'M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15'])
export const Drill = createIcon(['M14 4l6 6-8 8-6-6 8-8z', 'M4 20l4-4', 'M14 4l2-2', 'M20 10l2-2'])

// Stats
export const BarChart = createIcon(['M18 20V10', 'M12 20V4', 'M6 20v-6'])
export const Clock = createIcon(['M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0', 'M12 6v6l4 2'])

// Misc
export const Info = createIcon(['M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0', 'M12 16v-4', 'M12 8h.01'])
export const AlertTriangle = createIcon(['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'])
export const AlertCircle = createIcon(['M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0', 'M12 8v4', 'M12 16h.01'])
export const RefreshCw = createIcon(['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'])
export const Star = createIcon(['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'])
export const Video = createIcon(['M23 7l-7 5 7 5V7z', 'M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z'])

// Social
export const Share = createIcon(['M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'])
export const Bookmark = createIcon(['M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z'])
export const Users = createIcon(['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 7a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'])
export const User = createIcon(['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 7a4 4 0 100-8 4 4 0 000 8z'])
export const MessageCircle = createIcon(['M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8z'])
export const Filter = createIcon(['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'])
export const Copy = createIcon(['M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z', 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'])
export const Settings = createIcon(['M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.02a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09c0 .66.38 1.26 1 1.51a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.44.44-.57 1.1-.33 1.82v.02c.25.62.85 1 1.51 1H21a2 2 0 110 4h-.09c-.66 0-1.26.38-1.51 1z'])
export const GripVertical = createIcon(['M9 4h.01', 'M9 12h.01', 'M9 20h.01', 'M15 4h.01', 'M15 12h.01', 'M15 20h.01'])
export const ArrowUpDown = createIcon(['M11 17l-5-5 5-5', 'M18 7l5 5-5 5'])
export const Tag = createIcon(['M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z', 'M7 7h.01'])
