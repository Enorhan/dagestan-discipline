-- Expand exercises.category check to include app taxonomy categories.
ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_category_check;

ALTER TABLE exercises
  ADD CONSTRAINT exercises_category_check
  CHECK (
    category IN (
      'full-body',
      'legs',
      'chest',
      'shoulders',
      'back',
      'arms',
      'core',
      'neck',
      'cardio',
      'upper-body',
      'lower-body'
    )
  );
