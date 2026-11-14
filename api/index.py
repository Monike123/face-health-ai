"""Vercel entrypoint for the FastAPI backend."""

import sys
from pathlib import Path

# shortcut: src/ on sys.path instead of installing the package (keeps opencv out of the
# function bundle); switch to a slim wheel install if Vercel packaging changes.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from facehealth.api.app import app  # noqa: E402

__all__ = ["app"]
