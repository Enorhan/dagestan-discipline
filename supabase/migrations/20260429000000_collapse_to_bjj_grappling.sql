-- Collapse martial arts scope to BJJ + Grappling only.
-- 1) Hard-delete non-bjj/grappling discover techniques (catalog_technique_id FK is ON DELETE SET NULL).
-- 2) Coerce stragglers in user_techniques / training_sessions / systems / drill_challenges to 'grappling'.
-- 3) Coerce profiles.primary_discipline values that are no longer accepted.
-- 4) Tighten branch check constraints.
-- 5) Rewrite normalize_martial_arts_branch to the 2-id whitelist.

delete from public.techniques
where branch not in ('bjj', 'grappling');

update public.user_techniques
set branch = 'grappling'
where branch not in ('bjj', 'grappling');

update public.training_sessions
set branch = 'grappling'
where branch not in ('bjj', 'grappling');

update public.systems
set branch = 'grappling'
where branch not in ('bjj', 'grappling');

update public.drill_challenges
set branch = 'grappling'
where branch not in ('bjj', 'grappling');

update public.profiles
set primary_discipline = 'BJJ'
where primary_discipline is not null
  and lower(coalesce(primary_discipline, '')) not in (
    'bjj', 'jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu',
    'grappling', 'submission grappling', 'no-gi grappling', 'nogi grappling'
  );

alter table public.techniques
  drop constraint if exists techniques_branch_check;
alter table public.techniques
  add constraint techniques_branch_check
  check (branch in ('bjj', 'grappling'));

alter table public.user_techniques
  drop constraint if exists user_techniques_branch_check;
alter table public.user_techniques
  add constraint user_techniques_branch_check
  check (branch in ('bjj', 'grappling'));

alter table public.training_sessions
  drop constraint if exists training_sessions_branch_check;
alter table public.training_sessions
  add constraint training_sessions_branch_check
  check (branch in ('bjj', 'grappling'));

alter table public.systems
  drop constraint if exists systems_branch_check;
alter table public.systems
  add constraint systems_branch_check
  check (branch in ('bjj', 'grappling'));

alter table public.drill_challenges
  drop constraint if exists drill_challenges_branch_check;
alter table public.drill_challenges
  add constraint drill_challenges_branch_check
  check (branch in ('bjj', 'grappling'));

create or replace function public.normalize_martial_arts_branch(p_raw text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select nullif(trim(lower(coalesce(p_raw, ''))), '') as raw
  )
  select case
    when raw in ('bjj', 'grappling') then raw
    when raw in ('jiu jitsu', 'jiu-jitsu', 'brazilian jiu jitsu', 'brazilian jiu-jitsu') then 'bjj'
    when raw in ('submission grappling', 'no-gi grappling', 'nogi grappling') then 'grappling'
    else null
  end
  from cleaned;
$$;

