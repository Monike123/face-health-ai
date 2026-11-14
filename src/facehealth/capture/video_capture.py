"""Minimal webcam / video-file capture."""

from __future__ import annotations

import time
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class FramePacket:
    bgr: np.ndarray
    t_host_s: float
    index: int


class VideoCapture:
    def __init__(self, source: int | str = 0, width: int = 640, height: int = 480) -> None:
        self._cap = cv2.VideoCapture(source)
        if isinstance(source, int):
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            self._cap.set(cv2.CAP_PROP_FPS, 30)
        if not self._cap.isOpened():
            raise RuntimeError(f"cannot open capture source: {source}")
        self._i = 0

    def read(self) -> FramePacket | None:
        ok, frame = self._cap.read()
        if not ok or frame is None:
            return None
        pkt = FramePacket(bgr=frame, t_host_s=time.perf_counter(), index=self._i)
        self._i += 1
        return pkt

    def release(self) -> None:
        self._cap.release()

    def __enter__(self) -> VideoCapture:
        return self

    def __exit__(self, *args: object) -> None:
        self.release()
