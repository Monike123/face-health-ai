"""Polygon ROI masks + DC-preserving mean RGB."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np
import yaml


def load_roi_indices(path: str | Path = "configs/landmark_config.yaml") -> dict[str, list[int]]:
    raw: Any = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    return {k: list(v) for k, v in raw.items() if isinstance(v, list)}


def region_mean_rgb(
    bgr: np.ndarray, landmarks_xy: np.ndarray, indices: list[int]
) -> tuple[np.ndarray, int] | None:
    """Mean BGR→RGB over filled polygon. Returns (rgb_mean, n_pixels) or None."""
    pts = landmarks_xy[indices, :2].astype(np.int32)
    if len(pts) < 3:
        return None
    mask = np.zeros(bgr.shape[:2], dtype=np.uint8)
    cv2.fillPoly(mask, [pts], 255)
    n = int(cv2.countNonZero(mask))
    if n < 50:
        return None
    mean_bgr = cv2.mean(bgr, mask=mask)[:3]
    rgb = np.array([mean_bgr[2], mean_bgr[1], mean_bgr[0]], dtype=np.float64)
    return rgb, n


def fused_mean_rgb(
    bgr: np.ndarray, landmarks_xy: np.ndarray, regions: dict[str, list[int]]
) -> tuple[np.ndarray, int, list[np.ndarray]] | None:
    """Pixel-count-weighted fusion of region means. Also returns draw polys."""
    totals = np.zeros(3, dtype=np.float64)
    weight = 0
    polys: list[np.ndarray] = []
    for idxs in regions.values():
        out = region_mean_rgb(bgr, landmarks_xy, idxs)
        if out is None:
            continue
        rgb, n = out
        totals += rgb * n
        weight += n
        polys.append(landmarks_xy[idxs, :2].astype(np.int32))
    if weight < 200:
        return None
    return totals / weight, weight, polys
