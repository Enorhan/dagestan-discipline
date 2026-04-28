-- Server-backed graph drafts. Drafts are owner-only, always private, and
-- excluded from public graph discovery/profile/comment/fork surfaces.

alter table public.systems
  add column if not exists status text not null default 'active';

update public.systems
set status = 'active'
where status is null or status not in ('draft', 'active');

do $$
begin
  alter table public.systems
    add constraint systems_status_check check (status in ('draft', 'active'));
exception
  when duplicate_object then null;
end $$;

create index if not exists systems_owner_status_branch_idx
  on public.systems (user_id, status, branch, updated_at desc)
  where user_id is not null;

drop policy if exists bjj_systems_select on public.systems;
create policy bjj_systems_select on public.systems
  for select using (
    user_id is null
    or user_id = auth.uid()
    or (visibility = 'public' and coalesce(status, 'active') = 'active')
  );

drop policy if exists bjj_system_nodes_select on public.system_nodes;
create policy bjj_system_nodes_select on public.system_nodes
  for select using (
    exists (
      select 1
      from public.systems s
      where s.id = system_nodes.system_id
        and (
          s.user_id is null
          or s.user_id = auth.uid()
          or (s.visibility = 'public' and coalesce(s.status, 'active') = 'active')
        )
    )
  );

drop policy if exists bjj_system_edges_select on public.system_edges;
create policy bjj_system_edges_select on public.system_edges
  for select using (
    exists (
      select 1
      from public.systems s
      where s.id = system_edges.system_id
        and (
          s.user_id is null
          or s.user_id = auth.uid()
          or (s.visibility = 'public' and coalesce(s.status, 'active') = 'active')
        )
    )
  );

drop policy if exists bjj_system_node_techniques_select on public.system_node_techniques;
create policy bjj_system_node_techniques_select on public.system_node_techniques
  for select using (
    exists (
      select 1
      from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id is not null
        and (
          s.user_id = auth.uid()
          or (
            auth.uid() is not null
            and s.visibility = 'public'
            and coalesce(s.status, 'active') = 'active'
          )
        )
    )
  );

create or replace function public.save_user_system_graph(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_updated_at timestamptz;
  v_status text := lower(coalesce(nullif(trim(p_input->>'status'), ''), 'active'));
  v_visibility text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if v_status not in ('draft', 'active') then
    v_status := 'active';
  end if;

  v_visibility := case
    when v_status = 'draft' then 'private'
    else coalesce(p_input->>'visibility', 'private')
  end;

  v_id := nullif(trim(coalesce(p_input->>'id', '')), '');
  if v_id is null then
    v_id := 'user-system-' || gen_random_uuid()::text;
  end if;

  v_updated_at := public.save_user_system(
    v_id,
    p_input->>'title',
    coalesce(p_input->>'summary', ''),
    v_visibility,
    coalesce(p_input->>'branch', 'bjj'),
    coalesce(nullif(p_input->>'sortOrder', '')::integer, 5000),
    nullif(p_input->>'expectedUpdatedAt', '')::timestamptz,
    coalesce(p_input->'nodes', '[]'::jsonb),
    coalesce(p_input->'edges', '[]'::jsonb)
  );

  update public.systems
  set
    status = v_status,
    visibility = case when v_status = 'draft' then 'private' else visibility end,
    updated_at = v_updated_at
  where id = v_id
    and user_id = auth.uid();

  return jsonb_build_object('id', v_id, 'updatedAt', v_updated_at, 'status', v_status);
end;
$$;

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
      and coalesce(s.status, 'active') = 'active'
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
      select jsonb_agg(jsonb_build_object('from', e.from_node_id, 'to', e.to_node_id, 'label', e.label) order by e.created_at asc)
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

create or replace function public.list_public_systems_by_branch(
  p_branch text default null,
  p_limit integer default 24,
  p_cursor timestamptz default null
) returns table (
  system_id text,
  owner_id uuid,
  owner_display_name text,
  owner_handle text,
  title text,
  summary text,
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
    select s.*
    from public.systems s, cleaned c
    where s.visibility = 'public'
      and coalesce(s.status, 'active') = 'active'
      and s.user_id is not null
      and (auth.uid() is null or s.user_id <> auth.uid())
      and (c.branch_id is null or coalesce(s.branch, 'bjj') = c.branch_id)
      and (p_cursor is null or s.updated_at < p_cursor)
      and coalesce((select p.privacy from public.profiles p where p.id = s.user_id), 'public') = 'public'
      and (auth.uid() is null or not public.community_is_blocked(auth.uid(), s.user_id))
  )
  select
    b.id,
    b.user_id,
    public._profile_display_label(b.user_id),
    (select p.username from public.profiles p where p.id = b.user_id),
    b.title,
    b.summary,
    coalesce(b.branch, 'bjj'),
    b.updated_at,
    coalesce((select count(*)::bigint from public.system_forks f where f.parent_system_id = b.id), 0),
    case
      when auth.uid() is null then false
      else exists (
        select 1 from public.system_forks f
        where f.parent_system_id = b.id and f.forked_by = auth.uid()
      )
    end
  from base b
  order by b.updated_at desc
  limit least(coalesce(p_limit, 24), 60);
$function$;

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
  if coalesce(v_parent.status, 'active') <> 'active' then
    raise exception 'parent system is not active' using errcode = '42501';
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

  insert into public.systems (id, title, summary, locked, sort_order, user_id, visibility, branch, status)
  values (v_new_id, v_parent.title || ' (fork)', v_parent.summary, false, 0, v_owner, 'private', coalesce(v_parent.branch, 'bjj'), 'active');

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

drop policy if exists target_comments_select on public.comments;
create policy target_comments_select on public.comments
  for select to authenticated
  using (
    target_type in ('system', 'technique')
    and (
      (
        target_type = 'system'
        and exists (
          select 1 from public.systems s
          where s.id = comments.target_id
            and s.visibility = 'public'
            and coalesce(s.status, 'active') = 'active'
            and (auth.uid() is null or s.user_id is null or not public.community_is_blocked(auth.uid(), s.user_id))
        )
      )
      or (
        target_type = 'technique'
        and exists (
          select 1 from public.techniques t
          where t.id = comments.target_id
            and t.created_by is not null
            and coalesce((select p.privacy from public.profiles p where p.id = t.created_by), 'public') = 'public'
            and (auth.uid() is null or not public.community_is_blocked(auth.uid(), t.created_by))
        )
      )
    )
  );

drop policy if exists target_comments_insert on public.comments;
create policy target_comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and target_type in ('system', 'technique')
    and (
      (
        target_type = 'system'
        and exists (
          select 1 from public.systems s
          where s.id = comments.target_id
            and s.visibility = 'public'
            and coalesce(s.status, 'active') = 'active'
            and (s.user_id is null or not public.community_is_blocked(auth.uid(), s.user_id))
        )
      )
      or (
        target_type = 'technique'
        and exists (
          select 1 from public.techniques t
          where t.id = comments.target_id
            and t.created_by is not null
            and coalesce((select p.privacy from public.profiles p where p.id = t.created_by), 'public') = 'public'
            and not public.community_is_blocked(auth.uid(), t.created_by)
        )
      )
    )
  );

create or replace function public.post_target_comment(
  p_target_type text,
  p_target_id text,
  p_body text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_new_id uuid;
  v_owner uuid;
  v_kind text;
  v_title text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_body = '' or char_length(v_body) > 1000 then
    raise exception 'comment body must be 1-1000 chars' using errcode = '22023';
  end if;
  if p_target_type not in ('system', 'technique') then
    raise exception 'unsupported target_type %', p_target_type using errcode = '22023';
  end if;

  if p_target_type = 'system' then
    select s.user_id into v_owner
    from public.systems s
    where s.id = p_target_id
      and s.visibility = 'public'
      and coalesce(s.status, 'active') = 'active';
    if not found or v_owner is null then
      raise exception 'system not found or not public' using errcode = 'P0002';
    end if;
    if public.community_is_blocked(v_user, v_owner) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  else
    select t.created_by into v_owner
    from public.techniques t
    where t.id = p_target_id and t.created_by is not null;
    if not found or v_owner is null then
      raise exception 'technique not found' using errcode = 'P0002';
    end if;
    if coalesce((select p.privacy from public.profiles p where p.id = v_owner), 'public') <> 'public' then
      raise exception 'technique owner is not public' using errcode = '42501';
    end if;
    if public.community_is_blocked(v_user, v_owner) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;

  insert into public.comments (user_id, target_type, target_id, body, parent_comment_id)
  values (v_user, p_target_type, p_target_id, v_body, p_parent_comment_id)
  returning id into v_new_id;

  if v_owner <> v_user then
    v_kind := case p_target_type when 'system' then 'system_comment' else 'technique_comment' end;
    v_title := case p_target_type when 'system' then 'New comment on your graph' else 'New comment on your technique' end;
    begin
      insert into public.notifications (user_id, kind, title, body, metadata)
      values (
        v_owner,
        v_kind,
        v_title,
        left(v_body, 140),
        jsonb_build_object('target_type', p_target_type, 'target_id', p_target_id, 'actor_id', v_user, 'comment_id', v_new_id)
      );
    exception when others then
      null;
    end;
  end if;

  return v_new_id;
end;
$$;

revoke all on function public.save_user_system_graph(jsonb) from public;
grant execute on function public.save_user_system_graph(jsonb) to authenticated;
revoke all on function public.list_public_user_systems(uuid, text) from public;
grant execute on function public.list_public_user_systems(uuid, text) to authenticated;
revoke all on function public.list_public_systems_by_branch(text, integer, timestamptz) from public;
grant execute on function public.list_public_systems_by_branch(text, integer, timestamptz) to authenticated;
revoke all on function public.fork_system(text) from public;
grant execute on function public.fork_system(text) to authenticated;
revoke all on function public.post_target_comment(text, text, text, uuid) from public;
grant execute on function public.post_target_comment(text, text, text, uuid) to authenticated;
