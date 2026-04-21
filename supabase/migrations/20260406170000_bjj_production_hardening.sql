create table if not exists public.training_session_likes (
  id text primary key default gen_random_uuid()::text,
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (training_session_id, user_id)
);

create table if not exists public.training_session_comments (
  id text primary key default gen_random_uuid()::text,
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_links (
  id text primary key default gen_random_uuid()::text,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  share_count integer not null default 0,
  last_shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_definitions (
  id text primary key,
  title text not null,
  summary text not null,
  goal integer not null,
  xp_reward integer not null default 0,
  difficulty text not null check (difficulty in ('beginner', 'intermediate')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievement_definitions (
  id text primary key,
  title text not null,
  summary text not null,
  goal integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_session_likes_session_idx
  on public.training_session_likes (training_session_id, created_at desc);
create index if not exists training_session_comments_session_idx
  on public.training_session_comments (training_session_id, created_at desc);
create index if not exists invite_links_creator_idx
  on public.invite_links (creator_user_id, created_at desc);

drop trigger if exists bump_invite_links_updated_at on public.invite_links;
create trigger bump_invite_links_updated_at
  before update on public.invite_links
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_challenge_definitions_updated_at on public.challenge_definitions;
create trigger bump_challenge_definitions_updated_at
  before update on public.challenge_definitions
  for each row execute function public.bump_bjj_updated_at();

drop trigger if exists bump_achievement_definitions_updated_at on public.achievement_definitions;
create trigger bump_achievement_definitions_updated_at
  before update on public.achievement_definitions
  for each row execute function public.bump_bjj_updated_at();

alter table public.training_session_likes enable row level security;
alter table public.training_session_comments enable row level security;
alter table public.invite_links enable row level security;
alter table public.challenge_definitions enable row level security;
alter table public.achievement_definitions enable row level security;

drop policy if exists bjj_profiles_insert on public.profiles;
create policy bjj_profiles_insert on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists bjj_training_session_likes_select on public.training_session_likes;
create policy bjj_training_session_likes_select on public.training_session_likes
  for select to authenticated
  using (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and (s.user_id = auth.uid() or s.visibility = 'everyone')
    )
  );

drop policy if exists bjj_training_session_likes_insert on public.training_session_likes;
create policy bjj_training_session_likes_insert on public.training_session_likes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and s.visibility = 'everyone'
    )
  );

drop policy if exists bjj_training_session_likes_delete on public.training_session_likes;
create policy bjj_training_session_likes_delete on public.training_session_likes
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists bjj_training_session_comments_select on public.training_session_comments;
create policy bjj_training_session_comments_select on public.training_session_comments
  for select to authenticated
  using (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and (s.user_id = auth.uid() or s.visibility = 'everyone')
    )
  );

drop policy if exists bjj_training_session_comments_insert on public.training_session_comments;
create policy bjj_training_session_comments_insert on public.training_session_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and length(trim(body)) > 0
    and exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_id
        and s.visibility = 'everyone'
    )
  );

drop policy if exists bjj_training_session_comments_delete on public.training_session_comments;
create policy bjj_training_session_comments_delete on public.training_session_comments
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists bjj_invite_links_all on public.invite_links;
create policy bjj_invite_links_all on public.invite_links
  for all to authenticated
  using (auth.uid() = creator_user_id)
  with check (auth.uid() = creator_user_id);

drop policy if exists bjj_challenge_definitions_select on public.challenge_definitions;
create policy bjj_challenge_definitions_select on public.challenge_definitions
  for select to authenticated
  using (true);

drop policy if exists bjj_achievement_definitions_select on public.achievement_definitions;
create policy bjj_achievement_definitions_select on public.achievement_definitions
  for select to authenticated
  using (true);

insert into public.challenge_definitions (id, title, summary, goal, xp_reward, difficulty, sort_order)
values
  ('challenge-warrior', 'Weekly Warrior', 'Complete 3 training sessions this week.', 3, 50, 'beginner', 0),
  ('challenge-collector', 'Dedicated Practitioner', 'Save 5 techniques to your library.', 5, 100, 'beginner', 1)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  goal = excluded.goal,
  xp_reward = excluded.xp_reward,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.achievement_definitions (id, title, summary, goal, sort_order)
values
  ('ach-first-session', 'Showed Up', 'Log your first training session.', 1, 0),
  ('ach-technique-web', 'System Builder', 'Link 10 techniques together.', 10, 1)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  goal = excluded.goal,
  sort_order = excluded.sort_order,
  updated_at = now();
