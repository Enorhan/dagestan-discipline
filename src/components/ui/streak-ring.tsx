'use client'

import { useEffect, useState } from 'react'

interface StreakRingProps {
  currentStreak: number
  longestStreak: number
  weekProgress?: { completed: boolean; planned: boolean }[]
}

export function StreakRing({ currentStreak, longestStreak, weekProgress = [] }: StreakRingProps) {
  const [animatedStreak, setAnimatedStreak] = useState(0)
  const [showGlow, setShowGlow] = useState(false)

  // Animate the streak number on mount
  useEffect(() => {
    if (currentStreak === 0) {
      setAnimatedStreak(0)
      return
    }

    const duration = 800
    const steps = Math.min(currentStreak, 30)
    const stepDuration = duration / steps

    let current = 0
    const interval = setInterval(() => {
      current++
      setAnimatedStreak(Math.min(current, currentStreak))
      if (current >= currentStreak) {
        clearInterval(interval)
        setShowGlow(true)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [currentStreak])

  // Calculate ring progress (7 segments for week)
  const completedDays = weekProgress.filter(d => d.planned && d.completed).length
  const plannedDays = weekProgress.filter(d => d.planned).length
  const weekProgress_pct = plannedDays > 0 ? (completedDays / plannedDays) * 100 : 0

  // Ring dimensions
  const size = 200
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (weekProgress_pct / 100) * circumference

  // Determine ring color based on streak
  const getRingColor = () => {
    if (currentStreak >= 30) return '#d4af37' // Gold for 30+ days
    if (currentStreak >= 14) return '#c41e3a' // Bright red for 14+ days
    if (currentStreak >= 7) return '#8b0000' // Primary red for 7+ days
    return '#8b0000' // Primary red default
  }

  const ringColor = getRingColor()
  const isGold = currentStreak >= 30

  return (
    <div className="relative flex flex-col items-center">
      {/* Outer glow ring */}
      <div 
        className={`absolute inset-0 rounded-full transition-opacity duration-500 ${showGlow ? 'opacity-100' : 'opacity-0'}`}
        style={{
          width: size + 40,
          height: size + 40,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${isGold ? 'rgba(212, 175, 55, 0.15)' : 'rgba(139, 0, 0, 0.2)'} 0%, transparent 70%)`,
        }}
      />

      {/* SVG Ring */}
      <svg width={size} height={size} className="progress-ring">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          className="progress-ring-circle"
          style={{
            filter: showGlow ? `drop-shadow(0 0 10px ${ringColor})` : 'none',
          }}
        />

        {/* Week day indicators */}
        {weekProgress.map((day, i) => {
          const angle = (i / 7) * 360 - 90
          const rad = (angle * Math.PI) / 180
          const dotRadius = radius + 16
          const x = size / 2 + dotRadius * Math.cos(rad)
          const y = size / 2 + dotRadius * Math.sin(rad)
          
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill={day.completed ? ringColor : day.planned ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}
              className={day.completed ? 'animate-streak-pulse' : ''}
              style={{ animationDelay: `${i * 100}ms` }}
            />
          )
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className={`font-black tabular-nums leading-none transition-all duration-300 ${
            isGold ? 'text-gradient-gold' : ''
          }`}
          style={{ 
            fontSize: currentStreak >= 100 ? '3.5rem' : '4.5rem',
          }}
        >
          {animatedStreak}
        </span>
        <span className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase mt-2">
          Day Streak
        </span>
        {longestStreak > currentStreak && (
          <span className="text-xs text-muted-foreground/50 mt-1">
            Best: {longestStreak}
          </span>
        )}
      </div>
    </div>
  )
}
