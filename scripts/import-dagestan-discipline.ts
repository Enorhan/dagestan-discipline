#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  generateExerciseDescription,
  isLikelyExerciseName,
  shouldReplaceExerciseDescription,
} from './exercise-quality'

type XlsxModule = typeof import('xlsx')
type XlsxWorkbook = import('xlsx').WorkBook

type SportType = 'wrestling' | 'judo' | 'bjj'
type DrillCategory = 'technique' | 'exercise' | 'injury-prevention' | 'mobility' | 'conditioning' | 'warmup' | 'recovery'
type DrillSubcategory =
  | 'takedowns'
  | 'defense'
  | 'ground-work'
  | 'submissions'
  | 'escapes'
  | 'upper-body'
  | 'lower-body'
  | 'core'
  | 'full-body'
  | 'grip'
  | 'neck'
  | 'shoulders'
  | 'knees'
  | 'hips'
  | 'back'
  | 'fingers'
  | 'hip-mobility'
  | 'shoulder-mobility'
  | 'spine-mobility'
  | 'ankle-mobility'
  | 'general'

interface ParsedAthlete {
  name: string
  sport: SportType
  profession: string
  weight: string | null
  nationality: string | null
  weighted: Set<string>
  bodyweight: Set<string>
  drills: Set<string>
  allExercises: Set<string>
}

interface ExerciseCandidate {
  key: string
  name: string
  sport: SportType
  category: string
  isWeighted: boolean
  muscleGroups: Set<string>
}

interface DrillCandidate {
  id: string
  name: string
  category: DrillCategory
  subcategory: DrillSubcategory
  sportRelevance: SportType[]
  musclesWorked: string[]
}

interface ExistingAthlete {
  id: string
  name: string
  sport: SportType
}

interface ExistingExercise {
  id: string
  name: string
  sport: SportType | null
  category: string
  is_weighted: boolean | null
  muscle_groups: string[] | null
  description: string | null
}

interface AthleteLink {
  athleteName: string
  sport: SportType
  exerciseName: string
  priority: number
  note: string | null
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function splitTopLevelCommaList(value: string): string[] {
  if (!value.trim()) return []
  const out: string[] = []
  let current = ''
  let depth = 0
  for (const char of value) {
    if (char === '(') {
      depth += 1
      current += char
      continue
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }
    if (char === ',' && depth === 0) {
      const token = current.trim()
      if (token) out.push(token)
      current = ''
      continue
    }
    current += char
  }
  const finalToken = current.trim()
  if (finalToken) out.push(finalToken)
  return out
}

function inferSport(profession: string): SportType {
  const text = profession.toLowerCase()
  if (text.includes('judo') || text.includes('judoka')) return 'judo'
  if (text.includes('bjj') || text.includes('jiu') || text.includes('grappler')) return 'bjj'
  return 'wrestling'
}

function extractNationality(profession: string): string | null {
  const match = profession.match(/\(([^)]+)\)/)
  return match?.[1]?.trim() || null
}

function mapMuscleGroupToCategory(group: string | null, exerciseName: string): string {
  const source = `${group ?? ''} ${exerciseName}`.toLowerCase()
  if (/neck/.test(source)) return 'neck'
  if (/(core|abs|abdominal|oblique|midsection)/.test(source)) return 'core'
  if (/(shoulder|deltoid)/.test(source)) return 'shoulders'
  if (/(chest|pec)/.test(source)) return 'chest'
  if (/(arm|bicep|tricep|forearm|grip)/.test(source)) return 'arms'
  if (/(back|lat|trap|row)/.test(source)) return 'back'
  if (/(leg|lower body|quad|hamstring|glute|calf|lunge|squat)/.test(source)) return 'legs'
  if (/(full body|conditioning|cardio|agility|sprint|running|burpee|plyometric)/.test(source)) return 'full-body'
  return 'full-body'
}

function inferDrillCategory(name: string): DrillCategory {
  const text = name.toLowerCase()
  if (/(warm.?up|activation|prep)/.test(text)) return 'warmup'
  if (/(recovery|cool.?down|mobility flow)/.test(text)) return 'recovery'
  if (/(mobility|stretch|flexibility)/.test(text)) return 'mobility'
  if (/(drill|grappling|wrestling|judo|bjj|randori|takedown|guard|submission|roll|mat|sparring|technique)/.test(text)) {
    return 'technique'
  }
  if (/(conditioning|cardio|interval|sprint|bike|rowing|hiit|circuit)/.test(text)) {
    return 'conditioning'
  }
  return 'exercise'
}

function inferDrillSubcategory(name: string, category: DrillCategory, muscleCategory: string): DrillSubcategory {
  const text = name.toLowerCase()
  if (category === 'technique') {
    if (/(takedown|throw|shot|double leg|single leg)/.test(text)) return 'takedowns'
    if (/(defense|sprawl|counter)/.test(text)) return 'defense'
    if (/(submission|escape)/.test(text)) return 'submissions'
    if (/(guard|pass|ground|rolling|transition)/.test(text)) return 'ground-work'
    return 'general'
  }
  if (category === 'conditioning') {
    return 'full-body'
  }
  if (category === 'exercise') {
    if (muscleCategory === 'legs') return 'lower-body'
    if (muscleCategory === 'core') return 'core'
    if (muscleCategory === 'full-body') return 'full-body'
    if (muscleCategory === 'arms' || muscleCategory === 'back' || muscleCategory === 'chest' || muscleCategory === 'shoulders') {
      return 'upper-body'
    }
    return 'general'
  }
  return 'general'
}

function inferDrillSports(name: string): SportType[] {
  const text = name.toLowerCase()
  const sports = new Set<SportType>()
  if (/(wrestling|takedown|mat)/.test(text)) sports.add('wrestling')
  if (/(judo|randori|throw)/.test(text)) sports.add('judo')
  if (/(bjj|jiu|guard|submission|rolling|grappling)/.test(text)) sports.add('bjj')
  if (sports.size === 0) {
    sports.add('wrestling')
    sports.add('judo')
    sports.add('bjj')
  }
  return Array.from(sports)
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function loadXlsx(): Promise<XlsxModule> {
  try {
    return await import('xlsx')
  } catch {
    throw new Error(
      'The optional admin dependency "xlsx" is unavailable. Reinstall dependencies before running this admin import.'
    )
  }
}

function toSheetRows(workbook: XlsxWorkbook, sheetName: string, xlsx: XlsxModule): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

function printUsage(): void {
  console.log([
    'Dagestan discipline admin import',
    '',
    'Admin-only usage:',
    '  npm run admin:import:dagestan -- /absolute/path/to/Dagestan discipline.xlsx',
    '  DAGESTAN_DISCIPLINE_XLSX_PATH=/absolute/path/to/Dagestan discipline.xlsx npm run admin:import:dagestan',
    '',
    'Required environment variables:',
    '  NEXT_PUBLIC_SUPABASE_URL',
    '  SUPABASE_SERVICE_ROLE_KEY',
  ].join('\n'))
}

function resolveWorkbookPath(cliValue?: string, envValue?: string): string {
  const candidate = cliValue?.trim() || envValue?.trim()
  if (!candidate) {
    throw new Error(
      'Missing workbook path. Pass the .xlsx path as the first argument or set DAGESTAN_DISCIPLINE_XLSX_PATH.'
    )
  }

  const resolved = path.resolve(candidate)
  if (!fs.existsSync(resolved)) {
    throw new Error(`Workbook file not found: ${resolved}`)
  }

  return resolved
}

function stableDrillId(name: string): string {
  const slug = normalizeKey(name).replace(/\s+/g, '-').slice(0, 48) || 'drill'
  let hash = 5381
  for (const char of name) {
    hash = ((hash << 5) + hash) + char.charCodeAt(0)
  }
  const suffix = Math.abs(hash).toString(36).slice(0, 6)
  return `dagestan-${slug}-${suffix}`
}

async function parseWorkbook(
  xlsxPath: string
): Promise<{
  athletes: ParsedAthlete[]
  exerciseCandidates: Map<string, ExerciseCandidate>
  athleteLinks: AthleteLink[]
  drillCandidates: DrillCandidate[]
}> {
  const xlsx = await loadXlsx()
  const workbook = xlsx.readFile(xlsxPath)

  const athletesRows = toSheetRows(workbook, 'Athletes', xlsx)
  const weightedRows = toSheetRows(workbook, 'Weighted Exercises', xlsx)
  const bodyweightRows = toSheetRows(workbook, 'Bodyweight Exercises', xlsx)
  const drillRows = toSheetRows(workbook, 'Drills', xlsx)
  const categoriesRows = toSheetRows(workbook, 'Exercise Categories', xlsx)

  const muscleGroupByExercise = new Map<string, string>()
  const weightedNames = new Set<string>()
  const bodyweightNames = new Set<string>()
  const drillNames = new Set<string>()

  const addMuscleMapping = (name: string, muscleGroup: string) => {
    const key = normalizeKey(name)
    if (!key) return
    if (!muscleGroupByExercise.has(key)) {
      muscleGroupByExercise.set(key, muscleGroup)
    }
  }

  let currentGroup = ''
  for (const row of weightedRows) {
    const groupValue = toStringValue(row['Muscle Group'])
    if (groupValue) currentGroup = groupValue
    const exercise = toStringValue(row['Exercise'])
    if (!exercise) continue
    weightedNames.add(exercise)
    addMuscleMapping(exercise, currentGroup)
  }

  currentGroup = ''
  for (const row of bodyweightRows) {
    const groupValue = toStringValue(row['Muscle Group'])
    if (groupValue) currentGroup = groupValue
    const exercise = toStringValue(row['Exercise'])
    if (!exercise) continue
    bodyweightNames.add(exercise)
    addMuscleMapping(exercise, currentGroup)
  }

  currentGroup = ''
  for (const row of drillRows) {
    const groupValue = toStringValue(row['Muscle Group'])
    if (groupValue) currentGroup = groupValue
    const drill = toStringValue(row['Drill'])
    if (!drill) continue
    drillNames.add(drill)
    addMuscleMapping(drill, currentGroup)
  }

  currentGroup = ''
  for (const row of categoriesRows) {
    const groupValue = toStringValue(row['Muscle Group'])
    if (groupValue) currentGroup = groupValue
    const weightedItems = splitTopLevelCommaList(toStringValue(row['Weighted Exercises']))
    const bodyweightItems = splitTopLevelCommaList(toStringValue(row['Bodyweight Exercises']))
    const drillsItems = splitTopLevelCommaList(toStringValue(row['Drills']))
    for (const entry of weightedItems) {
      weightedNames.add(entry)
      addMuscleMapping(entry, currentGroup)
    }
    for (const entry of bodyweightItems) {
      bodyweightNames.add(entry)
      addMuscleMapping(entry, currentGroup)
    }
    for (const entry of drillsItems) {
      drillNames.add(entry)
      addMuscleMapping(entry, currentGroup)
    }
  }

  const athletes: ParsedAthlete[] = []
  const exerciseCandidates = new Map<string, ExerciseCandidate>()
  const athleteLinks: AthleteLink[] = []
  const athleteExerciseIndex = new Set<string>()
  const drillNameSet = new Set<string>(drillNames)

  const registerExercise = (
    sport: SportType,
    name: string,
    isWeighted: boolean
  ) => {
    if (!isLikelyExerciseName(name)) return
    const normalized = normalizeKey(name)
    if (!normalized) return
    const key = `${sport}::${normalized}`
    const muscleGroup = muscleGroupByExercise.get(normalized) ?? null
    const category = mapMuscleGroupToCategory(muscleGroup, name)
    const existing = exerciseCandidates.get(key)
    if (!existing) {
      exerciseCandidates.set(key, {
        key,
        name,
        sport,
        category,
        isWeighted,
        muscleGroups: new Set(muscleGroup ? [muscleGroup] : []),
      })
      return
    }
    existing.isWeighted = existing.isWeighted || isWeighted
    if (muscleGroup) {
      existing.muscleGroups.add(muscleGroup)
    }
  }

  for (const row of athletesRows) {
    const name = toStringValue(row['Name'])
    if (!name) continue

    const profession = toStringValue(row['Profession'])
    const weightValue = toStringValue(row['Weight'])
    const weighted = new Set(splitTopLevelCommaList(toStringValue(row['Weighted Exercises'])))
    const bodyweight = new Set(splitTopLevelCommaList(toStringValue(row['Bodyweight Exercises'])))
    const drills = new Set(splitTopLevelCommaList(toStringValue(row['Drills'])))
    const allExercises = new Set(
      unique([
        ...splitTopLevelCommaList(toStringValue(row['Exercises'])),
        ...Array.from(weighted),
        ...Array.from(bodyweight),
        ...Array.from(drills),
      ])
    )

    for (const drillName of drills) {
      drillNameSet.add(drillName)
    }
    for (const weightedName of weighted) {
      weightedNames.add(weightedName)
    }
    for (const bodyName of bodyweight) {
      bodyweightNames.add(bodyName)
    }

    const sport = inferSport(profession)
    const athlete: ParsedAthlete = {
      name,
      sport,
      profession,
      weight: weightValue || null,
      nationality: extractNationality(profession),
      weighted,
      bodyweight,
      drills,
      allExercises,
    }
    athletes.push(athlete)

    for (const exerciseName of allExercises) {
      if (!isLikelyExerciseName(exerciseName)) continue
      const normalized = normalizeKey(exerciseName)
      if (!normalized) continue
      const isWeighted = weighted.has(exerciseName) || weightedNames.has(exerciseName)
      registerExercise(sport, exerciseName, isWeighted)

      const priority = weighted.has(exerciseName)
        ? 9
        : bodyweight.has(exerciseName)
          ? 7
          : drills.has(exerciseName)
            ? 6
            : 5

      const linkKey = `${name}::${sport}::${normalized}`
      if (athleteExerciseIndex.has(linkKey)) continue
      athleteExerciseIndex.add(linkKey)
      athleteLinks.push({
        athleteName: name,
        sport,
        exerciseName,
        priority,
        note: drills.has(exerciseName) ? 'Imported drill protocol from Dagestan discipline workbook.' : null,
      })
    }
  }

  // Ensure sheet-level entries not explicitly linked to athletes are still present in the library.
  const registerSheetEntries = (names: Set<string>, weightedFlag: boolean) => {
    for (const name of names) {
      if (!isLikelyExerciseName(name)) continue
      if (!name.trim()) continue
      const normalized = normalizeKey(name)
      if (!normalized) continue
      const sport = inferSport(name)
      registerExercise(sport, name, weightedFlag)
    }
  }
  registerSheetEntries(weightedNames, true)
  registerSheetEntries(bodyweightNames, false)
  registerSheetEntries(drillNames, false)

  const drillCandidatesMap = new Map<string, DrillCandidate>()
  for (const name of drillNameSet) {
    const normalized = normalizeKey(name)
    if (!normalized) continue
    const muscleGroup = muscleGroupByExercise.get(normalized) ?? null
    const muscleCategory = mapMuscleGroupToCategory(muscleGroup, name)
    const category = inferDrillCategory(name)
    const subcategory = inferDrillSubcategory(name, category, muscleCategory)
    const candidate: DrillCandidate = {
      id: stableDrillId(name),
      name,
      category,
      subcategory,
      sportRelevance: inferDrillSports(name),
      musclesWorked: muscleGroup ? [muscleGroup] : [],
    }
    drillCandidatesMap.set(candidate.id, candidate)
  }

  return {
    athletes,
    exerciseCandidates,
    athleteLinks,
    drillCandidates: Array.from(drillCandidatesMap.values()),
  }
}

async function main(): Promise<void> {
  const workbookArg = process.argv[2]?.trim()
  if (workbookArg === '--help' || workbookArg === '-h') {
    printUsage()
    return
  }

  const workbookPath = resolveWorkbookPath(workbookArg, process.env.DAGESTAN_DISCIPLINE_XLSX_PATH)
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const parsed = await parseWorkbook(workbookPath)
  console.log('[Import] Admin-only workflow. Not used by app runtime or CI.')
  console.log(`[Import] Workbook: ${workbookPath}`)
  console.log(`[Import] Athletes parsed: ${parsed.athletes.length}`)
  console.log(`[Import] Exercise candidates parsed: ${parsed.exerciseCandidates.size}`)
  console.log(`[Import] Drill candidates parsed: ${parsed.drillCandidates.length}`)

  const { data: existingAthletesRaw, error: existingAthletesError } = await supabase
    .from('athletes')
    .select('id, name, sport')

  if (existingAthletesError) {
    throw new Error(`Failed to load existing athletes: ${existingAthletesError.message}`)
  }

  const athleteIdsByName = new Map<string, string>()
  for (const row of (existingAthletesRaw ?? []) as ExistingAthlete[]) {
    athleteIdsByName.set(normalizeKey(row.name), row.id)
  }

  let athletesInserted = 0
  let athletesUpdated = 0

  for (const athlete of parsed.athletes) {
    const key = normalizeKey(athlete.name)
    const existingId = athleteIdsByName.get(key)
    const achievements = unique([athlete.profession, athlete.weight ? `Weight class: ${athlete.weight}` : ''].filter(Boolean))
    const bio = `${athlete.profession}${athlete.weight ? ` · ${athlete.weight}` : ''}`
    if (existingId) {
      const { error } = await supabase
        .from('athletes')
        .update({
          sport: athlete.sport,
          nationality: athlete.nationality,
          achievements,
          bio,
        })
        .eq('id', existingId)
      if (error) {
        throw new Error(`Failed to update athlete "${athlete.name}": ${error.message}`)
      }
      athletesUpdated += 1
      continue
    }

    const { data, error } = await supabase
      .from('athletes')
      .insert({
        name: athlete.name,
        sport: athlete.sport,
        nationality: athlete.nationality,
        achievements,
        bio,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      throw new Error(`Failed to insert athlete "${athlete.name}": ${error?.message ?? 'Unknown error'}`)
    }
    athleteIdsByName.set(key, data.id)
    athletesInserted += 1
  }

  const { data: existingExercisesRaw, error: existingExercisesError } = await supabase
    .from('exercises')
    .select('id, name, sport, category, is_weighted, muscle_groups, description')

  if (existingExercisesError) {
    throw new Error(`Failed to load existing exercises: ${existingExercisesError.message}`)
  }

  const existingExercisesByKey = new Map<string, ExistingExercise>()
  const existingExercisesByName = new Map<string, ExistingExercise[]>()
  for (const exercise of (existingExercisesRaw ?? []) as ExistingExercise[]) {
    const nameKey = normalizeKey(exercise.name)
    const compositeKey = `${exercise.sport ?? '*'}::${nameKey}`
    existingExercisesByKey.set(compositeKey, exercise)
    const list = existingExercisesByName.get(nameKey) ?? []
    list.push(exercise)
    existingExercisesByName.set(nameKey, list)
  }

  const exerciseIdsByCompositeKey = new Map<string, string>()
  let exercisesInserted = 0
  let exercisesUpdated = 0

  for (const candidate of parsed.exerciseCandidates.values()) {
    const nameKey = normalizeKey(candidate.name)
    const compositeKey = `${candidate.sport}::${nameKey}`
    const byExactSport = existingExercisesByKey.get(compositeKey)
    const fallback = existingExercisesByName.get(nameKey)?.[0]
    const existing = byExactSport ?? fallback
    const muscleGroups = Array.from(candidate.muscleGroups)
    const generatedDescription = generateExerciseDescription({
      name: candidate.name,
      category: candidate.category,
      muscleGroups,
      isWeighted: candidate.isWeighted,
      equipment: candidate.isWeighted ? ['weights'] : ['bodyweight'],
      sport: candidate.sport,
    })

    if (existing) {
      const mergedMuscles = unique([...(existing.muscle_groups ?? []), ...muscleGroups])
      const nextDescription = shouldReplaceExerciseDescription(existing.description)
        ? generatedDescription
        : existing.description
      const { error } = await supabase
        .from('exercises')
        .update({
          sport: existing.sport ?? candidate.sport,
          category: existing.category || candidate.category,
          is_weighted: (existing.is_weighted ?? false) || candidate.isWeighted,
          muscle_groups: mergedMuscles,
          athlete_specific: true,
          equipment: ((existing.is_weighted ?? false) || candidate.isWeighted) ? ['weights'] : ['bodyweight'],
          description: nextDescription,
        })
        .eq('id', existing.id)
      if (error) {
        throw new Error(`Failed to update exercise "${candidate.name}": ${error.message}`)
      }
      exerciseIdsByCompositeKey.set(compositeKey, existing.id)
      exercisesUpdated += 1
      continue
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: candidate.name,
        sport: candidate.sport,
        category: candidate.category,
        is_weighted: candidate.isWeighted,
        muscle_groups: muscleGroups,
        athlete_specific: true,
        equipment: candidate.isWeighted ? ['weights'] : ['bodyweight'],
        description: generatedDescription,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      throw new Error(`Failed to insert exercise "${candidate.name}": ${error?.message ?? 'Unknown error'}`)
    }
    exerciseIdsByCompositeKey.set(compositeKey, data.id)
    exercisesInserted += 1
  }

  const anchorsBySport = new Map<SportType, string>()
  for (const athlete of parsed.athletes) {
    if (anchorsBySport.has(athlete.sport)) continue
    const athleteId = athleteIdsByName.get(normalizeKey(athlete.name))
    if (athleteId) anchorsBySport.set(athlete.sport, athleteId)
  }

  const linkedCompositeKeys = new Set<string>()
  const athleteExerciseRows: Array<{
    athlete_id: string
    exercise_id: string
    priority: number
    notes: string | null
  }> = []

  for (const link of parsed.athleteLinks) {
    const athleteId = athleteIdsByName.get(normalizeKey(link.athleteName))
    const exerciseKey = `${link.sport}::${normalizeKey(link.exerciseName)}`
    const exerciseId = exerciseIdsByCompositeKey.get(exerciseKey)
    if (!athleteId || !exerciseId) continue
    linkedCompositeKeys.add(exerciseKey)
    athleteExerciseRows.push({
      athlete_id: athleteId,
      exercise_id: exerciseId,
      priority: link.priority,
      notes: link.note,
    })
  }

  // Ensure sheet-level exercise entries are visible in app by linking unassigned entries to one anchor athlete per sport.
  for (const candidate of parsed.exerciseCandidates.values()) {
    if (linkedCompositeKeys.has(candidate.key)) continue
    const anchorAthleteId = anchorsBySport.get(candidate.sport)
    const exerciseId = exerciseIdsByCompositeKey.get(candidate.key)
    if (!anchorAthleteId || !exerciseId) continue
    athleteExerciseRows.push({
      athlete_id: anchorAthleteId,
      exercise_id: exerciseId,
      priority: 4,
      notes: 'Imported from workbook exercise catalog.',
    })
  }

  let athleteLinksUpserted = 0
  for (const batch of chunk(athleteExerciseRows, 500)) {
    const { error } = await supabase
      .from('athlete_exercises')
      .upsert(batch, { onConflict: 'athlete_id,exercise_id' })
    if (error) {
      throw new Error(`Failed to upsert athlete_exercises batch: ${error.message}`)
    }
    athleteLinksUpserted += batch.length
  }

  const drillRows = parsed.drillCandidates.map((drill) => ({
    id: drill.id,
    name: drill.name,
    category: drill.category,
    subcategory: drill.subcategory,
    duration: 90,
    difficulty: 'intermediate',
    sport_relevance: drill.sportRelevance,
    description: 'Imported from Dagestan discipline workbook',
    benefits: ['Combat-specific coordination', 'Conditioning and technical sharpness'],
    instructions: ['Perform with controlled technique.', 'Maintain quality movement and steady breathing.'],
    muscles_worked: drill.musclesWorked.length > 0 ? drill.musclesWorked : null,
    equipment: ['none'],
    is_premium: false,
  }))

  let drillsUpserted = 0
  for (const batch of chunk(drillRows, 300)) {
    const { error } = await supabase
      .from('drills')
      .upsert(batch, { onConflict: 'id' })
    if (error) {
      throw new Error(`Failed to upsert drills batch: ${error.message}`)
    }
    drillsUpserted += batch.length
  }

  console.log('\n[Import] Completed successfully')
  console.log(`[Import] Athletes inserted: ${athletesInserted}`)
  console.log(`[Import] Athletes updated: ${athletesUpdated}`)
  console.log(`[Import] Exercises inserted: ${exercisesInserted}`)
  console.log(`[Import] Exercises updated: ${exercisesUpdated}`)
  console.log(`[Import] Athlete-Exercise links upserted: ${athleteLinksUpserted}`)
  console.log(`[Import] Drills upserted: ${drillsUpserted}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n[Import] FAILED: ${message}`)
  process.exit(1)
})
