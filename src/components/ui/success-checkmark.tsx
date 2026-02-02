'use client'

import { useEffect, useState } from 'react'

interface SuccessCheckmarkProps {
  size?: number
  delay?: number
  color?: 'primary' | 'gold' | 'success'
}

export function SuccessCheckmark({ 
  size = 80, 
  delay = 0,
  color = 'success'
}: SuccessCheckmarkProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colors = {
    primary: { stroke: '#8b0000', glow: 'rgba(139, 0, 0, 0.4)' },
    gold: { stroke: '#d4af37', glow: 'rgba(212, 175, 55, 0.4)' },
    success: { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' }
  }

  const { stroke, glow } = colors[color]

  if (!show) return <div style={{ width: size, height: size }} />

  return (
    <div 
      className="relative animate-celebration"
      style={{ width: size, height: size }}
    >
      {/* Glow background */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          transform: 'scale(1.5)'
        }}
      />
      
      {/* Circle */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 52 52"
        className="relative z-10"
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          opacity="0.3"
        />
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray="150"
          strokeDashoffset="150"
          strokeLinecap="round"
          style={{
            animation: 'circle-draw 600ms ease-out forwards'
          }}
        />
        {/* Checkmark */}
        <path
          d="M14 27l7 7 16-16"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-checkmark"
        />
      </svg>

      <style jsx>{`
        @keyframes circle-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Confetti burst effect
export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    delay: Math.random() * 200,
    color: ['#8b0000', '#d4af37', '#22c55e', '#fafafa'][i % 4]
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
          style={{
            backgroundColor: p.color,
            transform: `rotate(${p.angle}deg) translateY(-20px)`,
            animation: `confetti-burst 800ms ease-out ${p.delay}ms forwards`,
            opacity: 0
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: rotate(var(--angle)) translateY(-20px) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle)) translateY(-80px) scale(0.5);
          }
        }
      `}</style>
    </div>
  )
}

