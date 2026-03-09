export function getCountdownRemainingSeconds(endsAt: number | null, now = Date.now()) {
  if (!endsAt) return 0
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

export function getNextCountdownTickDelay(endsAt: number, now = Date.now()) {
  const remainingMs = endsAt - now

  if (remainingMs <= 0) {
    return 0
  }

  const remainder = remainingMs % 1000
  return Math.max(16, remainder === 0 ? 1000 : remainder)
}