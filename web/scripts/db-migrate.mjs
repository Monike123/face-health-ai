/**
 * Apply web/db/schema.sql against DATABASE_URL (Neon).
 * Usage: npm run db:migrate   (needs web/.env.local with DATABASE_URL)
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing — run: vercel env pull .env.local");
  process.exit(1);
}
const sql = neon(url);

await sql`
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
  )
`;
await sql`CREATE INDEX IF NOT EXISTS scan_feedback_created_at_idx ON scan_feedback (created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS scan_feedback_scan_id_idx ON scan_feedback (scan_id)`;
console.log("migrate done");
