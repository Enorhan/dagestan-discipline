-- supabase_realtime currently publishes public.profiles but nothing in the
-- client subscribes. Remove it so every profile UPDATE stops broadcasting
-- over the realtime bus. Re-add selectively via a later migration if/when a
-- subscriber is introduced.

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime drop table public.profiles;
  end if;
end $$;

