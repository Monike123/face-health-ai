# FaceHealth — Have vs Remaining

Last update: 2026-11-17

## Have

| Area | Status | How to run |
| :--- | :--- | :--- |
| Classical POS / CHROM / Green + FFT SQI | Done | Web scan + `pytest` |
| Live web demo (mobile-tolerant capture) | Done | https://face-health-ai.vercel.app |
| Feedback → Neon | Done | `/api/v1/feedback` |
| Python FastAPI parity project | Done | https://facehealth-api.vercel.app |
| Product docs | Done | `README.md`, `docs/PRODUCT.md` |

## Remaining

| Item | Blocker | Next |
| :--- | :--- | :--- |
| Resend notify on every feedback | Domain or API key | Marketplace domain or `RESEND_API_KEY` |
| UBFC-rPPG on disk | Author access | `docs/datasets/REQUEST_EMAILS.md` |
| Classical MAE ≤ 2.5 BPM | Needs UBFC | Then PhysNet / ONNX only if better |

## Local web

```powershell
cd web
npm install
npm run dev
```
