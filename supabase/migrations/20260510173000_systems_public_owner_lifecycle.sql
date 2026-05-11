-- Simplified MatFlow systems:
-- - no private/public user choice; saved systems are active and public
-- - only the creator can edit/delete while their account exists
-- - account deletion preserves created systems by clearing user_id

alter table public.systems
  alter column user_id drop not null;

do $$
declare
  fk_name text;
begin
  select c.conname
  into fk_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'systems'
    and c.contype = 'f'
    and c.conkey = array[
      (
        select a.attnum
        from pg_attribute a
        where a.attrelid = t.oid
          and a.attname = 'user_id'
      )
    ]::smallint[]
  limit 1;

  if fk_name is not null then
    execute format('alter table public.systems drop constraint %I', fk_name);
  end if;

  alter table public.systems
    add constraint systems_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
end $$;

update public.systems
set visibility = 'public',
    status = 'active'
where user_id is not null;

drop policy if exists bjj_systems_select on public.systems;
create policy bjj_systems_select on public.systems
  for select to authenticated
  using (
    user_id is null
    or user_id = auth.uid()
    or coalesce(status, 'active') = 'active'
  );

drop policy if exists bjj_systems_insert on public.systems;
create policy bjj_systems_insert on public.systems
  for insert to authenticated
  with check (user_id = auth.uid() and visibility = 'public' and coalesce(status, 'active') = 'active');

drop policy if exists bjj_systems_update on public.systems;
create policy bjj_systems_update on public.systems
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and visibility = 'public' and coalesce(status, 'active') = 'active');

drop policy if exists bjj_systems_delete on public.systems;
create policy bjj_systems_delete on public.systems
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists bjj_system_nodes_select on public.system_nodes;
create policy bjj_system_nodes_select on public.system_nodes
  for select to authenticated
  using (
    exists (
      select 1
      from public.systems s
      where s.id = system_nodes.system_id
        and (
          s.user_id is null
          or s.user_id = auth.uid()
          or coalesce(s.status, 'active') = 'active'
        )
    )
  );

drop policy if exists bjj_system_edges_select on public.system_edges;
create policy bjj_system_edges_select on public.system_edges
  for select to authenticated
  using (
    exists (
      select 1
      from public.systems s
      where s.id = system_edges.system_id
        and (
          s.user_id is null
          or s.user_id = auth.uid()
          or coalesce(s.status, 'active') = 'active'
        )
    )
  );

drop policy if exists bjj_system_node_techniques_select on public.system_node_techniques;
create policy bjj_system_node_techniques_select on public.system_node_techniques
  for select to authenticated
  using (
    exists (
      select 1
      from public.systems s
      where s.id = system_node_techniques.system_id
        and (
          s.user_id is null
          or s.user_id = auth.uid()
          or coalesce(s.status, 'active') = 'active'
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_id := nullif(trim(coalesce(p_input->>'id', '')), '');
  if v_id is null then
    v_id := 'user-system-' || gen_random_uuid()::text;
  end if;

  v_updated_at := public.save_user_system(
    v_id,
    p_input->>'title',
    coalesce(p_input->>'summary', ''),
    'public',
    coalesce(p_input->>'branch', 'bjj'),
    coalesce(nullif(p_input->>'sortOrder', '')::integer, 5000),
    nullif(p_input->>'expectedUpdatedAt', '')::timestamptz,
    coalesce(p_input->'nodes', '[]'::jsonb),
    coalesce(p_input->'edges', '[]'::jsonb)
  );

  update public.systems
  set
    status = 'active',
    visibility = 'public',
    updated_at = v_updated_at
  where id = v_id
    and user_id = auth.uid();

  return jsonb_build_object('id', v_id, 'updatedAt', v_updated_at, 'status', 'active');
end;
$$;

revoke all on function public.save_user_system_graph(jsonb) from public;
grant execute on function public.save_user_system_graph(jsonb) to authenticated;
