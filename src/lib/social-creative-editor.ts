import {
  getSocialFilterCss,
  getSocialOutputSize,
} from '@/lib/social-creative'
import type { SocialCreativeEdit, SocialTextOverlay } from '@/lib/social-models'

const FONT_FAMILIES: Record<SocialTextOverlay['fontPreset'], string> = {
  classic: '"Times New Roman", Georgia, serif',
  modern: '"Inter", "Helvetica Neue", Arial, sans-serif',
  headline: '"Arial Black", Impact, sans-serif',
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load creative source image'))
    image.src = src
  })
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.playsInline = true
    video.muted = true
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('Unable to load creative source video'))
    video.src = src
    video.load()
  })
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = words[0]
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    lines.push(current)
    current = words[index]
  }
  lines.push(current)
  return lines
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + clampedRadius, y)
  context.lineTo(x + width - clampedRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
  context.lineTo(x + width, y + height - clampedRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height)
  context.lineTo(x + clampedRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius)
  context.lineTo(x, y + clampedRadius)
  context.quadraticCurveTo(x, y, x + clampedRadius, y)
  context.closePath()
}

function drawTextOverlay(
  context: CanvasRenderingContext2D,
  overlay: SocialTextOverlay,
  canvasWidth: number,
  canvasHeight: number,
) {
  const fontSize = Math.round(Math.min(canvasWidth, canvasHeight) * 0.065 * overlay.scale)
  const maxWidth = canvasWidth * 0.82
  context.save()
  context.translate(canvasWidth * overlay.x, canvasHeight * overlay.y)
  context.rotate((overlay.rotationDeg * Math.PI) / 180)
  context.font = `${overlay.fontPreset === 'headline' ? '800' : '700'} ${fontSize}px ${FONT_FAMILIES[overlay.fontPreset]}`
  context.textAlign = overlay.align
  context.textBaseline = 'middle'

  const lines = wrapText(context, overlay.text, maxWidth)
  const lineHeight = fontSize * 1.18
  const widths = lines.map((line) => context.measureText(line).width)
  const blockWidth = Math.max(...widths, fontSize)
  const blockHeight = lineHeight * lines.length
  const xOffset = overlay.align === 'left' ? 0 : overlay.align === 'right' ? -blockWidth : -blockWidth / 2

  if (overlay.background === 'pill') {
    context.fillStyle = 'rgba(8, 10, 18, 0.68)'
    drawRoundedRect(context, xOffset - 26, -blockHeight / 2 - 16, blockWidth + 52, blockHeight + 32, 28)
    context.fill()
  }

  context.fillStyle = overlay.color
  context.shadowColor = 'rgba(0, 0, 0, 0.38)'
  context.shadowBlur = 18
  context.shadowOffsetY = 6

  lines.forEach((line, index) => {
    const y = -blockHeight / 2 + lineHeight * index + lineHeight / 2
    const x = overlay.align === 'left' ? 0 : overlay.align === 'right' ? 0 : 0
    context.fillText(line, x, y)
  })

  context.restore()
}

function drawCreativeFrame(
  context: CanvasRenderingContext2D,
  creativeEdit: SocialCreativeEdit,
  sourceWidth: number,
  sourceHeight: number,
  drawSource: (x: number, y: number, width: number, height: number) => void,
) {
  const canvasWidth = context.canvas.width
  const canvasHeight = context.canvas.height
  const canvasAspect = canvasWidth / canvasHeight
  const sourceAspect = sourceWidth / sourceHeight
  let drawWidth = canvasWidth
  let drawHeight = canvasHeight

  if (sourceAspect > canvasAspect) {
    drawHeight = canvasHeight
    drawWidth = drawHeight * sourceAspect
  } else {
    drawWidth = canvasWidth
    drawHeight = drawWidth / sourceAspect
  }

  drawWidth *= creativeEdit.crop.scale
  drawHeight *= creativeEdit.crop.scale

  const maxOffsetX = Math.max(0, (drawWidth - canvasWidth) / 2)
  const maxOffsetY = Math.max(0, (drawHeight - canvasHeight) / 2)
  const drawX = (canvasWidth - drawWidth) / 2 + creativeEdit.crop.offsetX * maxOffsetX
  const drawY = (canvasHeight - drawHeight) / 2 + creativeEdit.crop.offsetY * maxOffsetY

  context.filter = getSocialFilterCss(creativeEdit.filter)
  drawSource(drawX, drawY, drawWidth, drawHeight)
  context.filter = 'none'

  creativeEdit.textOverlays
    .filter((overlay) => overlay.text.trim().length > 0)
    .forEach((overlay) => drawTextOverlay(context, overlay, canvasWidth, canvasHeight))
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/jpeg' | 'image/png',
  quality = 0.92,
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Creative export failed'))
        return
      }
      resolve(blob)
    }, type, quality)
  })
}

export async function renderSocialCreativeImageToBlob(args: {
  creativeEdit: SocialCreativeEdit
  imageSrc: string
  quality?: number
  type?: 'image/jpeg' | 'image/png'
}): Promise<Blob> {
  const outputSize = getSocialOutputSize(args.creativeEdit.mode, args.creativeEdit.crop.aspectPreset)
  const image = await loadImage(args.imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize.width
  canvas.height = outputSize.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas rendering is unavailable')
  }

  context.fillStyle = '#05070d'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawCreativeFrame(
    context,
    args.creativeEdit,
    image.naturalWidth,
    image.naturalHeight,
    (x, y, width, height) => {
      context.drawImage(image, x, y, width, height)
    },
  )
  return canvasToBlob(canvas, args.type ?? 'image/jpeg', args.quality ?? 0.92)
}

export async function renderSocialCreativeOverlayToBlob(args: {
  creativeEdit: SocialCreativeEdit
}): Promise<Blob | null> {
  const hasText = args.creativeEdit.textOverlays.some((overlay) => overlay.text.trim().length > 0)
  if (!hasText) return null

  const outputSize = getSocialOutputSize(args.creativeEdit.mode, args.creativeEdit.crop.aspectPreset)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize.width
  canvas.height = outputSize.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas rendering is unavailable')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  args.creativeEdit.textOverlays
    .filter((overlay) => overlay.text.trim().length > 0)
    .forEach((overlay) => drawTextOverlay(context, overlay, canvas.width, canvas.height))

  return canvasToBlob(canvas, 'image/png', 1)
}

export async function renderSocialCreativeVideoPosterToBlob(args: {
  creativeEdit: SocialCreativeEdit
  currentTimeMs?: number
  videoSrc: string
  quality?: number
  type?: 'image/jpeg' | 'image/png'
}): Promise<Blob> {
  const outputSize = getSocialOutputSize(args.creativeEdit.mode, args.creativeEdit.crop.aspectPreset)
  const video = await loadVideo(args.videoSrc)
  const seekTarget = Math.max(0, (args.currentTimeMs ?? 0) / 1000)

  if (Number.isFinite(video.duration) && video.duration > 0) {
    await new Promise<void>((resolve, reject) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked)
        resolve()
      }
      const handleError = () => {
        video.removeEventListener('error', handleError)
        reject(new Error('Unable to seek video poster frame'))
      }
      video.addEventListener('seeked', handleSeeked, { once: true })
      video.addEventListener('error', handleError, { once: true })
      video.currentTime = Math.min(seekTarget, Math.max(video.duration - 0.05, 0))
    })
  }

  const canvas = document.createElement('canvas')
  canvas.width = outputSize.width
  canvas.height = outputSize.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas rendering is unavailable')
  }

  context.fillStyle = '#05070d'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawCreativeFrame(
    context,
    args.creativeEdit,
    Math.max(video.videoWidth, 1),
    Math.max(video.videoHeight, 1),
    (x, y, width, height) => {
      context.drawImage(video, x, y, width, height)
    },
  )
  return canvasToBlob(canvas, args.type ?? 'image/jpeg', args.quality ?? 0.92)
}
