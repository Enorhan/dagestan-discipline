export function getActivityIntensityLabel(value: number) {
  if (value <= 3) return 'Easy'
  if (value <= 6) return 'Moderate'
  if (value <= 8) return 'Hard'
  return 'Max Effort'
}

export function getActivityIntensityDetail(value: number) {
  if (value <= 3) {
    return 'Recovery pace or technical work with plenty left in the tank.'
  }
  if (value <= 6) {
    return 'Solid work that builds rhythm without draining tomorrow’s session.'
  }
  if (value <= 8) {
    return 'Strong session load with real fatigue and meaningful effort.'
  }
  return 'Competition-level push or all-out rounds. Plan extra recovery after this.'
}