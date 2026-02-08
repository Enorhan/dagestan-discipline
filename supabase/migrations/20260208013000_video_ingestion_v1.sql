-- V1 Multimodal Video Ingestion Pipeline
-- Adds storage for video-level ingestion artifacts used by collect -> ASR/OCR/vision -> moderation -> publish

-- Ensure helper exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS video_ingests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES source_documents(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  external_video_id TEXT,
  video_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'youtube',
  ingest_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ingest_status IN ('pending', 'downloading', 'transcribing', 'analyzing', 'completed', 'skipped', 'failed')),
  local_artifact_dir TEXT,
  duration_seconds NUMERIC(10,3),
  transcript_text TEXT,
  transcript_confidence NUMERIC(4,3) CHECK (transcript_confidence IS NULL OR (transcript_confidence >= 0 AND transcript_confidence <= 1)),
  detected_language TEXT,
  relevance_score NUMERIC(4,3) CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1)),
  relevance_reason TEXT,
  extraction_model TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_id UUID NOT NULL REFERENCES video_ingests(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_seconds NUMERIC(10,3) NOT NULL,
  end_seconds NUMERIC(10,3) NOT NULL,
  text TEXT NOT NULL,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  speaker_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ingest_id, segment_index)
);

CREATE TABLE IF NOT EXISTS frame_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_id UUID NOT NULL REFERENCES video_ingests(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL,
  frame_second NUMERIC(10,3) NOT NULL,
  frame_path TEXT,
  ocr_text TEXT,
  vision_summary TEXT,
  detected_exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ingest_id, frame_index)
);

CREATE TABLE IF NOT EXISTS exercise_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_id UUID NOT NULL REFERENCES video_ingests(id) ON DELETE CASCADE,
  start_second NUMERIC(10,3),
  end_second NUMERIC(10,3),
  sport sport_type,
  exercise_name TEXT NOT NULL,
  normalized_name TEXT,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence >= 0 AND confidence <= 1),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_ingests_status ON video_ingests(ingest_status);
CREATE INDEX IF NOT EXISTS idx_video_ingests_source ON video_ingests(source_id);
CREATE INDEX IF NOT EXISTS idx_video_ingests_document ON video_ingests(document_id);
CREATE INDEX IF NOT EXISTS idx_video_ingests_relevance ON video_ingests(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_ingest ON transcript_segments(ingest_id);
CREATE INDEX IF NOT EXISTS idx_frame_detections_ingest ON frame_detections(ingest_id);
CREATE INDEX IF NOT EXISTS idx_exercise_events_ingest ON exercise_events(ingest_id);
CREATE INDEX IF NOT EXISTS idx_exercise_events_sport ON exercise_events(sport);
CREATE INDEX IF NOT EXISTS idx_exercise_events_confidence ON exercise_events(confidence DESC);

DROP TRIGGER IF EXISTS update_video_ingests_updated_at ON video_ingests;
CREATE TRIGGER update_video_ingests_updated_at
  BEFORE UPDATE ON video_ingests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercise_events_updated_at ON exercise_events;
CREATE TRIGGER update_exercise_events_updated_at
  BEFORE UPDATE ON exercise_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE video_ingests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Video ingests readable by authenticated users" ON video_ingests;
CREATE POLICY "Video ingests readable by authenticated users"
  ON video_ingests FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Transcript segments readable by authenticated users" ON transcript_segments;
CREATE POLICY "Transcript segments readable by authenticated users"
  ON transcript_segments FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Frame detections readable by authenticated users" ON frame_detections;
CREATE POLICY "Frame detections readable by authenticated users"
  ON frame_detections FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Exercise events readable by authenticated users" ON exercise_events;
CREATE POLICY "Exercise events readable by authenticated users"
  ON exercise_events FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE video_ingests IS 'Per-video ingestion state and fused extraction outputs from audio + frames';
COMMENT ON TABLE transcript_segments IS 'Timestamped ASR transcript segments extracted from ingested videos';
COMMENT ON TABLE frame_detections IS 'Per-frame OCR/vision detections from sampled video frames';
COMMENT ON TABLE exercise_events IS 'Normalized exercise events detected from transcript and visual context';
