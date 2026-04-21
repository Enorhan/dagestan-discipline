create table if not exists public.saved_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('drill', 'exercise', 'routine', 'learning-path')),
  item_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  focus text not null,
  difficulty text not null,
  estimated_duration integer,
  sport_relevance text[] not null default '{}',
  visibility text not null default 'private',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_template_entries (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  name text not null,
  sets integer not null default 1,
  reps integer,
  duration integer,
  rest_time integer not null default 60,
  notes text,
  video_url text,
  order_index integer not null,
  created_at timestamptz not null default now(),
  unique (template_id, order_index)
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  session_date date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source text not null check (source in ('guided', 'template', 'quick-log', 'manual', 'recovery')),
  kind text not null check (kind in ('strength', 'mat', 'drill', 'conditioning')),
  session_id text,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  effort_rating integer check (effort_rating between 1 and 10),
  total_time_seconds integer,
  total_volume numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_session_entries (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references public.training_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  title text not null,
  order_index integer not null,
  sets_planned integer not null default 1,
  reps_planned integer,
  duration_planned_seconds integer,
  rest_time_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  unique (training_session_id, order_index)
);

create table if not exists public.training_set_logs (
  id uuid primary key default gen_random_uuid(),
  training_session_entry_id uuid not null references public.training_session_entries(id) on delete cascade,
  set_number integer not null,
  reps_completed integer,
  weight numeric,
  duration_seconds integer,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (training_session_entry_id, set_number)
);

create index if not exists saved_library_items_user_created_idx on public.saved_library_items (user_id, created_at desc);
create index if not exists workout_templates_user_updated_idx on public.workout_templates (user_id, updated_at desc);
create index if not exists training_sessions_user_date_idx on public.training_sessions (user_id, session_date desc, started_at desc);
create index if not exists training_session_entries_session_idx on public.training_session_entries (training_session_id, order_index);
create index if not exists training_set_logs_entry_idx on public.training_set_logs (training_session_entry_id, set_number);

alter table public.saved_library_items enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_entries enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_session_entries enable row level security;
alter table public.training_set_logs enable row level security;

create policy "Users manage saved library items" on public.saved_library_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage workout templates" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage workout template entries" on public.workout_template_entries
  for all using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));
create policy "Users manage training sessions" on public.training_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage training session entries" on public.training_session_entries
  for all using (exists (select 1 from public.training_sessions s where s.id = training_session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.training_sessions s where s.id = training_session_id and s.user_id = auth.uid()));
create policy "Users manage training set logs" on public.training_set_logs
  for all using (
    exists (
      select 1 from public.training_session_entries e
      join public.training_sessions s on s.id = e.training_session_id
      where e.id = training_session_entry_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.training_session_entries e
      join public.training_sessions s on s.id = e.training_session_id
      where e.id = training_session_entry_id and s.user_id = auth.uid()
    )
  );

