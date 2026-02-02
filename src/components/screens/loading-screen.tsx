'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface LoadingScreenProps {
  onLoadComplete: () => void
  loadingDuration?: number // ms
}

export function LoadingScreen({ onLoadComplete, loadingDuration = 2500 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Preparing your training...')

  const loadingMessages = [
    'Preparing your training...',
    'Loading workout programs...',
    'Syncing your progress...',
    'Almost ready...'
  ]

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / loadingDuration) * 100, 100)
      setProgress(newProgress)

      // Update loading text based on progress
      const messageIndex = Math.min(
        Math.floor((newProgress / 100) * loadingMessages.length),
        loadingMessages.length - 1
      )
      setLoadingText(loadingMessages[messageIndex])

      if (newProgress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          onLoadComplete()
        }, 200)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [loadingDuration, onLoadComplete])

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full screen loading image */}
      <Image
        src="/loading-screen.png"
        alt="Loading"
        fill
        className="object-cover object-center grayscale"
        priority
      />

      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Content overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 safe-area-bottom">
        {/* App Name */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-1 text-center">
          DAGESTANI DISCIPLE
        </h1>
        <p className="text-white/60 text-xs mb-8 text-center">
          Discipline-First Training
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-xs mx-auto">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-white/50">
            {loadingText}
          </p>
        </div>
      </div>
    </div>
  )
}

