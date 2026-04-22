-- Community pivot: Living Training Artifacts (system forks, coach subscriptions,
-- session reviews, drill challenges, drill completions). Replaces the feed model.
-- Direct table access is owner-only; cross-user reads flow through security-definer RPCs
-- that honor visibility, follow graph, and block-list, mirroring the pattern established
-- in multi_user_public_graph_hardening.sql.

-- -----------------------------------------------------------------------------
-- A. System forks
-- -----------------------------------------------------------------------------
create table if not exists public.system_forks (
  id uuid primary key default gen_random_uuid(),
  parent_system_id text not null references public.systems(id) on delete cascade,
  child_system_id text not null references public.systems(id) on delete cascade unique,
  forked_by uuid not null references auth.users(id) on delete cascade,
  forked_from_revision integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists system_forks_parent_idx on public.system_forks (parent_system_id, created_at desc);
create index if not exists system_forks_owner_idx on public.system_forks (forked_by, created_at desc);

alter table public.system_forks enable row level security;
revoke all on public.system_forks from anon;
grant select, insert, delete on public.system_forks to authenticated;

drop policy if exists system_forks_select_own on public.system_forks;
create policy system_forks_select_own on public.system_forks
  for select to authenticated
  using (forked_by = auth.uid());

drop policy if exists system_forks_insert_self on public.system_forks;
create policy system_forks_insert_self on public.system_forks
  for insert to authenticated
  with check (forked_by = auth.uid());

drop policy if exists system_forks_delete_own on public.system_forks;
create policy system_forks_delete_own on public.system_forks
  for delete to authenticated
  using (forked_by = auth.uid());

-- -----------------------------------------------------------------------------
-- B. Coach subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.coach_subscriptions (
  subscriber_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, coach_id),
  check (subscriber_id <> coach_id)
);

create index if not exists coach_subscriptions_coach_idx on public.coach_subscriptions (coach_id, created_at desc);

alter table public.coach_subscriptions enable row level security;
revoke all on public.coach_subscriptions from anon;
grant select, insert, update, delete on public.coach_subscriptions to authenticated;

drop policy if exists coach_subscriptions_select_own on public.coach_subscriptions;
create policy coach_subscriptions_select_own on public.coach_subscriptions
  for select to authenticated
  using (subscriber_id = auth.uid() or coach_id = auth.uid());

drop policy if exists coach_subscriptions_insert_self on public.coach_subscriptions;
create policy coach_subscriptions_insert_self on public.coach_subscriptions
  for insert to authenticated
  with check (subscriber_id = auth.uid());

drop policy if exists coach_subscriptions_update_self on public.coach_subscriptions;
create policy coach_subscriptions_update_self on public.coach_subscriptions
  for update to authenticated
  using (subscriber_id = auth.uid())
  with check (subscriber_id = auth.uid());

drop policy if exists coach_subscriptions_delete_self on public.coach_subscriptions;
create policy coach_subscriptions_delete_self on public.coach_subscriptions
  for delete to authenticated
  using (subscriber_id = auth.uid());

-- -----------------------------------------------------------------------------
-- C. Session reviews (short structured feedback on a peer's session)
-- -----------------------------------------------------------------------------
create table if not exists public.session_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  focus_technique_id text references public.user_techniques(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, reviewer_id)
);

create index if not exists session_reviews_session_idx on public.session_reviews (session_id, created_at desc);
create index if not exists session_reviews_reviewer_idx on public.session_reviews (reviewer_id, created_at desc);

alter table public.session_reviews enable row level security;
revoke all on public.session_reviews from anon;
grant select, insert, update, delete on public.session_reviews to authenticated;

drop policy if exists session_reviews_select_reviewer on public.session_reviews;
create policy session_reviews_select_reviewer on public.session_reviews
  for select to authenticated
  using (reviewer_id = auth.uid());

drop policy if exists session_reviews_select_session_owner on public.session_reviews;
create policy session_reviews_select_session_owner on public.session_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.training_sessions s
      where s.id = public.session_reviews.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists session_reviews_insert_reviewer on public.session_reviews;
create policy session_reviews_insert_reviewer on public.session_reviews
  for insert to authenticated
  with check (reviewer_id = auth.uid());

drop policy if exists session_reviews_update_reviewer on public.session_reviews;
create policy session_reviews_update_reviewer on public.session_reviews
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists session_reviews_delete_reviewer on public.session_reviews;
create policy session_reviews_delete_reviewer on public.session_reviews
  for delete to authenticated
  using (reviewer_id = auth.uid());



-- -----------------------------------------------------------------------------
-- D. Drill challenges + completions
-- -----------------------------------------------------------------------------
create table if not exists public.drill_challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  technique_id text not null references public.user_techniques(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  prompt text not null default '' check (char_length(prompt) <= 1000),
  target_reps integer not null check (target_reps > 0 and target_reps <= 100000),
  branch text not null default 'bjj',
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  visibility text not null default 'public' check (visibility in ('public', 'subscribers')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drill_challenges_coach_idx on public.drill_challenges (coach_id, created_at desc);
create index if not exists drill_challenges_active_idx on public.drill_challenges (branch, ends_on desc);

alter table public.drill_challenges enable row level security;
revoke all on public.drill_challenges from anon;
grant select, insert, update, delete on public.drill_challenges to authenticated;

drop policy if exists drill_challenges_select_own on public.drill_challenges;
create policy drill_challenges_select_own on public.drill_challenges
  for select to authenticated
  using (coach_id = auth.uid());

drop policy if exists drill_challenges_insert_self on public.drill_challenges;
create policy drill_challenges_insert_self on public.drill_challenges
  for insert to authenticated
  with check (coach_id = auth.uid());

drop policy if exists drill_challenges_update_own on public.drill_challenges;
create policy drill_challenges_update_own on public.drill_challenges
  for update to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists drill_challenges_delete_own on public.drill_challenges;
create policy drill_challenges_delete_own on public.drill_challenges
  for delete to authenticated
  using (coach_id = auth.uid());

create table if not exists public.drill_completions (
  challenge_id uuid not null references public.drill_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  reps integer not null check (reps > 0 and reps <= 100000),
  completed_at timestamptz not null default now(),
  primary key (challenge_id, user_id, session_id)
);

create index if not exists drill_completions_challenge_idx on public.drill_completions (challenge_id, completed_at desc);
create index if not exists drill_completions_user_idx on public.drill_completions (user_id, completed_at desc);

alter table public.drill_completions enable row level security;
revoke all on public.drill_completions from anon;
grant select, insert, delete on public.drill_completions to authenticated;

drop policy if exists drill_completions_select_own on public.drill_completions;
create policy drill_completions_select_own on public.drill_completions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists drill_completions_select_coach on public.drill_completions;
create policy drill_completions_select_coach on public.drill_completions
  for select to authenticated
  using (
    exists (
      select 1 from public.drill_challenges c
      where c.id = challenge_id and c.coach_id = auth.uid()
    )
  );

drop policy if exists drill_completions_insert_self on public.drill_completions;
create policy drill_completions_insert_self on public.drill_completions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists drill_completions_delete_self on public.drill_completions;
create policy drill_completions_delete_self on public.drill_completions
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Covering indexes for discovery & community query patterns
-- -----------------------------------------------------------------------------
create index if not exists systems_public_branch_idx
  on public.systems (user_id, visibility, branch)
  where visibility = 'public';

create index if not exists user_techniques_branch_idx
  on public.user_techniques (user_id, branch, updated_at desc);

create index if not exists training_sessions_visibility_idx
  on public.training_sessions (user_id, visibility, session_date desc);

create index if not exists follows_pair_idx on public.follows (follower_user_id, following_user_id);
