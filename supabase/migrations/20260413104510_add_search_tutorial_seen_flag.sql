alter table public.profiles
  add column if not exists search_tutorial_seen boolean not null default false;

