-- Phase 2 · Branch 3C: RPCs for polymorphic comments on systems + techniques.
-- Post comments continue to use the existing comments_for_post RPC and the
-- social-interactions-service insert path. These RPCs cover the new surfaces.

-- -----------------------------------------------------------------------------
-- list_target_comments: returns a flat thread for a non-post target. Orders
-- parents first by created_at asc, then replies grouped under them. Filters
-- via the target_comments_select RLS policy since this function runs as the
-- caller (security invoker) against public.comments.
-- -----------------------------------------------------------------------------
create or replace function public.list_target_comments(
  p_target_type text,
  p_target_id text,
  p_limit integer default 160,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  target_type text,
  target_id text,
  parent_comment_id uuid,
  user_id uuid,
  author_display_name text,
  author_handle text,
  author_avatar_url text,
  body text,
  mentioned_user_ids uuid[],
  hashtags text[],
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.target_type,
    c.target_id,
    c.parent_comment_id,
    c.user_id,
    public._profile_display_label(c.user_id) as author_display_name,
    (select p.username from public.profiles p where p.id = c.user_id) as author_handle,
    (select p.avatar_url from public.profiles p where p.id = c.user_id) as author_avatar_url,
    c.body,
    c.mentioned_user_ids,
    c.hashtags,
    c.created_at,
    c.created_at as updated_at
  from public.comments c
  where c.target_type = p_target_type
    and c.target_id = p_target_id
    and c.target_type in ('system', 'technique')
    and (p_cursor is null or c.created_at < p_cursor)
  order by coalesce(c.parent_comment_id, c.id), c.created_at asc
  limit least(coalesce(p_limit, 160), 250);
$$;

revoke all on function public.list_target_comments(text, text, integer, timestamptz) from public;
grant execute on function public.list_target_comments(text, text, integer, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- post_target_comment: author a comment on a system/technique target. Inserts
-- with RLS-gated visibility and notifies the target owner (best-effort, never
-- blocks the write). Returns the new comment id.
-- -----------------------------------------------------------------------------
create or replace function public.post_target_comment(
  p_target_type text,
  p_target_id text,
  p_body text,
  p_parent_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_new_id uuid;
  v_owner uuid;
  v_kind text;
  v_title text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_body = '' or char_length(v_body) > 1000 then
    raise exception 'comment body must be 1-1000 chars' using errcode = '22023';
  end if;
  if p_target_type not in ('system', 'technique') then
    raise exception 'unsupported target_type %', p_target_type using errcode = '22023';
  end if;

  if p_target_type = 'system' then
    select s.user_id into v_owner
    from public.systems s
    where s.id = p_target_id and s.visibility = 'public';
    if not found or v_owner is null then
      raise exception 'system not found or not public' using errcode = 'P0002';
    end if;
    if public.community_is_blocked(v_user, v_owner) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  else
    select t.created_by into v_owner
    from public.techniques t
    where t.id = p_target_id and t.created_by is not null;
    if not found or v_owner is null then
      raise exception 'technique not found' using errcode = 'P0002';
    end if;
    if coalesce((select p.privacy from public.profiles p where p.id = v_owner), 'public') <> 'public' then
      raise exception 'technique owner is not public' using errcode = '42501';
    end if;
    if public.community_is_blocked(v_user, v_owner) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;

  insert into public.comments (user_id, target_type, target_id, body, parent_comment_id)
  values (v_user, p_target_type, p_target_id, v_body, p_parent_comment_id)
  returning id into v_new_id;

  if v_owner <> v_user then
    v_kind := case p_target_type when 'system' then 'system_comment' else 'technique_comment' end;
    v_title := case p_target_type when 'system' then 'New comment on your graph' else 'New comment on your technique' end;
    begin
      insert into public.notifications (user_id, kind, title, body, metadata)
      values (
        v_owner,
        v_kind,
        v_title,
        left(v_body, 140),
        jsonb_build_object('target_type', p_target_type, 'target_id', p_target_id, 'actor_id', v_user, 'comment_id', v_new_id)
      );
    exception when others then
      -- notification is best-effort; never block the comment
      null;
    end;
  end if;

  return v_new_id;
end;
$$;

revoke all on function public.post_target_comment(text, text, text, uuid) from public;
grant execute on function public.post_target_comment(text, text, text, uuid) to authenticated;

