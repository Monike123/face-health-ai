"""Runtime config (YAML → Pydantic)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, field_validator


class SignalBands(BaseModel):
    hr_band_hz: tuple[float, float] = (0.7, 3.0)
    morph_band_hz: tuple[float, float] = (0.5, 8.0)
    resp_band_hz: tuple[float, float] = (0.1, 0.7)

    @field_validator("hr_band_hz", "morph_band_hz", "resp_band_hz")
    @classmethod
    def _band(cls, v: tuple[float, float]) -> tuple[float, float]:
        lo, hi = v
        if not 0 < lo < hi:
            raise ValueError(f"bad band {v}")
        return v


class CaptureConfig(BaseModel):
    camera_id: int = 0
    target_fps: float = 30.0
    frame_buffer_seconds: float = Field(default=2.0, ge=1.0, le=3.0)
    width: int = 640
    height: int = 480


class FeaturesConfig(BaseModel):
    # ponytail: backlog flags stay false until their phases land
    evm: bool = False
    deepphys: bool = False
    physformer: bool = False
    phase_net: bool = False
    ttt: bool = False
    blood_pressure: bool = True  # ADR-004 pitch demo
    spo2: bool = True
    advanced_pad: bool = False


class AppConfig(BaseModel):
    app_name: str = "FaceHealth-rPPG"
    intended_use: Literal["wellness"] = "wellness"
    log_level: str = "INFO"
    sample_rate_hz: float = 30.0
    analysis_window_s: float = 10.0
    update_stride_s: float = 1.0
    sqi_gate: float = Field(default=0.5, ge=0.0, le=1.0)
    capture: CaptureConfig = Field(default_factory=CaptureConfig)
    signal: SignalBands = Field(default_factory=SignalBands)
    features: FeaturesConfig = Field(default_factory=FeaturesConfig)
    extractor: Literal["pos", "chrom", "primary_onnx"] = "pos"


def load_config(path: str | Path | None = None) -> AppConfig:
    if path is None:
        return AppConfig()
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError(f"config not found: {p}")
    raw: Any = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ValueError("config root must be a mapping")
    return AppConfig.model_validate(raw)
