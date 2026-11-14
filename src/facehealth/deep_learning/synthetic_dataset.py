"""Synthetic face-video tensors with known pulse — for smoke training without UBFC."""

from __future__ import annotations

import numpy as np
import torch
from torch.utils.data import Dataset


class SyntheticRppgDataset(Dataset):
    """
    Each sample: video (3,T,H,W) float32 in [0,1] + BVP (T,).
    Green channel carries a sinusoid at a random HR.
    """

    def __init__(
        self,
        n: int = 32,
        t: int = 64,
        h: int = 36,
        w: int = 36,
        fs: float = 30.0,
        seed: int = 0,
    ) -> None:
        self.n, self.t, self.h, self.w, self.fs = n, t, h, w, fs
        rng = np.random.default_rng(seed)
        self.hrs = rng.uniform(55, 100, size=n)

    def __len__(self) -> int:
        return self.n

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        hr = float(self.hrs[idx])
        f = hr / 60.0
        tt = np.arange(self.t, dtype=np.float32) / self.fs
        bvp = np.sin(2 * np.pi * f * tt).astype(np.float32)
        # base skin-like color + green pulsatile AC
        video = np.zeros((3, self.t, self.h, self.w), dtype=np.float32)
        video[0] = 0.55
        video[1] = 0.45
        video[2] = 0.40
        video[1] += 0.03 * bvp.reshape(-1, 1, 1)
        video += 0.01 * np.random.randn(*video.shape).astype(np.float32)
        video = np.clip(video, 0.0, 1.0)
        return torch.from_numpy(video), torch.from_numpy(bvp)
