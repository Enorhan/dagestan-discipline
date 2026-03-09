import { AthleteExerciseGroup, ExerciseCategory, SportType } from './types'

const athleteExerciseLibrary: Record<SportType, AthleteExerciseGroup[]> = {
  wrestling: [
    {
      athlete: 'Aleksandr Karelin',
      sport: 'wrestling',
      exercises: [
        'Barbell row (heavy, 5x5)',
        'Sandbag carry run (200m intervals)',
        'Overhead press (190 kg)',
        'Kettlebell clean and press (32 kg)',
        'Zercher deadlift (10 reps at 200 kg)',
        'Bench press (204 kg+)',
        'Explosive chin-ups (max reps in 60s)',
        'Pull-ups (max reps)',
        'Box jumps',
        'Depth jumps',
        'Heavy sandbag stair carry',
        'Jump squats',
        'Bear crawl uphill sprints',
        'Duck walks',
        'Zercher carry (loaded walk)',
        'Wrestler neck bridge hold'
      ]
    },
    {
      athlete: 'Jordan Burroughs',
      sport: 'wrestling',
      exercises: [
        'Air Dyne sprints (20s sprint/40s rest)',
        'Weighted pull-ups',
        'Resistance band step and press',
        'Chin-ups',
        'Resistance band snap downs',
        'Battle rope alternating slams',
        'Lateral shuffle level-change drill',
        'Penetration step to sprawl reaction drill',
        'Burpee to barbell high pull',
        'Dumbbell deadlift',
        'Single-arm dumbbell high pull',
        'Kneeling jumps with Bulgarian Bag',
        'Kneeling box jumps',
        'Sled drag lunges',
        'Chest-supported dumbbell row',
        'Walking lunges',
        'Split jumps',
        'Medicine ball slams',
        'Dumbbell hammer curls',
        'Slider side lunges with kettlebell',
        'L-sit pull-up',
        'Dumbbell clean and press',
        'Tuck crunches',
        'Dumbbell Romanian deadlift',
        'Bulgarian split squat (pulse reps)',
        'Renegade row',
        'Captains of Crush gripper (timed sets)'
      ]
    },
    {
      athlete: 'Abdulrashid Sadulaev',
      sport: 'wrestling',
      exercises: [
        'Resistance band shot drill',
        'Resistance band sprawl defense drill',
        'Burpee box jumps',
        'Partner fireman carry (loaded walk)',
        'Bear crawl sprints (20m)',
        'Army crawl drags (20m)',
        'Penetration step drill (continuous reps)',
        'Duck walks',
        'Jump squats',
        '40-meter sprint intervals',
        'Legless rope climb',
        'Explosive push-ups',
        'Resistance band snap-downs',
        'Wrestler neck bridge hold',
        'Lateral shuffle drill'
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
        'Pin squat (partial ROM from pins)',
        'Pin press (partial ROM from pins)'
      ]
    },
    {
      athlete: 'Zaurbek Sidakov',
      sport: 'wrestling',
      exercises: [
        'Deep squat pry hold (timed)',
        'Double-leg takedown drill (triple extension focus)',
        'Back squat',
        'Zercher deadlift',
        'Bench press',
        'Power cleans',
        'Barbell snatch',
        'Weighted box jumps',
        'Outside step to ankle pick drill',
        'Split step to penetration drill'
      ]
    },
    {
      athlete: 'Cael Sanderson',
      sport: 'wrestling',
      exercises: [
        'Pull-ups (50 reps daily)',
        'Power cleans',
        'Wall sit hold (timed)',
        'Rope climbing',
        '40-meter sprint intervals',
        'Standing barbell shoulder press'
      ]
    },
    {
      athlete: 'Dan Gable',
      sport: 'wrestling',
      exercises: [
        'Tempo run (18 laps, progressive pace increase)',
        'Rope climbing',
        'Chin-ups',
        'Push-ups',
        'Solo stance and motion drill (shadow wrestling)',
        'Sprawl reaction drill (partner cue)'
      ]
    },
    {
      athlete: 'Kyle Dake',
      sport: 'wrestling',
      exercises: [
        'Single-leg cable anti-rotation press',
        'Cable Pallof press (half-kneeling)',
        'Kettlebell windmill (thoracic mobility)',
        'Landmine rotations',
        'Cable face pulls'
      ]
    },
    {
      athlete: 'David Taylor',
      sport: 'wrestling',
      exercises: [
        'Technical stand-up drill (continuous reps)',
        'Isometric wall squat hold (timed)',
        'Gi towel pull-up holds (timed)',
        'Single-leg Romanian deadlift',
        'Plank hold (weighted)'
      ]
    },
    {
      athlete: 'Mijain Lopez',
      sport: 'wrestling',
      exercises: [
        'Arm drag drill (partner)',
        'Snap-down to front headlock drill',
        'Par terre defense hip-heist drill',
        'Heavy sandbag carry (loaded walk)'
      ]
    },
    {
      athlete: 'Randy Couture',
      sport: 'wrestling',
      exercises: [
        'Barbell clean and press',
        'Barbell front squat',
        'Barbell bent-over row',
        'Explosive push-ups over box',
        'Box jumps',
        'Jump rope (timed rounds)',
        'Weighted pull-ups'
      ]
    }
  ],
  judo: [
    {
      athlete: 'Shohei Ono',
      sport: 'judo',
      exercises: [
        'Clean and jerk',
        'Back squat',
        'Front squat',
        'Jump squats',
        'Weighted step-ups',
        'Resistance band uchikomi',
        'Rope climbing',
        'Farmer carries',
        'Bench press',
        'Barbell row',
        'Shoulder press',
        'Pull-ups',
        'Medicine ball slams',
        'Sled push',
        'Continuous broad jumps',
        'Isometric uchikomi holds (timed)',
        'Wrist roller',
        'Gi sleeve pull-ups'
      ]
    },
    {
      athlete: 'Teddy Riner',
      sport: 'judo',
      exercises: [
        'Bench press (150–230 kg)',
        'Single-arm dumbbell deadlift (50–60 kg)',
        'Stair machine sprint intervals',
        'Pull-ups',
        'Jump rope (timed rounds)',
        'Seated cable row',
        'Push-ups',
        'Rotational crunches',
        'Nordic hamstring curls'
      ]
    },
    {
      athlete: 'Masahiko Kimura',
      sport: 'judo',
      exercises: [
        'Hindu push-ups (1000 reps)',
        'Bunny hops (1 km continuous)',
        'Headstand hold against wall (timed)',
        'Single-arm barbell press',
        'Bench press',
        'Partner-weighted sit-ups (200 reps)',
        'Partner-weighted squats (200 reps)',
        'Osoto gari uchikomi (high-volume single technique)'
      ]
    },
    {
      athlete: 'Kayla Harrison',
      sport: 'judo',
      exercises: [
        'Power cleans',
        'Front squats',
        'Push jerks',
        'Rope climbing',
        'Pull-ups',
        'Sled push',
        'Sled pull',
        'Medicine ball push-ups',
        'V-ups',
        'Medicine ball V-sit twists',
        'Resistance band uchikomi',
        'Triangle turtle turnover drill'
      ]
    },
    {
      athlete: 'Uta Abe',
      sport: 'judo',
      exercises: [
        'Tsugi-ashi footwork drill (timed rounds)',
        'Resistance band uchikomi',
        'Assault Bike sprint intervals',
        'Plank to shoulder tap (alternating)',
        'Box jumps',
        'Jump squats'
      ]
    },
    {
      athlete: 'An Changrim',
      sport: 'judo',
      exercises: [
        'Back squat (215 kg)',
        'Bench press (150 kg)',
        'Power cleans (130 kg)'
      ]
    },
    {
      athlete: 'An Baul',
      sport: 'judo',
      exercises: [
        'Back squat',
        'Deadlift',
        'Power cleans',
        'Barbell bent-over row',
        'Bench press'
      ]
    },
    {
      athlete: 'Gwak Donghan',
      sport: 'judo',
      exercises: [
        'Deadlift',
        'Back squat',
        'Rope climbing',
        'Gi-grip pull-ups'
      ]
    },
    {
      athlete: 'Cho Guham',
      sport: 'judo',
      exercises: [
        'Back squat',
        'Power cleans'
      ]
    },
    {
      athlete: 'Satoshi Ishii',
      sport: 'judo',
      exercises: [
        'Seated cable row (close grip)',
        'Kettlebell swings'
      ]
    },
    {
      athlete: 'Shintaro Higashi',
      sport: 'judo',
      exercises: [
        'Guard pass to side control drill (timed rounds)',
        'Triangle attack drill from closed guard',
        'Turtle turnover drill (timed rounds)'
      ]
    },
    {
      athlete: 'Travis Stevens',
      sport: 'judo',
      exercises: [
        'Foot sweep drill (solo, timed reps)',
        'Hand-pull timing drill (partner reaction)',
        'Gi sweep entry drill (partner, timed sets)'
      ]
    },
    {
      athlete: 'Hifumi Abe',
      sport: 'judo',
      exercises: [
        'Solo uchikomi drill (timed sets)',
        '90/90 hip switch (controlled reps)'
      ]
    }
  ],
  bjj: [
    {
      athlete: 'Gordon Ryan',
      sport: 'bjj',
      exercises: [
        'Flat bench press',
        'Incline bench press',
        'Floor press',
        'Trap bar deadlift',
        'T-bar rows',
        'Weighted pull-ups',
        'Dumbbell row',
        'Dumbbell shrugs',
        'Arnold press',
        'Shoulder press',
        'Lateral raises',
        'Front delt raises',
        'Rear delt raises',
        'Bicep curls',
        'Hammer curls',
        'Concentration curls',
        'Skull crushers',
        'Tricep kickbacks',
        'Diamond push-ups',
        'Triceps pushdowns',
        'Walking lunges',
        'Back squat',
        'GHD sit-ups',
        'Hanging leg raises',
        'Windshield wipers',
        'Closed guard pass to mount drill (timed)',
        'Back control escape drill (timed)'
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
        'Donkey kicks',
        'Jumping jacks'
      ]
    },
    {
      athlete: 'Roger Gracie',
      sport: 'bjj',
      exercises: [
        'Olympic clean and press',
        'Hill sprints (interval training)',
        'Overhead squat',
        'Mount escape to guard recovery drill (timed)',
        'Bench press'
      ]
    },
    {
      athlete: 'Andre Galvao',
      sport: 'bjj',
      exercises: [
        'Cone jump (plyometric)',
        'Lateral jump (plyometric)',
        'Broad jumps (plyometric)',
        'Kettlebell swings'
      ]
    },
    {
      athlete: 'Tomoyuki Hashimoto',
      sport: 'bjj',
      exercises: [
        'Berimbolo drill (solo repetitions)',
        'Inverted guard drill (shoulder roll entries)',
        'Spider guard lasso repetitions',
        'Dead bug (anti-extension core)'
      ]
    },
    {
      athlete: 'Shinya Aoki',
      sport: 'bjj',
      exercises: [
        'Flying armbar entry drill',
        'Triangle choke leg-smothering drill',
        'Heel hook entry drill (inside/outside)',
        'Straight ankle lock finish drill'
      ]
    },
    {
      athlete: 'Mikey Musumeci',
      sport: 'bjj',
      exercises: [
        'Guard retention drill (timed rounds)',
        'Leg entanglement entry drill (repetitions)',
        'Single-leg X-guard sweep drill',
        'Assault Bike sprint intervals'
      ]
    },
    {
      athlete: 'Marcelo Garcia',
      sport: 'bjj',
      exercises: [
        'Arm drag to back take drill (partner)',
        'X-guard sweep drill (repetitions)',
        'Guillotine finish drill (arm-in/no-arm)',
        'Butterfly guard sweep drill (repetitions)'
      ]
    },
    {
      athlete: 'Yuki Nakai',
      sport: 'bjj',
      exercises: [
        'Ground newaza guard pass drill (timed rounds)',
        'Sprawl to front headlock drill',
        'Single-leg takedown drill'
      ]
    },
    {
      athlete: 'Rikako Yuasa',
      sport: 'bjj',
      exercises: [
        'Open guard hip-escape drill (timed)',
        'Lasso guard sweep drill (repetitions)',
        'De la Riva to berimbolo entry drill'
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
