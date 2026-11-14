"""Welch PSD heart-rate estimate."""

from __future__ import annotations

import numpy as np
from scipy.signal import welch

from facehealth.classical.pos_algorithm import pos_stream
from facehealth.quality.sqa_calculator import sqi_from_bvp
from facehealth.utils.config_manager import AppConfig
from facehealth.vital_estimation.filter_bank import bandpass


def estimate_hr_bpm(
    bvp: np.ndarray,
    fs: float,
    band_hz: tuple[float, float] = (0.7, 3.0),
) -> tuple[float | None, float]:
    """Return (hr_bpm or None, confidence 0..1)."""
    if bvp.size < int(fs * 5):
        return None, 0.0
    x = bvp - bvp.mean()
    nperseg = min(len(x), max(64, int(fs * 8)))
    freqs, psd = welch(x, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
    lo, hi = band_hz
    mask = (freqs >= lo) & (freqs <= hi)
    if not np.any(mask):
        return None, 0.0
    f, p = freqs[mask], psd[mask]
    k = int(np.argmax(p))
    # parabolic sub-bin if possible
    if 0 < k < len(p) - 1:
        a, b, c = p[k - 1], p[k], p[k + 1]
        denom = a - 2 * b + c
        delta = 0.5 * (a - c) / denom if abs(denom) > 1e-12 else 0.0
        f_peak = f[k] + delta * (f[1] - f[0] if len(f) > 1 else 0.0)
    else:
        f_peak = float(f[k])
    band_power = float(p.sum()) + 1e-12
    conf = float(np.clip(p[k] / band_power, 0.0, 1.0))
    return 60.0 * float(f_peak), conf


def hr_from_rgb(rgb: np.ndarray, cfg: AppConfig) -> tuple[float | None, float, float]:
    """DC-preserving RGB trace sampled at cfg.sample_rate_hz → (hr_bpm or None, conf, sqi).

    HR is None when the SQI gate fails.
    """
    fs = cfg.sample_rate_hz
    band = cfg.signal.hr_band_hz
    bvp = pos_stream(rgb, win=min(48, len(rgb)))
    bvp_f = bandpass(bvp, fs, band[0], band[1])
    sqi = sqi_from_bvp(bvp_f, fs, band)
    est, conf = estimate_hr_bpm(bvp_f, fs, band)
    return (est if sqi >= cfg.sqi_gate else None), conf, sqi
