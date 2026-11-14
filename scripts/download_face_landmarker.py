"""Download MediaPipe FaceLandmarker .task model into models/."""

from __future__ import annotations

import urllib.request
from pathlib import Path

URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)
OUT = Path(__file__).resolve().parents[1] / "models" / "face_landmarker.task"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.is_file() and OUT.stat().st_size > 1_000_000:
        print(f"already present: {OUT} ({OUT.stat().st_size} bytes)")
        return
    print(f"downloading {URL}")
    urllib.request.urlretrieve(URL, OUT)
    print(f"saved {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
