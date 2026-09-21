"""Small async client for OrcaRouter's Chat Completions API."""

from typing import Any, Mapping, Optional, Sequence

import httpx
from pydantic import ValidationError

from ai.settings import OrcaRouterSettings
from integrations.http_client import ExternalAPIError, post_json


class OrcaRouterError(RuntimeError):
    """Raised when OrcaRouter cannot return a usable chat response."""


class OrcaRouterClient:
    """Call OrcaRouter without exposing credentials outside the backend."""

    def __init__(self, settings: Optional[OrcaRouterSettings] = None) -> None:
        try:
            self.settings = settings or OrcaRouterSettings()
        except ValidationError as error:
            raise OrcaRouterError(
                "OrcaRouterの設定が不足しています。backend/.env に "
                "ORCAROUTER_API_KEY を設定してください。"
            ) from error

    async def create_chat_completion(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        model: Optional[str] = None,
        temperature: float = 0.2,
        response_format: Optional[Mapping[str, str]] = None,
    ) -> str:
        """Send messages to OrcaRouter and return the assistant's text."""

        payload: dict[str, Any] = {
            "model": model or self.settings.model,
            "messages": list(messages),
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = dict(response_format)
        headers = {
            "Authorization": f"Bearer {self.settings.api_key.get_secret_value()}",
            "Content-Type": "application/json",
        }

        try:
            data = await post_json(
                self.settings.chat_completions_url,
                headers=headers,
                payload=payload,
                timeout=self.settings.timeout_seconds,
            )
        except (ExternalAPIError, httpx.HTTPError) as error:
            raise OrcaRouterError("OrcaRouterへの接続に失敗しました。") from error

        try:
            content = data["choices"][0]["message"]["content"]
        except (IndexError, KeyError, TypeError, ValueError) as error:
            raise OrcaRouterError("OrcaRouterの応答形式が期待どおりではありません。") from error

        if not isinstance(content, str) or not content.strip():
            raise OrcaRouterError("OrcaRouterから空の応答を受け取りました。")

        return content
