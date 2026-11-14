"""Web backend: browser ROI mean-RGB trace → classical POS heart rate (wellness only)."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Annotated, Literal

import numpy as np
from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field, model_validator

from facehealth import __version__
from facehealth.api.auth import require_user
from facehealth.utils.config_manager import load_config
from facehealth.utils.logger import get_logger
from facehealth.vital_estimation.hr_estimator import hr_from_rgb

DISCLAIMER = "Wellness estimate only. Not a medical device."
_CFG = Path(__file__).resolve().parents[3] / "configs" / "config.yaml"
cfg = load_config(_CFG if _CFG.is_file() else None)
log = get_logger("facehealth.api")

app = FastAPI(title="FaceHealth AI", docs_url=None, redoc_url=None, openapi_url=None)


class ScanRequest(BaseModel):
    t_ms: list[float] = Field(min_length=300, max_length=2400)
    rgb: list[tuple[float, float, float]] = Field(min_length=300, max_length=2400)

    @model_validator(mode="after")
    def _check(self) -> ScanRequest:
        t = np.asarray(self.t_ms)
        x = np.asarray(self.rgb)
        if t.size != len(x):
            raise ValueError("t_ms and rgb must have the same length")
        if not (np.isfinite(t).all() and np.isfinite(x).all()):
            raise ValueError("values must be finite")
        if np.any(np.diff(t) <= 0):
            raise ValueError("t_ms must be strictly increasing")
        span_s = (t[-1] - t[0]) / 1000.0
        if not 20.0 <= span_s <= 40.0:
            raise ValueError("scan must last 20-40 s")
        if t.size / span_s < 10.0:
            raise ValueError("frame rate below 10 fps")
        if x.min() < 0.0 or x.max() > 255.0:
            raise ValueError("rgb values must be in [0, 255]")
        return self


class ScanResponse(BaseModel):
    hr_bpm: float | None
    confidence: float
    sqi: float
    quality: Literal["good", "low"]
    message: str
    disclaimer: str = DISCLAIMER


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/api/v1/scan")
def scan(req: ScanRequest, _user: Annotated[str, Depends(require_user)]) -> ScanResponse:
    t0 = time.perf_counter()
    t = (np.asarray(req.t_ms) - req.t_ms[0]) / 1000.0
    x = np.asarray(req.rgb, dtype=np.float64)
    # Browsers deliver jittery frame times; POS/Welch assume a uniform grid.
    grid = np.arange(0.0, t[-1], 1.0 / cfg.sample_rate_hz)
    rgb = np.column_stack([np.interp(grid, t, x[:, c]) for c in range(3)])
    hr, conf, sqi = hr_from_rgb(rgb, cfg)
    log.info(
        "scan n=%d span=%.1fs sqi=%.2f ok=%s ms=%.0f",
        len(t), t[-1], sqi, hr is not None, (time.perf_counter() - t0) * 1000,
    )
    if hr is None:
        return ScanResponse(
            hr_bpm=None, confidence=conf, sqi=sqi, quality="low",
            message="Signal too weak. Sit still in even light, face the camera, and retry.",
        )
    return ScanResponse(
        hr_bpm=round(hr, 1), confidence=conf, sqi=sqi, quality="good", message="Estimate ready."
    )
