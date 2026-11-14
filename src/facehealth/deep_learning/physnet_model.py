"""Compact PhysNet-style 3D CNN (reference model for M4)."""

from __future__ import annotations

import torch
import torch.nn as nn


class PhysNet(nn.Module):
    """Maps video (B,3,T,H,W) → BVP (B,T). Small enough for 4GB smoke tests."""

    def __init__(self, frames: int = 128) -> None:
        super().__init__()
        self.frames = frames
        self.encoder = nn.Sequential(
            nn.Conv3d(3, 16, kernel_size=(1, 5, 5), padding=(0, 2, 2)),
            nn.BatchNorm3d(16),
            nn.ELU(inplace=True),
            nn.MaxPool3d((1, 2, 2)),
            nn.Conv3d(16, 32, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(32),
            nn.ELU(inplace=True),
            nn.MaxPool3d((1, 2, 2)),
            nn.Conv3d(32, 64, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(64),
            nn.ELU(inplace=True),
            nn.MaxPool3d((1, 2, 2)),
            nn.Conv3d(64, 64, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(64),
            nn.ELU(inplace=True),
            nn.AdaptiveAvgPool3d((frames, 1, 1)),
        )
        self.head = nn.Conv1d(64, 1, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: B,C,T,H,W
        z = self.encoder(x).squeeze(-1).squeeze(-1)  # B,64,T
        y = self.head(z).squeeze(1)  # B,T
        return y
