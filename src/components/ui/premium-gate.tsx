'use client'

import { useState } from 'react'
import {
  PremiumFeature,
  PREMIUM_CORE_HIGHLIGHTS,
  PREMIUM_FEATURES,
  PREMIUM_POSITIONING_COPY,
  canAccessFeature,
} from '@/lib/premium-gate'
import { UserProfile } from '@/lib/social-types'
import { haptics } from '@/lib/haptics'
import { PREMIUM_SUBSCRIPTION_PRICE_LABEL } from '@/lib/subscription-config'
import { getBillingCheckoutAvailability } from '@/lib/runtime-flags'
import { useRuntimeFlags } from '@/contexts/runtime-flags-context'
import { Button } from './button'
import { X, Lock, Sparkles } from './icons'

interface PremiumGateProps {
  user: UserProfile | null
  feature: PremiumFeature
  usageCount?: number
  children: React.ReactNode
  onUpgrade?: () => void
  fallback?: React.ReactNode
}

export function PremiumGate({ user, feature, usageCount, children, onUpgrade, fallback }: PremiumGateProps) {
  const [showUpsell, setShowUpsell] = useState(false)
  const featureConfig = PREMIUM_FEATURES[feature]

  const access = canAccessFeature(user, feature, usageCount)

  // If user has access, render children
  if (access.canAccess) return <>{children}</>

  // If there's a custom fallback, render it
  if (fallback) {
    return <>{fallback}</>
  }

  // Otherwise show locked state with upsell trigger
  return (
    <>
      <div
        onClick={() => {
          haptics.light()
          setShowUpsell(true)
        }}
        className="relative cursor-pointer group"
      >
        {/* Locked overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10 opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Lock size={20} className="text-amber-400" />
            </div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Premium</span>
          </div>
        </div>

        {/* Blurred content */}
        <div className="blur-[2px] pointer-events-none select-none">
          {children}
        </div>
      </div>

      {/* Upsell Modal */}
      {showUpsell && (
        <PremiumUpsellModal
          feature={feature}
          onClose={() => setShowUpsell(false)}
          onUpgrade={onUpgrade}
        />
      )}
    </>
  )
}

// Upsell Modal Component
interface PremiumUpsellModalProps {
  feature: PremiumFeature
  onClose: () => void
  onUpgrade?: () => void
}

function PremiumUpsellModal({ feature, onClose, onUpgrade }: PremiumUpsellModalProps) {
  const { flags } = useRuntimeFlags()
  const featureConfig = PREMIUM_FEATURES[feature]
  const checkoutAvailability = getBillingCheckoutAvailability(flags)
  const benefitItems = [...featureConfig.highlights, ...PREMIUM_CORE_HIGHLIGHTS]
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, 4)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -inset-px bg-gradient-to-r from-amber-500/20 via-primary/20 to-amber-500/20 rounded-3xl" />

        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/60" />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center border border-amber-500/30 mb-4">
            <Sparkles size={28} className="text-amber-400" />
          </div>

          {/* Content */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400 mb-2">
            Premium coaching
          </p>
          <h2 className="text-xl font-black text-foreground mb-2">
            Unlock {featureConfig.name}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {featureConfig.description}
          </p>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 mb-6">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {PREMIUM_POSITIONING_COPY}
            </p>
          </div>

          {/* Premium benefits */}
          <div className="space-y-3 mb-6">
            {benefitItems.map((item) => (
              <PremiumBenefit key={item} text={item} />
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-amber-500/10 rounded-xl p-4 mb-6 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Premium Monthly</p>
                <p className="text-xs text-muted-foreground">Smarter coaching. Cancel anytime.</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-amber-400">{PREMIUM_SUBSCRIPTION_PRICE_LABEL}</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            disabled={!checkoutAvailability.enabled}
            onClick={() => {
              haptics.medium()
              onUpgrade?.()
            }}
            variant="primary"
            size="lg"
            fullWidth
            className="h-14 rounded-xl font-black text-base uppercase tracking-wide"
          >
            {checkoutAvailability.enabled ? 'Unlock smarter coaching' : 'Premium temporarily unavailable'}
          </Button>

          {!checkoutAvailability.enabled && checkoutAvailability.message && (
            <p className="mt-3 text-xs leading-relaxed text-amber-300">
              {checkoutAvailability.message}
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue with limited access
          </button>
        </div>
      </div>
    </div>
  )
}

function PremiumBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-sm text-foreground/90">{text}</span>
    </div>
  )
}

// Compact premium badge for inline use
export function PremiumBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 ${sizeClasses[size]}`}>
      <Sparkles size={size === 'sm' ? 10 : 12} />
      Pro
    </span>
  )
}

// Free tier limit indicator
interface FreeLimitIndicatorProps {
  feature: PremiumFeature
  compact?: boolean
  used?: number
}

export function FreeLimitIndicator({ feature, compact = false, used = 0 }: FreeLimitIndicatorProps) {
  const featureConfig = PREMIUM_FEATURES[feature]
  const safeUsed = Math.max(0, used)
  const limit = featureConfig.freeLimit || 0
  const remaining = Math.max(0, limit - safeUsed)
  const percentage = limit > 0 ? (safeUsed / limit) * 100 : 0

  if (compact) {
    return (
      <span className="text-[10px] text-muted-foreground">
        {remaining} free remaining
      </span>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Free tier usage</span>
        <span className={remaining === 0 ? 'text-red-400' : 'text-foreground'}>
          {safeUsed}/{limit}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 100 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
