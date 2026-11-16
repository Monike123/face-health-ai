-- FaceHealth AI v0.2 feedback store (no IP, no user id, no frames)
CREATE TABLE IF NOT EXISTS scan_feedback (
  id            BIGSERIAL PRIMARY KEY,
  scan_id       TEXT NOT NULL,
  hr_bpm        DOUBLE PRECISION,
  hr_lo         DOUBLE PRECISION,
  hr_hi         DOUBLE PRECISION,
  confidence    DOUBLE PRECISION NOT NULL,
  confidence_label TEXT NOT NULL,
  sqi           DOUBLE PRECISION NOT NULL,
  accuracy      TEXT NOT NULL,
  experience    SMALLINT NOT NULL CHECK (experience BETWEEN 1 AND 5),
  reference_bpm DOUBLE PRECISION,
  reference_device TEXT,
  comment       TEXT,
  trace_consent BOOLEAN NOT NULL DEFAULT FALSE,
  trace         JSONB,
  device_class  TEXT NOT NULL DEFAULT 'unknown',
  app_version   TEXT NOT NULL DEFAULT '0.2.0',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_feedback_created_at_idx ON scan_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS scan_feedback_scan_id_idx ON scan_feedback (scan_id);
