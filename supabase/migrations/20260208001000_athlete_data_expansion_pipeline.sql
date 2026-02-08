-- Athlete/Exercise Data Expansion Pipeline
-- Collect -> Extract -> Normalize -> Moderation Queue -> Publish

-- Ensure sport enum exists for cross-table compatibility
DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM ('wrestling', 'judo', 'bjj');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Shared updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Configured collection sources (YouTube/web/social)
CREATE TABLE IF NOT EXISTS content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube_search', 'rss_feed', 'reddit_search', 'web_url', 'social_feed')),
  platform TEXT NOT NULL,
  query TEXT,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Raw collected source documents
CREATE TABLE IF NOT EXISTS source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  author_name TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport_hint sport_type,
  language TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_fingerprint TEXT NOT NULL,
  collection_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (collection_confidence >= 0 AND collection_confidence <= 1),
  processing_state TEXT NOT NULL DEFAULT 'collected'
    CHECK (processing_state IN ('collected', 'extracted', 'normalized', 'queued', 'published', 'discarded', 'error')),
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, external_id),
  UNIQUE(content_fingerprint)
);

-- 3) Extraction output per document
CREATE TABLE IF NOT EXISTS extracted_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  extraction_version TEXT NOT NULL DEFAULT 'v1',
  extractor TEXT NOT NULL DEFAULT 'heuristic',
  model TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence >= 0 AND confidence <= 1),
  detected_sport sport_type,
  athlete_mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  exercise_mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  routine_summary TEXT,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, extraction_version)
);

-- 4) Moderation queue for proposed records
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES extracted_signals(id) ON DELETE SET NULL,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('athlete', 'exercise', 'athlete_exercise', 'routine')),
  proposal_key TEXT NOT NULL,
  proposed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, queue_type, proposal_key)
);

-- 5) Publish audit log
CREATE TABLE IF NOT EXISTS published_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_item_id UUID NOT NULL UNIQUE REFERENCES moderation_queue(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('athlete', 'exercise', 'athlete_exercise', 'routine')),
  record_id UUID NOT NULL,
  source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by TEXT NOT NULL DEFAULT 'pipeline'
);

-- 6) Published routine library for auto-ingested routines
CREATE TABLE IF NOT EXISTS ingested_workout_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sport sport_type,
  summary TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add source attribution + confidence fields to existing core entities
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE athlete_exercises
  ADD COLUMN IF NOT EXISTS source_attribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_sources_active ON content_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_source_documents_state ON source_documents(processing_state);
CREATE INDEX IF NOT EXISTS idx_source_documents_source ON source_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_source_documents_published_at ON source_documents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_extracted_signals_document ON extracted_signals(document_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_type_status ON moderation_queue(queue_type, status);
CREATE INDEX IF NOT EXISTS idx_published_records_type ON published_records(record_type);

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_content_sources_updated_at ON content_sources;
CREATE TRIGGER update_content_sources_updated_at
  BEFORE UPDATE ON content_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_source_documents_updated_at ON source_documents;
CREATE TRIGGER update_source_documents_updated_at
  BEFORE UPDATE ON source_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_extracted_signals_updated_at ON extracted_signals;
CREATE TRIGGER update_extracted_signals_updated_at
  BEFORE UPDATE ON extracted_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_moderation_queue_updated_at ON moderation_queue;
CREATE TRIGGER update_moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ingested_workout_routines_updated_at ON ingested_workout_routines;
CREATE TRIGGER update_ingested_workout_routines_updated_at
  BEFORE UPDATE ON ingested_workout_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingested_workout_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Content sources readable by authenticated users" ON content_sources;
CREATE POLICY "Content sources readable by authenticated users"
  ON content_sources FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Source documents readable by authenticated users" ON source_documents;
CREATE POLICY "Source documents readable by authenticated users"
  ON source_documents FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Extracted signals readable by authenticated users" ON extracted_signals;
CREATE POLICY "Extracted signals readable by authenticated users"
  ON extracted_signals FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Moderation queue readable by authenticated users" ON moderation_queue;
CREATE POLICY "Moderation queue readable by authenticated users"
  ON moderation_queue FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Moderation queue updatable by authenticated users" ON moderation_queue;
CREATE POLICY "Moderation queue updatable by authenticated users"
  ON moderation_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Published records readable by authenticated users" ON published_records;
CREATE POLICY "Published records readable by authenticated users"
  ON published_records FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Ingested routines readable by authenticated users" ON ingested_workout_routines;
CREATE POLICY "Ingested routines readable by authenticated users"
  ON ingested_workout_routines FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE content_sources IS 'Configured sources for athlete/exercise expansion collection';
COMMENT ON TABLE source_documents IS 'Raw collected source content with attribution and processing state';
COMMENT ON TABLE extracted_signals IS 'Structured extraction output and confidence per source document';
COMMENT ON TABLE moderation_queue IS 'Human moderation queue before publishing normalized records';
COMMENT ON TABLE published_records IS 'Audit mapping from moderation items to published entity IDs';
COMMENT ON TABLE ingested_workout_routines IS 'Published auto-ingested routines from external sources';
