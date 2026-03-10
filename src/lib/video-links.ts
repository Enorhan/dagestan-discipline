const YOUTUBE_HOSTS = new Set([
  'youtu.be',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const DEFAULT_HOSTED_VIDEO_PROXY_PAGE = 'youtube-embed.html'

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getConfiguredHostedVideoProxyPageUrl(): string | null {
  const appUrl = trimEnv(process.env.NEXT_PUBLIC_APP_URL)
  if (appUrl) {
    try {
      const proxyPageUrl = new URL(
        DEFAULT_HOSTED_VIDEO_PROXY_PAGE,
        appUrl.endsWith('/') ? appUrl : `${appUrl}/`
      )

      if (proxyPageUrl.protocol === 'https:') {
        return proxyPageUrl.toString()
      }
    } catch {
      return null
    }
  }

  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    return new URL(DEFAULT_HOSTED_VIDEO_PROXY_PAGE, window.location.href).toString()
  }

  return null
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()

    if (!YOUTUBE_HOSTS.has(host)) {
      return null
    }

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1) || null
    }

    const pathSegments = parsed.pathname.split('/').filter(Boolean)

    if (pathSegments[0] === 'embed' || pathSegments[0] === 'shorts') {
      return pathSegments[1] ?? null
    }

    if (pathSegments[0] === 'watch') {
      return parsed.searchParams.get('v')
    }

    return parsed.searchParams.get('v')
  } catch {
    return null
  }
}

export function toExternalVideoUrl(url: string): string {
  const youtubeVideoId = extractYouTubeVideoId(url)

  if (!youtubeVideoId) {
    return url
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`
}

export function toHostedVideoEmbedUrl(url: string): string | null {
  const youtubeVideoId = extractYouTubeVideoId(url)
  const proxyPageUrl = getConfiguredHostedVideoProxyPageUrl()

  if (!youtubeVideoId || !proxyPageUrl) {
    return null
  }

  const hostedUrl = new URL(proxyPageUrl)
  hostedUrl.searchParams.set('videoId', youtubeVideoId)
  return hostedUrl.toString()
}