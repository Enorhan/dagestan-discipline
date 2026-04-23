-- Branch 7B: teach save_user_system and fork_system about the new study fields.
--
-- save_user_system unpacks details/trigger/commonMistake/videoUrl/videoTimestampSeconds
-- from each node JSON and persists them. Existing validation unchanged.
-- fork_system carries these fields onto forked nodes alongside layout.

create or replace function public.save_user_system(
  p_system_id text,
  p_title text,
  p_summary text,
  p_visibility text,
  p_branch text,
  p_sort_order integer,
  p_expected_updated_at timestamptz,
  p_nodes jsonb,
  p_edges jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_id text;
  v_sort int;
  v_now timestamptz := now();
  v_owner uuid;
  v_updated timestamptz;
  v_sys_found boolean;
  node_count int;
  edge_count int;
  tech_per_node int;
  rec record;
  v_title text := trim(coalesce(p_title, ''));
  v_summary text := trim(coalesce(p_summary, ''));
  v_vis text := trim(lower(coalesce(p_visibility, 'private')));
  v_branch text := coalesce(nullif(trim(p_branch), ''), 'bjj');
  seen_edge text[];
  edge_key text;
  from_id text;
  to_id text;
  nid text;
  tech_id text;
  snap text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if v_title = '' then
    raise exception 'system_title_required';
  end if;
  if v_vis not in ('public', 'private') then
    raise exception 'invalid_visibility';
  end if;
  if v_branch not in ('bjj', 'grappling', 'boxing', 'wrestling', 'mma', 'muay-thai', 'judo', 'taekwondo') then
    raise exception 'invalid_branch';
  end if;

  v_sort := coalesce(p_sort_order, 5000);

  if p_system_id is null or trim(p_system_id) = '' then
    v_id := 'user-system-' || gen_random_uuid()::text;
  else
    v_id := trim(p_system_id);
  end if;

  select s.user_id, s.updated_at into v_owner, v_updated
  from public.systems s where s.id = v_id for update;
  v_sys_found := found;

  if v_sys_found then
    if v_owner is distinct from uid then
      raise exception 'forbidden_system';
    end if;
    if p_expected_updated_at is not null and v_updated is not null
      and date_trunc('milliseconds', v_updated) is distinct from date_trunc('milliseconds', p_expected_updated_at)
    then
      raise exception 'concurrent_save' using errcode = 'P0001';
    end if;
  end if;

  node_count := coalesce(jsonb_array_length(p_nodes), 0);
  if node_count = 0 then raise exception 'system_requires_nodes'; end if;
  if node_count > 24 then raise exception 'system_too_many_nodes'; end if;

  select count(*) into edge_count from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e;
  if edge_count > 48 then raise exception 'system_too_many_edges'; end if;

  for rec in select * from jsonb_array_elements(p_nodes) with ordinality as t(elem, ord) loop
    nid := trim(coalesce(rec.elem->>'id', ''));
    if nid = '' then raise exception 'node_id_required'; end if;
    tech_per_node := 0;
    for tech_id in
      select trim(t.x) from jsonb_array_elements_text(coalesce(rec.elem->'linkedTechniqueIds', '[]'::jsonb)) as t(x)
    loop
      tech_per_node := tech_per_node + 1;
      if tech_per_node > 16 then raise exception 'too_many_techniques_per_node'; end if;
      if tech_id = '' then continue; end if;
      if not exists (
        select 1 from public.user_techniques ut
        where ut.id = tech_id and ut.user_id = uid and ut.branch = v_branch
      ) then
        raise exception 'technique_not_in_library_for_branch';
      end if;
    end loop;
  end loop;

  seen_edge := array[]::text[];
  for rec in select * from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e(elem) loop
    from_id := trim(coalesce(rec.elem->>'from', ''));
    to_id := trim(coalesce(rec.elem->>'to', ''));
    if from_id = '' or to_id = '' then raise exception 'edge_endpoints_required'; end if;
    if from_id = to_id then raise exception 'edge_self_loop'; end if;
    edge_key := from_id || '->' || to_id;
    if edge_key = any(seen_edge) then continue; end if;
    seen_edge := array_append(seen_edge, edge_key);
    if not exists (
      select 1 from jsonb_array_elements(p_nodes) as n(elem)
      where trim(coalesce(n.elem->>'id', '')) = from_id
    ) or not exists (
      select 1 from jsonb_array_elements(p_nodes) as n(elem)
      where trim(coalesce(n.elem->>'id', '')) = to_id
    ) then
      raise exception 'edge_unknown_node';
    end if;
  end loop;

  if v_sys_found then
    update public.systems
    set title = v_title, summary = v_summary, sort_order = v_sort,
        visibility = v_vis, branch = v_branch, locked = false, updated_at = v_now
    where id = v_id and user_id = uid;
  else
    insert into public.systems (id, title, summary, locked, sort_order, user_id, visibility, branch, created_at, updated_at)
    values (v_id, v_title, v_summary, false, v_sort, uid, v_vis, v_branch, v_now, v_now);
  end if;

  delete from public.system_edges where system_id = v_id;
  delete from public.system_node_techniques where system_id = v_id;
  delete from public.system_nodes where system_id = v_id;



  insert into public.system_nodes (
    id, system_id, label, color, sort_order,
    layout_x, layout_y,
    details, trigger, common_mistake, video_url, video_timestamp_seconds,
    created_at
  )
  select
    trim(coalesce(n.elem->>'id', '')),
    v_id,
    left(trim(coalesce(n.elem->>'label', 'Step')), 500),
    left(trim(coalesce(n.elem->>'color', '#888')), 64),
    coalesce((n.elem->>'sortOrder')::int, (n.ord - 1)::int),
    case
      when n.elem ? 'layout'
        and (n.elem->'layout'->>'x') is not null
        and (n.elem->'layout'->>'y') is not null
        and (n.elem->'layout'->>'x')::double precision between 0 and 1
        and (n.elem->'layout'->>'y')::double precision between 0 and 1
      then (n.elem->'layout'->>'x')::double precision
      else null
    end,
    case
      when n.elem ? 'layout'
        and (n.elem->'layout'->>'x') is not null
        and (n.elem->'layout'->>'y') is not null
        and (n.elem->'layout'->>'x')::double precision between 0 and 1
        and (n.elem->'layout'->>'y')::double precision between 0 and 1
      then (n.elem->'layout'->>'y')::double precision
      else null
    end,
    left(nullif(trim(coalesce(n.elem->>'details', '')), ''), 2000),
    left(nullif(trim(coalesce(n.elem->>'trigger', '')), ''), 300),
    left(nullif(trim(coalesce(n.elem->>'commonMistake', '')), ''), 500),
    left(nullif(trim(coalesce(n.elem->>'videoUrl', '')), ''), 512),
    case
      when n.elem ? 'videoTimestampSeconds'
        and (n.elem->>'videoTimestampSeconds') ~ '^[0-9]+$'
        and (n.elem->>'videoTimestampSeconds')::int between 0 and 100000
      then (n.elem->>'videoTimestampSeconds')::int
      else null
    end,
    v_now
  from jsonb_array_elements(p_nodes) with ordinality as n(elem, ord);

  insert into public.system_edges (id, system_id, from_node_id, to_node_id, label, created_at)
  select gen_random_uuid()::text, v_id, fe.from_id, fe.to_id, fe.lbl, v_now
  from (
    select distinct on (bx.from_id, bx.to_id) bx.from_id, bx.to_id, bx.lbl
    from (
      select trim(coalesce(e.elem->>'from', '')) as from_id,
             trim(coalesce(e.elem->>'to', '')) as to_id,
             left(nullif(trim(coalesce(e.elem->>'label', '')), ''), 200) as lbl
      from jsonb_array_elements(coalesce(p_edges, '[]'::jsonb)) as e(elem)
    ) bx
    where bx.from_id <> '' and bx.to_id <> '' and bx.from_id is distinct from bx.to_id
    order by bx.from_id, bx.to_id, bx.lbl nulls last
  ) fe;

  for rec in select * from jsonb_array_elements(p_nodes) as n(elem) loop
    nid := trim(coalesce(rec.elem->>'id', ''));
    for tech_id in
      select distinct trim(t.x) from jsonb_array_elements_text(coalesce(rec.elem->'linkedTechniqueIds', '[]'::jsonb)) as t(x)
      where trim(t.x) <> ''
    loop
      select left(coalesce(ut.title, 'Technique'), 200) into snap
      from public.user_techniques ut where ut.id = tech_id and ut.user_id = uid;
      insert into public.system_node_techniques (id, system_id, node_id, technique_id, technique_title_snapshot, created_at)
      values (gen_random_uuid()::text, v_id, nid, tech_id, snap, v_now);
    end loop;
  end loop;

  return v_now;
end;
$$;

-- fork_system carries the new study fields onto forked nodes.
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
  if v_parent.user_id is not null and v_parent.user_id <> v_owner
     and coalesce(v_parent.visibility, 'private') <> 'public' then
    raise exception 'parent system is not public' using errcode = '42501';
  end if;
  if v_parent.user_id is not null and public.community_is_blocked(v_owner, v_parent.user_id) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  select child_system_id into v_existing_child
  from public.system_forks
  where parent_system_id = v_parent.id and forked_by = v_owner limit 1;
  if v_existing_child is not null then
    return v_existing_child;
  end if;

  insert into public.systems (id, title, summary, locked, sort_order, user_id, visibility, branch)
  values (v_new_id, v_parent.title || ' (fork)', v_parent.summary, false, 0, v_owner, 'private', coalesce(v_parent.branch, 'bjj'));

  with node_map as (
    select n.id as parent_node_id, gen_random_uuid()::text as new_node_id,
           n.label, n.color, n.sort_order, n.layout_x, n.layout_y,
           n.details, n.trigger, n.common_mistake, n.video_url, n.video_timestamp_seconds
    from public.system_nodes n where n.system_id = v_parent.id
  ),
  inserted_nodes as (
    insert into public.system_nodes (
      id, system_id, label, color, sort_order, layout_x, layout_y,
      details, trigger, common_mistake, video_url, video_timestamp_seconds
    )
    select m.new_node_id, v_new_id, m.label, m.color, m.sort_order, m.layout_x, m.layout_y,
           m.details, m.trigger, m.common_mistake, m.video_url, m.video_timestamp_seconds
    from node_map m returning id
  )
  insert into public.system_edges (system_id, from_node_id, to_node_id, label)
  select v_new_id, mf.new_node_id, mt.new_node_id, e.label
  from public.system_edges e
  join node_map mf on mf.parent_node_id = e.from_node_id
  join node_map mt on mt.parent_node_id = e.to_node_id
  where e.system_id = v_parent.id
    and (select count(*) from inserted_nodes) >= 0;

  insert into public.system_forks (parent_system_id, child_system_id, forked_by, forked_from_revision)
  values (v_parent.id, v_new_id, v_owner, v_revision);
  return v_new_id;
end;
$function$;

revoke all on function public.save_user_system(text, text, text, text, text, integer, timestamptz, jsonb, jsonb) from public;
grant execute on function public.save_user_system(text, text, text, text, text, integer, timestamptz, jsonb, jsonb) to authenticated;
revoke all on function public.fork_system(text) from public;
grant execute on function public.fork_system(text) to authenticated;
