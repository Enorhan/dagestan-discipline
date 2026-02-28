-- Enable Supabase Realtime for all application tables in the public schema.
-- Note: This increases replication workload. Prefer scoping to only the tables you actually subscribe to.

do $$
declare
  r record;
begin
  -- Ensure the publication exists (Supabase usually creates this).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- Add all public tables (excluding common internal tables) to the realtime publication.
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
      and tablename not like 'sql_%'
  loop
    begin
      execute format('alter publication supabase_realtime add table %I.%I', r.schemaname, r.tablename);
    exception
      when duplicate_object then
        null;
      when others then
        -- Best effort: some tables may be excluded or unsupported; continue.
        null;
    end;
  end loop;
end $$;

