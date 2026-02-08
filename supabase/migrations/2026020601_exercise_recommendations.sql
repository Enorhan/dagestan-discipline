-- Exercise Recommendations Schema
-- This migration adds user-level recommendations separate from elite athlete data

-- Create table for exercise recommendations by experience level
CREATE TABLE IF NOT EXISTS exercise_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Recommended ranges
  sets_min INTEGER,
  sets_max INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_seconds_min INTEGER,
  rest_seconds_max INTEGER,
  
  -- Contextual guidance
  tempo TEXT, -- e.g., "3-1-1-0" (eccentric-pause-concentric-pause)
  progression_notes TEXT, -- How to progress this exercise
  regression_notes TEXT, -- How to regress if too difficult
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(exercise_id, experience_level)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_recommendations_exercise ON exercise_recommendations(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_recommendations_level ON exercise_recommendations(experience_level);

-- Row Level Security
ALTER TABLE exercise_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read recommendations
DROP POLICY IF EXISTS "Exercise recommendations are viewable by authenticated users" ON exercise_recommendations;
CREATE POLICY "Exercise recommendations are viewable by authenticated users" 
  ON exercise_recommendations FOR SELECT 
  TO authenticated 
  USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_exercise_recommendations_updated_at ON exercise_recommendations;
CREATE TRIGGER update_exercise_recommendations_updated_at 
  BEFORE UPDATE ON exercise_recommendations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE exercise_recommendations IS 'Science-based exercise recommendations by experience level';
COMMENT ON COLUMN exercise_recommendations.tempo IS 'Tempo notation: eccentric-pause-concentric-pause (e.g., 3-1-1-0)';
COMMENT ON COLUMN exercise_recommendations.progression_notes IS 'How to make the exercise more challenging';
COMMENT ON COLUMN exercise_recommendations.regression_notes IS 'How to make the exercise easier';
