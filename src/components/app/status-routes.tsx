'use client'

import { LoadingScreen } from '@/components/screens/loading-screen'
import { NavigationNotSet } from '@/components/screens/navigation-not-set'
import { Screen } from '@/lib/types'

interface StatusRoutesProps {
  currentScreen: Screen
  loadingContext: 'default' | 'signup'
  navigationError: { message: string; details?: string } | null
  onLoadComplete: () => void
  onGoBackFromNavigationError: () => void
  onGoHomeFromNavigationError: () => void
}

export function StatusRoutes({
  currentScreen,
  loadingContext,
  navigationError,
  onLoadComplete,
  onGoBackFromNavigationError,
  onGoHomeFromNavigationError,
}: StatusRoutesProps) {
  switch (currentScreen) {
    case 'loading':
      return (
        <LoadingScreen
          onLoadComplete={onLoadComplete}
          loadingDuration={loadingContext === 'signup' ? 5200 : 2500}
          variant={loadingContext}
        />
      )

    case 'navigation-not-set':
      return (
        <NavigationNotSet
          message={navigationError?.message ?? 'The requested navigation route is not available.'}
          details={navigationError?.details}
          onGoBack={onGoBackFromNavigationError}
          backLabel="Back to home"
          onGoHome={onGoHomeFromNavigationError}
        />
      )

    default:
      return null
  }
}