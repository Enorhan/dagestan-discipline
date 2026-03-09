-- Server-backed learning path progress + free-tier enforcement
-- Goal:
-- - Persist learning path progress in Supabase
-- - Enforce non-premium free tier (max 1 started learning path)

CREATE TABLE IF NOT EXISTS public.user_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  current_drill_index INTEGER NOT NULL DEFAULT 0 CHECK (current_drill_index >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.user_learning_progress
  ADD COLUMN IF NOT EXISTS current_drill_index INTEGER,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.user_learning_progress
SET
  current_drill_index = COALESCE(current_drill_index, 0),
  completed = COALESCE(completed, FALSE),
  started_at = COALESCE(started_at, NOW());

ALTER TABLE public.user_learning_progress
  ALTER COLUMN current_drill_index SET DEFAULT 0,
  ALTER COLUMN current_drill_index SET NOT NULL,
  ALTER COLUMN completed SET DEFAULT FALSE,
  ALTER COLUMN completed SET NOT NULL,
  ALTER COLUMN started_at SET DEFAULT NOW(),
  ALTER COLUMN started_at SET NOT NULL;

WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, learning_path_id
      ORDER BY
        COALESCE(current_drill_index, 0) DESC,
        COALESCE(completed, FALSE) DESC,
        COALESCE(started_at, NOW()) ASC
    ) AS rn
  FROM public.user_learning_progress
)
DELETE FROM public.user_learning_progress ulp
USING ranked
WHERE ulp.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_learning_progress_user_path
  ON public.user_learning_progress(user_id, learning_path_id);

CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user
  ON public.user_learning_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_learning_progress_path
  ON public.user_learning_progress(learning_path_id);

ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learning progress viewable by owner" ON public.user_learning_progress;
CREATE POLICY "Learning progress viewable by owner"
  ON public.user_learning_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Learning progress insertable by owner" ON public.user_learning_progress;
CREATE POLICY "Learning progress insertable by owner"
  ON public.user_learning_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Learning progress updatable by owner" ON public.user_learning_progress;
CREATE POLICY "Learning progress updatable by owner"
  ON public.user_learning_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Learning progress deletable by owner" ON public.user_learning_progress;
CREATE POLICY "Learning progress deletable by owner"
  ON public.user_learning_progress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_learning_path_free_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_is_premium BOOLEAN := FALSE;
  v_started_count INTEGER := 0;
  v_limit CONSTANT INTEGER := 1;
BEGIN
  -- Service role/admin writes may not have auth.uid(); do not block those paths.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to write learning progress for another user';
  END IF;

  SELECT COALESCE(p.is_premium, FALSE)
  INTO v_is_premium
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_is_premium THEN
    RETURN NEW;
  END IF;

  -- Existing path updates (upsert conflict path) are always allowed.
  IF EXISTS (
    SELECT 1
    FROM public.user_learning_progress ulp
    WHERE ulp.user_id = NEW.user_id
      AND ulp.learning_path_id = NEW.learning_path_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_started_count
  FROM public.user_learning_progress ulp
  WHERE ulp.user_id = NEW.user_id;

  IF v_started_count >= v_limit THEN
    RAISE EXCEPTION 'Free learning path limit reached. Upgrade to Premium to start another learning path.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_learning_path_free_limit
  ON public.user_learning_progress;

CREATE TRIGGER trg_enforce_learning_path_free_limit
  BEFORE INSERT ON public.user_learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_learning_path_free_limit();
