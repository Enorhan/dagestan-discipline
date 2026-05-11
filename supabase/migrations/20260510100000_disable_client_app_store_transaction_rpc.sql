-- App Store entitlement hardening.
-- Direct authenticated RPC writes are disabled because the client cannot be the
-- source of truth for premium access. Use the appstore-transaction Edge Function,
-- which verifies Apple's signed StoreKit JWS before writing entitlement state.

CREATE OR REPLACE FUNCTION public.record_matflow_app_store_transaction(p_transaction JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Direct App Store transaction recording is disabled; use verified server-side transaction processing';
END;
$$;

REVOKE ALL ON FUNCTION public.record_matflow_app_store_transaction(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_matflow_app_store_transaction(JSONB) FROM authenticated;
