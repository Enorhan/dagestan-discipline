begin;

-- Restore social analytics tables dropped by mistake.
-- These are required by public.feed_for_you + related RPCs.

-- Types (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'social_feedback_type') then
    create type public.social_feedback_type as enum ('hide', 'not_interested', 'report');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'social_feed_surface') then
    create type public.social_feed_surface as enum ('for_you', 'following', 'explore', 'reels', 'profile');
  end if;
end $$;

-- Tables
create table if not exists public.social_feed_events (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  surface public.social_feed_surface not null,
  watch_ms integer not null default 0,
  completed_view boolean not null default false,
  skipped_view boolean not null default false,
  replayed_view boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_feed_events_viewer_post
  on public.social_feed_events (viewer_user_id, post_id, created_at desc);

create table if not exists public.social_negative_feedback (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  feedback_type public.social_feedback_type not null,
  created_at timestamptz not null default now(),
  unique (viewer_user_id, post_id, feedback_type)
);

create index if not exists idx_social_negative_feedback_viewer_post
  on public.social_negative_feedback (viewer_user_id, post_id, created_at desc);

create table if not exists public.social_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_post_topics (
  post_id uuid not null references public.posts(id) on delete cascade,
  topic_id uuid not null references public.social_topics(id) on delete cascade,
  weight numeric(8, 4) not null default 1,
  created_at timestamptz not null default now(),
  primary key (post_id, topic_id)
);

create table if not exists public.social_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null,
  bucket_key text not null,
  count integer not null default 0,
  window_started_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, surface, bucket_key)
);

commit;

