begin;

-- The permissive "Users manage training sessions" policy applies to all
-- commands for role `public` (polroles = '{-}') and duplicates the narrower,
-- explicit policies (`bjj_public_training_sessions_select` and the owner
-- write policies created in the multi-user hardening migrations). Drop it to
-- eliminate ambiguity so a future auditor reads a single clear intent.

drop policy if exists "Users manage training sessions" on public.training_sessions;

-- Explicit owner write policies. Read access is already granted by
-- bjj_public_training_sessions_select. These recreate the write side of the
-- dropped ALL policy without broadening access.

drop policy if exists bjj_training_sessions_insert on public.training_sessions;
create policy bjj_training_sessions_insert on public.training_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists bjj_training_sessions_update on public.training_sessions;
create policy bjj_training_sessions_update on public.training_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists bjj_training_sessions_delete on public.training_sessions;
create policy bjj_training_sessions_delete on public.training_sessions
  for delete to authenticated
  using (user_id = auth.uid());

commit;

