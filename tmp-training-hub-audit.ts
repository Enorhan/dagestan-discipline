import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

type Row = Record<string, any>

const hasAnyProtocol = (row: Row) => [row.reps, row.sets, row.weight, row.duration, row.frequency, row.notes]
  .some((value) => Boolean(value && String(value).trim().length > 0))

const normalizeExerciseName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

async function run() {
  const [
    { data: athletes },
    { data: links },
    { data: exercises },
    { data: drills },
    { data: routines },
    { data: paths }
  ] = await Promise.all([
    supabase.from('athletes').select('id,name,sport,nationality,achievements,bio,image_url,source_attribution,confidence_score').order('name'),
    supabase.from('athlete_exercises').select('id,athlete_id,exercise_id,priority,notes,reps,sets,weight,duration,frequency,source_attribution,confidence_score'),
    supabase.from('exercises').select('id,name,sport,category,description,equipment,video_url,is_weighted,source_attribution,confidence_score').order('name'),
    supabase.from('drills').select('id,name,category,subcategory,sport_relevance').order('name'),
    supabase.from('routines').select('id,name,type,duration,description,for_sport,for_workout_focus').order('name'),
    supabase.from('learning_paths').select('id,name,sport,difficulty,description,estimated_weeks').order('name')
  ])

  const athleteRows = athletes ?? []
  const linkRows = links ?? []
  const exerciseRows = exercises ?? []
  const drillRows = drills ?? []

  const byAthlete = new Map(athleteRows.map((row: Row) => [row.id, row]))
  const byExercise = new Map(exerciseRows.map((row: Row) => [row.id, row]))

  console.log('counts', {
    athletes: athleteRows.length,
    athlete_exercises: linkRows.length,
    exercises: exerciseRows.length,
    drills: drillRows.length,
    routines: (routines ?? []).length,
    learning_paths: (paths ?? []).length,
  })

  const exactAthletes = athleteRows.filter((row: Row) =>
    ['Adonis Diaz', 'Alex Turner', 'Source Coach (Wrestling)', 'Source Coach (Judo)', 'Source Coach (Ju Jitsu)'].includes(row.name)
  )

  console.log('exact_named_athletes', exactAthletes.map((row: Row) => ({
    id: row.id,
    name: row.name,
    sport: row.sport,
    achievements_count: Array.isArray(row.achievements) ? row.achievements.length : 0,
    has_bio: Boolean(row.bio),
    has_image: Boolean(row.image_url),
    confidence_score: row.confidence_score,
  })))

  for (const athleteName of ['Adonis Diaz', 'Alex Turner', 'Source Coach (Wrestling)', 'Source Coach (Judo)', 'Source Coach (Ju Jitsu)']) {
    const athlete = athleteRows.find((row: Row) => row.name === athleteName)
    if (!athlete) {
      console.log('athlete_links', athleteName, 0)
      continue
    }

    const athleteLinks = linkRows
      .filter((row: Row) => row.athlete_id === athlete.id)
      .map((row: Row) => {
        const exercise = byExercise.get(row.exercise_id)
        return {
          link_id: row.id,
          exercise: exercise?.name ?? null,
          sport: exercise?.sport ?? null,
          category: exercise?.category ?? null,
          priority: row.priority,
          has_protocol_fields: hasAnyProtocol(row),
        }
      })

    console.log('athlete_links', athleteName, athleteLinks.length)
    console.log('athlete_links_sample', athleteLinks.slice(0, 20))
  }

  const sourceCoachLinks = linkRows
    .map((row: Row) => ({ row, athlete: byAthlete.get(row.athlete_id), exercise: byExercise.get(row.exercise_id) }))
    .filter(({ athlete }) => Boolean(athlete && /^Source Coach \((Wrestling|Judo|Ju Jitsu)\)$/i.test(String(athlete.name))))

  console.log('source_coach_links_count', sourceCoachLinks.length)

  const sourceCoachLinksWithoutProtocol = sourceCoachLinks
    .filter(({ row }) => !hasAnyProtocol(row))
    .map(({ row, athlete, exercise }) => ({
      link_id: row.id,
      athlete: athlete?.name,
      exercise: exercise?.name,
      sport: exercise?.sport,
      category: exercise?.category,
      priority: row.priority,
    }))

  console.log('source_coach_links_without_protocol_count', sourceCoachLinksWithoutProtocol.length)
  console.log('source_coach_links_without_protocol_sample', sourceCoachLinksWithoutProtocol.slice(0, 25))

  const lowInfoLinks = linkRows
    .map((row: Row) => ({ row, athlete: byAthlete.get(row.athlete_id), exercise: byExercise.get(row.exercise_id) }))
    .filter(({ row, exercise }) => Boolean(exercise) && !hasAnyProtocol(row))
    .map(({ row, athlete, exercise }) => ({
      link_id: row.id,
      athlete: athlete?.name,
      exercise: exercise?.name,
      sport: exercise?.sport,
      category: exercise?.category,
      priority: row.priority,
    }))

  console.log('all_low_info_links_count', lowInfoLinks.length)
  console.log('all_low_info_links_sample', lowInfoLinks.slice(0, 25))

  const duplicateMap = new Map<string, { sport: string | null; normalized: string; names: Set<string>; ids: string[] }>()

  for (const exercise of exerciseRows) {
    const normalized = normalizeExerciseName(String(exercise.name ?? ''))
    const key = `${exercise.sport ?? 'none'}::${normalized}`
    const current = duplicateMap.get(key)
    if (!current) {
      duplicateMap.set(key, {
        sport: exercise.sport ?? null,
        normalized,
        names: new Set([exercise.name]),
        ids: [exercise.id],
      })
      continue
    }

    current.names.add(exercise.name)
    current.ids.push(exercise.id)
  }

  const duplicateExercises = Array.from(duplicateMap.values())
    .filter((entry) => entry.ids.length > 1)
    .map((entry) => ({
      sport: entry.sport,
      normalized: entry.normalized,
      count: entry.ids.length,
      names: Array.from(entry.names),
    }))
    .sort((a, b) => b.count - a.count)

  console.log('duplicate_exercise_name_groups', duplicateExercises.length)
  console.log('duplicate_exercise_name_groups_sample', duplicateExercises.slice(0, 30))

  const drillCountsByCategory = new Map<string, number>()
  for (const drill of drillRows) {
    const key = String(drill.category)
    drillCountsByCategory.set(key, (drillCountsByCategory.get(key) ?? 0) + 1)
  }
  console.log('drill_counts_by_category', Object.fromEntries(drillCountsByCategory.entries()))

  const exerciseCountsBySportCategory = new Map<string, number>()
  for (const exercise of exerciseRows) {
    const key = `${exercise.sport ?? 'none'}::${exercise.category}`
    exerciseCountsBySportCategory.set(key, (exerciseCountsBySportCategory.get(key) ?? 0) + 1)
  }
  console.log('exercise_counts_by_sport_category', Object.fromEntries(exerciseCountsBySportCategory.entries()))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
