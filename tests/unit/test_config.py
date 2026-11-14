from pathlib import Path

import pytest
from pydantic import ValidationError

from facehealth.utils.config_manager import AppConfig, SignalBands, load_config

ROOT = Path(__file__).resolve().parents[2]


def test_defaults() -> None:
    cfg = AppConfig()
    assert cfg.intended_use == "wellness"
    assert cfg.signal.hr_band_hz == (0.7, 3.0)
    assert cfg.features.blood_pressure is False


def test_yaml() -> None:
    cfg = load_config(ROOT / "configs" / "config.yaml")
    assert cfg.extractor == "pos"
    assert cfg.signal.resp_band_hz == (0.1, 0.7)


def test_bad_band() -> None:
    with pytest.raises(ValidationError):
        SignalBands(hr_band_hz=(3.0, 0.7))


def test_missing() -> None:
    with pytest.raises(FileNotFoundError):
        load_config(ROOT / "configs" / "nope.yaml")
