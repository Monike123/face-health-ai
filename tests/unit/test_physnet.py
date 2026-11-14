"""PhysNet forward + NegPearson shape tests (CPU)."""

import pytest

torch = pytest.importorskip("torch")  # ml extra; CI installs dev+api only

from facehealth.deep_learning.losses import NegPearsonLoss  # noqa: E402
from facehealth.deep_learning.physnet_model import PhysNet  # noqa: E402
from facehealth.deep_learning.synthetic_dataset import SyntheticRppgDataset  # noqa: E402


def test_physnet_forward() -> None:
    model = PhysNet(frames=32)
    x = torch.randn(2, 3, 32, 36, 36)
    y = model(x)
    assert y.shape == (2, 32)


def test_neg_pearson_range() -> None:
    loss = NegPearsonLoss()
    a = torch.randn(4, 64)
    v = loss(a, a)
    assert float(v) < 0.05
    v2 = loss(a, -a)
    assert float(v2) > 1.5


def test_synthetic_dataset() -> None:
    ds = SyntheticRppgDataset(n=2, t=32, h=24, w=24)
    video, bvp = ds[0]
    assert video.shape == (3, 32, 24, 24)
    assert bvp.shape == (32,)
