# FaceHealth — Have vs Remaining

Last update: 2026-11-17 (v0.2)

## Have (done)

| Area | Status | How to run |
| :--- | :--- | :--- |
| Project scaffold / config / CI / SOUP / ADR | Done | `pytest -q` |
| Live M1 HUD (landmarks → POS → HR) | Done | `python -m facehealth --live` |
| Web v0.2 scan (throttle, ROI hulls, quality, confidence, feedback) | Done | `cd web && npm run dev` |
| Neon feedback + Resend notify | Code ready | needs `vercel integration add neon` + `vc i resend` |
| Python FastAPI on Vercel (`backend/`) | Ready to deploy | `vercel --cwd backend --prod` |
| ADR-003 feedback storage | Done | `docs/adr/ADR-003-feedback-storage-neon.md` |

### Local web (open demo)

```powershell
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3000. No `DEV_AUTH` flag. Clerk only if publishable key is set.

## Remaining

| Item | Blocker | Next action |
| :--- | :--- | :--- |
| Neon + Resend live on Vercel | Marketplace approve once | Run CLI commands in README |
| Gate A/B/C device checks | Human | Laptop + Android matrix |
| **UBFC-rPPG** | Author access | `docs/datasets/REQUEST_EMAILS.md` |
| Full PhysNet train | UBFC on disk + MAE gate | Phase E after classical ≤ 2.5 BPM |
