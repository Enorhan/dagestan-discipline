begin;

-- "Moments" are story highlights (Instagram-like) saved by the story author.

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  cover_story_id uuid references public.stories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) <= 40)
);

create index if not exists idx_moments_user_updated
  on public.moments (user_id, updated_at desc);

create table if not exists public.moment_stories (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  added_at timestamptz not null default now(),
  sort_order integer not null default 0,
  unique (moment_id, story_id)
);

create index if not exists idx_moment_stories_moment_sort
  on public.moment_stories (moment_id, sort_order asc, added_at desc);

alter table public.moments enable row level security;
alter table public.moment_stories enable row level security;

drop policy if exists moments_select_policy on public.moments;
create policy moments_select_policy on public.moments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_view_author_profile(auth.uid(), user_id)
  );

drop policy if exists moments_insert_policy on public.moments;
create policy moments_insert_policy on public.moments
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists moments_update_policy on public.moments;
create policy moments_update_policy on public.moments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists moments_delete_policy on public.moments;
create policy moments_delete_policy on public.moments
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists moment_stories_select_policy on public.moment_stories;
create policy moment_stories_select_policy on public.moment_stories
  for select to authenticated
  using (
    exists (
      select 1
      from public.moments m
      where m.id = moment_id
        and (
          m.user_id = auth.uid()
          or public.can_view_author_profile(auth.uid(), m.user_id)
        )
    )
  );

drop policy if exists moment_stories_insert_policy on public.moment_stories;
create policy moment_stories_insert_policy on public.moment_stories
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.moments m
      where m.id = moment_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists moment_stories_delete_policy on public.moment_stories;
create policy moment_stories_delete_policy on public.moment_stories
  for delete to authenticated
  using (
    exists (
      select 1
      from public.moments m
      where m.id = moment_id
        and m.user_id = auth.uid()
    )
  );

create or replace function public.moments_list(
  viewer_id uuid,
  profile_id uuid
)
returns table (
  moment_id uuid,
  user_id uuid,
  title text,
  cover_media_url text,
  cover_thumbnail_url text,
  story_count bigint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as moment_id,
    m.user_id,
    m.title,
    coalesce(cover_story.media_url, fallback_story.media_url) as cover_media_url,
    coalesce(cover_story.thumbnail_url, fallback_story.thumbnail_url, cover_story.media_url, fallback_story.media_url) as cover_thumbnail_url,
    (
      select count(*)::bigint
      from public.moment_stories ms
      where ms.moment_id = m.id
    ) as story_count,
    m.updated_at
  from public.moments m
  left join public.stories cover_story on cover_story.id = m.cover_story_id
  left join lateral (
    select s2.*
    from public.moment_stories ms2
    join public.stories s2 on s2.id = ms2.story_id
    where ms2.moment_id = m.id
    order by ms2.sort_order asc, ms2.added_at desc
    limit 1
  ) fallback_story on true
  where m.user_id = profile_id
    and (
      profile_id = viewer_id
      or public.can_view_author_profile(viewer_id, profile_id)
    )
  order by m.updated_at desc;
$$;

grant execute on function public.moments_list(uuid, uuid) to authenticated;

commit;

