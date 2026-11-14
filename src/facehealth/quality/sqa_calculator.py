"""Minimal signal quality index for M1/M2 gating."""

from __future__ import annotations

import numpy as np


def sqi_from_bvp(bvp: np.ndarray, fs: float, band_hz: tuple[float, float] = (0.7, 3.0)) -> float:
    """
    Cheap SQI in [0,1]: spectral peak prominence in HR band.
    Not the full logistic classifier — good enough to gate HUD.
    """
    if bvp.size < int(fs * 4):
        return 0.0
    x = bvp - np.mean(bvp)
    spec = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(x.size, d=1.0 / fs)
    lo, hi = band_hz
    mask = (freqs >= lo) & (freqs <= hi)
    if not np.any(mask):
        return 0.0
    band = spec[mask]
    total = float(band.sum()) + 1e-12
    peak = float(band.max())
    return float(np.clip(peak / total, 0.0, 1.0))
