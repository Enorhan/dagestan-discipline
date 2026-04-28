import assert from 'node:assert/strict'
import { createDefaultBjjState } from '@/lib/bjj-seed'
import { normalizeBjjState, normalizePersistedShellUiPrefs } from '@/lib/bjj-state'

const defaultState = createDefaultBjjState('Enes', 'enes')
assert.equal(defaultState.selectedBottomTab, 'today')

assert.equal(normalizeBjjState({ selectedBottomTab: 'sessions' }, 'Enes', 'enes').selectedBottomTab, 'today')
assert.equal(normalizeBjjState({ selectedBottomTab: 'techniques' }, 'Enes', 'enes').selectedBottomTab, 'library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'social' }, 'Enes', 'enes').selectedBottomTab, 'community')
assert.equal(normalizeBjjState({ selectedBottomTab: 'gameplans' }, 'Enes', 'enes').selectedBottomTab, 'gameplans')

assert.deepEqual(
  normalizePersistedShellUiPrefs({
    selectedBottomTab: 'social',
    selectedTechniquesTab: 'systems',
  }),
  {
    selectedBottomTab: 'community',
    selectedTechniquesTab: 'systems',
  },
)

console.log('MatFlow navigation tests passed.')
