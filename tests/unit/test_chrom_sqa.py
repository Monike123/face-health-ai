import numpy as np

from facehealth.classical.chrom_algorithm import chrom_stream
from facehealth.quality.sqa_calculator import sqi_from_bvp
from facehealth.vital_estimation.filter_bank import bandpass
from facehealth.vital_estimation.hr_estimator import estimate_hr_bpm


def test_chrom_hr() -> None:
    fs, hr = 30.0, 72.0
    t = np.arange(0, 20, 1 / fs)
    pulse = 0.02 * np.sin(2 * np.pi * (hr / 60) * t)
    rgb = np.stack(
        [120 + 0.3 * pulse * 255, 140 + pulse * 255, 100 + 0.4 * pulse * 255], axis=1
    )
    bvp = bandpass(chrom_stream(rgb), fs, 0.7, 3.0)
    est, _ = estimate_hr_bpm(bvp, fs)
    assert est is not None
    assert abs(est - hr) < 3.0
    assert sqi_from_bvp(bvp, fs) > 0.15
