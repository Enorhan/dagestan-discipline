-- Program + scope hardening for production readiness

-- 1) Keep only one active program per user (latest stays active)
WITH ranked_active AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM training_programs
  WHERE status = 'active'
)
UPDATE training_programs tp
SET status = 'inactive',
    updated_at = NOW()
FROM ranked_active ra
WHERE tp.id = ra.id
  AND ra.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_programs_one_active_per_user
  ON training_programs(user_id)
  WHERE status = 'active';

-- 2) Remove remaining non-needed social scope tables (safe idempotent cleanup)
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS saved_workouts CASCADE;
DROP TABLE IF EXISTS feed_events CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS saves CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS post_media CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- 3) Keep custom workout library private-first for this release
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custom_workouts'
      AND column_name = 'visibility'
  ) THEN
    UPDATE custom_workouts
    SET visibility = 'private'
    WHERE visibility IS DISTINCT FROM 'private';
  END IF;
END $$;
