"""Training losses for rPPG models."""

from __future__ import annotations

import torch
import torch.nn as nn


class NegPearsonLoss(nn.Module):
    """1 - Pearson correlation between predicted and GT BVP."""

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        pred = pred.reshape(pred.shape[0], -1)
        target = target.reshape(target.shape[0], -1)
        pred = pred - pred.mean(dim=1, keepdim=True)
        target = target - target.mean(dim=1, keepdim=True)
        num = (pred * target).sum(dim=1)
        den = pred.norm(dim=1) * target.norm(dim=1) + 1e-8
        return (1.0 - num / den).mean()
