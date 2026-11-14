"""Verify local dataset folder layouts after manual download."""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"


def verify_ubfc(root: Path) -> int:
    # Accept either data/raw/UBFC-rPPG/subject1/... or nested DATASET_2
    subjects = sorted(root.glob("**/subject*/vid.avi"))
    gts = sorted(root.glob("**/subject*/ground_truth.txt"))
    print(f"UBFC videos: {len(subjects)}")
    print(f"UBFC GT files: {len(gts)}")
    if len(subjects) == 0:
        print("FAIL: no subject*/vid.avi found under", root)
        return 1
    # DATASET_2 shares 42
    if len(subjects) < 8:
        print("WARN: fewer than 8 videos — incomplete?")
    print("OK: UBFC layout looks usable")
    return 0


def verify_pure(root: Path) -> int:
    jsons = list(root.glob("**/*.json"))
    print(f"PURE json sidecars: {len(jsons)}")
    if not jsons:
        print("FAIL: expected folders like 01-01/ with .json + PNG/AVI")
        return 1
    print("OK: PURE sidecars present")
    return 0


def verify_scamps(root: Path) -> int:
    mats = list(root.glob("**/*.mat"))
    print(f"SCAMPS .mat files: {len(mats)}")
    if len(mats) < 1:
        print("FAIL: run download_scamps_example.py first")
        return 1
    print("OK: SCAMPS example present")
    return 0


def verify_cohface(root: Path) -> int:
    avis = list(root.glob("**/data.avi"))
    h5 = list(root.glob("**/data.hdf5"))
    print(f"COHFACE avi={len(avis)} hdf5={len(h5)}")
    if not avis or not h5:
        print("FAIL: expected subject/trial/data.avi + data.hdf5")
        return 1
    print("OK: COHFACE layout looks usable")
    return 0


def verify_mmpd(root: Path) -> int:
    mats = list(root.glob("**/p*_*.mat"))
    print(f"MMPD trial mats: {len(mats)}")
    if not mats:
        print("FAIL: expected subjectN/pN_K.mat")
        return 1
    print("OK: MMPD mats present")
    return 0


HANDLERS = {
    "ubfc": ("UBFC-rPPG", verify_ubfc),
    "pure": ("PURE", verify_pure),
    "scamps": ("SCAMPS", verify_scamps),
    "cohface": ("COHFACE", verify_cohface),
    "mmpd": ("MMPD", verify_mmpd),
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", choices=sorted(HANDLERS), required=True)
    ap.add_argument("--path", type=Path, default=None, help="Override dataset root")
    args = ap.parse_args()
    folder, fn = HANDLERS[args.name]
    root = args.path or (RAW / folder)
    print("checking", root)
    if not root.exists():
        print("FAIL: folder missing — create it and unpack downloads there")
        raise SystemExit(1)
    raise SystemExit(fn(root))


if __name__ == "__main__":
    main()
