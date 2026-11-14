"""Shared bandpass helpers."""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, filtfilt


def bandpass(x: np.ndarray, fs: float, lo: float, hi: float, order: int = 4) -> np.ndarray:
    if x.size < max(30, 3 * order):
        return x.copy()
    nyq = 0.5 * fs
    b, a = butter(order, [lo / nyq, hi / nyq], btype="band")
    return np.asarray(filtfilt(b, a, x))
