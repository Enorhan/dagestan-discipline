-- Sync tables for logging-first planning and progress hubs.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null check (event_type in ('training', 'competition', 'recovery', 'travel', 'note')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fight_camp_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  event_name text not null,
  event_date date not null,
  focus text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_drill_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_drill_collection_items (
  collection_id uuid not null references public.saved_drill_collections(id) on delete cascade,
  drill_id text not null references public.drills(id) on delete cascade,
  order_index integer not null,
  created_at timestamptz not null default now(),
  primary key (collection_id, drill_id),
  unique (collection_id, order_index)
);

create table if not exists public.weekly_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null,
  summary text not null default '',
  highlight text not null default '',
  adjustment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_of)
);

create index if not exists idx_calendar_events_user_date
  on public.calendar_events(user_id, event_date desc);
create index if not exists idx_training_reminders_user_due
  on public.training_reminders(user_id, due_date asc, completed);
create index if not exists idx_saved_drill_collections_user_created
  on public.saved_drill_collections(user_id, created_at desc);
create index if not exists idx_saved_drill_collection_items_collection_order
  on public.saved_drill_collection_items(collection_id, order_index asc);
create index if not exists idx_weekly_reviews_user_week
  on public.weekly_reviews(user_id, week_of desc);

alter table public.calendar_events enable row level security;
alter table public.training_reminders enable row level security;
alter table public.fight_camp_plans enable row level security;
alter table public.saved_drill_collections enable row level security;
alter table public.saved_drill_collection_items enable row level security;
alter table public.weekly_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'Users can view own calendar events'
  ) then
    create policy "Users can view own calendar events" on public.calendar_events for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'Users can insert own calendar events'
  ) then
    create policy "Users can insert own calendar events" on public.calendar_events for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'Users can update own calendar events'
  ) then
    create policy "Users can update own calendar events" on public.calendar_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'Users can delete own calendar events'
  ) then
    create policy "Users can delete own calendar events" on public.calendar_events for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'training_reminders' and policyname = 'Users can view own training reminders'
  ) then
    create policy "Users can view own training reminders" on public.training_reminders for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'training_reminders' and policyname = 'Users can insert own training reminders'
  ) then
    create policy "Users can insert own training reminders" on public.training_reminders for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'training_reminders' and policyname = 'Users can update own training reminders'
  ) then
    create policy "Users can update own training reminders" on public.training_reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'training_reminders' and policyname = 'Users can delete own training reminders'
  ) then
    create policy "Users can delete own training reminders" on public.training_reminders for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fight_camp_plans' and policyname = 'Users can view own fight camp plan'
  ) then
    create policy "Users can view own fight camp plan" on public.fight_camp_plans for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fight_camp_plans' and policyname = 'Users can insert own fight camp plan'
  ) then
    create policy "Users can insert own fight camp plan" on public.fight_camp_plans for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fight_camp_plans' and policyname = 'Users can update own fight camp plan'
  ) then
    create policy "Users can update own fight camp plan" on public.fight_camp_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'fight_camp_plans' and policyname = 'Users can delete own fight camp plan'
  ) then
    create policy "Users can delete own fight camp plan" on public.fight_camp_plans for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collections' and policyname = 'Users can view own drill collections'
  ) then
    create policy "Users can view own drill collections" on public.saved_drill_collections for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collections' and policyname = 'Users can insert own drill collections'
  ) then
    create policy "Users can insert own drill collections" on public.saved_drill_collections for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collections' and policyname = 'Users can update own drill collections'
  ) then
    create policy "Users can update own drill collections" on public.saved_drill_collections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collections' and policyname = 'Users can delete own drill collections'
  ) then
    create policy "Users can delete own drill collections" on public.saved_drill_collections for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collection_items' and policyname = 'Users can view own drill collection items'
  ) then
    create policy "Users can view own drill collection items" on public.saved_drill_collection_items for select using (
      exists (
        select 1 from public.saved_drill_collections c
        where c.id = collection_id and c.user_id = auth.uid()
      )
    );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collection_items' and policyname = 'Users can insert own drill collection items'
  ) then
    create policy "Users can insert own drill collection items" on public.saved_drill_collection_items for insert with check (
      exists (
        select 1 from public.saved_drill_collections c
        where c.id = collection_id and c.user_id = auth.uid()
      )
    );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collection_items' and policyname = 'Users can update own drill collection items'
  ) then
    create policy "Users can update own drill collection items" on public.saved_drill_collection_items for update using (
      exists (
        select 1 from public.saved_drill_collections c
        where c.id = collection_id and c.user_id = auth.uid()
      )
    ) with check (
      exists (
        select 1 from public.saved_drill_collections c
        where c.id = collection_id and c.user_id = auth.uid()
      )
    );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_drill_collection_items' and policyname = 'Users can delete own drill collection items'
  ) then
    create policy "Users can delete own drill collection items" on public.saved_drill_collection_items for delete using (
      exists (
        select 1 from public.saved_drill_collections c
        where c.id = collection_id and c.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_reviews' and policyname = 'Users can view own weekly reviews'
  ) then
    create policy "Users can view own weekly reviews" on public.weekly_reviews for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_reviews' and policyname = 'Users can insert own weekly reviews'
  ) then
    create policy "Users can insert own weekly reviews" on public.weekly_reviews for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_reviews' and policyname = 'Users can update own weekly reviews'
  ) then
    create policy "Users can update own weekly reviews" on public.weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_reviews' and policyname = 'Users can delete own weekly reviews'
  ) then
    create policy "Users can delete own weekly reviews" on public.weekly_reviews for delete using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists update_calendar_events_updated_at on public.calendar_events;
create trigger update_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_training_reminders_updated_at on public.training_reminders;
create trigger update_training_reminders_updated_at
  before update on public.training_reminders
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_fight_camp_plans_updated_at on public.fight_camp_plans;
create trigger update_fight_camp_plans_updated_at
  before update on public.fight_camp_plans
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_saved_drill_collections_updated_at on public.saved_drill_collections;
create trigger update_saved_drill_collections_updated_at
  before update on public.saved_drill_collections
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_weekly_reviews_updated_at on public.weekly_reviews;
create trigger update_weekly_reviews_updated_at
  before update on public.weekly_reviews
  for each row execute function public.update_updated_at_column();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.calendar_events'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.training_reminders'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.fight_camp_plans'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.saved_drill_collections'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.saved_drill_collection_items'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.weekly_reviews'; exception when duplicate_object then null; end;
  end if;
end $$;