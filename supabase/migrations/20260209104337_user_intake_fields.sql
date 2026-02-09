-- User intake fields for program generation
-- Stored on `profiles` so onboarding + settings can read/write in one place.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experience_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS bodyweight_kg NUMERIC(6,2)
    CHECK (bodyweight_kg IS NULL OR (bodyweight_kg >= 25 AND bodyweight_kg <= 250)),
  ADD COLUMN IF NOT EXISTS primary_goal TEXT NOT NULL DEFAULT 'balanced'
    CHECK (primary_goal IN ('balanced', 'strength', 'power', 'conditioning')),
  ADD COLUMN IF NOT EXISTS combat_sessions_per_week INTEGER NOT NULL DEFAULT 0
    CHECK (combat_sessions_per_week >= 0 AND combat_sessions_per_week <= 14),
  ADD COLUMN IF NOT EXISTS session_minutes INTEGER NOT NULL DEFAULT 45
    CHECK (session_minutes >= 15 AND session_minutes <= 180),
  ADD COLUMN IF NOT EXISTS injury_notes TEXT;

-- Defensive backfill in case these columns existed without constraints.
UPDATE profiles
  SET experience_level = 'beginner'
  WHERE experience_level IS NULL
     OR experience_level NOT IN ('beginner', 'intermediate', 'advanced');

UPDATE profiles
  SET primary_goal = 'balanced'
  WHERE primary_goal IS NULL
     OR primary_goal NOT IN ('balanced', 'strength', 'power', 'conditioning');
