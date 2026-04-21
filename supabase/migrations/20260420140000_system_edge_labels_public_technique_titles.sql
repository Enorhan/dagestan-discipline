-- Optional labels on transitions; denormalized technique titles for public system viewers.

alter table public.system_edges
  add column if not exists label text;

alter table public.system_node_techniques
  add column if not exists technique_title_snapshot text;

comment on column public.system_edges.label is 'Optional short note on the transition (e.g. if they posture)';
comment on column public.system_node_techniques.technique_title_snapshot is 'Title shown to viewers of public systems (library title at publish time)';

-- Allow any signed-in user to read link rows for *public* user-owned systems (titles only; client strips ids for non-owners).
drop policy if exists bjj_system_node_techniques_select on public.system_node_techniques;
create policy bjj_system_node_techniques_select on public.system_node_techniques
  for select using (
    exists (
      select 1 from public.systems s
      where s.id = system_node_techniques.system_id
        and (
          s.user_id = auth.uid()
          or (
            auth.uid() is not null
            and s.user_id is not null
            and s.visibility = 'public'
          )
        )
    )
  );
