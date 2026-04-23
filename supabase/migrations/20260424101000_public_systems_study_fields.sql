-- Branch 7B: expose study fields through the public-profile RPC so viewers
-- studying someone else's system see the same enrichment as the owner.

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
          ), '[]'::jsonb),
          'details', nullif(trim(coalesce(n.details, '')), ''),
          'trigger', nullif(trim(coalesce(n.trigger, '')), ''),
          'commonMistake', nullif(trim(coalesce(n.common_mistake, '')), ''),
          'videoUrl', nullif(trim(coalesce(n.video_url, '')), ''),
          'videoTimestampSeconds', n.video_timestamp_seconds
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

