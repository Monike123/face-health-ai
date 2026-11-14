"""Smoke-train PhysNet on synthetic data (M4 starter)."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch.utils.data import DataLoader

from facehealth.deep_learning.losses import NegPearsonLoss
from facehealth.deep_learning.physnet_model import PhysNet
from facehealth.deep_learning.synthetic_dataset import SyntheticRppgDataset
from facehealth.utils.logger import get_logger, setup_logging

log = get_logger("facehealth.train_physnet")


def train(
    epochs: int = 3,
    batch_size: int = 2,
    frames: int = 64,
    lr: float = 1e-3,
    out: Path = Path("models/checkpoints/physnet_smoke.pt"),
) -> Path:
    setup_logging()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info("device=%s", device)

    ds = SyntheticRppgDataset(n=24, t=frames, h=36, w=36)
    loader = DataLoader(ds, batch_size=batch_size, shuffle=True, num_workers=0)
    model = PhysNet(frames=frames).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    loss_fn = NegPearsonLoss()

    model.train()
    for ep in range(1, epochs + 1):
        total = 0.0
        for video, bvp in loader:
            video, bvp = video.to(device), bvp.to(device)
            opt.zero_grad(set_to_none=True)
            pred = model(video)
            loss = loss_fn(pred, bvp)
            loss.backward()
            opt.step()
            total += float(loss.item())
        log.info("epoch %d/%d  loss=%.4f", ep, epochs, total / max(len(loader), 1))

    out.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "frames": frames}, out)
    log.info("saved %s", out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch-size", type=int, default=2)
    ap.add_argument("--frames", type=int, default=64)
    ap.add_argument("--out", type=Path, default=Path("models/checkpoints/physnet_smoke.pt"))
    args = ap.parse_args()
    train(args.epochs, args.batch_size, args.frames, out=args.out)


if __name__ == "__main__":
    main()
