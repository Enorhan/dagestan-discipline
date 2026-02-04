import { AthleteExerciseGroup, ExerciseCategory, SportType } from './types'

const athleteExerciseLibrary: Record<SportType, AthleteExerciseGroup[]> = {
  wrestling: [
    {
      athlete: 'Aleksandr Karelin',
      sport: 'wrestling',
      exercises: [
        'Rodd i timmar',
        'Löpning genom skogen med en stock på ryggen',
        'Overhead press (190 kg)',
        'Träning med 32 kg kettlebells',
        'Zercher-marklyft (10 reps på 200 kg)',
        'Bänkpress (204 kg+)',
        'Chin-ups (50 reps på 1 minut)',
        'Pull-ups (upp till 42 reps)',
        'Backflips och splits',
        'Bära ett kylskåp uppför trappor',
        'Hopp-knäböj (jump squats)',
        'Björngång (bear crawls) i backe',
        'Duck walks',
        'Zercher-marscher samt nackbryggning'
      ]
    },
    {
      athlete: 'Jordan Burroughs',
      sport: 'wrestling',
      exercises: [
        'Air Dyne-sprintar (20s spurt/40s vila)',
        'Pull-ups (viktade och vanliga)',
        'Band step and press',
        'Chin-ups',
        'Band snap downs',
        'Battle rope (alternate steps och double slams)',
        'Stance- och rörelseövningar',
        'Brottningsdriller',
        'Träning med Weck Method Clubs (plank drivers, low swipes, lateral mills)',
        'Burpee jumping high pull',
        'Marklyft (dumbbell deadlift)',
        'Single arm coiled high pull',
        'Bailer',
        'Hinge curls',
        'Knästående hopp med Bulgarian Bag',
        'Knästående boxhopp',
        'Släd-dragslunges',
        'Chest supported row',
        'Benkomplex (utfall och hopp)',
        'Medicinbolls-slams',
        'Dumbbell pummel curls',
        'Slider side lunges med kettlebell',
        'L-sit pull-up',
        'Split jumps',
        'Dumbbell clean and press',
        'Tuck crunches',
        'Dumbbell Romanian deadlift',
        'Split hinge pulse',
        'Renegade row och greppträning med Captains of Crush'
      ]
    },
    {
      athlete: 'Abdulrashid Sadulaev',
      sport: 'wrestling',
      exercises: [
        'Träning med Dopa-band (skott, sprawl-försvar, hand-fighting)',
        'Burpee box jumps',
        'Partner carries',
        'Djurinspirerade rörelser som björngång och army crawls',
        'Penetration steps',
        'Duck walks',
        'Hopp-knäböj',
        'Sprinter',
        'Benlös repklättring',
        'Armhävningar',
        'Resistance band snap-downs',
        'Nackbryggning och rörelsedriller'
      ]
    },
    {
      athlete: 'Kyle Snyder',
      sport: 'wrestling',
      exercises: [
        'Tung bänkpress (180 kg)',
        'Sittande strikt axelpress',
        'Push-press',
        'Viktade chin-ups',
        'Pin squats och pin presses'
      ]
    },
    {
      athlete: 'Zaurbek Sidakov',
      sport: 'wrestling',
      exercises: [
        'Dynamisk uppvärmning',
        'Takedown-driller (triple extension focus)',
        'Knäböj',
        'Zercher-marklyft',
        'Bänkpress',
        'Frivändningar (cleans)',
        'Ryck (snatch)',
        'Viktade hopp',
        'Outside step och split step'
      ]
    },
    {
      athlete: 'Cael Sanderson',
      sport: 'wrestling',
      exercises: [
        '50 pull-ups varje dag',
        'Frivändningar (power cleans)',
        'Väggsittning',
        'Repklättring',
        'Sprinter och axelpress'
      ]
    },
    {
      athlete: 'Dan Gable',
      sport: 'wrestling',
      exercises: [
        'Löpning (18 varv med ökande tempo)',
        'Repklättring',
        'Chin-ups',
        'Armhävningar',
        'Skuggbrottning',
        'Reaktionsdriller och "knockouts" (sprawl-drills)'
      ]
    },
    {
      athlete: 'Kyle Dake',
      sport: 'wrestling',
      exercises: [
        'Functional Patterns (FP)',
        'Kabelmaskinsarbete',
        'Kettlebell-övningar för bröstryggsrörlighet',
        'Landmine rotations och face pulls'
      ]
    },
    {
      athlete: 'David Taylor',
      sport: 'wrestling',
      exercises: [
        'Movement prep',
        'Isometrisk styrka',
        'Greppträning',
        'Enbent Romanian deadlift (RDL) och plankan'
      ]
    },
    {
      athlete: 'Mijain Lopez',
      sport: 'wrestling',
      exercises: [
        'Hand-fighting (arm-drags, snap-downs)',
        'Par terre-försvar och högvolymsträning'
      ]
    },
    {
      athlete: 'Randy Couture',
      sport: 'wrestling',
      exercises: [
        'Skivstångscirkel',
        'Explosiva armhävningar över box',
        'Boxhopp',
        'Hopprep',
        'Pull-ups och visualisering'
      ]
    }
  ],
  judo: [
    {
      athlete: 'Shohei Ono',
      sport: 'judo',
      exercises: [
        'Frivändning och stöt (Clean & Jerk)',
        'Knäböj (Back/Front squats)',
        'Hopp-knäböj',
        'Viktade step-ups',
        'Band-uchikomi',
        'Repklättring',
        'Farmer carries',
        'Bänkpress',
        'Skivstångsrodd',
        'Axelpress',
        'Pull-ups',
        'Medicinbolls-slams',
        'Släd-push',
        'Bounding-driller',
        'Isometriska uchikomi-håll',
        'Wrist roller och gi sleeve pulls'
      ]
    },
    {
      athlete: 'Teddy Riner',
      sport: 'judo',
      exercises: [
        'Bänkpress (150–230 kg)',
        'Enarmsmarklyft (50–60 kg)',
        'HIIT på trappmaskin',
        'Pull-ups',
        'Hopprep',
        'Sittande kabelrodd',
        'Armhävningar',
        'Crunches med rotation och hamstringsträning'
      ]
    },
    {
      athlete: 'Masahiko Kimura',
      sport: 'judo',
      exercises: [
        '1 000 armhävningar (Hindu push-ups)',
        '1 km grodhopp (bunny hops)',
        'Huvudstående mot vägg',
        'Enarms skivstångspress',
        'Bänkpress',
        '200 sit-ups från partners rygg',
        '200 partner-viktade knäböj',
        '500 Shuto (slag)',
        'Osoto Gari mot ett träd i en timme dagligen och randori'
      ]
    },
    {
      athlete: 'Kayla Harrison',
      sport: 'judo',
      exercises: [
        'Frivändningar',
        'Frontböj',
        'Push jerks',
        'Repklättring (med pull-ups)',
        'Släd-push/pull',
        'Medicinbolls-armhävningar',
        'V-ups',
        'Medicinbolls-V-sit twists',
        'Band-uchikomi och triangle turtle turnovers'
      ]
    },
    {
      athlete: 'Uta Abe',
      sport: 'judo',
      exercises: [
        'Snabbhet i fotarbete',
        'Resistance band uchikomi',
        'Assault Bike',
        'Avancerade plankvariationer',
        'Boxhopp och hopp-knäböj'
      ]
    },
    {
      athlete: 'An Changrim',
      sport: 'judo',
      exercises: [
        'Back Squat (215 kg)',
        'Bänkpress (150 kg) och power cleans (130 kg)'
      ]
    },
    {
      athlete: 'An Baul',
      sport: 'judo',
      exercises: [
        'Knäböj',
        'Marklyft',
        'Frivändningar',
        'Dragövningar och bänkpress'
      ]
    },
    {
      athlete: 'Gwak Donghan',
      sport: 'judo',
      exercises: [
        'Marklyft',
        'Knäböj',
        'Repklättring och pull-ups med gi-grepp'
      ]
    },
    {
      athlete: 'Cho Guham',
      sport: 'judo',
      exercises: [
        'Knäböj och frivändningar'
      ]
    },
    {
      athlete: 'Satoshi Ishii',
      sport: 'judo',
      exercises: [
        'Chest-to-chest dragövningar (kabel eller partner) och kettlebell-svingar'
      ]
    },
    {
      athlete: 'Shintaro Higashi',
      sport: 'judo',
      exercises: [
        'Cirkelträning för ne-waza (guard-passeringar, triangelattacker)'
      ]
    },
    {
      athlete: 'Travis Stevens',
      sport: 'judo',
      exercises: [
        'Driller för fotsvep (solo)',
        'Timing-driller med handdrag och gi-svepsdriller'
      ]
    },
    {
      athlete: 'Hifumi Abe',
      sport: 'judo',
      exercises: [
        'Solo tekniska driller och rörlighetsträning för höft och fotled'
      ]
    }
  ],
  bjj: [
    {
      athlete: 'Gordon Ryan',
      sport: 'bjj',
      exercises: [
        'Hypertrofiträning (4x20 reps)',
        'Drop-set',
        'Superset',
        'Bänkpress (flat/incline)',
        'Floor press',
        'Trap bar deadlift',
        'T-bar rows',
        'Pull-ups (viktade)',
        'Hantelrodd',
        'Hantel-shrugs',
        'Arnold press',
        'Axeltryck',
        'Lateral raises',
        'Front/rear delt raises',
        'Bicep/hammer/concentration curls',
        'Skull crushers',
        'Kickbacks',
        'Diamond pushups',
        'Triceps pushdowns',
        'Walking lunges',
        'Knäböj',
        'GHD-situps',
        'Hanging leg raises',
        'Windshield wipers',
        'Gymnastik och positionsdriller'
      ]
    },
    {
      athlete: 'Marcus "Buchecha" Almeida',
      sport: 'bjj',
      exercises: [
        'Medball pushup switches',
        'Medball V-ups',
        'Banded lateral side pulls',
        'Medball mountain climbers',
        'Medball burpees',
        'Medball Russian twists',
        'Medball lunge to rotation',
        'Donkey kicks och prisoner jacks'
      ]
    },
    {
      athlete: 'Roger Gracie',
      sport: 'bjj',
      exercises: [
        'Olympic clean and press',
        'Hill sprints (backintervaller)',
        'Overhead squat',
        'Positionssparring (5 minuters scenarier) och bänkpress'
      ]
    },
    {
      athlete: 'Andre Galvao',
      sport: 'bjj',
      exercises: [
        'Plyometrisk cirkel (cone jumps, laterala hopp, gorilla jumps) och kettlebell-svingar'
      ]
    },
    {
      athlete: 'Tomoyuki Hashimoto',
      sport: 'bjj',
      exercises: [
        'Berimbolo-driller',
        'Inverted guard drills',
        'Spider guard-repetitioner och core-träning för passeringar'
      ]
    },
    {
      athlete: 'Shinya Aoki',
      sport: 'bjj',
      exercises: [
        'Flying armbar-repetitioner',
        'Triangle leg-smothering och driller för heel hooks/ankle locks'
      ]
    },
    {
      athlete: 'Mikey Musumeci',
      sport: 'bjj',
      exercises: [
        'Extrem teknisk drilling (upp till 12h/dag) och Muay Thai-träning'
      ]
    },
    {
      athlete: 'Marcelo Garcia',
      sport: 'bjj',
      exercises: [
        'Högvolyms-sparring och fokus på rörliga sekvenser (scrambles)'
      ]
    },
    {
      athlete: 'Yuki Nakai',
      sport: 'bjj',
      exercises: [
        'Nanatei Kosen Judo och Shooto wrestling-driller'
      ]
    },
    {
      athlete: 'Rikako Yuasa',
      sport: 'bjj',
      exercises: [
        'Dynamisk och offensiv guard-träning'
      ]
    }
  ]
}

const keywordSets: Array<{ category: ExerciseCategory; keywords: string[] }> = [
  {
    category: 'neck',
    keywords: ['nackbrygg', 'neck bridge', 'nacke', 'neck', 'huvudstående', 'headstand']
  },
  {
    category: 'core',
    keywords: [
      'plank',
      'plankan',
      'sit-up',
      'situps',
      'crunch',
      'v-up',
      'v-ups',
      'v-sit',
      'rotation',
      'rotations',
      'twist',
      'twists',
      'windshield',
      'leg raise',
      'leg raises',
      'core',
      'tuck crunch',
      'triangle turtle',
      'v-sit'
    ]
  },
  {
    category: 'chest',
    keywords: [
      'bench',
      'bänkpress',
      'push-up',
      'pushups',
      'armhäv',
      'floor press',
      'diamond pushup',
      'medball pushup',
      'medicinbolls-armhäv',
      'chest'
    ]
  },
  {
    category: 'shoulders',
    keywords: [
      'overhead',
      'axel',
      'shoulder',
      'arnold',
      'lateral raise',
      'delt',
      'face pull',
      'landmine',
      'push press',
      'axelpress',
      'shoulder press'
    ]
  },
  {
    category: 'back',
    keywords: [
      'row',
      'rodd',
      't-bar',
      't bar',
      'skivstångsrodd',
      'pull-up',
      'pull ups',
      'chin-up',
      'chin ups',
      'rope climb',
      'repklättring',
      'lat',
      'lats',
      'upper back',
      'gi pull',
      'gi sleeve',
      'shrug',
      'shrugs'
    ]
  },
  {
    category: 'arms',
    keywords: [
      'curl',
      'bicep',
      'tricep',
      'hammer',
      'skull crusher',
      'pushdown',
      'kickback',
      'forearm',
      'grip',
      'captains of crush',
      'wrist roller'
    ]
  },
  {
    category: 'legs',
    keywords: [
      'squat',
      'knäböj',
      'deadlift',
      'marklyft',
      'lunge',
      'lunges',
      'step-up',
      'step ups',
      'step-ups',
      'jump',
      'hopp',
      'duck walk',
      'split jump',
      'walking lunge',
      'boxhopp',
      'hill sprints',
      'backintervaller',
      'sprinter',
      'sprint',
      'sled',
      'släd',
      'kettlebell-sving',
      'kettlebell swing'
    ]
  },
  {
    category: 'full-body',
    keywords: [
      'burpee',
      'circuit',
      'cirkel',
      'carry',
      'carries',
      'farmer',
      'farmers',
      'kettlebell',
      'clean',
      'snatch',
      'jerk',
      'battle rope',
      'air dyne',
      'assault bike',
      'hiit',
      'hopprep',
      'jump rope',
      'löpning',
      'trappmaskin',
      'bounding',
      'grodhopp',
      'bunny hops',
      'medball',
      'medicinboll',
      'slam',
      'slams',
      'gymnastik',
      'drill',
      'driller',
      'uchikomi',
      'sparring',
      'positionssparring',
      'hand-fighting',
      'handdrag',
      'takedown',
      'par terre',
      'shadow',
      'skuggbrottning',
      'stance',
      'guard',
      'berimbolo',
      'osoto gari',
      'randori',
      'scramble',
      'foot sweep',
      'fotsvep',
      'snap-down',
      'arm-drags',
      'sprawl',
      'penetration steps',
      'movement prep',
      'isometrisk',
      'visualisering'
    ]
  }
]

export function getExerciseCategory(exerciseName: string): ExerciseCategory {
  const normalized = exerciseName.toLowerCase()
  for (const { category, keywords } of keywordSets) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category
    }
  }
  return 'full-body'
}

const splitOutsideParens = (text: string, separator: string): string[] => {
  const parts: string[] = []
  let buffer = ''
  let depth = 0
  let index = 0

  while (index < text.length) {
    const char = text[index]
    if (char === '(') {
      depth += 1
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (depth === 0 && text.slice(index, index + separator.length) === separator) {
      const trimmed = buffer.trim()
      if (trimmed && !trimmed.endsWith('-')) {
        parts.push(trimmed)
        buffer = ''
        index += separator.length
        continue
      }
    }

    buffer += char
    index += 1
  }

  const last = buffer.trim()
  if (last) {
    parts.push(last)
  }

  return parts.length > 0 ? parts : [text]
}

const splitExercise = (exercise: string): string[] => {
  const separators = [' och ', ' samt ']
  let segments = [exercise]
  for (const separator of separators) {
    segments = segments.flatMap(segment => splitOutsideParens(segment, separator))
  }
  return segments.map(segment => segment.trim()).filter(Boolean)
}

export function getAthleteExercisesBySport(sport: SportType): AthleteExerciseGroup[] {
  const groups = athleteExerciseLibrary[sport] ?? []
  return groups.map(group => {
    const expanded = group.exercises.flatMap(splitExercise)
    const deduped = Array.from(new Set(expanded.map(exercise => exercise.trim())))
    return { ...group, exercises: deduped }
  })
}
