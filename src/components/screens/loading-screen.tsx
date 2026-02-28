'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type LoadingScreenVariant = 'default' | 'signup'

interface LoadingHighlight {
  title: string
  description: string
  quote?: {
    text: string
    author: string
  }
}

interface LoadingScreenProps {
  onLoadComplete: () => void
  loadingDuration?: number // ms
  variant?: LoadingScreenVariant
}

const SIGNUP_HIGHLIGHTS: LoadingHighlight[] = [
  {
    title: 'Built from elite combat standards',
    description: 'Your sessions are structured around proven combat-sport patterns: power, conditioning, recovery, and skill carryover.',
    quote: {
      text: "If you give up, you're finished.",
      author: 'Khabib Nurmagomedov',
    },
  },
  {
    title: 'Personalized from day one',
    description: 'Your sport, schedule, equipment, and experience level shape the weekly plan so it fits real life and stays sustainable.',
  },
  {
    title: 'Consistency is designed in',
    description: 'Progress tracking, streaks, and session history reinforce discipline so results come from repetition, not motivation swings.',
    quote: {
      text: "Once you've wrestled, everything else in life is easy.",
      author: 'Dan Gable',
    },
  },
]

export function LoadingScreen({
  onLoadComplete,
  loadingDuration = 2500,
  variant = 'default',
}: LoadingScreenProps) {
  const isSignupVariant = variant === 'signup'
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)

  const loadingMessages = useMemo(() => {
    if (isSignupVariant) {
      return [
        'Building your training foundation...',
        'Personalizing your weekly plan...',
        'Loading elite-athlete training insights...',
        'Final checks before you start...',
      ]
    }
    return [
      'Preparing your training...',
      'Loading workout programs...',
      'Syncing your progress...',
      'Almost ready...',
    ]
  }, [isSignupVariant])

  useEffect(() => {
    setLoadingText(loadingMessages[0] ?? 'Preparing your training...')
  }, [loadingMessages])

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
  }, [loadingDuration, onLoadComplete, loadingMessages])

  useEffect(() => {
    if (!isSignupVariant) {
      setHighlightIndex(0)
      return
    }

    const interval = setInterval(() => {
      setHighlightIndex((prev) => (prev + 1) % SIGNUP_HIGHLIGHTS.length)
    }, 1800)

    return () => clearInterval(interval)
  }, [isSignupVariant])

  const activeHighlight = SIGNUP_HIGHLIGHTS[highlightIndex]

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

        {isSignupVariant && activeHighlight ? (
          <div className="w-full max-w-md mx-auto mb-7">
            <p className="text-center text-[11px] uppercase tracking-[0.22em] text-amber-200/80 mb-3">
              Why this program works
            </p>
            <div className="rounded-2xl border border-white/20 bg-black/55 backdrop-blur-sm p-4 min-h-[172px]">
              <h2 className="text-white text-base font-bold tracking-tight">
                {activeHighlight.title}
              </h2>
              <p className="text-white/80 text-sm mt-2 leading-relaxed">
                {activeHighlight.description}
              </p>
              {activeHighlight.quote ? (
                <blockquote className="mt-3 border-l-2 border-amber-300/60 pl-3 text-[13px] text-amber-100/90 italic leading-relaxed">
                  "{activeHighlight.quote.text}"
                  <span className="not-italic block text-[11px] tracking-wide text-amber-100/70 mt-1">
                    {activeHighlight.quote.author}
                  </span>
                </blockquote>
              ) : null}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              {SIGNUP_HIGHLIGHTS.map((_, index) => (
                <span
                  key={`highlight-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === highlightIndex ? 'w-5 bg-amber-200' : 'w-1.5 bg-white/35'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

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
