-- Community Discover → Techniques: public listing with viewer_has_forked,
-- plus viewer_has_forked on list_public_user_techniques for public profiles.
-- Forking a technique is implemented as copy-to-user_techniques keyed by
-- catalog_technique_id, which is already unique per (user_id, catalog_technique_id).

create or replace function public.list_public_techniques_by_branch(
  p_branch text default null,
  p_limit integer default 24,
  p_cursor timestamptz default null
) returns table (
  technique_id text,
  owner_id uuid,
  owner_display_name text,
  owner_handle text,
  title text,
  category text,
  description text,
  tutorial_title text,
  tutorial_thumbnail text,
  tags text[],
  links text[],
  media text[],
  branch text,
  updated_at timestamptz,
  fork_count bigint,
  viewer_has_forked boolean
)
language sql
stable security definer
set search_path = public
as $function$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  ),
  base as (
    select t.*
    from public.techniques t, cleaned c
    where t.created_by is not null
      and (auth.uid() is null or t.created_by <> auth.uid())
      and (c.branch_id is null or coalesce(t.branch, 'bjj') = c.branch_id)
      and (p_cursor is null or t.updated_at < p_cursor)
      and coalesce(
        (select p.privacy from public.profiles p where p.id = t.created_by),
        'public'
      ) = 'public'
      and (auth.uid() is null or not public.community_is_blocked(auth.uid(), t.created_by))
  )
  select
    b.id,
    b.created_by,
    public._profile_display_label(b.created_by),
    (select p.username from public.profiles p where p.id = b.created_by),
    b.title,
    b.category,
    b.description,
    b.tutorial_title,
    b.tutorial_thumbnail,
    coalesce(b.tags, '{}'::text[]),
    coalesce(b.links, '{}'::text[]),
    coalesce(b.media, '{}'::text[]),
    coalesce(b.branch, 'bjj'),
    b.updated_at,
    coalesce((
      select count(*)::bigint
      from public.user_techniques ut
      where ut.catalog_technique_id = b.id
        and ut.user_id <> b.created_by
    ), 0),
    case
      when auth.uid() is null then false
      else exists (
        select 1 from public.user_techniques ut
        where ut.catalog_technique_id = b.id and ut.user_id = auth.uid()
      )
    end
  from base b
  order by b.updated_at desc
  limit least(coalesce(p_limit, 24), 60);
$function$;

revoke all on function public.list_public_techniques_by_branch(text, integer, timestamptz) from public;
grant execute on function public.list_public_techniques_by_branch(text, integer, timestamptz) to authenticated;

drop function if exists public.list_public_user_systems(uuid, text);
create or replace function public.list_public_user_systems(
  p_profile_id uuid,
  p_branch text default null
)
returns table (
  system_id text,
  branch text,
  title text,
  summary text,
  visibility text,
  sort_order integer,
  updated_at timestamptz,
  nodes jsonb,
  edges jsonb,
  viewer_has_forked boolean
)
language sql
stable
security definer
set search_path = public
as $function$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  ),
  visible_systems as (
    select s.*
    from public.systems s
    cross join cleaned c
    where s.user_id = p_profile_id
      and s.visibility = 'public'
      and coalesce((select p.privacy from public.profiles p where p.id = p_profile_id), 'public') = 'public'
      and (c.branch_id is null or s.branch = c.branch_id)
  )
  select
    s.id,
    s.branch,
    s.title,
    s.summary,
    s.visibility,
    s.sort_order,
    s.updated_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'label', n.label,
          'color', n.color,
          'sortOrder', n.sort_order,
          'layout', case
            when n.layout_x is not null and n.layout_y is not null then jsonb_build_object('x', n.layout_x, 'y', n.layout_y)
            else null
          end,
          'linkedTechniqueTitles', coalesce((
            select jsonb_agg(snt.technique_title_snapshot order by snt.created_at)
            from public.system_node_techniques snt
            where snt.node_id = n.id
              and nullif(trim(coalesce(snt.technique_title_snapshot, '')), '') is not null
          ), '[]'::jsonb)
        )
        order by n.sort_order asc, n.created_at asc
      )
      from public.system_nodes n
      where n.system_id = s.id
    ), '[]'::jsonb) as nodes,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'from', e.from_node_id,
          'to', e.to_node_id,
          'label', e.label
        )
        order by e.created_at asc
      )
      from public.system_edges e
      where e.system_id = s.id
    ), '[]'::jsonb) as edges,
    case
      when auth.uid() is null then false
      else exists (
        select 1 from public.system_forks f
        where f.parent_system_id = s.id and f.forked_by = auth.uid()
      )
    end
  from visible_systems s
  order by s.updated_at desc, s.title asc
  limit 120;
$function$;

revoke all on function public.list_public_user_systems(uuid, text) from public;
grant execute on function public.list_public_user_systems(uuid, text) to authenticated;

drop function if exists public.list_public_user_techniques(uuid, text);
create or replace function public.list_public_user_techniques(
  p_profile_id uuid,
  p_branch text default null
)
returns table (
  id text,
  branch text,
  title text,
  category text,
  description text,
  tutorial_title text,
  tutorial_thumbnail text,
  tags text[],
  links text[],
  media text[],
  linked_technique_ids text[],
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  viewer_has_forked boolean
)
language sql
stable
security definer
set search_path = public
as $function$
  with cleaned as (
    select public.normalize_martial_arts_branch(nullif(trim(lower(p_branch)), '')) as branch_id
  )
  select
    t.id,
    t.branch,
    t.title,
    t.category,
    t.description,
    t.tutorial_title,
    t.tutorial_thumbnail,
    coalesce(t.tags, '{}'::text[]),
    coalesce(t.links, '{}'::text[]),
    coalesce(t.media, '{}'::text[]),
    coalesce(t.linked_technique_ids, '{}'::text[]),
    t.created_by,
    t.created_at,
    t.updated_at,
    case
      when auth.uid() is null then false
      else exists (
        select 1 from public.user_techniques ut
        where ut.catalog_technique_id = t.id and ut.user_id = auth.uid()
      )
    end
  from public.techniques t
  cross join cleaned c
  where t.created_by = p_profile_id
    and coalesce((select p.privacy from public.profiles p where p.id = p_profile_id), 'public') = 'public'
    and (c.branch_id is null or t.branch = c.branch_id)
  order by t.updated_at desc, t.title asc
  limit 120;
$function$;

