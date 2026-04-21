-- Community Discover: allow authenticated users to create public techniques with RLS.

alter table public.techniques
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists techniques_created_by_idx on public.techniques (created_by);

-- Authenticated users can insert community techniques (must set created_by = auth.uid()).
drop policy if exists bjj_techniques_insert_community on public.techniques;
create policy bjj_techniques_insert_community on public.techniques
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- Authors can update their community techniques only.
drop policy if exists bjj_techniques_update_own on public.techniques;
create policy bjj_techniques_update_own on public.techniques
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Authors can delete their community techniques only.
drop policy if exists bjj_techniques_delete_own on public.techniques;
create policy bjj_techniques_delete_own on public.techniques
  for delete
  to authenticated
  using (created_by = auth.uid());

-- Public technique media uploads (same folder pattern as session-media).
insert into storage.buckets (id, name, public)
values ('technique-media', 'technique-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read technique media" on storage.objects;
create policy "Public read technique media"
  on storage.objects for select
  using (bucket_id = 'technique-media');

drop policy if exists "Authenticated upload technique media" on storage.objects;
create policy "Authenticated upload technique media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'technique-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated delete technique media" on storage.objects;
create policy "Authenticated delete technique media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'technique-media'
    and owner = auth.uid()
  );
