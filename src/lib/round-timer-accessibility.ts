export interface RoundTimerAccessibilityState {
  isPaused: boolean
  isWorking: boolean
  currentRound: number
  totalRounds: number
  timeRemaining: number
}

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getRoundTimerPhaseLabel(isWorking: boolean) {
  return isWorking ? 'Work' : 'Rest'
}

export function getRoundTimerLiveAnnouncement(state: Omit<RoundTimerAccessibilityState, 'timeRemaining'>) {
  const phaseLabel = getRoundTimerPhaseLabel(state.isWorking)

  if (state.isPaused) {
    return `Timer paused during ${phaseLabel.toLowerCase()} phase, round ${state.currentRound} of ${state.totalRounds}.`
  }

  return `${phaseLabel} phase, round ${state.currentRound} of ${state.totalRounds}.`
}

export function getRoundTimerAriaLabel(state: RoundTimerAccessibilityState) {
  const phaseLabel = getRoundTimerPhaseLabel(state.isWorking)
  const formattedTime = formatSeconds(state.timeRemaining)

  if (state.isPaused) {
    return `${formattedTime} remaining. Timer paused during ${phaseLabel.toLowerCase()} phase, round ${state.currentRound} of ${state.totalRounds}.`
  }

  return `${formattedTime} remaining in ${phaseLabel.toLowerCase()} phase, round ${state.currentRound} of ${state.totalRounds}.`
}