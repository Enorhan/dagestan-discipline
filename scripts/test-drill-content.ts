import assert from 'node:assert/strict'
import { techniqueDrills } from '../src/lib/drills-data'
import { toExternalVideoUrl, toHostedVideoEmbedUrl } from '../src/lib/video-links'

process.env.NEXT_PUBLIC_APP_URL ??= 'https://example.com/app/'

function requireDrill(name: string) {
  const drill = techniqueDrills.find((entry) => entry.name === name)
  assert.ok(drill, `Expected drill named "${name}" to exist`)
  return drill
}

assert.equal(techniqueDrills.length, 150, 'Expected the technique library to keep 150 drills')
assert.ok(
  techniqueDrills.every((drill) => drill.instructions.length >= 5),
  'Every technique drill should now provide at least five coaching steps'
)
assert.ok(
  techniqueDrills.every((drill) => /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+$/.test(drill.videoUrl)),
  'Every technique drill should now provide an embeddable YouTube video URL'
)
assert.ok(
  techniqueDrills.every((drill) => /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+$/.test(toExternalVideoUrl(drill.videoUrl))),
  'Every technique drill video should also convert into an externally openable YouTube watch URL'
)
assert.ok(
  techniqueDrills.every((drill) => /^https:\/\/example\.com\/app\/youtube-embed\.html\?videoId=[A-Za-z0-9_-]+$/.test(toHostedVideoEmbedUrl(drill.videoUrl) ?? '')),
  'Every technique drill video should also convert into a hosted HTTPS embed proxy URL when NEXT_PUBLIC_APP_URL is configured'
)

const soloDrills = techniqueDrills.filter((drill) => drill.equipment?.includes('none'))
const partnerDrills = techniqueDrills.filter((drill) => drill.equipment?.includes('partner'))
const submissionDrills = techniqueDrills.filter((drill) => drill.subcategory === 'submissions')
const judoPartnerTakedowns = techniqueDrills.filter(
  (drill) => drill.sportRelevance.includes('judo') && drill.subcategory === 'takedowns' && drill.equipment?.includes('partner')
)

assert.ok(soloDrills.every((drill) => /solo drill/i.test(drill.description)), 'Solo drills should say they are solo drills')
assert.ok(partnerDrills.every((drill) => /partner drill/i.test(drill.description)), 'Partner drills should say they are partner drills')
assert.ok(submissionDrills.every((drill) => /tap/i.test(drill.description)), 'Submission drills should include a tap safety note')
assert.ok(
  judoPartnerTakedowns.every((drill) => /land safely|post, fall, or land safely/i.test(drill.description)),
  'Judo takedown drills should include safe landing guidance'
)

const oSoto = requireDrill('O-soto-gari Uchikomi')
assert.match(oSoto.description, /plain english/i)
assert.match(oSoto.description, /major outer reap/i)
assert.match(oSoto.instructions[1], /off-balance/i)

const berimbolo = requireDrill('Berimbolo Inversion Pathway')
assert.match(berimbolo.description, /inversion back-take entry/i)
assert.match(berimbolo.instructions[2], /shoulders, not the neck/i)

const standUp = requireDrill('Stand-Up with Hand Control')
assert.match(standUp.description, /partner drill/i)
assert.match(standUp.instructions[2], /create an angle, clear the hips, and face back in/i)
assert.match(standUp.videoUrl, /youtube-nocookie\.com\/embed\//i)
assert.match(toExternalVideoUrl(standUp.videoUrl), /youtube\.com\/watch\?v=/i)
assert.match(toHostedVideoEmbedUrl(standUp.videoUrl) ?? '', /example\.com\/app\/youtube-embed\.html\?videoId=/i)

console.log('Drill content tests passed.')