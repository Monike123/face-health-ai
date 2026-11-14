"""Download openly available SCAMPS example (10 videos, ~1.2 GB) + split CSV."""

from __future__ import annotations

import hashlib
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "raw" / "SCAMPS"
BASE = "https://facesyntheticspubwedata.z6.web.core.windows.net/neurips-2022"

FILES = {
    "scamps_videos_example.tar.gz": f"{BASE}/scamps_videos_example.tar.gz",
    "ScampsTrainTestSplit.csv": f"{BASE}/ScampsTrainTestSplit.csv",
}


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and dest.stat().st_size > 1_000_000:
        print(f"skip (exists): {dest} ({dest.stat().st_size:,} bytes)")
        return
    print(f"downloading {url}")
    print(f"  -> {dest}")
    urllib.request.urlretrieve(url, dest)  # noqa: S310 — fixed vendor URL
    print(f"done: {dest.stat().st_size:,} bytes")


def _extract(archive: Path, dest: Path) -> None:
    marker = dest / "_EXTRACTED"
    if marker.is_file():
        print(f"skip extract: {dest}")
        return
    print(f"extracting {archive.name} ...")
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as tar:
        tar.extractall(dest)
    marker.write_text("ok\n", encoding="utf-8")
    print("extract complete")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    arch = OUT_DIR / "scamps_videos_example.tar.gz"
    _download(FILES["scamps_videos_example.tar.gz"], arch)
    _download(FILES["ScampsTrainTestSplit.csv"], OUT_DIR / "ScampsTrainTestSplit.csv")
    _extract(arch, OUT_DIR / "example")
    # sha256 of archive for integrity log
    h = hashlib.sha256()
    with arch.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    (OUT_DIR / "scamps_example.sha256").write_text(h.hexdigest() + "\n", encoding="utf-8")
    print("SCAMPS example ready under data/raw/SCAMPS/")
    print("Note: SCAMPS is for research; commercial product use prohibited by license.")


if __name__ == "__main__":
    main()
