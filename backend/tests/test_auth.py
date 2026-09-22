from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from api.dependencies import get_current_user_id
from auth import SupabaseAuthError, SupabaseAuthVerifier
from config import Settings


class FakeAuth:
    def __init__(self) -> None:
        self.calls = 0

    def get_user(self, token: str):
        self.calls += 1
        if token == "invalid":
            raise RuntimeError("invalid token")
        return SimpleNamespace(user=SimpleNamespace(id="11111111-1111-1111-1111-111111111111"))


class FakeClient:
    def __init__(self, auth: FakeAuth) -> None:
        self.auth = auth


def test_verifier_returns_user_id_and_caches_positive_result():
    auth = FakeAuth()
    verifier = SupabaseAuthVerifier(lambda: FakeClient(auth), ttl_seconds=30)

    assert verifier.verify("token") == "11111111-1111-1111-1111-111111111111"
    assert verifier.verify("token") == "11111111-1111-1111-1111-111111111111"
    assert auth.calls == 1


def test_verifier_rejects_invalid_token():
    auth = FakeAuth()
    verifier = SupabaseAuthVerifier(lambda: FakeClient(auth), ttl_seconds=30)

    with pytest.raises(SupabaseAuthError):
        verifier.verify("invalid")


def test_jwt_mode_rejects_missing_bearer_token(monkeypatch):
    monkeypatch.setattr(
        "api.dependencies.get_settings",
        lambda: Settings(_env_file=None, AUTH_MODE="jwt"),
    )

    with pytest.raises(HTTPException) as raised:
        get_current_user_id(None, None)

    assert raised.value.status_code == 401


def test_legacy_mode_accepts_only_explicit_local_user_id(monkeypatch):
    monkeypatch.setattr(
        "api.dependencies.get_settings",
        lambda: Settings(
            _env_file=None,
            AUTH_MODE="legacy",
            DEFAULT_USER_ID="22222222-2222-2222-2222-222222222222",
        ),
    )

    assert get_current_user_id(None, "11111111-1111-1111-1111-111111111111") == (
        "11111111-1111-1111-1111-111111111111"
    )
