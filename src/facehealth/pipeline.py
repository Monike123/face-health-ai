"""M1 walking skeleton: capture → landmarks → ROI → POS → HR HUD."""

from __future__ import annotations

from collections import deque
from pathlib import Path

import cv2
import numpy as np

from facehealth.capture.video_capture import VideoCapture
from facehealth.landmarks.landmark_detector import LandmarkDetector
from facehealth.roi.roi_extractor import fused_mean_rgb, load_roi_indices
from facehealth.utils.config_manager import AppConfig, load_config
from facehealth.utils.logger import get_logger, setup_logging
from facehealth.vital_estimation.hr_estimator import hr_from_rgb

log = get_logger("facehealth.pipeline")


def run_live(
    config_path: str | Path = "configs/config.yaml",
    source: int | str | None = None,
    model_path: str | Path = "models/face_landmarker.task",
) -> None:
    cfg: AppConfig = load_config(config_path if Path(config_path).is_file() else None)
    setup_logging(cfg.log_level)
    cam_src: int | str = source if source is not None else cfg.capture.camera_id
    regions = load_roi_indices()

    rgb_buf: deque[np.ndarray] = deque(maxlen=int(cfg.sample_rate_hz * cfg.analysis_window_s))
    hr_bpm: float | None = None
    hr_conf = 0.0
    sqi = 0.0
    t0_ms: int | None = None

    with VideoCapture(cam_src, cfg.capture.width, cfg.capture.height) as cap:
        det = LandmarkDetector(model_path)
        try:
            log.info("M1 live — press q to quit. Wellness only, not for diagnosis.")
            while True:
                pkt = cap.read()
                if pkt is None:
                    break
                if t0_ms is None:
                    t0_ms = int(pkt.t_host_s * 1000)
                ts = int(pkt.t_host_s * 1000) - t0_ms

                lms = det.detect(pkt.bgr, ts)
                display = pkt.bgr.copy()
                status = "no face"

                if lms is not None:
                    fused = fused_mean_rgb(pkt.bgr, lms, regions)
                    if fused is not None:
                        rgb, n_px, polys = fused
                        rgb_buf.append(rgb)
                        for poly in polys:
                            cv2.polylines(display, [poly], True, (80, 220, 80), 1)
                        status = f"skin_px={n_px}"

                        if len(rgb_buf) >= int(cfg.sample_rate_hz * 5):
                            rgb_arr = np.asarray(rgb_buf, dtype=np.float64)
                            hr_bpm, hr_conf, sqi = hr_from_rgb(rgb_arr, cfg)

                _draw_hud(display, hr_bpm, hr_conf, sqi, status, len(rgb_buf))
                cv2.imshow("FaceHealth M1 (wellness)", display)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            det.close()
            cv2.destroyAllWindows()


def _draw_hud(
    frame: np.ndarray,
    hr: float | None,
    conf: float,
    sqi: float,
    status: str,
    n: int,
) -> None:
    hr_txt = f"HR: {hr:.0f} BPM" if hr is not None else "HR: -- (low SQI)"
    lines = [
        "FaceHealth — wellness only",
        hr_txt + f"  conf={conf:.2f}  sqi={sqi:.2f}",
        f"{status}  buf={n}",
        "q = quit",
    ]
    y = 24
    for line in lines:
        cv2.putText(frame, line, (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 3)
        cv2.putText(frame, line, (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (240, 240, 240), 1)
        y += 22
