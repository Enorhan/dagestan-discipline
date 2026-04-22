begin;

alter table public.user_stats
  alter column flow_streak set default 0;

with session_counts as (
  select user_id, count(*)::integer as session_count
  from public.training_sessions
  group by user_id
)
update public.user_stats us
set flow_streak = 0
where coalesce(us.workout_count, 0) = 0
  and coalesce(us.training_streak, 0) = 0
  and coalesce(us.flow_streak, 0) = 1
  and coalesce((select sc.session_count from session_counts sc where sc.user_id = us.user_id), 0) = 0;

commit;

