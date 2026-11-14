# FaceHealth-rPPG (Agent Context)

Contactless facial rPPG wellness toolkit estimating heart rate and physiological signals via classical DSP (POS/CHROM) and 3D-CNN/ONNX models. **Wellness only — zero diagnostic/medical claims.**

## 1. Current Checkpoint & Blocker State (Resume Here)

### Completed (M0 & M1)
- **M0 Foundation**: `src` package layout (`src/facehealth/`), Pydantic v2 config (`configs/config.yaml`, `src/facehealth/utils/config_manager.py`), privacy-safe logger (`src/facehealth/utils/logger.py`), CI (`.github/workflows/ci.yml`), ADR-001 (wellness intended use), SOUP register (`docs/soup_register.md`).
- **M1 Live Walking Skeleton**: `src/facehealth/pipeline.py` runs webcam capture (`VideoCapture`) -> MediaPipe 478 `FaceLandmarker` (`models/face_landmarker.task`) -> forehead + bilateral malar polygon ROI (`roi_extractor.py`, DC-preserving mean RGB) -> overlap-add POS (`pos_algorithm.py`) -> Butterworth bandpass (`filter_bank.py`) -> SQA gate (`sqa_calculator.py`, `sqi >= 0.50`) -> Welch PSD HR (`hr_estimator.py`) + OpenCV HUD.
- **Classical & DL Harnesses**: CHROM baseline (`chrom_algorithm.py`), benchmark script (`evaluation/benchmark_pos.py`), PhysNet 3D-CNN (`deep_learning/physnet_model.py`), NegPearson loss (`deep_learning/losses.py`), synthetic dataset (`deep_learning/synthetic_dataset.py`), smoke trainer (`deep_learning/train_physnet.py`).
- **Open Starter Data**: SCAMPS synthetic sample (~1.2 GB, 10 `.mat` videos + `ScampsTrainTestSplit.csv`) verified under `data/raw/SCAMPS/`.

### Where We Are Stuck / Immediate Next Actions
1. **Blocker 1 — Gated Real Datasets (User Action Required)**:
   - **UBFC-rPPG** (primary 42-video HR benchmark) and **PURE** (motion benchmark) are not on disk.
   - User must send access requests using templates in `docs/datasets/REQUEST_EMAILS.md` and unpack into `data/raw/UBFC-rPPG/` and `data/raw/PURE/`.
2. **Blocker 2 — Local PyTorch Smoke Check**:
   - Verify `.venv` ML dependencies (`pip install -e ".[ml]"`) and run `python -m facehealth.deep_learning.train_physnet --epochs 3` (saves `models/checkpoints/physnet_smoke.pt`).
3. **Next Engineering Step (M2 -> M4)**:
   - Once UBFC arrives: run `python scripts/datasets/verify_dataset.py --name ubfc` and `python -m facehealth.evaluation.benchmark_pos --ubfc data/raw/UBFC-rPPG` (Release Gate: MAE <= 2.5 BPM).
   - Build M2 robustness (`preprocessing/`: soft motion weighting, illumination flicker notch, full SQA) before full cloud GPU DL training (M4).

## 2. Terminal Commands

```powershell
# Activate environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -e ".[dev]"
pip install -e ".[ml]"

# Run live webcam HUD (press q to quit)
python -m facehealth --live

# Lint, typecheck, and test (must pass with 0 errors)
ruff check src tests
mypy src/facehealth
pytest -q

# Classical POS/CHROM benchmark (synthetic or UBFC)
python -m facehealth.evaluation.benchmark_pos
python -m facehealth.evaluation.benchmark_pos --ubfc data/raw/UBFC-rPPG

# PhysNet synthetic smoke training
python -m facehealth.deep_learning.train_physnet --epochs 3
```

## 3. Signal Pipeline Architecture

```text
VideoCapture (host monotonic timestamps)
  -> LandmarkDetector (MediaPipe 478-point mesh, VIDEO mode)
    -> roi_extractor (forehead + L/R malar polygons, DC-preserving mean RGB)
      -> pos_stream / chrom_stream (classical) OR PhysNet / ONNX (DL)
        -> filter_bank: HR [0.7, 3.0] Hz | Morph [0.5, 8.0] Hz | Resp [0.1, 0.7] Hz
          -> sqa_calculator (gate: sqi >= cfg.sqi_gate)
            -> hr_estimator (Welch PSD peak -> BPM)
```

## 4. Hard Engineering & Legal Constraints

- **DC-Preserving Pooling**: Never z-score or detrend raw RGB before POS/CHROM projection; POS/CHROM require the DC component for temporal normalization (`cn = rgb / mu - 1.0`). Detrend/bandpass only after BVP projection.
- **Three Filter Branches**: Never collapse BVP filtering into a single narrow band; read `hr_band_hz`, `morph_band_hz`, and `resp_band_hz` from `configs/config.yaml`.
- **License & Dataset Boundaries**:
  - **No AGPL**: Ultralytics/YOLO is strictly banned. Use MediaPipe (Apache-2.0) + OpenCV YuNet.
  - **No Non-Commercial Weights in Product**: MMPD and COHFACE are research-only; never ship commercial weights trained on them.
  - **Single OpenCV Package**: Use `opencv-python` for local GUI dev or `opencv-python-headless` for server/containers—never both in the same env.
- **Subject-Wise Splits Only**: Zero subject overlap across train/val/test splits.
- **Hardware & Compute**: Local RTX 3050 Laptop (4 GB VRAM) is for inference and synthetic smoke tests only; run full 3D-CNN training on cloud GPU.
- **Privacy & Security**: Never log raw frames, face crops, or biometric PII. Keep `.env`, dataset videos, and `.pt` checkpoints out of version control.
- **Config Sync**: Any change to `configs/config.yaml` must update `src/facehealth/utils/config_manager.py` in the same diff.
- **Ponytail & Caveman Discipline**: Shortest working diff wins. Stdlib before dependencies, zero speculative wrappers, concise communication.

## 5. Release Gate Targets (`MASTER_PLAN.md` v2.0)

| Metric | Release Gate | Stretch |
| :--- | :--- | :--- |
| HR MAE (UBFC-rPPG, classical POS) | <= 2.5 BPM | <= 1.2 BPM |
| HR MAE (PURE motion) | <= 4.0 BPM | <= 2.0 BPM |
| PhysNet HR MAE (UBFC-rPPG) | <= 2.0 BPM | <= 1.4 BPM |
| Primary ONNX HR MAE (UBFC-rPPG) | <= 1.8 BPM | — |
| HRV RMSSD MAE (>= 60 s window) | <= 15.0 ms | <= 6.5 ms |
| Respiration MAE (COHFACE) | <= 2.5 RPM | <= 1.5 RPM |
| Frame Processing Latency | <= 33 ms CPU | <= 10 ms GPU |
