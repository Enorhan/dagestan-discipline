begin;

alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;

revoke all on table public.posts from anon;
revoke all on table public.post_media from anon;
revoke all on table public.likes from anon;
revoke all on table public.saves from anon;
revoke all on table public.comments from anon;

grant select, insert, update, delete on table public.posts to authenticated;
grant select, insert, update, delete on table public.post_media to authenticated;
grant select, insert, delete on table public.likes to authenticated;
grant select, insert, delete on table public.saves to authenticated;
grant select, insert, delete on table public.comments to authenticated;

drop policy if exists social_posts_select on public.posts;
create policy social_posts_select on public.posts
  for select to authenticated
  using (public.can_view_post(auth.uid(), user_id, visibility));

drop policy if exists social_posts_insert on public.posts;
create policy social_posts_insert on public.posts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists social_posts_update on public.posts;
create policy social_posts_update on public.posts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists social_posts_delete on public.posts;
create policy social_posts_delete on public.posts
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists social_post_media_select on public.post_media;
create policy social_post_media_select on public.post_media
  for select to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

drop policy if exists social_post_media_insert on public.post_media;
create policy social_post_media_insert on public.post_media
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists social_post_media_update on public.post_media;
create policy social_post_media_update on public.post_media
  for update to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists social_post_media_delete on public.post_media;
create policy social_post_media_delete on public.post_media
  for delete to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_media.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists social_likes_select on public.likes;
create policy social_likes_select on public.likes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists social_likes_insert on public.likes;
create policy social_likes_insert on public.likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = likes.post_id
        and public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

drop policy if exists social_likes_delete on public.likes;
create policy social_likes_delete on public.likes
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists social_saves_select on public.saves;
create policy social_saves_select on public.saves
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists social_saves_insert on public.saves;
create policy social_saves_insert on public.saves
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = saves.post_id
        and public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

drop policy if exists social_saves_delete on public.saves;
create policy social_saves_delete on public.saves
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists social_comments_select on public.comments;
create policy social_comments_select on public.comments
  for select to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = comments.post_id
        and public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

drop policy if exists social_comments_insert on public.comments;
create policy social_comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = comments.post_id
        and p.allow_comments
        and public.can_view_post(auth.uid(), p.user_id, p.visibility)
    )
  );

drop policy if exists social_comments_delete on public.comments;
create policy social_comments_delete on public.comments
  for delete to authenticated
  using (user_id = auth.uid());

commit;
