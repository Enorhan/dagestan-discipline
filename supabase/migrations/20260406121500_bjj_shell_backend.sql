alter table public.profiles
  add column if not exists belt text not null default 'white',
  add column if not exists stripes integer not null default 0,
  add column if not exists gym_name text not null default '',
  add column if not exists privacy text not null default 'public',
  add column if not exists xp integer not null default 50,
  add column if not exists level integer not null default 1,
  add column if not exists heard_from text,
  add column if not exists biggest_challenges text[] not null default '{}',
  add column if not exists bjj_paywall_completed boolean not null default false,
  add column if not exists bjj_coach_marks_seen boolean not null default false;

alter table public.user_stats
  add column if not exists flow_streak integer not null default 1,
  add column if not exists training_streak integer not null default 0;

alter table public.training_sessions
  add column if not exists client_id text,
  add column if not exists location text not null default '',
  add column if not exists session_type text,
  add column if not exists duration_minutes integer not null default 90,
  add column if not exists satisfaction integer not null default 3,
  add column if not exists visibility text not null default 'everyone',
  add column if not exists caption text,
  add column if not exists photo_url text,
  add column if not exists tagged_friends text[] not null default '{}',
  add column if not exists submission_names text[] not null default '{}',
  add column if not exists tap_names text[] not null default '{}';

create unique index if not exists training_sessions_user_client_id_idx
  on public.training_sessions (user_id, client_id);

create table if not exists public.techniques (
  id text primary key,
  title text not null,
  category text not null check (category in ('submission', 'sweep', 'escape', 'guard-pass', 'takedown', 'transition')),
  description text not null default '',
  tutorial_title text not null,
  tutorial_thumbnail text,
  tags text[] not null default '{}',
  links text[] not null default '{}',
  media text[] not null default '{}',
  linked_technique_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_techniques (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_technique_id text references public.techniques(id) on delete set null,
  title text not null,
  category text not null check (category in ('submission', 'sweep', 'escape', 'guard-pass', 'takedown', 'transition')),
  notes text not null default '',
  description text not null default '',
  tutorial_title text not null,
  tutorial_thumbnail text,
  media text[] not null default '{}',
  links text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_techniques_user_catalog_idx
  on public.user_techniques (user_id, catalog_technique_id)
  where catalog_technique_id is not null;

create table if not exists public.technique_tags (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  technique_id text not null references public.user_techniques(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (user_id, technique_id, tag)
);

create table if not exists public.technique_links (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_technique_id text not null references public.user_techniques(id) on delete cascade,
  to_technique_id text not null references public.user_techniques(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, from_technique_id, to_technique_id),
  check (from_technique_id <> to_technique_id)
);

create table if not exists public.training_session_techniques (
  id text primary key default gen_random_uuid()::text,
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  technique_id text not null references public.user_techniques(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (training_session_id, technique_id)
);

create table if not exists public.systems (
  id text primary key,
  title text not null,
  summary text not null,
  locked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_nodes (
  id text primary key,
  system_id text not null references public.systems(id) on delete cascade,
  label text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.system_edges (
  id text primary key default gen_random_uuid()::text,
  system_id text not null references public.systems(id) on delete cascade,
  from_node_id text not null references public.system_nodes(id) on delete cascade,
  to_node_id text not null references public.system_nodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (system_id, from_node_id, to_node_id)
);

create table if not exists public.user_system_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  system_id text not null references public.systems(id) on delete cascade,
  unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, system_id)
);

create table if not exists public.follows (
  id text primary key default gen_random_uuid()::text,
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  following_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_user_id, following_user_id),
  check (follower_user_id <> following_user_id)
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'general',
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  progress integer not null default 0,
  goal integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create table if not exists public.achievement_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  progress integer not null default 0,
  goal integer not null default 0,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists user_techniques_user_updated_idx
  on public.user_techniques (user_id, updated_at desc);
create index if not exists technique_tags_technique_idx
  on public.technique_tags (technique_id, tag);
create index if not exists technique_links_user_idx
  on public.technique_links (user_id, from_technique_id);
create index if not exists follows_follower_idx
  on public.follows (follower_user_id, created_at desc);
create index if not exists follows_following_idx
  on public.follows (following_user_id, created_at desc);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create or replace function public.bump_bjj_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bump_user_techniques_updated_at on public.user_techniques;
create trigger bump_user_techniques_updated_at
  before update on public.user_techniques
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_techniques_updated_at on public.techniques;
create trigger bump_techniques_updated_at
  before update on public.techniques
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_systems_updated_at on public.systems;
create trigger bump_systems_updated_at
  before update on public.systems
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_user_system_access_updated_at on public.user_system_access;
create trigger bump_user_system_access_updated_at
  before update on public.user_system_access
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_challenge_progress_updated_at on public.challenge_progress;
create trigger bump_challenge_progress_updated_at
  before update on public.challenge_progress
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_achievement_progress_updated_at on public.achievement_progress;
create trigger bump_achievement_progress_updated_at
  before update on public.achievement_progress
  for each row execute function public.bump_bjj_updated_at();

alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.techniques enable row level security;
alter table public.user_techniques enable row level security;
alter table public.technique_tags enable row level security;
alter table public.technique_links enable row level security;
alter table public.training_session_techniques enable row level security;
alter table public.systems enable row level security;
alter table public.system_nodes enable row level security;
alter table public.system_edges enable row level security;
alter table public.user_system_access enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.achievement_progress enable row level security;

drop policy if exists bjj_profiles_select on public.profiles;
create policy bjj_profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists bjj_profiles_update on public.profiles;
create policy bjj_profiles_update on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists bjj_user_stats_select on public.user_stats;
create policy bjj_user_stats_select on public.user_stats
  for select to authenticated
  using (true);

drop policy if exists bjj_user_stats_insert on public.user_stats;
create policy bjj_user_stats_insert on public.user_stats
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists bjj_user_stats_update on public.user_stats;
create policy bjj_user_stats_update on public.user_stats
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_techniques_select on public.techniques;
create policy bjj_techniques_select on public.techniques
  for select to authenticated
  using (true);

drop policy if exists bjj_user_techniques_all on public.user_techniques;
create policy bjj_user_techniques_all on public.user_techniques
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_technique_tags_all on public.technique_tags;
create policy bjj_technique_tags_all on public.technique_tags
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_technique_links_all on public.technique_links;
create policy bjj_technique_links_all on public.technique_links
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_session_techniques_select on public.training_session_techniques;
create policy bjj_session_techniques_select on public.training_session_techniques
  for select to authenticated
  using (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and (s.user_id = auth.uid() or s.visibility = 'everyone')
    )
  );

drop policy if exists bjj_session_techniques_insert on public.training_session_techniques;
create policy bjj_session_techniques_insert on public.training_session_techniques
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_session_techniques_delete on public.training_session_techniques;
create policy bjj_session_techniques_delete on public.training_session_techniques
  for delete to authenticated
  using (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_systems_select on public.systems;
create policy bjj_systems_select on public.systems
  for select to authenticated
  using (true);

drop policy if exists bjj_system_nodes_select on public.system_nodes;
create policy bjj_system_nodes_select on public.system_nodes
  for select to authenticated
  using (true);

drop policy if exists bjj_system_edges_select on public.system_edges;
create policy bjj_system_edges_select on public.system_edges
  for select to authenticated
  using (true);

drop policy if exists bjj_user_system_access_all on public.user_system_access;
create policy bjj_user_system_access_all on public.user_system_access
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_follows_select on public.follows;
create policy bjj_follows_select on public.follows
  for select to authenticated
  using (true);

drop policy if exists bjj_follows_insert on public.follows;
create policy bjj_follows_insert on public.follows
  for insert to authenticated
  with check (auth.uid() = follower_user_id);

drop policy if exists bjj_follows_delete on public.follows;
create policy bjj_follows_delete on public.follows
  for delete to authenticated
  using (auth.uid() = follower_user_id);

drop policy if exists bjj_notifications_all on public.notifications;
create policy bjj_notifications_all on public.notifications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_challenge_progress_all on public.challenge_progress;
create policy bjj_challenge_progress_all on public.challenge_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_achievement_progress_all on public.achievement_progress;
create policy bjj_achievement_progress_all on public.achievement_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists bjj_public_training_sessions_select on public.training_sessions;
create policy bjj_public_training_sessions_select on public.training_sessions
  for select to authenticated
  using (user_id = auth.uid() or visibility = 'everyone');

insert into storage.buckets (id, name, public)
values
  ('profile-images', 'profile-images', true),
  ('session-media', 'session-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read profile images" on storage.objects;
create policy "Public read profile images"
  on storage.objects for select
  using (bucket_id = 'profile-images');

drop policy if exists "Authenticated upload profile images" on storage.objects;
create policy "Authenticated upload profile images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated delete profile images" on storage.objects;
create policy "Authenticated delete profile images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and owner = auth.uid()
  );

drop policy if exists "Public read session media" on storage.objects;
create policy "Public read session media"
  on storage.objects for select
  using (bucket_id = 'session-media');

drop policy if exists "Authenticated upload session media" on storage.objects;
create policy "Authenticated upload session media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'session-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated delete session media" on storage.objects;
create policy "Authenticated delete session media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'session-media'
    and owner = auth.uid()
  );

create or replace view public.bjj_leaderboard as
select
  p.id::text as id,
  p.display_name as name,
  ('@' || p.username) as handle,
  (
    coalesce(session_stats.total_submissions, 0) * 23
    + coalesce(technique_stats.technique_count, 0) * 9
    + coalesce(us.flow_streak, 0) * 7
  )::integer as score
from public.profiles p
left join public.user_stats us on us.user_id = p.id
left join (
  select
    s.user_id,
    coalesce(sum(cardinality(s.submission_names)), 0) as total_submissions
  from public.training_sessions s
  where s.visibility = 'everyone'
  group by s.user_id
) session_stats on session_stats.user_id = p.id
left join (
  select
    user_id,
    count(*) as technique_count
  from public.user_techniques
  group by user_id
) technique_stats on technique_stats.user_id = p.id
where coalesce(p.onboarding_completed, false) = true;

insert into public.techniques (id, title, category, description, tutorial_title, tags, links, linked_technique_ids)
values
  ('disc-scissor-sweep', 'Scissor Sweep', 'sweep', 'A fundamental closed guard sweep using opposite leg movement to break posture and tip the opponent forward.', 'These Details Make It Work', array['Closed Guard', 'Fundamental'], array['https://www.youtube.com/watch?v=scissor-sweep'], array['disc-triangle-choke']),
  ('disc-triangle-choke', 'Triangle Choke', 'submission', 'A guard staple that punishes posture mistakes and chains naturally from collar tie, arm drag, and scissor sweep threats.', 'Triangle From Broken Posture', array['Submission', 'Beginner', 'Closed Guard'], array['https://www.youtube.com/watch?v=triangle-choke'], array['disc-scissor-sweep']),
  ('disc-armbar', 'Armbar', 'submission', 'Classic arm isolation finish that rewards good angle changes and tight leg positioning.', 'Armbar Control Principles', array['Submission', 'Beginner'], array['https://www.youtube.com/watch?v=armbar'], array['disc-triangle-choke']),
  ('disc-rear-naked-choke', 'Rear Naked Choke', 'submission', 'The highest percentage finishing sequence from the back when your harness and hand fighting are disciplined.', 'Back Control Finishing Details', array['Submission', 'Back Control'], array['https://www.youtube.com/watch?v=rear-naked-choke'], array[]::text[]),
  ('disc-kimura', 'Kimura', 'submission', 'Strong upper-body control attack from guard, side control, and turtle with excellent sweep chains.', 'Kimura Trap Essentials', array['Submission', 'Shoulder Lock'], array['https://www.youtube.com/watch?v=kimura'], array[]::text[]),
  ('disc-hip-bump-sweep', 'Hip Bump Sweep', 'sweep', 'Momentum-based sweep that forces a post and opens up kimura and guillotine follow-ups.', 'Hip Bump Timing', array['Closed Guard', 'Sit-Up'], array['https://www.youtube.com/watch?v=hip-bump-sweep'], array['disc-kimura']),
  ('disc-side-control-frame-escape', 'Side Control Frame Escape', 'escape', 'Frame, hip escape, and knee-insertion sequence for rebuilding guard before the crossface settles.', 'Frames That Actually Work', array['Escape', 'No-Gi', 'Side Control'], array['https://www.youtube.com/watch?v=side-control-escape'], array[]::text[]),
  ('disc-double-leg', 'Double Leg', 'takedown', 'Level change, penetration step, and corner finish mechanics for reliable takedown entries.', 'Double Leg Finishing', array['Wrestling', 'Fundamental'], array['https://www.youtube.com/watch?v=double-leg'], array[]::text[]),
  ('disc-knee-cut', 'Knee Cut Pass', 'guard-pass', 'Reliable passing sequence when you win the inside knee line and flatten the bottom player.', 'Knee Cut Pressure', array['Guard Pass', 'Pressure'], array['https://www.youtube.com/watch?v=knee-cut'], array[]::text[]),
  ('disc-arm-drag', 'Arm Drag', 'transition', 'Connection-based transition that turns a winning grip into angles, back exposure, or sweeps.', 'Arm Drag Connections', array['Transition', 'Back Take'], array['https://www.youtube.com/watch?v=arm-drag'], array[]::text[])
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  tutorial_title = excluded.tutorial_title,
  tags = excluded.tags,
  links = excluded.links,
  linked_technique_ids = excluded.linked_technique_ids,
  updated_at = now();

insert into public.systems (id, title, summary, locked, sort_order)
values
  ('system-closed-guard', 'Closed Guard Attacks', 'Scissor sweep into triangle, armbar, and hip bump reactions.', false, 0),
  ('system-back-control', 'Back Control Funnels', 'Hand fight, trap the shoulder line, then route to RNC or bow-and-arrow.', true, 1)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  locked = excluded.locked,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.system_edges where system_id in ('system-closed-guard', 'system-back-control');
delete from public.system_nodes where system_id in ('system-closed-guard', 'system-back-control');

insert into public.system_nodes (id, system_id, label, color, sort_order)
values
  ('node-posture', 'system-closed-guard', 'Break Posture', '#3b82f6', 0),
  ('node-sweep', 'system-closed-guard', 'Scissor Sweep', '#22c55e', 1),
  ('node-triangle', 'system-closed-guard', 'Triangle', '#ef4444', 2),
  ('node-armbar', 'system-closed-guard', 'Armbar', '#f59e0b', 3),
  ('node-seatbelt', 'system-back-control', 'Seatbelt', '#3b82f6', 0),
  ('node-handfight', 'system-back-control', 'Hand Fight', '#a855f7', 1),
  ('node-rnc', 'system-back-control', 'RNC', '#ef4444', 2),
  ('node-switch', 'system-back-control', 'Bow & Arrow', '#22c55e', 3)
on conflict (id) do update set
  system_id = excluded.system_id,
  label = excluded.label,
  color = excluded.color,
  sort_order = excluded.sort_order;

insert into public.system_edges (id, system_id, from_node_id, to_node_id)
values
  ('edge-closed-guard-1', 'system-closed-guard', 'node-posture', 'node-sweep'),
  ('edge-closed-guard-2', 'system-closed-guard', 'node-posture', 'node-triangle'),
  ('edge-closed-guard-3', 'system-closed-guard', 'node-triangle', 'node-armbar'),
  ('edge-back-control-1', 'system-back-control', 'node-seatbelt', 'node-handfight'),
  ('edge-back-control-2', 'system-back-control', 'node-handfight', 'node-rnc'),
  ('edge-back-control-3', 'system-back-control', 'node-handfight', 'node-switch')
on conflict (id) do update set
  system_id = excluded.system_id,
  from_node_id = excluded.from_node_id,
  to_node_id = excluded.to_node_id;
