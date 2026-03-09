export type ActionFeedbackVariant = 'success' | 'warning' | 'error'

export interface ActionFeedback {
  variant: ActionFeedbackVariant
  message: string
}

interface SettingsSaveFeedbackInput {
  shouldRegenerate: boolean
  profileSyncFailed: boolean
  programSyncFailed: boolean
}

export function getSettingsSaveFeedback({
  shouldRegenerate,
  profileSyncFailed,
  programSyncFailed,
}: SettingsSaveFeedbackInput): ActionFeedback {
  const hadSyncIssue = profileSyncFailed || programSyncFailed

  if (!hadSyncIssue) {
    return {
      variant: 'success',
      message: shouldRegenerate
        ? 'Preferences saved and your program was refreshed.'
        : 'Preferences saved.',
    }
  }

  return {
    variant: 'warning',
    message: shouldRegenerate
      ? 'Preferences saved, but cloud sync had issues. Your program was refreshed locally.'
      : 'Preferences updated on this device, but cloud sync had issues.',
  }
}

export function getActivitySaveFeedback(isEditing: boolean): ActionFeedback {
  return {
    variant: 'success',
    message: isEditing ? 'Activity updated.' : 'Activity logged.',
  }
}

export function getActivitySyncFallbackFeedback(isEditing: boolean): ActionFeedback {
  return {
    variant: 'warning',
    message: isEditing
      ? 'Activity updated on this device, but cloud sync failed.'
      : 'Activity logged on this device, but cloud sync failed.',
  }
}

export function getWorkoutSaveFeedback(isEditing: boolean): ActionFeedback {
  return {
    variant: 'success',
    message: isEditing ? 'Workout updated.' : 'Workout saved.',
  }
}

export function getProgramDraftSaveFeedback(succeeded: boolean): ActionFeedback {
  return succeeded
    ? { variant: 'success', message: 'Program draft saved.' }
    : { variant: 'error', message: 'Could not save your program draft. Try again.' }
}

export function getProgramSessionSaveFeedback(): ActionFeedback {
  return {
    variant: 'success',
    message: 'Session changes saved to your draft.',
  }
}

export function getTodayExerciseSaveFeedback(exerciseName?: string | null): ActionFeedback {
  return {
    variant: 'success',
    message: exerciseName ? `${exerciseName} updated for today.` : 'Exercise updated for today.',
  }
}