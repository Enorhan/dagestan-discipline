-- Server-backed free-tier usage counters + enforcement
-- Goal:
-- - Store usage counters in Supabase (not localStorage only)
-- - Enforce custom workout free tier at DB level for non-premium users

-- Usage counters table
CREATE TABLE IF NOT EXISTS public.feature_usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_counters_user_feature
  ON public.feature_usage_counters(user_id, feature);

CREATE INDEX IF NOT EXISTS idx_feature_usage_counters_feature
  ON public.feature_usage_counters(feature);

DROP TRIGGER IF EXISTS update_feature_usage_counters_updated_at
  ON public.feature_usage_counters;

CREATE TRIGGER update_feature_usage_counters_updated_at
  BEFORE UPDATE ON public.feature_usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill custom workout usage from existing data.
INSERT INTO public.feature_usage_counters (user_id, feature, usage_count)
SELECT
  cw.creator_id,
  'custom-workouts',
  COUNT(*)::INTEGER
FROM public.custom_workouts cw
GROUP BY cw.creator_id
ON CONFLICT (user_id, feature)
DO UPDATE SET
  usage_count = GREATEST(public.feature_usage_counters.usage_count, EXCLUDED.usage_count),
  updated_at = NOW();

-- Row Level Security
ALTER TABLE public.feature_usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature usage viewable by owner" ON public.feature_usage_counters;
CREATE POLICY "Feature usage viewable by owner"
  ON public.feature_usage_counters
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Feature usage insertable by owner" ON public.feature_usage_counters;
CREATE POLICY "Feature usage insertable by owner"
  ON public.feature_usage_counters
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Feature usage updatable by owner" ON public.feature_usage_counters;
CREATE POLICY "Feature usage updatable by owner"
  ON public.feature_usage_counters
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Feature usage deletable by owner" ON public.feature_usage_counters;
CREATE POLICY "Feature usage deletable by owner"
  ON public.feature_usage_counters
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RPC: read usage for current user + feature
CREATE OR REPLACE FUNCTION public.get_feature_usage(p_feature TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usage_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT usage_count
  INTO v_usage_count
  FROM public.feature_usage_counters
  WHERE user_id = auth.uid()
    AND feature = p_feature;

  RETURN COALESCE(v_usage_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feature_usage(TEXT) TO authenticated;

-- RPC: generic increment helper (for future feature counters)
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  p_feature TEXT,
  p_delta INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usage_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_delta IS NULL OR p_delta < 1 THEN
    RAISE EXCEPTION 'p_delta must be >= 1';
  END IF;

  INSERT INTO public.feature_usage_counters (user_id, feature, usage_count)
  VALUES (auth.uid(), p_feature, p_delta)
  ON CONFLICT (user_id, feature)
  DO UPDATE SET
    usage_count = public.feature_usage_counters.usage_count + p_delta,
    updated_at = NOW()
  RETURNING usage_count
  INTO v_usage_count;

  RETURN v_usage_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_feature_usage(TEXT, INTEGER) TO authenticated;

-- DB-level custom workout free-tier enforcement for non-premium users.
-- Premium users remain unlimited.
CREATE OR REPLACE FUNCTION public.enforce_custom_workout_free_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_is_premium BOOLEAN := FALSE;
  v_usage_count INTEGER;
  v_limit CONSTANT INTEGER := 3;
BEGIN
  -- Service role/admin inserts may not have auth.uid(); do not block those paths.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.creator_id IS NULL OR NEW.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to create workouts for another user';
  END IF;

  SELECT COALESCE(p.is_premium, FALSE)
  INTO v_is_premium
  FROM public.profiles p
  WHERE p.id = NEW.creator_id;

  IF v_is_premium THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.feature_usage_counters (user_id, feature, usage_count)
  VALUES (NEW.creator_id, 'custom-workouts', 1)
  ON CONFLICT (user_id, feature)
  DO UPDATE SET
    usage_count = public.feature_usage_counters.usage_count + 1,
    updated_at = NOW()
  RETURNING usage_count
  INTO v_usage_count;

  IF v_usage_count > v_limit THEN
    UPDATE public.feature_usage_counters
    SET usage_count = GREATEST(0, usage_count - 1),
        updated_at = NOW()
    WHERE user_id = NEW.creator_id
      AND feature = 'custom-workouts';

    RAISE EXCEPTION 'Free custom workout limit reached. Upgrade to Premium to create more workouts.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_custom_workout_free_limit
  ON public.custom_workouts;

CREATE TRIGGER trg_enforce_custom_workout_free_limit
  BEFORE INSERT ON public.custom_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_custom_workout_free_limit();
