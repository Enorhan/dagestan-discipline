import { AthleteExerciseGroup, ExerciseCategory, SportType } from './types'

const athleteExerciseLibrary: Record<SportType, AthleteExerciseGroup[]> = {
  wrestling: [
    {
      athlete: 'Aleksandr Karelin',
      sport: 'wrestling',
      exercises: [
        'Rowing for hours',
        'Running through forest with log on back',
        'Overhead press (190 kg)',
        'Training with 32 kg kettlebells',
        'Zercher deadlift (10 reps at 200 kg)',
        'Bench press (204 kg+)',
        'Chin-ups (50 reps in 1 minute)',
        'Pull-ups (up to 42 reps)',
        'Backflips and splits',
        'Carrying a refrigerator up stairs',
        'Jump squats',
        'Bear crawls uphill',
        'Duck walks',
        'Zercher carries and neck bridging'
      ]
    },
    {
      athlete: 'Jordan Burroughs',
      sport: 'wrestling',
      exercises: [
        'Air Dyne sprints (20s sprint/40s rest)',
        'Pull-ups (weighted and bodyweight)',
        'Band step and press',
        'Chin-ups',
        'Band snap downs',
        'Battle rope (alternate steps and double slams)',
        'Stance and movement drills',
        'Wrestling drills',
        'Weck Method Clubs training (plank drivers, low swipes, lateral mills)',
        'Burpee jumping high pull',
        'Dumbbell deadlift',
        'Single arm coiled high pull',
        'Bailer',
        'Hinge curls',
        'Kneeling jumps with Bulgarian Bag',
        'Kneeling box jumps',
        'Sled drag lunges',
        'Chest supported row',
        'Leg complex (lunges and jumps)',
        'Medicine ball slams',
        'Dumbbell pummel curls',
        'Slider side lunges with kettlebell',
        'L-sit pull-up',
        'Split jumps',
        'Dumbbell clean and press',
        'Tuck crunches',
        'Dumbbell Romanian deadlift',
        'Split hinge pulse',
        'Renegade row and grip training with Captains of Crush'
      ]
    },
    {
      athlete: 'Abdulrashid Sadulaev',
      sport: 'wrestling',
      exercises: [
        'Dopa-band training (shots, sprawl defense, hand-fighting)',
        'Burpee box jumps',
        'Partner carries',
        'Animal-inspired movements like bear crawls and army crawls',
        'Penetration steps',
        'Duck walks',
        'Jump squats',
        'Sprints',
        'Legless rope climbing',
        'Push-ups',
        'Resistance band snap-downs',
        'Neck bridging and movement drills'
      ]
    },
    {
      athlete: 'Kyle Snyder',
      sport: 'wrestling',
      exercises: [
        'Heavy bench press (180 kg)',
        'Seated strict shoulder press',
        'Push-press',
        'Weighted chin-ups',
        'Pin squats and pin presses'
      ]
    },
    {
      athlete: 'Zaurbek Sidakov',
      sport: 'wrestling',
      exercises: [
        'Dynamic warm-up',
        'Takedown drills (triple extension focus)',
        'Squats',
        'Zercher deadlift',
        'Bench press',
        'Power cleans',
        'Snatch',
        'Weighted jumps',
        'Outside step and split step'
      ]
    },
    {
      athlete: 'Cael Sanderson',
      sport: 'wrestling',
      exercises: [
        '50 pull-ups every day',
        'Power cleans',
        'Wall sit',
        'Rope climbing',
        'Sprints and shoulder press'
      ]
    },
    {
      athlete: 'Dan Gable',
      sport: 'wrestling',
      exercises: [
        'Running (18 laps with increasing tempo)',
        'Rope climbing',
        'Chin-ups',
        'Push-ups',
        'Shadow wrestling',
        'Reaction drills and knockouts (sprawl drills)'
      ]
    },
    {
      athlete: 'Kyle Dake',
      sport: 'wrestling',
      exercises: [
        'Functional Patterns (FP)',
        'Cable machine work',
        'Kettlebell exercises for thoracic mobility',
        'Landmine rotations and face pulls'
      ]
    },
    {
      athlete: 'David Taylor',
      sport: 'wrestling',
      exercises: [
        'Movement prep',
        'Isometric strength training',
        'Grip training',
        'Single-leg Romanian deadlift (RDL) and plank'
      ]
    },
    {
      athlete: 'Mijain Lopez',
      sport: 'wrestling',
      exercises: [
        'Hand-fighting (arm-drags, snap-downs)',
        'Par terre defense and high-volume training'
      ]
    },
    {
      athlete: 'Randy Couture',
      sport: 'wrestling',
      exercises: [
        'Barbell complex',
        'Explosive push-ups over box',
        'Box jumps',
        'Jump rope',
        'Pull-ups and visualization'
      ]
    }
  ],
  judo: [
    {
      athlete: 'Shohei Ono',
      sport: 'judo',
      exercises: [
        'Clean & Jerk',
        'Back/Front squats',
        'Jump squats',
        'Weighted step-ups',
        'Band uchikomi',
        'Rope climbing',
        'Farmer carries',
        'Bench press',
        'Barbell row',
        'Shoulder press',
        'Pull-ups',
        'Medicine ball slams',
        'Sled push',
        'Bounding drills',
        'Isometric uchikomi holds',
        'Wrist roller and gi sleeve pulls'
      ]
    },
    {
      athlete: 'Teddy Riner',
      sport: 'judo',
      exercises: [
        'Bench press (150–230 kg)',
        'Single-arm deadlift (50–60 kg)',
        'HIIT on stair machine',
        'Pull-ups',
        'Jump rope',
        'Seated cable row',
        'Push-ups',
        'Crunches with rotation and hamstring training'
      ]
    },
    {
      athlete: 'Masahiko Kimura',
      sport: 'judo',
      exercises: [
        '1,000 Hindu push-ups',
        '1 km bunny hops',
        'Headstand against wall',
        'Single-arm barbell press',
        'Bench press',
        '200 sit-ups from partner\'s back',
        '200 partner-weighted squats',
        '500 Shuto (strikes)',
        'Osoto Gari against a tree for one hour daily and randori'
      ]
    },
    {
      athlete: 'Kayla Harrison',
      sport: 'judo',
      exercises: [
        'Power cleans',
        'Front squats',
        'Push jerks',
        'Rope climbing (with pull-ups)',
        'Sled push/pull',
        'Medicine ball push-ups',
        'V-ups',
        'Medicine ball V-sit twists',
        'Band uchikomi and triangle turtle turnovers'
      ]
    },
    {
      athlete: 'Uta Abe',
      sport: 'judo',
      exercises: [
        'Footwork speed drills',
        'Resistance band uchikomi',
        'Assault Bike',
        'Advanced plank variations',
        'Box jumps and jump squats'
      ]
    },
    {
      athlete: 'An Changrim',
      sport: 'judo',
      exercises: [
        'Back Squat (215 kg)',
        'Bench press (150 kg) and power cleans (130 kg)'
      ]
    },
    {
      athlete: 'An Baul',
      sport: 'judo',
      exercises: [
        'Squats',
        'Deadlift',
        'Power cleans',
        'Pulling exercises and bench press'
      ]
    },
    {
      athlete: 'Gwak Donghan',
      sport: 'judo',
      exercises: [
        'Deadlift',
        'Squats',
        'Rope climbing and pull-ups with gi grip'
      ]
    },
    {
      athlete: 'Cho Guham',
      sport: 'judo',
      exercises: [
        'Squats and power cleans'
      ]
    },
    {
      athlete: 'Satoshi Ishii',
      sport: 'judo',
      exercises: [
        'Chest-to-chest pulling exercises (cable or partner) and kettlebell swings'
      ]
    },
    {
      athlete: 'Shintaro Higashi',
      sport: 'judo',
      exercises: [
        'Circuit training for ne-waza (guard passes, triangle attacks)'
      ]
    },
    {
      athlete: 'Travis Stevens',
      sport: 'judo',
      exercises: [
        'Foot sweep drills (solo)',
        'Timing drills with hand pulls and gi sweep drills'
      ]
    },
    {
      athlete: 'Hifumi Abe',
      sport: 'judo',
      exercises: [
        'Solo technical drills and mobility training for hip and ankle'
      ]
    }
  ],
  bjj: [
    {
      athlete: 'Gordon Ryan',
      sport: 'bjj',
      exercises: [
        'Hypertrophy training (4x20 reps)',
        'Drop-set',
        'Superset',
        'Bench press (flat/incline)',
        'Floor press',
        'Trap bar deadlift',
        'T-bar rows',
        'Weighted pull-ups',
        'Dumbbell row',
        'Dumbbell shrugs',
        'Arnold press',
        'Shoulder press',
        'Lateral raises',
        'Front/rear delt raises',
        'Bicep/hammer/concentration curls',
        'Skull crushers',
        'Kickbacks',
        'Diamond push-ups',
        'Triceps pushdowns',
        'Walking lunges',
        'Squats',
        'GHD sit-ups',
        'Hanging leg raises',
        'Windshield wipers',
        'Gymnastics and position drills'
      ]
    },
    {
      athlete: 'Marcus "Buchecha" Almeida',
      sport: 'bjj',
      exercises: [
        'Medicine ball push-up switches',
        'Medicine ball V-ups',
        'Banded lateral side pulls',
        'Medicine ball mountain climbers',
        'Medicine ball burpees',
        'Medicine ball Russian twists',
        'Medicine ball lunge to rotation',
        'Donkey kicks and prisoner jacks'
      ]
    },
    {
      athlete: 'Roger Gracie',
      sport: 'bjj',
      exercises: [
        'Olympic clean and press',
        'Hill sprints (interval training)',
        'Overhead squat',
        'Position sparring (5 minute scenarios) and bench press'
      ]
    },
    {
      athlete: 'Andre Galvao',
      sport: 'bjj',
      exercises: [
        'Plyometric circuit (cone jumps, lateral jumps, gorilla jumps) and kettlebell swings'
      ]
    },
    {
      athlete: 'Tomoyuki Hashimoto',
      sport: 'bjj',
      exercises: [
        'Berimbolo drills',
        'Inverted guard drills',
        'Spider guard repetitions and core training for passing'
      ]
    },
    {
      athlete: 'Shinya Aoki',
      sport: 'bjj',
      exercises: [
        'Flying armbar repetitions',
        'Triangle leg-smothering and drills for heel hooks/ankle locks'
      ]
    },
    {
      athlete: 'Mikey Musumeci',
      sport: 'bjj',
      exercises: [
        'Extreme technical drilling (up to 12h/day) and Muay Thai training'
      ]
    },
    {
      athlete: 'Marcelo Garcia',
      sport: 'bjj',
      exercises: [
        'High-volume sparring and focus on scramble sequences'
      ]
    },
    {
      athlete: 'Yuki Nakai',
      sport: 'bjj',
      exercises: [
        'Nanatei Kosen Judo and Shooto wrestling drills'
      ]
    },
    {
      athlete: 'Rikako Yuasa',
      sport: 'bjj',
      exercises: [
        'Dynamic and offensive guard training'
      ]
    }
  ]
}

const keywordSets: Array<{ category: ExerciseCategory; keywords: string[] }> = [
  {
    category: 'neck',
    keywords: ['neck bridge', 'neck bridging', 'neck', 'headstand', 'nackbrygg', 'nacke', 'huvudstående']
  },
  {
    category: 'core',
    keywords: [
      'plank',
      'sit-up',
      'sit-ups',
      'situps',
      'crunch',
      'crunches',
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
      'ghd',
      'hollow',
      'plankan'
    ]
  },
  {
    category: 'chest',
    keywords: [
      'bench',
      'bench press',
      'push-up',
      'push-ups',
      'pushups',
      'floor press',
      'diamond push',
      'medicine ball push',
      'chest',
      'bänkpress',
      'armhäv'
    ]
  },
  {
    category: 'shoulders',
    keywords: [
      'overhead',
      'shoulder',
      'shoulder press',
      'arnold',
      'lateral raise',
      'delt',
      'face pull',
      'landmine',
      'push press',
      'push-press',
      'axel',
      'axelpress'
    ]
  },
  {
    category: 'back',
    keywords: [
      'row',
      'rows',
      't-bar',
      't bar',
      'pull-up',
      'pull-ups',
      'pull ups',
      'chin-up',
      'chin-ups',
      'chin ups',
      'rope climb',
      'rope climbing',
      'lat',
      'lats',
      'upper back',
      'gi pull',
      'gi sleeve',
      'gi grip',
      'shrug',
      'shrugs',
      'rodd',
      'repklättring',
      'skivstångsrodd'
    ]
  },
  {
    category: 'arms',
    keywords: [
      'curl',
      'curls',
      'bicep',
      'tricep',
      'hammer',
      'skull crusher',
      'skull crushers',
      'pushdown',
      'pushdowns',
      'kickback',
      'kickbacks',
      'forearm',
      'grip training',
      'captains of crush',
      'wrist roller'
    ]
  },
  {
    category: 'legs',
    keywords: [
      'squat',
      'squats',
      'deadlift',
      'lunge',
      'lunges',
      'step-up',
      'step-ups',
      'step ups',
      'jump',
      'jumps',
      'duck walk',
      'duck walks',
      'split jump',
      'walking lunge',
      'box jump',
      'box jumps',
      'hill sprint',
      'hill sprints',
      'sprint',
      'sprints',
      'sled',
      'kettlebell swing',
      'kettlebell swings',
      'knäböj',
      'marklyft',
      'hopp',
      'boxhopp',
      'släd'
    ]
  },
  {
    category: 'full-body',
    keywords: [
      'burpee',
      'burpees',
      'circuit',
      'carry',
      'carries',
      'farmer',
      'farmers',
      'kettlebell',
      'clean',
      'cleans',
      'snatch',
      'jerk',
      'battle rope',
      'air dyne',
      'assault bike',
      'hiit',
      'jump rope',
      'running',
      'rowing',
      'stair machine',
      'bounding',
      'bunny hop',
      'bunny hops',
      'medicine ball',
      'medball',
      'slam',
      'slams',
      'gymnastics',
      'drill',
      'drills',
      'uchikomi',
      'sparring',
      'position sparring',
      'hand-fighting',
      'takedown',
      'par terre',
      'shadow',
      'shadow wrestling',
      'stance',
      'guard',
      'berimbolo',
      'osoto gari',
      'randori',
      'scramble',
      'scrambles',
      'foot sweep',
      'snap-down',
      'snap-downs',
      'arm-drags',
      'sprawl',
      'penetration',
      'movement prep',
      'isometric',
      'visualization',
      'animal',
      'bear crawl',
      'army crawl',
      'cirkel',
      'hopprep',
      'löpning',
      'gymnastik',
      'driller',
      'skuggbrottning',
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
  // Support both English and Swedish conjunctions
  const separators = [' and ', ' och ', ' samt ']
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
