"""Minimal POS → bandpass → Welch HR (parity with facehealth.vital_estimation)."""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, filtfilt, welch

FS = 30.0
BAND = (0.7, 3.0)
SQI_GATE = 0.5


def _pos_window(rgb: np.ndarray) -> np.ndarray:
    mu = rgb.mean(axis=0)
    mu = np.where(np.abs(mu) < 1e-8, 1e-8, mu)
    cn = rgb / mu - 1.0
    s1 = cn[:, 1] - cn[:, 2]
    s2 = cn[:, 1] + cn[:, 2] - 2 * cn[:, 0]
    alpha = float(s1.std() / (s2.std() + 1e-8))
    h = s1 + alpha * s2
    return h - h.mean()


def pos_stream(rgb: np.ndarray, win: int = 48) -> np.ndarray:
    t = len(rgb)
    out = np.zeros(t)
    counts = np.zeros(t)
    if t < win:
        return out
    w = np.hanning(win)
    for start in range(0, t - win + 1):
        h = _pos_window(rgb[start : start + win])
        out[start : start + win] += h * w
        counts[start : start + win] += w
    return out / np.maximum(counts, 1e-8)


def bandpass(x: np.ndarray, fs: float = FS) -> np.ndarray:
    if x.size < 30:
        return x.copy()
    lo, hi = BAND
    b, a = butter(4, [lo / (0.5 * fs), hi / (0.5 * fs)], btype="band")
    return np.asarray(filtfilt(b, a, x))


def estimate_hr(bvp: np.ndarray, fs: float = FS) -> tuple[float | None, float]:
    if bvp.size < int(fs * 5):
        return None, 0.0
    x = bvp - bvp.mean()
    nperseg = min(len(x), max(64, int(fs * 8)))
    freqs, psd = welch(x, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
    lo, hi = BAND
    mask = (freqs >= lo) & (freqs <= hi)
    if not np.any(mask):
        return None, 0.0
    f, p = freqs[mask], psd[mask]
    k = int(np.argmax(p))
    if 0 < k < len(p) - 1:
        a, b_, c = p[k - 1], p[k], p[k + 1]
        denom = a - 2 * b_ + c
        delta = 0.5 * (a - c) / denom if abs(denom) > 1e-12 else 0.0
        f_peak = float(f[k] + delta * (f[1] - f[0] if len(f) > 1 else 0.0))
    else:
        f_peak = float(f[k])
    conf = float(np.clip(p[k] / (p.sum() + 1e-12), 0.0, 1.0))
    return 60.0 * f_peak, conf


def hr_from_rgb(rgb: np.ndarray) -> tuple[float | None, float, float]:
    bvp = pos_stream(rgb, win=min(48, len(rgb)))
    bvp_f = bandpass(bvp)
    hr, conf = estimate_hr(bvp_f)
    sqi = conf
    return (hr if sqi >= SQI_GATE else None), conf, float(sqi)
