import type { FocusEventHandler, InputHTMLAttributes, PointerEventHandler } from 'react'

export type DisplayNameInputSurface = 'onboarding' | 'signup' | 'profile'

const DISPLAY_NAME_INPUT_NAMES: Record<DisplayNameInputSurface, string> = {
  onboarding: 'dd_name_onboarding',
  signup: 'dd_name_signup',
  profile: 'dd_name_profile',
}

type DisplayNameInputBehavior = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'name' | 'autoComplete' | 'autoCorrect' | 'spellCheck' | 'autoCapitalize' | 'inputMode' | 'enterKeyHint' | 'readOnly'
> & {
  'data-lpignore': 'true'
  'data-1p-ignore': 'true'
  onFocus: FocusEventHandler<HTMLInputElement>
  onPointerDown: PointerEventHandler<HTMLInputElement>
}

export function createDisplayNameInputBehavior(
  surface: DisplayNameInputSurface,
  unlocked: boolean,
  unlock: () => void,
): DisplayNameInputBehavior {
  return {
    type: 'text',
    name: DISPLAY_NAME_INPUT_NAMES[surface],
    // iOS/Safari and some password managers may ignore `off` and "refill" values while editing,
    // which can make deletions appear to bounce back. `new-password` is a pragmatic opt-out.
    autoComplete: 'new-password',
    autoCorrect: 'off',
    spellCheck: false,
    autoCapitalize: 'none',
    inputMode: 'text',
    enterKeyHint: 'done',
    readOnly: !unlocked,
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
    onFocus: () => unlock(),
    onPointerDown: () => unlock(),
  }
}

export function shouldIgnoreDisplayNameRefill({
  sentinelValue,
  currentValue,
  nextValue,
  hasManualEdit,
  inputType,
  isComposing,
}: {
  sentinelValue: string
  currentValue: string
  nextValue: string
  hasManualEdit: boolean
  inputType?: string | null
  isComposing?: boolean
}): boolean {
  const sentinel = sentinelValue.trim()
  if (!sentinel || !hasManualEdit) return false
  if (currentValue.length > 1) return false
  if (nextValue !== sentinel) return false
  if (isComposing) return false

  return inputType !== 'insertFromPaste' && inputType !== 'insertFromDrop'
}
