# FaceHealth-rPPG: Project Task Plan & Working-Memory Tracker
## Operational Work Breakdown & Real-Time Engineering State (v2.0)

---

### Document Control & Metadata
- **File Name:** `task_plan.md`
- **Associated Master Plan:** [`MASTER_PLAN.md`](MASTER_PLAN.md) **v2.0.0**
- **Target System:** Contactless rPPG Wellness Monitoring (`FaceHealth-rPPG`)
- **Intended Use:** General wellness first (no diagnostic claims)
- **Benchmark Competitors (informative):** Shen.ai (MX Labs) & FaceHeart Vitals™ (FDA K223622 HR / K243966 RR)
- **Current Operational Status:** **M1 walking skeleton live** — webcam → FaceLandmarker → ROI → POS → HR HUD
- **Last Updated:** 2026-10-13 19:00:00 UTC
- **Completion % rule:** `(sum of phase %Done × phase weight) / total`. Design/blueprint does **not** count as code completion.

---

## 1. Executive Status Dashboard

| Metric | Current Value | Target | Status |
| :--- | :--- | :--- | :--- |
| **Total Phases** | 35 (P01–P35) | 35 | Defined in MASTER_PLAN v2 |
| **Core v1 Phases** | See matrix (Tier=Core) | Ship M5 | Pending |
| **Research Backlog Phases** | P13,15,16,18,19,24,35 + P26-advanced | Feature-flagged | Deferred |
| **Phases Completed** | 0 / 35 | 35 | Initializing |
| **Phase in Current Focus** | M0 / Phase 1 Infrastructure | M0 | Active |
| **Overall Implementation Completion** | **~8%** (M0 + M1 skeleton) | 100% | M1 runnable |
| **Primary Code Repository** | `c:\Users\Manas\Desktop\Face_health\` | Clean tree + package layout | Prepared (plans only) |
| **Python / GPU** | 3.12.8 `.venv` / RTX 3050 4 GB | Cloud train for full DL | Confirmed |
| **Master Documentation** | [`MASTER_PLAN.md`](MASTER_PLAN.md) (~1320 lines v2) | Living doc | Complete v2 rewrite |

---

## 2. Granular Phase Status & Tracking Matrix

| Phase | Name | Tier | Milestone | Lead Module | Status | % | Release Gate Metric | Blocked-by |
| :---: | :--- | :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| **P01** | Infra & Environment | Core | M0 | `facehealth/utils/config_manager.py` | `DONE` | 90 | pytest/CI/SOUP; remaining: full pin lock | — |
| **P02** | Datasets & Loaders | Core | M0–M1 | `facehealth/preprocessing/data_loader.py` | `PENDING` | 0 | Registry + subject-wise splits; sync &lt;5 ms | P01, access |
| **P03** | Camera Capture | Core | M1 | `facehealth/capture/video_capture.py` | `DONE` | 70 | Minimal capture; ring buffer later | P01 |
| **P04** | Face Detect (YuNet opt.) | Core opt | M1 | `facehealth/detection/face_detector.py` | `SKIPPED` | — | FaceLandmarker built-in detector used | P01 |
| **P05** | FaceLandmarker 478 | Core | M1 | `facehealth/landmarks/landmark_detector.py` | `DONE` | 70 | VIDEO mode; EMA later | P03 |
| **P06** | ROI & Masking | Core | M1–M2 | `facehealth/roi/roi_extractor.py` | `DONE` | 50 | Basic polygons + mean; adaptive skin later | P05 |
| **P07** | Motion (soft weights) | Core | M2 | `facehealth/preprocessing/motion_tracker.py` | `PENDING` | 0 | PURE talking still estimable | P05–P06 |
| **P08** | Spatial Pooling (DC) | Core | M1 | `facehealth/roi/roi_extractor.py` | `DONE` | 40 | DC mean inlined in ROI for M1 | P06 |
| **P09** | Illumination / Flicker | Core | M2 | `facehealth/preprocessing/detrending.py` | `PENDING` | 0 | Alias notch; CLAHE track-copy only | P08 |
| **P10** | Skin Tone Equity | Core | M2 | `facehealth/preprocessing/equity_report.py` | `PENDING` | 0 | Stratified MAE; no user ITA API | P08–P09 |
| **P11** | POS | Core | M1 | `facehealth/classical/pos_algorithm.py` | `DONE` | 60 | Synthetic HR test; UBFC bench later | P08–P10 |
| **P12** | CHROM/ICA/OMIT/G | Core | M2 | `facehealth/classical/chrom_algorithm.py` | `PENDING` | 0 | UBFC CHROM ≤3.0 (stretch 2.0) | P08–P10 |
| **P13** | EVM viz | **Backlog** | M6 | `facehealth/preprocessing/evm_processor.py` | `DEFERRED` | 0 | Flag off; no SNR claim | — |
| **P14** | PhysNet reference | Core ref | M4 | `facehealth/deep_learning/physnet_model.py` | `PENDING` | 0 | UBFC ≤2.0 (stretch 1.4); cloud train | P02,P10 |
| **P15** | DeepPhys | **Backlog** | M6 | `deepphys_model.py` | `DEFERRED` | 0 | Research only | — |
| **P16** | PhysFormer | **Backlog** | M6 | `physformer_model.py` | `DEFERRED` | 0 | Paper-correct TD-MHSA | — |
| **P17** | Primary ONNX model | Core | M4 | `facehealth/deep_learning/primary_model.py` | `PENDING` | 0 | ONNX parity; UBFC ≤1.8 | P02,P10,ADR |
| **P18** | PHASE-Net | **Backlog** | M6 | `phase_net_model.py` | `DEFERRED` | 0 | Finite-diff PINN research | — |
| **P19** | TTT | **Backlog** | M6 | `ttt_adapter.py` | `DEFERRED` | 0 | PyTorch server only | — |
| **P20** | 3-branch filters | Core | M1–M2 | `facehealth/vital_estimation/filter_bank.py` | `DONE` | 40 | HR band only in M1; morph/resp later | P11+ |
| **P21** | HR Estimation | Core | M1 | `facehealth/vital_estimation/hr_estimator.py` | `DONE` | 50 | Welch + synthetic; dataset bench later | P20 |
| **P22** | HRV + WSI | Core | M3 | `facehealth/vital_estimation/hrv_calculator.py` | `PENDING` | 0 | RMSSD MAE ≤15 ms @≥60s | P20–P21 |
| **P23** | RR (COHFACE) | Core | M3 | `facehealth/vital_estimation/respiration_estimator.py` | `PENDING` | 0 | COHFACE ≤2.5 RPM | P20–P22, COHFACE |
| **P24** | Cuffless BP | **Backlog** | M6 | `bp_estimator.py` | `DEFERRED` | 0 | IEEE 1708 / 81060-3 later | — |
| **P25** | SQA | Core | M1–M2 | `facehealth/quality/sqa_calculator.py` | `PENDING` | 0 | Gate cuts large HR errors | P07,P08,P20,P21 |
| **P26** | PAD core (+ adv backlog) | Core/Backlog | M5/M6 | `facehealth/liveness/` | `PENDING` | 0 | Print/static/vcam suite | P03,P06,P20,P21,P25 |
| **P27** | Pipeline E2E | Core | M1→M5 | `facehealth/pipeline.py` | `DONE` | 40 | `python -m facehealth --live` HUD | Upstream core |
| **P28** | ONNX / edge | Core | M4–M5 | `facehealth/edge/model_exporter.py` | `PENDING` | 0 | Weights &lt;25 MB; ORT budgets | P14,P17,P27 |
| **P29** | SDK & API | Core | M5 | `facehealth/sdk.py` + `api/` | `PENDING` | 0 | wss + auth; FHIR optional | P27,P31,P33 |
| **P30** | Test & Benchmark | Core | M0→ | `facehealth/evaluation/benchmark_suite.py` | `PENDING` | 0 | CI + matrix Release Gates | P01 |
| **P31** | Session & UX | Core | M5 | `facehealth/session/` | `PENDING` | 0 | Timed scan + disclaimer | P25,P27 |
| **P32** | Web Delivery | Core | M5 | `web/` + ORT Web | `PENDING` | 0 | HTTPS; no secrets in FE | P28,P29,P33 |
| **P33** | Security & Privacy | Core | M0→M5 | `docs/threat_model.md` + `api/auth.py` | `PENDING` | 0 | Threat model + secret scan | P01 |
| **P34** | Validation Study | Core | M3→ | `docs/study_protocol.md` | `PENDING` | 0 | In-house held-out gates | Ethics, devices |
| **P35** | SpO2 proxy | **Backlog** | M6 | TBD | `DEFERRED` | 0 | No product claims | — |

**Owner column:** assign when team grows (default: project lead).  
**Effort:** estimate during M0 planning poker; not yet sized.

---

## 3. Active Session Working Memory

### Current Work Focus
- **M1 runnable:** `python -m facehealth --live` (FaceLandmarker + POS + Welch HR HUD).
- MediaPipe installed; model at `models/face_landmarker.task`.
- Tests: 7 passed (config + synthetic POS/HR).

### Immediate Next Steps
1. You: run `--live` and sanity-check HR vs a pulse ox / watch.
2. You: submit dataset access requests (UBFC, PURE, MMPD, COHFACE).
3. Next eng: M2 — motion soft-weights, illumination, CHROM baseline, fuller SQA.

---

## 4. Findings & Architectural Insights Log

| ID | Domain | Finding | Impact |
| :--- | :--- | :--- | :--- |
| **F-001** | Optical Physics | Facial pulsatile AC ~0.5–2% of DC; pooling helps but real noise is correlated → measure ΔSNR, don't assume 44 dB. | P8 verification |
| **F-002** | Equity | Scalar ITA gain cannot fix SNR after POS; MMPD is Fitzpatrick **3–6 only**. | P10 reframed; P34 for I–II |
| **F-003** | Motion | Hard 15°/s reject kills PURE talking/rotation; use soft weights + capped hold. | P7 redesign (**planned**, not implemented) |
| **F-004** | Edge / DL | Custom `mamba-ssm` ≠ ONNX/Windows path; Python RSS ≠ "model &lt;5 MB". | P17/P28 targets clarified |
| **F-005** | PAD | BVP coherence **fails on replay of real video**; need texture + injection detection. | P26 core scope |
| **F-006** | Regulatory / BP | ISO 81060-2 alone wrong for cuffless; use IEEE 1708 / ISO 81060-3 later. FaceHeart predicates are K223622/K243966 not K223847. | P24 backlog; Section 9 |
| **F-007** | Signal DSP | One 0.75–2.5 Hz band breaks harmonics, SQI moments, BP morph, RR. | P20 three branches |
| **F-008** | Classical DSP | POS/CHROM need DC; pre-detrend/z-score before projection is invalid. | P8/P9/P11 order |
| **F-009** | Datasets | PURE has SpO2 not RR; COHFACE has respiration belt; UBFC = 42 videos / C920. | P2/P23 |
| **F-010** | License | Ultralytics AGPL blocked for closed commercial; MMPD non-commercial. | P4/P17/P34 |

---

## 5. Error & Incident Tracking Table

| Incident ID | Phase | Symptom | Root Cause | Status |
| :---: | :--- | :--- | :--- | :--- |
| — | — | No open incidents | — | — |

*(Removed stale ERR-001 / subagent dispatch noise from v1 tracker.)*

---

## 6. Chronological Progress Audit Trail

| Timestamp (UTC) | Phase | Action | Artifact |
| :---: | :---: | :--- | :--- |
| 2026-10-13 17:45 | System | Project initiation | Workspace |
| 2026-10-13 17:48–17:55 | Plan | MASTER_PLAN v1 + task_plan v1 | Docs |
| **2026-10-13 18:25** | **Plan** | **Deep review → MASTER_PLAN v2.0 + task_plan v2.0** | **Both docs + `tasks/todo.md`** |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| Dataset access delayed | High | Blocks benches | Request M0 day-1; synthetic fixtures first |
| MMPD/COHFACE non-commercial | Certain | Can't ship those weights | P34 in-house commercial data |
| 4 GB VRAM train limits | High | Slow DL | Cloud train; local smoke only |
| Windows `mamba-ssm` | High | Build fail | Pure-PyTorch / non-Mamba primary |
| BP/SpO2 claim creep | Med | Regulatory | Feature flags + Section 9 |
| Virtual-cam fraud | High | Trust | P26 injection detection |
| AGPL accidental dep | Med | License breach | SOUP CI check |

---

## 8. Dataset Access Tracker

| Dataset | Requested | Approved | Commercial OK? | Local Path | Notes |
| :--- | :---: | :---: | :---: | :--- | :--- |
| SCAMPS example | Auto | Open | Research only | `data/raw/SCAMPS/` | Download script running / ready |
| UBFC-rPPG | ☐ | ☐ | Research (check) | `data/raw/UBFC-rPPG/` | **Send email today** — main HR set |
| PURE | ☐ | ☐ | Academic only | `data/raw/PURE/` | Needs institutional email |
| MMPD | ☐ | ☐ | **No** | `data/raw/MMPD/` | Faculty + agreement; mini first |
| COHFACE | ☐ | ☐ | **No** | `data/raw/COHFACE/` | Zenodo EULA; for RR |
| UBFC-Phys | ☐ | ☐ | Research | — | Stress/EDA later |
| In-house P34 | ☐ | ☐ | **Yes (owned)** | — | Required for product |

See `docs/datasets/GUIDE.md` + `REQUEST_EMAILS.md`.

---

## 9. Decision Log (ADRs)

| ADR | Decision | Date | Status |
| :--- | :--- | :--- | :--- |
| ADR-001 | Wellness-first intended use | 2026-10-13 | Accepted |
| ADR-002 | Commercial → no Ultralytics AGPL; MediaPipe + optional YuNet | 2026-10-13 | Accepted |
| ADR-003 | Platforms = Python + Web (no native mobile/C++ v1) | 2026-10-13 | Accepted |
| ADR-004 | Core vs Research Backlog split (BP/SpO2/extra DL deferred) | 2026-10-13 | Accepted |
| ADR-005 | Python 3.12 + local 3050 + cloud train | 2026-10-13 | Accepted |
| ADR-006 | Primary DL model choice | — | **Pending M4 bake-off** |
| ADR-007 | Web architecture: on-device ORT vs server uplink | — | **Pending M5** |

---

## 10. Open Questions

1. Prefer on-device ORT Web vs server-side inference for P32 privacy/latency tradeoff?
2. Which peak library baseline — NeuroKit2 vs custom Elgendi?
3. IRB/ethics path for P34 in the user's jurisdiction?
4. Will wellness v1 ship desktop-only first, or web same release?

---

## 11. Milestone Checklist (quick)

- [ ] **M0** Foundation (P01, P30 harness, P33 draft, dataset requests, ADRs)
- [ ] **M1** Minimal E2E HR
- [ ] **M2** Robustness + classical suite
- [ ] **M3** HRV + RR + study start
- [ ] **M4** DL primary + PhysNet + ONNX
- [ ] **M5** Session UX + SDK + Web + security
- [ ] **M6** Research backlog (optional)

---

*End of task_plan.md v2.0*
