'use client'

import { useEffect, useState } from 'react'

interface ConfettiProps {
  active: boolean
  duration?: number
  particleCount?: number
}

interface Particle {
  id: number
  x: number
  color: string
  delay: number
  size: number
  rotation: number
  borderRadius: string
  duration: number
}

const COLORS = [
  '#8b0000', // primary red
  '#d4af37', // gold
  '#fafafa', // white
  '#a0a0a0', // gray
  '#22c55e', // success green
]

export function Confetti({ active, duration = 3000, particleCount = 50 }: ConfettiProps) {
  if (!active) return null

  return <ActiveConfetti key={`${duration}-${particleCount}`} duration={duration} particleCount={particleCount} />
}

function ActiveConfetti({ duration = 3000, particleCount = 50 }: Omit<ConfettiProps, 'active'>) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage across screen
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5, // stagger start
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      duration: 1.5 + Math.random(),
    }))
  )
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(false)
    }, duration)

    return () => window.clearTimeout(timeout)
  }, [duration])

  if (!visible || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute top-0"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: particle.borderRadius,
            transform: `rotate(${particle.rotation}deg)`,
            animation: `confetti-fall ${particle.duration}s linear ${particle.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

// Success animation with checkmark
export function SuccessAnimation({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9998]">
      <div className="relative">
        {/* Expanding circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-32 h-32 rounded-full bg-primary/10 circle-expand"
            style={{ animationDelay: '0s' }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-24 h-24 rounded-full bg-primary/20 circle-expand"
            style={{ animationDelay: '0.1s' }}
          />
        </div>
        
        {/* Checkmark */}
        <div className="relative w-20 h-20 flex items-center justify-center circle-expand" style={{ animationDelay: '0.15s' }}>
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 40 40" 
              fill="none" 
              className="text-white"
            >
              <path
                d="M10 20L17 27L30 13"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="checkmark-draw"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// Combined celebration component
export function Celebration({ active, onComplete }: { active: boolean, onComplete?: () => void }) {
  useEffect(() => {
    if (!active) return
    const timeout = setTimeout(() => {
      onComplete?.()
    }, 2500)
    return () => clearTimeout(timeout)
  }, [active, onComplete])

  return (
    <>
      <SuccessAnimation active={active} />
      <Confetti active={active} duration={2500} particleCount={60} />
    </>
  )
}

