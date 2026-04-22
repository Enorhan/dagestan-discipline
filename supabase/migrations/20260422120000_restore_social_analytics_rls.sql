begin;

-- Re-apply the RLS + grant posture originally defined in
-- 20260411200000_social_video_mvp_foundation.sql. The placeholder migrations
-- 20260413093352 / 20260413095213 / 20260413095729 recreated these tables
-- without restoring RLS, leaving the anon role with full DML access.

alter table public.social_feed_events        enable row level security;
alter table public.social_negative_feedback  enable row level security;
alter table public.social_topics             enable row level security;
alter table public.social_post_topics        enable row level security;
alter table public.social_rate_limits        enable row level security;

revoke all on table public.social_feed_events        from anon;
revoke all on table public.social_negative_feedback  from anon;
revoke all on table public.social_topics             from anon;
revoke all on table public.social_post_topics        from anon;
revoke all on table public.social_rate_limits        from anon;

grant select, insert on table public.social_feed_events       to authenticated;
grant select, insert on table public.social_negative_feedback to authenticated;
grant select          on table public.social_topics           to authenticated;
grant select          on table public.social_post_topics      to authenticated;
grant select          on table public.social_rate_limits      to authenticated;

drop policy if exists social_feed_events_insert on public.social_feed_events;
create policy social_feed_events_insert on public.social_feed_events
  for insert to authenticated
  with check (viewer_user_id = auth.uid());

drop policy if exists social_feed_events_select on public.social_feed_events;
create policy social_feed_events_select on public.social_feed_events
  for select to authenticated
  using (viewer_user_id = auth.uid());

drop policy if exists social_negative_feedback_rw on public.social_negative_feedback;
create policy social_negative_feedback_rw on public.social_negative_feedback
  for all to authenticated
  using (viewer_user_id = auth.uid())
  with check (viewer_user_id = auth.uid());

drop policy if exists social_topics_select on public.social_topics;
create policy social_topics_select on public.social_topics
  for select to authenticated
  using (true);

drop policy if exists social_post_topics_select on public.social_post_topics;
create policy social_post_topics_select on public.social_post_topics
  for select to authenticated
  using (true);

-- social_rate_limits: reads allowed to the owning user; writes are routed
-- through security-definer RPCs so no insert/update policy is granted here.
drop policy if exists social_rate_limits_select on public.social_rate_limits;
create policy social_rate_limits_select on public.social_rate_limits
  for select to authenticated
  using (user_id = auth.uid());

commit;

