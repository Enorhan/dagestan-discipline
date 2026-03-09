-- Architecture hardening:
-- - Atomic workout/program write helpers
-- - Stripe webhook idempotency/audit storage
-- - Realtime publication scoping
-- - Moderation queue update lock-down

-- Ensure shared updated_at helper exists.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 1) Stripe webhook idempotency and observability
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1
    CHECK (attempt_count >= 1),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status_received
  ON public.stripe_webhook_events(status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type_received
  ON public.stripe_webhook_events(event_type, received_at DESC);
DROP TRIGGER IF EXISTS update_stripe_webhook_events_updated_at
  ON public.stripe_webhook_events;
CREATE TRIGGER update_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- 2) Atomic helper: replace workout exercises in one DB transaction
CREATE OR REPLACE FUNCTION public.replace_custom_workout_exercises(
  p_workout_id UUID,
  p_exercises JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RAISE EXCEPTION 'p_exercises must be a JSON array';
  END IF;

  SELECT creator_id
  INTO v_creator_id
  FROM custom_workouts
  WHERE id = p_workout_id;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Workout not found for id=%', p_workout_id;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_creator_id THEN
    RAISE EXCEPTION 'Not authorized to modify workout id=%', p_workout_id;
  END IF;

  DELETE FROM custom_workout_exercises
  WHERE workout_id = p_workout_id;

  INSERT INTO custom_workout_exercises (
    workout_id,
    name,
    sets,
    reps,
    duration,
    rest_time,
    notes,
    video_url,
    order_index
  )
  SELECT
    p_workout_id,
    item->>'name',
    GREATEST(1, COALESCE(NULLIF(item->>'sets', '')::INTEGER, 1)),
    NULLIF(item->>'reps', '')::INTEGER,
    NULLIF(item->>'duration', '')::INTEGER,
    GREATEST(0, COALESCE(NULLIF(item->>'restTime', '')::INTEGER, 0)),
    NULLIF(item->>'notes', ''),
    NULLIF(item->>'videoUrl', ''),
    ordinality - 1
  FROM jsonb_array_elements(p_exercises) WITH ORDINALITY AS t(item, ordinality);
END;
$$;
GRANT EXECUTE ON FUNCTION public.replace_custom_workout_exercises(UUID, JSONB) TO authenticated;
-- 3) Atomic helper: activate one training program while deactivating old ones
CREATE OR REPLACE FUNCTION public.activate_training_program_for_user(
  p_program_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id
  INTO v_user_id
  FROM training_programs
  WHERE id = p_program_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Program not found for id=%', p_program_id;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized to activate program id=%', p_program_id;
  END IF;

  UPDATE training_programs
  SET status = 'inactive',
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND status = 'active'
    AND id <> p_program_id;

  UPDATE training_programs
  SET status = 'active',
      updated_at = NOW()
  WHERE id = p_program_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_training_program_for_user(UUID) TO authenticated;
-- 4) Moderation queue lock-down: only service role should mutate queue rows.
DROP POLICY IF EXISTS "Moderation queue updatable by authenticated users"
  ON public.moderation_queue;
-- 5) Scope realtime publication to tables actively subscribed by the app.
DO $$
DECLARE
  allowed_tables TEXT[] := ARRAY[
    'athletes',
    'athlete_exercises',
    'exercises',
    'exercise_recommendations',
    'published_records',
    'drills',
    'routines',
    'routine_drills',
    'learning_paths',
    'learning_path_drills',
    'workout_day_overrides',
    'exercise_favorites',
    'exercise_completions'
  ];
  r RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOR r IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
  LOOP
    IF NOT (r.tablename = ANY(allowed_tables)) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I', r.schemaname, r.tablename);
      EXCEPTION
        WHEN undefined_object THEN
          NULL;
        WHEN others THEN
          -- Best effort: continue even if a table cannot be dropped.
          NULL;
      END;
    END IF;
  END LOOP;

  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY(allowed_tables)
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', r.schemaname, r.tablename);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN others THEN
        -- Best effort: continue even if a table cannot be added.
        NULL;
    END;
  END LOOP;
END $$;
