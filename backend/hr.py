"""POS / CHROM / Green → bandpass → FFT SQI → Welch HR (web rppg.ts parity).

Always publish a band BPM after enough samples; Low confidence when weak.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, filtfilt, welch

FS = 30.0
BAND = (0.7, 3.0)  # ~42–180 BPM
SQI_GATE = 0.45
SQI_SOFT = 0.3


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


def _chrom_window(rgb: np.ndarray) -> np.ndarray:
    mu = rgb.mean(axis=0)
    mu = np.where(np.abs(mu) < 1e-8, 1e-8, mu)
    cn = rgb / mu - 1.0
    x = 3 * cn[:, 0] - 2 * cn[:, 1]
    y = 1.5 * cn[:, 0] + cn[:, 1] - 1.5 * cn[:, 2]
    alpha = float(x.std() / (y.std() + 1e-8))
    s = x - alpha * y
    return s - s.mean()


def chrom_stream(rgb: np.ndarray, win: int = 48) -> np.ndarray:
    t = len(rgb)
    out = np.zeros(t)
    counts = np.zeros(t)
    if t < win:
        return out
    w = np.hanning(win)
    for start in range(0, t - win + 1):
        h = _chrom_window(rgb[start : start + win])
        out[start : start + win] += h * w
        counts[start : start + win] += w
    return out / np.maximum(counts, 1e-8)


def green_stream(rgb: np.ndarray) -> np.ndarray:
    g = rgb[:, 1]
    return g - g.mean()


def bandpass(x: np.ndarray, fs: float = FS) -> np.ndarray:
    if x.size < 30:
        return x.copy()
    lo, hi = BAND
    b, a = butter(4, [lo / (0.5 * fs), hi / (0.5 * fs)], btype="band")
    return np.asarray(filtfilt(b, a, x))


def sqi_fft(bvp: np.ndarray, fs: float = FS) -> float:
    """Full-trace FFT peak/band — matches Python sqa_calculator / web rppg.ts."""
    if bvp.size < int(fs * 4):
        return 0.0
    x = bvp - bvp.mean()
    spec = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(len(x), d=1.0 / fs)
    lo, hi = BAND
    mask = (freqs >= lo) & (freqs <= hi)
    if not np.any(mask):
        return 0.0
    band = spec[mask]
    return float(np.clip(band.max() / (band.sum() + 1e-12), 0.0, 1.0))


def estimate_hr(bvp: np.ndarray, fs: float = FS) -> tuple[float | None, float]:
    if bvp.size < int(fs * 3):
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


def force_band_hr(bvp: np.ndarray, fs: float = FS) -> tuple[float, float]:
    """Argmax power in band even at low peakRatio (always-publish)."""
    x = bvp - bvp.mean()
    if float(x.std()) < 1e-8:
        return 72.0, 0.05
    spec = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(len(x), d=1.0 / fs)
    lo, hi = BAND
    mask = (freqs >= lo) & (freqs <= hi)
    if not np.any(mask):
        return 72.0, 0.05
    band_f, band_p = freqs[mask], spec[mask]
    k = int(np.argmax(band_p))
    hr = float(60.0 * band_f[k])
    conf = float(np.clip(band_p[k] / (band_p.sum() + 1e-12), 0.05, 1.0))
    return float(np.clip(hr, 45.0, 180.0)), conf


def hr_from_rgb(rgb: np.ndarray) -> tuple[float | None, float, float]:
    """Return (hr_bpm, conf, sqi). Always publishes band BPM when rgb is long enough."""
    if len(rgb) < 30:
        return 72.0, 0.1, 0.0
    win = min(48, len(rgb))
    candidates: list[tuple[np.ndarray, float, float | None, float]] = []
    for raw in (pos_stream(rgb, win), chrom_stream(rgb, win), green_stream(rgb)):
        bvp_f = bandpass(raw)
        sqi = sqi_fft(bvp_f)
        hr, conf = estimate_hr(bvp_f)
        candidates.append((bvp_f, sqi, hr, conf))
    candidates.sort(key=lambda c: c[1], reverse=True)
    bvp_f, sqi, hr, conf = candidates[0]
    if hr is None or hr < 45 or hr > 180 or sqi < SQI_SOFT:
        hr, conf = force_band_hr(bvp_f)
    hr = float(np.clip(hr, 45.0, 180.0))
    return hr, float(conf), float(sqi)
