-- Phase 2 · Branch 3C: polymorphic comment targets.
-- Adds target_type + target_id to public.comments so the same thread model
-- can power social posts (existing), public systems, and public techniques.
-- Existing post-comment write/read paths stay unchanged: a BEFORE INSERT
-- trigger mirrors post_id onto the polymorphic pair so the current
-- social-interactions-service insert and comments_for_post RPC are untouched.
-- New non-post flows go through dedicated RPCs below.

begin;

-- -----------------------------------------------------------------------------
-- Schema: additive columns, backfill, relax post_id NOT NULL, add constraint.
-- -----------------------------------------------------------------------------
alter table public.comments
  add column if not exists target_type text,
  add column if not exists target_id text;

update public.comments
set target_type = 'post',
    target_id = post_id::text
where target_type is null
  and post_id is not null;

alter table public.comments
  alter column post_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_target_shape_chk'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_target_shape_chk check (
        (target_type = 'post' and post_id is not null and target_id is not null)
        or (target_type in ('system', 'technique') and post_id is null and target_id is not null)
      ) not valid;
    alter table public.comments validate constraint comments_target_shape_chk;
  end if;
end $$;

create index if not exists idx_comments_target_parent_created
  on public.comments (target_type, target_id, parent_comment_id, created_at asc);

-- Backward-compat trigger: existing insert paths only set post_id, so fill in
-- the polymorphic pair automatically. Leaves explicit (target_type,target_id)
-- inserts untouched.
create or replace function public._comments_ensure_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_type is null then
    if new.post_id is not null then
      new.target_type := 'post';
      new.target_id := new.post_id::text;
    else
      raise exception 'comments: target_type or post_id is required';
    end if;
  end if;
  if new.target_id is null and new.post_id is not null then
    new.target_id := new.post_id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_ensure_target on public.comments;
create trigger trg_comments_ensure_target
  before insert on public.comments
  for each row execute function public._comments_ensure_target();

-- -----------------------------------------------------------------------------
-- RLS: additive policies for system + technique target types. The existing
-- social_comments_select / social_comments_insert / social_comments_delete
-- policies continue to cover post-type rows.
-- -----------------------------------------------------------------------------
drop policy if exists target_comments_select on public.comments;
create policy target_comments_select on public.comments
  for select to authenticated
  using (
    target_type in ('system', 'technique')
    and (
      (
        target_type = 'system'
        and exists (
          select 1 from public.systems s
          where s.id = comments.target_id
            and s.visibility = 'public'
            and (auth.uid() is null or s.user_id is null or not public.community_is_blocked(auth.uid(), s.user_id))
        )
      )
      or (
        target_type = 'technique'
        and exists (
          select 1 from public.techniques t
          where t.id = comments.target_id
            and t.created_by is not null
            and coalesce((select p.privacy from public.profiles p where p.id = t.created_by), 'public') = 'public'
            and (auth.uid() is null or not public.community_is_blocked(auth.uid(), t.created_by))
        )
      )
    )
  );

drop policy if exists target_comments_insert on public.comments;
create policy target_comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and target_type in ('system', 'technique')
    and (
      (
        target_type = 'system'
        and exists (
          select 1 from public.systems s
          where s.id = comments.target_id
            and s.visibility = 'public'
            and (s.user_id is null or not public.community_is_blocked(auth.uid(), s.user_id))
        )
      )
      or (
        target_type = 'technique'
        and exists (
          select 1 from public.techniques t
          where t.id = comments.target_id
            and t.created_by is not null
            and coalesce((select p.privacy from public.profiles p where p.id = t.created_by), 'public') = 'public'
            and not public.community_is_blocked(auth.uid(), t.created_by)
        )
      )
    )
  );

commit;

