-- Graph layout (normalized 0–1) on nodes; link library techniques to steps (owner-only visibility via RLS).

alter table public.system_nodes
  add column if not exists layout_x double precision,
  add column if not exists layout_y double precision;

create table if not exists public.system_node_techniques (
  id text primary key default gen_random_uuid()::text,
  system_id text not null references public.systems(id) on delete cascade,
  node_id text not null references public.system_nodes(id) on delete cascade,
  technique_id text not null,
  created_at timestamptz not null default now(),
  unique (node_id, technique_id)
);

create index if not exists system_node_techniques_system_idx
  on public.system_node_techniques (system_id);

create index if not exists system_node_techniques_node_idx
  on public.system_node_techniques (node_id);

alter table public.system_node_techniques enable row level security;

drop policy if exists bjj_system_node_techniques_select on public.system_node_techniques;
create policy bjj_system_node_techniques_select on public.system_node_techniques
  for select using (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id is not null
        and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_node_techniques_insert on public.system_node_techniques;
create policy bjj_system_node_techniques_insert on public.system_node_techniques
  for insert with check (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_node_techniques_update on public.system_node_techniques;
create policy bjj_system_node_techniques_update on public.system_node_techniques
  for update using (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists bjj_system_node_techniques_delete on public.system_node_techniques;
create policy bjj_system_node_techniques_delete on public.system_node_techniques
  for delete using (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and s.user_id = auth.uid()
    )
  );
