/**
 * Two-user RLS integration tests against a live Supabase project.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   Email confirmation disabled for sign-in to succeed.
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY - deletes test users at the end.
 *
 * Run: npx tsx scripts/test-rls-two-users.ts
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFiles(): void {
  for (const filename of ['.env.local', '.env']) {
    const path = join(process.cwd(), filename)
    if (!existsSync(path)) continue
    const contents = readFileSync(path, 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key] !== undefined) continue
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
    }
  }
}

loadEnvFiles()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

type SupabaseTestClient = any

function skip(message: string): never {
  console.log(`[skip] ${message}`)
  process.exit(0)
}

function assertDbError(error: unknown, pattern: RegExp, message: string): void {
  assert.ok(error, message)
  assert.match(String((error as { message?: unknown })?.message ?? error), pattern)
}

async function signIn(client: SupabaseTestClient, email: string, password: string): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
}

async function loadOwnProfile(client: SupabaseTestClient, userId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await client
      .from('profiles')
      .select('id, username, privacy, primary_discipline')
      .eq('id', userId)
      .maybeSingle()
    assert.ifError(error)
    if (data) return data as { id: string; username: string; privacy: string; primary_discipline: string | null }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`profile did not bootstrap for ${userId}`)
}

async function assertOwnStats(client: SupabaseTestClient, userId: string): Promise<void> {
  const { data, error } = await client
    .from('user_stats')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  assert.ifError(error)
  assert.equal(data?.user_id, userId, 'server trigger should create user_stats')
}

async function saveGraph(client: SupabaseTestClient, input: Record<string, unknown>) {
  return client.rpc('save_user_system_graph', { p_input: input })
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    skip('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run integration tests.')
  }

  const suffix = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`
  const password = `Dd_Rls_${suffix}_P@ssw0rd!`
  const emailA = `dd_rls_a_${suffix}@example.com`
  const emailB = `dd_rls_b_${suffix}@example.com`
  const usernameA = `ddrlsa_${suffix}`
  const usernameB = `ddrlsb_${suffix}`

  const clientA = createClient(supabaseUrl, anonKey) as SupabaseTestClient
  const clientB = createClient(supabaseUrl, anonKey) as SupabaseTestClient
  const createdUserIds: string[] = []

  const signUp = async (client: SupabaseTestClient, email: string, username: string, branch: string) => {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
          sport: branch === 'judo' ? 'judo' : branch === 'wrestling' ? 'wrestling' : 'bjj',
          primary_discipline: branch,
        },
      },
    })
    assert.ifError(error)
    assert.ok(data.user?.id, 'signUp should return an auth user')
    createdUserIds.push(data.user.id)
    return data.user.id
  }

  try {
    const idA = await signUp(clientA, emailA, usernameA, 'bjj')
    const idB = await signUp(clientB, emailB, usernameB, 'boxing')

    await signIn(clientA, emailA, password)
    await signIn(clientB, emailB, password)

    const profileA = await loadOwnProfile(clientA, idA)
    const profileB = await loadOwnProfile(clientB, idB)
    assert.equal(profileA.username, usernameA)
    assert.equal(profileA.primary_discipline, 'bjj')
    assert.equal(profileB.username, usernameB)
    assert.equal(profileB.primary_discipline, 'boxing')
    await assertOwnStats(clientA, idA)
    await assertOwnStats(clientB, idB)

    const { data: availData, error: availErr } = await clientA.rpc('username_is_available', {
      p_username: usernameA,
      p_exclude_user_id: null,
    })
    assert.ifError(availErr)
    assert.equal(availData, false, 'username availability is UX only; DB already owns the truth')

    const { error: duplicateUsername } = await clientA
      .from('profiles')
      .update({ username: usernameB })
      .eq('id', idA)
    assertDbError(duplicateUsername, /duplicate key|profiles_username_lower_uidx|unique/i, 'duplicate username must fail at DB level')
    const profileAfterDuplicate = await loadOwnProfile(clientA, idA)
    assert.equal(profileAfterDuplicate.username, usernameA)

    const { error: forgedFollow } = await clientA.rpc('request_or_follow', {
      requester_id: idB,
      target_id: idA,
    })
    assertDbError(forgedFollow, /forbidden_requester|not authenticated/i, 'A cannot forge B as requester')

    const { data: bjjSearch, error: bjjSearchErr } = await clientA.rpc('search_public_profiles', {
      p_branch: 'bjj',
      p_query: usernameB.slice(0, 8),
      p_limit: 20,
      p_cursor: null,
    })
    assert.ifError(bjjSearchErr)
    assert.equal((bjjSearch ?? []).some((row: any) => row.user_id === idB), false, 'B must not appear in BJJ search')

    const { data: boxingSearch, error: boxingSearchErr } = await clientA.rpc('search_public_profiles', {
      p_branch: 'boxing',
      p_query: usernameB.slice(0, 8),
      p_limit: 20,
      p_cursor: null,
    })
    assert.ifError(boxingSearchErr)
    assert.equal((boxingSearch ?? []).some((row: any) => row.user_id === idB), true, 'B should appear only in boxing search')

    const { data: directProfileRead, error: directProfileReadErr } = await clientB
      .from('profiles')
      .select('id, username, display_name, bio, primary_discipline')
      .eq('id', idA)
    assert.ifError(directProfileReadErr)
    assert.deepEqual(directProfileRead ?? [], [], 'B cannot directly read A full profile row')

    const techIdA = `ut-rls-a-${suffix}`
    const techIdB = `ut-rls-b-${suffix}`
    const { error: insertTechAErr } = await clientA.from('user_techniques').insert({
      id: techIdA,
      user_id: idA,
      title: 'RLS test armbar',
      category: 'submission',
      notes: '',
      description: 'Owner-only library technique',
      tutorial_title: 'Armbar',
      media: [],
      links: [],
      branch: 'bjj',
    })
    assert.ifError(insertTechAErr)

    const { error: insertTechBErr } = await clientB.from('user_techniques').insert({
      id: techIdB,
      user_id: idB,
      title: 'RLS test cross',
      category: 'strike',
      notes: '',
      description: 'B library technique',
      tutorial_title: 'Cross',
      media: [],
      links: [],
      branch: 'bjj',
    })
    assert.ifError(insertTechBErr)

    const { data: stealTech, error: stealTechErr } = await clientB
      .from('user_techniques')
      .select('id')
      .eq('id', techIdA)
    assert.ifError(stealTechErr)
    assert.deepEqual(stealTech ?? [], [], 'B must not read A private user_techniques')

    const discoverTechniqueId = `disc-community-${suffix}`
    const { error: discoverInsertErr } = await clientA.from('techniques').insert({
      id: discoverTechniqueId,
      branch: 'bjj',
      title: 'Community RLS choke',
      category: 'submission',
      description: 'Public community technique',
      tutorial_title: 'Community RLS choke',
      tags: ['RLS'],
      links: [],
      media: [],
      linked_technique_ids: [],
      created_by: idA,
    })
    assert.ifError(discoverInsertErr)

    const { data: publicTechniques, error: publicTechniquesErr } = await clientB.rpc('list_public_user_techniques', {
      p_profile_id: idA,
      p_branch: 'bjj',
    })
    assert.ifError(publicTechniquesErr)
    assert.equal((publicTechniques ?? []).some((row: any) => row.id === discoverTechniqueId), true, 'B can see A community technique')
    assert.equal((publicTechniques ?? []).some((row: any) => row.id === techIdA), false, 'B cannot see A private library technique')

    const publicSystemId = `user-system-public-${suffix}`
    const privateSystemId = `user-system-private-${suffix}`
    const nodeA = `node-a-${suffix}`
    const nodeB = `node-b-${suffix}`
    const { data: publicSave, error: publicSaveErr } = await saveGraph(clientA, {
      id: publicSystemId,
      title: 'Public RLS graph',
      summary: 'Public graph snapshot only',
      visibility: 'public',
      branch: 'bjj',
      sortOrder: 5000,
      expectedUpdatedAt: null,
      nodes: [
        { id: nodeA, label: 'Setup', color: '#3b82f6', sortOrder: 0, layout: { x: 0.25, y: 0.25 }, linkedTechniqueIds: [techIdA] },
        { id: nodeB, label: 'Finish', color: '#ef4444', sortOrder: 1, layout: { x: 0.75, y: 0.75 }, linkedTechniqueIds: [] },
      ],
      edges: [{ from: nodeA, to: nodeB, label: 'then' }],
    })
    assert.ifError(publicSaveErr)
    assert.equal((publicSave as any)?.id, publicSystemId)

    const { error: privateSaveErr } = await saveGraph(clientA, {
      id: privateSystemId,
      title: 'Private RLS graph',
      summary: 'Private graph',
      visibility: 'private',
      branch: 'bjj',
      sortOrder: 5001,
      expectedUpdatedAt: null,
      nodes: [{ id: `private-node-${suffix}`, label: 'Private', color: '#111827', sortOrder: 0, layout: null, linkedTechniqueIds: [techIdA] }],
      edges: [],
    })
    assert.ifError(privateSaveErr)

    const { data: publicSystems, error: publicSystemsErr } = await clientB.rpc('list_public_user_systems', {
      p_profile_id: idA,
      p_branch: 'bjj',
    })
    assert.ifError(publicSystemsErr)
    assert.equal((publicSystems ?? []).some((row: any) => row.system_id === publicSystemId), true, 'B sees A public graph')
    assert.equal((publicSystems ?? []).some((row: any) => row.system_id === privateSystemId), false, 'B does not see A private graph')
    assert.equal(JSON.stringify(publicSystems ?? []).includes(techIdA), false, 'public graph RPC must not expose private technique ids')

    const { error: graphAttack } = await saveGraph(clientB, {
      id: `user-system-bad-${suffix}`,
      title: 'Malicious graph',
      summary: '',
      visibility: 'private',
      branch: 'bjj',
      sortOrder: 5000,
      expectedUpdatedAt: null,
      nodes: [{ id: `bad-node-${suffix}`, label: 'Bad', color: '#000', sortOrder: 0, layout: null, linkedTechniqueIds: [techIdA] }],
      edges: [],
    })
    assertDbError(graphAttack, /technique_not_in_library|technique_not_owned|technique_not_owned_for_system/i, 'B cannot link A technique into B graph')

    const { error: atomicAttack } = await saveGraph(clientA, {
      id: publicSystemId,
      title: 'Corrupted graph',
      summary: 'Should not persist',
      visibility: 'public',
      branch: 'bjj',
      sortOrder: 5000,
      expectedUpdatedAt: null,
      nodes: [{ id: nodeA, label: 'Corrupt', color: '#000', sortOrder: 0, layout: null, linkedTechniqueIds: [techIdB] }],
      edges: [],
    })
    assertDbError(atomicAttack, /technique_not_in_library|technique_not_owned|technique_not_owned_for_system/i, 'invalid graph save rejects whole transaction')
    const { data: graphAfterAtomic, error: graphAfterAtomicErr } = await clientA
      .from('systems')
      .select('title')
      .eq('id', publicSystemId)
      .maybeSingle()
    assert.ifError(graphAfterAtomicErr)
    assert.equal(graphAfterAtomic?.title, 'Public RLS graph', 'failed graph save must leave previous graph intact')

    const { data: sessionRows, error: sessionErr } = await clientB
      .from('training_sessions')
      .insert({
        user_id: idB,
        title: 'B RLS session',
        source: 'manual',
        kind: 'mat',
        branch: 'bjj',
        session_date: '2026-04-21',
        duration_minutes: 45,
        satisfaction: 3,
        visibility: 'private',
      })
      .select('id')
      .single()
    assert.ifError(sessionErr)

    const { error: sessionLinkAttack } = await clientB.from('training_session_techniques').insert({
      training_session_id: (sessionRows as any).id,
      technique_id: techIdA,
    })
    assertDbError(sessionLinkAttack, /technique_not_owned_for_session|violates row-level security|foreign key/i, 'B cannot link A technique to B session')

    const { data: followPublic, error: followPublicErr } = await clientA.rpc('request_or_follow', {
      requester_id: idA,
      target_id: idB,
    })
    assert.ifError(followPublicErr)
    assert.equal(followPublic, 'followed')

    const { error: removePublicFollowErr } = await clientA
      .from('follows')
      .delete()
      .eq('follower_user_id', idA)
      .eq('following_user_id', idB)
    assert.ifError(removePublicFollowErr)

    const { error: makePrivateErr } = await clientB
      .from('profiles')
      .update({ privacy: 'private' })
      .eq('id', idB)
    assert.ifError(makePrivateErr)

    const { data: hiddenPrivateSearch, error: hiddenPrivateSearchErr } = await clientA.rpc('search_public_profiles', {
      p_branch: 'boxing',
      p_query: usernameB.slice(0, 8),
      p_limit: 20,
      p_cursor: null,
    })
    assert.ifError(hiddenPrivateSearchErr)
    assert.equal((hiddenPrivateSearch ?? []).some((row: any) => row.user_id === idB), false, 'private B is hidden from branch search')

    const { data: requestResult, error: requestErr } = await clientA.rpc('request_or_follow', {
      requester_id: idA,
      target_id: idB,
    })
    assert.ifError(requestErr)
    assert.equal(requestResult, 'requested')

    const { data: pendingRows, error: pendingErr } = await clientB
      .from('follow_requests')
      .select('id, status')
      .eq('requester_user_id', idA)
      .eq('target_user_id', idB)
      .eq('status', 'pending')
    assert.ifError(pendingErr)
    assert.equal(pendingRows?.length, 1, 'B sees A pending follow request')

    const requestId = (pendingRows?.[0] as any).id
    const { data: rejectResult, error: rejectErr } = await clientB.rpc('respond_follow_request', {
      request_id: requestId,
      accept_request: false,
    })
    assert.ifError(rejectErr)
    assert.equal(rejectResult, 'rejected')

    const { data: requestAgainResult, error: requestAgainErr } = await clientA.rpc('request_or_follow', {
      requester_id: idA,
      target_id: idB,
    })
    assert.ifError(requestAgainErr)
    assert.equal(requestAgainResult, 'requested')

    const { data: pendingAgainRows, error: pendingAgainErr } = await clientB
      .from('follow_requests')
      .select('id, status')
      .eq('requester_user_id', idA)
      .eq('target_user_id', idB)
      .eq('status', 'pending')
    assert.ifError(pendingAgainErr)
    assert.equal(pendingAgainRows?.length, 1)

    const { data: acceptResult, error: acceptErr } = await clientB.rpc('respond_follow_request', {
      request_id: (pendingAgainRows?.[0] as any).id,
      accept_request: true,
    })
    assert.ifError(acceptErr)
    assert.equal(acceptResult, 'accepted')

    const { data: acceptedFollow, error: acceptedFollowErr } = await clientA
      .from('follows')
      .select('id')
      .eq('follower_user_id', idA)
      .eq('following_user_id', idB)
    assert.ifError(acceptedFollowErr)
    assert.equal(acceptedFollow?.length, 1, 'accepted private request creates follow')

    const { data: privateProfileForFollower, error: privateProfileForFollowerErr } = await clientA.rpc('get_public_profile', {
      p_profile_id: idB,
    })
    assert.ifError(privateProfileForFollowerErr)
    assert.equal((privateProfileForFollower ?? []).some((row: any) => row.user_id === idB), true, 'accepted follower can open safe profile surface')

    console.log('[ok] two-user RLS integration tests passed')
  } finally {
    await clientA.auth.signOut().catch(() => undefined)
    await clientB.auth.signOut().catch(() => undefined)

    if (serviceKey && createdUserIds.length > 0) {
      const admin = createClient(supabaseUrl, serviceKey)
      for (const userId of createdUserIds) {
        await admin.auth.admin.deleteUser(userId).catch((error) => {
          console.warn(`[cleanup] failed to delete ${userId}:`, error)
        })
      }
      console.log('[cleanup] removed test users')
    } else if (createdUserIds.length > 0) {
      console.warn('[cleanup] SUPABASE_SERVICE_ROLE_KEY not set; test users were not removed')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
