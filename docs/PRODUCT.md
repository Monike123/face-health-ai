# FaceHealth AI — Product notes

## Positioning

FaceHealth AI is a **wellness** tool that estimates heart rate from facial colour change (rPPG). It is not a medical device and must not claim diagnosis. Under ADR-004 (temporary pitch exception), the demo may also show **experimental research estimates** for blood pressure, SpO2 proxy, and skin warmth — always with confidence labels and wellness disclaimers, never as clinical readings.

## User journey

1. Landing → consent + brightness acknowledge → camera.
2. Pre-check: face, framing, lighting, stillness, eyewear warn.
3. Scan: oval + progress ring; timed R→G→B screen flash (front cam) + colour averages; fixed ~35–45 s.
4. Result: HR BPM (primary) + experimental BP / SpO2 / skin-warmth cards with confidence, range, waveform.
5. Optional feedback → Neon (+ email if configured).

## Architecture (production)

- **Primary:** Next.js on Vercel (`web/`) — browser MediaPipe + `/api/v1/scan` (TypeScript rPPG).
- **Optional:** FastAPI on Vercel (`backend/`) — Python POS/CHROM/Green for parity / tools.
- **DB:** Neon Postgres (`scan_feedback`).
- **Email:** Resend (optional; soft-fail if missing).

## Signal methods

- **POS** — strong under changing illumination.
- **CHROM** — chrominance baseline.
- **Green** — often strong under stable light.

The server picks the method with the best full-trace FFT SQI, then reports Welch HR. After enough samples the demo always publishes a band BPM (Low confidence when weak). Extra vitals are RGB proxies only (ADR-004).

## Model roadmap

See README “Next plan — models and datasets”. Classical POS remains the demo default until a trained model wins the UBFC MAE gate.
