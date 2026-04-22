begin;

-- processed_stripe_events is an idempotency ledger written exclusively by the
-- Stripe webhook running with the service role. The anon and authenticated
-- roles must not be able to read, insert, update, or delete rows, otherwise a
-- client holding the anon key could pre-seed event IDs to suppress real
-- webhook processing or delete rows to replay events.

alter table public.processed_stripe_events enable row level security;

revoke all on table public.processed_stripe_events from anon;
revoke all on table public.processed_stripe_events from authenticated;

-- No policies are created: RLS is enabled with zero policies, which denies all
-- non-superuser access. The Stripe webhook bypasses RLS via the service role
-- key and continues to function without changes.

commit;

