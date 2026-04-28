-- MatFlow v2: authenticated client bridge from StoreKit result to canonical entitlement state.
-- This keeps iOS unlocks on Apple IAP while writing the same profile entitlement
-- fields used by Stripe/web access.

CREATE OR REPLACE FUNCTION public.record_matflow_app_store_transaction(p_transaction JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_original_transaction_id TEXT := NULLIF(trim(p_transaction ->> 'originalTransactionId'), '');
  v_transaction_id TEXT := NULLIF(trim(p_transaction ->> 'transactionId'), '');
  v_product_id TEXT := NULLIF(trim(p_transaction ->> 'productId'), '');
  v_environment TEXT := NULLIF(trim(p_transaction ->> 'environment'), '');
  v_status TEXT := NULLIF(trim(p_transaction ->> 'status'), '');
  v_purchased_at TIMESTAMPTZ := NULLIF(trim(p_transaction ->> 'purchaseDate'), '')::TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ := NULLIF(trim(p_transaction ->> 'expirationDate'), '')::TIMESTAMPTZ;
  v_revoked_at TIMESTAMPTZ := NULLIF(trim(p_transaction ->> 'revocationDate'), '')::TIMESTAMPTZ;
  v_is_active BOOLEAN := FALSE;
  v_profile JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_original_transaction_id IS NULL OR v_product_id IS NULL THEN
    RAISE EXCEPTION 'Missing App Store transaction identifiers';
  END IF;

  v_is_active :=
    v_revoked_at IS NULL
    AND COALESCE(v_status, '') IN ('purchased', 'restored')
    AND (v_expires_at IS NULL OR v_expires_at > now());

  INSERT INTO public.app_store_transactions (
    user_id,
    original_transaction_id,
    transaction_id,
    product_id,
    environment,
    status,
    purchased_at,
    expires_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_original_transaction_id,
    v_transaction_id,
    v_product_id,
    v_environment,
    CASE WHEN v_revoked_at IS NOT NULL THEN 'revoked' ELSE v_status END,
    v_purchased_at,
    v_expires_at,
    now()
  )
  ON CONFLICT (user_id, original_transaction_id, product_id)
  DO UPDATE SET
    transaction_id = EXCLUDED.transaction_id,
    environment = EXCLUDED.environment,
    status = EXCLUDED.status,
    purchased_at = EXCLUDED.purchased_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  UPDATE public.profiles
  SET
    is_premium = v_is_active,
    premium_source = 'apple_iap',
    premium_provider_id = v_original_transaction_id,
    premium_updated_at = now(),
    subscription_status = CASE WHEN v_is_active THEN 'active' ELSE 'expired' END,
    subscription_period_end = v_expires_at
  WHERE id = v_user_id
    AND (
      v_is_active
      OR premium_source IS NULL
      OR premium_source = 'apple_iap'
      OR premium_provider_id = v_original_transaction_id
    );

  SELECT to_jsonb(p)
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  RETURN COALESCE(v_profile, '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.record_matflow_app_store_transaction(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_matflow_app_store_transaction(JSONB) TO authenticated;
