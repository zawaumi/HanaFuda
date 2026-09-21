"""Small, redaction-safe async JSON client for external providers."""

from typing import Any, Mapping

import httpx


class ExternalAPIError(RuntimeError):
    """An external service was unreachable or returned an unusable response."""


async def post_json(
    url: str,
    *,
    headers: Mapping[str, str],
    payload: Mapping[str, Any],
    timeout: float,
) -> Any:
    """POST JSON and normalize transport/status failures without leaking bodies."""

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=dict(headers), json=dict(payload))
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise ExternalAPIError("外部サービスへの通信に失敗しました。") from error
