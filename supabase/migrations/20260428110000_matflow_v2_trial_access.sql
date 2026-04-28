-- MatFlow V2 paid-access trial state.
-- Existing users receive a fresh V2 trial because this timestamp is independent
-- from the older first_active_at grace window.

alter table public.profiles
  add column if not exists matflow_trial_started_at timestamptz;

create index if not exists profiles_matflow_trial_started_at_idx
  on public.profiles (matflow_trial_started_at);

create or replace function public.start_matflow_v2_trial_if_missing()
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_started_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  update public.profiles
  set matflow_trial_started_at = now()
  where id = auth.uid()
    and matflow_trial_started_at is null;

  select matflow_trial_started_at
  into v_started_at
  from public.profiles
  where id = auth.uid();

  return v_started_at;
end;
$$;

grant execute on function public.start_matflow_v2_trial_if_missing() to authenticated;

create or replace function public.has_matflow_paid_or_trial_access(
  p_user_id uuid,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and (
        coalesce(p.is_premium, false) = true
        or p.subscription_status in ('active', 'trialing')
        or (
          p.subscription_period_end is not null
          and p.subscription_period_end > p_now
        )
        or (
          coalesce(p.matflow_trial_started_at, p.created_at, p_now) + interval '14 days' > p_now
        )
      )
  );
$$;

grant execute on function public.has_matflow_paid_or_trial_access(uuid, timestamptz) to anon, authenticated;
