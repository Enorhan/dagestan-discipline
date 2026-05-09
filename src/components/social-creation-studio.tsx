'use client'

import Image from 'next/image'
import {
  Camera,
  Check,
  Clapperboard,
  Crop,
  Loader2,
  Music2,
  Play,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  Type,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import {
  Camera as CapacitorCamera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useToast } from '@/contexts/toast-context'
import { bjjService } from '@/lib/bjj-service'
import { useOverlayLock } from '@/lib/hooks/use-overlay-lock'
import {
  hasSeenPermissionPrimer,
  inspectCameraPermission,
  markPermissionPrimerSeen,
  openAppSettings,
  requestCameraPermission,
} from '@/lib/permission-primer'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import {
  createSocialCreativeEdit,
  createSocialTextOverlay,
  getMusicDurationOptions,
  getSocialAspectRatioValue,
  getSocialFilterCss,
  normalizeSocialCreativeEdit,
  SOCIAL_ASPECT_PRESETS,
  SOCIAL_FILTER_PRESETS,
  SOCIAL_TEXT_COLOR_OPTIONS,
} from '@/lib/social-creative'
import {
  renderSocialCreativeImageToBlob,
  renderSocialCreativeOverlayToBlob,
  renderSocialCreativeVideoPosterToBlob,
} from '@/lib/social-creative-editor'
import { socialFeedService } from '@/lib/social-feed-service'
import { supabase } from '@/lib/supabase'
import type {
  CreateSocialPostResult,
  SocialCreatorDraft,
  SocialCreativeRenderStatus,
  SocialMediaType,
  SocialMusicTrack,
  SocialPostVisibility,
  SocialPublishTarget,
  SocialTextOverlay,
} from '@/lib/social-models'
import { cn } from '@/lib/utils'

type SocialCreationStudioProps = {
  enableDrafts: boolean
  enableScheduling: boolean
  musicTracks: SocialMusicTrack[]
  onClose: () => void
  onDraftSaved?: (draft: SocialCreatorDraft) => void
  onPostPublished: (result: CreateSocialPostResult, draftId?: string) => Promise<void> | void
  onStoryPublished: () => Promise<void> | void
  target: SocialPublishTarget
  userId: string
}

type ActiveTool = 'text' | 'music' | 'filters' | 'crop' | 'video' | 'more' | null

type PersistedStudioDraft = {
  allowComments: boolean
  caption: string
  coverTimestampMs: number
  creativeEdit: unknown
  draftId?: string
  persistedAt: string
  previewUrl?: string
  scheduledFor: string
  sourceAspectRatio?: number
  sourceDurationMs?: number
  sourceFileName: string
  sourceMediaType?: SocialMediaType
  sourceMediaUrl: string
  sourceThumbnailUrl?: string
  trimEndMs: number
  trimStartMs: number
  visibility: SocialPostVisibility
}

type DragState =
  | {
      kind: 'overlay'
      overlayId: string
      pointerId: number
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | {
      kind: 'media'
      pointerId: number
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | null

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function formatSavedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatDurationLabel(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.round(valueMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function ToolButton({
  active,
  Icon,
  label,
  onClick,
}: {
  active?: boolean
  Icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[68px] flex-col items-center gap-1 rounded-[16px] px-3 py-2 text-xs font-semibold transition',
        active ? 'bg-white text-black' : 'bg-white/8 text-white/72',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

function loadImageMetadata(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Unable to read photo metadata'))
    image.src = src
  })
}

function loadVideoMetadata(src: string): Promise<{ durationMs: number; height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.playsInline = true
    video.muted = true
    video.onloadedmetadata = () => {
      resolve({
        durationMs: Math.round(Math.max(video.duration, 0) * 1000),
        height: Math.max(video.videoHeight, 1),
        width: Math.max(video.videoWidth, 1),
      })
    }
    video.onerror = () => reject(new Error('Unable to read video metadata'))
    video.src = src
    video.load()
  })
}

function hasVisualEdits(target: SocialPublishTarget, creativeEdit: PersistedStudioDraft['creativeEdit'] | any) {
  if (!creativeEdit || typeof creativeEdit !== 'object') return false
  const edit = creativeEdit as any
  const defaultAspect = target === 'post' ? '4:5' : '9:16'
  return (edit.filter?.id ?? 'none') !== 'none'
    || (edit.textOverlays ?? []).some((overlay: any) => typeof overlay?.text === 'string' && overlay.text.trim().length > 0)
    || (edit.crop?.aspectPreset ?? defaultAspect) !== defaultAspect
    || Math.abs(Number(edit.crop?.scale ?? 1) - 1) > 0.001
    || Math.abs(Number(edit.crop?.offsetX ?? 0)) > 0.001
    || Math.abs(Number(edit.crop?.offsetY ?? 0)) > 0.001
}

export function SocialCreationStudio({
  enableDrafts,
  enableScheduling,
  musicTracks,
  onClose,
  onDraftSaved,
  onPostPublished,
  onStoryPublished,
  target,
  userId,
}: SocialCreationStudioProps) {
  useOverlayLock({ enabled: true, onEscape: onClose })

  const { showError, showSuccess } = useToast()
  const dragStateRef = useRef<DragState>(null)
  const previewAreaRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const localPreviewUrlRef = useRef<string | null>(null)
  const mediaLibraryInputRef = useRef<HTMLInputElement | null>(null)
  const photoCaptureInputRef = useRef<HTMLInputElement | null>(null)
  const videoCaptureInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [allowComments, setAllowComments] = useState(true)
  const [caption, setCaption] = useState('')
  const [coverTimestampMs, setCoverTimestampMs] = useState(0)
  const [creativeEdit, setCreativeEdit] = useState(() => createSocialCreativeEdit(target))
  const [draftId, setDraftId] = useState<string | undefined>()
  const [frameSize, setFrameSize] = useState({ width: 360, height: 520 })
  const [loadingSource, setLoadingSource] = useState(false)
  const [persistedAt, setPersistedAt] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [publishSheetOpen, setPublishSheetOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [sourceAspectRatio, setSourceAspectRatio] = useState<number | undefined>()
  const [sourceDurationMs, setSourceDurationMs] = useState<number | undefined>()
  const [sourceFileName, setSourceFileName] = useState('')
  const [sourceMediaType, setSourceMediaType] = useState<SocialMediaType | null>(null)
  const [sourceMediaUrl, setSourceMediaUrl] = useState('')
  const [sourceThumbnailUrl, setSourceThumbnailUrl] = useState('')
  const [trimEndMs, setTrimEndMs] = useState(0)
  const [trimStartMs, setTrimStartMs] = useState(0)
  const [visibility, setVisibility] = useState<SocialPostVisibility>('public')
  const [cameraPrimerOpen, setCameraPrimerOpen] = useState(false)
  const [cameraDeniedOpen, setCameraDeniedOpen] = useState(false)

  const draftStorageKey = `dd.social.studio.${userId}.${target}`
  const hasMedia = Boolean(previewUrl || sourceMediaUrl)
  const isVideoSource = sourceMediaType === 'video'
  const selectedOverlay = creativeEdit.textOverlays.find((overlay) => overlay.id === selectedOverlayId) ?? null
  const aspectRatio = getSocialAspectRatioValue(creativeEdit.crop.aspectPreset)
  const filterCss = getSocialFilterCss(creativeEdit.filter)
  const selectedMusicDurationOptions = getMusicDurationOptions(target)
  const musicEnabled = true
  const postKind = target === 'reel' ? 'reel' : 'moment'
  const musicLookup = useMemo(() => new Map(musicTracks.map((track) => [track.id, track])), [musicTracks])
  const selectedMusic = creativeEdit.music?.trackId ? musicLookup.get(creativeEdit.music.trackId) ?? null : null

  useEffect(() => {
    const node = previewAreaRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      const containerAspect = rect.width / Math.max(rect.height, 1)
      if (containerAspect > aspectRatio) {
        setFrameSize({
          width: rect.height * aspectRatio,
          height: rect.height,
        })
        return
      }
      setFrameSize({
        width: rect.width,
        height: rect.width / aspectRatio,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [aspectRatio])

  useEffect(() => {
    const raw = window.localStorage.getItem(draftStorageKey)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as PersistedStudioDraft
      const normalized = normalizeSocialCreativeEdit(parsed.creativeEdit, target)
      setAllowComments(parsed.allowComments ?? true)
      setCaption(parsed.caption ?? '')
      setCoverTimestampMs(parsed.coverTimestampMs ?? 0)
      setCreativeEdit(normalized)
      setDraftId(parsed.draftId)
      setPersistedAt(parsed.persistedAt ?? null)
      setPreviewUrl(parsed.previewUrl || parsed.sourceMediaUrl || parsed.sourceThumbnailUrl || '')
      setScheduledFor(parsed.scheduledFor ?? '')
      setSelectedOverlayId(normalized.textOverlays[0]?.id ?? null)
      setSourceAspectRatio(parsed.sourceAspectRatio)
      setSourceDurationMs(parsed.sourceDurationMs)
      setSourceFileName(parsed.sourceFileName ?? '')
      setSourceMediaType(parsed.sourceMediaType ?? null)
      setSourceMediaUrl(parsed.sourceMediaUrl ?? '')
      setSourceThumbnailUrl(parsed.sourceThumbnailUrl ?? '')
      setTrimEndMs(parsed.trimEndMs ?? 0)
      setTrimStartMs(parsed.trimStartMs ?? 0)
      setVisibility(parsed.visibility ?? 'public')
    } catch {
      window.localStorage.removeItem(draftStorageKey)
    }
  }, [draftStorageKey, target])

  useEffect(() => {
    if (!hasMedia && caption.trim().length === 0 && creativeEdit.textOverlays.length === 0) {
      window.localStorage.removeItem(draftStorageKey)
      setPersistedAt(null)
      return
    }

    const persisted: PersistedStudioDraft = {
      allowComments,
      caption,
      coverTimestampMs,
      creativeEdit,
      draftId,
      persistedAt: new Date().toISOString(),
      previewUrl: sourceMediaType === 'video' ? previewUrl : sourceMediaUrl || previewUrl,
      scheduledFor,
      sourceAspectRatio,
      sourceDurationMs,
      sourceFileName,
      sourceMediaType: sourceMediaType ?? undefined,
      sourceMediaUrl,
      sourceThumbnailUrl: sourceThumbnailUrl || undefined,
      trimEndMs,
      trimStartMs,
      visibility,
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(persisted))
      setPersistedAt(persisted.persistedAt)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [
    allowComments,
    caption,
    coverTimestampMs,
    creativeEdit,
    draftId,
    draftStorageKey,
    hasMedia,
    previewUrl,
    scheduledFor,
    sourceAspectRatio,
    sourceDurationMs,
    sourceFileName,
    sourceMediaType,
    sourceMediaUrl,
    sourceThumbnailUrl,
    trimEndMs,
    trimStartMs,
    visibility,
  ])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (localPreviewUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      const frame = previewAreaRef.current
      if (!dragState || !frame || dragState.pointerId !== event.pointerId) return

      const frameRect = frame.getBoundingClientRect()
      if (dragState.kind === 'overlay') {
        setCreativeEdit((previous) => ({
          ...previous,
          textOverlays: previous.textOverlays.map((overlay) => (
            overlay.id !== dragState.overlayId
              ? overlay
              : {
                  ...overlay,
                  x: clamp(dragState.originX + (event.clientX - dragState.startX) / frameRect.width, 0.05, 0.95),
                  y: clamp(dragState.originY + (event.clientY - dragState.startY) / frameRect.height, 0.08, 0.92),
                }
          )),
        }))
        return
      }

      setCreativeEdit((previous) => ({
        ...previous,
        crop: {
          ...previous.crop,
          offsetX: clamp(dragState.originX + (event.clientX - dragState.startX) / Math.max(frameRect.width / 2, 1), -1, 1),
          offsetY: clamp(dragState.originY + (event.clientY - dragState.startY) / Math.max(frameRect.height / 2, 1), -1, 1),
        },
      }))
    }

    const handlePointerUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const replacePreviewUrl = (nextValue: string) => {
    if (localPreviewUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrlRef.current)
    }
    localPreviewUrlRef.current = nextValue.startsWith('blob:') ? nextValue : null
    setPreviewUrl(nextValue)
  }

  const restoreDefaults = () => {
    setAllowComments(true)
    setCaption('')
    setCoverTimestampMs(0)
    setCreativeEdit(createSocialCreativeEdit(target))
    setDraftId(undefined)
    setPersistedAt(null)
    setScheduledFor('')
    setSelectedOverlayId(null)
    setSourceAspectRatio(undefined)
    setSourceDurationMs(undefined)
    setSourceFileName('')
    setSourceMediaType(null)
    setSourceMediaUrl('')
    setSourceThumbnailUrl('')
    setTrimEndMs(0)
    setTrimStartMs(0)
    setVisibility('public')
    replacePreviewUrl('')
    window.localStorage.removeItem(draftStorageKey)
  }

  const updateSelectedOverlay = (updater: (overlay: SocialTextOverlay) => SocialTextOverlay) => {
    if (!selectedOverlayId) return
    setCreativeEdit((previous) => ({
      ...previous,
      textOverlays: previous.textOverlays.map((overlay) => (
        overlay.id === selectedOverlayId ? updater(overlay) : overlay
      )),
    }))
  }

  const handleResetEdits = () => {
    setCreativeEdit(createSocialCreativeEdit(target))
    setSelectedOverlayId(null)
    setCoverTimestampMs(0)
    setTrimStartMs(0)
    setTrimEndMs(sourceDurationMs ?? 0)
  }

  const playTrackPreview = (track: SocialMusicTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlayingTrackId(null)
      return
    }

    audioRef.current?.pause()
    const audio = new Audio(track.previewUrl)
    audio.currentTime = (creativeEdit.music?.trackId === track.id ? creativeEdit.music.startMs : 0) / 1000
    audio.play().catch(() => {})
    audio.onended = () => setPlayingTrackId(null)
    audioRef.current = audio
    setPlayingTrackId(track.id)
  }

  const handleHydrateSource = async (file: File) => {
    const nextType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null
    if (!nextType) {
      showError('Choose a photo or video.')
      return
    }

    if (target === 'reel' && nextType !== 'video') {
      showError('Reels require a video.')
      return
    }

    if (file.size <= 0) {
      showError('This file is empty.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    replacePreviewUrl(localUrl)
    setLoadingSource(true)
    setSourceFileName(file.name)

    try {
      const uploadedSourceUrl = await bjjService.uploadSessionPhoto(userId, file)
      setSourceMediaType(nextType)
      setSourceMediaUrl(uploadedSourceUrl)
      setCreativeEdit(createSocialCreativeEdit(target))
      setSelectedOverlayId(null)

      if (nextType === 'image') {
        const metadata = await loadImageMetadata(localUrl)
        const aspect = metadata.width / Math.max(metadata.height, 1)
        setSourceAspectRatio(aspect)
        setSourceDurationMs(undefined)
        setTrimStartMs(0)
        setTrimEndMs(0)
        setCoverTimestampMs(0)
        setSourceThumbnailUrl(uploadedSourceUrl)
        showSuccess(target === 'story' ? 'Story ready' : target === 'reel' ? 'Reel ready' : 'Post ready')
        return
      }

      const metadata = await loadVideoMetadata(localUrl)
      const defaultPosterBlob = await renderSocialCreativeVideoPosterToBlob({
        creativeEdit: createSocialCreativeEdit(target),
        currentTimeMs: 0,
        type: 'image/jpeg',
        videoSrc: localUrl,
      })
      const posterFile = new File([defaultPosterBlob], `${sanitizeFileName(file.name)}-poster.jpg`, {
        type: 'image/jpeg',
      })
      const uploadedPosterUrl = await bjjService.uploadSessionPhoto(userId, posterFile)

      setSourceAspectRatio(metadata.width / Math.max(metadata.height, 1))
      setSourceDurationMs(metadata.durationMs)
      setTrimStartMs(0)
      setTrimEndMs(metadata.durationMs)
      setCoverTimestampMs(0)
      setSourceThumbnailUrl(uploadedPosterUrl)
      showSuccess(target === 'reel' ? 'Reel ready' : target === 'story' ? 'Story ready' : 'Post ready')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to prepare this media')
      setSourceMediaType(null)
      setSourceMediaUrl('')
      setSourceThumbnailUrl('')
      setSourceAspectRatio(undefined)
      setSourceDurationMs(undefined)
    } finally {
      setLoadingSource(false)
    }
  }

  const handlePickFile = async (file: File | null) => {
    if (!file) return
    await handleHydrateSource(file)
  }

  const launchNativeCamera = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        allowEditing: false,
        quality: 92,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      })

      if (!photo.webPath) {
        throw new Error('No photo was returned')
      }

      const response = await fetch(photo.webPath)
      const blob = await response.blob()
      const extension = photo.format ?? 'jpeg'
      const file = new File([blob], `social-${Date.now()}.${extension}`, {
        type: blob.type || `image/${extension}`,
      })
      await handleHydrateSource(file)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/cancel/i.test(message)) return
      showError(message || 'Unable to access the camera')
    }
  }

  const handlePickNativePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
      photoCaptureInputRef.current?.click()
      return
    }

    const status = await inspectCameraPermission()
    if (status.granted) {
      await launchNativeCamera()
      return
    }
    if (status.denied) {
      setCameraDeniedOpen(true)
      return
    }
    if (!hasSeenPermissionPrimer('camera')) {
      setCameraPrimerOpen(true)
      return
    }
    const outcome = await requestCameraPermission()
    if (outcome === 'granted') {
      await launchNativeCamera()
    } else if (outcome === 'denied') {
      setCameraDeniedOpen(true)
    }
  }

  const handleConfirmCameraPrimer = async () => {
    markPermissionPrimerSeen('camera')
    setCameraPrimerOpen(false)
    const outcome = await requestCameraPermission()
    if (outcome === 'granted') {
      await launchNativeCamera()
    } else if (outcome === 'denied') {
      setCameraDeniedOpen(true)
    }
  }

  const handleOpenCameraSettings = () => {
    setCameraDeniedOpen(false)
    void openAppSettings()
  }

  const handleFramePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'crop' || !hasMedia) return
    dragStateRef.current = {
      kind: 'media',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: creativeEdit.crop.offsetX,
      originY: creativeEdit.crop.offsetY,
    }
  }

  const mediaTransformStyle: CSSProperties = {
    filter: filterCss === 'none' ? undefined : filterCss,
    transform: `translate(${creativeEdit.crop.offsetX * 18}%, ${creativeEdit.crop.offsetY * 18}%) scale(${creativeEdit.crop.scale})`,
  }

  const buildFinalVideoAssets = async (): Promise<{
    durationMs?: number
    mediaType: 'video'
    mediaUrl: string
    playbackUrl: string
    renderStatus: SocialCreativeRenderStatus
    thumbnailUrl: string
  }> => {
    if (!sourceMediaUrl) {
      throw new Error('Source video is missing')
    }

    const visualEdits = hasVisualEdits(target, creativeEdit)
    const hasMusic = Boolean(creativeEdit.music?.trackId)
    const hasTrimEdits = trimStartMs > 0 || (sourceDurationMs ? trimEndMs > 0 && trimEndMs < sourceDurationMs : false)

    if (!visualEdits && !hasMusic && !hasTrimEdits) {
      return {
        durationMs: sourceDurationMs,
        mediaType: 'video',
        mediaUrl: sourceMediaUrl,
        playbackUrl: sourceMediaUrl,
        renderStatus: 'ready',
        thumbnailUrl: sourceThumbnailUrl || sourceMediaUrl,
      }
    }

    const formData = new FormData()
    formData.set('sourceType', 'video')
    formData.set('sourceUrl', sourceMediaUrl)
    formData.set('aspectPreset', creativeEdit.crop.aspectPreset)
    formData.set('filterId', creativeEdit.filter.id)
    formData.set('filterIntensity', String(creativeEdit.filter.intensity))
    formData.set('trimStartMs', String(trimStartMs))
    formData.set('trimEndMs', String(trimEndMs > 0 ? trimEndMs : sourceDurationMs ?? 0))
    formData.set('coverTimestampMs', String(coverTimestampMs))

    if (creativeEdit.music?.trackId) {
      formData.set('trackId', creativeEdit.music.trackId)
      formData.set('trackPreviewUrl', creativeEdit.music.previewUrl)
      formData.set('durationMs', String(creativeEdit.music.durationMs))
      formData.set('startMs', String(creativeEdit.music.startMs))
      formData.set('volume', String(creativeEdit.music.volume))
    }

    const overlayBlob = await renderSocialCreativeOverlayToBlob({ creativeEdit })
    if (overlayBlob) {
      formData.set('overlayImage', new File([overlayBlob], 'overlay.png', { type: 'image/png' }))
    }

    const { data: { session: renderSession } } = await supabase.auth.getSession()
    const renderAccessToken = renderSession?.access_token
    if (!renderAccessToken) {
      throw new Error('You must be signed in to render media')
    }
    const response = await fetch('/api/social/creative-render', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${renderAccessToken}` },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Creative video render failed')
    }

    const renderedBlob = await response.blob()
    const renderedFile = new File([renderedBlob], `${target}-creative-${Date.now()}.mp4`, { type: 'video/mp4' })
    const uploadedVideoUrl = await bjjService.uploadSessionPhoto(userId, renderedFile)

    let thumbnailUrl = sourceThumbnailUrl || uploadedVideoUrl
    try {
      const posterBlob = await renderSocialCreativeVideoPosterToBlob({
        creativeEdit,
        currentTimeMs: Math.max(trimStartMs, coverTimestampMs),
        type: 'image/jpeg',
        videoSrc: previewUrl || sourceMediaUrl,
      })
      const posterFile = new File([posterBlob], `${target}-poster-${Date.now()}.jpg`, { type: 'image/jpeg' })
      thumbnailUrl = await bjjService.uploadSessionPhoto(userId, posterFile)
    } catch {
      thumbnailUrl = sourceThumbnailUrl || uploadedVideoUrl
    }

    return {
      durationMs: Math.max(0, trimEndMs > 0 ? trimEndMs - trimStartMs : (sourceDurationMs ?? 0)),
      mediaType: 'video',
      mediaUrl: uploadedVideoUrl,
      playbackUrl: uploadedVideoUrl,
      renderStatus: 'ready',
      thumbnailUrl,
    }
  }

  const buildFinalImageAssets = async (): Promise<{
    durationMs?: number
    mediaType: 'image' | 'video'
    mediaUrl: string
    playbackUrl?: string
    renderStatus: SocialCreativeRenderStatus
    thumbnailUrl: string
  }> => {
    if (!sourceMediaUrl) {
      throw new Error('Choose media first')
    }

    const visualEdits = hasVisualEdits(target, creativeEdit)
    const hasMusic = Boolean(creativeEdit.music?.trackId)
    if (!visualEdits && !hasMusic) {
      return {
        mediaType: 'image',
        mediaUrl: sourceMediaUrl,
        renderStatus: 'ready',
        thumbnailUrl: sourceThumbnailUrl || sourceMediaUrl,
      }
    }

    const flattenedBlob = await renderSocialCreativeImageToBlob({
      creativeEdit,
      imageSrc: previewUrl || sourceMediaUrl,
      type: 'image/jpeg',
    })
    const flattenedFile = new File([flattenedBlob], `${target}-creative-${Date.now()}.jpg`, { type: 'image/jpeg' })

    if (!creativeEdit.music?.trackId) {
      const uploadedImageUrl = await bjjService.uploadSessionPhoto(userId, flattenedFile)
      return {
        mediaType: 'image',
        mediaUrl: uploadedImageUrl,
        renderStatus: 'ready',
        thumbnailUrl: uploadedImageUrl,
      }
    }

    const formData = new FormData()
    formData.set('sourceType', 'image')
    formData.set('image', flattenedFile)
    formData.set('trackId', creativeEdit.music.trackId)
    formData.set('trackPreviewUrl', creativeEdit.music.previewUrl)
    formData.set('aspectPreset', creativeEdit.crop.aspectPreset)
    formData.set('durationMs', String(creativeEdit.music.durationMs))
    formData.set('startMs', String(creativeEdit.music.startMs))
    formData.set('volume', String(creativeEdit.music.volume))

    const { data: { session: imageRenderSession } } = await supabase.auth.getSession()
    const imageRenderAccessToken = imageRenderSession?.access_token
    if (!imageRenderAccessToken) {
      throw new Error('You must be signed in to render media')
    }
    const response = await fetch('/api/social/creative-render', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${imageRenderAccessToken}` },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Creative video render failed')
    }

    const renderedBlob = await response.blob()
    const renderedFile = new File([renderedBlob], `${target}-creative-${Date.now()}.mp4`, { type: 'video/mp4' })
    const uploadedVideoUrl = await bjjService.uploadSessionPhoto(userId, renderedFile)
    const flattenedUrl = await bjjService.uploadSessionPhoto(userId, flattenedFile)

    return {
      durationMs: creativeEdit.music.durationMs,
      mediaType: 'video',
      mediaUrl: uploadedVideoUrl,
      playbackUrl: uploadedVideoUrl,
      renderStatus: 'ready',
      thumbnailUrl: flattenedUrl,
    }
  }

  const handleSaveDraft = async () => {
    if (!enableDrafts || !sourceMediaUrl || !sourceMediaType) return

    setSavingDraft(true)
    try {
      const draft = await socialFeedService.saveDraft(userId, {
        id: draftId,
        publishTarget: target,
        caption,
        coverTimestampMs,
        creativeEdit,
        durationMs: sourceDurationMs,
        mediaType: sourceMediaType,
        mediaUrl: sourceMediaUrl,
        postKind,
        renderJobId: undefined,
        renderStatus: 'idle',
        scheduledFor: scheduledFor || null,
        sourceMediaType,
        sourceMediaUrl,
        sourceThumbnailUrl: sourceThumbnailUrl || undefined,
        thumbnailUrl: sourceThumbnailUrl || undefined,
        trimEndMs,
        trimStartMs,
        uploadProgress: 100,
        uploadStatus: 'uploaded',
        videoAssetId: undefined,
        visibility,
      })
      setDraftId(draft.id)
      onDraftSaved?.(draft)
      showSuccess('Draft saved')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handlePublish = async () => {
    if (!sourceMediaUrl || !sourceMediaType) {
      showError(target === 'reel' ? 'Choose a video first' : 'Choose media first')
      return
    }

    setPublishing(true)
    try {
      const asset = sourceMediaType === 'video'
        ? await buildFinalVideoAssets()
        : await buildFinalImageAssets()

      if (target === 'story') {
        await socialFeedService.createStory(userId, {
          caption,
          creativeEdit,
          durationMs: asset.durationMs,
          mediaType: asset.mediaType,
          mediaUrl: asset.mediaUrl,
          renderStatus: asset.renderStatus,
          thumbnailUrl: asset.thumbnailUrl,
          visibility,
        })
        window.localStorage.removeItem(draftStorageKey)
        restoreDefaults()
        onClose()
        await onStoryPublished()
        showSuccess('Story published')
        return
      }

      const created = await socialFeedService.createPost(userId, {
        allowComments,
        aspectRatio: getSocialAspectRatioValue(creativeEdit.crop.aspectPreset),
        caption,
        coverTimestampMs,
        creativeEdit,
        draftId,
        durationMs: asset.durationMs,
        mediaType: asset.mediaType,
        mediaUrl: asset.mediaUrl,
        playbackUrl: asset.playbackUrl,
        postKind,
        renderStatus: asset.renderStatus,
        scheduledFor: scheduledFor || null,
        thumbnailUrl: asset.thumbnailUrl,
        trimEndMs: sourceMediaType === 'video' ? trimEndMs : undefined,
        trimStartMs: sourceMediaType === 'video' ? trimStartMs : undefined,
        visibility,
      })

      const activeDraftId = draftId
      window.localStorage.removeItem(draftStorageKey)
      restoreDefaults()
      onClose()
      await onPostPublished(created, activeDraftId)
      showSuccess(created.scheduled ? `${target === 'reel' ? 'Reel' : 'Post'} scheduled` : `${target === 'reel' ? 'Reel' : 'Post'} published`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to publish right now')
    } finally {
      setPublishing(false)
    }
  }

  const renderPreview = () => {
    const mediaSrc = previewUrl || sourceMediaUrl
    if (!mediaSrc) return null

    if (sourceMediaType === 'video') {
      return (
        <video
          key={mediaSrc}
          src={mediaSrc}
          poster={sourceThumbnailUrl || undefined}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          style={mediaTransformStyle}
        />
      )
    }

    return (
      <Image
        src={mediaSrc}
        alt={`${target} preview`}
        fill
        unoptimized
        className="object-cover"
        style={mediaTransformStyle}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-modal bg-black text-white">
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col">
        <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white"
            aria-label="Close creator"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              {target === 'story' ? 'New story' : target === 'reel' ? 'New reel' : 'New post'}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
              {persistedAt ? `Saved ${formatSavedAt(persistedAt)}` : 'Live editor'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPublishSheetOpen(true)}
            disabled={!sourceMediaUrl || loadingSource}
            className="rounded-full bg-[#2f58ff] px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
          >
            Next
          </button>
        </div>

        <div ref={previewAreaRef} className="relative flex-1 overflow-hidden">
          {!hasMedia ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
              <div className="space-y-3">
                <p className="text-[30px] font-black tracking-tight text-white">
                  {target === 'story' ? 'Capture a story' : target === 'reel' ? 'Create a reel' : 'Create a post'}
                </p>
                <p className="text-sm leading-6 text-white/58">
                  {target === 'reel'
                    ? 'Choose a video, then trim, crop, add music, text, and filters before publishing.'
                    : 'Choose a photo or video, then edit it full-screen before publishing.'}
                </p>
              </div>
              <div className="grid w-full gap-3">
                {target !== 'reel' && (
                  <button
                    type="button"
                    onClick={() => {
                      void handlePickNativePhoto()
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-bold text-black"
                  >
                    <Camera className="h-4 w-4" />
                    Take photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => videoCaptureInputRef.current?.click()}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-bold',
                    target === 'reel' ? 'bg-white text-black' : 'border border-white/12 bg-white/6 text-white',
                  )}
                >
                  <Clapperboard className="h-4 w-4" />
                  {target === 'reel' ? 'Record reel' : 'Record video'}
                </button>
                <button
                  type="button"
                  onClick={() => mediaLibraryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/6 px-4 py-3 text-sm font-bold text-white"
                >
                  <Camera className="h-4 w-4" />
                  {target === 'reel' ? 'Choose video' : 'Choose from library'}
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-3 pb-5">
              <div
                className="relative overflow-hidden rounded-[8px] bg-[#05070d] shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
                style={{ height: frameSize.height, width: frameSize.width }}
                onPointerDown={handleFramePointerDown}
              >
                <div className="absolute inset-0">{renderPreview()}</div>

                {creativeEdit.textOverlays.map((overlay) => (
                  <button
                    key={overlay.id}
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      setSelectedOverlayId(overlay.id)
                      dragStateRef.current = {
                        kind: 'overlay',
                        overlayId: overlay.id,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        originX: overlay.x,
                        originY: overlay.y,
                      }
                    }}
                    className={cn(
                      'absolute max-w-[78%] -translate-x-1/2 -translate-y-1/2 touch-none select-none px-2 text-center text-white',
                      selectedOverlayId === overlay.id && 'outline outline-1 outline-white/35',
                    )}
                    style={{
                      left: `${overlay.x * 100}%`,
                      top: `${overlay.y * 100}%`,
                      color: overlay.color,
                      transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotationDeg}deg)`,
                    }}
                  >
                    <span
                      className={cn(
                        'inline-block whitespace-pre-wrap break-words rounded-[8px] px-3 py-1.5 text-[28px] font-bold leading-tight shadow-[0_10px_24px_rgba(0,0,0,0.34)]',
                        overlay.background === 'pill' ? 'bg-black/55' : 'bg-transparent',
                        overlay.fontPreset === 'classic' && 'font-serif',
                        overlay.fontPreset === 'headline' && 'font-black uppercase tracking-[0.03em]',
                      )}
                      style={{ textAlign: overlay.align }}
                    >
                      {overlay.text}
                    </span>
                  </button>
                ))}

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),transparent_24%,transparent_76%,rgba(0,0,0,0.34))]" />
                {loadingSource && (
                  <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-sm">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/50 px-4 py-2 text-sm font-semibold text-white">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing media...
                    </div>
                  </div>
                )}
                {selectedMusic && (
                  <div className="absolute bottom-4 left-4 inline-flex max-w-[78%] items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white/86">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span className="truncate">{selectedMusic.title} · {selectedMusic.artist}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {hasMedia && (
          <div className="border-t border-white/10 px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <ToolButton active={activeTool === 'text'} Icon={Type} label="Text" onClick={() => setActiveTool((previous) => previous === 'text' ? null : 'text')} />
              <ToolButton active={activeTool === 'music'} Icon={Music2} label="Music" onClick={() => setActiveTool((previous) => previous === 'music' ? null : 'music')} />
              <ToolButton active={activeTool === 'filters'} Icon={SlidersHorizontal} label="Filters" onClick={() => setActiveTool((previous) => previous === 'filters' ? null : 'filters')} />
              <ToolButton active={activeTool === 'crop'} Icon={Crop} label="Crop" onClick={() => setActiveTool((previous) => previous === 'crop' ? null : 'crop')} />
              {isVideoSource && (
                <ToolButton active={activeTool === 'video'} Icon={Scissors} label="Video" onClick={() => setActiveTool((previous) => previous === 'video' ? null : 'video')} />
              )}
              <ToolButton active={activeTool === 'more'} Icon={RotateCcw} label="More" onClick={() => setActiveTool((previous) => previous === 'more' ? null : 'more')} />
            </div>

            {activeTool === 'text' && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Text</p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextOverlay = createSocialTextOverlay()
                      setCreativeEdit((previous) => ({
                        ...previous,
                        textOverlays: [...previous.textOverlays, nextOverlay],
                      }))
                      setSelectedOverlayId(nextOverlay.id)
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black"
                  >
                    Add text
                  </button>
                </div>

                {selectedOverlay ? (
                  <div className="space-y-3">
                    <textarea
                      value={selectedOverlay.text}
                      onChange={(event) => updateSelectedOverlay((overlay) => ({ ...overlay, text: event.target.value.slice(0, 220) }))}
                      rows={2}
                      className="w-full rounded-[16px] border border-white/12 bg-black/35 px-3 py-2 text-sm text-white outline-none"
                      placeholder="Write something..."
                    />
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_TEXT_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateSelectedOverlay((overlay) => ({ ...overlay, color }))}
                          className={cn(
                            'h-8 w-8 rounded-full border border-white/14',
                            selectedOverlay.color === color && 'ring-2 ring-white/65 ring-offset-2 ring-offset-black',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['modern', 'Modern'],
                        ['classic', 'Classic'],
                        ['headline', 'Headline'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateSelectedOverlay((overlay) => ({ ...overlay, fontPreset: value }))}
                          className={cn(
                            'rounded-[14px] border px-3 py-2 text-xs font-bold',
                            selectedOverlay.fontPreset === value ? 'border-white bg-white text-black' : 'border-white/12 bg-black/35 text-white/72',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-2 text-xs font-semibold text-white/56">
                        <span>Scale</span>
                        <input
                          type="range"
                          min={0.7}
                          max={2.4}
                          step={0.05}
                          value={selectedOverlay.scale}
                          onChange={(event) => updateSelectedOverlay((overlay) => ({ ...overlay, scale: Number(event.target.value) }))}
                          className="w-full accent-white"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold text-white/56">
                        <span>Rotate</span>
                        <input
                          type="range"
                          min={-45}
                          max={45}
                          step={1}
                          value={selectedOverlay.rotationDeg}
                          onChange={(event) => updateSelectedOverlay((overlay) => ({ ...overlay, rotationDeg: Number(event.target.value) }))}
                          className="w-full accent-white"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['none', 'No background'],
                        ['pill', 'Pill'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateSelectedOverlay((overlay) => ({ ...overlay, background: value }))}
                          className={cn(
                            'rounded-[14px] border px-3 py-2 text-xs font-bold',
                            selectedOverlay.background === value ? 'border-white bg-white text-black' : 'border-white/12 bg-black/35 text-white/72',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreativeEdit((previous) => ({
                          ...previous,
                          textOverlays: previous.textOverlays.filter((overlay) => overlay.id !== selectedOverlay.id),
                        }))
                        setSelectedOverlayId(null)
                      }}
                      className="text-xs font-bold text-[#ff9ea4]"
                    >
                      Remove text
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-white/58">Add a text layer, then drag it on the canvas.</p>
                )}
              </div>
            )}

            {activeTool === 'music' && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Music</p>
                  {creativeEdit.music && (
                    <button
                      type="button"
                      onClick={() => setCreativeEdit((previous) => ({ ...previous, music: null }))}
                      className="text-xs font-bold text-white/56"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {musicTracks.map((track) => {
                    const active = creativeEdit.music?.trackId === track.id
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setCreativeEdit((previous) => ({
                            ...previous,
                            music: {
                              trackId: track.id,
                              title: track.title,
                              artist: track.artist,
                              previewUrl: track.previewUrl,
                              artworkUrl: track.artworkUrl,
                              startMs: previous.music?.trackId === track.id ? previous.music.startMs : 0,
                              durationMs: previous.music?.trackId === track.id
                                ? previous.music.durationMs
                                : (target === 'story' ? 15_000 : target === 'reel' ? 15_000 : 10_000),
                              volume: previous.music?.trackId === track.id ? previous.music.volume : 1,
                            },
                          }))
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[16px] border px-3 py-3 text-left',
                          active ? 'border-white bg-white text-black' : 'border-white/10 bg-black/35 text-white',
                        )}
                      >
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-[12px]', active ? 'bg-black/10' : 'bg-white/8')}>
                          <Music2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{track.title}</p>
                          <p className={cn('truncate text-xs', active ? 'text-black/58' : 'text-white/52')}>{track.artist}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            playTrackPreview(track)
                          }}
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-full',
                            active ? 'bg-black/10 text-black' : 'bg-white/8 text-white',
                          )}
                        >
                          {playingTrackId === track.id ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      </button>
                    )
                  })}
                </div>
                {creativeEdit.music && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedMusicDurationOptions.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() => setCreativeEdit((previous) => previous.music ? ({
                            ...previous,
                            music: { ...previous.music, durationMs: duration },
                          }) : previous)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-xs font-bold',
                            creativeEdit.music?.durationMs === duration ? 'bg-white text-black' : 'bg-white/8 text-white/72',
                          )}
                        >
                          {Math.round(duration / 1000)}s
                        </button>
                      ))}
                    </div>
                    <label className="space-y-2 text-xs font-semibold text-white/56">
                      <span>Start point</span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max((musicLookup.get(creativeEdit.music.trackId)?.durationMs ?? 15_000) - creativeEdit.music.durationMs, 0)}
                        step={250}
                        value={creativeEdit.music.startMs}
                        onChange={(event) => setCreativeEdit((previous) => previous.music ? ({
                          ...previous,
                          music: {
                            ...previous.music,
                            startMs: Number(event.target.value),
                          },
                        }) : previous)}
                        className="w-full accent-white"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {activeTool === 'filters' && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {SOCIAL_FILTER_PRESETS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setCreativeEdit((previous) => ({
                        ...previous,
                        filter: {
                          id: filter.id,
                          intensity: filter.id === 'none' ? 0 : Math.max(previous.filter.intensity, 0.55),
                        },
                      }))}
                      className={cn(
                        'rounded-full px-3 py-2 text-xs font-bold',
                        creativeEdit.filter.id === filter.id ? 'bg-white text-black' : 'bg-white/8 text-white/72',
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {creativeEdit.filter.id !== 'none' && (
                  <label className="space-y-2 text-xs font-semibold text-white/56">
                    <span>Intensity</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={creativeEdit.filter.intensity}
                      onChange={(event) => setCreativeEdit((previous) => ({
                        ...previous,
                        filter: {
                          ...previous.filter,
                          intensity: Number(event.target.value),
                        },
                      }))}
                      className="w-full accent-white"
                    />
                  </label>
                )}
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <div className="flex gap-2">
                  {SOCIAL_ASPECT_PRESETS
                    .filter((preset) => target === 'story' || target === 'reel' ? preset.id === '9:16' : true)
                    .map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCreativeEdit((previous) => ({
                          ...previous,
                          crop: {
                            ...previous.crop,
                            aspectPreset: preset.id,
                          },
                        }))}
                        className={cn(
                          'rounded-full px-3 py-2 text-xs font-bold',
                          creativeEdit.crop.aspectPreset === preset.id ? 'bg-white text-black' : 'bg-white/8 text-white/72',
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                </div>
                <label className="space-y-2 text-xs font-semibold text-white/56">
                  <span>Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={2.4}
                    step={0.05}
                    value={creativeEdit.crop.scale}
                    onChange={(event) => setCreativeEdit((previous) => ({
                      ...previous,
                      crop: {
                        ...previous.crop,
                        scale: Number(event.target.value),
                      },
                    }))}
                    className="w-full accent-white"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2 text-xs font-semibold text-white/56">
                    <span>Horizontal</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={creativeEdit.crop.offsetX}
                      onChange={(event) => setCreativeEdit((previous) => ({
                        ...previous,
                        crop: {
                          ...previous.crop,
                          offsetX: Number(event.target.value),
                        },
                      }))}
                      className="w-full accent-white"
                    />
                  </label>
                  <label className="space-y-2 text-xs font-semibold text-white/56">
                    <span>Vertical</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={creativeEdit.crop.offsetY}
                      onChange={(event) => setCreativeEdit((previous) => ({
                        ...previous,
                        crop: {
                          ...previous.crop,
                          offsetY: Number(event.target.value),
                        },
                      }))}
                      className="w-full accent-white"
                    />
                  </label>
                </div>
                <p className="text-xs text-white/44">Drag the canvas while Crop is active for direct positioning.</p>
              </div>
            )}

            {activeTool === 'video' && isVideoSource && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <label className="space-y-2 text-xs font-semibold text-white/56">
                  <div className="flex items-center justify-between">
                    <span>Cover frame</span>
                    <span>{formatDurationLabel(coverTimestampMs)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(sourceDurationMs ?? 0, 0)}
                    step={250}
                    value={Math.min(coverTimestampMs, sourceDurationMs ?? 0)}
                    onChange={(event) => setCoverTimestampMs(Number(event.target.value))}
                    className="w-full accent-white"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-white/56">
                  <div className="flex items-center justify-between">
                    <span>Trim start</span>
                    <span>{formatDurationLabel(trimStartMs)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(sourceDurationMs ?? 0, 0)}
                    step={250}
                    value={trimStartMs}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      setTrimStartMs(nextValue)
                      setTrimEndMs((previous) => Math.max(previous || 0, nextValue))
                    }}
                    className="w-full accent-white"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold text-white/56">
                  <div className="flex items-center justify-between">
                    <span>Trim end</span>
                    <span>{formatDurationLabel(trimEndMs || sourceDurationMs || 0)}</span>
                  </div>
                  <input
                    type="range"
                    min={trimStartMs}
                    max={Math.max(sourceDurationMs ?? 0, trimStartMs)}
                    step={250}
                    value={Math.max(trimStartMs, trimEndMs || sourceDurationMs || trimStartMs)}
                    onChange={(event) => setTrimEndMs(Math.max(trimStartMs, Number(event.target.value)))}
                    className="w-full accent-white"
                  />
                </label>
              </div>
            )}

            {activeTool === 'more' && (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3">
                <button
                  type="button"
                  onClick={handleResetEdits}
                  className="inline-flex w-full items-center justify-center rounded-[16px] border border-white/12 bg-black/35 px-4 py-3 text-sm font-bold text-white"
                >
                  Reset edits
                </button>
                <button
                  type="button"
                  onClick={restoreDefaults}
                  className="inline-flex w-full items-center justify-center rounded-[16px] border border-[#ff9ea4]/30 bg-[#ff9ea4]/8 px-4 py-3 text-sm font-bold text-[#ffb8be]"
                >
                  Clear draft
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={photoCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handlePickFile(event.target.files?.[0] ?? null)
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={videoCaptureInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handlePickFile(event.target.files?.[0] ?? null)
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={mediaLibraryInputRef}
        type="file"
        accept={target === 'reel' ? 'video/*' : 'image/*,video/*'}
        className="hidden"
        onChange={(event) => {
          void handlePickFile(event.target.files?.[0] ?? null)
          event.currentTarget.value = ''
        }}
      />

      {publishSheetOpen && (
        <div className="fixed inset-0 z-popover bg-black/55 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" onClick={() => setPublishSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] rounded-t-[28px] border border-white/10 bg-[#060912] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-black text-white">Publish</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                  Final settings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishSheetOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white"
                aria-label="Close publish sheet"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={4}
                className="w-full rounded-[18px] border border-white/12 bg-black/35 px-4 py-3 text-sm text-white outline-none"
                placeholder={target === 'story' ? 'Add a story caption' : 'Write a caption'}
              />

              <div className="grid grid-cols-3 gap-2">
                {([
                  ['public', 'Public'],
                  ['followers', 'Followers'],
                  ['private', 'Private'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={cn(
                      'rounded-[16px] px-3 py-2 text-xs font-bold',
                      visibility === value ? 'bg-white text-black' : 'bg-white/8 text-white/72',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {target !== 'story' && (
                <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">Comments</p>
                    <p className="text-xs text-white/48">Let people reply on this {target === 'reel' ? 'reel' : 'post'}.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowComments((previous) => !previous)}
                    className={cn(
                      'inline-flex h-8 w-14 items-center rounded-full px-1 transition',
                      allowComments ? 'bg-white' : 'bg-white/12',
                    )}
                  >
                    <span
                      className={cn(
                        'h-6 w-6 rounded-full transition',
                        allowComments ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white',
                      )}
                    />
                  </button>
                </label>
              )}

              {target !== 'story' && enableScheduling && (
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Schedule</span>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                    className="h-12 w-full rounded-[18px] border border-white/12 bg-black/35 px-4 text-sm text-white outline-none"
                  />
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                {enableDrafts && (
                  <button
                    type="button"
                    disabled={!sourceMediaUrl || savingDraft}
                    onClick={() => {
                      void handleSaveDraft()
                    }}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white disabled:opacity-45"
                  >
                    {savingDraft ? 'Saving…' : 'Save draft'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!sourceMediaUrl || publishing}
                  onClick={() => {
                    void handlePublish()
                  }}
                  className={cn(
                    'rounded-full bg-[#2f58ff] px-4 py-3 text-sm font-bold text-white disabled:opacity-45',
                    !enableDrafts && 'col-span-2',
                  )}
                >
                  {publishing
                    ? 'Publishing…'
                    : scheduledFor && target !== 'story'
                      ? 'Schedule'
                      : target === 'story'
                        ? 'Publish story'
                        : target === 'reel'
                          ? 'Publish reel'
                          : 'Publish post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={cameraPrimerOpen}
        title="Use your camera?"
        message="MatFlow needs camera and photo access so you can capture and share training moments. We never read photos in the background — only when you tap to add one."
        confirmText="Continue"
        cancelText="Not now"
        onConfirm={() => { void handleConfirmCameraPrimer() }}
        onClose={() => setCameraPrimerOpen(false)}
      />
      <ConfirmationModal
        isOpen={cameraDeniedOpen}
        title="Camera access is off"
        message="To capture a photo, enable Camera and Photos for MatFlow in iOS Settings."
        confirmText="Open Settings"
        cancelText="Cancel"
        onConfirm={handleOpenCameraSettings}
        onClose={() => setCameraDeniedOpen(false)}
      />
    </div>
  )
}
