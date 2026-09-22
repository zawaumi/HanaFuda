"""Application configuration validation tests."""

import pytest
from pydantic import ValidationError

from config import Settings


def test_production_settings_require_a_non_local_allowed_host() -> None:
    with pytest.raises(ValidationError):
        Settings(APP_ENV="production", ALLOWED_HOSTS="localhost")


def test_production_settings_accept_the_render_hostname() -> None:
    settings = Settings(
        APP_ENV="production",
        ALLOWED_HOSTS="hanafuda-backend.onrender.com",
    )

    assert settings.allowed_hosts == ["hanafuda-backend.onrender.com"]
