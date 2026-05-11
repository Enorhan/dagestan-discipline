import assert from 'node:assert/strict'
import { createDefaultBjjState } from '@/lib/bjj-seed'
import { normalizeBjjState, normalizePersistedShellUiPrefs } from '@/lib/bjj-state'

const defaultState = createDefaultBjjState('Enes', 'enes')
assert.equal(defaultState.selectedBottomTab, 'my-library')

// Legacy persisted bottom-tab values from the pre-pivot shell must fold into
// the three current MatFlow tabs (my-library / systems / discover).
assert.equal(normalizeBjjState({ selectedBottomTab: 'today' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'sessions' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'you' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'techniques' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'social' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'community' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'gameplans' }, 'Enes', 'enes').selectedBottomTab, 'my-library')
assert.equal(normalizeBjjState({ selectedBottomTab: 'systems' }, 'Enes', 'enes').selectedBottomTab, 'systems')
assert.equal(normalizeBjjState({ selectedBottomTab: 'discover' }, 'Enes', 'enes').selectedBottomTab, 'discover')

assert.deepEqual(
  normalizePersistedShellUiPrefs({
    selectedBottomTab: 'social',
    selectedTechniquesTab: 'systems',
  }),
  {
    selectedBottomTab: 'my-library',
    selectedTechniquesTab: 'systems',
  },
)

console.log('MatFlow navigation tests passed.')
