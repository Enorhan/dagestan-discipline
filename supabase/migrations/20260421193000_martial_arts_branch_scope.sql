-- Martial arts branch scope for techniques, user libraries, training sessions, and system graphs.
-- Keeps BJJ, grappling, boxing, wrestling, MMA, Muay Thai, Judo, and Taekwondo content separate.

alter table public.techniques
  add column if not exists branch text not null default 'bjj';

alter table public.user_techniques
  add column if not exists branch text not null default 'bjj';

alter table public.training_sessions
  add column if not exists branch text not null default 'bjj';

alter table public.systems
  add column if not exists branch text not null default 'bjj';

alter table public.techniques
  drop constraint if exists techniques_category_check,
  drop constraint if exists techniques_branch_check;

alter table public.techniques
  add constraint techniques_category_check
  check (category in (
    'submission',
    'sweep',
    'escape',
    'guard-pass',
    'takedown',
    'transition',
    'strike',
    'defense',
    'footwork',
    'clinch',
    'kick',
    'counter'
  )),
  add constraint techniques_branch_check
  check (branch in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo'));

alter table public.user_techniques
  drop constraint if exists user_techniques_category_check,
  drop constraint if exists user_techniques_branch_check;

alter table public.user_techniques
  add constraint user_techniques_category_check
  check (category in (
    'submission',
    'sweep',
    'escape',
    'guard-pass',
    'takedown',
    'transition',
    'strike',
    'defense',
    'footwork',
    'clinch',
    'kick',
    'counter'
  )),
  add constraint user_techniques_branch_check
  check (branch in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo'));

alter table public.training_sessions
  drop constraint if exists training_sessions_branch_check;

alter table public.training_sessions
  add constraint training_sessions_branch_check
  check (branch in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo'));

alter table public.systems
  drop constraint if exists systems_branch_check;

alter table public.systems
  add constraint systems_branch_check
  check (branch in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo'));

create index if not exists techniques_branch_updated_idx
  on public.techniques (branch, updated_at desc);

create index if not exists user_techniques_user_branch_updated_idx
  on public.user_techniques (user_id, branch, updated_at desc);

create index if not exists systems_branch_sort_idx
  on public.systems (branch, sort_order, title);

update public.techniques
set branch = 'wrestling'
where id in ('disc-double-leg');

update public.techniques
set branch = 'grappling'
where id in ('disc-arm-drag');

insert into public.techniques (id, branch, title, category, description, tutorial_title, tags, links, linked_technique_ids)
values
  ('disc-grappling-front-headlock', 'grappling', 'Front Headlock Snapdown', 'takedown', 'A snapdown entry that pulls posture forward and opens go-behind, guillotine, or spin-behind routes.', 'Front Headlock Control', array['No-Gi', 'Front Headlock', 'Control'], array['https://www.youtube.com/watch?v=front-headlock'], array[]::text[]),
  ('disc-boxing-jab', 'boxing', 'Lead Jab', 'strike', 'Straight lead-hand punch used to measure distance, interrupt entries, and build combinations.', 'Jab Mechanics', array['Range', 'Setup', 'Fundamental'], array['https://www.youtube.com/watch?v=boxing-jab'], array['disc-boxing-cross']),
  ('disc-boxing-cross', 'boxing', 'Rear Cross', 'strike', 'Rear-hand straight built from hip rotation, shoulder cover, and balanced recovery.', 'Cross Without Overreaching', array['Power', 'Straight Punch', 'Combination'], array['https://www.youtube.com/watch?v=boxing-cross'], array['disc-boxing-lead-hook']),
  ('disc-boxing-lead-hook', 'boxing', 'Lead Hook', 'strike', 'Compact hook that turns the lead side through the target without drifting past stance.', 'Lead Hook Alignment', array['Inside Range', 'Combination', 'Power'], array['https://www.youtube.com/watch?v=lead-hook'], array['disc-boxing-slip-outside']),
  ('disc-boxing-slip-outside', 'boxing', 'Outside Slip', 'defense', 'Small outside head movement that keeps stance loaded for the cross or pivot exit.', 'Slip And Counter', array['Head Movement', 'Counter', 'Defense'], array['https://www.youtube.com/watch?v=outside-slip'], array[]::text[]),
  ('disc-boxing-pivot-exit', 'boxing', 'Lead Foot Pivot Exit', 'footwork', 'Angle change after a combination to leave the center line instead of admiring the work.', 'Pivot Exit After Contact', array['Angle', 'Exit', 'Defense'], array['https://www.youtube.com/watch?v=pivot-exit'], array[]::text[]),
  ('disc-muay-thai-teep', 'muay-thai', 'Lead Teep', 'kick', 'Front push kick that manages distance and interrupts forward pressure.', 'Lead Teep Balance', array['Range', 'Interruption', 'Balance'], array['https://www.youtube.com/watch?v=lead-teep'], array[]::text[]),
  ('disc-muay-thai-clinch-knee', 'muay-thai', 'Double Collar Knee', 'clinch', 'Posture-breaking collar tie sequence into balanced knees without pulling yourself off stance.', 'Clinch Knee Control', array['Clinch', 'Knee', 'Posture'], array['https://www.youtube.com/watch?v=clinch-knee'], array[]::text[]),
  ('disc-wrestling-sprawl', 'wrestling', 'Sprawl And Crossface', 'defense', 'Hip-heavy shot defense that turns penetration steps into front-headlock pressure.', 'Sprawl Timing', array['Shot Defense', 'Pressure', 'Fundamental'], array['https://www.youtube.com/watch?v=sprawl-crossface'], array[]::text[]),
  ('disc-judo-osoto-gari', 'judo', 'Osoto Gari', 'takedown', 'Major outer reap built from kuzushi, chest pressure, and a committed reaping leg.', 'Osoto Gari Entries', array['Throw', 'Off-Balance', 'Gi'], array['https://www.youtube.com/watch?v=osoto-gari'], array[]::text[])
on conflict (id) do update set
  branch = excluded.branch,
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  tutorial_title = excluded.tutorial_title,
  tags = excluded.tags,
  links = excluded.links,
  linked_technique_ids = excluded.linked_technique_ids,
  updated_at = now();
