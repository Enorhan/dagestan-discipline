'use client'

import { useEffect, useState } from 'react'
import { Achievement, AchievementTier, getTierColor } from '@/lib/achievements'
import { haptics } from '@/lib/haptics'
import { X, Trophy, Flame, Star, Award, Medal, Crown, Zap, Activity, TrendingUp, Sun, Code } from './icons'

interface AchievementCelebrationProps {
  achievements: Achievement[]
  onComplete: () => void
}

export function AchievementCelebration({ achievements, onComplete }: AchievementCelebrationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  const currentAchievement = achievements[currentIndex]

  useEffect(() => {
    if (currentAchievement) {
      haptics.success()
    }
  }, [currentIndex, currentAchievement])

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  if (!currentAchievement || achievements.length === 0) return null

  const tierColor = getTierColor(currentAchievement.tier)
  const isLast = currentIndex === achievements.length - 1

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={handleNext} />

      {/* Achievement Card */}
      <div
        className={`relative w-full max-w-sm transform transition-all duration-300 ${
          isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'
        }`}
      >
        {/* Animated glow based on tier */}
        <div
          className="absolute -inset-2 rounded-3xl blur-xl opacity-50 animate-pulse"
          style={{ background: `linear-gradient(135deg, ${tierColor}40, transparent)` }}
        />

        <div
          className="relative rounded-3xl p-8 border-2 overflow-hidden"
          style={{ borderColor: `${tierColor}40`, background: 'linear-gradient(135deg, #1a1a1a, #0d0d0d)' }}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${tierColor}, transparent 70%)`,
            }}
          />

          {/* Counter for multiple achievements */}
          {achievements.length > 1 && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-white/70">
              {currentIndex + 1} / {achievements.length}
            </div>
          )}

          {/* Icon */}
          <div className="relative mb-6">
            <div
              className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center border-2"
              style={{ borderColor: `${tierColor}60`, background: `${tierColor}15` }}
            >
              <AchievementIcon icon={currentAchievement.icon} color={tierColor} size={48} />
            </div>
            {/* Sparkles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full animate-ping opacity-20"
                style={{ background: tierColor }}
              />
            </div>
          </div>

          {/* Tier badge */}
          <div className="text-center mb-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: tierColor, background: `${tierColor}20` }}
            >
              {currentAchievement.tier}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">
            {currentAchievement.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-white/60 text-center mb-6">
            {currentAchievement.description}
          </p>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: '100%', background: tierColor }}
              />
            </div>
            <p className="text-[10px] text-center text-white/40 mt-2 uppercase tracking-wider">
              Achievement Unlocked
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleNext}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wide transition-transform active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`,
              border: `1px solid ${tierColor}50`,
              color: tierColor,
            }}
          >
            {isLast ? 'Claim Rewards' : 'Next Achievement'}
          </button>

          <p className="text-[10px] text-center text-white/30 mt-4 uppercase tracking-wider">
            Tap anywhere to {isLast ? 'continue' : 'skip'}
          </p>
        </div>
      </div>
    </div>
  )
}

function AchievementIcon({ icon, color, size }: { icon: string; color: string; size: number }) {
  const props = { size, style: { color } }

  switch (icon) {
    case 'Dumbbell':
      return <Trophy {...props} />
    case 'Trophy':
      return <Trophy {...props} />
    case 'Crown':
      return <Crown {...props} />
    case 'Flame':
      return <Flame {...props} />
    case 'Activity':
      return <Activity {...props} />
    case 'Award':
      return <Award {...props} />
    case 'Medal':
      return <Medal {...props} />
    case 'TrendingUp':
      return <TrendingUp {...props} />
    case 'Star':
      return <Star {...props} />
    case 'Zap':
      return <Zap {...props} />
    case 'Sun':
      return <Sun {...props} />
    case 'Code':
      return <Code {...props} />
    default:
      return <Award {...props} />
  }
}

// Inline achievement badge for lists
interface AchievementBadgeProps {
  tier: AchievementTier
  size?: 'sm' | 'md' | 'lg'
}

export function AchievementBadge({ tier, size = 'sm' }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const tierColor = getTierColor(tier)

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
      style={{ background: `${tierColor}30`, border: `1px solid ${tierColor}60` }}
    >
      <Trophy size={size === 'sm' ? 10 : size === 'md' ? 12 : 16} style={{ color: tierColor }} />
    </div>
  )
}

// Achievement progress card for profile
interface AchievementProgressCardProps {
  type: string
  title: string
  description: string
  progress: number
  target: number
  tier: AchievementTier
  isUnlocked: boolean
}

export function AchievementProgressCard({
  title,
  description,
  progress,
  target,
  tier,
  isUnlocked,
}: AchievementProgressCardProps) {
  const tierColor = getTierColor(tier)
  const percentage = Math.min(100, (progress / target) * 100)

  return (
    <div
      className="p-4 rounded-2xl border bg-card/50"
      style={{ borderColor: isUnlocked ? `${tierColor}40` : 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <AchievementBadge tier={tier} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        </div>
        {isUnlocked && (
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tierColor }}>
            Unlocked
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%`, background: isUnlocked ? tierColor : '#666' }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{progress.toLocaleString()}</span>
          <span>{target.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
