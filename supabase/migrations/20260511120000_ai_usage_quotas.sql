-- MatFlow Phase 3: per-user daily AI usage quotas.
-- Used by edge functions (system-text-generator, whisper-transcribe) to cap
-- daily OpenAI consumption per user. claim_ai_quota() is SECURITY DEFINER and
-- atomic; the function runs as service-role caller and is granted to authenticated.

create table if not exists public.ai_usage_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  used_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, usage_date),
  constraint ai_usage_quotas_feature_chk check (
    feature in ('system_text_generator', 'whisper_transcribe', 'enhance_text')
  ),
  constraint ai_usage_quotas_used_count_chk check (used_count >= 0)
);

create index if not exists ai_usage_quotas_user_feature_date_idx
  on public.ai_usage_quotas (user_id, feature, usage_date desc);

alter table public.ai_usage_quotas enable row level security;

revoke all on public.ai_usage_quotas from anon, authenticated;

-- Atomically increment the per-user, per-feature, per-day counter and return
-- whether the caller is still within the daily quota. Returns:
--   { allowed boolean, used integer, quota integer }
create or replace function public.claim_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_quota integer
)
returns table (allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_used integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_feature is null or p_feature = '' then
    raise exception 'p_feature is required';
  end if;
  if p_quota is null or p_quota < 0 then
    raise exception 'p_quota must be non-negative';
  end if;

  insert into public.ai_usage_quotas as q (user_id, feature, usage_date, used_count)
  values (p_user_id, p_feature, v_today, 1)
  on conflict (user_id, feature, usage_date)
  do update set
    used_count = q.used_count + 1,
    updated_at = now()
  returning q.used_count into v_used;

  return query select
    (v_used <= p_quota) as allowed,
    v_used as used,
    p_quota as quota;
end;
$$;

revoke all on function public.claim_ai_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_quota(uuid, text, integer) to service_role;

comment on table public.ai_usage_quotas is
  'Daily per-user AI feature usage counters. Updated atomically by claim_ai_quota() from edge functions running with service-role.';
comment on function public.claim_ai_quota is
  'Atomic per-user, per-feature, per-day quota counter. Service-role only. Returns allowed/used/quota tuple after incrementing.';

