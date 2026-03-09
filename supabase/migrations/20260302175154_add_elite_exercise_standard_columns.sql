
-- Add new columns to exercises table for the expanded elite exercise standard
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS recommended_sets text,
  ADD COLUMN IF NOT EXISTS recommended_reps_or_time text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'intermediate'
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS benefits_judo text,
  ADD COLUMN IF NOT EXISTS benefits_wrestling text,
  ADD COLUMN IF NOT EXISTS benefits_bjj text;

-- Add index on tags for efficient filtering
CREATE INDEX IF NOT EXISTS idx_exercises_tags ON exercises USING GIN (tags);

-- Add index on difficulty_level for filtering
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises (difficulty_level);

-- Add index on sub_category for filtering
CREATE INDEX IF NOT EXISTS idx_exercises_sub_category ON exercises (sub_category);

COMMENT ON COLUMN exercises.sub_category IS 'Training sub-category (barbell-compound, grappling-drill, etc.)';
COMMENT ON COLUMN exercises.recommended_sets IS 'Default recommended sets (e.g. "4-6 sets")';
COMMENT ON COLUMN exercises.recommended_reps_or_time IS 'Default recommended reps or time (e.g. "6-10 reps" or "20-30s work")';
COMMENT ON COLUMN exercises.tags IS 'Performance tags (grip, explosive, mobility, etc.)';
COMMENT ON COLUMN exercises.difficulty_level IS 'Exercise difficulty: beginner, intermediate, advanced';
COMMENT ON COLUMN exercises.benefits_judo IS 'How this exercise improves Judo performance';
COMMENT ON COLUMN exercises.benefits_wrestling IS 'How this exercise improves Wrestling performance';
COMMENT ON COLUMN exercises.benefits_bjj IS 'How this exercise improves BJJ performance';
;
