"""Web scan API: validation, auth, and synthetic HR recovery."""

from collections.abc import Iterator

import numpy as np
import pytest
from fastapi.testclient import TestClient

from facehealth.api.app import app
from facehealth.api.auth import require_user


def _payload(hr_bpm: float = 72.0, seconds: float = 30.0, seed: int = 0) -> dict[str, list]:
    rng = np.random.default_rng(seed)
    dt = 1000.0 / 30.0 + rng.uniform(-5, 5, int(seconds * 30))
    t_ms = np.cumsum(dt)
    pulse = 0.02 * np.sin(2 * np.pi * hr_bpm / 60.0 * t_ms / 1000.0)
    rgb = np.stack([120 + 0.3 * pulse * 255, 140 + pulse * 255, 100 + 0.4 * pulse * 255], axis=1)
    return {"t_ms": t_ms.tolist(), "rgb": rgb.tolist()}


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[require_user] = lambda: "user_test"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_scan_recovers_hr_with_jittery_timestamps(client: TestClient) -> None:
    r = client.post("/api/v1/scan", json=_payload(72.0))
    assert r.status_code == 200
    body = r.json()
    assert body["quality"] == "good"
    assert abs(body["hr_bpm"] - 72.0) < 3.0
    assert "Not a medical device" in body["disclaimer"]


def test_scan_noise_is_gated(client: TestClient) -> None:
    p = _payload()
    rng = np.random.default_rng(1)
    p["rgb"] = (128 + rng.normal(0, 1, (len(p["t_ms"]), 3))).tolist()
    body = client.post("/api/v1/scan", json=p).json()
    assert body["hr_bpm"] is None
    assert body["quality"] == "low"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda p: p.update(rgb=p["rgb"][:-1]),  # length mismatch
        lambda p: p["rgb"][5].__setitem__(0, 300.0),  # out of range
        lambda p: p["t_ms"].__setitem__(10, p["t_ms"][9]),  # not increasing
        lambda p: p.update(t_ms=p["t_ms"][:400], rgb=p["rgb"][:400]),  # too short (~13 s)
    ],
)
def test_scan_rejects_bad_payload(client: TestClient, mutate) -> None:  # type: ignore[no-untyped-def]
    p = _payload()
    mutate(p)
    assert client.post("/api/v1/scan", json=p).status_code == 422


def test_scan_requires_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CLERK_SECRET_KEY", "test_dummy_not_a_real_key")
    monkeypatch.delenv("VERCEL", raising=False)
    r = TestClient(app).post("/api/v1/scan", json=_payload())
    assert r.status_code == 401


def test_health() -> None:
    assert TestClient(app).get("/api/v1/health").json()["status"] == "ok"
