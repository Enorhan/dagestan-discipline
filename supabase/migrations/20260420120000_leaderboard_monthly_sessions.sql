-- Leaderboard: monthly session counts (all logged sessions per user, any visibility).
-- Replaces the old bjj_leaderboard view that mixed submissions, techniques, and streaks.

drop view if exists public.bjj_leaderboard;

create or replace function public.bjj_leaderboard_sessions_for_month(month_start date)
returns table (id text, name text, handle text, score bigint)
language sql
stable
security definer
set search_path = public
as $$
  with month_bounds as (
    select date_trunc('month', month_start)::date as ms
  ),
  session_counts as (
    select
      s.user_id,
      count(*)::bigint as session_count
    from public.training_sessions s
    cross join month_bounds b
    where date_trunc('month', s.session_date) = date_trunc('month', b.ms)
    group by s.user_id
  )
  select
    p.id::text,
    p.display_name,
    ('@' || p.username),
    coalesce(sc.session_count, 0)::bigint
  from public.profiles p
  left join session_counts sc on sc.user_id = p.id
  where coalesce(p.onboarding_completed, false) = true
  order by coalesce(sc.session_count, 0) desc, p.display_name asc;
$$;

revoke all on function public.bjj_leaderboard_sessions_for_month(date) from public;
grant execute on function public.bjj_leaderboard_sessions_for_month(date) to authenticated;
