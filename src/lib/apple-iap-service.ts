import { Capacitor, registerPlugin } from '@capacitor/core'
import { MATFLOW_IOS_MONTHLY_PRODUCT_ID } from '@/lib/matflow-access'

export type AppleIapStatus = 'purchased' | 'restored' | 'pending' | 'cancelled' | 'empty' | 'unavailable' | 'unknown'

export type AppleIapResult = {
  status: AppleIapStatus
  productId?: string
  transactionId?: string
  originalTransactionId?: string
  environment?: string
  appAccountToken?: string
  purchaseDate?: string
  expirationDate?: string | null
  revocationDate?: string | null
  signedTransactionInfo?: string
  entitlements?: AppleIapResult[]
}

type MatFlowIAPPlugin = {
  purchase(options: { productId: string; appAccountToken?: string }): Promise<AppleIapResult>
  restore(): Promise<AppleIapResult>
}

const MatFlowIAP = registerPlugin<MatFlowIAPPlugin>('MatFlowIAP')

export function shouldUseAppleInAppPurchase(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export function purchaseMatFlowMonthly(appAccountToken?: string): Promise<AppleIapResult> {
  return MatFlowIAP.purchase({ productId: MATFLOW_IOS_MONTHLY_PRODUCT_ID, appAccountToken })
}

export function restoreMatFlowPurchases(): Promise<AppleIapResult> {
  return MatFlowIAP.restore()
}
