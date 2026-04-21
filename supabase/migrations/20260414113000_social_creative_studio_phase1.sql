create table if not exists public.social_music_tracks (
  id text primary key,
  slug text not null unique,
  title text not null,
  artist text not null,
  preview_url text not null,
  artwork_url text,
  duration_ms integer not null default 15000,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.social_music_tracks enable row level security;

drop policy if exists social_music_tracks_select on public.social_music_tracks;
create policy social_music_tracks_select on public.social_music_tracks
  for select
  to authenticated
  using (is_active = true);

revoke all on table public.social_music_tracks from anon;
grant select on table public.social_music_tracks to authenticated;

alter table public.posts
  add column if not exists creative_edit jsonb,
  add column if not exists render_status text not null default 'ready',
  add column if not exists render_error text;

alter table public.stories
  add column if not exists creative_edit jsonb,
  add column if not exists render_status text not null default 'ready',
  add column if not exists render_error text,
  add column if not exists duration_ms integer;

alter table public.creator_drafts
  add column if not exists creative_edit jsonb,
  add column if not exists render_status text not null default 'idle',
  add column if not exists render_error text;

update public.posts
set render_status = 'ready'
where render_status is null;

update public.stories
set render_status = 'ready'
where render_status is null;

update public.creator_drafts
set render_status = coalesce(render_status, 'idle')
where render_status is null;

alter table public.posts
  drop constraint if exists posts_render_status_check;
alter table public.posts
  add constraint posts_render_status_check
  check (render_status in ('idle', 'processing', 'ready', 'failed'));

alter table public.stories
  drop constraint if exists stories_render_status_check;
alter table public.stories
  add constraint stories_render_status_check
  check (render_status in ('idle', 'processing', 'ready', 'failed'));

alter table public.creator_drafts
  drop constraint if exists creator_drafts_render_status_check;
alter table public.creator_drafts
  add constraint creator_drafts_render_status_check
  check (render_status in ('idle', 'processing', 'ready', 'failed'));

insert into public.social_music_tracks (
  id,
  slug,
  title,
  artist,
  preview_url,
  duration_ms,
  sort_order,
  is_active
)
values
  ('focus-breathe', 'focus-breathe', 'Focus Breathe', 'Dagestani Disciple', '/audio/social/focus-breathe.m4a', 15000, 1, true),
  ('mat-flow', 'mat-flow', 'Mat Flow', 'Dagestani Disciple', '/audio/social/mat-flow.m4a', 15000, 2, true),
  ('night-rounds', 'night-rounds', 'Night Rounds', 'Dagestani Disciple', '/audio/social/night-rounds.m4a', 15000, 3, true)
on conflict (id) do update
set
  slug = excluded.slug,
  title = excluded.title,
  artist = excluded.artist,
  preview_url = excluded.preview_url,
  duration_ms = excluded.duration_ms,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc'::text, now());
