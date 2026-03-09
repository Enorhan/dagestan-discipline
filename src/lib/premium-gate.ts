import { UserProfile } from './social-types'
import { getBillingCheckoutAvailability } from './runtime-flags'

// Feature flags for premium content
export type PremiumFeature =
  | 'advanced-programs'      // Advanced/elite athlete programs
  | 'analytics'              // Training analytics and insights
  | 'custom-workouts'        // Create and share custom workouts
  | 'learning-paths'         // Structured learning paths
  | 'elite-athlete-content'  // Exclusive athlete content
  | 'advanced-stats'         // Detailed performance statistics
  | 'export-data'            // Export training data
  | 'unlimited-history'      // Unlimited workout history

interface FeatureGate {
  feature: PremiumFeature
  name: string
  description: string
  highlights: string[]
  freeLimit?: number
  requiresPremium: boolean
}

export const PREMIUM_POSITIONING_COPY = 'Premium turns the app into a smarter coaching layer around your training.'

export const PREMIUM_CORE_HIGHLIGHTS = [
  'Adaptive session planning that fits readiness, missed days, and recovery constraints.',
  'Full progress analytics with year-over-year trends, momentum stories, and load patterns.',
  'Unlimited learning paths and custom workouts for sport-specific development.',
]

export const PREMIUM_FEATURES: Record<PremiumFeature, FeatureGate> = {
  'advanced-programs': {
    feature: 'advanced-programs',
    name: 'Advanced Programs',
    description: 'Unlock deeper programming depth for athletes who want more than a generic weekly plan.',
    highlights: [
      'More advanced programming options for competitive athletes.',
      'Stronger week-to-week structure around your sport and goals.',
      'A coaching layer that helps your training feel more intentional.',
    ],
    requiresPremium: true,
  },
  'analytics': {
    feature: 'analytics',
    name: 'Performance Analytics',
    description: 'See how your training momentum, workload, and recovery signals are changing over time.',
    highlights: [
      'Year view with period-to-period trend comparisons.',
      'Activity mix, load, and recovery pattern visibility.',
      'Narrative recaps that explain what your numbers mean.',
    ],
    requiresPremium: true,
  },
  'custom-workouts': {
    feature: 'custom-workouts',
    name: 'Custom Workout Builder',
    description: 'Build extra sessions for strength, conditioning, technique, or recovery whenever your week changes.',
    highlights: [
      'Unlimited custom sessions and saved workout templates.',
      'Build focused extras for weak points, short days, or recovery blocks.',
      'Keep your own workout library instead of rebuilding from scratch.',
    ],
    freeLimit: 3,
    requiresPremium: true,
  },
  'learning-paths': {
    feature: 'learning-paths',
    name: 'Learning Paths',
    description: 'Follow structured skill progressions so you always know what to study and what comes next.',
    highlights: [
      'Unlock every learning path for your sport.',
      'Progress through structured technique sequences instead of guessing.',
      'Keep building skill depth after the free starter path is finished.',
    ],
    freeLimit: 1,
    requiresPremium: true,
  },
  'elite-athlete-content': {
    feature: 'elite-athlete-content',
    name: 'Elite Athlete Content',
    description: 'Get deeper examples, insights, and training context from elite combat-sport athletes.',
    highlights: [
      'More athlete-specific coaching context and examples.',
      'A deeper content library built around real combat-sport development.',
      'Stronger guidance when you want technique and training inspiration.',
    ],
    requiresPremium: true,
  },
  'advanced-stats': {
    feature: 'advanced-stats',
    name: 'Advanced Statistics',
    description: 'Go beyond raw totals with deeper patterns across volume, frequency, and performance.',
    highlights: [
      'Richer performance breakdowns beyond simple totals.',
      'Better visibility into consistency, load, and trend direction.',
      'More context to decide when to push, maintain, or reset.',
    ],
    requiresPremium: true,
  },
  'export-data': {
    feature: 'export-data',
    name: 'Data Export',
    description: 'Take your full training history with you for outside review or deeper analysis.',
    highlights: [
      'Export your training data for external analysis.',
      'Keep a portable record of your work and progress.',
      'Useful when you want coach review or backup access.',
    ],
    requiresPremium: true,
  },
  'unlimited-history': {
    feature: 'unlimited-history',
    name: 'Unlimited History',
    description: 'Keep your full training history available so long-term progress stays visible.',
    highlights: [
      'See your full training story instead of only recent history.',
      'Track long-term trends without losing older sessions.',
      'Make better decisions with a bigger performance baseline.',
    ],
    freeLimit: 30, // 30 days free
    requiresPremium: true,
  },
}

// Check if user has access to a feature
export function canAccessFeature(
  user: UserProfile | null,
  feature: PremiumFeature,
  usageCount?: number
): { canAccess: boolean; reason?: string; upgradePrompt?: string } {
  // If user is premium, they can access everything
  if (user?.isPremium) {
    return { canAccess: true }
  }

  const featureConfig = PREMIUM_FEATURES[feature]

  // If there's a free limit, check if user is within it
  if (featureConfig.freeLimit !== undefined && usageCount !== undefined) {
    if (usageCount < featureConfig.freeLimit) {
      const remaining = featureConfig.freeLimit - usageCount
      return {
        canAccess: true,
        reason: `Free tier: ${remaining} remaining`,
      }
    }
  }

  // Feature requires premium
  const checkoutAvailability = getBillingCheckoutAvailability()

  return {
    canAccess: false,
    reason: checkoutAvailability.enabled ? 'Premium feature' : 'Premium temporarily unavailable',
    upgradePrompt: checkoutAvailability.enabled
      ? `Upgrade to Premium to unlock ${featureConfig.name}`
      : (checkoutAvailability.message ?? `Upgrade to Premium to unlock ${featureConfig.name}`),
  }
}
