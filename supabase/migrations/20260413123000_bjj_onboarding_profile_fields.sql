alter table public.profiles
  add column if not exists primary_discipline text,
  add column if not exists favorite_content_types text[] not null default '{}'::text[];
