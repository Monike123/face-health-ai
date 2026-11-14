# FaceHealth — Have vs Remaining

Last update: 2026-11-14

## Have (done)

| Area | Status | How to run |
| :--- | :--- | :--- |
| Project scaffold / config / CI / SOUP / ADR | Done | `pytest -q` |
| Live M1 HUD (landmarks → POS → HR) | Done | `python -m facehealth --live` |
| FaceLandmarker model file | Done | `models/face_landmarker.task` |
| POS + CHROM + bandpass + Welch HR | Done | unit tests |
| Minimal SQA gate in HUD | Done | SQI in overlay |
| PhysNet model + NegPearson + synthetic dataset | Done | see below |
| PhysNet smoke trainer | Done | `python -m facehealth.deep_learning.train_physnet` |
| Classical benchmark harness | Done | `python -m facehealth.evaluation.benchmark_pos` |
| Dataset guide + request emails | Done | `docs/datasets/` |
| SCAMPS open download script | Done | `data/raw/SCAMPS/` |
| Web v0.1 Beta (API + Next.js scan UI) | Local demo working | see below |

### Local web demo (no Clerk)

```powershell
# Terminal 1
$env:FACEHEALTH_DEV_AUTH='1'
.\.venv\Scripts\python.exe -m uvicorn facehealth.api.app:app --host 127.0.0.1 --port 8000 --app-dir src

# Terminal 2
cd web
npm run dev
```

Open http://127.0.0.1:3000 → Start a scan. `NEXT_PUBLIC_DEV_AUTH=1` is in `web/.env.local`.
Turn both DEV_AUTH flags off before any public/Vercel deploy; then use Clerk keys.

## Remaining (blocked on you / later milestones)

| Item | Blocker | Next action |
| :--- | :--- | :--- |
| **UBFC-rPPG real videos** | Author / Kaggle access | Send email in `docs/datasets/REQUEST_EMAILS.md` |
| **PURE** | Academic email required | Faculty/uni request |
| **COHFACE** (for RR) | Zenodo EULA | Request when doing breathing |
| **MMPD** | Faculty + non-commercial only | Optional equity research |
| Full PhysNet train on real data | Needs UBFC/PURE on disk + cloud GPU | After UBFC verify |
| ONNX export / Web / SDK / PAD / HRV / RR / BP | Later milestones M3–M6 | After classical UBFC MAE |

## What “model building” means right now

1. **Built:** PhysNet architecture + loss + synthetic smoke train (no real faces yet).  
2. **Not built yet:** production weights — impossible until UBFC (or SCAMPS full) is local.  
3. **After torch install finishes**, run smoke train (few minutes on GPU/CPU).

```powershell
python -m facehealth.deep_learning.train_physnet --epochs 3
python -m facehealth.evaluation.benchmark_pos
```
