import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const migration = read('supabase/migrations/20260421223000_multi_user_public_graph_hardening.sql')
const bjjService = read('src/lib/bjj-service.ts')
const bjjApp = read('src/components/bjj-app.tsx')
const runtimeFlags = read('src/lib/runtime-flags.ts')
const bjjTypes = read('src/lib/bjj-types.ts')
const databaseTypes = read('src/lib/database.types.ts')

for (const token of [
  'create or replace function public.search_public_profiles',
  'create or replace function public.get_public_profile',
  'create or replace function public.list_public_user_systems',
  'create or replace function public.list_public_user_techniques',
  'create or replace function public.save_user_system_graph',
  'create trigger system_node_techniques_owner_guard',
  'create trigger training_session_techniques_owner_guard',
  'create or replace function public.request_or_follow',
]) {
  assert.ok(migration.includes(token), `migration missing ${token}`)
}

assert.ok(
  /requester_id is distinct from actor_id[\s\S]+forbidden_requester/.test(migration),
  'request_or_follow must reject forged requester ids',
)
assert.ok(
  /technique_branch is distinct from sys_branch/.test(migration),
  'system node technique guard must enforce branch ownership',
)
assert.ok(
  /technique_branch is distinct from session_branch/.test(migration),
  'training session technique guard must enforce branch ownership',
)

for (const rpc of [
  'save_user_system_graph',
  'search_public_profiles',
  'get_public_profile',
  'list_public_user_techniques',
  'list_public_user_systems',
]) {
  assert.ok(bjjService.includes(`'${rpc}'`), `bjj service should call ${rpc}`)
  assert.ok(databaseTypes.includes(`${rpc}: {`), `generated database types should include ${rpc}`)
}

assert.ok(
  bjjTypes.includes('export type BjjSocialSurface = MartialArtsBranchId'),
  'community surface should be branch-scoped',
)

const refreshSocialFeedMatch = bjjApp.match(/const refreshSocialFeed = useCallback[\s\S]+?\}, \[showError, user\]\)/)
assert.ok(refreshSocialFeedMatch, 'refreshSocialFeed block not found')
assert.doesNotMatch(
  refreshSocialFeedMatch[0],
  /listHomeFeed|listExploreFeed|listReels|listStories|listDrafts|listTrendingTopics/,
  'Community refresh must not call legacy social feed paths',
)

for (const flag of [
  'socialFeedEnabled',
  'socialReelsEnabled',
  'socialStoriesEnabled',
  'socialExploreEnabled',
  'socialCreatorDraftsEnabled',
  'socialSchedulingEnabled',
  'socialVideoUploadsEnabled',
  'socialFeedRankingV2Enabled',
]) {
  assert.match(runtimeFlags, new RegExp(`${flag}: parseBooleanFlag\\([^\\n]+, false\\)`), `${flag} should default disabled`)
}

console.log('Multi-user hardening static tests passed.')
