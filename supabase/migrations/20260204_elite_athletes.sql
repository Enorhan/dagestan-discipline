-- Elite Athletes Database Schema
-- This migration adds support for elite athlete workouts

-- Create enum for sports
DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM ('wrestling', 'judo', 'bjj');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Athletes table
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport sport_type NOT NULL,
  nationality TEXT,
  achievements TEXT[],
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster sport-based queries
CREATE INDEX IF NOT EXISTS idx_athletes_sport ON athletes(sport);

-- Athlete exercises junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS athlete_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  notes TEXT,
  reps TEXT,
  sets TEXT,
  weight TEXT,
  duration TEXT,
  frequency TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, exercise_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_athlete_exercises_athlete ON athlete_exercises(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_exercises_exercise ON athlete_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_athlete_exercises_priority ON athlete_exercises(priority DESC);

-- Add sport column to exercises table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'sport'
  ) THEN
    ALTER TABLE exercises ADD COLUMN sport sport_type;
  END IF;
END $$;

-- Add athlete_specific flag to exercises
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'athlete_specific'
  ) THEN
    ALTER TABLE exercises ADD COLUMN athlete_specific BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add equipment column to exercises
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'equipment'
  ) THEN
    ALTER TABLE exercises ADD COLUMN equipment TEXT[];
  END IF;
END $$;

-- Create indexes on exercises
CREATE INDEX IF NOT EXISTS idx_exercises_sport ON exercises(sport);
CREATE INDEX IF NOT EXISTS idx_exercises_athlete_specific ON exercises(athlete_specific);

-- Row Level Security Policies
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Athletes are viewable by authenticated users" ON athletes;
DROP POLICY IF EXISTS "Athlete exercises are viewable by authenticated users" ON athlete_exercises;

-- Allow all authenticated users to read athletes
CREATE POLICY "Athletes are viewable by authenticated users" 
  ON athletes FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow all authenticated users to read athlete_exercises
CREATE POLICY "Athlete exercises are viewable by authenticated users" 
  ON athlete_exercises FOR SELECT 
  TO authenticated 
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;

-- Trigger for athletes table
CREATE TRIGGER update_athletes_updated_at 
  BEFORE UPDATE ON athletes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE athletes IS 'Elite athletes from wrestling, judo, and BJJ';
COMMENT ON TABLE athlete_exercises IS 'Junction table linking athletes to their specific exercises';
COMMENT ON COLUMN athlete_exercises.priority IS 'Higher values indicate more important exercises for the athlete';

