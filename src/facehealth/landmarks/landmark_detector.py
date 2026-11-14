"""MediaPipe Tasks FaceLandmarker (VIDEO mode)."""

from __future__ import annotations

from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core import base_options as base_options_module

DEFAULT_MODEL = Path("models/face_landmarker.task")


class LandmarkDetector:
    def __init__(self, model_path: str | Path = DEFAULT_MODEL) -> None:
        path = Path(model_path)
        if not path.is_file():
            raise FileNotFoundError(
                f"FaceLandmarker model missing: {path}. "
                "Download face_landmarker.task into models/."
            )
        opts = vision.FaceLandmarkerOptions(
            base_options=base_options_module.BaseOptions(model_asset_path=str(path)),
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            output_facial_transformation_matrixes=True,
        )
        self._lm = vision.FaceLandmarker.create_from_options(opts)

    def detect(self, bgr: np.ndarray, timestamp_ms: int) -> np.ndarray | None:
        """Return Nx3 float landmarks in pixel coords, or None."""
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._lm.detect_for_video(mp_image, timestamp_ms)
        if not result.face_landmarks:
            return None
        h, w = bgr.shape[:2]
        face = result.face_landmarks[0]
        return np.array([[lm.x * w, lm.y * h, lm.z * w] for lm in face], dtype=np.float32)

    def close(self) -> None:
        self._lm.close()
