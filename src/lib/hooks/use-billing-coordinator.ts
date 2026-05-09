'use client'

import { useCallback } from 'react'
import {
  type AppleIapResult,
  purchaseMatFlowMonthly,
  restoreMatFlowPurchases,
  shouldUseAppleInAppPurchase,
} from '@/lib/apple-iap-service'
import { BILLING_SUPPORT_MAILTO, openSupportLink } from '@/lib/app-support'
import { bjjService } from '@/lib/bjj-service'
import { getMatFlowAccessState } from '@/lib/matflow-access'
import stripeService from '@/lib/stripe-service'
import { supabaseService } from '@/lib/supabase-service'
import { toastCopy } from '@/lib/toast-messages'
import type { BjjPersistedState } from '@/lib/bjj-types'
import type { UserProfile } from '@/lib/user-profile-types'

export interface BillingCoordinatorDeps {
  userId: string | undefined
  isAuthenticated: boolean
  appState: BjjPersistedState | null
  updateAppState: (updater: (previous: BjjPersistedState) => BjjPersistedState) => void
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>
  refreshShellSnapshot: () => void
  signOut: () => Promise<void>
  setIsDeletingAccount: (value: boolean) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

export interface BillingCoordinator {
  applyAppleEntitlement: (result: AppleIapResult) => Promise<boolean>
  handleSubscribe: (plan?: 'monthly') => Promise<void>
  handleRestorePurchase: () => Promise<void>
  handleManageSubscription: () => Promise<void>
  completePaywall: () => Promise<void>
  handleDeleteAccount: () => Promise<void>
}

export function useBillingCoordinator(deps: BillingCoordinatorDeps): BillingCoordinator {
  const {
    userId,
    isAuthenticated,
    appState,
    updateAppState,
    updateProfile,
    refreshShellSnapshot,
    signOut,
    setIsDeletingAccount,
    showSuccess,
    showError,
    showInfo,
  } = deps

  const applyAppleEntitlement = useCallback<BillingCoordinator['applyAppleEntitlement']>(async (result) => {
    if (!userId) return false

    const entitlements = result.entitlements?.length ? result.entitlements : [result]
    let updatedProfile: Awaited<ReturnType<typeof supabaseService.recordAppStoreTransaction>> = null

    for (const entitlement of entitlements) {
      if (!entitlement.originalTransactionId || !entitlement.productId) continue
      updatedProfile = await supabaseService.recordAppStoreTransaction(userId, entitlement)
    }

    if (!updatedProfile) return false

    const access = getMatFlowAccessState(updatedProfile)
    const profileSnapshot = updatedProfile
    updateAppState((previous) => ({
      ...previous,
      profile: {
        ...previous.profile,
        proUnlocked: access.hasAccess,
        matflowTrialStartedAt: profileSnapshot.matflowTrialStartedAt ?? previous.profile.matflowTrialStartedAt ?? null,
        subscriptionStatus: profileSnapshot.subscriptionStatus ?? previous.profile.subscriptionStatus ?? null,
        subscriptionPeriodEnd: profileSnapshot.subscriptionPeriodEnd ?? previous.profile.subscriptionPeriodEnd ?? null,
      },
    }))
    refreshShellSnapshot()
    return access.hasAccess
  }, [userId, updateAppState, refreshShellSnapshot])

  const handleSubscribe = useCallback<BillingCoordinator['handleSubscribe']>(async (plan = 'monthly') => {
    if (!isAuthenticated) {
      showInfo(toastCopy.createAccountBeforePaywall)
      return
    }

    try {
      if (shouldUseAppleInAppPurchase()) {
        const result = await purchaseMatFlowMonthly(userId)
        if (result.status === 'purchased' || result.status === 'restored') {
          const accessUnlocked = await applyAppleEntitlement(result)
          showSuccess(accessUnlocked ? 'MatFlow access unlocked' : 'Purchase received. Restoring MatFlow access...')
          return
        }
        if (result.status === 'pending') {
          showInfo('Purchase is pending Apple approval.')
          return
        }
        if (result.status === 'cancelled') {
          showInfo('Purchase cancelled')
          return
        }
        showError('This App Store product is not available yet.')
        return
      }
      const monthlyPriceId = (process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? '').trim()
      void plan
      await stripeService.subscribeToPremium(monthlyPriceId || undefined)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to open checkout')
    }
  }, [isAuthenticated, userId, applyAppleEntitlement, showSuccess, showInfo, showError])

  const handleRestorePurchase = useCallback<BillingCoordinator['handleRestorePurchase']>(async () => {
    try {
      if (shouldUseAppleInAppPurchase()) {
        const result = await restoreMatFlowPurchases()
        if (result.status === 'restored') {
          const accessUnlocked = await applyAppleEntitlement(result)
          showSuccess(accessUnlocked ? 'MatFlow access restored' : 'Purchases restored. Refreshing access...')
          return
        }
        showInfo('No active App Store subscription found')
        return
      }
      await openSupportLink(BILLING_SUPPORT_MAILTO)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to restore purchases')
    }
  }, [applyAppleEntitlement, showSuccess, showInfo, showError])

  const handleManageSubscription = useCallback<BillingCoordinator['handleManageSubscription']>(async () => {
    try {
      const target = shouldUseAppleInAppPurchase()
        ? 'https://apps.apple.com/account/subscriptions'
        : BILLING_SUPPORT_MAILTO
      await openSupportLink(target)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to open subscription management')
    }
  }, [showError])

  const completePaywall = useCallback<BillingCoordinator['completePaywall']>(async () => {
    if (!appState) return
    try {
      const updatedProfile = await updateProfile({ paywallCompleted: true })
      if (!updatedProfile.paywallCompleted) {
        throw new Error('Paywall state did not persist')
      }
      updateAppState((previous) => ({
        ...previous,
        profile: { ...previous.profile, paywallCompleted: updatedProfile.paywallCompleted ?? true },
      }))
      refreshShellSnapshot()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to persist paywall state')
    }
  }, [appState, updateProfile, updateAppState, refreshShellSnapshot, showError])

  const handleDeleteAccount = useCallback<BillingCoordinator['handleDeleteAccount']>(async () => {
    if (!userId) {
      showError('Sign in required')
      return
    }
    if (typeof window === 'undefined') return
    if (!window.confirm('Delete your account? This permanently removes your profile, sessions, gameplans, and uploads. This cannot be undone.')) {
      return
    }
    const typed = window.prompt('Type DELETE to confirm account deletion.')
    if (typed !== 'DELETE') {
      showInfo('Account deletion cancelled')
      return
    }
    setIsDeletingAccount(true)
    try {
      await bjjService.deleteAccount()
      showSuccess('Account deleted')
      try {
        await signOut()
      } catch {
        // Session is already invalid server-side; ignore.
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not delete account')
    } finally {
      setIsDeletingAccount(false)
    }
  }, [userId, signOut, setIsDeletingAccount, showSuccess, showInfo, showError])

  return {
    applyAppleEntitlement,
    handleSubscribe,
    handleRestorePurchase,
    handleManageSubscription,
    completePaywall,
    handleDeleteAccount,
  }
}

