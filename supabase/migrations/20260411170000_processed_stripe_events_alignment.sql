begin;

create table if not exists public.processed_stripe_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_processed_stripe_events_processed_at
  on public.processed_stripe_events (processed_at desc);

insert into public.processed_stripe_events (event_id, event_type, processed_at)
select
  swe.stripe_event_id,
  coalesce(swe.event_type, 'unknown'),
  coalesce(swe.processed_at, swe.received_at, now())
from public.stripe_webhook_events swe
where swe.stripe_event_id is not null
on conflict (event_id) do nothing;

commit;
