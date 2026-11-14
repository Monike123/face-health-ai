"""Process logging. Never log frames or PII."""

from __future__ import annotations

import logging
import sys

_ready = False


def setup_logging(level: str = "INFO") -> None:
    global _ready
    if _ready:
        return
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
        force=True,
    )
    _ready = True


def get_logger(name: str = "facehealth") -> logging.Logger:
    if not _ready:
        setup_logging()
    return logging.getLogger(name)
