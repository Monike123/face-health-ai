from facehealth.utils.logger import get_logger, setup_logging


def test_logger() -> None:
    setup_logging("INFO")
    assert get_logger("facehealth.test").name == "facehealth.test"
