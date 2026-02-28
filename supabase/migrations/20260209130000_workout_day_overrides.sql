-- Workout Day Overrides (AAA "Today" instances)

create table if not exists public.workout_day_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_date)
);

alter table public.workout_day_overrides enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workout_day_overrides'
      and policyname = 'Users can read own workout day overrides'
  ) then
    create policy "Users can read own workout day overrides"
      on public.workout_day_overrides
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workout_day_overrides'
      and policyname = 'Users can insert own workout day overrides'
  ) then
    create policy "Users can insert own workout day overrides"
      on public.workout_day_overrides
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workout_day_overrides'
      and policyname = 'Users can update own workout day overrides'
  ) then
    create policy "Users can update own workout day overrides"
      on public.workout_day_overrides
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workout_day_overrides'
      and policyname = 'Users can delete own workout day overrides'
  ) then
    create policy "Users can delete own workout day overrides"
      on public.workout_day_overrides
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

