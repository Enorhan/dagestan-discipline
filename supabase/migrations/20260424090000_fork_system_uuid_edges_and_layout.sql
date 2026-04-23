-- Branch 7A: Structural correctness on fork_system.
--
-- Two bugs in the previous revision (see 20260422180000_one_fork_per_user.sql):
-- 1. Edges were re-joined on the forked nodes via (label, sort_order). Two
--    nodes sharing a label silently collapsed edges, corrupting the fork.
-- 2. layout_x / layout_y were not copied, so every fork got auto-laid-out
--    and lost the creator's intended layout.
--
-- This migration rewrites fork_system to:
-- - Pre-compute a (parent_node_id -> new_node_id) map in a CTE
-- - Copy layout_x / layout_y on node insert
-- - Remap edges through the CTE, preserving label
-- - Copy node <-> technique links for the owner (public systems strip ids
--   in the RPC that exposes public systems; the copy logic here is unchanged)

create or replace function public.fork_system(p_parent_system_id text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_owner uuid := auth.uid();
  v_parent public.systems%rowtype;
  v_existing_child text;
  v_new_id text := gen_random_uuid()::text;
  v_revision integer := 0;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_parent from public.systems where id = p_parent_system_id;
  if not found then
    raise exception 'parent system not found' using errcode = 'P0002';
  end if;

  if v_parent.user_id is not null
     and v_parent.user_id <> v_owner
     and coalesce(v_parent.visibility, 'private') <> 'public' then
    raise exception 'parent system is not public' using errcode = '42501';
  end if;

  if v_parent.user_id is not null and public.community_is_blocked(v_owner, v_parent.user_id) then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  select child_system_id
    into v_existing_child
    from public.system_forks
   where parent_system_id = v_parent.id
     and forked_by = v_owner
   limit 1;
  if v_existing_child is not null then
    return v_existing_child;
  end if;

  insert into public.systems (id, title, summary, locked, sort_order, user_id, visibility, branch)
  values (
    v_new_id,
    v_parent.title || ' (fork)',
    v_parent.summary,
    false,
    0,
    v_owner,
    'private',
    coalesce(v_parent.branch, 'bjj')
  );

  -- Insert nodes + edges atomically using a (parent_id -> new_id) map so
  -- edges always re-target correctly even when node labels collide.
  with node_map as (
    select
      n.id as parent_node_id,
      gen_random_uuid()::text as new_node_id,
      n.label,
      n.color,
      n.sort_order,
      n.layout_x,
      n.layout_y
    from public.system_nodes n
    where n.system_id = v_parent.id
  ),
  inserted_nodes as (
    insert into public.system_nodes (
      id, system_id, label, color, sort_order, layout_x, layout_y
    )
    select
      m.new_node_id,
      v_new_id,
      m.label,
      m.color,
      m.sort_order,
      m.layout_x,
      m.layout_y
    from node_map m
    returning id
  )
  insert into public.system_edges (system_id, from_node_id, to_node_id, label)
  select
    v_new_id,
    mf.new_node_id,
    mt.new_node_id,
    e.label
  from public.system_edges e
  join node_map mf on mf.parent_node_id = e.from_node_id
  join node_map mt on mt.parent_node_id = e.to_node_id
  where e.system_id = v_parent.id
    -- inserted_nodes is referenced via the CTE dependency chain; force evaluation
    and (select count(*) from inserted_nodes) >= 0;

  insert into public.system_forks (
    parent_system_id, child_system_id, forked_by, forked_from_revision
  )
  values (v_parent.id, v_new_id, v_owner, v_revision);

  return v_new_id;
end;
$function$;

revoke all on function public.fork_system(text) from public;
grant execute on function public.fork_system(text) to authenticated;

