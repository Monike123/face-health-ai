"""Synthetic pulse → POS → HR should recover ~72 BPM."""

import numpy as np

from facehealth.classical.pos_algorithm import pos_stream, pos_window
from facehealth.vital_estimation.filter_bank import bandpass
from facehealth.vital_estimation.hr_estimator import estimate_hr_bpm


def _synthetic_rgb(fs: float = 30.0, seconds: float = 20.0, hr_bpm: float = 72.0) -> np.ndarray:
    t = np.arange(0, seconds, 1.0 / fs)
    f = hr_bpm / 60.0
    # small green-dominant pulsatile AC on large DC
    pulse = 0.02 * np.sin(2 * np.pi * f * t)
    r = 120 + 0.3 * pulse * 255
    g = 140 + 1.0 * pulse * 255
    b = 100 + 0.4 * pulse * 255
    return np.stack([r, g, b], axis=1)


def test_pos_window_shape() -> None:
    rgb = _synthetic_rgb(seconds=2.0)
    h = pos_window(rgb[:48])
    assert h.shape == (48,)
    assert np.isfinite(h).all()


def test_hr_recovers_synthetic() -> None:
    fs = 30.0
    true_hr = 72.0
    rgb = _synthetic_rgb(fs=fs, seconds=20.0, hr_bpm=true_hr)
    bvp = pos_stream(rgb, win=48, hop=1)
    bvp_f = bandpass(bvp, fs, 0.7, 3.0)
    hr, conf = estimate_hr_bpm(bvp_f, fs, (0.7, 3.0))
    assert hr is not None
    assert abs(hr - true_hr) < 3.0
    assert conf > 0.1
