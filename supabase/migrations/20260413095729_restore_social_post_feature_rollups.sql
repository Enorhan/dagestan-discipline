begin;

create table if not exists public.social_post_feature_rollups (
  post_id uuid primary key references public.posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  watch_ms_7d bigint not null default 0,
  views_2s_7d integer not null default 0,
  completions_7d integer not null default 0,
  skips_7d integer not null default 0,
  replays_7d integer not null default 0,
  negative_hide_7d integer not null default 0,
  negative_not_interested_7d integer not null default 0,
  negative_report_7d integer not null default 0
);

create index if not exists idx_social_post_feature_rollups_captured_at
  on public.social_post_feature_rollups (captured_at desc);

alter table public.social_post_feature_rollups enable row level security;
revoke all on table public.social_post_feature_rollups from anon;
grant select on table public.social_post_feature_rollups to authenticated;

drop policy if exists social_post_feature_rollups_select on public.social_post_feature_rollups;
create policy social_post_feature_rollups_select on public.social_post_feature_rollups
  for select to authenticated using (true);

commit;

