'use client'

import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { haptics } from '@/lib/haptics'
import { toExternalVideoUrl, toHostedVideoEmbedUrl } from '@/lib/video-links'
import { Play, Video } from './icons'
import { Skeleton } from './skeleton'
import { Button } from './button'

interface VideoPlayerProps {
  url: string
  title?: string
  className?: string
  showToggle?: boolean
  initiallyOpen?: boolean
}

function shouldUseHostedProxyOnNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

async function openExternalVideo(url: string): Promise<void> {
  if (typeof window === 'undefined') return

  const target = toExternalVideoUrl(url)

  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: target })
    return
  }

  const popup = window.open(target, '_blank', 'noopener,noreferrer')
  if (!popup) {
    window.location.assign(target)
  }
}

export function VideoPlayer({ 
  url, 
  title = 'Video Demo',
  className = '',
  showToggle = true,
  initiallyOpen = false
}: VideoPlayerProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isOpeningExternal, setIsOpeningExternal] = useState(false)
  const usesHostedProxyOnNative = shouldUseHostedProxyOnNative()
  const hostedVideoUrl = usesHostedProxyOnNative ? toHostedVideoEmbedUrl(url) : null
  const playerUrl = hostedVideoUrl ?? url

  const handleToggle = () => {
    haptics.light()
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsLoading(true)
      setHasError(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleOpenExternal = async () => {
    haptics.light()
    setIsOpeningExternal(true)

    try {
      await openExternalVideo(url)
    } catch {
      window.location.assign(toExternalVideoUrl(url))
    } finally {
      setIsOpeningExternal(false)
    }
  }

  const externalVideoButton = (
    <Button
      onClick={() => { void handleOpenExternal() }}
      variant="ghost"
      size="sm"
      loading={isOpeningExternal}
      withHaptic={false}
      className="w-full bg-card border border-border rounded-lg p-4 flex items-center justify-start hover:bg-card/80 transition-colors min-h-[56px] normal-case tracking-normal h-auto"
    >
      <div className="flex items-center gap-3 text-left">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Play size={20} className="text-primary ml-0.5" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-semibold text-foreground">Open Video</span>
          <span className="text-xs text-muted-foreground">
            {usesHostedProxyOnNative
              ? hostedVideoUrl
                ? 'Fallback if in-app playback is unavailable'
                : 'Opens in the in-app browser'
              : 'Opens in your browser or YouTube app'}
          </span>
        </div>
      </div>
    </Button>
  )

  if (showToggle) {
    if (usesHostedProxyOnNative && !hostedVideoUrl) {
      return <div className={className}>{externalVideoButton}</div>
    }

    return (
      <div className={className}>
        <Button
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          withHaptic={false}
          className="w-full bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:bg-card/80 transition-colors min-h-[56px] normal-case tracking-normal h-auto"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              {isOpen ? <Video size={20} className="text-primary" /> : <Play size={20} className="text-primary" />}
            </div>
            <span className="font-semibold">{isOpen ? 'Hide Video' : 'Watch Demo'}</span>
          </div>
          <span className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </Button>
        
        {isOpen && (
          <div className="mt-3 rounded-lg overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 z-10">
                <Skeleton className="w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-card/90 flex items-center justify-center animate-pulse">
                    <Play size={24} className="text-primary ml-1" />
                  </div>
                </div>
              </div>
            )}
            {hasError ? (
              <div className="w-full aspect-video bg-card flex flex-col items-center justify-center gap-3">
                <Video size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {hostedVideoUrl ? 'In-app video unavailable right now' : 'Video unavailable'}
                </p>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={() => { setHasError(false); setIsLoading(true) }}
                    variant="link"
                    size="sm"
                    className="text-sm text-primary font-medium p-0 h-auto min-h-0 normal-case tracking-normal"
                  >
                    Try again
                  </Button>
                  {hostedVideoUrl ? externalVideoButton : null}
                </div>
              </div>
            ) : (
              <iframe
                src={playerUrl}
                className="w-full aspect-video"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={title}
                onLoad={handleLoad}
                onError={handleError}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  if (usesHostedProxyOnNative && !hostedVideoUrl) {
    return <div className={className}>{externalVideoButton}</div>
  }

  return (
    <div className={`rounded-lg overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      <iframe
        src={playerUrl}
        className="w-full aspect-video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
      {hasError && hostedVideoUrl ? <div className="p-3 bg-card">{externalVideoButton}</div> : null}
    </div>
  )
}
