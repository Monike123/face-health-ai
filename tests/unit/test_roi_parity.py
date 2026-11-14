"""Browser ROI indices (web/lib/roi.ts) must match configs/landmark_config.yaml."""

import re
from pathlib import Path

from facehealth.roi.roi_extractor import load_roi_indices

ROOT = Path(__file__).resolve().parents[2]


def test_web_roi_matches_python() -> None:
    ts = (ROOT / "web" / "lib" / "roi.ts").read_text(encoding="utf-8")
    web = {k: [int(i) for i in v.split(",")] for k, v in re.findall(r"(\w+): \[([\d, ]+)\]", ts)}
    assert web == load_roi_indices(ROOT / "configs" / "landmark_config.yaml")
