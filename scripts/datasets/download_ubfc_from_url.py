"""
Download UBFC-rPPG once YOU have a direct URL (Drive/Kaggle export/author link).

Usage:
  set FACEHEALTH_UBFC_URL=https://...
  python scripts/datasets/download_ubfc_from_url.py

Or:
  python scripts/datasets/download_ubfc_from_url.py --url "https://..."
"""

from __future__ import annotations

import argparse
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST_DIR = ROOT / "data" / "raw" / "_incoming"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=os.environ.get("FACEHEALTH_UBFC_URL", ""))
    ap.add_argument("--out", type=Path, default=DEST_DIR / "ubfc_rppg.zip")
    args = ap.parse_args()
    if not args.url:
        print(
            "No URL. Get UBFC from:\n"
            "  https://sites.google.com/view/ybenezeth/ubfcrppg\n"
            "then:\n"
            "  $env:FACEHEALTH_UBFC_URL='https://...'\n"
            "  python scripts/datasets/download_ubfc_from_url.py"
        )
        raise SystemExit(2)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading -> {args.out}")
    urllib.request.urlretrieve(args.url, args.out)  # noqa: S310 — user-supplied URL
    print(f"saved {args.out.stat().st_size:,} bytes")
    print("Next: unpack into data/raw/UBFC-rPPG/ then run verify_dataset.py --name ubfc")


if __name__ == "__main__":
    main()
