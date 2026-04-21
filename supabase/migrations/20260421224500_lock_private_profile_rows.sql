begin;

-- Public/user discovery now goes through explicit security-definer RPCs. Keep
-- raw profile and stats rows owner-only so bypassing the client cannot expose
-- private account data.
alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_stats'
  loop
    execute format('drop policy if exists %I on public.user_stats', pol.policyname);
  end loop;
end;
$$;

create policy bjj_profiles_select on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy bjj_profiles_insert on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy bjj_profiles_update on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy bjj_user_stats_select on public.user_stats
  for select to authenticated
  using (auth.uid() = user_id);

create policy bjj_user_stats_insert on public.user_stats
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy bjj_user_stats_update on public.user_stats
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
