import type {
  SocialCreativeAspectPreset,
  SocialCreativeEdit,
  SocialCreativeFilterId,
  SocialCreativeMode,
  SocialMusicTrack,
  SocialTextOverlay,
} from '@/lib/social-models'

export const SOCIAL_TEXT_COLOR_OPTIONS = ['#ffffff', '#fef08a', '#fca5a5', '#86efac', '#93c5fd', '#f9a8d4'] as const

export const SOCIAL_FILTER_PRESETS: Array<{
  id: SocialCreativeFilterId
  label: string
  css: (intensity: number) => string
}> = [
  { id: 'none', label: 'Original', css: () => 'none' },
  {
    id: 'vivid',
    label: 'Vivid',
    css: (intensity) => `saturate(${1 + intensity * 0.65}) contrast(${1 + intensity * 0.18}) brightness(${1 + intensity * 0.04})`,
  },
  {
    id: 'mono',
    label: 'Mono',
    css: (intensity) => `grayscale(${0.45 + intensity * 0.55}) contrast(${1 + intensity * 0.1})`,
  },
  {
    id: 'warm',
    label: 'Warm',
    css: (intensity) => `sepia(${0.18 + intensity * 0.34}) saturate(${1 + intensity * 0.25}) brightness(${1 + intensity * 0.06})`,
  },
  {
    id: 'cool',
    label: 'Cool',
    css: (intensity) => `hue-rotate(${-12 * intensity}deg) saturate(${1 + intensity * 0.15}) brightness(${1 + intensity * 0.02})`,
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    css: (intensity) => `contrast(${1 + intensity * 0.32}) brightness(${1 - intensity * 0.08}) saturate(${1 + intensity * 0.18})`,
  },
]

export const SOCIAL_ASPECT_PRESETS: Array<{ id: SocialCreativeAspectPreset; label: string; ratio: number }> = [
  { id: '9:16', label: 'Story', ratio: 9 / 16 },
  { id: '4:5', label: 'Portrait', ratio: 4 / 5 },
  { id: '1:1', label: 'Square', ratio: 1 },
]

export const SOCIAL_MUSIC_TRACK_FALLBACKS: SocialMusicTrack[] = [
  {
    id: 'focus-breathe',
    slug: 'focus-breathe',
    title: 'Focus Breathe',
    artist: 'Dagestani Disciple',
    previewUrl: '/audio/social/focus-breathe.m4a',
    durationMs: 15_000,
  },
  {
    id: 'mat-flow',
    slug: 'mat-flow',
    title: 'Mat Flow',
    artist: 'Dagestani Disciple',
    previewUrl: '/audio/social/mat-flow.m4a',
    durationMs: 15_000,
  },
  {
    id: 'night-rounds',
    slug: 'night-rounds',
    title: 'Night Rounds',
    artist: 'Dagestani Disciple',
    previewUrl: '/audio/social/night-rounds.m4a',
    durationMs: 15_000,
  },
]

export function createSocialTextOverlay(partial?: Partial<SocialTextOverlay>): SocialTextOverlay {
  return {
    id: partial?.id ?? `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: partial?.text ?? 'New text',
    x: partial?.x ?? 0.5,
    y: partial?.y ?? 0.36,
    scale: partial?.scale ?? 1,
    rotationDeg: partial?.rotationDeg ?? 0,
    color: partial?.color ?? SOCIAL_TEXT_COLOR_OPTIONS[0],
    align: partial?.align ?? 'center',
    background: partial?.background ?? 'none',
    fontPreset: partial?.fontPreset ?? 'modern',
  }
}

export function createSocialCreativeEdit(mode: SocialCreativeMode): SocialCreativeEdit {
  return {
    mode,
    filter: {
      id: 'none',
      intensity: 0,
    },
    crop: {
      aspectPreset: mode === 'story' || mode === 'reel' ? '9:16' : '4:5',
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    textOverlays: [],
    music: null,
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

export function normalizeSocialCreativeEdit(
  value: unknown,
  mode: SocialCreativeMode = 'post',
): SocialCreativeEdit {
  const fallback = createSocialCreativeEdit(mode)
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Record<string, any>
  const aspectPreset = candidate.crop?.aspectPreset
  const normalizedMode = candidate.mode === 'story' || candidate.mode === 'post' || candidate.mode === 'reel'
    ? candidate.mode
    : mode

  return {
    mode: normalizedMode,
    filter: {
      id: SOCIAL_FILTER_PRESETS.some((preset) => preset.id === candidate.filter?.id)
        ? candidate.filter.id
        : fallback.filter.id,
      intensity: clampNumber(candidate.filter?.intensity, 0, 1, fallback.filter.intensity),
    },
    crop: {
      aspectPreset: SOCIAL_ASPECT_PRESETS.some((preset) => preset.id === aspectPreset)
        ? aspectPreset
        : normalizedMode === 'story' || normalizedMode === 'reel'
          ? '9:16'
          : fallback.crop.aspectPreset,
      scale: clampNumber(candidate.crop?.scale, 1, 2.5, fallback.crop.scale),
      offsetX: clampNumber(candidate.crop?.offsetX, -1, 1, fallback.crop.offsetX),
      offsetY: clampNumber(candidate.crop?.offsetY, -1, 1, fallback.crop.offsetY),
    },
    textOverlays: Array.isArray(candidate.textOverlays)
      ? candidate.textOverlays.map((entry: any) => createSocialTextOverlay({
          id: typeof entry?.id === 'string' ? entry.id : undefined,
          text: typeof entry?.text === 'string' ? entry.text.slice(0, 220) : undefined,
          x: clampNumber(entry?.x, 0.05, 0.95, 0.5),
          y: clampNumber(entry?.y, 0.08, 0.92, 0.36),
          scale: clampNumber(entry?.scale, 0.65, 2.5, 1),
          rotationDeg: clampNumber(entry?.rotationDeg, -180, 180, 0),
          color: typeof entry?.color === 'string' ? entry.color : undefined,
          align: entry?.align === 'left' || entry?.align === 'center' || entry?.align === 'right' ? entry.align : undefined,
          background: entry?.background === 'pill' ? 'pill' : 'none',
          fontPreset: entry?.fontPreset === 'classic' || entry?.fontPreset === 'headline' || entry?.fontPreset === 'modern'
            ? entry.fontPreset
            : undefined,
        }))
      : fallback.textOverlays,
    music: candidate.music && typeof candidate.music === 'object'
      ? {
          trackId: typeof candidate.music.trackId === 'string' ? candidate.music.trackId : '',
          title: typeof candidate.music.title === 'string' ? candidate.music.title : '',
          artist: typeof candidate.music.artist === 'string' ? candidate.music.artist : '',
          previewUrl: typeof candidate.music.previewUrl === 'string' ? candidate.music.previewUrl : '',
          artworkUrl: typeof candidate.music.artworkUrl === 'string' ? candidate.music.artworkUrl : undefined,
          startMs: clampNumber(candidate.music.startMs, 0, 14_000, 0),
          durationMs: clampNumber(candidate.music.durationMs, 1_000, 15_000, normalizedMode === 'story' ? 15_000 : 10_000),
          volume: clampNumber(candidate.music.volume, 0, 1, 1),
        }
      : null,
  }
}

export function hasRenderableSocialCreativeEdits(edit: SocialCreativeEdit | null | undefined): boolean {
  if (!edit) return false
  return edit.filter.id !== 'none'
    || edit.textOverlays.some((overlay) => overlay.text.trim().length > 0)
    || edit.crop.aspectPreset !== (edit.mode === 'story' || edit.mode === 'reel' ? '9:16' : '4:5')
    || Math.abs(edit.crop.scale - 1) > 0.001
    || Math.abs(edit.crop.offsetX) > 0.001
    || Math.abs(edit.crop.offsetY) > 0.001
    || Boolean(edit.music?.trackId)
}

export function getSocialFilterCss(filter: SocialCreativeEdit['filter'] | null | undefined): string {
  const preset = SOCIAL_FILTER_PRESETS.find((entry) => entry.id === (filter?.id ?? 'none'))
  return preset?.css(filter?.intensity ?? 0) ?? 'none'
}

export function getSocialAspectRatioValue(aspectPreset: SocialCreativeAspectPreset): number {
  return SOCIAL_ASPECT_PRESETS.find((preset) => preset.id === aspectPreset)?.ratio ?? 4 / 5
}

export function getSocialOutputSize(mode: SocialCreativeMode, aspectPreset: SocialCreativeAspectPreset): { width: number; height: number } {
  if (aspectPreset === '1:1') return { width: 1080, height: 1080 }
  if (aspectPreset === '4:5') return { width: 1080, height: 1350 }
  return mode === 'story' || mode === 'reel'
    ? { width: 1080, height: 1920 }
    : { width: 1080, height: 1920 }
}

export function getMusicDurationOptions(mode: SocialCreativeMode): number[] {
  if (mode === 'story') return [15_000]
  if (mode === 'reel') return [10_000, 15_000]
  return [5_000, 10_000, 15_000]
}
