"""Mocked external-service tests."""

import asyncio
from pydantic import SecretStr

from ai.orca_client import OrcaRouterClient
from ai.settings import OrcaRouterSettings


def test_orca_client_maps_openai_compatible_response(monkeypatch):
    async def fake_post_json(*args, **kwargs):
        assert kwargs["payload"]["messages"][0]["role"] == "user"
        return {"choices": [{"message": {"content": "hello"}}]}

    monkeypatch.setattr("ai.orca_client.post_json", fake_post_json)
    settings = OrcaRouterSettings(
        api_key=SecretStr("test-key"),
        base_url="https://example.test/v1",
        model="test-model",
    )
    result = asyncio.run(
        OrcaRouterClient(settings).create_chat_completion(
            [{"role": "user", "content": "hi"}]
        )
    )
    assert result == "hello"
