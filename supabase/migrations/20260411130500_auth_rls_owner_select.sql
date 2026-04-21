begin;

-- Restrict profile reads to the owner by default.
drop policy if exists bjj_profiles_select on public.profiles;
create policy bjj_profiles_select on public.profiles
  for select to authenticated
  using (auth.uid() = id);

-- Restrict user stats reads to the owner by default.
drop policy if exists bjj_user_stats_select on public.user_stats;
create policy bjj_user_stats_select on public.user_stats
  for select to authenticated
  using (auth.uid() = user_id);

commit;
