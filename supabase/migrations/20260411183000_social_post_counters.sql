begin;

create or replace function public.sync_post_engagement_counts(target_post_id uuid)
returns void
language plpgsql
as $$
begin
  if target_post_id is null then
    return;
  end if;

  update public.posts p
  set
    like_count = coalesce((
      select count(*)::integer
      from public.likes l
      where l.post_id = target_post_id
    ), 0),
    comment_count = coalesce((
      select count(*)::integer
      from public.comments c
      where c.post_id = target_post_id
    ), 0),
    save_count = coalesce((
      select count(*)::integer
      from public.saves s
      where s.post_id = target_post_id
    ), 0),
    updated_at = now()
  where p.id = target_post_id;
end;
$$;

create or replace function public.handle_social_engagement_count_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_post_engagement_counts(old.post_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.post_id is distinct from new.post_id then
      perform public.sync_post_engagement_counts(old.post_id);
      perform public.sync_post_engagement_counts(new.post_id);
    else
      perform public.sync_post_engagement_counts(new.post_id);
    end if;
    return new;
  end if;

  perform public.sync_post_engagement_counts(new.post_id);
  return new;
end;
$$;

drop trigger if exists likes_sync_post_counts on public.likes;
create trigger likes_sync_post_counts
  after insert or delete or update on public.likes
  for each row execute function public.handle_social_engagement_count_change();

drop trigger if exists comments_sync_post_counts on public.comments;
create trigger comments_sync_post_counts
  after insert or delete or update on public.comments
  for each row execute function public.handle_social_engagement_count_change();

drop trigger if exists saves_sync_post_counts on public.saves;
create trigger saves_sync_post_counts
  after insert or delete or update on public.saves
  for each row execute function public.handle_social_engagement_count_change();

update public.posts p
set
  like_count = coalesce((
    select count(*)::integer
    from public.likes l
    where l.post_id = p.id
  ), 0),
  comment_count = coalesce((
    select count(*)::integer
    from public.comments c
    where c.post_id = p.id
  ), 0),
  save_count = coalesce((
    select count(*)::integer
    from public.saves s
    where s.post_id = p.id
  ), 0),
  updated_at = now();

commit;
