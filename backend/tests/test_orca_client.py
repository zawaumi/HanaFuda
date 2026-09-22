"""Tests for the OrcaRouter client request contract."""

import asyncio
import unittest
from typing import Dict, Optional
from unittest.mock import patch

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
class FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"choices": [{"message": {"content": "{}"}}]}


class FakeAsyncClient:
    def __init__(self) -> None:
        self.payload: Optional[Dict[str, object]] = None

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, headers: dict, json: dict) -> FakeResponse:
        self.payload = json
        return FakeResponse()


class OrcaRouterClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_sends_json_object_response_format(self) -> None:
        http_client = FakeAsyncClient()
        client = OrcaRouterClient(
            OrcaRouterSettings(api_key="test-key", base_url="https://example.test/v1")
        )

        with patch("ai.orca_client.httpx.AsyncClient", return_value=http_client):
            result = await client.create_chat_completion(
                [{"role": "user", "content": "return json"}],
                response_format={"type": "json_object"},
            )

        self.assertEqual(result, "{}")
        self.assertIsNotNone(http_client.payload)
        self.assertEqual(
            http_client.payload["response_format"],
            {"type": "json_object"},
        )
