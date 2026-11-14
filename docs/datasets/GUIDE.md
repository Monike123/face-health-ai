# FaceHealth — Open / Research Dataset Guide

**Order of operations:** request access → download → verify → organize → classical POS benchmark → (later) DL train.

Commercial product weights must eventually come from **licensed / in-house** data (Phase 34). Research sets below are for development & papers.

---

## Recommended set (what to get, and why)

| Priority | Dataset | Size (approx) | Ground truth | Best for | Access | Commercial ship? |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | **UBFC-rPPG** (DATASET_2) | ~20–75 GB | PPG + HR @ CMS50E | Main HR benchmark | Free research link / contact / Kaggle mirrors | Research — check terms |
| **2** | **PURE** | ~tens of GB | PPG + SpO2 @ 60 Hz | Motion robustness | Academic email request only | Research / academic only |
| **3** | **COHFACE** | large | BVP + **respiration belt** | RR (breathing) | Zenodo restricted EULA | **No** (non-commercial) |
| **4** | **MMPD** (mini 48 GB first) | 48 / 370 GB | PPG | Skin tone 3–6, phone, motion | Faculty email + agreement | **No** (banned) |
| **5** | **SCAMPS** (example 1.2 GB → full optional) | 1.2 GB / 600 GB | Synthetic PPG + breathing | Pipeline / DL smoke train | **Open direct HTTP** | Research use; commercial prohibited |
| Later | UBFC-Phys | — | BVP + EDA | Stress / motion | Contact authors | Research |
| Later | MR-NIRP Indoor | smaller | PPG | Extra open RGB(+NIR) bench | Often open from Rice | Check site |

### Do **not** use for
- **PURE → respiration rate** (no breath belt)
- **MMPD → Fitzpatrick I–II equity** (only types 3–6)
- **MIMIC-III → face-video BP** (contact ICU PPG, not face)

---

## Step-by-step process

### A. Today (no approval needed)
1. Download **SCAMPS example** (10 videos, ~1.2 GB) via our script.
2. Create empty folders for UBFC / PURE / COHFACE / MMPD.
3. Send access emails (templates in `REQUEST_EMAILS.md`).

### B. When UBFC arrives (highest value)
1. Unpack under `data/raw/UBFC-rPPG/` as `subjectN/vid.avi` + `ground_truth.txt`.
2. Run `python scripts/datasets/verify_dataset.py --name ubfc`.
3. Next eng step: POS benchmark MAE on all 42 subjects.

### C. When PURE arrives
Motion subsets for Release Gate / Stretch HR.

### D. When COHFACE arrives
Respiration (Phase 23) only.

### E. MMPD (optional research)
Equity experiments only — never train shippable commercial weights on it alone.

---

## Official entry points

| Dataset | Where to start |
| :--- | :--- |
| UBFC-rPPG | https://sites.google.com/view/ybenezeth/ubfcrppg — contact `yannick.benezeth@u-bourgogne.fr` if link missing |
| PURE | https://www.tu-ilmenau.de/…/pulse-rate-detection-dataset-pure — `nikr-datasets-request@tu-ilmenau.de` (**academic email required**) |
| COHFACE | https://zenodo.org/records/4081054 — request access (non-commercial EULA) |
| MMPD | https://github.com/McJackTang/MMPD_rPPG_dataset — sign agreement → faculty email |
| SCAMPS | https://github.com/danmcduff/scampsdataset — direct Azure blob URLs |

---

## Disk budget (plan ahead)

| Bundle | Disk |
| :--- | ---: |
| SCAMPS example | ~1.5 GB |
| UBFC-rPPG | ~30–80 GB |
| PURE | ~20–40 GB (typical) |
| COHFACE | ~10–30 GB (typical) |
| MMPD mini | ~50 GB |
| MMPD full | ~370 GB |
| SCAMPS full | ~600 GB |

**Suggested minimum for FaceHealth M2–M4:** SCAMPS example + UBFC + PURE ≈ **50–120 GB**.
