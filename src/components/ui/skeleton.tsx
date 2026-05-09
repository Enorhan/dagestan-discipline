'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseClass = 'skeleton-shimmer bg-card/80'
  
  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }[variant]

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div 
      className={`${baseClass} ${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function SkeletonDrillCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
        <Skeleton className="h-4 w-4 ml-2" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonDrillCard key={i} />
      ))}
    </div>
  )
}

// Workout session card skeleton
export function SkeletonWorkoutCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="circular" className="h-8 w-8" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

// Stats card skeleton for dashboard
export function SkeletonStatsCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-8 w-2/3 mb-1" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

// Grid of stats skeletons
export function SkeletonStatsGrid({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  )
}

// Profile header skeleton
export function SkeletonProfileHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center py-6 ${className}`}>
      <Skeleton variant="circular" className="h-20 w-20 mb-3" />
      <Skeleton className="h-6 w-32 mb-1" />
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex gap-6">
        <div className="text-center">
          <Skeleton className="h-6 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  )
}

// Week view day skeleton
export function SkeletonWeekDay({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div>
          <Skeleton className="h-5 w-20 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

// Full screen loading state
export function SkeletonScreen({ className = '' }: { className?: string }) {
  return (
    <div className={`flex-1 p-4 ${className}`}>
      <Skeleton className="h-8 w-1/2 mx-auto mb-6" />
      <SkeletonStatsGrid className="mb-6" />
      <Skeleton className="h-6 w-1/3 mb-3" />
      <SkeletonList count={3} />
    </div>
  )
}

