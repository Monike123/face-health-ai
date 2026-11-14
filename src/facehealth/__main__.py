"""CLI: config check or M1 live HUD."""

from __future__ import annotations

import argparse
from pathlib import Path

from facehealth import __version__
from facehealth.utils import get_logger, load_config, setup_logging


def main() -> None:
    ap = argparse.ArgumentParser(description="FaceHealth-rPPG (wellness only)")
    ap.add_argument("--config", type=Path, default=Path("configs/config.yaml"))
    ap.add_argument("--version", action="store_true")
    ap.add_argument("--live", action="store_true", help="Run M1 webcam HUD")
    ap.add_argument("--source", default=None, help="Camera index or video path")
    ap.add_argument("--model", type=Path, default=Path("models/face_landmarker.task"))
    args = ap.parse_args()

    if args.version:
        print(__version__)
        return

    cfg = load_config(args.config if args.config.is_file() else None)
    setup_logging(cfg.log_level)
    log = get_logger("facehealth.cli")

    if args.live:
        from facehealth.pipeline import run_live

        src: int | str | None
        if args.source is None:
            src = None
        elif str(args.source).isdigit():
            src = int(args.source)
        else:
            src = args.source
        log.info("starting M1 live | extractor=%s", cfg.extractor)
        run_live(args.config, source=src, model_path=args.model)
        return

    log.info("v%s | %s | use --live for M1 HUD", __version__, cfg.intended_use)
    print("Wellness only — not for diagnosis. Try: python -m facehealth --live")


if __name__ == "__main__":
    main()
