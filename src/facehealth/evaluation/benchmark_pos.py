"""
Classical POS/CHROM benchmark.

Works now on synthetic RGB; when UBFC is present, run:
  python -m facehealth.evaluation.benchmark_pos --ubfc data/raw/UBFC-rPPG
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import numpy as np

from facehealth.classical.chrom_algorithm import chrom_stream
from facehealth.classical.pos_algorithm import pos_stream
from facehealth.vital_estimation.filter_bank import bandpass
from facehealth.vital_estimation.hr_estimator import estimate_hr_bpm


def _synthetic_case(
    hr: float = 72.0, fs: float = 30.0, seconds: float = 20.0
) -> tuple[np.ndarray, float]:
    t = np.arange(0, seconds, 1 / fs)
    f = hr / 60.0
    pulse = 0.02 * np.sin(2 * np.pi * f * t)
    rgb = np.stack(
        [120 + 0.3 * pulse * 255, 140 + pulse * 255, 100 + 0.4 * pulse * 255],
        axis=1,
    )
    return rgb, hr


def _eval_method(name: str, bvp: np.ndarray, fs: float, true_hr: float) -> dict[str, Any]:
    bvp_f = bandpass(bvp, fs, 0.7, 3.0)
    est, conf = estimate_hr_bpm(bvp_f, fs, (0.7, 3.0))
    err = abs((est or 0.0) - true_hr) if est is not None else 999.0
    return {"method": name, "true": true_hr, "est": est or -1, "err": err, "conf": conf}


def run_synthetic() -> list[dict[str, Any]]:
    fs = 30.0
    rows = []
    for hr in (60.0, 72.0, 90.0):
        rgb, true = _synthetic_case(hr, fs)
        rows.append(_eval_method("POS", pos_stream(rgb), fs, true))
        rows.append(_eval_method("CHROM", chrom_stream(rgb), fs, true))
    return rows


def run_ubfc(root: Path) -> list[dict[str, Any]]:
    """Minimal UBFC reader: subject*/vid.avi + ground_truth.txt (HR column)."""
    import cv2

    from facehealth.landmarks.landmark_detector import LandmarkDetector
    from facehealth.roi.roi_extractor import fused_mean_rgb, load_roi_indices

    rows: list[dict[str, Any]] = []
    regions = load_roi_indices()
    model = Path("models/face_landmarker.task")
    det = LandmarkDetector(model)
    try:
        for subj in sorted(root.glob("**/subject*")):
            avi = subj / "vid.avi"
            gt = subj / "ground_truth.txt"
            if not avi.is_file() or not gt.is_file():
                continue
            # ground_truth.txt: often rows of PPG, HR — take mean of last column-like HR
            arr = np.loadtxt(gt)
            if arr.ndim == 1:
                true_hr = float(np.mean(arr))
            else:
                true_hr = float(np.mean(arr[:, -1]))

            cap = cv2.VideoCapture(str(avi))
            rgb_list: list[np.ndarray] = []
            i = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                lms = det.detect(frame, i)
                i += 1
                if lms is None:
                    continue
                fused = fused_mean_rgb(frame, lms, regions)
                if fused is None:
                    continue
                rgb_list.append(fused[0])
                if len(rgb_list) >= 300:  # ~10s @30fps
                    break
            cap.release()
            if len(rgb_list) < 150:
                continue
            rgb = np.asarray(rgb_list, dtype=np.float64)
            fs = 30.0
            rows.append(_eval_method(f"POS:{subj.name}", pos_stream(rgb), fs, true_hr))
    finally:
        det.close()
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ubfc", type=Path, default=None)
    args = ap.parse_args()
    rows = run_ubfc(args.ubfc) if args.ubfc else run_synthetic()
    if not rows:
        print("No results — check dataset path")
        raise SystemExit(1)
    print(f"{'method':<16} {'true':>6} {'est':>6} {'err':>6} {'conf':>6}")
    for r in rows:
        print(
            f"{r['method']:<16} {r['true']:6.1f} {r['est']:6.1f} {r['err']:6.2f} {r['conf']:6.2f}"
        )
    mae = float(np.mean([r["err"] for r in rows if r["err"] < 900]))
    print(f"MAE={mae:.2f} BPM over {len(rows)} rows")


if __name__ == "__main__":
    main()
