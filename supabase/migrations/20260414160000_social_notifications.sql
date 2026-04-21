begin;

-- Helpers
create or replace function public._profile_display_label(user_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    nullif((select p.display_name from public.profiles p where p.id = user_id), ''),
    nullif((select p.username from public.profiles p where p.id = user_id), ''),
    'Someone'
  );
$$;

-- Like notifications
create or replace function public.notify_social_like()
returns trigger
language plpgsql
as $$
declare
  creator_id uuid;
  actor_label text;
begin
  select p.user_id into creator_id from public.posts p where p.id = new.post_id;
  if creator_id is null then
    return new;
  end if;
  if creator_id = new.user_id then
    return new;
  end if;

  actor_label := public._profile_display_label(new.user_id);

  insert into public.notifications (user_id, kind, title, body, metadata)
  values (
    creator_id,
    'social_like',
    'New like',
    actor_label || ' liked your post.',
    jsonb_build_object('postId', new.post_id, 'actorId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists notify_social_like on public.likes;
create trigger notify_social_like
  after insert on public.likes
  for each row execute function public.notify_social_like();

-- Comment notifications
create or replace function public.notify_social_comment()
returns trigger
language plpgsql
as $$
declare
  creator_id uuid;
  actor_label text;
begin
  select p.user_id into creator_id from public.posts p where p.id = new.post_id;
  if creator_id is null then
    return new;
  end if;
  if creator_id = new.user_id then
    return new;
  end if;

  actor_label := public._profile_display_label(new.user_id);

  insert into public.notifications (user_id, kind, title, body, metadata)
  values (
    creator_id,
    'social_comment',
    'New comment',
    actor_label || ' commented on your post.',
    jsonb_build_object('postId', new.post_id, 'commentId', new.id, 'actorId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists notify_social_comment on public.comments;
create trigger notify_social_comment
  after insert on public.comments
  for each row execute function public.notify_social_comment();

-- Follow notifications
create or replace function public.notify_social_follow()
returns trigger
language plpgsql
as $$
declare
  actor_label text;
begin
  if new.following_user_id = new.follower_user_id then
    return new;
  end if;

  actor_label := public._profile_display_label(new.follower_user_id);

  insert into public.notifications (user_id, kind, title, body, metadata)
  values (
    new.following_user_id,
    'follow',
    'New follower',
    actor_label || ' started following you.',
    jsonb_build_object('actorId', new.follower_user_id)
  );

  return new;
end;
$$;

drop trigger if exists notify_social_follow on public.follows;
create trigger notify_social_follow
  after insert on public.follows
  for each row execute function public.notify_social_follow();

-- Follow request notifications (private accounts)
create or replace function public.notify_social_follow_request()
returns trigger
language plpgsql
as $$
declare
  actor_label text;
begin
  actor_label := public._profile_display_label(new.requester_user_id);

  insert into public.notifications (user_id, kind, title, body, metadata)
  values (
    new.target_user_id,
    'follow-request',
    'Follow request',
    actor_label || ' requested to follow you.',
    jsonb_build_object('requestId', new.id, 'actorId', new.requester_user_id)
  );

  return new;
end;
$$;

drop trigger if exists notify_social_follow_request on public.follow_requests;
create trigger notify_social_follow_request
  after insert on public.follow_requests
  for each row execute function public.notify_social_follow_request();

commit;

