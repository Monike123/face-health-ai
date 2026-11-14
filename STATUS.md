# FaceHealth — Have vs Remaining

Last update: 2026-10-14

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
| SCAMPS open download script | In progress / script ready | `python scripts/datasets/download_scamps_example.py` |

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
