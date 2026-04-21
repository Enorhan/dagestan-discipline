-- Dual entitlements (Stripe + iOS IAP) hardening.
-- Source of truth remains `profiles.is_premium` + subscription fields, but we add provenance and IAP audit tables.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_source TEXT,
  ADD COLUMN IF NOT EXISTS premium_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_updated_at TIMESTAMPTZ;

-- Store App Store transaction snapshots for entitlement reconciliation.
CREATE TABLE IF NOT EXISTS public.app_store_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_transaction_id TEXT NOT NULL,
  transaction_id TEXT,
  product_id TEXT NOT NULL,
  environment TEXT,
  status TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_store_transactions_user_original_idx
  ON public.app_store_transactions(user_id, original_transaction_id, product_id);

ALTER TABLE public.app_store_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own transactions.
DROP POLICY IF EXISTS "App Store transactions are viewable by owner" ON public.app_store_transactions;
CREATE POLICY "App Store transactions are viewable by owner"
  ON public.app_store_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Writes should be done by service role (edge functions). No INSERT/UPDATE policies for clients.

-- Deduplication for server notifications.
CREATE TABLE IF NOT EXISTS public.processed_app_store_notifications (
  id BIGSERIAL PRIMARY KEY,
  notification_uuid TEXT NOT NULL UNIQUE,
  notification_type TEXT,
  subtype TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_app_store_notifications ENABLE ROW LEVEL SECURITY;

-- No client access; service role only.

-- Free tier enforcement: limit custom/library techniques for non-premium users.
-- Premium users remain unlimited.
CREATE OR REPLACE FUNCTION public.enforce_free_technique_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_premium BOOLEAN := FALSE;
  v_count INTEGER := 0;
BEGIN
  SELECT COALESCE(p.is_premium, FALSE)
  INTO v_is_premium
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.user_techniques t
  WHERE t.user_id = NEW.user_id;

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Free technique limit reached. Upgrade to Premium to add more techniques.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_technique_limit ON public.user_techniques;
CREATE TRIGGER trg_enforce_free_technique_limit
  BEFORE INSERT ON public.user_techniques
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_technique_limit();

