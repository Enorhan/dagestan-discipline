import type { MartialArtsBranchId } from '@/lib/martial-arts-branches'
import type { BjjSession } from '@/lib/bjj-types'
import { SESSION_TYPES_BY_BRANCH } from './constants'
import type {
  DiscoverTechniqueDraft,
  SessionDraft,
  TechniqueDraft,
} from './types'

export function createSessionDraft(branch: MartialArtsBranchId = 'bjj'): SessionDraft {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5)
  const types = SESSION_TYPES_BY_BRANCH[branch] ?? SESSION_TYPES_BY_BRANCH.bjj

  return {
    branch,
    date,
    time,
    location: '',
    type: types[0] ?? 'No-Gi',
    submissions: '',
    taps: '',
    durationMinutes: 90,
    notes: '',
    satisfaction: 3,
    taggedFriends: '',
    visibility: 'everyone',
    caption: '',
    linkedTechniqueIds: [],
  }
}

export function sessionToDraft(session: BjjSession): SessionDraft {
  const types = SESSION_TYPES_BY_BRANCH[session.branch] ?? SESSION_TYPES_BY_BRANCH.bjj
  const type = types.includes(session.type) ? session.type : (types[0] ?? session.type)
  return {
    branch: session.branch,
    date: session.date,
    time: session.time,
    location: session.location,
    type,
    submissions: session.submissions.join(', '),
    taps: session.taps.join(', '),
    durationMinutes: session.durationMinutes,
    notes: session.notes,
    satisfaction: session.satisfaction,
    taggedFriends: session.taggedFriends.join(', '),
    visibility: session.visibility,
    caption: session.caption,
    linkedTechniqueIds: [...session.linkedTechniqueIds],
  }
}

export function createTechniqueDraft(): TechniqueDraft {
  return {
    title: '',
    category: 'submission',
    tags: '',
    notes: '',
    description: '',
    tutorialTitle: '',
    links: '',
    linkedTechniqueIds: [],
  }
}

export function createDiscoverTechniqueDraft(): DiscoverTechniqueDraft {
  return {
    title: '',
    category: 'submission',
    tags: '',
    description: '',
    tutorialTitle: '',
    videoUrl: '',
  }
}

