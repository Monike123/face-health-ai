"""Generate web/lib/__fixtures__/golden.json from the Python HR path."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from facehealth.utils.config_manager import load_config
from facehealth.vital_estimation.hr_estimator import hr_from_rgb

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "lib" / "__fixtures__" / "golden.json"
HR = 72.0
FS = 30.0
SECONDS = 30.0


def main() -> None:
    rng = np.random.default_rng(0)
    n = int(SECONDS * FS)
    t = np.arange(n) / FS
    pulse = 0.02 * np.sin(2 * np.pi * HR / 60.0 * t)
    rgb = np.stack(
        [120 + 0.3 * pulse * 255, 140 + pulse * 255, 100 + 0.4 * pulse * 255],
        axis=1,
    )
    rgb += rng.normal(0, 0.15, rgb.shape)
    cfg = load_config(ROOT / "configs" / "config.yaml")
    hr, conf, sqi = hr_from_rgb(rgb, cfg)
    assert hr is not None, "synthetic should recover HR"
    payload = {
        "t_ms": (t * 1000.0).tolist(),
        "rgb": rgb.tolist(),
        "hr_bpm": float(hr),
        "confidence": float(conf),
        "sqi": float(sqi),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    print(f"wrote {OUT} hr={hr:.2f}")


if __name__ == "__main__":
    main()
