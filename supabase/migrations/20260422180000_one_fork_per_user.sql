-- Deduplicate system_forks: keep the oldest row per (parent_system_id, forked_by).
-- Cascade FK on child_system_id from systems will clean orphans if we delete the child,
-- but here we only delete extra fork pointer rows; the child systems stay owned by the user.
with ranked as (
  select id,
         row_number() over (
           partition by parent_system_id, forked_by
           order by created_at asc, id asc
         ) as rn
  from public.system_forks
)
delete from public.system_forks f
using ranked r
where f.id = r.id and r.rn > 1;

alter table public.system_forks
  drop constraint if exists system_forks_parent_forked_by_key;

alter table public.system_forks
  add constraint system_forks_parent_forked_by_key
  unique (parent_system_id, forked_by);

-- fork_system: return the existing child system if the caller already forked this parent.
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
  if v_parent.user_id is not null and v_parent.user_id <> v_owner and coalesce(v_parent.visibility, 'private') <> 'public' then
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
  insert into public.system_nodes (id, system_id, label, color, sort_order)
  select gen_random_uuid()::text, v_new_id, n.label, n.color, n.sort_order
    from public.system_nodes n
   where n.system_id = v_parent.id;
  insert into public.system_edges (system_id, from_node_id, to_node_id)
  select v_new_id, nf.id, nt.id
    from public.system_edges e
    join public.system_nodes pnf on pnf.id = e.from_node_id
    join public.system_nodes pnt on pnt.id = e.to_node_id
    join public.system_nodes nf on nf.system_id = v_new_id and nf.label = pnf.label and nf.sort_order = pnf.sort_order
    join public.system_nodes nt on nt.system_id = v_new_id and nt.label = pnt.label and nt.sort_order = pnt.sort_order
   where e.system_id = v_parent.id;
  insert into public.system_forks (parent_system_id, child_system_id, forked_by, forked_from_revision)
  values (v_parent.id, v_new_id, v_owner, v_revision);
  return v_new_id;
end;
$function$;

-- Surface viewer_has_forked to the Discover feed.
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
      and s.user_id is not null
      and (auth.uid() is null or s.user_id <> auth.uid())
      and (c.branch_id is null or coalesce(s.branch, 'bjj') = c.branch_id)
      and (p_cursor is null or s.updated_at < p_cursor)
      and coalesce(
        (select p.privacy from public.profiles p where p.id = s.user_id),
        'public'
      ) = 'public'
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

