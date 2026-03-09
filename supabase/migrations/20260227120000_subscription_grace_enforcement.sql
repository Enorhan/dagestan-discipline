-- Subscription grace-window enforcement hardening
-- - Add first_active_at lifecycle timestamp
-- - Enforce premium visibility server-side with RLS

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_active_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_profiles_first_active_at
  ON public.profiles(first_active_at);
-- Backfill existing users that have already completed onboarding.
UPDATE public.profiles
SET first_active_at = COALESCE(first_active_at, created_at, NOW())
WHERE first_active_at IS NULL
  AND onboarding_completed IS TRUE;
-- Set first_active_at automatically the first time onboarding is completed.
CREATE OR REPLACE FUNCTION public.set_first_active_at_onboarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.onboarding_completed IS TRUE AND NEW.first_active_at IS NULL THEN
    NEW.first_active_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_first_active_at_onboarding_complete
  ON public.profiles;
CREATE TRIGGER trg_set_first_active_at_onboarding_complete
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_first_active_at_onboarding_complete();
-- Client-safe helper: set first_active_at for the signed-in user once.
CREATE OR REPLACE FUNCTION public.set_first_active_if_missing()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_first_active_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET first_active_at = NOW()
  WHERE id = auth.uid()
    AND first_active_at IS NULL;

  SELECT first_active_at
  INTO v_first_active_at
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_first_active_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_first_active_if_missing() TO authenticated;
-- Premium access if user is premium OR still within first_active_at + 7 days grace.
CREATE OR REPLACE FUNCTION public.has_premium_or_grace_access(
  p_user_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        COALESCE(p.is_premium, FALSE) = TRUE
        OR COALESCE(p.first_active_at, p.created_at, p_now) + INTERVAL '7 days' > p_now
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_premium_or_grace_access(UUID, TIMESTAMPTZ) TO anon, authenticated;
-- Replace existing SELECT policies for premium content tables with strict premium/grace logic.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('drills', 'routines', 'learning_paths', 'programs')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY premium_gate_select_drills
  ON public.drills
  FOR SELECT
  USING (
    COALESCE(is_premium, FALSE) = FALSE
    OR public.has_premium_or_grace_access(auth.uid())
  );
CREATE POLICY premium_gate_select_routines
  ON public.routines
  FOR SELECT
  USING (
    COALESCE(is_premium, FALSE) = FALSE
    OR public.has_premium_or_grace_access(auth.uid())
  );
CREATE POLICY premium_gate_select_learning_paths
  ON public.learning_paths
  FOR SELECT
  USING (
    COALESCE(is_premium, FALSE) = FALSE
    OR public.has_premium_or_grace_access(auth.uid())
  );
CREATE POLICY premium_gate_select_programs
  ON public.programs
  FOR SELECT
  USING (
    COALESCE(is_premium, FALSE) = FALSE
    OR public.has_premium_or_grace_access(auth.uid())
  );
