'use client'

import { AuthLogin } from '@/components/screens/auth-login'
import { AuthSignup } from '@/components/screens/auth-signup'
import { EmailVerificationPending } from '@/components/screens/email-verification-pending'
import { Screen } from '@/lib/types'
import { UserProfile } from '@/lib/social-types'

interface AuthRoutesProps {
  currentScreen: Screen
  pendingVerificationEmail: string | null
  navigateTo: (screen: Screen) => void
  onLogin: (user: UserProfile) => void
  onSkipLogin: () => void
  onSignup: (user: UserProfile) => void
  onEmailVerificationRequired: (email: string) => void
  onVerifiedEmail: () => Promise<void> | void
  onBackFromEmailVerification: () => void
  onPendingFallbackLogin: (user: UserProfile) => void
  onPendingFallbackSkip: () => void
}

export function AuthRoutes({
  currentScreen,
  pendingVerificationEmail,
  navigateTo,
  onLogin,
  onSkipLogin,
  onSignup,
  onEmailVerificationRequired,
  onVerifiedEmail,
  onBackFromEmailVerification,
  onPendingFallbackLogin,
  onPendingFallbackSkip,
}: AuthRoutesProps) {
  switch (currentScreen) {
    case 'auth-login':
      return <AuthLogin onLogin={onLogin} onNavigate={navigateTo} onSkip={onSkipLogin} />

    case 'auth-signup':
      return (
        <AuthSignup
          onSignup={onSignup}
          onNavigate={navigateTo}
          onEmailVerificationRequired={onEmailVerificationRequired}
        />
      )

    case 'email-verification-pending':
      return pendingVerificationEmail ? (
        <EmailVerificationPending
          email={pendingVerificationEmail}
          onVerified={onVerifiedEmail}
          onBack={onBackFromEmailVerification}
        />
      ) : (
        <AuthLogin
          onLogin={onPendingFallbackLogin}
          onNavigate={navigateTo}
          onSkip={onPendingFallbackSkip}
        />
      )

    default:
      return null
  }
}