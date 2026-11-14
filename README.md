# FaceHealth-rPPG

Contactless rPPG **wellness** toolkit: estimate pulse-related signals from face video.

> **Not a medical device.** Not for diagnosis, screening, or treatment decisions.

## Status
- Plans: [`MASTER_PLAN.md`](MASTER_PLAN.md) v2.0, [`task_plan.md`](task_plan.md)
- Implementation: **M0 foundation** (package scaffold, config, logging, CI, docs)
- Next: **M1** walking skeleton — webcam → FaceLandmarker → ROI → POS → HR

## Quick start (Windows)
```powershell
cd c:\Users\Manas\Desktop\Face_health
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pip install mediapipe
python scripts\download_face_landmarker.py
pytest -q
python -m facehealth --live
```
Press `q` to quit the HUD. Wellness only — not for diagnosis.

## Layout
See `src/facehealth/` packages. Runtime config: `configs/config.yaml`.

## License / datasets
See [`docs/soup_register.md`](docs/soup_register.md), [`docs/datasets/GUIDE.md`](docs/datasets/GUIDE.md), and request templates in [`docs/datasets/REQUEST_EMAILS.md`](docs/datasets/REQUEST_EMAILS.md).

```powershell
# Open synthetic starter (~1.2 GB)
python scripts\datasets\download_scamps_example.py
python scripts\datasets\verify_dataset.py --name scamps
```
