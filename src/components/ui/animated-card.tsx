'use client'

import { forwardRef, useState, useRef } from 'react'
import { haptics } from '@/lib/haptics'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'elevated' | 'featured' | 'glass'
  hapticFeedback?: 'light' | 'medium' | 'none'
  staggerIndex?: number
  children: React.ReactNode
}

export const AnimatedCard = forwardRef<HTMLButtonElement, AnimatedCardProps>(
  ({ 
    variant = 'default', 
    hapticFeedback = 'light',
    staggerIndex,
    className = '',
    children,
    onClick,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false)
    const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null)
    const cardRef = useRef<HTMLButtonElement>(null)

    const baseStyles = 'relative overflow-hidden rounded-xl transition-all duration-150 text-left'
    
    const variantStyles = {
      default: 'bg-card border border-border hover:bg-card/80',
      elevated: 'card-elevated hover:translate-y-[-2px]',
      featured: 'card-elevated border border-primary/20 glow-primary-subtle',
      glass: 'card-glass border border-white/10'
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback
      if (hapticFeedback !== 'none') {
        haptics[hapticFeedback]()
      }

      // Ripple effect
      const rect = (cardRef.current || e.currentTarget).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setRipple({ x, y })
      setTimeout(() => setRipple(null), 500)

      onClick?.(e)
    }

    const staggerStyle = staggerIndex !== undefined 
      ? { animationDelay: `${staggerIndex * 50}ms` }
      : undefined

    return (
      <button
        ref={ref || cardRef}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${isPressed ? 'scale-[0.98]' : 'scale-100'}
          ${staggerIndex !== undefined ? 'stagger-item' : ''}
          ${className}
        `}
        style={staggerStyle}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onClick={handleClick}
        {...props}
      >
        {children}
        
        {/* Ripple effect */}
        {ripple && (
          <span
            className="absolute rounded-full bg-white/10 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              animation: 'ripple 500ms ease-out forwards'
            }}
          />
        )}
      </button>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'

// Animated list wrapper for staggered animations
interface AnimatedListProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  )
}

// Progress indicator with animation
interface AnimatedProgressProps {
  value: number
  max: number
  className?: string
  color?: 'primary' | 'gold' | 'success'
}

export function AnimatedProgress({ 
  value, 
  max, 
  className = '',
  color = 'primary'
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colorStyles = {
    primary: 'bg-primary',
    gold: 'bg-[#d4af37]',
    success: 'bg-[#22c55e]'
  }

  return (
    <div className={`w-full bg-muted rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${colorStyles[color]}`}
        style={{ 
          width: `${percentage}%`,
          boxShadow: percentage > 0 ? `0 0 10px ${color === 'gold' ? 'rgba(212, 175, 55, 0.5)' : color === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(139, 0, 0, 0.5)'}` : 'none'
        }}
      />
    </div>
  )
}

