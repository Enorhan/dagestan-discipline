'use client'

import { ReactNode, useRef, useState, useEffect } from 'react'

interface HorizontalScrollProps {
  children: ReactNode
  className?: string
  showFade?: boolean
  gap?: number
}

export function HorizontalScroll({ 
  children, 
  className = '',
  showFade = true,
  gap = 8
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftFade(scrollLeft > 10)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [children])

  return (
    <div className={`relative ${className}`}>
      {showFade && showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto pb-2 scrollbar-hide"
        style={{ gap: `${gap}px` }}
      >
        {children}
      </div>
      {showFade && showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}
    </div>
  )
}

