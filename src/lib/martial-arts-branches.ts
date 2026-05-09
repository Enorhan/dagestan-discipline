export type MartialArtsBranchId =
  | 'bjj'
  | 'grappling'

export type MartialArtsBranch = {
  id: MartialArtsBranchId
  label: string
  aliases: string[]
}

export const MARTIAL_ARTS_BRANCHES: MartialArtsBranch[] = [
  { id: 'bjj', label: 'BJJ', aliases: ['bjj', 'jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu'] },
  { id: 'grappling', label: 'Grappling', aliases: ['grappling', 'submission grappling', 'nogi grappling', 'no-gi grappling'] },
]

export const MARTIAL_ARTS_BRANCH_IDS = MARTIAL_ARTS_BRANCHES.map((branch) => branch.id) as MartialArtsBranchId[]

const BRANCH_BY_ID = new Map(MARTIAL_ARTS_BRANCHES.map((branch) => [branch.id, branch]))
const BRANCH_ID_SET = new Set<MartialArtsBranchId>(MARTIAL_ARTS_BRANCH_IDS)

function normalizeBranchText(value: string): string {
  return value.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ')
}

export function isMartialArtsBranchId(value: unknown): value is MartialArtsBranchId {
  return typeof value === 'string' && BRANCH_ID_SET.has(value as MartialArtsBranchId)
}

export function normalizeMartialArtsBranchId(value: unknown): MartialArtsBranchId | null {
  if (isMartialArtsBranchId(value)) return value
  if (typeof value !== 'string') return null
  const normalized = normalizeBranchText(value)
  for (const branch of MARTIAL_ARTS_BRANCHES) {
    if (branch.aliases.some((alias) => normalizeBranchText(alias) === normalized)) {
      return branch.id
    }
  }
  return null
}

export function branchFromPrimaryDiscipline(value: unknown): MartialArtsBranchId {
  return normalizeMartialArtsBranchId(value) ?? 'bjj'
}

export function getMartialArtsBranchLabel(branchId: MartialArtsBranchId): string {
  return BRANCH_BY_ID.get(branchId)?.label ?? 'BJJ'
}
