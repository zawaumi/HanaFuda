"""Tests for the shared external JSON client."""

import unittest
from typing import Any, Dict, Optional
from unittest.mock import patch

import httpx

from integrations.http_client import ExternalAPIError, post_json


class FakeResponse:
    def __init__(self, payload: Any = None, error: Optional[Exception] = None) -> None:
        self.payload = payload
        self.error = error

    def raise_for_status(self) -> None:
        if self.error:
            raise self.error

    def json(self) -> Any:
        if self.error:
            raise self.error
        return self.payload


class FakeAsyncClient:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.request: Optional[Dict[str, Any]] = None

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, headers: Dict[str, str], json: Dict[str, Any]) -> FakeResponse:
        self.request = {"url": url, "headers": headers, "json": json}
        return self.response


class ExternalJSONClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_posts_json_and_returns_decoded_payload(self) -> None:
        http_client = FakeAsyncClient(FakeResponse({"ok": True}))

        with patch("integrations.http_client.httpx.AsyncClient", return_value=http_client):
            result = await post_json(
                "https://example.test/api",
                headers={"Authorization": "Bearer secret"},
                payload={"message": "hello"},
                timeout=3,
            )

        self.assertEqual(result, {"ok": True})
        self.assertEqual(http_client.request["json"], {"message": "hello"})

    async def test_normalizes_http_errors_without_exposing_response_body(self) -> None:
        http_client = FakeAsyncClient(FakeResponse(error=httpx.HTTPError("provider secret body")))

        with patch("integrations.http_client.httpx.AsyncClient", return_value=http_client):
            with self.assertRaisesRegex(ExternalAPIError, "外部サービスへの通信に失敗しました"):
                await post_json(
                    "https://example.test/api",
                    headers={},
                    payload={},
                    timeout=3,
                )

    async def test_normalizes_invalid_json(self) -> None:
        http_client = FakeAsyncClient(FakeResponse(error=ValueError("invalid response")))

        with patch("integrations.http_client.httpx.AsyncClient", return_value=http_client):
            with self.assertRaises(ExternalAPIError):
                await post_json(
                    "https://example.test/api",
                    headers={},
                    payload={},
                    timeout=3,
                )
