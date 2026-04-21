import assert from 'node:assert/strict'

async function main() {
  const {
    SOCIAL_MUSIC_TRACK_FALLBACKS,
    createSocialCreativeEdit,
    createSocialTextOverlay,
    getMusicDurationOptions,
    getSocialAspectRatioValue,
    getSocialFilterCss,
    getSocialOutputSize,
    hasRenderableSocialCreativeEdits,
    normalizeSocialCreativeEdit,
  } = await import('../src/lib/social-creative')

  const storyEdit = createSocialCreativeEdit('story')
  assert.equal(storyEdit.crop.aspectPreset, '9:16')
  assert.equal(getSocialAspectRatioValue('4:5'), 4 / 5)

  const postEdit = createSocialCreativeEdit('post')
  assert.equal(postEdit.crop.aspectPreset, '4:5')
  assert.deepEqual(getMusicDurationOptions('post'), [5_000, 10_000, 15_000])
  assert.deepEqual(getSocialOutputSize('post', '1:1'), { width: 1080, height: 1080 })

  const normalized = normalizeSocialCreativeEdit({
    mode: 'post',
    filter: { id: 'vivid', intensity: 2 },
    crop: { aspectPreset: '1:1', scale: 3, offsetX: 2, offsetY: -2 },
    textOverlays: [{ text: 'Guard pull', x: 0.2, y: 0.3 }],
    music: { trackId: 'focus-breathe', title: 'Focus Breathe', artist: 'Dagestani Disciple', previewUrl: '/audio/social/focus-breathe.m4a', startMs: -2, durationMs: 50_000, volume: 2 },
  }, 'post')

  assert.equal(normalized.filter.id, 'vivid')
  assert.equal(normalized.filter.intensity, 1)
  assert.equal(normalized.crop.scale, 2.5)
  assert.equal(normalized.crop.offsetX, 1)
  assert.equal(normalized.crop.offsetY, -1)
  assert.equal(normalized.textOverlays.length, 1)
  assert.equal(normalized.textOverlays[0]?.text, 'Guard pull')
  assert.equal(normalized.music?.startMs, 0)
  assert.equal(normalized.music?.durationMs, 15_000)
  assert.equal(normalized.music?.volume, 1)
  assert.equal(hasRenderableSocialCreativeEdits(normalized), true)

  const untouched = createSocialCreativeEdit('post')
  assert.equal(hasRenderableSocialCreativeEdits(untouched), false)

  const overlay = createSocialTextOverlay({ text: 'Arm drag' })
  assert.equal(overlay.text, 'Arm drag')
  assert.equal(getSocialFilterCss({ id: 'none', intensity: 0 }), 'none')
  assert.equal(typeof getSocialFilterCss({ id: 'cool', intensity: 0.5 }), 'string')

  assert.equal(SOCIAL_MUSIC_TRACK_FALLBACKS.length >= 3, true)
  assert.ok(SOCIAL_MUSIC_TRACK_FALLBACKS.every((track) => track.previewUrl.startsWith('/audio/social/')))

  console.log('Social creative helper tests passed.')
}

void main()
