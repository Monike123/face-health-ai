# FaceHealth-rPPG

Contactless wellness vital-sign estimation from face video using classical rPPG (POS/CHROM) + deep learning (PhysNet/ONNX primary). Python 3.12 + MediaPipe + OpenCV + PyTorch + FastAPI. **Wellness only — no diagnostic claims.**

---

## Build & Run Commands

```powershell
# Activate
cd C:\Users\Manas\Desktop\Face_health
.\.venv\Scripts\Activate.ps1

# Install (core)
pip install -e ".[dev]"

# Install (ML — torch, mediapipe, onnxruntime)
pip install -e ".[ml]"

# Run live M1 HUD (webcam → face → POS → HR)
python -m facehealth --live

# Version check
python -m facehealth --version

# Lint
ruff check src tests

# Type check
mypy src/facehealth

# Tests
pytest -q

# Smoke train PhysNet (synthetic, no dataset needed)
python -m facehealth.deep_learning.train_physnet --epochs 3

# Classical benchmark
python -m facehealth.evaluation.benchmark_pos
```

---

## Architecture & File Structure

```
Face_health/
├── configs/config.yaml           # Pydantic-validated runtime config (YAML)
├── data/
│   ├── raw/                      # UBFC, PURE, COHFACE, MMPD, SCAMPS (gitignored)
│   ├── processed/                # Preprocessed HDF5/memmap
│   └── ground_truth/             # GT PPG/HR aligned
├── docs/
│   ├── datasets/                 # GUIDE.md, REQUEST_EMAILS.md
│   └── adr/                      # Architecture Decision Records
├── models/
│   ├── face_landmarker.task      # MediaPipe FaceLandmarker model
│   ├── checkpoints/              # PyTorch .pt (gitignored)
│   └── onnx/                     # Exported ONNX models
├── scripts/datasets/             # Download/verify scripts
├── src/facehealth/               # Main package (setuptools, src layout)
│   ├── __main__.py               # CLI: --live, --version, --config
│   ├── pipeline.py               # M1 live HUD: capture → landmarks → ROI → POS → HR
│   ├── api/                      # FastAPI (M5, stub)
│   ├── capture/                  # VideoCapture, frame buffer, timestamps
│   │   └── video_capture.py      # Threaded UVC capture w/ host timestamps
│   ├── classical/                # POS, CHROM, ICA, OMIT extractors
│   │   ├── pos_algorithm.py      # POS with OLA (DC-preserving)
│   │   └── chrom_algorithm.py    # CHROM baseline
│   ├── deep_learning/            # PhysNet, primary model, training
│   │   ├── physnet_model.py      # 3D CNN: (B,3,T,128,128) → (B,T)
│   │   ├── train_physnet.py      # Smoke/full trainer
│   │   ├── losses.py             # NegPearson + frequency loss
│   │   └── synthetic_dataset.py  # Fake sine BVP for smoke tests
│   ├── detection/                # Optional YuNet face detector (stub)
│   ├── edge/                     # ONNX export (M4–M5, stub)
│   ├── evaluation/               # Benchmark harnesses
│   ├── landmarks/                # MediaPipe FaceLandmarker wrapper
│   │   └── landmark_detector.py  # 478-point mesh, VIDEO mode
│   ├── liveness/                 # PAD/anti-spoofing (stub)
│   ├── preprocessing/            # Motion, illumination, detrending (stubs for M2)
│   ├── quality/                  # SQA calculator (PI, SNR, skew, kurtosis)
│   │   └── sqa_calculator.py     # SQI from BVP signal
│   ├── roi/                      # Forehead + bilateral malar ROI extraction
│   │   └── roi_extractor.py      # Polygon fill + SNR-weighted fusion
│   ├── session/                  # Session state machine (M5, stub)
│   ├── signal_extraction/        # Spatial pooler, signal buffer (stub)
│   ├── utils/
│   │   ├── config_manager.py     # Pydantic v2: AppConfig, SignalBands, etc.
│   │   └── logger.py             # stdlib logging, no PII, no raw frames
│   └── vital_estimation/         # HR, HRV, RR estimators + filter bank
│       ├── hr_estimator.py       # Welch PSD → peak tracking → BPM
│       └── filter_bank.py        # Butterworth bandpass (3 configured bands)
├── tests/
│   ├── unit/                     # test_config, test_logger, test_pos_hr, test_physnet, test_chrom
│   ├── integration/              # (empty, future)
│   └── fixtures/                 # Test data (gitignored large files)
├── tasks/todo.md                 # Working checklist
├── MASTER_PLAN.md                # v2.0 — 35 phases, M0–M6 milestones
├── task_plan.md                  # v2.0 — phase matrix, status tracker
├── STATUS.md                     # Have vs Remaining quick ref
├── pyproject.toml                # setuptools + ruff + mypy + pytest config
├── requirements.txt              # Frozen pins
├── Dockerfile                    # Container build
└── .github/workflows/ci.yml     # Lint + mypy + pytest + secret scan
```

### Signal Flow (how data moves)

```
Webcam → VideoCapture (host timestamps)
  → LandmarkDetector (MediaPipe 478-point mesh)
    → ROI Extractor (forehead/L-malar/R-malar polygons, DC-preserving mean RGB)
      → POS/CHROM projection (classical) OR PhysNet/Primary (DL)
        → BVP signal
          → 3 filter branches: HR [0.7–3.0 Hz], Morph [0.5–8.0 Hz], Resp [0.1–0.7 Hz]
            → SQA gate (SQI ≥ 0.50 to emit)
              → HR (Welch PSD), HRV (future), RR (future)
```

---

## Current State & What's Next

| What | Status |
|:---|:---|
| M0 Foundation (scaffold, config, CI, docs) | ✅ Done |
| M1 Live HR (webcam → POS → HR HUD) | ✅ Done (7 tests pass) |
| PhysNet code + synthetic smoke train | ✅ Code written, no real data yet |
| SCAMPS example data | ✅ Downloaded (~1.2 GB) |
| **UBFC/PURE/COHFACE datasets** | ❌ **Blocked: user must request access** |
| PyTorch install | ⚠️ May need re-install |
| M2 Robustness (motion, illumination, CHROM) | ❌ Not started |
| M3 HRV + RR | ❌ Not started |
| M4 DL training on real data | ❌ Blocked on datasets + cloud GPU |
| M5 SDK/Web/Security | ❌ Not started |

### Critical path right now
1. User sends UBFC dataset request email (template in `docs/datasets/REQUEST_EMAILS.md`)
2. Finish PyTorch install → run smoke train
3. When UBFC arrives → classical POS benchmark (MAE target ≤ 2.5 BPM)
4. Then M2: motion weights, illumination, CHROM suite

---

## Code Style & Rules

- **Python 3.12+** — use `from __future__ import annotations`, modern type syntax
- **Strict mypy** — `disallow_untyped_defs = true`, `check_untyped_defs = true`
- **Ruff** — line length 100, rules: E, F, I, UP, B
- **Pydantic v2** for all config/validation — never raw dicts for config
- **src layout** — all code under `src/facehealth/`, imports as `from facehealth.x import y`
- **No AGPL deps** — Ultralytics/YOLO banned. Use MediaPipe (Apache-2.0) + OpenCV YuNet
- **DC-preserving pooling** — never z-score/detrend RGB before POS/CHROM projection. Detrend the BVP *after*
- **Three signal branches** — HR band, Morphology band, Respiration band. Configured in `config.yaml`, not hardcoded
- **Feature flags** — backlog features (EVM, DeepPhys, PhysFormer, BP, SpO2) behind `features.*: false`
- **Never log raw frames or PII** — logger outputs metadata only
- **Proprietary license** — do not ship research-only dataset weights (MMPD, COHFACE) in product
- **One OpenCV install** — `opencv-python` for dev (GUI), `opencv-python-headless` for server. Never both
- **Test pattern** — pytest, fixtures in `tests/fixtures/`. Synthetic data for smoke tests. Real benchmarks require datasets

---

## Workflow & Stop Conditions

1. **Always run `pytest -q` before completing any task.** Green = ship. Red = fix first
2. **Always run `ruff check src tests` and `mypy src/facehealth`** — zero errors policy
3. **Do not train production model weights on non-commercial datasets** (MMPD, COHFACE). Use for research eval only
4. **Do not add diagnostic/medical claims** — this is wellness only (ADR-001). No "this diagnoses X"
5. **Do not modify config schema without updating `config.yaml` + `config_manager.py` together** — they must stay in sync
6. **Do not add dependencies without checking license** — no AGPL in product path. Update SOUP register
7. **Dataset access is a user action** — do not attempt to download gated datasets. Provide email templates only
8. **Cloud GPU for full DL training** — RTX 3050 (4 GB) is smoke-test only. Use AMP + small batch locally
9. **Subject-wise splits only** — zero subject overlap between train/val/test. Never leak identity
10. **Secret scan before any push** — CI checks for API keys, private keys, sk-* tokens
11. **Read MASTER_PLAN.md for phase details** — it's the source of truth for architecture decisions, math, and verification criteria
12. **Read task_plan.md §3 for current work focus** — it tracks what's done, what's next, what's blocked
13. **Milestone order: M0 → M1 → M2 → M3 → M4 → M5 → M6** — do not skip ahead. Classical baselines before DL
14. **Ponytail rules active** — shortest working diff wins. No speculative abstractions. Reuse before rewrite. Stdlib before deps

---

## Key Files to Read First

| File | Why |
|:---|:---|
| [`MASTER_PLAN.md`](MASTER_PLAN.md) | Full engineering spec: 35 phases, math, architecture, verification gates |
| [`task_plan.md`](task_plan.md) | Phase status matrix, risk register, ADRs, dataset tracker |
| [`STATUS.md`](STATUS.md) | Quick "have vs remaining" reference |
| [`configs/config.yaml`](configs/config.yaml) | Runtime defaults — all signal bands, feature flags, capture params |
| [`src/facehealth/pipeline.py`](src/facehealth/pipeline.py) | M1 live loop — the actual running code path |
| [`src/facehealth/utils/config_manager.py`](src/facehealth/utils/config_manager.py) | Pydantic config models — read before changing any config |
| [`tasks/todo.md`](tasks/todo.md) | Working checklist with user-blocked items |

---

## Release Gate Targets (from MASTER_PLAN v2)

| Metric | Release Gate | Stretch |
|:---|:---|:---|
| HR MAE (UBFC) | ≤ 2.5 BPM | ≤ 1.2 BPM |
| HR MAE (PURE motion) | ≤ 4.0 BPM | ≤ 2.0 BPM |
| HRV RMSSD MAE | ≤ 15 ms (≥60s window) | ≤ 6.5 ms |
| RR MAE (COHFACE) | ≤ 2.5 RPM | ≤ 1.5 RPM |
| Per-frame latency | ≤ 33 ms CPU | ≤ 10 ms GPU |
| PhysNet UBFC MAE | ≤ 2.0 BPM | ≤ 1.4 BPM |
| Primary ONNX UBFC MAE | ≤ 1.8 BPM | — |
