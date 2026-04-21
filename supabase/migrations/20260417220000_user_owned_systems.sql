-- User-created systems with public/private visibility; catalog rows keep user_id null.

alter table public.systems
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.systems
  add column if not exists visibility text not null default 'private';

alter table public.systems
  drop constraint if exists systems_visibility_check;

alter table public.systems
  add constraint systems_visibility_check
  check (visibility in ('public', 'private'));

create index if not exists systems_user_id_idx on public.systems (user_id);

-- Tighten read access: catalog (no owner), your own, or others' public systems.
drop policy if exists bjj_systems_select on public.systems;
create policy bjj_systems_select on public.systems
  for select to authenticated
  using (
    user_id is null
    or user_id = auth.uid()
    or visibility = 'public'
  );

drop policy if exists bjj_systems_insert on public.systems;
create policy bjj_systems_insert on public.systems
  for insert to authenticated
  with check (user_id is not null and user_id = auth.uid());

drop policy if exists bjj_systems_update on public.systems;
create policy bjj_systems_update on public.systems
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists bjj_systems_delete on public.systems;
create policy bjj_systems_delete on public.systems
  for delete to authenticated
  using (user_id = auth.uid());

-- Nodes: visible when parent system is visible to reader.
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
          or s.visibility = 'public'
        )
    )
  );

drop policy if exists bjj_system_nodes_insert on public.system_nodes;
create policy bjj_system_nodes_insert on public.system_nodes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.systems s
      where s.id = system_nodes.system_id and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_nodes_update on public.system_nodes;
create policy bjj_system_nodes_update on public.system_nodes
  for update to authenticated
  using (
    exists (
      select 1 from public.systems s
      where s.id = system_nodes.system_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.systems s
      where s.id = system_nodes.system_id and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_nodes_delete on public.system_nodes;
create policy bjj_system_nodes_delete on public.system_nodes
  for delete to authenticated
  using (
    exists (
      select 1 from public.systems s
      where s.id = system_nodes.system_id and s.user_id = auth.uid()
    )
  );

-- Edges: same visibility as parent system.
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
          or s.visibility = 'public'
        )
    )
  );

drop policy if exists bjj_system_edges_insert on public.system_edges;
create policy bjj_system_edges_insert on public.system_edges
  for insert to authenticated
  with check (
    exists (
      select 1 from public.systems s
      where s.id = system_edges.system_id and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_edges_update on public.system_edges;
create policy bjj_system_edges_update on public.system_edges
  for update to authenticated
  using (
    exists (
      select 1 from public.systems s
      where s.id = system_edges.system_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.systems s
      where s.id = system_edges.system_id and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_edges_delete on public.system_edges;
create policy bjj_system_edges_delete on public.system_edges
  for delete to authenticated
  using (
    exists (
      select 1 from public.systems s
      where s.id = system_edges.system_id and s.user_id = auth.uid()
    )
  );
