# FaceHealth AI — Product notes

## Positioning

FaceHealth AI is a **wellness** tool that estimates heart rate from facial colour change (rPPG). It is not a medical device and must not claim diagnosis, blood pressure, or SpO2 in the current product surface.

## User journey

1. Landing → consent + brightness acknowledge → camera.
2. Pre-check: face, framing, lighting, stillness, eyewear warn.
3. Scan: oval + progress ring; sample colour averages; may extend to ~90 s on slow devices.
4. Result: BPM (or clear failure), confidence, range, waveform.
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

The server picks the method with the best full-trace FFT SQI, then reports Welch HR. Low SQI can still return a Low-confidence BPM when a stable peak exists; pure noise stays null.

## Model roadmap

See README “Next plan — models and datasets”. Classical POS remains the demo default until a trained model wins the UBFC MAE gate.
