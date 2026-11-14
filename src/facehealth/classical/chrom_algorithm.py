"""CHROM classical rPPG baseline."""

from __future__ import annotations

import numpy as np


def chrom_window(rgb: np.ndarray) -> np.ndarray:
    """rgb (L,3) DC-preserving → pulse (L,)."""
    if rgb.ndim != 2 or rgb.shape[1] != 3 or rgb.shape[0] < 8:
        raise ValueError("rgb must be (L,3) with L>=8")
    mu = rgb.mean(axis=0)
    mu = np.where(np.abs(mu) < 1e-8, 1e-8, mu)
    cn = rgb / mu - 1.0
    x = 3 * cn[:, 0] - 2 * cn[:, 1]
    y = 1.5 * cn[:, 0] + cn[:, 1] - 1.5 * cn[:, 2]
    alpha = x.std() / (y.std() + 1e-8)
    s = x - alpha * y
    return s - s.mean()


def chrom_stream(rgb: np.ndarray, win: int = 48, hop: int = 1) -> np.ndarray:
    t = len(rgb)
    out = np.zeros(t, dtype=np.float64)
    w = np.hanning(win) if win > 1 else np.ones(1)
    counts = np.zeros(t, dtype=np.float64)
    if t < win:
        return out
    for start in range(0, t - win + 1, hop):
        h = chrom_window(rgb[start : start + win]) * w
        out[start : start + win] += h
        counts[start : start + win] += w
    return out / np.maximum(counts, 1e-8)
