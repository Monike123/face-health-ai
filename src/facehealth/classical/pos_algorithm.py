"""Plane-Orthogonal-to-Skin (POS) pulse extraction."""

from __future__ import annotations

import numpy as np


def pos_window(rgb: np.ndarray) -> np.ndarray:
    """POS on one window. rgb shape (L, 3), DC-preserving. Returns (L,) pulse."""
    if rgb.ndim != 2 or rgb.shape[1] != 3 or rgb.shape[0] < 8:
        raise ValueError("rgb must be (L,3) with L>=8")
    mu = rgb.mean(axis=0)
    mu = np.where(np.abs(mu) < 1e-8, 1e-8, mu)
    cn = rgb / mu - 1.0
    s1 = cn[:, 1] - cn[:, 2]
    s2 = cn[:, 1] + cn[:, 2] - 2.0 * cn[:, 0]
    alpha = s1.std() / (s2.std() + 1e-8)
    h = s1 + alpha * s2
    return h - h.mean()


def pos_stream(rgb: np.ndarray, win: int = 48, hop: int = 1) -> np.ndarray:
    """Overlap-add POS across a longer RGB trace → BVP length T."""
    t = len(rgb)
    out = np.zeros(t, dtype=np.float64)
    w = np.hanning(win) if win > 1 else np.ones(1)
    counts = np.zeros(t, dtype=np.float64)
    if t < win:
        return out
    for start in range(0, t - win + 1, hop):
        h = pos_window(rgb[start : start + win]) * w
        out[start : start + win] += h
        counts[start : start + win] += w
    return out / np.maximum(counts, 1e-8)
