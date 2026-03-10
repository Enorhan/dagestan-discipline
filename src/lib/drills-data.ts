import {
  Drill,
  LearningPath,
  Routine,
  DrillCategory,
  DrillSubcategory,
  DrillDifficulty,
  SportType,
} from './types'
import { techniqueVideoUrls } from './drill-video-urls'

type TechniqueSeed = [
  name: string,
  subcategory: DrillSubcategory,
  difficulty: DrillDifficulty,
  description: string,
]

const sportNames: Record<SportType, string> = {
  wrestling: 'Wrestling',
  judo: 'Judo',
  bjj: 'Jiu-Jitsu',
}

const durationByDifficulty: Record<DrillDifficulty, number> = {
  beginner: 150,
  intermediate: 180,
  advanced: 240,
}

const subcategoryFocus: Partial<Record<DrillSubcategory, string>> = {
  takedowns: 'entry timing, balance, and finishing mechanics',
  defense: 'early reactions, posture, and counter-positioning',
  'ground-work': 'control, transitions, and pressure',
  submissions: 'control before the finish and tight mechanics',
  escapes: 'framing, hip movement, and posture recovery',
  general: 'repeatable movement quality and decision-making',
}

const coachingCuePresets: Partial<Record<DrillSubcategory, string[]>> = {
  takedowns: ['Lower your level first', 'Win the angle before you finish', 'Drive through the end of the rep'],
  defense: ['See it early', 'Win head and hand position', 'Recover square hips'],
  'ground-work': ['Control before you move', 'Own inside space', 'Keep pressure connected'],
  submissions: ['Control first, finish second', 'Remove space before squeezing', 'Follow the reaction'],
  escapes: ['Build frames first', 'Move your hips before your shoulders', 'Face back into your partner'],
  general: ['Stay balanced', 'Keep every rep clean', 'Reset quickly for the next repetition'],
}

const commonMistakePresets: Partial<Record<DrillSubcategory, string[]>> = {
  takedowns: ['Reaching without moving the feet', 'Standing tall on entry', 'Trying to finish before securing the angle'],
  defense: ['Reacting late', 'Giving up inside position', 'Recovering without head pressure'],
  'ground-work': ['Moving without control', 'Leaving space during transitions', 'Rushing past the dominant position'],
  submissions: ['Chasing the finish without control', 'Leaving an escape route open', 'Using speed instead of structure'],
  escapes: ['Exploding without frames', 'Turning away from the partner', 'Trying to stand before winning posture'],
  general: ['Going too fast too early', 'Letting posture break between reps', 'Treating the drill like conditioning instead of skill work'],
}

const soloDrillMatchers = [
  /shrimp/i,
  /technical stand/i,
  /ukemi/i,
  /breakfall/i,
  /footwork/i,
  /stance/i,
  /movement/i,
  /shadow/i,
  /granby/i,
  /circles/i,
  /penetration step/i,
]

const moveLabelMatchers: Array<[RegExp, string]> = [
  [/Shintai and Tsugi-Ashi/i, 'movement and sliding-step footwork'],
  [/Ippon Seoi-nage/i, 'one-arm shoulder throw'],
  [/O-soto-gari/i, 'major outer reap'],
  [/Seoi-nage/i, 'shoulder throw'],
  [/Harai-goshi/i, 'sweeping hip throw'],
  [/O-goshi/i, 'major hip throw'],
  [/Tai-otoshi/i, 'body-drop throw'],
  [/Uchi-mata/i, 'inner-thigh throw'],
  [/Ouchi-gari/i, 'major inner reap'],
  [/Kouchi-gari|Ko-uchi/i, 'minor inner reap'],
  [/Ko-soto|Kosoto-gake/i, 'minor outer hook'],
  [/Sasae-tsurikomi-ashi/i, 'prop ankle throw'],
  [/De-ashi-barai|Okuri-ashi-harai/i, 'foot sweep'],
  [/Kesa-gatame/i, 'scarf-hold pin'],
  [/Yoko-shiho-gatame/i, 'side pin'],
  [/Tate-shiho-gatame/i, 'mounted pin'],
  [/Juji-gatame/i, 'armbar'],
  [/Okuri-eri-jime/i, 'sliding collar choke'],
  [/Hadaka-jime/i, 'rear naked choke'],
  [/Sangaku/i, 'triangle attack'],
  [/Kumikata/i, 'grip fighting'],
  [/Kuzushi/i, 'off-balancing'],
  [/Ukemi/i, 'breakfall practice'],
  [/Sumi-gaeshi/i, 'corner sacrifice throw'],
  [/Tomoe-nage/i, 'circle throw'],
  [/Ne-waza/i, 'ground grappling'],
  [/De La Riva/i, 'outside-hook open guard'],
  [/Single-Leg X/i, 'single-leg X guard'],
  [/Torreando/i, 'bullfighter-style pass'],
  [/Omoplata/i, 'shoulder lock with the legs'],
  [/Berimbolo/i, 'inversion back-take entry'],
  [/Body Lock Pass/i, 'body-lock pass'],
  [/Leg Drag/i, 'leg-drag pass'],
  [/Knee Cut/i, 'knee-cut pass'],
  [/X-Pass/i, 'cross-step pass'],
  [/Waiter Sweep/i, 'under-the-leg elevation sweep'],
  [/Knee Shield/i, 'shin-frame half guard'],
  [/Dogfight/i, 'half-guard wrestling-up position'],
  [/Rear Naked Choke/i, 'rear naked choke'],
  [/Cross-Collar Choke/i, 'cross-collar choke'],
  [/Arm Triangle/i, 'arm-triangle choke'],
  [/Triangle/i, 'triangle choke'],
  [/Kimura/i, 'kimura shoulder lock'],
  [/Americana/i, 'americana shoulder lock'],
  [/Guillotine/i, 'guillotine choke'],
  [/Armbar/i, 'armbar'],
  [/Back Take/i, 'back take'],
  [/Guard Retention/i, 'guard-retention movement'],
  [/Technical Stand-Up/i, 'safe stand-up'],
  [/Reverse Shrimp/i, 'reverse hip escape'],
  [/Shrimp/i, 'hip-escape movement'],
  [/Granby/i, 'rolling hip escape'],
  [/Russian Tie/i, 'two-on-one arm tie'],
  [/Front Headlock/i, 'front headlock control'],
  [/Whizzer/i, 'overhook counter pressure'],
  [/Crackdown/i, 'split-leg scramble position'],
  [/Quadpod/i, 'hands-and-feet build-up'],
  [/Funk Roll/i, 'roll-through scramble defense'],
  [/Peek-Out/i, 'sit-out style escape'],
  [/Double Leg/i, 'double-leg takedown'],
  [/Single Leg/i, 'single-leg attack'],
  [/High Crotch/i, 'high-crotch entry'],
  [/Ankle Pick/i, 'ankle pick'],
  [/Arm Drag/i, 'arm drag'],
  [/Duck Under/i, 'duck under'],
  [/Snap Down/i, 'snap down'],
  [/Pummel/i, 'pummeling for inside control'],
  [/Sprawl/i, 'sprawl defense'],
  [/Collar Drag/i, 'collar drag'],
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildTechniqueId(sport: SportType, name: string): string {
  return `${sport}-${slugify(name)}`
}

function formatSubcategoryLabel(subcategory: DrillSubcategory): string {
  return subcategory.split('-').join(' ')
}

function uniqueItems(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function getMoveLabel(name: string): string | null {
  for (const [matcher, label] of moveLabelMatchers) {
    if (matcher.test(name)) {
      return label
    }
  }

  return null
}

function getPracticeMethod(name: string): string | null {
  if (/Uchikomi/i.test(name)) return 'repeated entry practice without completing the throw'
  if (/Nagekomi/i.test(name)) return 'full throw practice with controlled completion'
  if (/Randori/i.test(name)) return 'live practice with agreed pace and resistance'
  if (/(Combination|Chain|Flow|Follow-Up)/i.test(name)) return 'chaining one attack or transition into the next'
  if (/Counter/i.test(name)) return 'a counter that uses the opponent’s motion'
  if (/Objective/i.test(name)) return 'a live round with one clear tactical goal'
  if (/(Timing|Mechanics|Pattern|Sequence|Circuit|Awareness|Integration)/i.test(name)) return 'focused repetition to build timing and body awareness'
  return null
}

function buildPlainEnglishSummary(name: string): string | null {
  const moveLabel = getMoveLabel(name)
  const practiceMethod = getPracticeMethod(name)

  if (moveLabel && practiceMethod) {
    return `In plain English, this is ${practiceMethod} for ${moveLabel}.`
  }

  if (moveLabel) {
    return `In plain English, this focuses on ${moveLabel}.`
  }

  if (practiceMethod) {
    return `In plain English, this is ${practiceMethod}.`
  }

  return null
}

function isSoloDrill(name: string): boolean {
  return soloDrillMatchers.some((matcher) => matcher.test(name))
}

function buildModeNote(isSolo: boolean): string {
  return isSolo
    ? 'This is a solo drill, so focus on smooth movement, balance, and clean reps before you add speed.'
    : 'This is a partner drill, so agree on pace, resistance, and resets before the first rep.'
}

function buildSafetyNote(sport: SportType, subcategory: DrillSubcategory, name: string, isSolo: boolean): string {
  if (subcategory === 'submissions') {
    return 'Apply the finish slowly, stop when control is lost, and release immediately if your partner taps.'
  }

  if (sport === 'judo' && !isSolo && subcategory === 'takedowns') {
    return 'For beginners, keep the rep cooperative and make sure your partner can post, fall, or land safely on every repetition.'
  }

  if (/(Granby|Berimbolo|Roll|Breakfall|Ukemi)/i.test(name)) {
    return 'Start slowly and roll over the shoulders rather than the neck or head.'
  }

  if (subcategory === 'escapes') {
    return 'Move only as fast as you can keep frames, posture, and neck safety.'
  }

  if (!isSolo) {
    return 'Start with light, cooperative resistance and only build intensity once the movement feels controlled.'
  }

  return 'Stay balanced through the full rep and reset your posture before the next repetition.'
}

function buildBenefits(sport: SportType, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const sportLabel = sportNames[sport]
  const subcategoryLabel = formatSubcategoryLabel(subcategory)

  return [
    `Builds sharper ${subcategoryLabel} timing for ${sportLabel.toLowerCase()}.`,
    isSolo
      ? 'Improves body awareness, posture, and repeatable mechanics without outside pressure.'
      : 'Improves posture, balance, and timing with a partner under controlled resistance.',
    'Helps the drill transfer more cleanly into situational rounds and live work.',
  ]
}

function buildDescription(
  sport: SportType,
  name: string,
  subcategory: DrillSubcategory,
  seedDescription: string,
  isSolo: boolean,
): string {
  return [
    seedDescription,
    buildPlainEnglishSummary(name),
    buildModeNote(isSolo),
    buildSafetyNote(sport, subcategory, name, isSolo),
  ].join(' ')
}

function buildGenericInstructions(sport: SportType, name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const sportLabel = sportNames[sport].toLowerCase()
  const moveLabel = getMoveLabel(name) ?? formatSubcategoryLabel(subcategory)

  return [
    `Start in a stable ${sportLabel} position that gives you enough room to perform the drill safely.`,
    `Set the rep up slowly so you can feel the right posture, grips, and balance for ${moveLabel}.`,
    'Perform the main movement with control and finish in a position you could actually use in training.',
    isSolo
      ? 'Reset to a balanced base after each rep and repeat evenly on both sides when possible.'
      : 'Pause after each rep, let your partner recover, and return together to the start position.',
    'Only add speed or resistance after both the shape and the timing stay consistent.',
  ]
}

function buildWrestlingInstructions(name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const moveLabel = getMoveLabel(name) ?? 'the scoring action'

  if (/(Stance|Motion|Circles|Pummel|Collar Tie|Elbow Control|Head Position Fight|Circle and Re-Attack|Edge Circle)/i.test(name)) {
    return [
      'Start in a low wrestling stance with your knees bent, head over hips, and hands ready to make contact.',
      'Move your feet first so your stance stays underneath you instead of bouncing upright between steps.',
      'Win the tie, inside position, or head position named in the drill while keeping your elbows in and posture strong.',
      'Circle, snap, or change angle without crossing your feet or letting your hips drift behind you.',
      'Reset to stance after every short exchange and keep the reps crisp rather than rushed.',
    ]
  }

  if (/(Level Change|Penetration Step|Shadow Shot|Double Leg|Single Leg|High Crotch|Sweep Single|Knee Pull Single|Ankle Pick|Duck Under|Arm Drag|Russian Tie|Underhook Knee Tap|Low Single|Double Off the Whistle|Shot Finish|Chain Wrestle|Shuck-by)/i.test(name)) {
    return [
      'Start from stance at a realistic distance where you can touch hands or make the setup tie without reaching.',
      `Create the opening for ${moveLabel} by moving the feet first, lowering your level, and keeping your chest up.`,
      'Step into the attack with your hips underneath you instead of diving with your upper body.',
      'Finish by turning the corner, running through the leg, or coming to the rear angle before you relax the grip.',
      isSolo
        ? 'Shadow the finish back to stance and repeat balanced reps on both sides when appropriate.'
        : 'Cover the hips or secure control at the end of the rep, then reset with your partner before going again.',
    ]
  }

  if (/(Snap Down|Front Headlock|Go-Behind|Short Offense)/i.test(name)) {
    return [
      'Start from a collar tie, front headlock, or neutral hand-fight where you can break posture without yanking wildly.',
      'Pull the head and shoulders down while keeping your own hips back and your feet active.',
      'Circle to the side rather than backing straight up so the opponent stays folded and you keep the angle.',
      'Spin behind, re-snap, or connect to the front-headlock finish that the drill is built around.',
      'Reset once the posture break is gone and repeat clean, short exchanges instead of grinding the position.',
    ]
  }

  if (/(Sprawl|Down Block|Whizzer|Re-Attack off Opponent Single|Scramble Chest-Wrap|Funk Roll)/i.test(name)) {
    return [
      'Start with your partner giving you a realistic shot or scramble trigger so the defensive reaction is honest.',
      'React by lowering hips, winning head and hand position, and blocking the line of the attack early.',
      'Use the named defensive tool to stop the attack before the opponent gets deep control on your legs or hips.',
      'Square back up, circle to safety, or counter to top control as soon as the pressure shifts in your favor.',
      'Reset quickly and repeat at a pace where both athletes can recognize the reaction instead of guessing.',
    ]
  }

  if (/(Peek-Out|Stand-Up|Granby|Sit-Out|Switch|Quadpod|Referee Position)/i.test(name)) {
    return [
      'Start from bottom with a realistic top ride and first protect your hands, elbows, and neck.',
      'Build your base before trying to explode so the escape starts from posture instead of panic.',
      'Use the named movement to create an angle, clear the hips, and face back in toward your partner.',
      'Finish by escaping to stance, coming to a leg, or at minimum recovering square position under control.',
      'Reset the ride and repeat until the first movement becomes automatic and balanced.',
    ]
  }

  if (/(Mat Return|Spiral Ride|Chop and Drive|Half Nelson|Tilt|Leg Ride)/i.test(name)) {
    return [
      'Start on top with your chest connected and your hips following the opponent instead of floating behind them.',
      'Secure the wrist, arm, waist, ankle, or leg ride that makes the drill work before trying to force the breakdown.',
      'Apply forward pressure through your hips and shoulders so the opponent carries your weight.',
      'Finish the breakdown, turn, or return under control and stay connected until the position is clearly won.',
      'Reset the top position and repeat with enough pressure to be realistic but not sloppy.',
    ]
  }

  if (/Live Situational/i.test(name)) {
    return [
      'Choose a clear starting position and scoring goal before the round begins so both partners know what counts.',
      'Work live from that position with real reactions instead of taking turns or pausing after the first movement.',
      'Keep wrestling until one athlete scores, escapes, or reaches the stated objective.',
      'Stop, give quick feedback, and restart from the same spot so you get repeated decision-making under pressure.',
      'Raise the resistance only if both athletes are still using clean technique rather than forcing scrambles.',
    ]
  }

  return buildGenericInstructions('wrestling', name, subcategory, isSolo)
}

function buildJudoInstructions(name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const moveLabel = getMoveLabel(name) ?? 'the throw or control'

  if (/(Ukemi|Breakfall)/i.test(name)) {
    return [
      'Start from the easiest height or version first so you can learn the landing shape before adding speed.',
      'Tuck the chin, round the body, and slap the mat with the arm to spread the impact instead of bracing with the hand.',
      'Land across the back and shoulder line rather than directly on the spine, elbow, or head.',
      'Stand back up under control and repeat to both sides so the fall becomes automatic.',
      'Only move to harder falls once every rep is quiet, smooth, and pain free.',
    ]
  }

  if (/(Shintai|Tsugi-Ashi|Footwork)/i.test(name)) {
    return [
      'Start in a tall but ready judo stance with soft knees and your feet underneath your hips.',
      'Move forward, backward, or across the mat without crossing the feet or clicking the heels together.',
      'Keep your shoulders calm and posture upright so the feet glide instead of hopping.',
      'Add the direction change or rhythm named in the drill while staying balanced enough to throw or defend at any time.',
      'Repeat until the movement feels smooth enough to use with grips and a partner.',
    ]
  }

  if (/(Kumikata|Grip)/i.test(name)) {
    return [
      'Start at gripping distance with both athletes moving their feet instead of standing flat.',
      'Win the first sleeve, lapel, belt, or over-back contact with posture instead of leaning your head forward.',
      'If the drill includes grip breaks, strip the grip first and immediately replace it with your preferred hold.',
      'Keep stepping while you grip so the upper-body battle stays connected to real throwing distance.',
      'Reset often and repeat short exchanges so grip quality matters more than hand speed alone.',
    ]
  }

  if (/Kuzushi/i.test(name)) {
    return [
      'Start with the grips you would really use for the throw or direction you are trying to create.',
      'Pull, lift, turn, or steer your partner so their weight moves onto the foot you want to attack.',
      'Watch for the moment when posture breaks before you think about stepping into the throw.',
      'Return to neutral once the balance recovers and repeat until the off-balance happens on purpose.',
      'Treat the kuzushi as the start of the throw, not as a separate hand-only drill.',
    ]
  }

  if (/Uchikomi/i.test(name)) {
    return [
      'Start with cooperative grips and enough posture that both partners can move safely.',
      `Off-balance your partner first, then step into ${moveLabel} without trying to launch the full throw.`,
      'Turn in close, keep your feet underneath you, and stop at the strongest entry position.',
      'Back out cleanly to stance and immediately repeat so the rhythm stays smooth and technical.',
      'Only add speed after both partners can keep posture and safe spacing through every entry.',
    ]
  }

  if (/Nagekomi/i.test(name)) {
    return [
      'Start with grips, posture, and an agreed pace so the throw can be completed safely.',
      `Create kuzushi first, then step all the way into ${moveLabel} with your hips and feet in the right place.`,
      'Complete the throw under control instead of trying to whip or muscle the finish.',
      'Follow your partner down safely or recover to stance according to the goal of the drill.',
      'Reset with your partner after every throw and keep the reps clean enough for safe landings.',
    ]
  }

  if (/(Combination|Follow-Up|Chain)/i.test(name)) {
    return [
      'Start with the first attack at realistic speed so your partner gives the reaction the combination needs.',
      'Stay connected through the grips and feet instead of fully resetting after the first attack is defended.',
      'Feel the partner’s weight shift, then switch directly to the second throw, reap, or follow-up named in the drill.',
      'Finish the second action under control and keep your balance as the partner lands or recovers.',
      'Repeat until the transition between first and second attack feels like one continuous movement.',
    ]
  }

  if (/(Counter|Reaction Counter|Grip Break|Posture Recovery|Sprawl)/i.test(name)) {
    return [
      'Start with your partner giving you the grip, step, or attack that triggers the defensive response.',
      'Fix posture and base first so you are defending from structure rather than leaning or hopping.',
      'Use the named counter, break, or recovery action as soon as the opponent’s weight commits forward or sideways.',
      'Square back up or finish the counter under control before relaxing the grips.',
      'Repeat at a pace where both players can recognize the timing and stay safe.',
    ]
  }

  if (/(Turtle|Kesa-gatame|Shiho-gatame|Pin to Submission|Stand-Up to Ground|Ne-waza)/i.test(name)) {
    return [
      'Start from the ground position named in the drill with clear head, arm, hip, and far-side control.',
      'Settle your weight before trying to turn the partner or move to the next hold.',
      'Use the angle change, turnover, or pin transition slowly enough that you do not lose chest connection.',
      'Hold the final control for a moment so you learn what a stable finish should feel like.',
      'Reset to the starting position and repeat until the control comes before the transition.',
    ]
  }

  if (/(Juji-gatame|Jime|Sangaku|Clock Choke|Armbar)/i.test(name)) {
    return [
      'Start from the pin, turtle, or back-control position that gives you reliable control before the submission.',
      'Isolate the arm or neck first so the finish does not rely on speed or surprise.',
      'Angle your body into the named submission and tighten the structure before you add finishing pressure.',
      'Apply pressure gradually, pause as soon as the tap comes, and release cleanly before resetting.',
      'Repeat slowly enough that both partners learn the entry, control, and safe exit.',
    ]
  }

  if (/(Randori|Objective)/i.test(name)) {
    return [
      'Agree on the pace, scoring goal, and allowable intensity before the round begins.',
      'Move, grip, attack, and defend live while staying within the stated objective of the drill.',
      'Look for clean entries and good timing instead of forcing low-quality attacks for volume.',
      'Reset after the score, the stoppage, or the time limit and immediately go again from a fair start.',
      'Raise resistance only if both judoka are still throwing and landing safely.',
    ]
  }

  return buildGenericInstructions('judo', name, subcategory, isSolo)
}

function buildBjjInstructions(name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const moveLabel = getMoveLabel(name) ?? 'the position or movement'

  if (/(Shrimp|Technical Stand-Up|Granby|Shoulder Roll)/i.test(name)) {
    return [
      'Start on the mat or seated with enough space to move on both sides without rushing.',
      `Perform ${moveLabel} slowly enough that you can feel your hips, shoulders, and base doing the work.`,
      'Finish each rep in a stable guard, seated, or standing position instead of collapsing at the end.',
      'Repeat to both sides when the movement allows so your movement quality stays even.',
      'Only add speed after the path of the movement feels clean and neck-safe.',
    ]
  }

  if (/(Torreando|Knee Cut|Long-Step|X-Pass|Leg Drag|Body Lock Pass)/i.test(name)) {
    return [
      'Start on top in front of the guard with your grips or inside position already established.',
      'Control the legs and hips first so the bottom player cannot immediately square back up.',
      `Use the passing route from the drill to clear the knees and hips while staying tight enough to stop re-guarding.`,
      'Settle into side control, mount, or the target top position before you consider the rep finished.',
      'Reset to guard and repeat with just enough resistance to make the angle and pressure matter.',
    ]
  }

  if (/(Guard Retention|De La Riva|Single-Leg X|Tripod|Scissor|Pendulum|Flower|Half Guard|Knee Shield|Sit-Up Guard|Hip Heist|Collar Drag|Waiter|Wrestle-Up)/i.test(name)) {
    return [
      'Start in the guard or seated position that the drill is based on, with frames and grips already organized.',
      'Off-balance the partner or create space first so the sweep, wrestle-up, or guard entry has a reason to work.',
      `Enter ${moveLabel} with your hips underneath you instead of reaching with the arms.`,
      'Come up to top position or recover a strong guard shape before you reset the rep.',
      'Repeat at cooperative pace first, then add progressive resistance once the angle is reliable.',
    ]
  }

  if (/(Armbar|Triangle|Omoplata|Kimura|Guillotine|Rear Naked Choke|Bow-and-Arrow|Cross-Collar Choke|Arm Triangle|Americana|S-Mount)/i.test(name)) {
    return [
      'Start from the controlling position that the submission depends on rather than jumping straight to the finish.',
      'Isolate the arm, neck, or shoulder first and use your hips and angle to remove escape space.',
      `Connect the body position for ${moveLabel} before you add finishing pressure.`,
      'Tighten the finish gradually, stop on the tap, and release with control before resetting.',
      'Keep the reps technical and cooperative so both partners learn the entry and the safe exit.',
    ]
  }

  if (/(Back Take|Seatbelt Retention|Turtle Breakdown|Side Control to Mount|Knee-on-Belly|North-South)/i.test(name)) {
    return [
      'Start from the positional control named in the drill with chest connection and hips in the right lane.',
      'Secure the seatbelt, cross-face, underhook, or hip block that stops the partner from turning back in.',
      'Move to the next control point without creating big gaps that let the partner recover guard.',
      'Hold the final position for a moment so you learn the balance and pressure of a real finish.',
      'Reset the position and repeat until the transition feels smooth instead of rushed.',
    ]
  }

  if (/(Underhook Escape|Elbow-Knee|Upa|Back Escape|Turtle Roll-Through)/i.test(name)) {
    return [
      'Start in the bad position with your neck protected and your frames or hand fighting already in mind.',
      'Build the frame, trap, or wedge that makes the escape possible before you try to explode.',
      'Use the named escape to move your hips and shoulders together until you reach guard, top, or neutral.',
      'Pause in the recovered position so the rep ends with control rather than another scramble.',
      'Repeat slowly enough that you can keep posture and breathing through the entire escape.',
    ]
  }

  if (/(Single-Leg Defense|Sprawl to Go-Behind|Snap Down to Guillotine Decision)/i.test(name)) {
    return [
      'Start from neutral or from a realistic shot attempt so the defensive read is honest.',
      'React by lowering the hips, winning head position, and controlling the line of the attack.',
      'Choose the spin-behind, front-headlock control, or submission path that the drill is teaching.',
      'Finish on top or in a dominant control before letting the position go.',
      'Reset quickly and repeat until the decision happens without panic or hesitation.',
    ]
  }

  if (/Berimbolo/i.test(name)) {
    return [
      'Start from a cooperative open-guard position where the partner’s weight is already tipped enough to invert safely.',
      'Place your grips and hooks first so the inversion is guided by structure instead of momentum alone.',
      'Roll onto the shoulders, not the neck, and follow the partner’s hips toward the back-take line.',
      'Come up under control into the back or dominant top position before ending the rep.',
      'Keep this drill slow and technical until the inversion path feels safe and repeatable.',
    ]
  }

  if (/Armbar Triangle Omoplata Flow/i.test(name)) {
    return [
      'Start in closed guard with one arm already isolated enough to threaten the first attack.',
      'Enter the armbar cleanly, then pay attention to the defensive reaction instead of forcing the finish.',
      'Flow to the triangle or omoplata as the partner pulls the arm, postures, or turns away.',
      'Stop each rep once you reach strong control on the new attack rather than cranking to the finish.',
      'Repeat slowly so the chain feels like connected decision-making instead of memorized speed.',
    ]
  }

  return buildGenericInstructions('bjj', name, subcategory, isSolo)
}

function buildInstructions(sport: SportType, name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  if (sport === 'wrestling') return buildWrestlingInstructions(name, subcategory, isSolo)
  if (sport === 'judo') return buildJudoInstructions(name, subcategory, isSolo)
  return buildBjjInstructions(name, subcategory, isSolo)
}

function buildCoachingCues(sport: SportType, name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const defaultCues = coachingCuePresets[subcategory] ?? coachingCuePresets.general ?? []
  const specificCues: string[] = []

  if (sport === 'wrestling' && subcategory === 'takedowns') specificCues.push('Lead with your level change')
  if (sport === 'judo' && subcategory === 'takedowns') specificCues.push('Off-balance before entry')
  if (sport === 'bjj' && /(Pass|Passing|Leg Drag|Body Lock|Knee Cut|X-Pass|Torreando|Long-Step)/i.test(name)) {
    specificCues.push('Clear the knee line before settling')
  }
  if (subcategory === 'submissions') specificCues.push('Tighten gradually, do not crank')
  if (subcategory === 'escapes') specificCues.push('Protect your neck while you move')
  if (!isSolo) specificCues.push('Start light, then build resistance')

  return uniqueItems([...specificCues, ...defaultCues]).slice(0, 4)
}

function buildCommonMistakes(sport: SportType, name: string, subcategory: DrillSubcategory, isSolo: boolean): string[] {
  const defaultMistakes = commonMistakePresets[subcategory] ?? commonMistakePresets.general ?? []
  const specificMistakes: string[] = []

  if (sport === 'wrestling' && subcategory === 'takedowns') {
    specificMistakes.push('Shooting with the hands before the level change')
  }
  if (sport === 'judo' && subcategory === 'takedowns' && !isSolo) {
    specificMistakes.push('Trying to throw hard before the off-balance and landing are safe')
  }
  if (sport === 'bjj' && /(Pass|Passing|Leg Drag|Body Lock|Knee Cut|X-Pass|Torreando|Long-Step)/i.test(name)) {
    specificMistakes.push('Chasing the pass before controlling the hips or knees')
  }
  if (subcategory === 'submissions') {
    specificMistakes.push('Applying the finish too fast instead of tightening in stages')
  }
  if (subcategory === 'escapes') {
    specificMistakes.push('Trying to explode before the frame or hand fight is in place')
  }
  if (/(Granby|Berimbolo|Roll|Breakfall|Ukemi)/i.test(name)) {
    specificMistakes.push('Rolling over the neck instead of the shoulders')
  }

  return uniqueItems([...specificMistakes, ...defaultMistakes]).slice(0, 4)
}

function createTechniqueDrillsForSport(sport: SportType, seeds: TechniqueSeed[]): Drill[] {
  const ids = seeds.map(([name]) => buildTechniqueId(sport, name))

  return seeds.map(([name, subcategory, difficulty, description], index) => {
    const isSolo = isSoloDrill(name)
    const id = ids[index]

    return {
      id,
      name,
      category: 'technique',
      subcategory,
      videoUrl: techniqueVideoUrls[id] ?? '',
      duration: durationByDifficulty[difficulty],
      difficulty,
      sportRelevance: [sport],
      equipment: isSolo ? ['none'] : ['partner'],
      description: buildDescription(sport, name, subcategory, description, isSolo),
      benefits: buildBenefits(sport, subcategory, isSolo),
      instructions: buildInstructions(sport, name, subcategory, isSolo),
      commonMistakes: buildCommonMistakes(sport, name, subcategory, isSolo),
      coachingCues: buildCoachingCues(sport, name, subcategory, isSolo),
      relatedDrills: [ids[index - 1], ids[index + 1]].filter(Boolean) as string[],
    }
  })
}

function createLearningPath(
  id: string,
  name: string,
  description: string,
  sport: SportType,
  drillNames: string[],
): LearningPath {
  return {
    id,
    name,
    description,
    sport,
    difficulty: 'beginner',
    drills: drillNames.map((drillName) => buildTechniqueId(sport, drillName)),
    estimatedWeeks: 6,
  }
}

const wrestlingTechniqueSeeds: TechniqueSeed[] = [
  ['Stance and Motion Circles', 'general', 'beginner', 'Builds stance discipline, level changes, and clean re-entries while you stay balanced on the move.'],
  ['Level Change and Penetration Step', 'takedowns', 'beginner', 'Reinforces the core footwork and hip drop that power efficient shot entries.'],
  ['Shadow Shot Entries', 'takedowns', 'beginner', 'Grooves fast single, double, and high-crotch entries without breaking posture.'],
  ['Double Leg Finish to the Corner', 'takedowns', 'beginner', 'Trains driving through the hips, cutting the corner, and finishing with control.'],
  ['Single Leg Shelf Finish', 'takedowns', 'beginner', 'Sharpens lifting, shelving, and running the pipe when the leg is secured.'],
  ['High Crotch Cut Corner Finish', 'takedowns', 'intermediate', 'Connects a tight high crotch to an angle change before the finish.'],
  ['Sweep Single Finish', 'takedowns', 'intermediate', 'Teaches head position and foot sweeps once the single leg is elevated.'],
  ['Knee Pull Single Conversion', 'takedowns', 'intermediate', 'Builds the timing to switch from a hanging single to a knee-pull finish.'],
  ['Reshot After Sprawl', 'takedowns', 'intermediate', 'Develops immediate re-attacks when the first shot stalls or gets defended.'],
  ['Snap Down to Front Headlock', 'takedowns', 'beginner', 'Builds posture breaks and clean front-headlock connections off upper-body ties.'],
  ['Go-Behind from Front Headlock', 'ground-work', 'beginner', 'Teaches circling behind once the opponent is broken to the mat.'],
  ['Sprawl and Crossface Defense', 'defense', 'beginner', 'Reinforces hip pressure and crossface position against incoming leg attacks.'],
  ['Down Block to Spin Behind', 'defense', 'beginner', 'Sharpens the first reaction against shots and the immediate spin to control.'],
  ['Peek-Out from Referee Position', 'escapes', 'intermediate', 'Builds timing to escape underneath pressure and come out to a leg or rear angle.'],
  ['Stand-Up with Hand Control', 'escapes', 'beginner', 'Develops the safest bottom escape by clearing hands before rising.'],
  ['Granby Roll to Square-Up', 'escapes', 'advanced', 'Improves rolling awareness when hips are trapped and pressure stays forward.'],
  ['Sit-Out to Hip Heist', 'escapes', 'beginner', 'Teaches a compact bottom motion to create space and face back in.'],
  ['Switch from Bottom', 'escapes', 'intermediate', 'Connects hand control, hip turn, and angle change to reverse underneath.'],
  ['Quadpod Build-Up and Knee Slide', 'escapes', 'intermediate', 'Builds the ability to post, climb, and free the hips under ride pressure.'],
  ['Short Offense from Front Headlock', 'ground-work', 'intermediate', 'Chains snaps, shucks, and spin-behinds from dominant front-headlock control.'],
  ['Ankle Pick off Collar Tie', 'takedowns', 'beginner', 'Builds level change and pull timing when the lead leg becomes available.'],
  ['Duck Under to Rear Body Lock', 'takedowns', 'intermediate', 'Sharpens shoulder rotation and footwork for slipping past upper-body ties.'],
  ['Arm Drag to Single Leg', 'takedowns', 'beginner', 'Connects an arm drag to clean penetration on the near leg.'],
  ['Russian Tie to Knee Tap', 'takedowns', 'intermediate', 'Builds inside tie control and easy finishes from dominant two-on-one grips.'],
  ['Underhook Knee Tap Chain', 'takedowns', 'intermediate', 'Teaches pressure with the underhook before stepping to the far-side finish.'],
  ['Low Single Finish', 'takedowns', 'advanced', 'Develops head placement and corner turns when attacking the ankle.'],
  ['Double Leg Crackdown Finish', 'takedowns', 'advanced', 'Builds follow-up finishing mechanics when the opponent stuffs the initial double.'],
  ['Mat Return from Rear Body Lock', 'ground-work', 'beginner', 'Teaches controlled lifts, trips, and returns once rear control is won.'],
  ['Spiral Ride Breakdown', 'ground-work', 'beginner', 'Reinforces forward pressure, ankle control, and chest connection on top.'],
  ['Chop and Drive Breakdown', 'ground-work', 'beginner', 'Builds efficient breakdowns by chopping an arm and driving through the shoulder line.'],
  ['Half Nelson Turn', 'ground-work', 'beginner', 'Sharpens one of the most common turning attacks from top control.'],
  ['Tilt from Wrist Ride', 'ground-work', 'intermediate', 'Teaches wrist control and hip angle for controlled exposure turns.'],
  ['Leg Ride Pressure Drill', 'ground-work', 'advanced', 'Builds heavy hips and tight upper-body control while riding with a leg in.'],
  ['Pummel and Position Hand Fight', 'general', 'beginner', 'Develops feel for inside control, underhooks, and stable upper-body positioning.'],
  ['Collar Tie Snap and Clear', 'general', 'beginner', 'Sharpens snaps, clears, and immediate re-entries from collar-tie contact.'],
  ['Elbow Control Inside Tie Drill', 'general', 'intermediate', 'Builds precise elbow control to open shots and short offense.'],
  ['Head Position Fight', 'general', 'beginner', 'Teaches dominant forehead position and pressure without overreaching.'],
  ['Shuck-by to Angle', 'takedowns', 'intermediate', 'Develops quick redirections from tie-ups into scoring angles.'],
  ['Circle and Re-Attack Drill', 'general', 'intermediate', 'Builds footwork after defended attacks so you can score on the next opening.'],
  ['Scramble Chest-Wrap Reactions', 'defense', 'advanced', 'Improves calm control in fast chest-wrap and over-the-top scramble positions.'],
  ['Funk Roll Awareness', 'defense', 'advanced', 'Builds comfort reacting when opponents roll through and expose unusual angles.'],
  ['Crackdown Whizzer Defense', 'defense', 'intermediate', 'Sharpens whizzer pressure and hips back when legs are compromised.'],
  ['Re-Attack off Opponent Single', 'defense', 'intermediate', 'Teaches counter scoring when you defend a single and the opponent lingers.'],
  ['Front Headlock Spin Series', 'ground-work', 'intermediate', 'Builds repeated spins and hip drops from a secure front-headlock position.'],
  ['Double Off the Whistle', 'takedowns', 'intermediate', 'Sharpens first-step reaction speed and clean shot mechanics from the start.'],
  ['Shot Finish Against the Boundary', 'takedowns', 'advanced', 'Builds awareness for finishing while circling and cutting off edge escapes.'],
  ['Chain Wrestle Single to Double to High Crotch', 'takedowns', 'advanced', 'Teaches flowing from one leg attack to the next without pausing.'],
  ['Edge Circle and Reshot', 'general', 'intermediate', 'Builds mat awareness while circling near the edge and firing back in.'],
  ['Referee Position Whistle Starts', 'escapes', 'beginner', 'Sharpens first movement from bottom and top when action restarts.'],
  ['Live Situational Takedown Exchange', 'general', 'advanced', 'Adds realistic resistance so entries, reactions, and finishes connect under pressure.'],
]

const judoTechniqueSeeds: TechniqueSeed[] = [
  ['Ukemi Breakfall Sequence', 'general', 'beginner', 'Builds safe falling mechanics forward, backward, and to both sides before harder throwing work.'],
  ['Shintai and Tsugi-Ashi Footwork', 'general', 'beginner', 'Reinforces smooth advancing, retreating, and sliding footwork under balance.'],
  ['Kumikata Grip Fighting Entries', 'general', 'beginner', 'Develops the first hand battle for sleeve and lapel dominance before throwing.'],
  ['Kuzushi off Sleeve and Lapel', 'general', 'beginner', 'Sharpens off-balancing through pull, lift, and angle change before entry.'],
  ['O-soto-gari Uchikomi', 'takedowns', 'beginner', 'Grooves repeated entry mechanics for a major outer reap without completing the throw.'],
  ['Seoi-nage Uchikomi', 'takedowns', 'beginner', 'Builds rotation, sleeve pull, and hip placement for shoulder-throw entries.'],
  ['O-goshi Uchikomi', 'takedowns', 'beginner', 'Teaches hip contact and posture for a clean major hip throw entry.'],
  ['Tai-otoshi Uchikomi', 'takedowns', 'intermediate', 'Builds sleeve steering and blocking-leg placement before the finish.'],
  ['Uchi-mata Uchikomi', 'takedowns', 'intermediate', 'Sharpens posture, reaping leg direction, and lift on an inner-thigh entry.'],
  ['O-soto-gari Nagekomi', 'takedowns', 'beginner', 'Adds full throwing rhythm and control after the major outer reap entry is clean.'],
  ['Ippon Seoi-nage Nagekomi', 'takedowns', 'intermediate', 'Develops full commitment on the shoulder throw while keeping the pull connected.'],
  ['Harai-goshi Nagekomi', 'takedowns', 'intermediate', 'Builds hip loading and sweeping leg timing through full completion.'],
  ['Ouchi-gari to Kouchi-gari Combination', 'takedowns', 'intermediate', 'Teaches inside reap chains when the first attack draws a reaction.'],
  ['Kouchi-gari to Seoi-nage Combination', 'takedowns', 'intermediate', 'Connects a small inner reap to a quick shoulder-throw follow-up.'],
  ['O-soto to Ko-soto Follow-up', 'takedowns', 'intermediate', 'Builds the habit of switching to the near foot when the big reap is defended.'],
  ['Uchi-mata to Ko-uchi Finish', 'takedowns', 'advanced', 'Adds an inside-foot follow-up when the main inner-thigh attack stalls.'],
  ['Drop Seoi Recovery Drill', 'takedowns', 'advanced', 'Trains quick posture recovery and continuation after a drop entry misses cleanly.'],
  ['Tani-otoshi Reaction Counter', 'defense', 'advanced', 'Builds timing for a rear-dropping counter when the opponent drives too far through.'],
  ['Sasae-tsurikomi-ashi Timing Drill', 'takedowns', 'intermediate', 'Sharpens the stop-and-lift timing for the propping ankle throw.'],
  ['De-ashi-barai Movement Sweep', 'takedowns', 'intermediate', 'Develops foot sweep timing while the partner steps and resets.'],
  ['Okuri-ashi-harai Moving Sweep', 'takedowns', 'advanced', 'Builds sweeping timing when both feet travel together across the mat.'],
  ['Kosoto-gake Pressure Entry', 'takedowns', 'intermediate', 'Teaches driving pressure into a small outer hook once the heel is light.'],
  ['Ouchi-gari Deep Reap Finish', 'takedowns', 'beginner', 'Sharpens chest pressure and deep reaping mechanics on the inside reap.'],
  ['Kouchi-gari Stump Drill', 'takedowns', 'beginner', 'Builds precise foot placement and posture on the small inner reap.'],
  ['Harai-goshi Hip Loading Drill', 'takedowns', 'advanced', 'Teaches the hip load before the sweeping leg cuts through the partner’s line.'],
  ['Tai-otoshi Sleeve Pull Timing', 'takedowns', 'advanced', 'Focuses on the sleeve pull that makes the body-drop work instead of muscling.'],
  ['Cross-Grip Ippon Seoi Entry', 'takedowns', 'advanced', 'Builds quick turning entries from temporary cross-grip control.'],
  ['Belt Grip Koshi-waza Entry', 'takedowns', 'intermediate', 'Teaches hip-throw connection once a belt grip or deep body wrap is secured.'],
  ['Turtle Turnover from the Side', 'ground-work', 'beginner', 'Builds leverage and angle change to expose a tight turtle without forcing.'],
  ['Kesa-gatame Hold Transition', 'ground-work', 'beginner', 'Teaches settling chest pressure and head-arm control when arriving in scarf hold.'],
  ['Yoko-shiho-gatame Pressure Drill', 'ground-work', 'beginner', 'Builds tight side-control pinning with hips low and shoulders connected.'],
  ['Tate-shiho-gatame Retention', 'ground-work', 'intermediate', 'Sharpens mount-style pin retention when the partner bridges and frames.'],
  ['Juji-gatame from Pin', 'submissions', 'intermediate', 'Connects a secure pin to a clean armbar entry before the elbow line escapes.'],
  ['Okuri-eri-jime Collar Finish', 'submissions', 'intermediate', 'Builds tight lapel positioning and shoulder pressure on the sliding collar choke.'],
  ['Hadaka-jime Finishing Mechanics', 'submissions', 'intermediate', 'Sharpens elbow line and chest connection for the rear naked choke.'],
  ['Sangaku Entry from Turtle', 'submissions', 'advanced', 'Develops triangle entries when the partner shells tightly under pressure.'],
  ['Pin to Submission Chain', 'ground-work', 'intermediate', 'Teaches when to hold, when to switch pins, and when to attack the finish.'],
  ['Grip Break and Re-Grip Circuit', 'defense', 'beginner', 'Builds calm, efficient solutions when the opponent wins first grips.'],
  ['Posture Recovery after Failed Throw', 'defense', 'beginner', 'Reinforces balance and stance recovery so failed attacks do not lead to counters.'],
  ['Sprawl versus Direct Leg Attack', 'defense', 'beginner', 'Sharpens basic anti-shot reactions for crossover grappling scenarios.'],
  ['Lapel Drag to Forward Throw Entry', 'takedowns', 'intermediate', 'Uses lapel drag pressure to open forward-turning attacks.'],
  ['Sleeve Snap to Ankle Pickup Timing', 'takedowns', 'advanced', 'Builds reaction-based pickups when a hard sleeve snap shifts weight forward.'],
  ['Ko-uchi Counter to Uchi-mata', 'defense', 'advanced', 'Teaches a simple inside-foot answer when the opponent commits tall to uchi-mata.'],
  ['Moving Randori Throw-Only Objective', 'general', 'advanced', 'Adds realistic movement and decision-making while limiting the goal to clean throw attempts.'],
  ['Stand-Up to Ground Follow-Through', 'ground-work', 'intermediate', 'Builds immediate transition from throw attempt to pin or turnover after impact.'],
  ['Ne-waza Turnover to Back Exposure', 'ground-work', 'intermediate', 'Sharpens quick turnovers once a turtled opponent posts hard on the mat.'],
  ['Clock Choke Setup from Turtle', 'submissions', 'advanced', 'Develops collar control and circling pressure for a strong clock choke entry.'],
  ['Sumi-gaeshi to Armbar Chain', 'takedowns', 'advanced', 'Links sacrifice throw momentum to a fast armbar finish on landing.'],
  ['Tomoe-nage Entry and Follow-Up', 'takedowns', 'advanced', 'Builds the pull, foot placement, and immediate continuation after the sacrifice throw.'],
  ['Competitive Randori Pacing Drill', 'general', 'advanced', 'Trains tempo management so grips, attacks, and recovery stay sharp over repeated rounds.'],
]

const bjjTechniqueSeeds: TechniqueSeed[] = [
  ['Shrimp to Guard Recovery', 'escapes', 'beginner', 'Builds the core hip escape used to recover guard and make space underneath pressure.'],
  ['Reverse Shrimp Hip Switch', 'escapes', 'beginner', 'Teaches the opposite hip motion for closing space and re-angling underneath.'],
  ['Technical Stand-Up', 'general', 'beginner', 'Develops the safest way to stand without giving up base or exposure.'],
  ['Breakfall to Granby Integration', 'escapes', 'advanced', 'Builds rolling confidence when transitions force inversion and shoulder movement.'],
  ['Forward Shoulder Roll to Seated Guard', 'general', 'beginner', 'Sharpens smooth shoulder rolls into a ready seated-guard stance.'],
  ['Torreando Footwork Passing', 'ground-work', 'beginner', 'Builds outside passing angles and quick side-to-side movement around the legs.'],
  ['Knee Cut Pass Pattern', 'ground-work', 'beginner', 'Teaches pressure, underhook awareness, and knee-line clearing on a staple pass.'],
  ['Long-Step Pass Drill', 'ground-work', 'intermediate', 'Sharpens the long-step angle when legs and hips stay in the passing lane.'],
  ['X-Pass to Side Control', 'ground-work', 'intermediate', 'Builds timing to redirect the legs and settle chest-to-chest control.'],
  ['Guard Retention Pummel', 'escapes', 'beginner', 'Develops inside-leg pummeling and hip movement to keep the guard alive.'],
  ['Hip Heist to Wrestle-Up', 'takedowns', 'intermediate', 'Teaches standing up into offense when seated guard creates an opening.'],
  ['Sit-Up Guard to Single Leg', 'takedowns', 'beginner', 'Connects posture breaking from seated guard to a clean single-leg entry.'],
  ['Single-Leg X Off-Balance Sweep', 'ground-work', 'intermediate', 'Builds kuzushi and hip placement before finishing the sweep.'],
  ['Tripod Sweep from Open Guard', 'ground-work', 'beginner', 'Sharpens sleeve-and-ankle control while tipping the partner backward.'],
  ['Scissor Sweep Timing', 'ground-work', 'beginner', 'Builds angle, collar control, and shin positioning on a classic beginner sweep.'],
  ['Pendulum Sweep from Closed Guard', 'ground-work', 'intermediate', 'Teaches underhook angle and leg swing to elevate the partner’s base.'],
  ['Flower Sweep to Mount', 'ground-work', 'intermediate', 'Builds momentum and hip angle to tip the partner and come up directly on top.'],
  ['Armbar from Closed Guard', 'submissions', 'beginner', 'Reinforces angle change, leg bite, and elbow-line control from the guard.'],
  ['Triangle Entry and Angle Change', 'submissions', 'beginner', 'Builds the hip angle and shoulder line needed to finish tight triangles.'],
  ['Omoplata Hip Angle Drill', 'submissions', 'intermediate', 'Sharpens the turn and hip alignment that make the omoplata tight.'],
  ['Kimura from Guard', 'submissions', 'beginner', 'Teaches wrist isolation and torso rotation before the finish.'],
  ['Guillotine from Seated Front Headlock', 'submissions', 'intermediate', 'Builds chin-strap control and finishing posture from seated connections.'],
  ['Rear Naked Choke Hand-Fight Finish', 'submissions', 'intermediate', 'Sharpens control through hand fighting before finishing from the back.'],
  ['Bow-and-Arrow Choke Mechanics', 'submissions', 'advanced', 'Builds lapel control and leg extension for a strong gi-based back finish.'],
  ['Cross-Collar Choke from Mount', 'submissions', 'intermediate', 'Teaches patient collar placement and shoulder pressure from top mount.'],
  ['Arm Triangle Setup from Mount', 'submissions', 'intermediate', 'Builds shoulder pressure and head positioning before walking off to finish.'],
  ['Americana to Gift-Wrap Chain', 'submissions', 'intermediate', 'Connects a basic shoulder lock threat to stronger top-control transitions.'],
  ['S-Mount Armbar Transition', 'submissions', 'advanced', 'Sharpens weight distribution and elbow isolation when climbing to S-mount.'],
  ['Back Take from Turtle', 'ground-work', 'beginner', 'Builds chest connection and hook placement when the partner turtles.'],
  ['Seatbelt Retention and Hook Replacement', 'ground-work', 'intermediate', 'Teaches how to keep the back when hooks or chest alignment slip.'],
  ['Turtle Breakdown to Back Control', 'ground-work', 'intermediate', 'Builds pressure and angle changes that open back exposure from turtle.'],
  ['Side Control to Mount Transition', 'ground-work', 'beginner', 'Sharpens the climb to mount while blocking the near-side elbow and hip.'],
  ['Knee-on-Belly Mobility Drill', 'ground-work', 'intermediate', 'Builds top mobility and balance while floating over defensive movement.'],
  ['North-South to Kimura Transition', 'ground-work', 'advanced', 'Teaches how to move from chest pressure into a tight kimura trap.'],
  ['Underhook Escape from Side Control', 'escapes', 'beginner', 'Builds frames, hip movement, and the underhook route out from bottom side.'],
  ['Elbow-Knee Escape from Mount', 'escapes', 'beginner', 'Reinforces the classic mount escape by recovering a knee inside.'],
  ['Upa Bridge and Roll', 'escapes', 'beginner', 'Teaches timing the bridge and trap for a clean reversal from bottom mount.'],
  ['Back Escape to Safe Side', 'escapes', 'intermediate', 'Builds chin position and shoulder movement to land on the safer escape side.'],
  ['Turtle Roll-Through Escape', 'escapes', 'advanced', 'Sharpens timing for rolling free before hooks or chest control settle.'],
  ['Single-Leg Defense to Front Headlock', 'defense', 'intermediate', 'Builds anti-wrestling reactions that turn defense into front-headlock control.'],
  ['Sprawl to Go-Behind for BJJ', 'defense', 'beginner', 'Teaches simple takedown defense that finishes with top control.'],
  ['Collar Drag to Back', 'takedowns', 'intermediate', 'Uses a sharp drag and angle change to beat posture and expose the back.'],
  ['Snap Down to Guillotine Decision Drill', 'general', 'advanced', 'Builds the read between circling behind and attacking a front-headlock finish.'],
  ['De La Riva Entry and Off-Balance', 'ground-work', 'intermediate', 'Sharpens hooks, sleeve control, and off-balancing from open guard.'],
  ['Berimbolo Inversion Pathway', 'ground-work', 'advanced', 'Builds inversion mechanics and leg positioning for back-take entries.'],
  ['Leg Drag Passing Chain', 'ground-work', 'advanced', 'Develops upper-body control and hip pinning once a leg drag is won.'],
  ['Body Lock Pass Pressure Drill', 'ground-work', 'intermediate', 'Builds chest connection and hip pressure for folding the guard.'],
  ['Half Guard Underhook Dogfight Sweep', 'ground-work', 'intermediate', 'Teaches the rise to the dogfight before finishing the reversal.'],
  ['Knee Shield to Waiter Sweep', 'ground-work', 'advanced', 'Builds deep angle changes from knee shield into under-the-leg elevation.'],
  ['Armbar Triangle Omoplata Flow', 'submissions', 'advanced', 'Links three core closed-guard attacks so each reaction opens the next finish.'],
]

// ============================================
// INJURY PREVENTION DRILLS
// ============================================

export const injuryPreventionDrills: Drill[] = []

// ============================================
// MOBILITY DRILLS
// ============================================

export const mobilityDrills: Drill[] = []

// ============================================
// WARMUP DRILLS
// ============================================

export const warmupDrills: Drill[] = []

// ============================================
// EXERCISE DEMOS
// ============================================

export const exerciseDemos: Drill[] = []

// ============================================
// TECHNIQUE DRILLS
// ============================================

const wrestlingTechniqueDrills = createTechniqueDrillsForSport('wrestling', wrestlingTechniqueSeeds)
const judoTechniqueDrills = createTechniqueDrillsForSport('judo', judoTechniqueSeeds)
const bjjTechniqueDrills = createTechniqueDrillsForSport('bjj', bjjTechniqueSeeds)

export const techniqueDrills: Drill[] = [
  ...wrestlingTechniqueDrills,
  ...judoTechniqueDrills,
  ...bjjTechniqueDrills,
]

// ============================================
// COMBINED DRILLS
// ============================================

export const allDrills: Drill[] = [
  ...injuryPreventionDrills,
  ...mobilityDrills,
  ...warmupDrills,
  ...exerciseDemos,
  ...techniqueDrills,
]

// ============================================
// ROUTINES
// ============================================

export const routines: Routine[] = []

// ============================================
// LEARNING PATHS
// ============================================

export const learningPaths: LearningPath[] = [
  createLearningPath(
    'path-wrestling-fundamentals',
    'Wrestling Fundamentals',
    'A beginner path for stance, entries, core defense, and basic finishes.',
    'wrestling',
    [
      'Stance and Motion Circles',
      'Level Change and Penetration Step',
      'Single Leg Shelf Finish',
      'Double Leg Finish to the Corner',
      'Snap Down to Front Headlock',
      'Sprawl and Crossface Defense',
      'Stand-Up with Hand Control',
      'Mat Return from Rear Body Lock',
    ],
  ),
  createLearningPath(
    'path-judo-fundamentals',
    'Judo Fundamentals',
    'A beginner path covering breakfalls, grips, kuzushi, core entries, and first newaza transitions.',
    'judo',
    [
      'Ukemi Breakfall Sequence',
      'Shintai and Tsugi-Ashi Footwork',
      'Kumikata Grip Fighting Entries',
      'Kuzushi off Sleeve and Lapel',
      'O-soto-gari Uchikomi',
      'Seoi-nage Uchikomi',
      'De-ashi-barai Movement Sweep',
      'Turtle Turnover from the Side',
    ],
  ),
  createLearningPath(
    'path-bjj-fundamentals',
    'Jiu-Jitsu Fundamentals',
    'A beginner path for movement, retention, passing, positional escapes, and first submissions.',
    'bjj',
    [
      'Shrimp to Guard Recovery',
      'Technical Stand-Up',
      'Guard Retention Pummel',
      'Knee Cut Pass Pattern',
      'Scissor Sweep Timing',
      'Armbar from Closed Guard',
      'Elbow-Knee Escape from Mount',
      'Back Escape to Safe Side',
    ],
  ),
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

