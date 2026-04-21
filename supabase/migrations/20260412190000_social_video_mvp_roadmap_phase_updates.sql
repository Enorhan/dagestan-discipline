begin;

-- ---------------------------------------------------------------------------
-- Phase 1: video lifecycle integrity
-- ---------------------------------------------------------------------------

alter table public.social_video_uploads
  add column if not exists client_upload_key text;

create unique index if not exists idx_social_video_uploads_user_client_key
  on public.social_video_uploads (user_id, client_upload_key)
  where client_upload_key is not null;

create index if not exists idx_post_media_video_asset_id
  on public.post_media (video_asset_id)
  where video_asset_id is not null;

create index if not exists idx_post_media_playback_id
  on public.post_media (playback_id)
  where playback_id is not null;

create or replace function public.validate_post_media_processing_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.media_processing_status = new.media_processing_status then
    return new;
  end if;

  if old.media_processing_status = 'pending'
    and new.media_processing_status in ('processing', 'failed', 'ready') then
    return new;
  end if;

  if old.media_processing_status = 'processing'
    and new.media_processing_status in ('ready', 'failed') then
    return new;
  end if;

  if old.media_processing_status = 'failed'
    and new.media_processing_status in ('processing') then
    return new;
  end if;

  if old.media_processing_status = 'ready'
    and new.media_processing_status in ('processing') then
    return new;
  end if;

  raise exception 'Invalid media_processing_status transition: % -> %', old.media_processing_status, new.media_processing_status;
end;
$$;

drop trigger if exists validate_post_media_processing_transition on public.post_media;
create trigger validate_post_media_processing_transition
  before update of media_processing_status on public.post_media
  for each row execute function public.validate_post_media_processing_transition();

-- ---------------------------------------------------------------------------
-- Phase 2: rank feature materialization + ranking v2
-- ---------------------------------------------------------------------------

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

create or replace function public.refresh_social_post_feature_rollups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched_count integer := 0;
begin
  with feed_agg as (
    select
      sfe.post_id,
      sum(greatest(sfe.watch_ms, 0))::bigint as watch_ms_7d,
      sum(case when sfe.skipped_view then 1 else 0 end)::integer as skips_7d,
      sum(case when sfe.replayed_view then 1 else 0 end)::integer as replays_7d
    from public.social_feed_events sfe
    where sfe.created_at >= now() - interval '7 days'
    group by sfe.post_id
  ),
  playback_agg as (
    select
      spe.post_id,
      sum(case when spe.milestone = 'view_2s' then 1 else 0 end)::integer as views_2s_7d,
      sum(case when spe.milestone = 'completion' then 1 else 0 end)::integer as completions_7d
    from public.social_playback_events spe
    where spe.created_at >= now() - interval '7 days'
    group by spe.post_id
  ),
  negative_agg as (
    select
      snf.post_id,
      sum(case when snf.feedback_type = 'hide' then 1 else 0 end)::integer as negative_hide_7d,
      sum(case when snf.feedback_type = 'not_interested' then 1 else 0 end)::integer as negative_not_interested_7d,
      sum(case when snf.feedback_type = 'report' then 1 else 0 end)::integer as negative_report_7d
    from public.social_negative_feedback snf
    where snf.created_at >= now() - interval '7 days'
    group by snf.post_id
  ),
  merged as (
    select
      p.id as post_id,
      coalesce(f.watch_ms_7d, 0)::bigint as watch_ms_7d,
      coalesce(pb.views_2s_7d, 0)::integer as views_2s_7d,
      coalesce(pb.completions_7d, 0)::integer as completions_7d,
      coalesce(f.skips_7d, 0)::integer as skips_7d,
      coalesce(f.replays_7d, 0)::integer as replays_7d,
      coalesce(n.negative_hide_7d, 0)::integer as negative_hide_7d,
      coalesce(n.negative_not_interested_7d, 0)::integer as negative_not_interested_7d,
      coalesce(n.negative_report_7d, 0)::integer as negative_report_7d
    from public.posts p
    left join feed_agg f on f.post_id = p.id
    left join playback_agg pb on pb.post_id = p.id
    left join negative_agg n on n.post_id = p.id
    where p.created_at >= now() - interval '30 days'
  )
  insert into public.social_post_feature_rollups (
    post_id,
    captured_at,
    watch_ms_7d,
    views_2s_7d,
    completions_7d,
    skips_7d,
    replays_7d,
    negative_hide_7d,
    negative_not_interested_7d,
    negative_report_7d
  )
  select
    m.post_id,
    now(),
    m.watch_ms_7d,
    m.views_2s_7d,
    m.completions_7d,
    m.skips_7d,
    m.replays_7d,
    m.negative_hide_7d,
    m.negative_not_interested_7d,
    m.negative_report_7d
  from merged m
  on conflict (post_id) do update
    set
      captured_at = excluded.captured_at,
      watch_ms_7d = excluded.watch_ms_7d,
      views_2s_7d = excluded.views_2s_7d,
      completions_7d = excluded.completions_7d,
      skips_7d = excluded.skips_7d,
      replays_7d = excluded.replays_7d,
      negative_hide_7d = excluded.negative_hide_7d,
      negative_not_interested_7d = excluded.negative_not_interested_7d,
      negative_report_7d = excluded.negative_report_7d;

  get diagnostics touched_count = row_count;
  return touched_count;
end;
$$;

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
  creator_affinity as (
    select
      p.user_id as creator_id,
      sum(greatest(sfe.watch_ms, 0))::numeric as affinity_watch_ms,
      count(*) filter (where sfe.completed_view)::numeric as affinity_completed_views
    from public.posts p
    left join public.social_feed_events sfe
      on sfe.post_id = p.id
     and sfe.viewer_user_id = viewer_id
    group by p.user_id
  ),
  feedback as (
    select
      snf.post_id,
      sum(case when snf.feedback_type = 'hide' then 1 else 0 end)::numeric as hide_count,
      sum(case when snf.feedback_type = 'not_interested' then 1 else 0 end)::numeric as not_interested_count,
      sum(case when snf.feedback_type = 'report' then 1 else 0 end)::numeric as report_count
    from public.social_negative_feedback snf
    where snf.viewer_user_id = viewer_id
    group by snf.post_id
  ),
  ranked as (
    select
      cp.*,
      coalesce(fr.watch_ms_7d, 0) as watch_ms_7d,
      coalesce(fr.views_2s_7d, 0) as views_2s_7d,
      coalesce(fr.completions_7d, 0) as completions_7d,
      coalesce(fr.skips_7d, 0) as skips_7d,
      coalesce(fr.replays_7d, 0) as replays_7d,
      coalesce(ca.affinity_watch_ms, 0) as affinity_watch_ms,
      coalesce(ca.affinity_completed_views, 0) as affinity_completed_views,
      coalesce(fb.hide_count, 0) as hide_count,
      coalesce(fb.not_interested_count, 0) as not_interested_count,
      coalesce(fb.report_count, 0) as report_count,
      row_number() over (
        partition by cp.user_id
        order by cp.created_at desc
      ) as creator_rank,
      (
        -- freshness with steeper initial decay
        ln(greatest(extract(epoch from (now() - cp.created_at)) / 3600.0, 1)) * -0.70
        + least(coalesce(cp.like_count, 0), 400) * 0.08
        + least(coalesce(cp.comment_count, 0), 400) * 0.13
        + least(coalesce(cp.save_count, 0), 400) * 0.18
        + least(coalesce(fr.watch_ms_7d, 0) / 1000.0, 240) * 0.11
        + least(coalesce(fr.views_2s_7d, 0), 300) * 0.20
        + least(coalesce(fr.completions_7d, 0), 300) * 0.42
        + least(coalesce(fr.replays_7d, 0), 120) * 0.24
        + least(coalesce(ca.affinity_watch_ms, 0) / 1000.0, 240) * 0.08
        + least(coalesce(ca.affinity_completed_views, 0), 40) * 0.52
        - least(coalesce(fr.skips_7d, 0), 120) * 0.72
        - least(coalesce(fb.hide_count, 0), 8) * 2.2
        - least(coalesce(fb.not_interested_count, 0), 8) * 2.8
        - least(coalesce(fb.report_count, 0), 4) * 4.2
        + case when public.is_accepted_follower(viewer_id, cp.user_id) then 1.8 else 0 end
      ) as score
    from candidate_posts cp
    left join public.social_post_feature_rollups fr on fr.post_id = cp.id
    left join creator_affinity ca on ca.creator_id = cp.user_id
    left join feedback fb on fb.post_id = cp.id
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
  where r.report_count < 1
    and r.not_interested_count < 2
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
  with follow_set as (
    select following_user_id as user_id
    from public.follows
    where follower_user_id = viewer_id
    union
    select viewer_id
  )
  select
    f.post_id,
    f.user_id,
    f.author_name,
    f.author_handle,
    f.author_avatar_url,
    f.post_kind,
    f.caption,
    f.visibility,
    f.media_type,
    f.media_url,
    f.thumbnail_url,
    f.playback_url,
    f.playback_id,
    f.media_processing_status,
    f.duration_ms,
    f.aspect_ratio,
    f.created_at,
    f.like_count,
    f.comment_count,
    f.save_count,
    f.viewer_liked,
    f.viewer_saved,
    -- Following is primarily recency with light rank blending.
    (f.rank_score * 0.35) - (extract(epoch from (now() - f.created_at)) / 3600.0) as rank_score
  from public.feed_for_you(viewer_id, cursor_created_at, page_size * 4) f
  where f.user_id in (select user_id from follow_set)
  order by created_at desc, rank_score desc
  limit greatest(1, least(page_size, 50));
$$;

-- ---------------------------------------------------------------------------
-- Phase 4: engagement depth and discovery
-- ---------------------------------------------------------------------------

create or replace function public.comments_for_post(
  target_post_id uuid,
  cursor_created_at timestamptz default null,
  parent_id uuid default null,
  page_size integer default 80
)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  body text,
  parent_comment_id uuid,
  mentioned_user_ids uuid[],
  hashtags text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.post_id,
    c.user_id,
    c.body,
    c.parent_comment_id,
    c.mentioned_user_ids,
    c.hashtags,
    c.created_at
  from public.comments c
  join public.posts p on p.id = c.post_id
  where c.post_id = target_post_id
    and (
      cursor_created_at is null
      or c.created_at < cursor_created_at
    )
    and (
      (parent_id is null and c.parent_comment_id is null)
      or c.parent_comment_id = parent_id
    )
    and public.can_view_post(auth.uid(), p.user_id, p.visibility)
  order by c.created_at asc
  limit greatest(1, least(page_size, 250));
$$;

create or replace function public.follow_suggestions(
  viewer_id uuid,
  page_size integer default 12
)
returns table (
  user_id uuid,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with my_following as (
    select following_user_id
    from public.follows
    where follower_user_id = viewer_id
  ),
  mutual_graph as (
    select
      f.following_user_id as candidate_user_id,
      count(*)::numeric as mutual_count
    from public.follows f
    where f.follower_user_id in (select following_user_id from my_following)
      and f.following_user_id <> viewer_id
      and f.following_user_id not in (select following_user_id from my_following)
    group by f.following_user_id
  ),
  affinity as (
    select
      p.user_id as candidate_user_id,
      count(*)::numeric as affinity_count
    from public.posts p
    where p.user_id <> viewer_id
      and p.id in (
        select l.post_id from public.likes l where l.user_id = viewer_id
        union
        select c.post_id from public.comments c where c.user_id = viewer_id
        union
        select s.post_id from public.saves s where s.user_id = viewer_id
      )
    group by p.user_id
  ),
  topic_overlap as (
    select
      p.user_id as candidate_user_id,
      count(distinct spt.topic_id)::numeric as topic_overlap_count
    from public.social_post_topics spt
    join public.posts p on p.id = spt.post_id
    where spt.topic_id in (
      select spt2.topic_id
      from public.social_post_topics spt2
      join public.posts p2 on p2.id = spt2.post_id
      where p2.id in (
        select l.post_id from public.likes l where l.user_id = viewer_id
        union
        select c.post_id from public.comments c where c.user_id = viewer_id
        union
        select s.post_id from public.saves s where s.user_id = viewer_id
      )
    )
      and p.user_id <> viewer_id
    group by p.user_id
  )
  select
    coalesce(m.candidate_user_id, a.candidate_user_id, t.candidate_user_id) as user_id,
    (coalesce(m.mutual_count, 0) * 2.0)
    + (coalesce(a.affinity_count, 0) * 1.0)
    + (coalesce(t.topic_overlap_count, 0) * 0.8) as score
  from mutual_graph m
  full join affinity a on a.candidate_user_id = m.candidate_user_id
  full join topic_overlap t on t.candidate_user_id = coalesce(m.candidate_user_id, a.candidate_user_id)
  where coalesce(m.candidate_user_id, a.candidate_user_id, t.candidate_user_id) is not null
    and coalesce(m.candidate_user_id, a.candidate_user_id, t.candidate_user_id) not in (select following_user_id from my_following)
    and coalesce(m.candidate_user_id, a.candidate_user_id, t.candidate_user_id) <> viewer_id
  order by score desc
  limit greatest(1, least(page_size, 60));
$$;

-- ---------------------------------------------------------------------------
-- Phase 5: trust and safety automation
-- ---------------------------------------------------------------------------

create index if not exists idx_social_moderation_queue_status_priority_created
  on public.social_moderation_queue (status, priority desc, created_at asc);

create or replace function public.enqueue_social_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_moderation_queue (report_id, priority, status)
  values (
    new.id,
    case
      when lower(new.reason) like '%violence%' then 90
      when lower(new.reason) like '%minor%' then 95
      when lower(new.reason) like '%harass%' then 80
      else 50
    end,
    'open'
  )
  on conflict (report_id) do update
    set
      priority = greatest(public.social_moderation_queue.priority, excluded.priority),
      status = case
        when public.social_moderation_queue.status = 'dismissed' then 'open'
        else public.social_moderation_queue.status
      end,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists enqueue_social_report on public.social_reports;
create trigger enqueue_social_report
  after insert on public.social_reports
  for each row execute function public.enqueue_social_report();

create or replace function public.guard_social_abuse_limits()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if tg_table_name = 'social_reports' then
    select count(*)
    into recent_count
    from public.social_reports sr
    where sr.reporter_user_id = new.reporter_user_id
      and sr.created_at > now() - interval '1 hour';
    if recent_count >= 12 then
      raise exception 'Rate limited: too many reports';
    end if;
  elsif tg_table_name = 'comments' then
    select count(*)
    into recent_count
    from public.comments c
    where c.user_id = new.user_id
      and c.created_at > now() - interval '10 minutes';
    if recent_count >= 60 then
      raise exception 'Rate limited: too many comments';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists social_reports_rate_limit_guard on public.social_reports;
create trigger social_reports_rate_limit_guard
  before insert on public.social_reports
  for each row execute function public.guard_social_abuse_limits();

drop trigger if exists comments_social_rate_limit_guard on public.comments;
create trigger comments_social_rate_limit_guard
  before insert on public.comments
  for each row execute function public.guard_social_abuse_limits();

grant execute on function public.refresh_social_post_feature_rollups() to authenticated;
grant execute on function public.comments_for_post(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.feed_for_you(uuid, timestamptz, integer) to authenticated;
grant execute on function public.feed_following(uuid, timestamptz, integer) to authenticated;
grant execute on function public.follow_suggestions(uuid, integer) to authenticated;

commit;
