# FaceHealth AI v0.2 — Executable checklist

Plan approved and executed.

## Phase 0
- [x] Rewrite this checklist from the v0.2 plan

## Phase A — Make the scan work (Deploy A)
- [x] WS1 Frame pipeline (640×480, throttle detect, bbox sampling, adaptive 30–45s, wake lock, preload; API limits)
- [x] WS2 Overlay + ROI (canvas = video size, convex hull ROIs, oval guide; yaml + Python parity)
- [x] Labels (remove Beta / Local demo / DEV_AUTH; footer Preview v0.2)
- [ ] Gate A (human): 3 laptop + 3 phone scans, outlines on face → Deploy A

## Phase B — Quality + confidence (Deploy B)
- [x] WS3 quality.ts + checklist UI (framing / lighting / stillness / skin / eyewear warn+continue)
- [x] WS4 rppg engine (Butterworth+Welch, median/range, confidence, waveform, live BPM, golden test)
- [ ] Gate B (human): glasses warn on/off → Deploy B

## Phase C — Feedback + polish (Deploy C)
- [x] WS5a Neon provisioned (`facehealth-db`); schema via `/api/v1/migrate`; ADR-003 + SOUP
- [x] WS5b Result + feedback UI; POST /api/v1/feedback; /privacy
- [x] WS6 Mobile camera-first; landing how-it-works; a11y polish
- [ ] Gate C (human): Neon row + email received → Deploy C → tag v0.2.0
- [ ] Resend: needs a domain you own (`vercel integration add resend --meta domain=…`) OR set `RESEND_API_KEY` manually (onboarding@resend.dev → your Gmail)

## Phase D — Python API (Deploy D)
- [x] WS7 `backend/` FastAPI on Vercel → https://facehealth-api.vercel.app

## Phase E — Training (blocked on datasets)
- [ ] UBFC on disk → classical MAE ≤ 2.5 → Kaggle PhysNet (not blocking demo)

## QA / ship
- [x] lint / test / build (web) + pytest / ruff / mypy (Python)
- [x] CI web job; docs; Neon migrate on prod
- [x] Push + tag v0.2.0 (`5aa5fa2`, tag `v0.2.0`)

## Review
- Root causes fixed: frame starvation (throttle + bbox sampling), mobile overlay (native video size + hull ROIs), Beta labels removed.
- Neon works from Vercel; local ISP DNS blocks Neon hostnames — migrate via production `/api/v1/migrate`.
- Resend Marketplace requires a domain; email is soft-fail until key/domain is set.
- Device Gates A/B/C still need your laptop + phone checks.
- Phase E blocked until UBFC is on disk.

## Earlier (kept)
- [x] M0 + M1 live HUD
- [x] Dataset guide + email templates
- [ ] Email UBFC request (`docs/datasets/REQUEST_EMAILS.md`)
- [ ] Email PURE if academic email available
