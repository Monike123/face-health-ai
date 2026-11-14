# SOUP / Third-Party Component Register (M0)

Software of Unknown Provenance / third-party inventory for FaceHealth v1 (wellness).  
Update this file whenever dependencies change. **AGPL is banned in the product path.**

| Component | Version policy | License | Use in product? | Notes |
| :--- | :--- | :--- | :---: | :--- |
| Python | 3.12.x | PSF | Yes | Matches local `.venv` |
| NumPy | >=1.26 | BSD | Yes | |
| SciPy | >=1.12 | BSD | Yes | Signal processing |
| Pydantic | >=2.6 | MIT | Yes | Runtime config |
| PyYAML | >=6 | MIT | Yes | Config files |
| OpenCV (`opencv-python`) | >=4.9 | Apache-2.0 | Yes | Dev HUD; server may use headless build |
| pytest / ruff / mypy | dev | MIT/MIT/MIT | Dev only | CI |
| MediaPipe Tasks | TBD pin | Apache-2.0 | Planned M1 | FaceLandmarker — preferred |
| OpenCV YuNet | TBD | Apache-2.0 weights | Optional | Multi-face only |
| ONNX Runtime | TBD | MIT | Planned M4/M5 | Desktop + Web |
| PyTorch | TBD | BSD-style | Train / research | Cloud train extras |
| FastAPI / Uvicorn | >=0.110 / >=0.27 | MIT / BSD | Yes (web v0.1) | `/api/v1/scan` backend |
| clerk-backend-api | >=1.0 | MIT | Yes (web v0.1) | Session token verification |
| httpx | >=0.27 | BSD-3 | Dev only | FastAPI TestClient |
| Next.js / React | latest | MIT | Yes (web v0.1) | `web/` frontend |
| @clerk/nextjs | latest | MIT | Yes (web v0.1) | Sign-up / sign-in UI |
| @mediapipe/tasks-vision | pinned | Apache-2.0 | Yes (web v0.1) | Browser FaceLandmarker; model + WASM from Google CDN |
| **Ultralytics YOLOv8** | — | **AGPL-3.0** | **No** | Removed from plan |
| **InsightFace weights** | — | Often NC | **No** | Non-commercial models |
| **rPPG-Toolbox** | — | Responsible AI Source Code License | Bench only | Do not ship code in commercial binary |
| **MMPD / COHFACE / FaceForensics++** | datasets | Research / NC | Train product weights? **No** | Use for research benches; ship weights need P34 in-house / licensed data |

## Policy
1. No AGPL / SSPL / Commons Clause in runtime product dependencies.
2. Research-only datasets may be used for internal benchmarks, not for shipping weights without legal clearance.
3. Prefer Apache-2.0 / MIT / BSD.
