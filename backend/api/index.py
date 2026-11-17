"""Vercel Python entry — FastAPI scan/health (no torch/opencv)."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

# Allow `from hr import ...` when running from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from hr import FS, hr_from_rgb  # noqa: E402

DISCLAIMER = "Wellness estimate only. Not a medical device."

app = FastAPI(title="FaceHealth API", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://face-health-ai.vercel.app", "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    t_ms: list[float] = Field(min_length=120, max_length=3600)
    rgb: list[tuple[float, float, float]] = Field(min_length=120, max_length=3600)

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
        if not 20.0 <= span_s <= 95.0:
            raise ValueError("scan must last 20-95 s")
        if t.size / span_s < 3.0:
            raise ValueError("frame rate below 3 fps")
        if x.min() < 0.0 or x.max() > 255.0:
            raise ValueError("rgb values must be in [0, 255]")
        return self


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.2.0"}


@app.post("/api/v1/scan")
def scan(req: ScanRequest) -> dict[str, Any]:
    t = (np.asarray(req.t_ms) - req.t_ms[0]) / 1000.0
    x = np.asarray(req.rgb, dtype=np.float64)
    grid = np.arange(0.0, float(t[-1]), 1.0 / FS)
    rgb = np.column_stack([np.interp(grid, t, x[:, c]) for c in range(3)])
    hr, conf, sqi = hr_from_rgb(rgb)
    if hr is None:
        return {
            "hr_bpm": None,
            "confidence": conf,
            "sqi": sqi,
            "quality": "low",
            "message": "Signal too weak. Sit still in even light, face the camera, and retry.",
            "disclaimer": DISCLAIMER,
        }
    return {
        "hr_bpm": round(float(hr), 1),
        "confidence": conf,
        "sqi": sqi,
        "quality": "good",
        "message": "Estimate ready.",
        "disclaimer": DISCLAIMER,
    }
