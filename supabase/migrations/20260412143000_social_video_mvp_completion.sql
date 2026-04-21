do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_playback_milestone') then
    create type public.social_playback_milestone as enum (
      'impression',
      'watch_start',
      'view_2s',
      'quartile_25',
      'quartile_50',
      'quartile_75',
      'completion',
      'skip',
      'replay'
    );
  end if;
end $$;

alter table public.creator_drafts
  add column if not exists video_asset_id text,
  add column if not exists video_provider public.social_video_provider,
  add column if not exists upload_status text not null default 'idle',
  add column if not exists upload_progress integer not null default 0,
  add column if not exists failed_reason text,
  add column if not exists duration_ms integer,
  add column if not exists aspect_ratio numeric,
  add column if not exists trim_start_ms integer,
  add column if not exists trim_end_ms integer;

update public.creator_drafts
set upload_status = case
  when published_post_id is not null then 'ready'
  when upload_url is not null then 'uploaded'
  else 'idle'
end
where coalesce(upload_status, '') = '';

create table if not exists public.social_playback_events (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  surface public.social_feed_surface not null,
  milestone public.social_playback_milestone not null,
  watch_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_playback_events_viewer_post_created
  on public.social_playback_events (viewer_user_id, post_id, created_at desc);

create index if not exists idx_social_playback_events_post_milestone_created
  on public.social_playback_events (post_id, milestone, created_at desc);

create table if not exists public.social_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.social_playback_events enable row level security;
alter table public.social_moderators enable row level security;

revoke all on table public.social_playback_events from anon;
revoke all on table public.social_moderators from anon;

grant select, insert on table public.social_playback_events to authenticated;
grant select on table public.social_moderators to authenticated;

drop policy if exists social_playback_events_rw on public.social_playback_events;
create policy social_playback_events_rw on public.social_playback_events
  for all to authenticated
  using (viewer_user_id = auth.uid())
  with check (viewer_user_id = auth.uid());

drop policy if exists social_moderators_select_self on public.social_moderators;
create policy social_moderators_select_self on public.social_moderators
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_social_moderator(viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.social_moderators sm
    where sm.user_id = viewer_id
  );
$$;

create or replace function public.record_playback_milestone(
  viewer_id uuid,
  post_id uuid,
  surface_name public.social_feed_surface,
  milestone_name public.social_playback_milestone,
  watch_ms integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if viewer_id is null or post_id is null then
    raise exception 'viewer_id and post_id are required';
  end if;

  if auth.uid() is distinct from viewer_id then
    raise exception 'viewer_id does not match authenticated user';
  end if;

  insert into public.social_playback_events (
    viewer_user_id,
    post_id,
    surface,
    milestone,
    watch_ms
  )
  values (
    viewer_id,
    post_id,
    surface_name,
    milestone_name,
    greatest(coalesce(watch_ms, 0), 0)
  );
end;
$$;

create or replace function public.extract_social_hashtags(input text)
returns text[]
language sql
immutable
as $$
  with matches as (
    select lower((regexp_matches(coalesce(input, ''), '#([a-zA-Z0-9_]+)', 'g'))[1]) as slug
  )
  select coalesce(array_agg(distinct slug), '{}'::text[])
  from matches
  where slug is not null and slug <> '';
$$;

create or replace function public.sync_social_post_topics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  topic_slug text;
  topic_id uuid;
begin
  delete from public.social_post_topics
  where post_id = new.id;

  foreach topic_slug in array public.extract_social_hashtags(new.caption)
  loop
    insert into public.social_topics (slug, label)
    values (topic_slug, initcap(replace(topic_slug, '_', ' ')))
    on conflict (slug) do update
      set label = excluded.label
    returning id into topic_id;

    if topic_id is null then
      select id into topic_id
      from public.social_topics
      where slug = topic_slug;
    end if;

    if topic_id is not null then
      insert into public.social_post_topics (post_id, topic_id, weight)
      values (new.id, topic_id, 1)
      on conflict (post_id, topic_id) do update
        set weight = excluded.weight;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_social_post_topics on public.posts;
create trigger sync_social_post_topics
  after insert or update of caption on public.posts
  for each row
  execute function public.sync_social_post_topics();

create or replace function public.social_trending_topics(page_size integer default 12)
returns table (
  slug text,
  label text,
  post_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    st.slug,
    st.label,
    count(*)::bigint as post_count
  from public.social_post_topics spt
  join public.social_topics st on st.id = spt.topic_id
  join public.posts p on p.id = spt.post_id
  where not p.is_archived
    and p.is_published
  group by st.slug, st.label
  order by post_count desc, st.label asc
  limit greatest(1, least(page_size, 30));
$$;

create or replace function public.social_moderation_queue_page(
  page_size integer default 50,
  status_filter public.moderation_status default null
)
returns table (
  queue_id uuid,
  report_id uuid,
  status public.moderation_status,
  priority integer,
  reason text,
  details text,
  evidence_urls text[],
  report_created_at timestamptz,
  updated_at timestamptz,
  reporter_user_id uuid,
  target_user_id uuid,
  post_id uuid,
  post_caption text,
  post_media_url text,
  target_author_name text,
  target_author_handle text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_social_moderator(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    q.id as queue_id,
    r.id as report_id,
    q.status,
    q.priority,
    r.reason,
    r.details,
    r.evidence_urls,
    r.created_at as report_created_at,
    q.updated_at,
    r.reporter_user_id,
    r.target_user_id,
    r.post_id,
    p.caption as post_caption,
    coalesce(pm.poster_url, pm.image_url, pm.playback_url, pm.video_url) as post_media_url,
    coalesce(pr.display_name, 'Grappler') as target_author_name,
    ('@' || coalesce(pr.username, 'grappler')) as target_author_handle
  from public.social_moderation_queue q
  join public.social_reports r on r.id = q.report_id
  left join public.posts p on p.id = r.post_id
  left join public.post_media pm on pm.post_id = p.id
  left join public.profiles pr on pr.id = r.target_user_id
  where status_filter is null or q.status = status_filter
  order by q.priority desc, r.created_at asc
  limit greatest(1, least(page_size, 100));
end;
$$;

create or replace function public.resolve_social_moderation_item(
  queue_item_id uuid,
  next_status public.moderation_status,
  action text default 'none',
  notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.social_reports%rowtype;
begin
  if not public.is_social_moderator(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select r.*
  into report_row
  from public.social_moderation_queue q
  join public.social_reports r on r.id = q.report_id
  where q.id = queue_item_id;

  if report_row.id is null then
    raise exception 'Moderation queue item not found';
  end if;

  update public.social_moderation_queue
  set
    status = next_status,
    assignee_user_id = auth.uid(),
    resolution_notes = notes,
    updated_at = now()
  where id = queue_item_id;

  update public.social_reports
  set
    status = next_status,
    updated_at = now()
  where id = report_row.id;

  if action = 'archive_post' and report_row.post_id is not null then
    update public.posts
    set is_archived = true
    where id = report_row.post_id;
  elsif action = 'block_user'
    and report_row.reporter_user_id is not null
    and report_row.target_user_id is not null then
    insert into public.social_blocks (blocker_user_id, blocked_user_id)
    values (report_row.reporter_user_id, report_row.target_user_id)
    on conflict do nothing;
  end if;
end;
$$;

drop policy if exists social_reports_select on public.social_reports;
create policy social_reports_select on public.social_reports
  for select to authenticated
  using (
    reporter_user_id = auth.uid()
    or public.is_social_moderator(auth.uid())
  );

drop policy if exists social_moderation_queue_select on public.social_moderation_queue;
create policy social_moderation_queue_select on public.social_moderation_queue
  for select to authenticated
  using (public.is_social_moderator(auth.uid()));

create or replace function public.feed_for_you(
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 20
)
returns table (
  post_id uuid,
  user_id uuid,
  author_name text,
  author_handle text,
  author_avatar_url text,
  post_kind public.post_kind,
  caption text,
  visibility public.post_visibility,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  playback_url text,
  playback_id text,
  media_processing_status public.social_media_processing_status,
  duration_ms integer,
  aspect_ratio numeric,
  created_at timestamptz,
  like_count integer,
  comment_count integer,
  save_count integer,
  viewer_liked boolean,
  viewer_saved boolean,
  rank_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_posts as (
    select p.*
    from public.posts p
    where p.created_at < cursor_created_at
      and not p.is_archived
      and p.is_published
      and public.can_view_post(viewer_id, p.user_id, p.visibility)
      and not exists (
        select 1
        from public.social_blocks b
        where (b.blocker_user_id = viewer_id and b.blocked_user_id = p.user_id)
           or (b.blocker_user_id = p.user_id and b.blocked_user_id = viewer_id)
      )
      and not exists (
        select 1
        from public.social_mutes m
        where m.muter_user_id = viewer_id
          and m.muted_user_id = p.user_id
      )
  ),
  viewer_signals as (
    select
      sfe.post_id,
      sum(greatest(sfe.watch_ms, 0))::numeric as watch_ms,
      sum(case when sfe.completed_view then 1 else 0 end)::numeric as completed_views,
      sum(case when sfe.skipped_view then 1 else 0 end)::numeric as skipped_views,
      sum(case when sfe.replayed_view then 1 else 0 end)::numeric as replayed_views
    from public.social_feed_events sfe
    where sfe.viewer_user_id = viewer_id
    group by sfe.post_id
  ),
  playback_quality as (
    select
      spe.post_id,
      sum(case when spe.milestone = 'view_2s' then 1 else 0 end)::numeric as views_2s,
      sum(case when spe.milestone = 'quartile_25' then 1 else 0 end)::numeric as quartile_25,
      sum(case when spe.milestone = 'quartile_50' then 1 else 0 end)::numeric as quartile_50,
      sum(case when spe.milestone = 'quartile_75' then 1 else 0 end)::numeric as quartile_75,
      sum(case when spe.milestone = 'completion' then 1 else 0 end)::numeric as completions,
      sum(case when spe.milestone = 'replay' then 1 else 0 end)::numeric as replays
    from public.social_playback_events spe
    group by spe.post_id
  ),
  creator_affinity as (
    select
      p.user_id as creator_id,
      sum(greatest(sfe.watch_ms, 0))::numeric as affinity_watch_ms,
      count(*) filter (where sfe.completed_view)::numeric as affinity_completed_views,
      count(*) filter (
        where l.user_id = viewer_id
          or s.user_id = viewer_id
          or c.user_id = viewer_id
      )::numeric as affinity_interactions
    from public.posts p
    left join public.social_feed_events sfe
      on sfe.post_id = p.id
     and sfe.viewer_user_id = viewer_id
    left join public.likes l
      on l.post_id = p.id
     and l.user_id = viewer_id
    left join public.saves s
      on s.post_id = p.id
     and s.user_id = viewer_id
    left join public.comments c
      on c.post_id = p.id
     and c.user_id = viewer_id
    group by p.user_id
  ),
  negative as (
    select snf.post_id, count(*)::numeric as negative_count
    from public.social_negative_feedback snf
    where snf.viewer_user_id = viewer_id
    group by snf.post_id
  ),
  ranked as (
    select
      cp.*,
      coalesce(vs.watch_ms, 0) as watch_ms,
      coalesce(vs.completed_views, 0) as completed_views,
      coalesce(vs.skipped_views, 0) as skipped_views,
      coalesce(vs.replayed_views, 0) as replayed_views,
      coalesce(pq.views_2s, 0) as views_2s,
      coalesce(pq.quartile_25, 0) as quartile_25,
      coalesce(pq.quartile_50, 0) as quartile_50,
      coalesce(pq.quartile_75, 0) as quartile_75,
      coalesce(pq.completions, 0) as completions,
      coalesce(pq.replays, 0) as quality_replays,
      coalesce(ca.affinity_watch_ms, 0) as affinity_watch_ms,
      coalesce(ca.affinity_completed_views, 0) as affinity_completed_views,
      coalesce(ca.affinity_interactions, 0) as affinity_interactions,
      coalesce(ng.negative_count, 0) as negative_count,
      row_number() over (
        partition by cp.user_id
        order by
          (
            ln(greatest(extract(epoch from (now() - cp.created_at)) / 3600.0, 1)) * -0.65
            + least(coalesce(cp.like_count, 0), 400) * 0.08
            + least(coalesce(cp.comment_count, 0), 400) * 0.12
            + least(coalesce(cp.save_count, 0), 400) * 0.16
            + least(coalesce(vs.watch_ms, 0) / 1000.0, 180) * 0.10
            + least(coalesce(pq.views_2s, 0), 250) * 0.22
            + least(coalesce(pq.quartile_50, 0), 250) * 0.30
            + least(coalesce(pq.quartile_75, 0), 250) * 0.38
            + least(coalesce(pq.completions, 0), 250) * 0.48
            + least(coalesce(pq.replays, 0), 120) * 0.22
            + least(coalesce(ca.affinity_watch_ms, 0) / 1000.0, 180) * 0.08
            + least(coalesce(ca.affinity_interactions, 0), 30) * 0.55
            + least(coalesce(ca.affinity_completed_views, 0), 20) * 0.65
            - least(coalesce(vs.skipped_views, 0), 40) * 0.8
            - least(coalesce(ng.negative_count, 0), 8) * 3.0
            + case when public.is_accepted_follower(viewer_id, cp.user_id) then 2.5 else 0 end
          ) desc,
          cp.created_at desc
      ) as creator_rank,
      (
        ln(greatest(extract(epoch from (now() - cp.created_at)) / 3600.0, 1)) * -0.65
        + least(coalesce(cp.like_count, 0), 400) * 0.08
        + least(coalesce(cp.comment_count, 0), 400) * 0.12
        + least(coalesce(cp.save_count, 0), 400) * 0.16
        + least(coalesce(vs.watch_ms, 0) / 1000.0, 180) * 0.10
        + least(coalesce(pq.views_2s, 0), 250) * 0.22
        + least(coalesce(pq.quartile_25, 0), 250) * 0.18
        + least(coalesce(pq.quartile_50, 0), 250) * 0.30
        + least(coalesce(pq.quartile_75, 0), 250) * 0.38
        + least(coalesce(pq.completions, 0), 250) * 0.48
        + least(coalesce(pq.replays, 0), 120) * 0.22
        + least(coalesce(ca.affinity_watch_ms, 0) / 1000.0, 180) * 0.08
        + least(coalesce(ca.affinity_interactions, 0), 30) * 0.55
        + least(coalesce(ca.affinity_completed_views, 0), 20) * 0.65
        - least(coalesce(vs.skipped_views, 0), 40) * 0.8
        - least(coalesce(ng.negative_count, 0), 8) * 3.0
        + case when public.is_accepted_follower(viewer_id, cp.user_id) then 2.5 else 0 end
      ) as score
    from candidate_posts cp
    left join viewer_signals vs on vs.post_id = cp.id
    left join playback_quality pq on pq.post_id = cp.id
    left join creator_affinity ca on ca.creator_id = cp.user_id
    left join negative ng on ng.post_id = cp.id
  )
  select
    r.id as post_id,
    r.user_id,
    coalesce(pr.display_name, 'Grappler') as author_name,
    ('@' || coalesce(pr.username, 'grappler')) as author_handle,
    pr.avatar_url as author_avatar_url,
    r.post_kind,
    r.caption,
    r.visibility,
    r.media_type,
    coalesce(pm.video_url, pm.playback_url, pm.hls_url, pm.image_url, pm.poster_url) as media_url,
    pm.poster_url as thumbnail_url,
    coalesce(pm.playback_url, pm.hls_url, pm.video_url) as playback_url,
    pm.playback_id,
    coalesce(pm.media_processing_status, 'pending') as media_processing_status,
    pm.duration_ms,
    pm.aspect_ratio,
    r.created_at,
    coalesce(r.like_count, 0) as like_count,
    coalesce(r.comment_count, 0) as comment_count,
    coalesce(r.save_count, 0) as save_count,
    exists(select 1 from public.likes l where l.post_id = r.id and l.user_id = viewer_id) as viewer_liked,
    exists(select 1 from public.saves s where s.post_id = r.id and s.user_id = viewer_id) as viewer_saved,
    r.score as rank_score
  from ranked r
  left join public.profiles pr on pr.id = r.user_id
  left join public.post_media pm on pm.post_id = r.id
  where r.negative_count < 2
    and r.creator_rank <= 2
  order by rank_score desc, r.created_at desc
  limit greatest(1, least(page_size, 50));
$$;

create or replace function public.feed_following(
  viewer_id uuid,
  cursor_created_at timestamptz default now(),
  page_size integer default 20
)
returns table (
  post_id uuid,
  user_id uuid,
  author_name text,
  author_handle text,
  author_avatar_url text,
  post_kind public.post_kind,
  caption text,
  visibility public.post_visibility,
  media_type public.post_media_type,
  media_url text,
  thumbnail_url text,
  playback_url text,
  playback_id text,
  media_processing_status public.social_media_processing_status,
  duration_ms integer,
  aspect_ratio numeric,
  created_at timestamptz,
  like_count integer,
  comment_count integer,
  save_count integer,
  viewer_liked boolean,
  viewer_saved boolean,
  rank_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.feed_for_you(viewer_id, cursor_created_at, page_size * 4)
  where user_id in (
    select following_user_id
    from public.follows
    where follower_user_id = viewer_id
  )
     or user_id = viewer_id
  order by created_at desc, rank_score desc
  limit greatest(1, least(page_size, 50));
$$;

grant execute on function public.is_social_moderator(uuid) to authenticated;
grant execute on function public.record_playback_milestone(uuid, uuid, public.social_feed_surface, public.social_playback_milestone, integer) to authenticated;
grant execute on function public.social_trending_topics(integer) to authenticated;
grant execute on function public.social_moderation_queue_page(integer, public.moderation_status) to authenticated;
grant execute on function public.resolve_social_moderation_item(uuid, public.moderation_status, text, text) to authenticated;
