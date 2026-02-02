import { Drill, LearningPath, Routine, DrillCategory, DrillSubcategory } from './types'

// ============================================
// INJURY PREVENTION DRILLS
// ============================================

export const injuryPreventionDrills: Drill[] = [
  // NECK
  {
    id: 'ip-neck-1',
    name: 'Neck Bridges',
    category: 'injury-prevention',
    subcategory: 'neck',
    videoUrl: 'https://www.youtube.com/embed/gN3xzKGRbEE',
    duration: 60,
    difficulty: 'intermediate',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Build bulletproof neck strength to prevent injuries from takedowns and submissions.',
    benefits: [
      'Strengthens neck muscles in all directions',
      'Reduces risk of neck injuries during throws',
      'Improves resistance to chokes and cranks',
      'Essential for wrestlers and grapplers'
    ],
    musclesWorked: ['Sternocleidomastoid', 'Trapezius', 'Neck extensors', 'Neck flexors'],
    injuryPrevention: 'Critical for preventing neck strains, whiplash, and cervical injuries common in grappling.',
    instructions: [
      'Start on your back with knees bent',
      'Place hands on the ground for support initially',
      'Bridge up onto the top of your head',
      'Rock gently forward and backward',
      'Progress to removing hand support over time'
    ],
    commonMistakes: [
      'Going too fast before building strength',
      'Not using hands for support when starting',
      'Putting too much pressure on the neck too soon'
    ],
    coachingCues: ['Control the movement', 'Build up slowly', 'Stop if you feel pain']
  },
  {
    id: 'ip-neck-2',
    name: 'Neck Curls',
    category: 'injury-prevention',
    subcategory: 'neck',
    videoUrl: 'https://www.youtube.com/embed/wjiLu3gNWvk',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Strengthen the front of your neck to resist guillotines and front headlocks.',
    benefits: [
      'Builds anterior neck strength',
      'Improves posture',
      'Reduces risk of neck flexion injuries',
      'Helps resist front chokes'
    ],
    musclesWorked: ['Sternocleidomastoid', 'Scalenes', 'Longus colli'],
    injuryPrevention: 'Prevents neck strains from sudden forward forces.',
    instructions: [
      'Lie face up on a bench with head hanging off',
      'Start with head in neutral position',
      'Curl chin toward chest against gravity',
      'Lower slowly with control',
      'Perform 15-20 reps'
    ],
    commonMistakes: ['Using momentum', 'Going too heavy too soon'],
    coachingCues: ['Slow and controlled', 'Feel the burn in the front of your neck']
  },
  {
    id: 'ip-neck-3',
    name: 'Band Neck Resistance',
    category: 'injury-prevention',
    subcategory: 'neck',
    videoUrl: 'https://www.youtube.com/embed/wjiLu3gNWvk',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['resistance band'],
    description: 'Safe and effective neck strengthening using resistance bands.',
    benefits: [
      'Low-impact neck strengthening',
      'Can target all directions',
      'Easy to progress with different bands',
      'Safe for beginners'
    ],
    musclesWorked: ['All neck muscles'],
    injuryPrevention: 'Builds overall neck stability and strength.',
    instructions: [
      'Attach band to a fixed point at head height',
      'Place band around forehead',
      'Step away to create tension',
      'Resist the band while moving head forward/back',
      'Repeat for each direction: front, back, left, right'
    ],
    commonMistakes: ['Using too heavy a band', 'Jerky movements'],
    coachingCues: ['Smooth movements', 'Control the resistance']
  },
  // SHOULDERS
  {
    id: 'ip-shoulder-1',
    name: 'Face Pulls',
    category: 'injury-prevention',
    subcategory: 'shoulders',
    videoUrl: 'https://www.youtube.com/embed/rep-qVOkqgk',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['cable machine', 'resistance band'],
    description: 'Essential exercise for shoulder health and posture correction.',
    benefits: [
      'Strengthens rear deltoids and rotator cuff',
      'Corrects forward shoulder posture',
      'Prevents shoulder impingement',
      'Balances pushing exercises'
    ],
    musclesWorked: ['Rear deltoids', 'Rhomboids', 'External rotators', 'Middle trapezius'],
    injuryPrevention: 'Prevents shoulder impingement and rotator cuff injuries.',
    instructions: [
      'Set cable or band at face height',
      'Grip with palms facing down',
      'Pull toward face, separating hands',
      'Squeeze shoulder blades together',
      'Return with control'
    ],
    commonMistakes: ['Using too much weight', 'Not externally rotating at the end'],
    coachingCues: ['Pull apart, not just back', 'Squeeze the shoulder blades']
  },
  {
    id: 'ip-shoulder-2',
    name: 'Cuban Rotations',
    category: 'injury-prevention',
    subcategory: 'shoulders',
    videoUrl: 'https://www.youtube.com/embed/0oeIB6wi3es',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['light dumbbells'],
    description: 'Comprehensive rotator cuff exercise for shoulder stability.',
    benefits: [
      'Strengthens all rotator cuff muscles',
      'Improves shoulder stability',
      'Prevents shoulder injuries from throws',
      'Great warm-up exercise'
    ],
    musclesWorked: ['Supraspinatus', 'Infraspinatus', 'Teres minor', 'Subscapularis'],
    injuryPrevention: 'Essential for preventing rotator cuff tears and shoulder instability.',
    instructions: [
      'Hold light dumbbells at sides',
      'Raise arms to 90 degrees (scarecrow position)',
      'Rotate forearms up until parallel to ground',
      'Press overhead',
      'Reverse the movement'
    ],
    commonMistakes: ['Using too heavy weights', 'Rushing the movement'],
    coachingCues: ['Light weight, perfect form', 'Control every phase']
  },
  {
    id: 'ip-shoulder-3',
    name: 'Shoulder Dislocates',
    category: 'injury-prevention',
    subcategory: 'shoulders',
    videoUrl: 'https://www.youtube.com/embed/02HdChcpyBs',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['PVC pipe', 'resistance band', 'towel'],
    description: 'Improve shoulder mobility and prevent injuries from kimuras and americanas.',
    benefits: [
      'Increases shoulder range of motion',
      'Prevents shoulder injuries from submissions',
      'Improves overhead mobility',
      'Great warm-up exercise'
    ],
    musclesWorked: ['Deltoids', 'Rotator cuff', 'Pectorals', 'Lats'],
    injuryPrevention: 'Critical for preventing shoulder injuries from kimuras and americanas.',
    instructions: [
      'Hold a stick or band with wide grip',
      'Keep arms straight throughout',
      'Slowly raise arms overhead and behind you',
      'Return to starting position',
      'Narrow grip as mobility improves'
    ],
    commonMistakes: ['Bending elbows', 'Going too narrow too fast'],
    coachingCues: ['Keep arms straight', 'Slow and controlled']
  },
  // KNEES
  {
    id: 'ip-knee-1',
    name: 'Terminal Knee Extensions',
    category: 'injury-prevention',
    subcategory: 'knees',
    videoUrl: 'https://www.youtube.com/embed/J0DnG1_S92I',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['resistance band'],
    description: 'Strengthen the VMO muscle to stabilize the knee and prevent injuries.',
    benefits: [
      'Strengthens VMO (inner quad)',
      'Improves knee tracking',
      'Prevents patellar issues',
      'Rehabilitates knee injuries'
    ],
    musclesWorked: ['Vastus medialis oblique', 'Quadriceps'],
    injuryPrevention: 'Essential for preventing knee injuries from shooting and sprawling.',
    instructions: [
      'Loop band around a post at knee height',
      'Step into band, placing it behind your knee',
      'Start with knee slightly bent',
      'Straighten knee against band resistance',
      'Focus on squeezing the inner quad'
    ],
    commonMistakes: ['Not fully extending', 'Using too light a band'],
    coachingCues: ['Squeeze the inner quad', 'Full extension']
  },
  {
    id: 'ip-knee-2',
    name: 'Nordic Hamstring Curls',
    category: 'injury-prevention',
    subcategory: 'knees',
    videoUrl: 'https://www.youtube.com/embed/2ohVRTDBwrQ',
    duration: 60,
    difficulty: 'advanced',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Build bulletproof hamstrings to prevent ACL and hamstring injuries.',
    benefits: [
      'Dramatically reduces hamstring injury risk',
      'Strengthens hamstrings eccentrically',
      'Protects ACL',
      'Improves deceleration ability'
    ],
    musclesWorked: ['Hamstrings', 'Glutes'],
    injuryPrevention: 'One of the most effective exercises for preventing hamstring and ACL injuries.',
    instructions: [
      'Kneel on a pad with ankles secured',
      'Keep hips extended throughout',
      'Slowly lower your body forward',
      'Use hands to catch yourself',
      'Push back up and use hamstrings to return'
    ],
    commonMistakes: ['Bending at the hips', 'Dropping too fast'],
    coachingCues: ['Stay tall', 'Control the descent', 'Hips forward']
  },
  // HIPS
  {
    id: 'ip-hip-1',
    name: '90/90 Hip Stretch',
    category: 'injury-prevention',
    subcategory: 'hips',
    videoUrl: 'https://www.youtube.com/embed/wiFNA3sqjCA',
    duration: 90,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Essential hip mobility drill for grapplers to prevent hip injuries.',
    benefits: [
      'Improves hip internal and external rotation',
      'Prevents hip impingement',
      'Essential for guard players',
      'Reduces lower back stress'
    ],
    musclesWorked: ['Hip rotators', 'Glutes', 'Piriformis'],
    injuryPrevention: 'Prevents hip impingement and groin strains common in grappling.',
    instructions: [
      'Sit with front leg at 90 degrees, shin parallel to body',
      'Back leg at 90 degrees behind you',
      'Sit tall with chest up',
      'Lean forward over front leg',
      'Hold for 30-60 seconds each side'
    ],
    commonMistakes: ['Rounding the back', 'Not keeping 90 degree angles'],
    coachingCues: ['Chest up', 'Breathe into the stretch']
  },
  {
    id: 'ip-hip-2',
    name: 'Cossack Squats',
    category: 'injury-prevention',
    subcategory: 'hips',
    videoUrl: 'https://www.youtube.com/embed/tpczTeSkHz0',
    duration: 60,
    difficulty: 'intermediate',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Build hip mobility and strength in the lateral plane.',
    benefits: [
      'Improves lateral hip mobility',
      'Strengthens adductors',
      'Prevents groin injuries',
      'Improves side-to-side movement'
    ],
    musclesWorked: ['Adductors', 'Glutes', 'Quadriceps', 'Hip flexors'],
    injuryPrevention: 'Prevents groin strains and hip injuries from lateral movements.',
    instructions: [
      'Stand with feet wide apart',
      'Shift weight to one side, bending that knee',
      'Keep other leg straight with toes up',
      'Go as deep as mobility allows',
      'Return to center and repeat other side'
    ],
    commonMistakes: ['Heel coming up', 'Knee caving in'],
    coachingCues: ['Heel down', 'Knee tracks over toes']
  },
  // BACK
  {
    id: 'ip-back-1',
    name: 'Cat-Cow Stretch',
    category: 'injury-prevention',
    subcategory: 'back',
    videoUrl: 'https://www.youtube.com/embed/kqnua4rHVVA',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Mobilize the spine and relieve tension from grappling.',
    benefits: [
      'Improves spinal mobility',
      'Relieves back tension',
      'Warms up the spine',
      'Reduces risk of back injuries'
    ],
    musclesWorked: ['Erector spinae', 'Abdominals', 'Multifidus'],
    injuryPrevention: 'Prevents back strains and maintains spinal health.',
    instructions: [
      'Start on hands and knees',
      'Inhale: arch back, look up (cow)',
      'Exhale: round back, tuck chin (cat)',
      'Move slowly through full range',
      'Repeat 10-15 times'
    ],
    commonMistakes: ['Moving too fast', 'Not using full range'],
    coachingCues: ['Breathe with the movement', 'Feel each vertebra move']
  },
  // FINGERS
  {
    id: 'ip-finger-1',
    name: 'Finger Extensor Training',
    category: 'injury-prevention',
    subcategory: 'fingers',
    videoUrl: 'https://www.youtube.com/embed/TSrTB_brEdM',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['bjj', 'judo'],
    equipment: ['rubber band', 'finger extensor band'],
    description: 'Balance grip strength with finger extension to prevent finger injuries.',
    benefits: [
      'Prevents finger injuries from gi grips',
      'Balances grip muscles',
      'Reduces risk of trigger finger',
      'Improves finger health'
    ],
    musclesWorked: ['Finger extensors', 'Forearm extensors'],
    injuryPrevention: 'Essential for gi grapplers to prevent chronic finger injuries.',
    instructions: [
      'Place rubber band around all fingers',
      'Spread fingers apart against resistance',
      'Hold for 2-3 seconds',
      'Return slowly',
      'Perform 15-20 reps'
    ],
    commonMistakes: ['Using too weak a band', 'Not doing regularly'],
    coachingCues: ['Spread wide', 'Control the return']
  }
]

// ============================================
// MOBILITY DRILLS
// ============================================

export const mobilityDrills: Drill[] = [
  {
    id: 'mob-hip-1',
    name: 'Hip Circles',
    category: 'mobility',
    subcategory: 'hip-mobility',
    videoUrl: 'https://www.youtube.com/embed/NG9qbvAN3gQ',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Open up the hips with controlled circular movements.',
    benefits: [
      'Improves hip range of motion',
      'Warms up hip joint',
      'Reduces hip stiffness',
      'Prepares for grappling movements'
    ],
    musclesWorked: ['Hip flexors', 'Glutes', 'Hip rotators'],
    instructions: [
      'Stand on one leg, holding support if needed',
      'Lift other knee to hip height',
      'Make large circles with the knee',
      '10 circles each direction',
      'Switch legs'
    ],
    coachingCues: ['Big circles', 'Control the movement']
  },
  {
    id: 'mob-hip-2',
    name: 'World\'s Greatest Stretch',
    category: 'mobility',
    subcategory: 'hip-mobility',
    videoUrl: 'https://www.youtube.com/embed/u5hTaF5Huns',
    duration: 90,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'The ultimate full-body mobility drill for grapplers.',
    benefits: [
      'Opens hips, thoracic spine, and shoulders',
      'Stretches hip flexors and hamstrings',
      'Improves rotation',
      'Perfect warm-up movement'
    ],
    musclesWorked: ['Hip flexors', 'Hamstrings', 'Thoracic spine', 'Shoulders'],
    instructions: [
      'Step into a deep lunge',
      'Place same-side elbow to inside of front foot',
      'Rotate and reach opposite arm to ceiling',
      'Return and straighten front leg for hamstring stretch',
      'Repeat 5 times each side'
    ],
    coachingCues: ['Deep lunge', 'Big rotation', 'Breathe']
  },
  {
    id: 'mob-shoulder-1',
    name: 'Thread the Needle',
    category: 'mobility',
    subcategory: 'shoulder-mobility',
    videoUrl: 'https://www.youtube.com/embed/ljEOqeTMVno',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Improve thoracic rotation and shoulder mobility.',
    benefits: [
      'Improves thoracic rotation',
      'Opens up shoulders',
      'Reduces upper back stiffness',
      'Great for desk workers'
    ],
    musclesWorked: ['Thoracic spine', 'Shoulders', 'Lats'],
    instructions: [
      'Start on hands and knees',
      'Reach one arm under your body',
      'Let shoulder and head rest on ground',
      'Hold for 30 seconds',
      'Switch sides'
    ],
    coachingCues: ['Reach far', 'Relax into the stretch']
  },
  {
    id: 'mob-spine-1',
    name: 'Thoracic Extensions',
    category: 'mobility',
    subcategory: 'spine-mobility',
    videoUrl: 'https://www.youtube.com/embed/LT_dFRnmdGs',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['foam roller'],
    description: 'Improve upper back extension for better posture and movement.',
    benefits: [
      'Improves thoracic extension',
      'Reduces upper back stiffness',
      'Improves breathing',
      'Better posture'
    ],
    musclesWorked: ['Thoracic spine', 'Erector spinae'],
    instructions: [
      'Place foam roller under upper back',
      'Support head with hands',
      'Extend back over the roller',
      'Move roller up and down spine',
      'Spend extra time on tight spots'
    ],
    coachingCues: ['Breathe out as you extend', 'Don\'t go to lower back']
  },
  {
    id: 'mob-ankle-1',
    name: 'Ankle Circles',
    category: 'mobility',
    subcategory: 'ankle-mobility',
    videoUrl: 'https://www.youtube.com/embed/M7bSCgqoSf4',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Improve ankle mobility for better stance and movement.',
    benefits: [
      'Improves ankle range of motion',
      'Warms up ankle joint',
      'Prevents ankle sprains',
      'Better squat depth'
    ],
    musclesWorked: ['Ankle stabilizers', 'Calves'],
    instructions: [
      'Sit or stand with one foot off ground',
      'Make large circles with your foot',
      '10 circles each direction',
      'Switch feet'
    ],
    coachingCues: ['Full range of motion', 'Slow and controlled']
  }
]

// ============================================
// WARMUP DRILLS
// ============================================

export const warmupDrills: Drill[] = [
  {
    id: 'wu-1',
    name: 'Arm Circles',
    category: 'warmup',
    subcategory: 'general',
    videoUrl: 'https://www.youtube.com/embed/140RTsLGFKM',
    duration: 30,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Warm up the shoulder joints with progressive arm circles.',
    benefits: ['Warms up shoulders', 'Increases blood flow', 'Prepares for upper body work'],
    musclesWorked: ['Deltoids', 'Rotator cuff'],
    instructions: [
      'Stand with arms extended to sides',
      'Make small circles, gradually increasing size',
      '15 seconds forward, 15 seconds backward'
    ],
    coachingCues: ['Start small, go big']
  },
  {
    id: 'wu-2',
    name: 'Jumping Jacks',
    category: 'warmup',
    subcategory: 'general',
    videoUrl: 'https://www.youtube.com/embed/c4DAnQ6DtF8',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Classic full-body warm-up to elevate heart rate.',
    benefits: ['Elevates heart rate', 'Full body warm-up', 'Improves coordination'],
    musclesWorked: ['Full body'],
    instructions: [
      'Start with feet together, arms at sides',
      'Jump feet apart while raising arms overhead',
      'Jump back to starting position',
      'Repeat for 30-45 seconds'
    ],
    coachingCues: ['Light on your feet', 'Full arm extension']
  },
  {
    id: 'wu-3',
    name: 'High Knees',
    category: 'warmup',
    subcategory: 'general',
    videoUrl: 'https://www.youtube.com/embed/tx5rgpDAJRI',
    duration: 30,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Dynamic warm-up to activate hip flexors and elevate heart rate.',
    benefits: ['Activates hip flexors', 'Elevates heart rate', 'Improves coordination'],
    musclesWorked: ['Hip flexors', 'Core', 'Calves'],
    instructions: [
      'Run in place bringing knees to hip height',
      'Pump arms in running motion',
      'Stay on balls of feet',
      'Maintain quick tempo'
    ],
    coachingCues: ['Knees up', 'Quick feet']
  },
  {
    id: 'wu-4',
    name: 'Leg Swings',
    category: 'warmup',
    subcategory: 'general',
    videoUrl: 'https://www.youtube.com/embed/korxBhGzzJE',
    duration: 45,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Dynamic hip mobility to prepare for kicks and takedowns.',
    benefits: ['Opens up hips', 'Dynamic stretch for hamstrings', 'Prepares for kicks'],
    musclesWorked: ['Hip flexors', 'Hamstrings', 'Glutes'],
    instructions: [
      'Hold onto a wall or post for balance',
      'Swing one leg forward and back',
      '10 swings each leg',
      'Then swing side to side for 10 reps'
    ],
    coachingCues: ['Controlled swing', 'Keep standing leg stable']
  },
  {
    id: 'wu-5',
    name: 'Inchworms',
    category: 'warmup',
    subcategory: 'general',
    videoUrl: 'https://www.youtube.com/embed/ZY2ji_Ho0dA',
    duration: 60,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Full body warm-up that stretches hamstrings and activates core.',
    benefits: ['Stretches hamstrings', 'Activates core', 'Warms up shoulders'],
    musclesWorked: ['Hamstrings', 'Core', 'Shoulders'],
    instructions: [
      'Stand tall, bend forward and touch the ground',
      'Walk hands out to plank position',
      'Walk feet toward hands',
      'Stand up and repeat'
    ],
    coachingCues: ['Keep legs as straight as possible', 'Tight core in plank']
  }
]

// ============================================
// EXERCISE DEMOS
// ============================================

export const exerciseDemos: Drill[] = [
  {
    id: 'ex-deadlift',
    name: 'Deadlift',
    category: 'exercise',
    subcategory: 'lower-body',
    videoUrl: 'https://www.youtube.com/embed/r4MzxtBKyNE',
    duration: 0,
    difficulty: 'intermediate',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['barbell'],
    description: 'The king of all exercises. Builds total body strength essential for grappling.',
    benefits: [
      'Builds posterior chain strength',
      'Improves grip strength',
      'Develops hip hinge pattern',
      'Essential for takedown power'
    ],
    musclesWorked: ['Hamstrings', 'Glutes', 'Erector spinae', 'Lats', 'Forearms'],
    instructions: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Hinge at hips, grip bar just outside legs',
      'Flatten back, chest up, shoulders over bar',
      'Drive through floor, keeping bar close to body',
      'Stand tall, squeeze glutes at top',
      'Lower with control by hinging at hips'
    ],
    commonMistakes: ['Rounding the back', 'Bar drifting away from body', 'Jerking the weight'],
    coachingCues: ['Push the floor away', 'Bar stays close', 'Chest up']
  },
  {
    id: 'ex-squat',
    name: 'Back Squat',
    category: 'exercise',
    subcategory: 'lower-body',
    videoUrl: 'https://www.youtube.com/embed/bEv6CCg2BC8',
    duration: 0,
    difficulty: 'intermediate',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['barbell', 'squat rack'],
    description: 'Fundamental lower body exercise for building leg strength and power.',
    benefits: [
      'Builds leg strength',
      'Improves core stability',
      'Develops explosive power',
      'Essential for wrestling stance'
    ],
    musclesWorked: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    instructions: [
      'Position bar on upper back, not neck',
      'Feet shoulder-width apart, toes slightly out',
      'Brace core, take a deep breath',
      'Sit back and down, keeping chest up',
      'Go to parallel or below',
      'Drive through heels to stand'
    ],
    commonMistakes: ['Knees caving in', 'Heels coming up', 'Leaning too far forward'],
    coachingCues: ['Knees out', 'Chest up', 'Drive through heels']
  },
  {
    id: 'ex-power-clean',
    name: 'Power Clean',
    category: 'exercise',
    subcategory: 'full-body',
    videoUrl: 'https://www.youtube.com/embed/GVt8PEq-4Lk',
    duration: 0,
    difficulty: 'advanced',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['barbell'],
    description: 'Explosive Olympic lift that develops power for takedowns and throws.',
    benefits: [
      'Develops explosive hip power',
      'Improves coordination',
      'Builds full-body strength',
      'Transfers directly to takedowns'
    ],
    musclesWorked: ['Glutes', 'Hamstrings', 'Traps', 'Shoulders', 'Core'],
    instructions: [
      'Start with bar at mid-thigh, shoulders over bar',
      'Explosively extend hips and shrug',
      'Pull yourself under the bar',
      'Catch in front rack position',
      'Stand up to complete the lift'
    ],
    commonMistakes: ['Pulling with arms too early', 'Not extending hips fully'],
    coachingCues: ['Explosive hips', 'Fast elbows', 'Catch it']
  },
  {
    id: 'ex-kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'exercise',
    subcategory: 'full-body',
    videoUrl: 'https://www.youtube.com/embed/YSxHifyI6s8',
    duration: 0,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['kettlebell'],
    description: 'Hip hinge power exercise that builds explosive strength and conditioning.',
    benefits: [
      'Builds hip power',
      'Improves conditioning',
      'Strengthens posterior chain',
      'Low impact cardio'
    ],
    musclesWorked: ['Glutes', 'Hamstrings', 'Core', 'Shoulders'],
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hinge at hips, grip kettlebell with both hands',
      'Hike the bell back between legs',
      'Explosively drive hips forward',
      'Let arms float to chest height',
      'Control the descent and repeat'
    ],
    commonMistakes: ['Squatting instead of hinging', 'Using arms to lift'],
    coachingCues: ['Hips, not arms', 'Snap the hips', 'Tight core']
  },
  {
    id: 'ex-pullup',
    name: 'Pull-ups',
    category: 'exercise',
    subcategory: 'upper-body',
    videoUrl: 'https://www.youtube.com/embed/eGo4IYlbE5g',
    duration: 0,
    difficulty: 'intermediate',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    equipment: ['pull-up bar'],
    description: 'Essential upper body pulling exercise for grip and back strength.',
    benefits: [
      'Builds back strength',
      'Improves grip strength',
      'Essential for clinch work',
      'Develops pulling power'
    ],
    musclesWorked: ['Lats', 'Biceps', 'Forearms', 'Rear deltoids'],
    instructions: [
      'Hang from bar with overhand grip',
      'Engage lats and pull chest to bar',
      'Keep core tight throughout',
      'Lower with control',
      'Full extension at bottom'
    ],
    commonMistakes: ['Kipping or swinging', 'Not going full range'],
    coachingCues: ['Chest to bar', 'Control the descent', 'Dead hang at bottom']
  }
]

// ============================================
// TECHNIQUE DRILLS
// ============================================

export const techniqueDrills: Drill[] = [
  {
    id: 'tech-single-leg',
    name: 'Single Leg Takedown',
    category: 'technique',
    subcategory: 'takedowns',
    videoUrl: 'https://www.youtube.com/embed/1ORxPwBZ31o',
    duration: 0,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj'],
    description: 'The most fundamental wrestling takedown. Master this first.',
    benefits: [
      'High percentage takedown',
      'Works in gi and no-gi',
      'Multiple finishes available',
      'Foundation for other takedowns'
    ],
    instructions: [
      'Set up with a collar tie or arm drag',
      'Level change by bending knees',
      'Penetration step with lead leg',
      'Head on inside, grab behind knee',
      'Drive through and finish'
    ],
    commonMistakes: ['Head on wrong side', 'Not level changing', 'Reaching without stepping'],
    coachingCues: ['Level change first', 'Head inside', 'Drive through'],
    relatedDrills: ['tech-double-leg', 'tech-high-crotch']
  },
  {
    id: 'tech-double-leg',
    name: 'Double Leg Takedown',
    category: 'technique',
    subcategory: 'takedowns',
    videoUrl: 'https://www.youtube.com/embed/Wxy8y5p8DdY',
    duration: 0,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj'],
    description: 'Power takedown that drives through your opponent.',
    benefits: [
      'Powerful takedown',
      'Good for larger opponents',
      'Sets up ground control',
      'Works in MMA'
    ],
    instructions: [
      'Set up with hand fighting',
      'Level change deep',
      'Penetration step between opponent\'s legs',
      'Wrap both legs behind knees',
      'Drive shoulder into hips and run through'
    ],
    commonMistakes: ['Standing up too early', 'Not driving through'],
    coachingCues: ['Stay low', 'Drive through', 'Corner them'],
    relatedDrills: ['tech-single-leg', 'tech-blast-double']
  },
  {
    id: 'tech-sprawl',
    name: 'Sprawl Defense',
    category: 'technique',
    subcategory: 'defense',
    videoUrl: 'https://www.youtube.com/embed/Tz-Ik8BQKF0',
    duration: 0,
    difficulty: 'beginner',
    sportRelevance: ['wrestling', 'bjj', 'judo'],
    description: 'Essential defense against leg attacks.',
    benefits: [
      'Stops takedowns',
      'Creates scramble opportunities',
      'Builds hip awareness',
      'Foundation of wrestling defense'
    ],
    instructions: [
      'React to opponent\'s level change',
      'Kick legs back explosively',
      'Drop hips to the mat',
      'Chest pressure on opponent\'s back',
      'Circle to side or front headlock'
    ],
    commonMistakes: ['Sprawling too late', 'Not dropping hips'],
    coachingCues: ['Hips down', 'Chest on back', 'Heavy hips']
  }
]

// ============================================
// COMBINED DRILLS
// ============================================

export const allDrills: Drill[] = [
  ...injuryPreventionDrills,
  ...mobilityDrills,
  ...warmupDrills,
  ...exerciseDemos,
  ...techniqueDrills
]

// ============================================
// ROUTINES
// ============================================

export const routines: Routine[] = [
  {
    id: 'routine-wrestling-warmup',
    name: 'Wrestling Warmup',
    type: 'warmup',
    duration: 5,
    description: 'Quick warmup routine before wrestling-focused workouts.',
    forSport: ['wrestling'],
    forWorkoutFocus: ['Explosive Power', 'Wrestling Circuit'],
    drills: [
      { drillId: 'wu-2', duration: 30 },  // Jumping Jacks
      { drillId: 'wu-3', duration: 30 },  // High Knees
      { drillId: 'wu-4', duration: 45 },  // Leg Swings
      { drillId: 'mob-hip-1', duration: 45 }, // Hip Circles
      { drillId: 'ip-neck-3', duration: 60 }, // Band Neck Resistance
      { drillId: 'wu-1', duration: 30 }   // Arm Circles
    ]
  },
  {
    id: 'routine-bjj-warmup',
    name: 'BJJ Warmup',
    type: 'warmup',
    duration: 5,
    description: 'Prepare your body for BJJ training with hip and shoulder focus.',
    forSport: ['bjj'],
    forWorkoutFocus: ['Grip & Pulling', 'Movement & Mobility'],
    drills: [
      { drillId: 'wu-5', duration: 60 },  // Inchworms
      { drillId: 'mob-hip-2', duration: 60 }, // World's Greatest Stretch
      { drillId: 'ip-hip-1', duration: 60 }, // 90/90 Hip Stretch
      { drillId: 'mob-shoulder-1', duration: 45 }, // Thread the Needle
      { drillId: 'ip-finger-1', duration: 30 } // Finger Extensors
    ]
  },
  {
    id: 'routine-judo-warmup',
    name: 'Judo Warmup',
    type: 'warmup',
    duration: 5,
    description: 'Explosive warmup for judo training with throwing focus.',
    forSport: ['judo'],
    forWorkoutFocus: ['Explosive Pulls', 'Plyometrics'],
    drills: [
      { drillId: 'wu-2', duration: 30 },  // Jumping Jacks
      { drillId: 'wu-4', duration: 45 },  // Leg Swings
      { drillId: 'ip-shoulder-3', duration: 45 }, // Shoulder Dislocates
      { drillId: 'mob-hip-1', duration: 45 }, // Hip Circles
      { drillId: 'ip-shoulder-1', duration: 45 } // Face Pulls
    ]
  },
  {
    id: 'routine-upper-recovery',
    name: 'Upper Body Recovery',
    type: 'recovery',
    duration: 5,
    description: 'Recovery routine after upper body focused workouts.',
    forWorkoutFocus: ['Upper Body & Core', 'Push & Core', 'Grip & Carry Strength'],
    drills: [
      { drillId: 'ip-shoulder-3', duration: 60 }, // Shoulder Dislocates
      { drillId: 'mob-shoulder-1', duration: 60 }, // Thread the Needle
      { drillId: 'ip-back-1', duration: 60 }, // Cat-Cow
      { drillId: 'mob-spine-1', duration: 60 }, // Thoracic Extensions
      { drillId: 'ip-neck-2', duration: 45 } // Neck Curls
    ]
  },
  {
    id: 'routine-lower-recovery',
    name: 'Lower Body Recovery',
    type: 'recovery',
    duration: 5,
    description: 'Recovery routine after lower body focused workouts.',
    forWorkoutFocus: ['Lower Body Power', 'Legs & Hips'],
    drills: [
      { drillId: 'ip-hip-1', duration: 90 }, // 90/90 Hip Stretch
      { drillId: 'ip-hip-2', duration: 60 }, // Cossack Squats
      { drillId: 'mob-ankle-1', duration: 45 }, // Ankle Circles
      { drillId: 'ip-knee-1', duration: 45 } // Terminal Knee Extensions
    ]
  },
  {
    id: 'routine-full-mobility',
    name: 'Full Body Mobility',
    type: 'mobility',
    duration: 10,
    description: 'Comprehensive mobility routine for rest days or recovery.',
    drills: [
      { drillId: 'ip-back-1', duration: 60 }, // Cat-Cow
      { drillId: 'mob-hip-2', duration: 90 }, // World's Greatest Stretch
      { drillId: 'ip-hip-1', duration: 90 }, // 90/90 Hip Stretch
      { drillId: 'mob-shoulder-1', duration: 60 }, // Thread the Needle
      { drillId: 'mob-spine-1', duration: 60 }, // Thoracic Extensions
      { drillId: 'ip-shoulder-3', duration: 60 }, // Shoulder Dislocates
      { drillId: 'mob-ankle-1', duration: 45 }, // Ankle Circles
      { drillId: 'ip-hip-2', duration: 60 } // Cossack Squats
    ]
  }
]

// ============================================
// LEARNING PATHS
// ============================================

export const learningPaths: LearningPath[] = [
  {
    id: 'path-wrestling-fundamentals',
    name: 'Wrestling Fundamentals',
    description: 'Master the essential wrestling techniques from stance to takedowns.',
    sport: 'wrestling',
    difficulty: 'beginner',
    drills: ['tech-sprawl', 'tech-single-leg', 'tech-double-leg'],
    estimatedWeeks: 4
  },
  {
    id: 'path-injury-prevention',
    name: 'Injury Prevention Essentials',
    description: 'Build a bulletproof body with these essential prehab exercises.',
    sport: 'wrestling',
    difficulty: 'beginner',
    drills: ['ip-neck-1', 'ip-shoulder-1', 'ip-knee-1', 'ip-hip-1', 'ip-back-1'],
    estimatedWeeks: 2
  }
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getDrillById(id: string): Drill | undefined {
  return allDrills.find(drill => drill.id === id)
}

export function getDrillsByCategory(category: DrillCategory): Drill[] {
  return allDrills.filter(drill => drill.category === category)
}

export function getDrillsBySubcategory(subcategory: DrillSubcategory): Drill[] {
  return allDrills.filter(drill => drill.subcategory === subcategory)
}

export function getRoutineById(id: string): Routine | undefined {
  return routines.find(routine => routine.id === id)
}

export function getRoutinesForWorkout(workoutFocus: string, sport?: string): Routine[] {
  return routines.filter(routine => {
    const matchesFocus = routine.forWorkoutFocus?.includes(workoutFocus)
    const matchesSport = !sport || !routine.forSport || routine.forSport.includes(sport as any)
    return matchesFocus && matchesSport
  })
}

export function getLearningPathById(id: string): LearningPath | undefined {
  return learningPaths.find(path => path.id === id)
}

// Category display info
export const categoryInfo: Record<DrillCategory, { name: string; icon: string; description: string }> = {
  'technique': { name: 'Technique', icon: '🤼', description: 'Wrestling, BJJ, and Judo techniques' },
  'exercise': { name: 'Exercise Demos', icon: '💪', description: 'Strength training exercise guides' },
  'injury-prevention': { name: 'Injury Prevention', icon: '🛡️', description: 'Prehab exercises by body part' },
  'mobility': { name: 'Mobility', icon: '🧘', description: 'Stretches and mobility work' },
  'conditioning': { name: 'Conditioning', icon: '🔥', description: 'Cardio and conditioning drills' },
  'warmup': { name: 'Warmup', icon: '🏃', description: 'Pre-workout warmup drills' },
  'recovery': { name: 'Recovery', icon: '💆', description: 'Post-workout recovery' }
}

// Body part display info for injury prevention
export const bodyPartInfo: Record<string, { name: string; icon: string }> = {
  'neck': { name: 'Neck', icon: '🦒' },
  'shoulders': { name: 'Shoulders', icon: '💪' },
  'knees': { name: 'Knees', icon: '🦵' },
  'hips': { name: 'Hips', icon: '🦴' },
  'back': { name: 'Back', icon: '🔙' },
  'fingers': { name: 'Fingers', icon: '🤚' }
}

