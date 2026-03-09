export const SUBSCRIPTION_RETURN_STATUSES = ['success', 'canceled', 'portal'] as const

export type SubscriptionReturnStatus = (typeof SUBSCRIPTION_RETURN_STATUSES)[number]

export function normalizeSubscriptionReturnStatus(
  value: string | null | undefined
): SubscriptionReturnStatus | null {
  if (!value) return null

  return SUBSCRIPTION_RETURN_STATUSES.includes(value as SubscriptionReturnStatus)
    ? (value as SubscriptionReturnStatus)
    : null
}

export function shouldPollSubscriptionStatusAfterReturn(status: SubscriptionReturnStatus): boolean {
  return status === 'success'
}