-- Program persistence, exercise favorites/completions, and social cleanup

-- Drop unused social tables
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS saved_workouts CASCADE;

-- Training programs
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport sport_type NOT NULL,
  training_days INTEGER NOT NULL CHECK (training_days >= 2 AND training_days <= 6),
  status TEXT NOT NULL DEFAULT 'active',
  current_version_id UUID,
  original_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_program_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  is_original BOOLEAN NOT NULL DEFAULT FALSE,
  label TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Program state (week progress)
CREATE TABLE IF NOT EXISTS training_program_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES training_programs(id) ON DELETE SET NULL,
  week_progress JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise favorites and completions
CREATE TABLE IF NOT EXISTS exercise_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS exercise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  session_log_id UUID REFERENCES session_logs(id) ON DELETE SET NULL,
  source TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_programs_user_id ON training_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_status ON training_programs(status);
CREATE INDEX IF NOT EXISTS idx_training_program_versions_program_id ON training_program_versions(program_id);
CREATE INDEX IF NOT EXISTS idx_training_program_state_user_id ON training_program_state(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_favorites_user_id ON exercise_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_user_id ON exercise_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_exercise_id ON exercise_completions(exercise_id);

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_training_programs_updated_at ON training_programs;
CREATE TRIGGER update_training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_program_state_updated_at ON training_program_state;
CREATE TRIGGER update_training_program_state_updated_at
  BEFORE UPDATE ON training_program_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraints for version pointers (safe if already present)
DO $$ BEGIN
  ALTER TABLE training_programs
    ADD CONSTRAINT training_programs_current_version_fkey
    FOREIGN KEY (current_version_id)
    REFERENCES training_program_versions(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE training_programs
    ADD CONSTRAINT training_programs_original_version_fkey
    FOREIGN KEY (original_version_id)
    REFERENCES training_program_versions(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Row Level Security
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_program_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;

-- Policies: programs
DROP POLICY IF EXISTS "Programs are viewable by owner" ON training_programs;
CREATE POLICY "Programs are viewable by owner"
  ON training_programs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Programs are insertable by owner" ON training_programs;
CREATE POLICY "Programs are insertable by owner"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Programs are updatable by owner" ON training_programs;
CREATE POLICY "Programs are updatable by owner"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Programs are deletable by owner" ON training_programs;
CREATE POLICY "Programs are deletable by owner"
  ON training_programs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies: program versions
DROP POLICY IF EXISTS "Program versions are viewable by owner" ON training_program_versions;
CREATE POLICY "Program versions are viewable by owner"
  ON training_program_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_programs p
      WHERE p.id = training_program_versions.program_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Program versions are insertable by owner" ON training_program_versions;
CREATE POLICY "Program versions are insertable by owner"
  ON training_program_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_programs p
      WHERE p.id = training_program_versions.program_id
        AND p.user_id = auth.uid()
    )
  );

-- Policies: program state
DROP POLICY IF EXISTS "Program state is viewable by owner" ON training_program_state;
CREATE POLICY "Program state is viewable by owner"
  ON training_program_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Program state is insertable by owner" ON training_program_state;
CREATE POLICY "Program state is insertable by owner"
  ON training_program_state FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Program state is updatable by owner" ON training_program_state;
CREATE POLICY "Program state is updatable by owner"
  ON training_program_state FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies: exercise favorites
DROP POLICY IF EXISTS "Exercise favorites are viewable by owner" ON exercise_favorites;
CREATE POLICY "Exercise favorites are viewable by owner"
  ON exercise_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Exercise favorites are insertable by owner" ON exercise_favorites;
CREATE POLICY "Exercise favorites are insertable by owner"
  ON exercise_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Exercise favorites are deletable by owner" ON exercise_favorites;
CREATE POLICY "Exercise favorites are deletable by owner"
  ON exercise_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies: exercise completions
DROP POLICY IF EXISTS "Exercise completions are viewable by owner" ON exercise_completions;
CREATE POLICY "Exercise completions are viewable by owner"
  ON exercise_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Exercise completions are insertable by owner" ON exercise_completions;
CREATE POLICY "Exercise completions are insertable by owner"
  ON exercise_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
