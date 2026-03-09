-- Public read access for core training reference data
-- Needed for guest mode ("Continue without account") so Training Hub can load athlete-linked content.

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'athletes'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.athletes', policy_row.policyname);
  END LOOP;

  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'athlete_exercises'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.athlete_exercises', policy_row.policyname);
  END LOOP;

  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exercises'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exercises', policy_row.policyname);
  END LOOP;
END $$;
CREATE POLICY public_read_athletes
  ON public.athletes
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
CREATE POLICY public_read_athlete_exercises
  ON public.athlete_exercises
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
CREATE POLICY public_read_exercises
  ON public.exercises
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
