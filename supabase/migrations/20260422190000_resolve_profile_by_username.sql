-- Resolve a public profile id from a handle, honoring privacy and blocks.
-- Returns null when the profile is private, blocked, or not found.
create or replace function public.resolve_public_profile_by_username(p_username text)
returns uuid
language sql
stable security definer
set search_path = public
as $function$
  with cleaned as (
    select nullif(trim(lower(p_username)), '') as handle
  )
  select p.id
  from public.profiles p, cleaned c
  where c.handle is not null
    and lower(p.username) = c.handle
    and coalesce(p.privacy, 'public') = 'public'
    and (auth.uid() is null or not public.community_is_blocked(auth.uid(), p.id))
    and (auth.uid() is null or not public.community_is_blocked(p.id, auth.uid()))
  limit 1;
$function$;

revoke all on function public.resolve_public_profile_by_username(text) from public;
grant execute on function public.resolve_public_profile_by_username(text) to authenticated, anon;

